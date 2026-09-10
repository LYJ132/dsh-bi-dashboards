import re

src = open('/home/szulg/Project/.dsh/v21-client.js', encoding='utf-8').read()

# 1. 头部包装
head = """window.__ModuleLoader__.load({
  id: 'bi-dashboards-client',
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    const React = require('react');
"""
first_comment = "// 无人超市 AI BI 插件 — Client 半部（v9：整合同步监控条，单面板压缩布局）"
src = src.replace(first_comment, first_comment + "\n" + head, 1)

# 2. host.call('bi.xxx' -> biCall('bi.xxx'（保留 bi. 前缀，与 host biApi key 一致！）
n = len(re.findall(r"host\.call\('bi\.([a-zA-Z]+)'", src))
src = re.sub(r"host\.call\('bi\.([a-zA-Z]+)'", r"biCall('bi.\1'", src)
print('host.call replaced:', n)

# 3. biCall/injectCss/timer 辅助（必须在 CSS 模板字符串之前）
anchor = "const React = require('react');"
assert src.count(anchor) == 1, 'react require anchor not unique'
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
src = src.replace(anchor, anchor + "\n" + bi_helpers, 1)

# 4. 先拆尾部：插件对象 -> exports（顺序重要：先改尾部，apply 头部才有唯一锚点）
tail_open = "return { inject: ['slots', 'timer', 'sessions'], apply(ctx) {"
assert src.count(tail_open) == 1, 'tail open not unique'
src = src.replace(tail_open, "exports.inject = ['slots'];\nexports.apply = function apply(ctx) {", 1)

# 5. 再改 apply 函数体头部（styles.insert -> injectCss；ctx.interval/timeout -> window 原生）
old_head = "apply(ctx) { styles.insert(CSS); SESSIONS = ctx.get('sessions'); TIMER_INTERVAL = function (fn, ms) { try { return ctx.interval(fn, ms) } catch (e) { return null } };\n      TIMER_TIMEOUT = function (fn, ms) { try { return ctx.timeout(fn, ms) } catch (e) { return null } };"
new_head = "apply(ctx) { injectCss(); SESSIONS = ctx.get('sessions'); TIMER_INTERVAL = biTimerInterval;\n      TIMER_TIMEOUT = biTimerTimeout;\n      ctx.effect(function () { return function () { BI_TIMERS.forEach(function (id) { try { window.clearInterval(id) } catch (e) {} try { window.clearTimeout(id) } catch (e2) {} }) } });"
assert src.count(old_head) == 1, 'apply head not unique'
src = src.replace(old_head, new_head, 1)

# 6. 尾部闭合
tail_close = """function (props) { return React.createElement(BiView, { sessionId: props.sessionId }) }) }) } }"""
tail_close_new = """function (props) { return React.createElement(BiView, { sessionId: props.sessionId }) }) })
}
return module.exports;
  }
});
"""
assert src.count(tail_close) == 1, 'tail close not unique'
src = src.replace(tail_close, tail_close_new, 1)

open('/home/szulg/.dsh/profiles/web/node_modules/bi-dashboards-client/lib/client.js', 'w', encoding='utf-8').write(src)
open('/home/szulg/Project/bi-plugin/static/bi-dashboards-client/lib/client.js', 'w', encoding='utf-8').write(src)
print('written, len=', len(src))
