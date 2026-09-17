"""data-service 后端审计修复回归测试。

覆盖 AC#13 的四类：
1. default-deny ACL（HTTP 与 access helper）
2. MCP 与 HTTP 的 ACL/结果一致性
3. distinct 端点契约
4. _convert_value 的 400 行为（ValueError / TypeError / OverflowError）

本地无数据库：所有 DB 访问走 tests/conftest.py 的 FakePool/FakeConn；
白名单走 services.access.get_whitelist_strict 的 monkeypatch。异步用例用 asyncio.run 驱动
（不引入 pytest-asyncio 依赖）。
"""
import asyncio
import json

import pytest
from fastapi import HTTPException

import api.query as q
import api.meta as mt
import services.access as access
import services.mcp_server as mcp_server
from services.settings_service import WhitelistUnavailable


def run(coro):
    return asyncio.run(coro)


@pytest.fixture(autouse=True)
def _clear_cache():
    q.clear_columns_cache()
    # settings_service 的 5s TTL 缓存是进程级的，测试间必须失效，否则白名单状态互相污染
    from services import settings_service as ss
    ss.invalidate_cache()
    yield
    q.clear_columns_cache()
    ss.invalidate_cache()


def _cols(*pairs):
    return [{"column_name": n, "data_type": t, "is_nullable": "YES", "column_default": ""}
            for n, t in pairs]


# ── 1. default-deny ACL ───────────────────────────────────────────────────────
class TestDefaultDenyACL:
    def test_not_in_curated_is_403(self, whitelist):
        # 即使白名单显式置 true，不在权威清单 ALL_TABLES 也拒绝
        whitelist["data"] = {"secret_table": True}
        with pytest.raises(access.AccessControlError) as ei:
            run(access.ensure_table_access("secret_table"))
        assert ei.value.status_code == 403
        assert "curated" in ei.value.detail.lower()

    def test_curated_but_not_enabled_is_403(self, whitelist):
        # 在权威清单里但没在设置中启用 -> 默认拒绝
        whitelist["data"] = {}
        with pytest.raises(access.AccessControlError) as ei:
            run(access.ensure_table_access("order_detail_raw"))
        assert ei.value.status_code == 403
        assert "enabled" in ei.value.detail.lower()

    def test_curated_and_enabled_allows(self, whitelist):
        whitelist["data"] = {"order_detail_raw": True}
        # 不抛异常即放行
        run(access.ensure_table_access("order_detail_raw"))

    def test_load_error_is_503_not_open(self, whitelist):
        whitelist["error"] = "connection refused"
        with pytest.raises(access.AccessControlError) as ei:
            run(access.ensure_table_access("order_detail_raw"))
        assert ei.value.status_code == 503

    def test_overlong_identifier_403(self, whitelist):
        with pytest.raises(access.AccessControlError) as ei:
            run(access.ensure_table_access("t" * 200))
        assert ei.value.status_code == 403

    def test_http_guard_maps_codes(self, whitelist, fake_pool, monkeypatch):
        monkeypatch.setattr(q, "get_pool", lambda: fake_pool)
        fake_conn = fake_pool._conn
        fake_conn.info_cols = _cols(("pay_amount", "double precision"))
        fake_conn.rows = [{"pay_amount": 1.5}]
        # denied -> 403
        whitelist["data"] = {}
        req = q.QueryRequest(table="order_detail_raw")
        with pytest.raises(HTTPException) as ei:
            run(q.structured_query(req))
        assert ei.value.status_code == 403
        # load error -> 503
        whitelist["error"] = "db down"
        with pytest.raises(HTTPException) as ei:
            run(q.structured_query(req))
        assert ei.value.status_code == 503
        # allowed -> 200 + rows
        whitelist["error"] = None
        whitelist["data"] = {"order_detail_raw": True}
        out = run(q.structured_query(req))
        assert out["rows"] == [{"pay_amount": 1.5}]
        assert out["truncated"] is False


