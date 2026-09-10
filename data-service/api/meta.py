"""数据字典与表关系接口。

这些端点是"AI 获取数据及数据间的关系"的基础：
- /api/meta/tables         全部表清单 + 行数 + 中文说明
- /api/meta/table/{table}  单表字段（名称/类型/可空/注释）
- /api/meta/relationships  表间关系（数据库外键 + 手工补充的业务关系）
"""

from fastapi import APIRouter, HTTPException

from db import get_pool

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

# 数据字典描述范围：仅公开可查询的表（与 query.py 白名单一致）
# 2026-09-09: 移除 alert_subscriber/replenish_subscribe(订阅已飞书化)/shelf(不存在),新增 v_procurement_disposition
META_TABLES = {
    "category_dim", "date_dim", "forecast_results",
    "inventory_total", "n8n_operation_log", "order_detail_raw",
    "procurement_management", "product_main", "replenish_log",
    "shelf_product_rel", "store_info",
    "store_stat_raw", "sync_meta", "user_dim",
    "v_procurement_disposition",
}


async def _meta_allowed(table: str) -> bool:
    """是否在白名单开关里开放（保存即生效）。"""
    try:
        from services.settings_service import get_whitelist
        whitelist = await get_whitelist()
        return whitelist.get(table, True)
    except Exception:
        return True


@router.get("/tables")
async def list_tables():
    """全部表清单 + 行数 + 说明。"""
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name
        """)
        tables = []
        for r in rows:
            name = r["table_name"]
            try:
                cnt = await conn.fetchval(f'SELECT COUNT(*) FROM "{name}"')
            except Exception:
                cnt = None
            tables.append({
                "table": name,
                "rows": cnt,
                "description": TABLE_DESCRIPTIONS.get(name, ""),
                "accessible": await _meta_allowed(name),
            })
        return {"tables": tables}


@router.get("/table/{table_name}")
async def table_columns(table_name: str):
    """单表字段清单。"""
    if not await _meta_allowed(table_name):
        raise HTTPException(status_code=404, detail=f"Table '{table_name}' not in accessible set")
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch("""
            SELECT column_name, data_type, is_nullable, COALESCE(column_default,'') AS column_default
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = $1
            ORDER BY ordinal_position
        """, table_name)
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
    """表间关系：数据库外键 + 手工补充的业务关系。"""
    pool = get_pool()
    async with pool.acquire() as conn:
        fks = await conn.fetch("""
            SELECT
                tc.table_name AS from_table,
                kcu.column_name AS from_column,
                ccu.table_name AS to_table,
                ccu.column_name AS to_column
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage ccu
                ON tc.constraint_name = ccu.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND tc.table_schema = 'public'
            ORDER BY tc.table_name, kcu.column_name
        """)
        fk_list = []
        for r in fks:
            if await _meta_allowed(r["from_table"]) and await _meta_allowed(r["to_table"]):
                fk_list.append({
                    "from_table": r["from_table"],
                    "from_column": r["from_column"],
                    "to_table": r["to_table"],
                    "to_column": r["to_column"],
                    "kind": "many-to-one",
                    "note": "数据库外键",
                })
    return {"relationships": fk_list + MANUAL_RELATIONSHIPS}
