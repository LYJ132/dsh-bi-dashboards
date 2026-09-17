"""校园超市数据访问 MCP 服务器。

为 DeepSeek Harness (DSH) 提供数据访问工具：
  - get_meta         获取数据字典（表清单/字段/关系）—— 仅可访问表
  - query_data       查询原始业务数据（只读）—— 与 HTTP 共用同一 ACL/校验/执行路径

审计 A4/B?：
- query_data 强制走 services.access.ensure_table_access（与 HTTP 同一 helper，默认拒绝）。
- 复用 HTTP 的 Pydantic 请求模型 QueryRequest 与执行器 execute_query：同一列/值校验、
  同一按列类型 IN 转换、同一 offset + truncated 语义，杜绝 HTTP 与 MCP 行为漂移。
- JSON 序列化使用完整编码器（Decimal / date / datetime / UUID），不再静默吞掉转换错误；
  类型/列/值错误以**结构化 error** 返回（含 code），供上层可判定处理。
"""

from __future__ import annotations

import json
import logging
import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any

import asyncpg
from fastapi import HTTPException
from fastmcp import FastMCP
from pydantic import ValidationError

from api.query import (  # 与 HTTP 完全共享：请求模型 + SQL 执行器 + 行数上限
    QueryRequest,
    execute_query,
    MAX_LIMIT,
    DEFAULT_LIMIT,
    MAX_FILTERS,
    MAX_ORDER_BY,
)
from config import DSN, settings as cfg
from services.access import (
    AccessControlError,
    accessible_tables,
    ensure_table_access,
)

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


async def close_pool() -> None:
    """供 lifespan/测试显式关闭 MCP 私有连接池。"""
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


# ── JSON 编码（完整：Decimal / date / datetime / UUID）────────────────────────
def _json_default(obj: Any) -> Any:
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    if isinstance(obj, uuid.UUID):
        return str(obj)
    if isinstance(obj, (bytes, bytearray)):
        return obj.decode("utf-8", "replace")
    raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")


def _err(message: str, **extra: Any) -> str:
    """结构化错误响应（MCP 工具统一返回字符串 JSON）。"""
    payload: dict[str, Any] = {"error": message}
    payload.update(extra)
    return json.dumps(payload, ensure_ascii=False, default=_json_default)


# ── 工具：get_meta ────────────────────────────────────────────────────────────
@mcp.tool()
async def get_meta(
    subject: str = "tables",
    table: str | None = None,
) -> str:
    """获取数据库数据字典（仅返回可访问的表）。

    subject:
      - "tables"        全部可访问表清单 + 行数估算（推荐优先调用）
      - "relationships" 表间关系（外键，仅两端可访问）
      - "columns"       指定表的字段清单（需传 table 参数）
    """
    if subject not in ("tables", "relationships", "columns"):
        return _err(f"subject 必须是 tables/relationships/columns，收到: {subject!r}")

    # 与 HTTP 同一 ACL：存储不可用 -> 结构化 error（对应 HTTP 503）
    try:
        allowed = await accessible_tables()
    except AccessControlError as e:
        return _err(e.detail, code="access_control_unavailable", status=e.status_code)

    pool = await _get_pool()
    async with pool.acquire() as conn:
        if subject == "tables":
            rows = await conn.fetch("""
                SELECT c.relname AS table_name,
                       CASE WHEN c.reltuples::bigint < 0 THEN 0 ELSE c.reltuples::bigint END AS row_estimate
                FROM pg_class c
                JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE n.nspname = 'public' AND c.relkind IN ('r','p','v','m','f')
                ORDER BY c.relname
            """)
            result = [
                {"table": r["table_name"], "rows": int(r["row_estimate"] or 0), "estimated": True}
                for r in rows if r["table_name"] in allowed
            ]
            return json.dumps({"subject": "tables", "tables": result},
                              ensure_ascii=False, default=_json_default)

        if subject == "relationships":
            fks = await conn.fetch("""
                SELECT tc.table_name AS from_table, kcu.column_name AS from_column,
                       ccu.table_name AS to_table, ccu.column_name AS to_column,
                       kcu.ordinal_position AS position
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu
                  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage ccu
                  ON tc.constraint_name = ccu.constraint_name
                 AND ccu.ordinal_position = kcu.ordinal_position
                WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
                ORDER BY tc.table_name, kcu.ordinal_position
            """)
            fk_list = [
                {"from_table": r["from_table"], "from_column": r["from_column"],
                 "to_table": r["to_table"], "to_column": r["to_column"],
                 "position": int(r["position"]) if r["position"] is not None else None}
                for r in fks
                if r["from_table"] in allowed and r["to_table"] in allowed
            ]
            return json.dumps({"subject": "relationships", "foreign_keys": fk_list},
                              ensure_ascii=False, default=_json_default)

        # columns：表级 ACL（不在权威清单/未启用 -> 拒绝；存储不可用 -> 结构化 error）
        try:
            await ensure_table_access(table or "")
        except AccessControlError as e:
            return _err(e.detail, code="access_denied" if e.status_code == 403 else "access_control_unavailable",
                        status=e.status_code)
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
        }, ensure_ascii=False, default=_json_default)