# ── 2. MCP 与 HTTP 一致性 ────────────────────────────────────────────────────
class TestMcpHttpConsistency:
    @pytest.fixture
    def wired(self, fake_pool, monkeypatch, whitelist):
        async def _fake_get_pool():
            return fake_pool
        monkeypatch.setattr(mcp_server, "_get_pool", _fake_get_pool)
        monkeypatch.setattr(q, "get_pool", lambda: fake_pool)
        fake_conn = fake_pool._conn
        fake_conn.info_cols = _cols(("order_status", "integer"), ("pay_amount", "numeric"))
        fake_conn.rows = [{"order_status": 1, "pay_amount": 2}]
        return fake_conn

    @pytest.mark.parametrize("allowed,code", [(False, "access_denied"), (True, None)])
    def test_same_decision(self, wired, whitelist, allowed, code):
        whitelist["data"] = {"order_detail_raw": allowed}
        args = dict(table="order_detail_raw", columns=["order_status"])
        # HTTP：无异常=放行
        http = None
        try:
            http = run(q.structured_query(q.QueryRequest(**args)))
            http_allowed = True
        except HTTPException as ei:
            assert ei.status_code == 403, f"unexpected HTTP status {ei.status_code}"
            http_allowed = False
        # MCP：响应含 error=拒绝
        res = json.loads(run(mcp_server.query_data(**args)))
        mcp_allowed = ("error" not in res)
        assert http_allowed == mcp_allowed == allowed
        if allowed:
            assert code is None
            assert res["rows"] == http["rows"]
            assert res["count"] == http["count"]
        else:
            assert res["code"] == "access_denied"

    def test_storage_unavailable_503_both(self, wired, whitelist):
        whitelist["error"] = "db down"
        with pytest.raises(HTTPException) as ei:
            run(q.structured_query(q.QueryRequest(table="order_detail_raw")))
        assert ei.value.status_code == 503
        res = json.loads(run(mcp_server.query_data(table="order_detail_raw")))
        assert res["code"] == "access_control_unavailable"
        assert res["status"] == 503

    def test_per_column_type_in_cast_not_text(self, wired, whitelist):
        whitelist["data"] = {"order_detail_raw": True}
        # HTTP 与 MCP 都应生成 integer[] 的 CAST，而非一律 ::text[]
        run(q.structured_query(q.QueryRequest(
            table="order_detail_raw",
            filters=[{"column": "order_status", "op": "IN", "value": [1, 2]}])))
        sql = next(s for kind, s, _ in wired.sql_log if kind == "fetch" and "FROM" in s and "LIMIT" in s)
        assert "CAST($" in sql and "integer[]" in sql
        assert "::text[]" not in sql

    def test_shared_validation_model(self, wired, whitelist):
        # MCP 复用 HTTP 的 QueryRequest 校验：filters<=50 超限 -> 结构化 validation_error
        whitelist["data"] = {"order_detail_raw": True}
        too_many = [{"column": "order_status", "op": "IS_NULL"} for _ in range(51)]
        res = json.loads(run(mcp_server.query_data(table="order_detail_raw", filters=too_many)))
        assert res["code"] == "validation_error"


# ── 3. distinct 端点 ─────────────────────────────────────────────────────────
class TestDistinctEndpoint:
    @pytest.fixture
    def wired(self, fake_pool, monkeypatch):
        monkeypatch.setattr(q, "get_pool", lambda: fake_pool)
        fake_conn = fake_pool._conn
        fake_conn.info_cols = _cols(("store_id", "integer"), ("store_name", "text"))
        fake_conn.distinct = [{"store_id": 1}, {"store_id": 2}, {"store_id": 3}]
        return fake_conn

    def test_contract_values(self, wired, whitelist):
        whitelist["data"] = {"store_info": True}
        out = run(q.query_distinct("store_info", "store_id", limit=100))
        assert out == {"table": "store_info", "column": "store_id", "values": [1, 2, 3]}

    def test_sql_shape(self, wired, whitelist):
        whitelist["data"] = {"store_info": True}
        run(q.query_distinct("store_info", "store_id", limit=250))
        d = next(s for kind, s, _ in wired.sql_log if kind == "fetch" and "SELECT DISTINCT" in s)
        assert '"store_id"' in d and "IS NOT NULL" in d and "ORDER BY" in d and "LIMIT" in d

    def test_acl_enforced(self, wired, whitelist):
        whitelist["data"] = {}
        with pytest.raises(HTTPException) as ei:
            run(q.query_distinct("store_info", "store_id", limit=100))
        assert ei.value.status_code == 403

    def test_column_not_in_table_400(self, wired, whitelist):
        whitelist["data"] = {"store_info": True}
        with pytest.raises(HTTPException) as ei:
            run(q.query_distinct("store_info", "nope", limit=100))
        assert ei.value.status_code == 400


# ── 4. _convert_value 错误 ───────────────────────────────────────────────────
class TestConvertValue:
    def _expect_400(self, dtype, value):
        with pytest.raises(HTTPException) as ei:
            q._convert_value(dtype, value, column="c")
        assert ei.value.status_code == 400

    def test_value_error_integer(self):
        self._expect_400("integer", "abc")

    def test_type_error_integer(self):
        self._expect_400("integer", ["x"])  # int(list) -> TypeError

    def test_overflow_error_integer(self):
        self._expect_400("integer", float("inf"))  # int(inf) -> OverflowError

    def test_value_error_date(self):
        self._expect_400("date", "not-a-date")

    def test_bad_timestamp(self):
        self._expect_400("timestamp with time zone", 12345)

    def test_none_passthrough(self):
        assert q._convert_value("integer", None) is None

    def test_valid_conversions(self):
        assert q._convert_value("integer", "42") == 42
        assert q._convert_value("numeric", "1.5") == 1.5


