"""校园超市数据访问 MCP 服务器。

为 DeepSeek Harness (DSH) 提供数据访问工具：
  - get_meta         获取数据字典（表清单/字段/关系）
  - query_data       查询原始业务数据（只读）
"""

from __future__ import annotations

import json
import logging
from typing import Any

import asyncpg
from fastmcp import FastMCP

from config import DSN, settings as cfg

logger = logging.getLogger("mcp_server")

# ── MCP 实例 ──────────────────────────────────────────────────────────────────
mcp = FastMCP(
    "campus-store-data",
    instructions="""你是校园超市数据助手。用户需要通过自然语言查询数据，
你通过 get_meta 了解表结构，通过 query_data 查询原始数据。
回答请使用中文。数据查询以 order_status=1 为有效订单。""",
)


# ── 数据库连接 ────────────────────────────────────────────────────────────────
_pool: asyncpg.Pool | None = None


async def _get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(
            dsn=DSN,
            min_size=cfg.db_pool_min_size,
            max_size=cfg.db_pool_max_size,
            command_timeout=15,
        )
    return _pool


# ── 工具：get_meta ────────────────────────────────────────────────────────────
@mcp.tool()
async def get_meta(
    subject: str = "tables",
    table: str | None = None,
) -> str:
    """获取数据库数据字典。

    subject:
      - "tables"        全部表清单 + 行数（推荐优先调用）
      - "relationships" 表间关系（外键）
      - "columns"       指定表的字段清单（需传 table 参数）
    """
    if subject not in ("tables", "relationships", "columns"):
        return json.dumps({"error": f"subject 必须是 tables/relationships/columns，收到: {subject!r}"})

    pool = await _get_pool()
    async with pool.acquire() as conn:
        if subject == "tables":
            rows = await conn.fetch("""
                SELECT table_name FROM information_schema.tables
                WHERE table_schema = 'public' ORDER BY table_name
            """)
            result = []
            for r in rows:
                name = r["table_name"]
                try:
                    cnt = await conn.fetchval(f'SELECT COUNT(*) FROM "{name}"')
                except Exception:
                    cnt = None
                result.append({"table": name, "rows": cnt})
            return json.dumps({"subject": "tables", "tables": result}, ensure_ascii=False)

        if subject == "relationships":
            rows = await conn.fetch("""
                SELECT tc.table_name AS from_table, kcu.column_name AS from_column,
                       ccu.table_name AS to_table, ccu.column_name AS to_column
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu
                  ON tc.constraint_name = kcu.constraint_name
                JOIN information_schema.constraint_column_usage ccu
                  ON tc.constraint_name = ccu.constraint_name
                WHERE tc.constraint_type = 'FOREIGN KEY'
                  AND tc.table_schema = 'public'
                ORDER BY tc.table_name, kcu.column_name
            """)
            return json.dumps({
                "subject": "relationships",
                "foreign_keys": [
                    {"from_table": r["from_table"], "from_column": r["from_column"],
                     "to_table": r["to_table"], "to_column": r["to_column"]}
                    for r in rows
                ],
            }, ensure_ascii=False)

        # columns
        if not table:
            return json.dumps({"error": "查询字段需要提供 table 参数"})
        rows = await conn.fetch("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = $1
            ORDER BY ordinal_position
        """, table)
        return json.dumps({
            "subject": "columns", "table": table,
            "columns": [
                {"name": r["column_name"], "type": r["data_type"],
                 "nullable": r["is_nullable"] == "YES"}
                for r in rows
            ],
        }, ensure_ascii=False)


# ── 工具：query_data ──────────────────────────────────────────────────────────
OPS_MAP: dict[str, str] = {
    "=": "=", "!=": "<>", ">": ">", ">=": ">=", "<": "<", "<=": "<=",
    "IN": "= ANY", "LIKE": "LIKE", "ILIKE": "ILIKE",
    "BETWEEN": "BETWEEN", "IS_NULL": "IS NULL", "IS_NOT_NULL": "IS NOT NULL",
}
MAX_QUERY_LIMIT = 200000
DEFAULT_QUERY_LIMIT = 1000


def _cast_value(data_type: str, value: Any) -> Any:
    """JSON 值 → asyncpg 期望的 Python 类型。"""
    if value is None:
        return None
    try:
        if data_type == "date":
            from datetime import date
            return value if isinstance(value, date) else date.fromisoformat(str(value))
        if data_type.startswith("timestamp"):
            from datetime import datetime
            s = str(value).replace("Z", "+00:00")
            return value if isinstance(value, datetime) else datetime.fromisoformat(s)
        if data_type in ("integer", "bigint", "smallint"):
            return int(value)
        if data_type in ("numeric", "real", "double precision", "money"):
            return float(value)
    except (ValueError, TypeError):
        pass
    return value


class _DecimalEncoder(json.JSONEncoder):
    """自定义 JSON 编码器，处理 PostgreSQL Decimal 类型。"""
    def default(self, obj):
        from decimal import Decimal
        if isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)


@mcp.tool()
async def query_data(
    table: str,
    columns: list[str] | None = None,
    filters: list[dict] | None = None,
    order_by: list[dict] | None = None,
    limit: int = DEFAULT_QUERY_LIMIT,
) -> str:
    """查询原始业务数据（只读，带白名单校验）。

    - table: 表名
    - columns: 要查询的列（默认全部）
    - filters: 过滤条件 [{column, op, value}]，op 支持 =,!=,>,>=,<,<=,IN,LIKE,ILIKE,BETWEEN,IS_NULL
    - order_by: 排序 [{column, desc}]
    - limit: 返回行数上限（默认 1000，最大 200000）
    """
    if limit > MAX_QUERY_LIMIT:
        limit = MAX_QUERY_LIMIT

    pool = await _get_pool()
    async with pool.acquire() as conn:
        cols = await conn.fetch("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = $1
        """, table)
        col_map = {r["column_name"]: r["data_type"] for r in cols}
        if not col_map:
            return json.dumps({"error": f"表 '{table}' 不存在或无字段", "table": table})

        select_cols = [f'"{c}"' for c in (columns or col_map.keys())]
        params: list[Any] = []
        where_parts: list[str] = []

        if filters:
            for f in filters:
                col = f.get("column")
                op = f.get("op", "=")
                if col not in col_map:
                    return json.dumps({"error": f"列 '{col}' 不存在于表 '{table}'"})
                dtype = col_map[col]
                qcol = f'"{col}"'
                if op == "IS_NULL":
                    where_parts.append(f"{qcol} IS NULL")
                elif op == "IS_NOT_NULL":
                    where_parts.append(f"{qcol} IS NOT NULL")
                elif op == "BETWEEN":
                    v = f.get("value")
                    if not isinstance(v, (list, tuple)) or len(v) != 2:
                        return json.dumps({"error": f"BETWEEN 需要 value=[a, b]，收到: {v!r}"})
                    params.append(_cast_value(dtype, v[0]))
                    params.append(_cast_value(dtype, v[1]))
                    n1, n2 = len(params) - 2, len(params) - 1
                    where_parts.append(f"{qcol} BETWEEN ${n1} AND ${n2}")
                elif op == "IN":
                    v = f.get("value")
                    if not isinstance(v, list) or not v:
                        return json.dumps({"error": "IN 需要非空列表"})
                    casted = [_cast_value(dtype, x) for x in v]
                    params.append(casted)
                    n = len(params)
                    where_parts.append(f"{qcol} = ANY(${n}::text[])")
                elif op in OPS_MAP:
                    params.append(_cast_value(dtype, f.get("value")))
                    n = len(params)
                    where_parts.append(f"{qcol} {OPS_MAP[op]} ${n}")
                else:
                    return json.dumps({"error": f"不支持的操作符: {op!r}"})

        where_sql = f" WHERE {' AND '.join(where_parts)}" if where_parts else ""

        order_parts: list[str] = []
        if order_by:
            for o in order_by:
                oc = o.get("column")
                if oc not in col_map:
                    return json.dumps({"error": f"排序列 '{oc}' 不存在于表 '{table}'"})
                direction = " DESC" if o.get("desc") else ""
                order_parts.append(f'"{oc}"{direction}')
        order_sql = f" ORDER BY {', '.join(order_parts)}" if order_parts else ""

        params.append(limit)
        n_lim = len(params)
        sql = f'SELECT {", ".join(select_cols)} FROM "{table}"{where_sql}{order_sql} LIMIT ${n_lim}'
        rows = await conn.fetch(sql, *params)

        return json.dumps({
            "table": table,
            "count": len(rows),
            "columns": list(col_map.keys()) if columns is None else columns,
            "rows": [dict(r) for r in rows],
        }, ensure_ascii=False, cls=_DecimalEncoder)


# ── 供 main.py 挂载的 ASGI app ────────────────────────────────────────────────
mcp_app = mcp.http_app()
