"""pytest 配置：本地无数据库，用假 asyncpg pool/conn 覆盖网络与 DB 层。

把 data-service 目录加入 sys.path（模块用平铺导入：from db import ... / from api.query ...），
并在导入 config 之前设置一个合法的 DB_PASSWORD，避免触发"无默认凭据"启动中止。
"""
import os
import sys

# 1) 先于任何项目模块导入设置环境变量
os.environ.setdefault("DB_PASSWORD", "unit_test_password")

# 2) 让 data-service 成为导入根
_HERE = os.path.dirname(os.path.abspath(__file__))
_PKG_ROOT = os.path.dirname(_HERE)  # .../data-service
if _PKG_ROOT not in sys.path:
    sys.path.insert(0, _PKG_ROOT)

import pytest  # noqa: E402

from services import settings_service  # noqa: E402


class FakeConn:
    """可编程的假 asyncpg 连接：按 SQL 子串返回预置数据，并记录执行过的 SQL。"""

    def __init__(self):
        self.info_cols = []      # information_schema.columns 结果
        self.rows = []           # 数据查询结果（SELECT ... FROM ... LIMIT）
        self.distinct = []       # SELECT DISTINCT 结果
        self.pg_tables = []      # pg_class 关系行数估算结果
        self.fks = []            # 外键关系结果
        self.exists = 1          # fetchval 存在性返回
        self.raise_on: str | None = None  # 命中子串时抛 UndefinedTableError
        self.sql_log = []

    def _maybe_raise(self, sql):
        if self.raise_on and self.raise_on in sql:
            import asyncpg
            raise asyncpg.exceptions.UndefinedTableError("no such table")

    async def fetch(self, sql, *args):
        self.sql_log.append(("fetch", sql, args))
        self._maybe_raise(sql)
        if "information_schema.columns" in sql:
            return self.info_cols
        if "pg_class" in sql:
            return self.pg_tables
        if "table_constraints" in sql:
            return self.fks
        if "SELECT DISTINCT" in sql:
            return self.distinct
        return self.rows

    async def fetchval(self, sql, *args):
        self.sql_log.append(("fetchval", sql, args))
        self._maybe_raise(sql)
        if "information_schema.tables" in sql:
            return self.exists
        return None

    async def execute(self, sql, *args):
        self.sql_log.append(("execute", sql, args))


class _AcquireCtx:
    def __init__(self, conn):
        self._conn = conn

    async def __aenter__(self):
        return self._conn

    async def __aexit__(self, *exc):
        return False


class FakePool:
    def __init__(self, conn):
        self._conn = conn

    def acquire(self):
        return _AcquireCtx(self._conn)


@pytest.fixture
def fake_conn():
    return FakeConn()


@pytest.fixture
def fake_pool(fake_conn):
    return FakePool(fake_conn)


@pytest.fixture
def whitelist(monkeypatch):
    """控制 default-deny 白名单：设置成 {table: bool}，或设为异常以模拟存储不可用。"""
    state = {"data": {}, "error": None}

    async def _strict():
        if state["error"] is not None:
            raise settings_service.WhitelistUnavailable(state["error"])
        return dict(state["data"])

    import services.access as access
    monkeypatch.setattr(access, "get_whitelist_strict", _strict)
    # mcp_server 也通过 access 复用同一 helper，无需额外打补丁
    return state
