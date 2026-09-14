#!/bin/bash
# 仪表状态服务器启动（PID 文件管理 —— 不要用 pkill -f，会误杀命令行含关键字的无关进程）
cd "$(dirname "$0")"
PIDFILE=server.pid
if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
  echo "停止旧实例 (pid $(cat "$PIDFILE"))..."
  kill "$(cat "$PIDFILE")" 2>/dev/null
  sleep 1
fi
nohup python3 server.py 8080 > server.log 2>&1 &
echo $! > "$PIDFILE"
echo "Dashboard started on http://localhost:8080 (pid $!)"
