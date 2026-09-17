"""原始数据查询接口。

提供"最原始的数据"，不做任何聚合/分析——分析交给 AI。

端点：
1. GET  /api/query/{table}?limit&offset           简单分页浏览整表
2. GET  /api/query/{table}/distinct/{column}      某列去重取值（供宿主筛选值下拉）
3. POST /api/query                                 结构化查询（推荐 AI 使用）
   {
     "table": "order_detail_raw",
     "columns": ["order_no", "pay_amount", "product_qty"],
     "filters": [
       {"column": "order_status", "op": "=", "value": 1},
       {"column": "order_create_time", "op": ">=", "value": "2026-07-01"}
     ],
     "order_by": [{"column": "order_create_time", "desc": true}],
     "limit": 1000,
     "offset": 0
   }

安全：表名/列名/操作符全部白名单校验 + 标识符长度上限；值全部参数化 + 按列类型显式转换，
杜绝 SQL 注入与类型歧义。访问控制走 services.access 的 default-deny helper（HTTP/MCP 共用）。
"""

from datetime import date, datetime
import time
from typing import Any

import asyncpg
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field, field_validator

from db import get_pool
from services.access import (
    AccessControlError,
    ALL_TABLES,
    MAX_IDENTIFIER_LEN,
    ensure_table_access,
)

router = APIRouter(prefix="/api/query", tags=["query"])

# 权威可查询表清单来自 services.access（ACL 唯一来源），此处保留别名供文档/兼容引用。
__all__ = ["ALL_TABLES", "QueryRequest", "FilterItem", "OrderByItem", "router"]


async def _guard(table: str) -> None:
    """把共享 ACL 结果翻译成 HTTP 异常（403 拒绝 / 503 存储不可用）。"""
    try:
        await ensure_table_access(table)
    except AccessControlError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail) from e


# 允许的操作符 → SQL 片段（value 全部参数化）
OPS = {
    "=": "=",
    "!=": "<>",
    ">": ">",
    ">=": ">=",
    "<": "<",
    "<=": "<=",
    "IN": "= ANY",
    "NOT_IN": "!= ALL",
    "LIKE": "LIKE",
    "ILIKE": "ILIKE",
    "BETWEEN": "BETWEEN",
    "IS_NULL": "IS NULL",
    "IS_NOT_NULL": "IS NOT NULL",
}

# 查询行数上限。order_detail_raw 全表约 6 万行；审计 A?：把过高的 20 万硬上限下调到 1 万，
# 降低单请求拖垮数据库的风险。**显式天花板**：MAX_LIMIT = 10000，任何请求 limit 不得超过它。
MAX_LIMIT = 10000
DEFAULT_LIMIT = 1000

# 请求规模上限（审计 B?）：过滤条件 / 排序 / 列选择的数量、标识符长度，均有硬上限，
# 与"请求体上限"共同构成对畸形/超大请求的防御。
MAX_FILTERS = 50
MAX_ORDER_BY = 10
MAX_COLUMNS = 100

# 列类型缓存：{table: (cols, loaded_at)}。带 TTL（审计 B9）：
# 1) 避免表结构变更后缓存永久陈旧；2) 防止缓存随表数量无限增长。
_COLUMNS_TTL_SECONDS = 300
_COLUMNS_CACHE: dict[str, tuple[dict[str, str], float]] = {}


async def _get_columns(conn, table: str) -> dict[str, str]:
    """返回 {column: data_type}，来自 information_schema，带 5 分钟 TTL 缓存。"""
    now = time.monotonic()
    entry = _COLUMNS_CACHE.get(table)
    if entry is not None and (now - entry[1]) < _COLUMNS_TTL_SECONDS:
        return entry[0]
    rows = await conn.fetch("""
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
    """, table)
    cols = {r["column_name"]: r["data_type"] for r in rows}
    _COLUMNS_CACHE[table] = (cols, now)
    return cols


def clear_columns_cache() -> None:
    """清空列缓存（测试/表结构变更时用）。"""
    _COLUMNS_CACHE.clear()


def _cast_param(n: int, data_type: str) -> str:
    """生成 CAST($n AS type) 片段，避免类型歧义（如 date + 参数）。"""
    return f"CAST(${n} AS {data_type})"


