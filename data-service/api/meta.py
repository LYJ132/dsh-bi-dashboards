"""数据字典与表关系接口。

这些端点是"AI 获取数据及数据间的关系"的基础：
- /api/meta/tables         可访问表清单 + 行数估算 + 中文说明
- /api/meta/table/{table}  单表字段（名称/类型/可空/默认值）
- /api/meta/relationships  表间关系（数据库外键 + 手工补充的业务关系）

访问控制与查询/MCP 共用 services.access 的 default-deny helper：不可访问的表**不出现在**
响应里（不泄露存在性），白名单存储不可用时返回 503。
行数用 pg_class.reltuples 估算（审计 B?：不再对每表 COUNT(*) 全扫），并标记 estimated。
"""

from fastapi import APIRouter, HTTPException

from db import get_pool
from services.access import AccessControlError, accessible_tables, ensure_table_access

router = APIRouter(prefix="/api/meta", tags=["meta"])

# 表说明（中文，供 AI 理解业务含义）
TABLE_DESCRIPTIONS = {
    "order_detail_raw": "销售明细：每行一条订单商品（一订单多商品则多行）。唯一大规模历史数据源",
    "product_main": "商品主档：product_id 是 13 位 EAN 条码。product_status=1 在售，0 停售",
    "category_dim": "品类维度：cate_code 主键，含 big_category 大类 / mid_category 中类",
    "inventory_total": "库存快照：warehouse_stock 仓库库存、shelf_current_stock 货架库存、safety_stock 安全库存线",
    "forecast_results": "销量预测结果：prophet/tsb 模型按 (product_id, store_id, forecast_date) 预测，含预测区间",
    "date_dim": "日期维度：2022~2026 连续日，is_weekend 周末标记（is_holiday 当前全为 0 无标注）",
    "user_dim": "用户维度：只有 user_id 和 register_time 有数据，其余字段为空",
    "sync_meta": "同步元数据：last_full_sync / last_incr_sync 时间戳",
    "procurement_management": "采购批次/保质期：当前为空表，无数据",
    "shelf_product_rel": "货架-商品关联：空表（摆放关系已改由 shelf.product_code 承载）",
}

# 手工补充的业务关系（无 DB 外键约束，但业务上确实关联）
MANUAL_RELATIONSHIPS = [
    {
        "from_table": "product_main",
        "from_column": "cate_code",
        "to_table": "category_dim",
        "to_column": "cate_code",
        "kind": "many-to-one",
        "note": "商品归属品类（无外键约束，业务关联）",
    },
]


@router.get("/tables")
async def list_tables():
    """可访问表清单 + 行数估算 + 说明。不可访问的表直接省略。"""
    try:
        allowed = await accessible_tables()
    except AccessControlError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail) from e
    pool = get_pool()
    async with pool.acquire() as conn:
        # reltuples 是统计估算值（未 ANALYZE 的表可能为 -1/0），远快于逐表 COUNT(*)。
        rows = await conn.fetch("""
            SELECT c.relname AS table_name,
                   CASE WHEN c.reltuples::bigint < 0 THEN 0 ELSE c.reltuples::bigint END AS row_estimate
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public'
              AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
            ORDER BY c.relname
        """)
        tables = []
        for r in rows:
            name = r["table_name"]
            if name not in allowed:
                continue  # 默认拒绝：不可访问的表不出现（不泄露存在性）
            tables.append({
                "table": name,
                "rows": int(r["row_estimate"] or 0),
                "estimated": True,  # 标记为估算值，非精确行数
                "description": TABLE_DESCRIPTIONS.get(name, ""),
                "accessible": True,
            })
        return {"tables": tables}


@router.get("/table/{table_name}")
async def table_columns(table_name: str):
    """单表字段清单。不可访问/不存在的表统一返回 404（不区分以避免枚举）。"""
    try:
        await ensure_table_access(table_name)
    except AccessControlError as e:
        # 403=不可访问 -> 按 404 处理避免枚举；503=存储不可用 -> 透传
        if e.status_code == 503:
            raise HTTPException(status_code=503, detail=e.detail) from e
        raise HTTPException(status_code=404, detail=f"Table '{table_name}' not found") from e
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch("""
            SELECT column_name, data_type, is_nullable, COALESCE(column_default,'') AS column_default
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = $1
            ORDER BY ordinal_position
        """, table_name)
        if not rows:
            raise HTTPException(status_code=404, detail=f"Table '{table_name}' not found")
        return {
            "table": table_name,
            "description": TABLE_DESCRIPTIONS.get(table_name, ""),
            "columns": [
                {
                    "name": r["column_name"],
                    "type": r["data_type"],
                    "nullable": r["is_nullable"] == "YES",
                    "default": r["column_default"],
                }
                for r in rows
            ],
        }


@router.get("/relationships")
async def relationships():
    """表间关系：数据库外键 + 手工补充的业务关系。仅返回两端均可访问的关系。"""
    try:
        allowed = await accessible_tables()
    except AccessControlError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail) from e
    pool = get_pool()
    async with pool.acquire() as conn:
        # 复合外键需按 ordinal_position 配对，否则多列 FK 会产生笛卡尔积的错误映射。
        fks = await conn.fetch("""
            SELECT
                tc.table_name AS from_table,
                kcu.column_name AS from_column,
                ccu.table_name AS to_table,
                ccu.column_name AS to_column,
                kcu.ordinal_position AS position
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
               AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage ccu
                ON tc.constraint_name = ccu.constraint_name
               AND ccu.ordinal_position = kcu.ordinal_position
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND tc.table_schema = 'public'
            ORDER BY tc.table_name, kcu.ordinal_position
        """)
        fk_list = []
        for r in fks:
            if r["from_table"] in allowed and r["to_table"] in allowed:
                fk_list.append({
                    "from_table": r["from_table"],
                    "from_column": r["from_column"],
                    "to_table": r["to_table"],
                    "to_column": r["to_column"],
                    "position": int(r["position"]) if r["position"] is not None else None,
                    "kind": "many-to-one",
                    "note": "数据库外键",
                })
    manual = [rel for rel in MANUAL_RELATIONSHIPS
              if rel["from_table"] in allowed and rel["to_table"] in allowed]
    return {"relationships": fk_list + manual}
