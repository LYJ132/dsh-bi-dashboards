"""校园超市数据访问 API + MCP 服务器。

目标：为 DeepSeek Harness (DSH) 提供数据访问能力。

端点：
- /api/meta/*        数据字典与表关系（AI 理解"数据及数据间的关系"）
- /api/query/*       原始数据查询（GET 分页浏览 / GET distinct 取值 / POST 结构化查询）
- /mcp               MCP SSE 端点（供 DeepSeek Harness 连接）
- /health            存活 + DB 连通性探针（SELECT 1）
- /health/live       廉价存活探针（不碰 DB）
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request

from db import init_pool, close_pool, get_pool
from api import meta, query
from api import settings as settings_router
from services.mcp_server import mcp_app


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_pool()
    # MCP 会话管理器用 async-with + try/finally 托管：即使 yield 体抛异常，
    # 也保证 MCP 与连接池被关闭（审计 B?: 原实现手动 __aenter__/__aexit__ 易泄漏）。
    try:
        async with mcp_app.lifespan(app):
            yield
    finally:
        await close_pool()


app = FastAPI(
    title="Campus Store Data Access API",
    description="数据库原始数据获取能力封装（只读）。供 DeepSeek Harness MCP 调用。",
    version="1.0.0",
    lifespan=lifespan,
)

app.include_router(meta.router)
app.include_router(query.router)
app.include_router(settings_router.router)
# 挂载 MCP SSE 端点，DSH 通过 <base>/mcp/mcp 连接
app.mount("/mcp", mcp_app)


@app.get("/health/live")
async def health_live():
    """廉价存活探针：仅确认进程在跑，不触碰数据库（供编排 readiness/liveness 用）。"""
    return {"status": "ok"}


@app.get("/health")
async def health():
    """健康探针：真实 ping DB（SELECT 1）。DB 不可达时返回 503 并附 error。"""
    try:
        pool = get_pool()
        async with pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
    except Exception as e:  # noqa: BLE001 - 探针需吞掉任意 DB 异常并降级
        return {"status": "error", "database": "down", "detail": str(e)}
    return {"status": "ok", "database": "up"}


@app.get("/")
async def root(request: Request):
    # MCP 地址按当前请求的 base_url 动态拼接，避免硬编码 localhost（审计 B?：
    # 反向代理/容器网络下 localhost 指向错误）。
    mcp_url = str(request.base_url).rstrip("/") + "/mcp/mcp"
    return {
        "service": "campus-store-data-access",
        "version": "1.0.0",
        "docs": "/docs",
        "mcp": mcp_url,
        "endpoints": {
            "meta": ["/api/meta/tables", "/api/meta/table/{table}", "/api/meta/relationships"],
            "settings": ["GET /api/settings/tables", "POST /api/settings/tables"],
            "query": [
                "GET /api/query/{table}?limit&offset",
                "GET /api/query/{table}/distinct/{column}?limit",
                "POST /api/query",
            ],
        },
    }
