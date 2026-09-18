#!/usr/bin/env bash
# 旧版双包安装 → 新版官方单包（dsh-bi-dashboards）迁移脚本
# 在已用 static/scripts/install-to-dsh.sh 装过旧版 bi-dashboards-host / bi-dashboards-client 的机器上执行一次：
#   bash static/scripts/migrate-to-native.sh
# 做四件事：
#   1. 备份旧包与 profile 补丁文件到 ~/.dsh/bi-dashboards/backup-<日期>/
#   2. 把 config.json / 看板数据 / vendor echarts 迁到持久化目录 ~/.dsh/bi-dashboards/（含 lib/config.json 旧机器合并逻辑）
#   3. 从 profile node_modules 移除旧双包
#   4. 从 profile cordis.patch.yml 移除旧双包挂载块
# 之后安装新版：dsh plugin --profile web add github:LYJ132/dsh-bi-dashboards（Gitee 备选 https://gitee.com/LYJ132/dsh-bi-dashboards.git，或本地路径）
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

# 2) 看板数据：按旧 config 的 storeFile 定位旧 store 文件（不能只猜 data/bi-dashboards.json——
#    老机器的 storeFile 可能指向任意相对路径），拷到持久化目录并验证
TARGET_STORE="$PERSIST/data/bi-dashboards.json"
if [ -f "$TARGET_STORE" ]; then
  echo "[跳过] $TARGET_STORE 已存在，不覆盖"
else
  STORE_SRC="$(node -e '
    const fs = require("fs"), path = require("path");
    const root = process.argv[1];
    // 旧 config 的优先级与上面 config 迁移一致：lib/config.json.migrated → lib/config.json → 包根 config.json
    const cands = [];
    for (const p of [root + "/lib/config.json.migrated", root + "/lib/config.json", root + "/config.json"]) {
      let c = {}; try { c = JSON.parse(fs.readFileSync(p, "utf8")); } catch (e) { continue }
      if (typeof c.storeFile === "string" && c.storeFile) cands.push(c.storeFile);
    }
    cands.push("data/bi-dashboards.json"); // 旧安装脚本的历史默认值兜底
    const seen = new Set();
    for (const rel of cands) {
      if (seen.has(rel)) continue; seen.add(rel);
      // 旧包内相对路径一律相对旧包根解析；绝对路径原样使用
      const abs = path.isAbsolute(rel) ? rel : path.resolve(root, rel);
      try { if (fs.statSync(abs).isFile() && fs.statSync(abs).size > 0) { console.log(abs); process.exit(0); } } catch (e) {}
    }
  ' "$OLD_HOST")"
  if [ -n "$STORE_SRC" ]; then
    cp "$STORE_SRC" "$TARGET_STORE"
    echo "[迁移] store → $TARGET_STORE（来源 $STORE_SRC）"
  else
    echo ""
    echo "  ⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠"
    echo "  ⚠  警告：没有找到旧包的看板数据（bi-dashboards.json）！"
    echo "  ⚠  已检查：旧包 config / lib/config.json / lib/config.json.migrated 的 storeFile 及默认 data/ 目录。"
    echo "  ⚠  若你之前保存过看板，请手动从备份恢复，否则重启后看板会消失："
    echo "  ⚠    ls $BACKUP/bi-dashboards-host/data/"
    echo "  ⚠    cp <找到的 json> $TARGET_STORE"
    echo "  ⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠"
    echo ""
  fi
fi

# store 文件验证：必须存在、非空、合法 JSON（缺失且本来就没有时不算失败）
if [ -f "$TARGET_STORE" ]; then
  if [ -s "$TARGET_STORE" ] && node -e 'JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"))' "$TARGET_STORE" 2>/dev/null; then
    echo "[验证] store 文件存在、非空且为合法 JSON ✓"
  else
    echo "[失败] $TARGET_STORE 为空或不是合法 JSON——看板会消失！请从 $BACKUP 手动恢复后重跑验证"
  fi
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
echo "  1. 安装新版：dsh plugin --profile web add github:LYJ132/dsh-bi-dashboards（Gitee 备选 https://gitee.com/LYJ132/dsh-bi-dashboards.git）"
echo "  2. 重启 DSH 宿主，浏览器 Ctrl+F5 → 设置页「无人超市」/ 侧栏「我的看板」"
echo "  3. 数据如有异常，可从 $BACKUP 手动恢复"
