#!/bin/bash
# 仪表状态服务器启动。
# 要点：PID 文件管理 + kill 前用 /proc/<pid>/cmdline 校验进程身份（不要用
# pkill -f，会误杀命令行含关键字的无关进程）；启动前探测端口占用；
# server.log 以 5MB x3 轮转（nohup 追加无法自轮转，启动前滚动）。
# 绑定地址默认 127.0.0.1（审计 A5：不再默认对全网开放）。
# 需要局域网访问状态台/触发端点时显式打开：BI_STATUS_HOST=0.0.0.0 bash web/start.sh
# （服务无鉴权，仅在可信网络下打开。）
cd "$(dirname "$0")"
PIDFILE=server.pid
LOGFILE=server.log
HOST="${BI_STATUS_HOST:-127.0.0.1}"
PORT="${BI_STATUS_PORT:-8080}"

fail() { echo "[start.sh] $*" >&2; exit 1; }

# 1. server.log 轮转：>=5MB 时滚存为 .1/.2/.3，最多留 3 份
rotate_log() {
  local f="$1" max=$((5 * 1024 * 1024)) sz i
  [ -f "$f" ] || return 0
  sz=$(wc -c < "$f" 2>/dev/null || echo 0)
  [ "$sz" -ge "$max" ] || return 0
  rm -f "$f.3"
  for i in 2 1; do
    [ -f "$f.$i" ] && mv -f "$f.$i" "$f.$((i + 1))"
  done
  mv -f "$f" "$f.1"
}
rotate_log "$LOGFILE"

# 2. 旧实例处理：仅当 PID 存活且 /proc 身份确认是本 server.py 才 kill；
#    pid 已死或指向无关进程一律视为陈旧 pidfile 清理，不动无关进程。
if [ -f "$PIDFILE" ]; then
  OLD_PID=$(cat "$PIDFILE" 2>/dev/null)
  case "$OLD_PID" in
    ''|*[!0-9]*)
      echo "[start.sh] pidfile 无效（'${OLD_PID}'），清理"
      rm -f "$PIDFILE"
      ;;
    *)
      if kill -0 "$OLD_PID" 2>/dev/null; then
        if [ -r "/proc/$OLD_PID/cmdline" ] \
           && tr '\0' ' ' < "/proc/$OLD_PID/cmdline" 2>/dev/null | grep -q "server\.py"; then
          echo "停止旧实例 (pid $OLD_PID)..."
          kill "$OLD_PID" 2>/dev/null
          for _ in 1 2 3 4 5; do
            kill -0 "$OLD_PID" 2>/dev/null || break
            sleep 1
          done
          kill -0 "$OLD_PID" 2>/dev/null && fail "旧实例 pid $OLD_PID 未能退出，请人工处理"
        else
          echo "[start.sh] pidfile 指向的不是本状态服务器（pid $OLD_PID 仍存活），跳过 kill，仅清理陈旧 pidfile"
        fi
      fi
      rm -f "$PIDFILE"
      ;;
  esac
fi

# 3. 端口占用探测（探测 0.0.0.0 时按 127.0.0.1 试连）
probe_host="$HOST"
[ "$probe_host" = "0.0.0.0" ] && probe_host=127.0.0.1
if python3 - "$probe_host" "$PORT" <<'PY'
import socket, sys
s = socket.socket()
s.settimeout(1)
rc = s.connect_ex((sys.argv[1], int(sys.argv[2])))
s.close()
sys.exit(0 if rc == 0 else 1)
PY
then
  fail "端口 $probe_host:$PORT 已被占用（可用 ss -ltnp 查看占用进程），放弃启动"
fi

# 4. 启动并确认存活
BI_STATUS_HOST="$HOST" BI_STATUS_PORT="$PORT" nohup python3 server.py "$PORT" > "$LOGFILE" 2>&1 &
NEW_PID=$!
echo "$NEW_PID" > "$PIDFILE"
sleep 1
if ! kill -0 "$NEW_PID" 2>/dev/null; then
  rm -f "$PIDFILE"
  echo "[start.sh] 启动失败，日志尾部：" >&2
  tail -20 "$LOGFILE" >&2
  fail "server.py 未能保持运行"
fi
echo "Dashboard started on http://$HOST:$PORT (pid $NEW_PID)"
