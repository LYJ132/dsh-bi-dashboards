"""AI 数据访问设置服务（白名单开关的存储与读写）。

存储：PostgreSQL 表 ai_settings（key TEXT PRIMARY KEY, value JSONB, updated_at）。
- key = "table_access"，value = {表名: bool}，未列出的表默认开放
- 读接口带 5 秒 TTL 缓存（"保存即生效"：写路径绕过缓存并立即刷新）
- 首次使用时自动建表（CREATE TABLE IF NOT EXISTS）

消费方：routers/query.py 的 _is_table_allowed / routers/meta.py 的 _meta_allowed。
"""
import json
import time

from db import get_pool

_SETTINGS_TABLE = "ai_settings"
_ACCESS_KEY = "table_access"
_TTL_SECONDS = 5

_cache = {"value": None, "at": 0.0}
_ensure_ready = False

CREATE_SQL = f"""
CREATE TABLE IF NOT EXISTS {_SETTINGS_TABLE} (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
)
"""


async def _ensure_table() -> None:
    """惰性建表（每个进程生命周期一次）。"""
    global _ensure_ready
    if _ensure_ready:
        return
    pool = get_pool()
    async with pool.acquire() as conn:
        await conn.execute(CREATE_SQL)
    _ensure_ready = True


async def get_whitelist() -> dict:
    """返回 {表名: bool}。缓存 5 秒；未初始化/读失败时返回空表（全开放）。"""
    global _cache
    now = time.monotonic()
    if _cache["value"] is not None and (now - _cache["at"]) < _TTL_SECONDS:
        return _cache["value"]
    try:
        await _ensure_table()
        pool = get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchval(
                f"SELECT value FROM {_SETTINGS_TABLE} WHERE key = $1", _ACCESS_KEY)
        # asyncpg 默认不自动解码 jsonb —— 读回是 str，必须 json.loads
        if isinstance(row, str):
            row = json.loads(row)
        value = dict(row) if row else {}
        _cache = {"value": value, "at": now}
        return value
    except Exception as e:
        # 存储不可用时保持全开放（与接缝的 fallback 行为一致），不缓存
        print(f"[settings_service] get_whitelist failed: {e}")
        return {}


async def set_table_access(table: str, accessible: bool) -> dict:
    """更新单表开关，立即生效（写后强制刷新缓存）。"""
    await _ensure_table()
    current = await get_whitelist()
    current = dict(current)
    current[table] = bool(accessible)
    pool = get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            f"INSERT INTO {_SETTINGS_TABLE} (key, value) VALUES ($1, $2::jsonb) "
            "ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()",
            _ACCESS_KEY, json.dumps(current))
    global _cache
    _cache = {"value": current, "at": time.monotonic()}
    return current


def invalidate_cache() -> None:
    global _cache
    _cache = {"value": None, "at": 0.0}
