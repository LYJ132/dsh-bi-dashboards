#!/bin/bash
# DSH 标准启动脚本：先自愈 inject 声明，再启动（幂等，可反复使用）
set -e

# 1. 停掉旧实例
pkill -9 -f "dsh web" 2>/dev/null || true
sleep 2

# 2. 自愈：确保 bi-dashboards-host inject 带 tools（防止外部还原导致启动失败）
python3 /home/szulg/Project/bi-plugin/static/scripts/ensure_host_inject.py || true

# 3. 启动
cd /home/szulg/Project
nohup setsid dsh web --no-open --port 3080 > /tmp/dsh-web.log 2>&1 < /dev/null &
sleep 15

# 4. 验证
if curl -s -o /dev/null --max-time 3 http://localhost:3080/; then
    PID=$(pgrep -f "dsh web" | head -1)
    echo "✅ DSH 已启动 (PID $PID) → http://localhost:3080"
else
    echo "❌ DSH 启动失败，日志："
    tail -20 /tmp/dsh-web.log
    exit 1
fi
