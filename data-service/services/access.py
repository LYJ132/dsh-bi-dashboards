"""统一的表级访问控制（ACL）helper —— HTTP 与 MCP 共用同一实现。

审计 A3/A4/B?：
- **默认拒绝**（default-deny）：一张表可访问，当且仅当
  (1) 它处于策划白名单 ALL_TABLES（curated allow-list，权威清单）；**且**
  (2) 在 bi_plugin.ai_settings 的 table_access 里被明确置为 true。
  任一不满足 -> 403。
- 白名单**加载失败**（DB 不可用等）-> 503，而不是退化为"全开放"。
- ALL_TABLES 是唯一权威来源：不在其中的表，即便有人在设置里置 true 也不放行。

上层约定：
- HTTP 层捕获 AccessControlError，按其 status_code 抛 fastapi.HTTPException。
- MCP 层捕获 AccessControlError，返回结构化 error（见 services/mcp_server.py）。
"""
from __future__ import annotations

from services.settings_service import WhitelistUnavailable, get_whitelist_strict

# 策划白名单 / 权威可查询表清单（public 业务表 + 临期处置视图）。
# 这是 ACL 的**唯一权威来源**：默认拒绝要求表既在此清单中、又在设置里被启用。
# 2026-09-09: 移除 alert_subscriber/replenish_subscribe(订阅已飞书化)/shelf(不存在)，新增 v_procurement_disposition
ALL_TABLES: frozenset[str] = frozenset({
    "category_dim", "date_dim", "forecast_results", "forecast_monthly", "forecast_accuracy",
    "forecast_history",
    "inventory_total", "n8n_operation_log", "order_detail_raw",
    "procurement_management", "product_main", "replenish_log",
    "shelf_product_rel", "store_info",
    "store_stat_raw", "sync_meta", "user_dim",
    "v_procurement_disposition",
})

# 标识符长度上限（防超长名放大解析/内存，审计 B?）
MAX_IDENTIFIER_LEN = 128


class AccessControlError(Exception):
    """ACL 判定结果。status_code：403=拒绝；503=白名单存储不可用（不得当作放行）。"""

    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)


async def ensure_table_access(table: str) -> None:
    """校验单表访问权限；不通过则抛 AccessControlError。HTTP 与 MCP 共用。"""
    if not table or len(table) > MAX_IDENTIFIER_LEN:
        raise AccessControlError(403, f"Table '{table}' is not accessible")
    # 1) 权威策划清单：不在其中一律 403（即便设置里被启用）。
    if table not in ALL_TABLES:
        raise AccessControlError(403, f"Table '{table}' is not in the curated allow-list")
    # 2) 设置开关：默认拒绝，需显式 true；加载失败 -> 503。
    try:
        whitelist = await get_whitelist_strict()
    except WhitelistUnavailable as e:
        raise AccessControlError(503, f"Access control store unavailable: {e}") from e
    if not whitelist.get(table, False):
        raise AccessControlError(403, f"Table '{table}' is not enabled in access settings")


async def accessible_tables() -> frozenset[str]:
    """返回当前真正可访问的表集合（curated ∩ 设置启用）。加载失败抛 AccessControlError(503)。"""
    try:
        whitelist = await get_whitelist_strict()
    except WhitelistUnavailable as e:
        raise AccessControlError(503, f"Access control store unavailable: {e}") from e
    return frozenset(t for t in ALL_TABLES if whitelist.get(t, False))
