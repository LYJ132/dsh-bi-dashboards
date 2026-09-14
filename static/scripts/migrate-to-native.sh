#!/usr/bin/env bash
# 旧版双包安装 → 新版官方单包（dsh-bi-dashboards）迁移脚本
# 在已用 static/scripts/install-to-dsh.sh 装过旧版 bi-dashboards-host / bi-dashboards-client 的机器上执行一次：
#   bash static/scripts/migrate-to-native.sh
# 做四件事：
#   1. 备份旧包与 profile 补丁文件到 ~/.dsh/bi-dashboards/backup-<日期>/
#   2. 把 config.json / 看板数据 / vendor echarts 迁到持久化目录 ~/.dsh/bi-dashboards/（含 lib/config.json 旧机器合并逻辑）
#   3. 从 profile node_modules 移除旧双包
#   4. 从 profile cordis.patch.yml 移除旧双包挂载块
# 之后安装新版：dsh plugin --profile web add github:LYJ132/dsh-bi-dashboards（或本地路径）
set -euo pipefail

PROFILE="${DSH_PROFILE:-$HOME/.dsh/profiles/web}"
NM="$PROFILE/node_modules"
PERSIST="${BI_DASHBOARDS_HOME:-$HOME/.dsh/bi-dashboards}"
OLD_HOST="$NM/bi-dashboards-host"
OLD_CLIENT="$NM/bi-dashboards-client"
PATCH="$PROFILE/cordis.patch.yml"

[ -d "$PROFILE" ] || { echo "[失败] 未找到 DSH profile: $PROFILE"; exit 1; }

if [ ! -d "$OLD_HOST" ] && [ ! -d "$OLD_CLIENT" ]; then
  echo "[跳过] 未发现旧版 bi-dashboards-host / bi-dashboards-client，无需迁移"
  exit 0
fi

BACKUP="$PERSIST/backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP"
echo "[备份] 旧包与补丁 → $BACKUP"
[ -d "$OLD_HOST" ] && cp -r "$OLD_HOST" "$BACKUP/bi-dashboards-host"
[ -d "$OLD_CLIENT" ] && cp -r "$OLD_CLIENT" "$BACKUP/bi-dashboards-client"
[ -f "$PATCH" ] && cp "$PATCH" "$BACKUP/cordis.patch.yml"

mkdir -p "$PERSIST/vendor" "$PERSIST/data"

