#!/usr/bin/env bash
# doctor.sh — dsh-bi-dashboards 安装前体检脚本（只读，不改任何东西）
# 用途：装插件之前跑一次，把「今天装不上」的常见坑（DNS 劫持 / 证书 / allowBuilds /
# profile 补丁冲突 / 看板数据丢失）提前查出来，每项给人话结论和修复命令。
# 用法：bash static/scripts/doctor.sh
# 退出码：0 = 全部致命项通过（可安装）；1 = 有致命项失败（需先修复）。
set -euo pipefail

DSH_ROOT="${DSH_HOME:-$HOME/.dsh}"
PROFILE="$DSH_ROOT/profiles/web"
PERSIST="${BI_DASHBOARDS_HOME:-$DSH_ROOT/bi-dashboards}"

PASS=0; FAIL=0; WARN=0
ok()   { echo "  [通过] $*"; PASS=$((PASS+1)); }
bad()  { echo "  [失败] $*"; FAIL=$((FAIL+1)); }
warn() { echo "  [警告] $*"; WARN=$((WARN+1)); }
skip() { echo "  [跳过] $*"; }
hint() { echo "         ↳ 修复：$*"; }

echo "dsh-bi-dashboards 安装体检（只读，不修改任何文件）"
echo "环境：profile=$PROFILE  持久化目录=$PERSIST"
echo ""

echo "1) Node.js（需 >= 18）"
if command -v node >/dev/null 2>&1; then
  NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
  if [ "${NODE_MAJOR:-0}" -ge 18 ]; then
    ok "node $(node --version) 已安装"
  else
    bad "node 版本过低（$(node --version)），DSH 与本插件需要 >= 18"
    hint "curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash && source ~/.bashrc && nvm install 22"
  fi
else
  bad "未找到 node 命令"
  hint "curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash && source ~/.bashrc && nvm install 22"
fi
echo ""

echo "2) dsh CLI"
if command -v dsh >/dev/null 2>&1; then
  ok "dsh 命令已安装（$(dsh --version 2>/dev/null || echo '版本未知')）"
else
  bad "未找到 dsh 命令"
  hint "npm install -g @deepseek-ai/dsh（node 刚装完时先 source ~/.bashrc）"
fi
echo ""

echo "3) 网络 / DNS（能否从 GitHub 拉取插件）"
DNS_BAD=0
if getent hosts github.com >/dev/null 2>&1; then
  GITHUB_IP="$(getent hosts github.com | awk '{print $1}' | head -1)"
  case "$GITHUB_IP" in
    127.0.0.1|127.*|::1|0.0.0.0|localhost)
      DNS_BAD=1
      bad "github.com 被解析到 $GITHUB_IP（本机回环地址）——这是 DNS 劫持或 /etc/hosts 残留，安装必失败"
      hint "grep -rn github /etc/hosts 找到并删掉映射行；若来自路由器/代理 DNS，换 DNS（如 223.5.5.5 / 8.8.8.8）或开 TUN 模式代理"
      ;;
    *)
      ok "github.com 解析正常（$GITHUB_IP）"
      ;;
  esac
else
  DNS_BAD=1
  bad "getent hosts github.com 无结果——域名解析不通"
  hint "检查 /etc/resolv.conf 的 DNS 是否可用；公司/校园网可能需要换 DNS 或走代理"
fi
if [ "$DNS_BAD" -eq 0 ]; then
  CURL_OUT="$(curl -sI -m 8 -o /dev/null -w '%{http_code} %{errormsg}' https://github.com 2>/dev/null || true)"
  HTTP_CODE="${CURL_OUT%% *}"
  CURL_ERR="${CURL_OUT#* }"
  [ "$HTTP_CODE" = "$CURL_OUT" ] && HTTP_CODE="000"
  case "${HTTP_CODE:-000}" in
    200|301|302)
      ok "https://github.com 可达（HTTP $HTTP_CODE）"
      ;;
    000)
      bad "curl 连不上 https://github.com（8 秒超时）——网络不通"
      if echo "${CURL_ERR:-}" | grep -qi 'certificate\|ssl\|CA'; then
        echo "         ↳ 具体原因：证书验证失败（$CURL_ERR）"
        hint "sudo apt-get update && sudo apt-get install --reinstall ca-certificates；若系统时间不对先校时（date 看一眼）"
      else
        echo "         ↳ 具体原因：$CURL_ERR"
        hint "WSL 里能 ping 通外网但 443 不通 → 多为代理/防火墙拦截；配好代理或换网络后重试"
      fi
      ;;
    *)
      bad "https://github.com 返回异常状态 HTTP $HTTP_CODE"
      hint "多为代理/网关拦截，检查代理设置后重试"
      ;;
  esac
