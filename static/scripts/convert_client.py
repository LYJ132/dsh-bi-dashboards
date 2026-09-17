#!/usr/bin/env python3
"""动态插件 v21-client.js → 静态 client 包 lib/client.js 转换器。

输入/输出不再硬编码个人目录：
- 输入：argv[1] 或 $BI_V21_CLIENT_JS，默认 $HOME/Project/.dsh/v21-client.js
- 输出 1（已安装 profile 包）：argv[2] 或 $BI_PROFILE_CLIENT_JS，
  默认 ~/.dsh/profiles/web/node_modules/bi-dashboards-client/lib/client.js
- 输出 2（仓库内副本）：argv[3] 或 $BI_STATIC_CLIENT_JS，默认按本脚本位置推导
  static/bi-dashboards-client/lib/client.js

锚点缺失即报错退出（1）；写入：先备份 .bak → 临时文件 → os.replace 原子替换。
"""
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_STATIC = os.path.join(HERE, os.pardir, "bi-dashboards-client", "lib", "client.js")
DEFAULT_PROFILE = os.path.expanduser(
    "~/.dsh/profiles/web/node_modules/bi-dashboards-client/lib/client.js")


def fail(msg):
    print(f'[convert_client] 错误：{msg}', file=sys.stderr)
    sys.exit(1)


def must_replace(src, old, new, label):
    if src.count(old) != 1:
        fail(f'锚点不唯一或缺失: {label}（count={src.count(old)}）')
    return src.replace(old, new, 1)


def atomic_write(path, content):
    try:
        d = os.path.dirname(path)
        if d:
            os.makedirs(d, exist_ok=True)
        if os.path.isfile(path):
            with open(path, encoding='utf-8') as f:
                prev = f.read()
            if prev != content:
                with open(path + ".bak", "w", encoding='utf-8') as f:
                    f.write(prev)
        tmp = path + ".tmp"
        with open(tmp, "w", encoding='utf-8') as f:
            f.write(content)
        os.replace(tmp, path)
    except OSError as e:
        fail(f'写入 {path} 失败: {e}')


def main():
    project = os.environ.get("DSH_PROJECT_DIR") or os.path.expanduser("~/Project")
    inp = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("BI_V21_CLIENT_JS") or os.path.join(project, ".dsh", "v21-client.js")
    out_profile = sys.argv[2] if len(sys.argv) > 2 else os.environ.get("BI_PROFILE_CLIENT_JS") or DEFAULT_PROFILE
    out_static = sys.argv[3] if len(sys.argv) > 3 else os.environ.get("BI_STATIC_CLIENT_JS") or os.path.normpath(DEFAULT_STATIC)

    try:
        with open(inp, encoding='utf-8') as f:
            src = f.read()
    except OSError as e:
        fail(f'无法读取 {inp}: {e}')

    # 1. 头部包装
    head = """window.__ModuleLoader__.load({
  id: 'bi-dashboards-client',
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    const React = require('react');
"""
    first_comment = "// 无人超市 AI BI 插件 — Client 半部（v9：整合同步监控条，单面板压缩布局）"
    src = must_replace(src, first_comment, first_comment + "\n" + head, "头部注释（已转换？）")

    # 2. host.call('bi.xxx' -> biCall('bi.xxx'（保留 bi. 前缀，与 host biApi key 一致！）
    n = len(re.findall(r"host\.call\('bi\.([a-zA-Z]+)'", src))
    if n < 1:
        fail('锚点缺失: host.call(bi.*)（已转换？）')
    src = re.sub(r"host\.call\('bi\.([a-zA-Z]+)'", r"biCall('bi.\1'", src)
    print('host.call replaced:', n)

    # 3. biCall/injectCss/timer 辅助（必须在 CSS 模板字符串之前）
    bi_helpers = """function biCall(m, args) {
  return fetch('/bi/api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ m: m, args: args || {} }) }).then(function (r) { return r.json() })
}
function injectCss() {
  if (typeof document === 'undefined') return
  if (document.getElementById('bi-static-css')) return
  var styleEl = document.createElement('style')
  styleEl.id = 'bi-static-css'
  styleEl.textContent = CSS
  document.head.appendChild(styleEl)
}
var BI_TIMERS = []
function biTimerInterval(fn, ms) { try { var id = window.setInterval(fn, ms); BI_TIMERS.push(id); return function () { try { window.clearInterval(id) } catch (e) {} } } catch (e) { return null } }
function biTimerTimeout(fn, ms) { try { var id = window.setTimeout(fn, ms); BI_TIMERS.push(id); return function () { try { window.clearTimeout(id) } catch (e) {} } } catch (e) { return null } }
"""
    src = must_replace(src, "const React = require('react');",
                       "const React = require('react');\n" + bi_helpers, "react require 锚点")

    # 4. 先拆尾部：插件对象 -> exports（顺序重要：先改尾部，apply 头部才有唯一锚点）
    src = must_replace(
        src,
        "return { inject: ['slots', 'timer', 'sessions'], apply(ctx) {",
        "exports.inject = ['slots'];\nexports.apply = function apply(ctx) {",
        "tail open")

    # 5. 再改 apply 函数体头部（styles.insert -> injectCss；ctx.interval/timeout -> window 原生）
    old_head = "apply(ctx) { styles.insert(CSS); SESSIONS = ctx.get('sessions'); TIMER_INTERVAL = function (fn, ms) { try { return ctx.interval(fn, ms) } catch (e) { return null } };\n      TIMER_TIMEOUT = function (fn, ms) { try { return ctx.timeout(fn, ms) } catch (e) { return null } };"
    new_head = "apply(ctx) { injectCss(); SESSIONS = ctx.get('sessions'); TIMER_INTERVAL = biTimerInterval;\n      TIMER_TIMEOUT = biTimerTimeout;\n      ctx.effect(function () { return function () { BI_TIMERS.forEach(function (id) { try { window.clearInterval(id) } catch (e) {} try { window.clearTimeout(id) } catch (e2) {} }) } });"
    src = must_replace(src, old_head, new_head, "apply head")

    # 6. 尾部闭合
    tail_close = """function (props) { return React.createElement(BiView, { sessionId: props.sessionId }) }) }) } }"""
    tail_close_new = """function (props) { return React.createElement(BiView, { sessionId: props.sessionId }) }) })
}
return module.exports;
  }
});
"""
    src = must_replace(src, tail_close, tail_close_new, "tail close")

    atomic_write(out_profile, src)
    atomic_write(out_static, src)
    print('written:', out_profile)
    print('written:', out_static)
    print('len=', len(src))


if __name__ == "__main__":
    main()
