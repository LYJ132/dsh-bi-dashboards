"""AI 数据访问设置服务（白名单开关的存储与读写）。

存储：PostgreSQL 表 `bi_plugin.ai_settings`（key TEXT PRIMARY KEY, value JSONB, updated_at）。
- key = "table_access"，value = {表名: bool}
- 采用**默认拒绝**（default-deny）：只有在 ai_settings.table_access 里被明确置为
  true、且该表处于策划白名单（curated allow-list，见 api.query.ALL_TABLES）中的表才可访问。
- 读接口带 5 秒 TTL 缓存（"保存即生效"：写路径绕过缓存并立即刷新）。
- 首次使用时惰性建 schema/表（CREATE SCHEMA/TABLE IF NOT EXISTS），并把历史遗留的
  `public.ai_settings` 行一次性前滚（copy-forward）到新 schema。

单写者约束（审计 B?）：
- 写入用单条 `jsonb_set` 原子更新，避免读-改-写竞态覆盖他人开关。
- 5 秒 TTL 缓存是**进程内**的：多 worker 部署时，某一 worker 的写不会即时反映到
  其它 worker（最长 5 秒陈旧）。当前部署为单 worker（uvicorn 默认 --workers 1）。
  若将来上多 worker，应改用共享失效（如 LISTEN/NOTIFY 或缩短 TTL）。
"""
import json
import time

from db import get_pool

_SETTINGS_SCHEMA = "bi_plugin"
_SETTINGS_TABLE = "bi_plugin.ai_settings"
_LEGACY_TABLE = "public.ai_settings"
_ACCESS_KEY = "table_access"
_TTL_SECONDS = 5

_cache: dict = {"value": None, "at": 0.0}
_ensure_ready = False

CREATE_SCHEMA_SQL = f"CREATE SCHEMA IF NOT EXISTS {_SETTINGS_SCHEMA}"
CREATE_SQL = f"""
CREATE TABLE IF NOT EXISTS {_SETTINGS_TABLE} (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
)
"""


class WhitelistUnavailable(Exception):
    """白名单存储不可用（DB/读错误）。上层据此返回 503，而不是退化为全开放。"""


async def _ensure_table() -> None:
    """惰性建 schema/表 + 前滚历史 public.ai_settings 行（每个进程生命周期一次）。"""
    global _ensure_ready
    if _ensure_ready:
        return
    pool = get_pool()
    async with pool.acquire() as conn:
        await conn.execute(CREATE_SCHEMA_SQL)
        await conn.execute(CREATE_SQL)
        # copy-forward：仅当旧表存在且新表尚未持有 table_access 时搬迁，避免覆盖新数据。
        try:
            await conn.execute(
                f"""
                INSERT INTO {_SETTINGS_TABLE} (key, value, updated_at)
                SELECT key, value, updated_at FROM {_LEGACY_TABLE}
                WHERE NOT EXISTS (
                    SELECT 1 FROM {_SETTINGS_TABLE} s WHERE s.key = {_LEGACY_TABLE}.key
                )
                """,
            )
        except Exception:  # noqa: BLE001 - 旧表不存在属正常情形，忽略
            pass
    _ensure_ready = True


async def _load_raw() -> dict:
    """读取 table_access 映射（无行则 {}）。DB/解码错误抛 WhitelistUnavailable（不吞）。"""
    await _ensure_table()
    pool = get_pool()
    try:
        async with pool.acquire() as conn:
            row = await conn.fetchval(
                f"SELECT value FROM {_SETTINGS_TABLE} WHERE key = $1", _ACCESS_KEY)
    except Exception as exc:  # noqa: BLE001
        raise WhitelistUnavailable(f"failed to read table_access: {exc}") from exc
    try:
        # asyncpg 默认不自动解码 jsonb —— 读回是 str，必须 json.loads
        if isinstance(row, str):
            row = json.loads(row)
        return dict(row) if row else {}
    except Exception as exc:  # noqa: BLE001
        raise WhitelistUnavailable(f"failed to decode table_access jsonb: {exc}") from exc


async def get_whitelist_strict() -> dict:
    """返回 {表名: bool}。缓存命中直接返回；**加载失败抛 WhitelistUnavailable**（供 ACL 判定 503）。

    默认拒绝：未列出的表由上层按 False 处理。空 {} 是合法状态（全新库、未启用任何表）。
    """
    now = time.monotonic()
    if _cache["value"] is not None and (now - _cache["at"]) < _TTL_SECONDS:
        return _cache["value"]
    value = await _load_raw()
    _cache["value"] = value
    _cache["at"] = now
    return value


async def get_whitelist() -> dict:
    """向后兼容的宽松读取：加载失败时返回空 {}（调用方自行决定语义）。"""
    try:
        return await get_whitelist_strict()
    except WhitelistUnavailable as e:
        print(f"[settings_service] get_whitelist failed: {e}")
        return {}


async def set_table_access(table: str, accessible: bool) -> dict:
    """更新单表开关，**原子写**（jsonb_set），写后强制刷新缓存（保存即生效）。

    用单条 UPDATE ... jsonb_set 完成读-改-写，规避"先读全量再整体覆盖"的竞态。
    行不存在时先 INSERT 一个空对象占位（ON CONFLICT DO NOTHING）再 jsonb_set。
    """
    await _ensure_table()
    pool = get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            f"INSERT INTO {_SETTINGS_TABLE} (key, value) VALUES ($1, '{{}}'::jsonb) "
            "ON CONFLICT (key) DO NOTHING",
            _ACCESS_KEY,
        )
        await conn.execute(
            f"UPDATE {_SETTINGS_TABLE} "
            "SET value = jsonb_set(value, ARRAY[$2::text], to_jsonb($3::bool), true), "
            "    updated_at = now() "
            "WHERE key = $1",
            _ACCESS_KEY, table, bool(accessible),
        )
        row = await conn.fetchval(
            f"SELECT value FROM {_SETTINGS_TABLE} WHERE key = $1", _ACCESS_KEY)
    if isinstance(row, str):
        row = json.loads(row)
    current = dict(row) if row else {table: bool(accessible)}
    _cache["value"] = current
    _cache["at"] = time.monotonic()
    return current


def invalidate_cache() -> None:
    global _cache
    _cache = {"value": None, "at": 0.0}