fi
echo ""

echo "4) DSH profile（$PROFILE）"
HAVE_PROFILE=0
if [ -d "$PROFILE" ]; then
  HAVE_PROFILE=1
  ok "profile 目录存在"
else
  skip "profile 尚未创建（全新机器属正常）——首次运行 dsh --profile web 会自动创建，届时再跑本脚本可查 5/6 两项"
fi
echo ""

echo "5) pnpm 构建白名单（pnpm-workspace.yaml 的 allowBuilds）"
ALLOWBLOCK='allowBuilds:
  '"'"'@deepseek-ai/dsh-subprocess-local'"'"': true
  koffi: true
  node-pty: true
  protobufjs: true
  all: true'
if [ "$HAVE_PROFILE" -eq 1 ]; then
  WS="$PROFILE/pnpm-workspace.yaml"
  if [ ! -f "$WS" ]; then
    warn "未找到 $WS —— 首次启动 dsh 后会生成，暂跳过"
  else
    MISSING=""
    for pkg in '@deepseek-ai/dsh-subprocess-local' koffi node-pty protobufjs; do
      grep -qE "^\s*(['\"]?${pkg//./\\.}['\"]?)\s*:\s*true" "$WS" || MISSING="$MISSING $pkg"
    done
    if [ -z "$MISSING" ]; then
      ok "allowBuilds 已覆盖全部所需构建包"
    elif grep -qE '^\s*all\s*:\s*true' "$WS"; then
      ok "allowBuilds 有 all: true 兜底（$MISSING 未单列，但构建不会被拦截）"
    else
      warn "allowBuilds 缺少以下包，安装时会报 ERR_PNPM_IGNORED_BUILDS、依赖装不完整：$MISSING"
      echo "         ↳ 修复：把下面整块合并进 $WS 的 allowBuilds: 段（没有该段就整块追加到文件末尾）："
      echo ""
      echo "$ALLOWBLOCK" | sed 's/^/           /'
      echo ""
    fi
  fi
else
  skip "profile 未创建，暂无法检查"
fi
echo ""

echo "6) profile 挂载补丁（cordis.patch.yml 重复 id / 悬空 insert）"
if [ "$HAVE_PROFILE" -eq 1 ]; then
  PATCH="$PROFILE/cordis.patch.yml"
  NM="$PROFILE/node_modules"
  if [ ! -f "$PATCH" ]; then
    skip "profile 无 cordis.patch.yml（全新机器属正常）"
  elif [ ! -s "$PATCH" ]; then
    bad "$PATCH 是空文件——合法形态是 [] 或合法列表，空文件会让 DSH 启动解析失败"
    hint "echo '[]' > $PATCH"
  else
    PATCH_OUT="$(node -e '
      const fs = require("fs");
      const patchFile = process.argv[1], nm = process.argv[2];
      const grab = (f) => {
        let names = [];
        fs.readFileSync(f, "utf8").split("\n").forEach((line, i) => {
          const m = line.match(/^\s*-?\s*(id|name)\s*:\s*([^\s#]+)\s*$/);
          if (m) names.push({ kind: m[1], value: m[2].replace(/^["\x27]|["\x27]$/g, ""), line: i + 1 });
        });
        return names;
      };
      const patch = grab(patchFile);
      if (patch.length === 0) { console.log("EMPTY_OK"); process.exit(0); }
      const pkgNames = fs.existsSync(nm)
        ? fs.readdirSync(nm).filter((d) => !d.startsWith("."))
        : [];
      const scoped = pkgNames.filter((d) => d.startsWith("@"));
      for (const s of scoped) {
        try { for (const d of fs.readdirSync(nm + "/" + s)) pkgNames.push(s + "/" + d); } catch (e) {}
      }
      let problems = 0;
      const seen = new Map();
      for (const e of patch) {
        const key = e.kind + ":" + e.value;
        if (seen.has(key)) {
          problems++;
          const prev = seen.get(key);
          console.log("DUP " + patchFile + ":" + prev.line + " 与 :" + e.line + "（" + e.kind + ": " + e.value + " 重复）");
        } else seen.set(key, e);
      }
      for (const e of patch) {
        if (e.kind === "name" && !pkgNames.includes(e.value)) {
          problems++;
          console.log("STALE " + patchFile + ":" + e.line + "（insert 指向的包 " + e.value + " 不在 node_modules 里）");
        }
      }
      // 与各包自带的 cordis.patch.yml 对比重复 id
      for (const p of pkgNames) {
        const pf = nm + "/" + p + "/cordis.patch.yml";
        if (!fs.existsSync(pf)) continue;
        for (const pe of grab(pf)) {
          for (const qe of patch) {
            if (qe.kind === pe.kind && qe.value === pe.value) {
              problems++;
              console.log("DUP " + patchFile + ":" + qe.line + " 与 " + pf + ":" + pe.line + "（" + qe.kind + ": " + qe.value + " 与包 " + p + " 自带补丁重复）");
            }
          }
        }
      }
      console.log(problems === 0 ? "ALL_OK" : "PROBLEMS " + problems);
    ' "$PATCH" "$NM" 2>&1)"
    case "$PATCH_OUT" in
      EMPTY_OK|ALL_OK)
        ok "补丁文件无重复 id、无悬空 insert"
        ;;
      *)
        while IFS= read -r line; do
          case "$line" in
            DUP*)    bad "${line#DUP }"; hint "重复条目会让 DSH 启动报 duplicate loader entry——删掉 profile 补丁里的重复块（包自带的那个才是对的）";;
            STALE*)  bad "${line#STALE }"; hint "整块删除该 insert（对应包已卸载/没装上，留着会启动报错）";;
            PROBLEMS*) ;;  # 内部计数标记，前面逐条已报
            *)       bad "补丁文件解析失败：$line"; hint "手动检查 $PATCH 是否为合法 YAML 列表";;
          esac
        done <<< "$PATCH_OUT"
        ;;
    esac
  fi
