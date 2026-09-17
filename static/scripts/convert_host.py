#!/usr/bin/env python3
"""动态插件 v20-host.js → 静态 host 包 lib/index.js 转换器。

输入/输出不再硬编码个人目录：
- 输入：argv[1] 或 $BI_V20_HOST_JS，默认 $HOME/Project/.dsh/v20-host.js
- 输出：argv[2] 或 $BI_HOST_INDEX_JS，默认 ~/.dsh/profiles/web/node_modules/bi-dashboards-host/lib/index.js

结构锚点缺失即报错退出（1），不再静默产出半转换文件；
写入：先备份 .bak → 临时文件 → os.replace 原子替换。
"""
import os
import re
import sys


def default_in():
    project = os.environ.get("DSH_PROJECT_DIR") or os.path.expanduser("~/Project")
    return os.path.join(project, ".dsh", "v20-host.js")


DEFAULT_OUT = os.path.expanduser(
    "~/.dsh/profiles/web/node_modules/bi-dashboards-host/lib/index.js")

POST_ROUTE = '''  if (ws) ctx.effect(() => ws.register({ kind: 'exact', path: '/bi/api', handler: async (req, res) => {
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


def fail(msg):
    print(f'[convert_host] 错误：{msg}', file=sys.stderr)
    sys.exit(1)


def must_replace(src, old, new, label):
    """结构性锚点：必须出现且恰好替换一次，否则终止（防止产出半转换文件）。"""
    if src.count(old) < 1:
        fail(f'锚点缺失: {label}')
    return src.replace(old, new, 1)


def main():
    inp = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("BI_V20_HOST_JS") or default_in()
    outp = sys.argv[2] if len(sys.argv) > 2 else os.environ.get("BI_HOST_INDEX_JS") or DEFAULT_OUT
    try:
        with open(inp, encoding='utf-8') as f:
            src = f.read()
    except OSError as e:
        fail(f'无法读取 {inp}: {e}')

    # 1. 头部插入 import
    src = must_replace(
        src,
        "// 无人超市 AI BI 插件 — Host 半部（v20：图表记录session_id + setupChartModificationBranch 分支注入+规范化命名）",
        "// 无人超市 AI BI 插件 — Host 半部（全局静态化 v1：由动态插件 v20 适配而来）\nimport { defineTool } from '@deepseek-ai/dsh-tools'",
        "头部注释（已转换？）")

    # 2. 插件对象 export
    src = must_replace(
        src,
        "return { inject: ['subprocess', 'systemPrompt', 'webServer', 'fs', 'tools'], apply(ctx) {",
        "export default { inject: ['subprocess', 'systemPrompt', 'webServer', 'fs', 'tools'], apply(ctx) {",
        "export default")

    # 3. harness.defineTool -> defineTool
    n = src.count('harness.defineTool(')
    src = src.replace('harness.defineTool(', 'defineTool(')
    print('defineTool replaced:', n)

    # 4. harness.registerTool(ctx, X) -> ctx.tools.register(X)
    n = src.count('harness.registerTool(ctx, ')
    src = src.replace('harness.registerTool(ctx, ', 'ctx.tools.register(')
    print('registerTool replaced:', n)

    # 5. apply 内声明 biApi（在 ws/fsv 行后）
    src = must_replace(
        src,
        "  const ws = ctx.get('webServer'); const fsv = ctx.get('fs'); if (ws && fsv) ctx.effect(() => ws.register({ kind: 'route', path: ECHARTS_ROUTE,",
        "  const ws = ctx.get('webServer'); const fsv = ctx.get('fs'); const biApi = {}; if (ws && fsv) ctx.effect(() => ws.register({ kind: 'exact', path: ECHARTS_ROUTE,",
        "biApi 声明行")

    # 6. harness.handle('bi.xxx', async (args) => { -> biApi['bi.xxx'] = async (args) => {
    n = len(re.findall(r"harness\.handle\('bi\.([a-zA-Z]+)', async \(args\) => \{", src))
    if n < 1:
        fail('锚点缺失: harness.handle(bi.*)（已转换？）')
    src = re.sub(r"harness\.handle\('bi\.([a-zA-Z]+)', async \(args\) => \{", r"biApi['bi.\1'] = async (args) => {", src)
    print('handle replaced:', n)

    # 7. 尾部：POST /bi/api 路由
    src = must_replace(
        src,
        "console.log('[bi] Phase5 Host 已加载 (v20)')\n} }",
        "console.log('[bi] Phase5 Host 已加载 (static v1)')\n" + POST_ROUTE + "} }",
        "尾部加载日志")

    outdir = os.path.dirname(outp) or "."
    try:
        os.makedirs(outdir, exist_ok=True)
        try:
            if os.path.isfile(outp):
                with open(outp, encoding='utf-8') as f:
                    prev = f.read()
                if prev != src:
                    with open(outp + ".bak", "w", encoding='utf-8') as f:
                        f.write(prev)
        except OSError as e:
            fail(f'无法备份 {outp}: {e}')
        tmp = outp + ".tmp"
        with open(tmp, "w", encoding='utf-8') as f:
            f.write(src)
        os.replace(tmp, outp)
    except OSError as e:
        fail(f'写入 {outp} 失败: {e}')
        return
    print('written:', outp, '| len=', len(src))


if __name__ == "__main__":
    main()
