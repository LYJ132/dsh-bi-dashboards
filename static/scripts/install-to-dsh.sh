#!/usr/bin/env bash
# 【已废弃 · DEPRECATED】本脚本为 v1.0.0 时代的旧安装方式（拷贝双包进 profile + 手写挂载块）。
# 新版（v1.1.0 起）插件为官方单包形态 dsh-bi-dashboards，请使用：
#   dsh plugin --profile web add https://gitee.com/LYJ132/dsh-bi-dashboards.git
# 旧机器迁移：bash static/scripts/migrate-to-native.sh
# 保留本脚本仅供历史参考。
#
# 无人超市 AI BI 插件 · 一键安装到本机 DSH（在【目标机】上执行）
# 用法：
#   bash static/scripts/install-to-dsh.sh                          # 数据主机与本机同一局域网时，之后再改 config.json
#   bash static/scripts/install-to-dsh.sh --data-api http://192.168.x.x:8600
#   bash static/scripts/install-to-dsh.sh --data-api http://100.x.x.x:8600 --status-url http://100.x.x.x:8080
#   bash static/scripts/install-to-dsh.sh --force-config          # config.json 已存在时覆盖之（旧配置备份为 .bak）
set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"        # bi-plugin 根目录
PROFILE="${DSH_PROFILE:-$HOME/.dsh/profiles/web}"
NM="$PROFILE/node_modules"
DATA_API="http://localhost:8600"
STATUS_URL="http://localhost:8080"
DATA_API_SET=0
STATUS_URL_SET=0
FORCE_CONFIG=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --data-api) DATA_API="$2"; DATA_API_SET=1; shift 2 ;;
    --status-url) STATUS_URL="$2"; STATUS_URL_SET=1; shift 2 ;;
    --force-config) FORCE_CONFIG=1; shift ;;
    *) echo "未知参数: $1（支持 --data-api / --status-url / --force-config）"; exit 1 ;;
  esac
done

[ -d "$PROFILE" ] || { echo "[失败] 未找到 DSH profile: $PROFILE（确认这台机器已安装并启动过 DSH）"; exit 1; }
[ -f "$SRC/static/vendor/echarts.min.js" ] || { echo "[失败] 缺少 $SRC/static/vendor/echarts.min.js"; exit 1; }

mkdir -p "$NM/bi-dashboards-host/static/vendor" "$NM/bi-dashboards-host/data" "$NM/bi-dashboards-client"
cp -r "$SRC/static/bi-dashboards-host/lib"       "$NM/bi-dashboards-host/"
cp    "$SRC/static/bi-dashboards-host/package.json" "$NM/bi-dashboards-host/package.json"
cp -r "$SRC/static/bi-dashboards-client/lib"     "$NM/bi-dashboards-client/"
cp    "$SRC/static/bi-dashboards-client/package.json" "$NM/bi-dashboards-client/package.json"
cp    "$SRC/static/vendor/echarts.min.js"        "$NM/bi-dashboards-host/static/vendor/echarts.min.js"

# config.json：不存在才生成；已存在默认保留（避免静默丢掉用户在设置页改过的地址），
# --force-config 才覆盖（旧配置备份为 .bak）。vendorFile/storeFile 用相对路径
# （相对插件包根，跨机通用）；dataApi/statusUrl 默认 localhost（数据主机本机零配置即用），
# 异机可用参数覆盖或装完后在 DSH 设置页「服务地址」里改
CFG="$NM/bi-dashboards-host/config.json"
write_cfg() {
  cat > "$CFG" <<EOF
{
  "dataApi": "$DATA_API",
  "statusUrl": "$STATUS_URL",
  "vendorFile": "static/vendor/echarts.min.js",
  "storeFile": "data/bi-dashboards.json",
  "crawlConfigFile": ""
}
EOF
}
if [ ! -f "$CFG" ]; then
  write_cfg
  echo "[配置] 已生成 $CFG"
elif [ "$FORCE_CONFIG" = 1 ]; then
  cp -f "$CFG" "$CFG.bak"
  write_cfg
  echo "[配置] --force-config：已备份旧配置为 $CFG.bak 并按本次参数重新生成 $CFG"
else
  echo "[配置] existing config kept：保留已有 $CFG（未做修改）"
  if [ "$DATA_API_SET" = 1 ] || [ "$STATUS_URL_SET" = 1 ]; then
    echo "[配置] 注意：本次传入的 --data-api/--status-url 被忽略；要覆盖已有配置请加 --force-config"
  fi
  echo "[配置] 数据主机地址也可在 DSH 设置页「服务地址」中修改"
fi

# 旧版迁移：早期版本代码读取 lib/config.json，现已统一为包根——合并旧机器上的服务地址后归档
OLD_LIB_CFG="$NM/bi-dashboards-host/lib/config.json"
if [ -f "$OLD_LIB_CFG" ]; then
  node -e "
    const fs = require('fs');
    const p = process.argv[1], lib = process.argv[2];
    try {
      const cfg = JSON.parse(fs.readFileSync(p, 'utf8'));
      let old = {};
      try { old = JSON.parse(fs.readFileSync(lib, 'utf8')); } catch (e) {}
      const isLocal = (u) => !u || /\/\/(localhost|127\.0\.0\.1)/.test(u);
      let merged = false;
      if (isLocal(cfg.dataApi) && old.dataApi && !isLocal(old.dataApi)) { cfg.dataApi = old.dataApi; merged = true }
      if (isLocal(cfg.statusUrl) && old.statusUrl && !isLocal(old.statusUrl)) { cfg.statusUrl = old.statusUrl; merged = true }
      fs.writeFileSync(p, JSON.stringify(cfg, null, 2));
      fs.renameSync(lib, lib + '.migrated');
      console.log('[迁移] lib/config.json 服务地址' + (merged ? '已合并' : '无需合并') + '，原文件归档为 config.json.migrated');
    } catch (e) { console.log('[迁移] 跳过: ' + e.message); }
  " "$CFG" "$OLD_LIB_CFG"
fi

# cordis.patch.yml 追加挂载块（幂等：已存在则跳过）
PATCH="$PROFILE/cordis.patch.yml"
touch "$PATCH"
if ! grep -q "bi-dashboards-host" "$PATCH"; then
  cat >> "$PATCH" <<'EOF'

# ── 无人超市 AI BI 插件 ─────────────
- insert:
    - id: bi-dashboards-host
      name: bi-dashboards-host
    - id: bi-dashboards-client
      name: bi-dashboards-client
EOF
  echo "[挂载] 已写入 $PATCH"
else
  echo "[挂载] $PATCH 中已存在插件段，跳过"
fi

echo ""
echo "安装完成。下一步："
echo "  1. 重启 DSH（宿主进程）"
echo "  2. 浏览器 Ctrl+F5 打开 DSH → 设置页应出现「无人超市」；侧栏进入「我的看板」"
echo "  3. 数据主机不在本机时：设置页「服务地址」→ 填入数据主机展示的 IP（或重跑本脚本加 --data-api）"
echo "  4. 图表空白/看板为空 → 测试连通：curl $DATA_API/api/meta/tables"