def _convert_value(data_type: str, value: Any, *, column: str = "") -> Any:
    """按列类型把 JSON 里的值转成 asyncpg 期望的 Python 类型。

    asyncpg 传参前会做客户端类型校验（如 timestamp 列必须给 datetime 对象），
    转换失败说明调用方给了非法值（如给数字列传非数字）-> 抛 HTTPException 400。
    审计 A?: 捕获 ValueError / TypeError / OverflowError（如 int('9'*400) 溢出、给
    int 列传 list 触发 TypeError），一律 400，不再静默原样传参导致下游 500。
    """
    if value is None:
        return None
    label = column or data_type
    try:
        if data_type == "date":
            return value if isinstance(value, date) else date.fromisoformat(str(value))
        if data_type.startswith("timestamp"):
            if isinstance(value, datetime):
                return value
            return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        if data_type in ("integer", "bigint", "smallint"):
            return int(value)
        if data_type in ("numeric", "real", "double precision", "money"):
            return float(value)
    except (ValueError, TypeError, OverflowError) as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid value for {label} ({data_type}) column: {value!r}",
        ) from e
    return value


def _quote_ident(name: str) -> str:
    """双引号包裹标识符（列名已白名单/存在性校验，双引号仅为防特殊字符）。"""
    return f'"{name}"'


def _check_ident(name: str, kind: str) -> str:
    """标识符长度上限校验；在 Pydantic 校验器内调用（HTTP/MCP 共用）。"""
    if not isinstance(name, str) or not name or len(name) > MAX_IDENTIFIER_LEN:
        raise ValueError(f"{kind} must be a 1..{MAX_IDENTIFIER_LEN} char string")
    return name


class FilterItem(BaseModel):
    column: str
    op: str
    value: Any | None = None

    @field_validator("column")
    @classmethod
    def _col_len(cls, v: str) -> str:
        return _check_ident(v, "filter.column")


class OrderByItem(BaseModel):
    column: str
    desc: bool = False

    @field_validator("column")
    @classmethod
    def _col_len(cls, v: str) -> str:
        return _check_ident(v, "order_by.column")


class QueryRequest(BaseModel):
    """结构化查询请求 —— HTTP POST /api/query 与 MCP query_data **共用同一校验模型**。"""

    table: str
    columns: list[str] | None = Field(default=None, max_length=MAX_COLUMNS)
    filters: list[FilterItem] = Field(default_factory=list, max_length=MAX_FILTERS)
    order_by: list[OrderByItem] = Field(default_factory=list, max_length=MAX_ORDER_BY)
    limit: int = Field(default=DEFAULT_LIMIT, ge=1, le=MAX_LIMIT)
    offset: int = Field(default=0, ge=0)

    @field_validator("table")
    @classmethod
    def _table_len(cls, v: str) -> str:
        return _check_ident(v, "table")

    @field_validator("columns")
    @classmethod
    def _columns_len(cls, v: list[str] | None) -> list[str] | None:
        if v is not None:
            for c in v:
                _check_ident(c, "columns[]")
        return v


async def execute_query(conn, req: QueryRequest) -> dict:
    """按已校验的 QueryRequest 构造并执行 SQL，返回响应 dict（rows 为原始 Python 值）。

    HTTP 与 MCP 共用：HTTP 直接把 dict 交给 FastAPI 序列化；MCP 用完整 JSON 编码器序列化。
    调用前须已完成表级 ACL 校验（ensure_table_access），本函数只负责列/值/构造/执行。
    """
    cols = await _get_columns(conn, req.table)

    # 校验列选择
    if req.columns:
        for c in req.columns:
            if c not in cols:
                raise HTTPException(status_code=400, detail=f"Column '{c}' not in table '{req.table}'")
        select_cols = [_quote_ident(c) for c in req.columns]
    else:
        select_cols = ["*"]

    # 构造 WHERE
    where_parts: list[str] = []
    params: list[Any] = []
    for f in req.filters:
        if f.column not in cols:
            raise HTTPException(status_code=400, detail=f"Column '{f.column}' not in table '{req.table}'")
        if f.op not in OPS:
            raise HTTPException(status_code=400, detail=f"Unsupported op '{f.op}'")
        data_type = cols[f.column]
        col_sql = _quote_ident(f.column)
        op_sql = OPS[f.op]

        if f.op == "IS_NULL":
            where_parts.append(f"{col_sql} IS NULL")
        elif f.op == "IS_NOT_NULL":
            where_parts.append(f"{col_sql} IS NOT NULL")
        elif f.op == "BETWEEN":
            v = f.value
            if not isinstance(v, (list, tuple)) or len(v) != 2:
                raise HTTPException(status_code=400, detail="BETWEEN requires value=[a, b]")
            params.append(_convert_value(data_type, v[0], column=f.column)); n1 = len(params)
            params.append(_convert_value(data_type, v[1], column=f.column)); n2 = len(params)
            where_parts.append(
                f"{col_sql} BETWEEN {_cast_param(n1, data_type)} AND {_cast_param(n2, data_type)}"
            )
        elif f.op in ("IN", "NOT_IN"):
            v = f.value
            if not isinstance(v, list) or not v:
                raise HTTPException(status_code=400, detail=f"{f.op} requires non-empty list value")
            params.append([_convert_value(data_type, x, column=f.column) for x in v]); n = len(params)
            # 按列类型转数组（而非一律 ::text[]），避免 text 与 int/timestamp 等的比较类型错误
            arr_type = f"{data_type}[]"
            where_parts.append(f"{col_sql} {op_sql}({_cast_param(n, arr_type)})")
        else:
            if f.value is None:
                raise HTTPException(status_code=400, detail=f"op '{f.op}' requires a value")
            params.append(_convert_value(data_type, f.value, column=f.column)); n = len(params)
            where_parts.append(f"{col_sql} {op_sql} {_cast_param(n, data_type)}")

    where_sql = f" WHERE {' AND '.join(where_parts)}" if where_parts else ""

    # ORDER BY
    order_parts: list[str] = []
    for o in req.order_by:
        if o.column not in cols:
            raise HTTPException(status_code=400, detail=f"Column '{o.column}' not in table '{req.table}'")
        direction = " DESC" if o.desc else ""
        order_parts.append(f'{_quote_ident(o.column)}{direction}')
    order_sql = f" ORDER BY {', '.join(order_parts)}" if order_parts else ""

    # 分页
    params.append(req.limit); n_lim = len(params)
    params.append(req.offset); n_off = len(params)

    sql = (
        f"SELECT {', '.join(select_cols)} FROM \"{req.table}\""
        f"{where_sql}{order_sql} LIMIT ${n_lim} OFFSET ${n_off}"
    )
    try:
        rows = await conn.fetch(sql, *params)
    except asyncpg.exceptions.UndefinedTableError:
        raise HTTPException(status_code=404, detail=f"Table '{req.table}' does not exist")

    return {
        "table": req.table,
        "count": len(rows),
        "truncated": len(rows) == req.limit,
        "limit": req.limit,
        "offset": req.offset,
        "columns": req.columns or list(cols.keys()),
        "rows": [dict(r) for r in rows],
    }


