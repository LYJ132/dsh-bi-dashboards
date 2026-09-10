import re, sys

src = open('/home/szulg/Project/.dsh/v20-host.js', encoding='utf-8').read()

# 1. 头部插入 import
src = src.replace(
    "// 无人超市 AI BI 插件 — Host 半部（v20：图表记录session_id + setupChartModificationBranch 分支注入+规范化命名）",
    "// 无人超市 AI BI 插件 — Host 半部（全局静态化 v1：由动态插件 v20 适配而来）\nimport { defineTool } from '@deepseek-ai/dsh-tools'",
    1
)

# 2. 插件对象 export
src = src.replace(
    "return { inject: ['subprocess', 'systemPrompt', 'webServer', 'fs', 'tools'], apply(ctx) {",
    "export default { inject: ['subprocess', 'systemPrompt', 'webServer', 'fs', 'tools'], apply(ctx) {",
    1
)

# 3. harness.defineTool -> defineTool
n = src.count('harness.defineTool(')
src = src.replace('harness.defineTool(', 'defineTool(')
print('defineTool replaced:', n)

# 4. harness.registerTool(ctx, X) -> ctx.tools.register(X)
n = src.count('harness.registerTool(ctx, ')
src = src.replace('harness.registerTool(ctx, ', 'ctx.tools.register(')
print('registerTool replaced:', n)

# 5. apply 内声明 biApi（在 ws/fsv 行后）
src = src.replace(
    "  const ws = ctx.get('webServer'); const fsv = ctx.get('fs'); if (ws && fsv) ctx.effect(() => ws.register({ kind: 'route', path: ECHARTS_ROUTE,",
    "  const ws = ctx.get('webServer'); const fsv = ctx.get('fs'); const biApi = {}; if (ws && fsv) ctx.effect(() => ws.register({ kind: 'exact', path: ECHARTS_ROUTE,",
    1
)

# 6. harness.handle('bi.xxx', async (args) => { -> biApi['bi.xxx'] = async (args) => {
n = len(re.findall(r"harness\.handle\('bi\.([a-zA-Z]+)', async \(args\) => \{", src))
src = re.sub(r"harness\.handle\('bi\.([a-zA-Z]+)', async \(args\) => \{", r"biApi['bi.\1'] = async (args) => {", src)
print('handle replaced:', n)

# 7. 尾部：POST /bi/api 路由
post_route = '''  if (ws) ctx.effect(() => ws.register({ kind: 'exact', path: '/bi/api', handler: async (req, res) => {
    if (req.method !== 'POST') { res.writeHead(405, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'method not allowed' })); return }
    let body = ''
    try { for await (const chunk of req) body += chunk } catch (e) {}
    let parsed = {}
    try { parsed = JSON.parse(body || '{}') } catch (e) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'bad json' })); return }
    const m = String(parsed.m || '')
    const fn = biApi[m]
    if (!fn) { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'no such method: ' + m })); return }
    try {
      const result = await fn(parsed.args || {})
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(result))
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: String(e && e.message || e) }))
    }
  } }))
'''
src = src.replace("console.log('[bi] Phase5 Host 已加载 (v20)')\n} }", "console.log('[bi] Phase5 Host 已加载 (static v1)')\n" + post_route + "} }", 1)

open('/home/szulg/.dsh/profiles/web/node_modules/bi-dashboards-host/lib/index.js', 'w', encoding='utf-8').write(src)
print('written, len=', len(src))