# ── 工具：query_data ──────────────────────────────────────────────────────────
@mcp.tool()
async def query_data(
    table: str,
    columns: list[str] | None = None,
    filters: list[dict] | None = None,
    order_by: list[dict] | None = None,
    limit: int = DEFAULT_LIMIT,
    offset: int = 0,
) -> str:
    """查询原始业务数据（只读，默认拒绝，带白名单校验）。

    与 HTTP POST /api/query 共用同一 Pydantic 校验模型与 SQL 执行器，行为完全一致。

    - table: 表名（必须在权威清单且已在设置中启用）
    - columns: 要查询的列（默认全部）
    - filters: 过滤条件 [{column, op, value}]，op 支持 =,!=,>,>=,<,<=,IN,NOT_IN,LIKE,ILIKE,BETWEEN,IS_NULL,IS_NOT_NULL
    - order_by: 排序 [{column, desc}]
    - limit: 返回行数上限（默认 1000，显式天花板 10000）
    - offset: 分页偏移（默认 0）

    返回 JSON：{table, count, truncated, limit, offset, columns, rows}；错误为 {error, code, ...}。
    """
    # 1) 复用 HTTP 的请求模型做参数校验（filters<=50, order_by<=10, 标识符<=128, limit 天花板…）
    try:
        req = QueryRequest(
            table=table,
            columns=columns,
            filters=filters or [],
            order_by=order_by or [],
            limit=limit,
            offset=offset,
        )
    except ValidationError as e:
        return _err("invalid request", code="validation_error",
                    errors=json.loads(e.json()), max_limit=MAX_LIMIT,
                    max_filters=MAX_FILTERS, max_order_by=MAX_ORDER_BY)

    # 2) 与 HTTP 同一 ACL helper（默认拒绝 / 存储不可用 503）
    try:
        await ensure_table_access(req.table)
    except AccessControlError as e:
        return _err(e.detail,
                    code="access_denied" if e.status_code == 403 else "access_control_unavailable",
                    status=e.status_code, table=req.table)

    # 3) 复用 HTTP 执行器；其列/值/类型错误以 HTTPException 表达，转成结构化 error
    pool = await _get_pool()
    try:
        async with pool.acquire() as conn:
            result = await execute_query(conn, req)
    except HTTPException as e:
        return _err(str(e.detail), code=f"http_{e.status_code}", status=e.status_code, table=req.table)
    except asyncpg.exceptions.UndefinedTableError:
        return _err(f"表 '{req.table}' 不存在或无字段", code="table_not_found", table=req.table)

    return json.dumps(result, ensure_ascii=False, default=_json_default)


# ── 供 main.py 挂载的 ASGI app ────────────────────────────────────────────────
mcp_app = mcp.http_app()
