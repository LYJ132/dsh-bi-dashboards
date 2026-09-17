"""数据表访问设置接口（供 DSH「数据表管理」设置页调用）。

- GET  /api/settings/tables           全部表清单（表名/行数/说明/accessible 开关）
- POST /api/settings/tables           设置单表开关 {table, accessible}，保存即生效

频率设置（抓取频率）不在这里：它由 Crawler/crawl_config.json 承载、
controller.py 消费，由 DSH 插件直接读写文件。
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services import settings_service
from services.access import MAX_IDENTIFIER_LEN
from db import get_pool

router = APIRouter(prefix="/api/settings", tags=["settings"])

TABLE_DESCRIPTIONS = {
    "order_detail_raw": "销售明细：每行一条订单商品（一订单多商品则多行）。唯一大规模历史数据源",
    "product_main": "商品主档：product_id 是 13 位 EAN 条码。product_status=1 在售，0 停售",
    "category_dim": "品类维度：cate_code 主键，含 big_category 大类 / mid_category 中类",
    "inventory_total": "库存快照：warehouse_stock 仓库库存、shelf_current_stock 货架库存、safety_stock 安全库存线",
    "forecast_results": "销量预测结果：prophet/tsb 模型按 (product_id, store_id, forecast_date) 预测，含预测区间",
    "date_dim": "日期维度：2022~2026 连续日，is_weekend 周末标记",
    "user_dim": "用户维度：只有 user_id 和 register_time 有数据，其余字段为空",
    "sync_meta": "同步元数据：last_full_sync / last_incr_sync 时间戳",
    "procurement_management": "采购批次/保质期",
    "shelf_product_rel": "货架-商品关联（摆放关系已改由 shelf.product_code 承载）",
    "store_info": "门店信息",
    "store_stat_raw": "门店统计原始数据",
    "replenish_log": "补货执行日志",
    "n8n_operation_log": "n8n 工作流执行记录",
}

# 表名中文显示（设置页主显示名；英文表名放 tooltip）
TABLE_TITLES = {
    "order_detail_raw": "销售明细",
    "product_main": "商品主档",
    "category_dim": "品类维度",
    "inventory_total": "库存快照",
    "user_dim": "用户维度",
    "date_dim": "日期维度",
    "store_info": "门店信息",
    "sync_meta": "同步元数据",
    "shelf_product_rel": "货架商品关联",
    "procurement_management": "采购管理",
    "v_procurement_disposition": "临期处置视图",
    "forecast_results": "销量预测",
    "replenish_log": "补货日志",
    "n8n_operation_log": "自动化运行日志",
    "store_stat_raw": "门店统计",
    "views": "视图",
    "dashboards": "看板",
    "dashboard_settings": "看板设置",
    "dashboard_views": "看板视图",
    "ai_settings": "AI 设置",
}


class TableAccessRequest(BaseModel):
    table: str
    accessible: bool


# 系统内部表：不属于业务数据，不在管理页展示（保持默认可访问）
SYSTEM_TABLES = {"ai_settings", "views", "dashboards", "dashboard_settings", "dashboard_views"}


@router.get("/tables")
async def list_tables():
    """业务数据表清单（过滤系统内部表）+ 说明 + accessible 开关（读白名单）。

    这是**管理页**：必须列出所有业务表（含尚未启用的），否则默认拒绝下管理员无从开启。
    accessible 采用 default-deny：whitelist 未列出的表默认 False（需在页面手动开启）。
    行数为 pg_class.reltuples 估算（避免每表 COUNT(*) 全扫），标记 estimated。
    """
    pool = get_pool()
    whitelist = await settings_service.get_whitelist()
    async with pool.acquire() as conn:
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
            if name in SYSTEM_TABLES:
                continue
            tables.append({
                "table": name,
                "title": TABLE_TITLES.get(name, name),
                "rows": int(r["row_estimate"] or 0),
                "estimated": True,
                "description": TABLE_DESCRIPTIONS.get(name, ""),
                # default-deny：未显式置 true 即不可访问
                "accessible": bool(whitelist.get(name, False)),
            })
    return {"tables": tables}


@router.post("/tables")
async def set_table_access(req: TableAccessRequest):
    """设置单表访问开关，保存即生效（查询/字典接口即时 403/放行）。写入为原子 jsonb_set。"""
    if not req.table or len(req.table) > MAX_IDENTIFIER_LEN or not req.table.replace("_", "").isalnum():
        raise HTTPException(status_code=400, detail="invalid table name")
    pool = get_pool()
    async with pool.acquire() as conn:
        exists = await conn.fetchval(
            "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1",
            req.table)
    if not exists:
        raise HTTPException(status_code=404, detail=f"Table '{req.table}' not found")
    whitelist = await settings_service.set_table_access(req.table, req.accessible)
    return {"ok": True, "table": req.table, "accessible": req.accessible,
            "whitelist": whitelist}
