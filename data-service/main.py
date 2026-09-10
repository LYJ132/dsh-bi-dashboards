"""校园超市数据访问 API + MCP 服务器。

目标：为 DeepSeek Harness (DSH) 提供数据访问能力。

端点：
- /api/meta/*        数据字典与表关系（AI 理解"数据及数据间的关系"）
- /api/query/*       原始数据查询（GET 分页浏览 / POST 结构化查询）
- /mcp               MCP SSE 端点（供 DeepSeek Harness 连接）
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI

from db import init_pool, close_pool
from api import meta, query
from api import settings as settings_router
from services.mcp_server import mcp_app


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_pool()
    # 启动 MCP 会话管理器
    mcp_cm = mcp_app.lifespan(app)
    await mcp_cm.__aenter__()
    app.state._mcp_cm = mcp_cm
    yield
    await mcp_cm.__aexit__(None, None, None)
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
# 挂载 MCP SSE 端点，DSH 通过 http://host:8600/mcp/mcp 连接
app.mount("/mcp", mcp_app)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/")
async def root():
    return {
        "service": "campus-store-data-access",
        "version": "1.0.0",
        "docs": "/docs",
        "mcp": "http://localhost:8600/mcp/mcp",
        "endpoints": {
            "meta": ["/api/meta/tables", "/api/meta/table/{table}", "/api/meta/relationships"],
            "settings": ["GET /api/settings/tables", "POST /api/settings/tables"],
            "query": [
                "GET /api/query/{table}?limit&offset",
                "POST /api/query",
            ],
        },
    }