@router.get("/{table_name}/distinct/{column}")
async def query_distinct(
    table_name: str,
    column: str,
    limit: int = Query(default=100, ge=1, le=500),
):
    """某列去重取值（默认 100，最多 500）。供宿主看板筛选值下拉消费。

    契约：返回 {"values": [...]}（宿主包 P3 依此对接）。NULL 值剔除，按值升序。
    """
    _check_ident_http(column, "column")
    await _guard(table_name)
    pool = get_pool()
    async with pool.acquire() as conn:
        cols = await _get_columns(conn, table_name)
        if not cols:
            raise HTTPException(status_code=404, detail=f"Table '{table_name}' does not exist")
        if column not in cols:
            raise HTTPException(status_code=400, detail=f"Column '{column}' not in table '{table_name}'")
        qc = _quote_ident(column)
        sql = (
            f'SELECT DISTINCT {qc} FROM "{table_name}" '
            f"WHERE {qc} IS NOT NULL ORDER BY {qc} LIMIT $1"
        )
        try:
            rows = await conn.fetch(sql, limit)
        except asyncpg.exceptions.UndefinedTableError:
            raise HTTPException(status_code=404, detail=f"Table '{table_name}' does not exist")
    return {"table": table_name, "column": column, "values": [r[column] for r in rows]}


def _check_ident_http(name: str, kind: str) -> None:
    try:
        _check_ident(name, kind)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/{table_name}")
async def query_table(
    table_name: str,
    limit: int = Query(default=100, ge=1, le=MAX_LIMIT),
    offset: int = Query(default=0, ge=0),
):
    """简单分页浏览整表（原始数据，无过滤）。"""
    await _guard(table_name)
    pool = get_pool()
    async with pool.acquire() as conn:
        try:
            cols = await _get_columns(conn, table_name)
            rows = await conn.fetch(
                f'SELECT * FROM "{table_name}" LIMIT $1 OFFSET $2', limit, offset
            )
        except asyncpg.exceptions.UndefinedTableError:
            raise HTTPException(status_code=404, detail=f"Table '{table_name}' does not exist")
        return {
            "table": table_name,
            "count": len(rows),
            "truncated": len(rows) == limit,
            "limit": limit,
            "offset": offset,
            "columns": list(cols.keys()),
            "rows": [dict(r) for r in rows],
        }


@router.post("")
async def structured_query(req: QueryRequest):
    """结构化原始数据查询（推荐 AI 使用）：列选择 + 过滤 + 排序 + 分页。"""
    await _guard(req.table)
    pool = get_pool()
    async with pool.acquire() as conn:
        return await execute_query(conn, req)
