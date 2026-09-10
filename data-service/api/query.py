"""原始数据查询接口。

提供"最原始的数据"，不做任何聚合/分析——分析交给 AI。

两种用法：
1. GET /api/query/{table}?limit&offset        简单分页浏览整表
2. POST /api/query                            结构化查询（推荐 AI 使用）
   {
     "table": "order_detail_raw",
     "columns": ["order_no", "order_create_time", "pay_amount", "product_qty", "product_id", "order_status"],
     "filters": [
       {"column": "order_status", "op": "=", "value": 1},
       {"column": "order_create_time", "op": ">=", "value": "2026-07-01"},
       {"column": "order_create_time", "op": "<", "value": "2026-08-01"}
     ],
     "order_by": [{"column": "order_create_time", "desc": true}],
     "limit": 1000,
     "offset": 0
   }

安全：表名/列名/操作符全部白名单校验，值全部参数化 + 显式类型转换，杜绝 SQL 注入。
"""

from datetime import date, datetime

import asyncpg
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from db import get_pool

router = APIRouter(prefix="/api/query", tags=["query"])

# 候选表清单（public 业务表 + 临期处置视图）。实际可查询哪些由设置页"白名单开关"动态决定
# 2026-09-09: 移除 alert_subscriber/replenish_subscribe(订阅已飞书化)/shelf(不存在),新增 v_procurement_disposition
ALL_TABLES = {
    "category_dim", "date_dim", "forecast_results",
    "inventory_total", "n8n_operation_log", "order_detail_raw",
    "procurement_management", "product_main", "replenish_log",
    "shelf_product_rel", "store_info",
    "store_stat_raw", "sync_meta", "user_dim",
    "v_procurement_disposition",
}


async def _is_table_allowed(table: str) -> bool:
    """查询设置页白名单开关（保存即生效）。未在设置里明确关闭的表默认开放。"""
    try:
        from services.settings_service import get_whitelist
        whitelist = await get_whitelist()
        return whitelist.get(table, True)
    except Exception:
        return True

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

# 查询行数上限。order_detail_raw 全表约 6 万行，允许 AI 做全历史聚合（内存聚合安全），
# 但设 20 万硬上限防异常大表压垮数据库
MAX_LIMIT = 200000
DEFAULT_LIMIT = 1000

# 列类型缓存：{table: {column: data_type}}
_COLUMNS_CACHE: dict[str, dict[str, str]] = {}


async def _get_columns(conn, table: str) -> dict[str, str]:
    """返回 {column: data_type}，来自 information_schema，带缓存。"""
    if table in _COLUMNS_CACHE:
        return _COLUMNS_CACHE[table]
    rows = await conn.fetch("""
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
    """, table)
    cols = {r["column_name"]: r["data_type"] for r in rows}
    _COLUMNS_CACHE[table] = cols
    return cols


def _cast_param(n: int, data_type: str) -> str:
    """生成 CAST($n AS type) 片段，避免类型歧义（如 date + 参数）。"""
    return f"CAST(${n} AS {data_type})"


def _convert_value(data_type: str, value: object) -> object:
    """按列类型把 JSON 里的值转成 asyncpg 期望的 Python 类型。

    asyncpg 在传参前会做客户端类型校验（如 timestamp 列必须给 datetime 对象），
    字符串类型直接传会报 DataError，需要先转成正确的 Python 类型。
    转换失败说明调用方给了非法值（如给数字列传非数字），抛 HTTPException 400。
    """
    if value is None:
        return None
    try:
        if data_type == "date":
            return value if isinstance(value, date) else date.fromisoformat(str(value))
        if data_type.startswith("timestamp"):
            return value if isinstance(value, datetime) else datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        if data_type in ("integer", "bigint", "smallint"):
            return int(value)
        if data_type in ("numeric", "real", "double precision", "money"):
            return float(value)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid value for {data_type} column: {value!r}") from e
    return value


def _quote_ident(name: str) -> str:
    """双引号包裹标识符（列名已白名单校验，双引号仅为防特殊字符）。"""
    return f'"{name}"'


class FilterItem(BaseModel):
    column: str
    op: str
    value: object | None = None


class OrderByItem(BaseModel):
    column: str
    desc: bool = False


class QueryRequest(BaseModel):
    table: str
    columns: list[str] | None = Field(default=None, max_length=100)
    filters: list[FilterItem] = Field(default_factory=list)
    order_by: list[OrderByItem] = Field(default_factory=list)
    limit: int = Field(default=DEFAULT_LIMIT, ge=1, le=MAX_LIMIT)
    offset: int = Field(default=0, ge=0)


@router.get("/{table_name}")
async def query_table(
    table_name: str,
    limit: int = Query(default=100, ge=1, le=MAX_LIMIT),
    offset: int = Query(default=0, ge=0),
):
    """简单分页浏览整表（原始数据，无过滤）。"""
    if not await _is_table_allowed(table_name):
        raise HTTPException(status_code=403, detail=f"Table '{table_name}' is not accessible")
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
    if not await _is_table_allowed(req.table):
        raise HTTPException(status_code=403, detail=f"Table '{req.table}' is not accessible")

    pool = get_pool()
    async with pool.acquire() as conn:
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
        params: list[object] = []
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
                params.append(_convert_value(data_type, v[0])); n1 = len(params)
                params.append(_convert_value(data_type, v[1])); n2 = len(params)
                where_parts.append(
                    f"{col_sql} BETWEEN {_cast_param(n1, data_type)} AND {_cast_param(n2, data_type)}"
                )
            elif f.op in ("IN", "NOT_IN"):
                v = f.value
                if not isinstance(v, list) or not v:
                    raise HTTPException(status_code=400, detail=f"{f.op} requires non-empty list value")
                params.append([_convert_value(data_type, x) for x in v]); n = len(params)
                arr_type = f"{data_type}[]"
                where_parts.append(f"{col_sql} {op_sql}({_cast_param(n, arr_type)})")
            else:
                if f.value is None:
                    raise HTTPException(status_code=400, detail=f"op '{f.op}' requires a value")
                params.append(_convert_value(data_type, f.value)); n = len(params)
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