# 1) config：包根 config.json 为主；lib/config.json(.migrated) 里的「非本机」服务地址合并进来（与旧安装脚本同规则）
NEW_CFG="$PERSIST/config.json"
if [ ! -f "$NEW_CFG" ]; then
  SRC_CFG=""
  [ -f "$OLD_HOST/config.json" ] && SRC_CFG="$OLD_HOST/config.json"
  if [ -n "$SRC_CFG" ]; then
    node -e "
      const fs = require('fs');
      const out = process.argv[1], root = process.argv[2], libdir = process.argv[3];
      const isLocal = (u) => !u || /\/\/(localhost|127\.0\.0\.1)/.test(u);
      let cfg = {}; try { cfg = JSON.parse(fs.readFileSync(root, 'utf8')); } catch (e) {}
      // 归档版 lib/config.json.migrated → lib/config.json → 包根 config.json，越靠后优先级越高
      for (const p of [libdir + '/config.json.migrated', libdir + '/config.json', root]) {
        let c = {}; try { c = JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { continue }
        if (c.dataApi && (!isLocal(c.dataApi) || !cfg.dataApi || isLocal(cfg.dataApi))) cfg.dataApi = c.dataApi;
        if (c.statusUrl && (!isLocal(c.statusUrl) || !cfg.statusUrl || isLocal(cfg.statusUrl))) cfg.statusUrl = c.statusUrl;
        for (const k of ['vendorFile', 'storeFile', 'crawlConfigFile']) if (typeof c[k] === 'string' && c[k]) cfg[k] = c[k];
      }
      cfg.vendorFile = 'vendor/echarts.min.js';
      cfg.storeFile = 'data/bi-dashboards.json';
      fs.writeFileSync(out, JSON.stringify(cfg, null, 2));
      console.log('[迁移] config.json → ' + out);
    " "$NEW_CFG" "$OLD_HOST/config.json" "$OLD_HOST/lib" || { echo '[配置] 旧 config.json 解析失败，将使用新版默认配置（首次启动生成）'; }
  else
    cat > "$NEW_CFG" <<'EOF'
{
  "dataApi": "http://localhost:8600",
  "statusUrl": "http://localhost:8080",
  "vendorFile": "vendor/echarts.min.js",
  "storeFile": "data/bi-dashboards.json",
  "crawlConfigFile": ""
}
EOF
    echo "[配置] 已生成默认 $NEW_CFG"
  fi
else
  echo "[跳过] $NEW_CFG 已存在，不覆盖"
fi

# 2) 看板数据
if [ -f "$OLD_HOST/data/bi-dashboards.json" ] && [ ! -f "$PERSIST/data/bi-dashboards.json" ]; then
  cp "$OLD_HOST/data/bi-dashboards.json" "$PERSIST/data/bi-dashboards.json"
  echo "[迁移] 看板数据 → $PERSIST/data/bi-dashboards.json"
fi

# 3) vendor echarts
if [ ! -f "$PERSIST/vendor/echarts.min.js" ]; then
  if [ -f "$OLD_HOST/static/vendor/echarts.min.js" ]; then
    cp "$OLD_HOST/static/vendor/echarts.min.js" "$PERSIST/vendor/echarts.min.js"
  elif [ -f "$(cd "$(dirname "${BASH_SOURCE[0]}")/../vendor" && pwd)/echarts.min.js" ]; then
    cp "$(cd "$(dirname "${BASH_SOURCE[0]}")/../vendor" && pwd)/echarts.min.js" "$PERSIST/vendor/echarts.min.js"
  else
    echo "[警告] 找不到 echarts.min.js（旧包与本仓库均无）——首次启动后图表会 404，请手动放置到 $PERSIST/vendor/"
  fi
  [ -f "$PERSIST/vendor/echarts.min.js" ] && echo "[迁移] vendor → $PERSIST/vendor/echarts.min.js"
fi

# 4) 移除旧双包
rm -rf "$OLD_HOST" "$OLD_CLIENT"
echo "[清理] 已移除 profile 内旧双包（备份在 $BACKUP）"

# 5) 移除 profile cordis.patch.yml 里的旧挂载块（幂等）
if [ -f "$PATCH" ] && grep -q "bi-dashboards-host" "$PATCH"; then
  node -e "
    const fs = require('fs');
    const p = process.argv[1];
    const lines = fs.readFileSync(p, 'utf8').split('\n');
    const out = [];
    let skipping = false;
    for (const line of lines) {
      if (/^#.*无人超市 AI BI 插件/.test(line)) { skipping = true; continue }
      if (skipping) {
        // 旧块内容：'- insert:' / '- id: bi-dashboards-*' / 'name: bi-dashboards-*'（任意缩进）；遇到其它内容即结束
        if (/^\s*-\s*insert:\s*$/.test(line) || /^\s*-\s*id:\s*bi-dashboards-(host|client)\s*$/.test(line) || /^\s*name:\s*bi-dashboards-(host|client)\s*$/.test(line)) continue;
        skipping = false;
      }
      out.push(line);
    }
    fs.writeFileSync(p, out.join('\n').replace(/\n{3,}$/, '\n'));
  " "$PATCH"
  echo "[清理] 已从 $PATCH 移除旧挂载块"
else
  echo "[跳过] $PATCH 中无旧挂载块"
fi

echo ""
echo "迁移完成。下一步："
echo "  1. 安装新版：dsh plugin --profile web add github:LYJ132/dsh-bi-dashboards"
echo "  2. 重启 DSH 宿主，浏览器 Ctrl+F5 → 设置页「无人超市」/ 侧栏「我的看板」"
echo "  3. 数据如有异常，可从 $BACKUP 手动恢复"
