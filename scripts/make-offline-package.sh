#!/usr/bin/env bash
# make-offline-package.sh — 生成离线更新包（dist/bi-dashboards-offline-<version>-<shortsha>.tar.gz）
#
# 用途：把当前仓库状态打包成 OFFLINE-UPDATE.md 所描述的离线更新包，供完全无网络的
# 数据宿主机手动替换升级。每次发布（chore(release): vX.Y.Z）后必须执行一次，
# 使 dist/ 离线包与刚发布的版本保持同步——这是「源码 → lib 构建产物 → 离线包」
# 发布链的最后一环，跳过会导致离线机器停留在旧版（v1.1.7 发布时曾遗漏，事后补齐）。
#
# 用法（仓库根目录执行）：
#   bash scripts/make-offline-package.sh           # 默认：先重建 lib（pnpm/npm build）
#   bash scripts/make-offline-package.sh --no-build
#
# 包内容（与 OFFLINE-UPDATE.md「包内容核对」一致）：
#   lib/（构建产物）、static/、cordis.patch.yml、package.json、package-lock.json、
#   scripts/、rules/、src/、INSTALL.md、OFFLINE-UPDATE.md、THIRD_PARTY_NOTICES.md
#
# 产物：dist/bi-dashboards-offline-<version>-<shortsha>.tar.gz（dist/ 不入库）
set -euo pipefail
cd "$(dirname "$0")/.."

VERSION=$(node -p "require('./package.json').version")
SHORTSHA=$(git rev-parse --short=7 HEAD)
NAME="bi-dashboards-offline-${VERSION}-${SHORTSHA}"
OUT="dist/${NAME}.tar.gz"

if [[ "${1:-}" != "--no-build" ]]; then
  echo "[make-offline-package] rebuilding lib/ from src/ (esbuild) ..."
  if [[ ! -d node_modules/esbuild ]]; then
    if command -v pnpm >/dev/null 2>&1; then pnpm install; else npm install; fi
  fi
  node scripts/build.mjs
fi

node -p "require('./package.json').version" >/dev/null 2>&1 # sanity
grep -q "\"version\": \"${VERSION}\"" package.json # 版本一致性自检（release 提交已 bump）

rm -rf "dist/${NAME}"
mkdir -p "dist/${NAME}"
cp -a lib cordis.patch.yml package.json package-lock.json INSTALL.md OFFLINE-UPDATE.md \
  THIRD_PARTY_NOTICES.md static scripts src rules "dist/${NAME}/"
rm -rf "dist/${NAME}/scripts/__pycache__" 2>/dev/null || true

mkdir -p dist
tar -czf "$OUT" -C dist "$NAME"
rm -rf "dist/${NAME}"

echo "[make-offline-package] wrote ${OUT}"
echo "[make-offline-package] verify: tar -tzf ${OUT} | head"