# ── 5. meta：reltuples / 省略不可访问 / 404 / FK ordinal_position ────────────
class TestMeta:
    @pytest.fixture
    def wired(self, fake_pool, monkeypatch):
        monkeypatch.setattr(mt, "get_pool", lambda: fake_pool)
        return fake_pool._conn

    def test_tables_estimated_and_omit_inaccessible(self, wired, whitelist):
        whitelist["data"] = {"order_detail_raw": True, "product_main": False}
        wired.pg_tables = [
            {"table_name": "order_detail_raw", "row_estimate": 60000},
            {"table_name": "product_main", "row_estimate": 500},
            {"table_name": "sync_meta", "row_estimate": 3},  # 不在 whitelist -> 省略
        ]
        out = run(mt.list_tables())
        names = [t["table"] for t in out["tables"]]
        assert names == ["order_detail_raw"]  # 仅可访问者出现，不泄露存在性
        assert out["tables"][0]["estimated"] is True
        assert out["tables"][0]["rows"] == 60000

    def test_table_columns_404_missing(self, wired, whitelist):
        whitelist["data"] = {"store_info": True}
        wired.info_cols = []  # 无列 -> 表不存在/为空 -> 404
        with pytest.raises(HTTPException) as ei:
            run(mt.table_columns("store_info"))
        assert ei.value.status_code == 404

    def test_table_columns_404_inaccessible(self, wired, whitelist):
        whitelist["data"] = {}
        with pytest.raises(HTTPException) as ei:
            run(mt.table_columns("store_info"))
        assert ei.value.status_code == 404

    def test_relationships_filter_and_position(self, wired, whitelist):
        whitelist["data"] = {"order_detail_raw": True, "product_main": True}
        wired.fks = [
            {"from_table": "order_detail_raw", "from_column": "product_id",
             "to_table": "product_main", "to_column": "product_id", "position": 1},
            {"from_table": "order_detail_raw", "from_column": "store_id",
             "to_table": "hidden_store", "to_column": "id", "position": 1},  # 目标不可访问 -> 省略
        ]
        out = run(mt.relationships())
        rels = out["relationships"]
        assert len(rels) == 1
        assert rels[0]["to_table"] == "product_main"
        assert rels[0]["position"] == 1


# ── 6. health ────────────────────────────────────────────────────────────────
class TestHealth:
    def test_health_pings_db(self, fake_pool, monkeypatch):
        import main
        monkeypatch.setattr(main, "get_pool", lambda: fake_pool)
        out = run(main.health())
        assert out["status"] == "ok" and out["database"] == "up"
        assert any("SELECT 1" in s for kind, s, _ in fake_pool._conn.sql_log)

    def test_health_error_when_db_down(self, fake_pool, monkeypatch):
        import main

        def boom():
            raise RuntimeError("no pool")
        monkeypatch.setattr(main, "get_pool", boom)
        out = run(main.health())
        assert out["status"] == "error" and out["database"] == "down"

    def test_live_is_cheap(self, monkeypatch):
        import main
        # 不依赖任何 DB：get_pool 被替换成抛错也应返回 ok
        def boom():
            raise AssertionError("live must not touch DB")
        monkeypatch.setattr(main, "get_pool", boom)
        assert run(main.health_live()) == {"status": "ok"}

    def test_root_mcp_url_from_base(self):
        import main

        class _Req:
            base_url = "http://data-access-api:8600/"
        out = run(main.root(_Req()))
        assert out["mcp"] == "http://data-access-api:8600/mcp/mcp"
        assert "localhost" not in out["mcp"]


# ── 7. settings_service：原子写 / 严格读 ─────────────────────────────────────
class TestSettingsService:
    def test_set_uses_jsonb_set(self, fake_conn, monkeypatch):
        import services.settings_service as ss
        monkeypatch.setattr(ss, "_ensure_ready", True)  # 跳过建表
        monkeypatch.setattr(ss, "get_pool", lambda: fake_pool_of(fake_conn))
        fake_conn.fetchval = _async_ret({'order_detail_raw': True})
        out = run(ss.set_table_access("order_detail_raw", True))
        updates = [s for k, s, _ in fake_conn.sql_log if k == "execute" and "UPDATE" in s]
        assert any("jsonb_set" in u for u in updates), "write must be atomic jsonb_set"
        assert out == {'order_detail_raw': True}

    def test_get_whitelist_strict_raises(self, monkeypatch):
        import services.settings_service as ss
        monkeypatch.setattr(ss, "_ensure_ready", True)

        class _BoomConn:
            async def fetchval(self, *a, **k):
                raise RuntimeError("db down")

        monkeypatch.setattr(ss, "get_pool", lambda: FakePoolRef(_BoomConn()))
        with pytest.raises(WhitelistUnavailable):
            run(ss.get_whitelist_strict())


# ---- helpers for settings_service tests ----
def _async_ret(value):
    async def _f(*a, **k):
        return value
    return _f


def fake_pool_of(conn):
    return FakePoolRef(conn)


class FakePoolRef:
    def __init__(self, conn):
        self._conn = conn

    def acquire(self):
        conn = self._conn

        class _C:
            async def __aenter__(self):
                return conn

            async def __aexit__(self, *a):
                return False
        return _C()
