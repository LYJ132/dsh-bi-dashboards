#!/bin/bash
# DSH 标准启动脚本：先自愈 inject 声明，再启动（幂等，可反复使用）
#
# 审计整改（fix-20260917-p2-webops）：
# - 不再用 pkill -9 -f "dsh web"（宽匹配会误杀命令行含关键字的无关进程，含本脚本自身）；
#   改为 PID 文件停止 + kill 前 /proc/<pid>/cmdline 身份校验；兜底用带完整参数的精确匹配。
# - ensure_host_inject.py 失败不再 `|| true` 吞掉：打印错误并以非零码退出。
# - 目标目录不再硬编码个人路径：DSH_PROJECT_DIR（默认 $HOME/Project），
#   脚本自身位置用 BASH_SOURCE 推导。
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${DSH_PROJECT_DIR:-$HOME/Project}"
PIDFILE="${DSH_WEB_PIDFILE:-/tmp/dsh-web.pid}"
LOGFILE="${DSH_WEB_LOG:-/tmp/dsh-web.log}"
PORT="${DSH_WEB_PORT:-3080}"

# 身份校验：仅当 /proc/<pid>/cmdline 中存在 dsh 可执行文件 token、
# 且完整命令行确为 "…dsh web --no-open --port <PORT>" 时才动手
# （dsh 可能是 shebang 脚本：argv[0] 会是解释器，dsh 路径出现在后续 token；
#   同时防止误杀命令行里恰好含关键字的无关进程，如编辑器/grep/本脚本调用方）
dsh_cmdline_is() {
  local pid="$1"
  [ -r "/proc/$pid/cmdline" ] || return 1
  tr '\0' '\n' < "/proc/$pid/cmdline" 2>/dev/null | grep -qx '.*/dsh\|dsh' || return 1
  tr '\0' ' ' < "/proc/$pid/cmdline" 2>/dev/null | grep -q "web --no-open --port $PORT"
}

stop_dsh() {
  local pid
  # 1) PID 文件路径（本脚本启动的实例）
  if [ -f "$PIDFILE" ]; then
    pid=$(cat "$PIDFILE" 2>/dev/null || true)
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      if dsh_cmdline_is "$pid"; then
        echo "停止旧实例 (pid $pid)..."
        kill "$pid" 2>/dev/null || true
        sleep 2
        kill -0 "$pid" 2>/dev/null && kill -9 "$pid" 2>/dev/null || true
      else
        echo "⚠️  pidfile 指向的进程 (pid $pid) 不是 dsh web，跳过 kill"
      fi
    fi
    rm -f "$PIDFILE"
  fi
  # 2) 兜底：精确匹配完整命令行（含端口），逐个再做 /proc 身份校验，绝不宽杀。
  #    "[d]sh" 括号技巧 + 下方首 token 校验：避免 pgrep 匹配到命令文本自身
  #    所在的进程（如编辑器/调用方 shell）。
  for pid in $(pgrep -f "[d]sh web --no-open --port $PORT" 2>/dev/null || true); do
    if dsh_cmdline_is "$pid"; then
      echo "停止遗留实例 (pid $pid)..."
      kill "$pid" 2>/dev/null || true
      sleep 1
      kill -0 "$pid" 2>/dev/null && kill -9 "$pid" 2>/dev/null || true
    fi
  done
}

# 1. 停掉旧实例
stop_dsh
sleep 1

# 2. 自愈：确保 bi-dashboards-host inject 带 tools（防止外部还原导致启动失败）
#    失败必须让启动中断——带病启动只会得到更难排查的 500/白屏。
if ! python3 "$SCRIPT_DIR/ensure_host_inject.py" "$PROJECT_DIR"; then
    echo "❌ ensure_host_inject.py 执行失败，中止启动" >&2
    exit 1
fi

# 3. 启动
cd "$PROJECT_DIR"
nohup setsid dsh web --no-open --port "$PORT" > "$LOGFILE" 2>&1 < /dev/null &
echo $! > "$PIDFILE"
sleep 15

# 4. 验证
if curl -s -o /dev/null --max-time 3 "http://localhost:$PORT/"; then
    echo "✅ DSH 已启动 (PID $(cat "$PIDFILE")) → http://localhost:$PORT"
else
    echo "❌ DSH 启动失败，日志："
    tail -20 "$LOGFILE"
    exit 1
fi
