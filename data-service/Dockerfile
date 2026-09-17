# 基线镜像固定到完整版本号 + Debian 代号，避免浮动 tag 漂移（升级时手动改并回归）
FROM python:3.12.8-slim-bookworm

# 非 root 运行用户（先建用户，后续 COPY 才能 chown 给它）
RUN groupadd --system appgroup \
    && useradd --system --gid appgroup --home-dir /app --shell /usr/sbin/nologin appuser

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 构建上下文经 .dockerignore 过滤，仅源码入库内容进入镜像
COPY --chown=appuser:appgroup . .

ENV PYTHONUNBUFFERED=1

EXPOSE 8600

USER appuser:appgroup

# 健康检查：/health 端点（slim 镜像无 curl，用 python 标准库探测；
# 该端点在 P1 合入后会附带 DB ping，可直接反映服务可用性）
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD ["python", "-c", "import sys, urllib.request; r = urllib.request.urlopen('http://127.0.0.1:8600/health', timeout=4); sys.exit(0 if r.status == 200 else 1)"]

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8600"]
