"""asyncpg 连接池管理（只读访问）。连接数有上限，避免挤爆数据库。

只读保障：
1. 所有查询代码只使用 SELECT（见 query.py / analytics.py 的 SQL）
2. 连接池受控（min=2, max=10），不会像上一版看板那样泄漏上百个 idle 连接
3. 后续如需硬性只读，可建一个仅授予 SELECT 的数据库角色，再切换 DB_USER
"""

import asyncpg

from config import DSN, settings

_pool: asyncpg.Pool | None = None


async def init_pool() -> None:
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(
            dsn=DSN,
            min_size=settings.db_pool_min_size,
            max_size=settings.db_pool_max_size,
            command_timeout=15,
        )


async def close_pool() -> None:
    global _pool
    if _pool:
        await _pool.close()
        _pool = None


def get_pool() -> asyncpg.Pool:
    assert _pool is not None, "Database pool not initialized"
    return _pool