else
  skip "profile 未创建，暂无法检查"
fi
echo ""

echo "7) 持久化目录（$PERSIST）"
if [ ! -d "$PERSIST" ]; then
  skip "目录尚不存在（全新机器属正常）——首次启动插件时自动创建"
else
  if [ -f "$PERSIST/config.json" ]; then
    ok "config.json 存在"
  else
    bad "缺 $PERSIST/config.json"
    hint "重装一次插件（dsh plugin --profile web add github:LYJ132/dsh-bi-dashboards，Gitee 备选 https://gitee.com/LYJ132/dsh-bi-dashboards.git）或从 backup 目录恢复"
  fi
  if [ -f "$PERSIST/vendor/echarts.min.js" ] && [ -s "$PERSIST/vendor/echarts.min.js" ]; then
    ok "vendor/echarts.min.js 存在"
  else
    bad "缺 $PERSIST/vendor/echarts.min.js（图表会 404 空白）"
    hint "cp <本仓库>/static/vendor/echarts.min.js $PERSIST/vendor/echarts.min.js"
  fi
  STORE="$PERSIST/data/bi-dashboards.json"
  if [ ! -f "$STORE" ]; then
    warn "看板数据 $STORE 尚不存在"
    echo "         ↳ 全新安装属正常（看板由 AI 对话生成）；但如果你以前明明保存过看板，说明 store 文件丢了——恢复方法见 INSTALL.md「常见报错对照表」最后一条"
  elif [ ! -s "$STORE" ]; then
    bad "$STORE 是空文件"
    hint "从备份恢复：ls $PERSIST/backup-*/ 找最近的 backup 里的 data/bi-dashboards.json 拷回 $PERSIST/data/"
  else
    if node -e 'const s=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")); if(!s||typeof s!=="object"||!("charts" in s)) process.exit(2);' "$STORE" 2>/dev/null; then
      ok "看板数据存在且为合法 JSON（含 charts 键）"
    else
      bad "$STORE 不是合法 JSON 或缺少 charts 键（看板会全部消失/报错）"
      hint "对比备份：node -e 'JSON.parse(require(\"fs\").readFileSync(\"$STORE\",\"utf8\"))' 看报错行；修不好就从 $PERSIST/backup-*/ 恢复"
    fi
  fi
fi
echo ""

echo "=========================================="
if [ "$FAIL" -eq 0 ]; then
  echo "结论：可安装 ✓（$PASS 项通过，$WARN 项警告）"
  [ "$WARN" -gt 0 ] && echo "警告项不影响安装，但建议按上面的修复提示处理。"
  exit 0
else
  echo "结论：需先修复 ✗（$FAIL 项失败，$WARN 项警告）"
  echo "按上面各 [失败] 项的修复命令处理后，重新运行本脚本直到全部通过。"
  exit 1
fi
