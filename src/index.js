// 无人超市 AI BI 插件 — Host 半部（全局静态化 v1：由动态插件 v20 适配而来）
import { defineTool } from '@deepseek-ai/dsh-tools'
import { existsSync, readFileSync, realpathSync, promises as fsp } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
// PKG_DIR 必须走 fileURLToPath：URL.pathname 不做 percent 解码（含空格/中文的路径会 404），
// Windows 下还会产生盘符前斜杠（/D:/...），readFileSync 直接失败。
const PKG_DIR = fileURLToPath(new URL('../', import.meta.url)).replace(/[\\/]+$/, '')
// 持久化目录（包外）：重装/升级 dsh-bi-dashboards 包不丢用户数据；可用环境变量 BI_DASHBOARDS_HOME 覆盖
const PERSIST_DIR = String(process.env.BI_DASHBOARDS_HOME || (process.env.HOME + '/.dsh/bi-dashboards')).replace(/\/+$/, '')
const ECHARTS_ROUTE = '/bi/vendor/echarts.min.js'
// IPv4-safe defaults: web/server.py binds 127.0.0.1 (IPv4 only). Node fetch resolves
// `localhost` to ::1 on dual-stack systems → connection refused. Use 127.0.0.1.
let CFG = { dataApi: 'http://127.0.0.1:8600', statusUrl: 'http://127.0.0.1:8080', vendorFile: PERSIST_DIR + '/vendor/echarts.min.js', storeFile: PERSIST_DIR + '/data/bi-dashboards.json', crawlConfigFile: '' }
let cfgReady = Promise.resolve()
const NAME_MAP_ZH = { tables: { ai_settings: { zh: '数据服务设置', desc: 'AI 配置键值（表访问白名单等）' }, alert_subscriber: { zh: '预警订阅', desc: '邮件预警订阅人与审核状态' }, category_dim: { zh: '品类维度', desc: '品类编码到大类/中类的映射' }, date_dim: { zh: '日期维度', desc: '2022~2026 连续日历，含周末/节假日标记' }, forecast_results: { zh: '销量预测', desc: '按商品×门店×日期的模型预测销量及区间' }, forecast_monthly: { zh: '月度销量预测', desc: '每个商品本月份的预测总量(今天~月底逐日求和),每月 1 号更新' }, forecast_accuracy: { zh: '预测准确率', desc: '周度预测 vs 实际销量的准确率存档(每商品每周评估,1-加权MAPE×100)' }, forecast_history: { zh: '预测历史', desc: '每期周度预测快照存档(商品×日期×生成批次),在线表每周替换,历史在这里留底' }, inventory_total: { zh: '库存总览', desc: '仓库库存、货架现库存与安全库存线' }, n8n_operation_log: { zh: '运维日志', desc: 'n8n 自动化操作流水与 SQL 快照' }, order_detail_raw: { zh: '销售明细', desc: '每行一条订单商品，唯一大规模历史数据源' }, procurement_management: { zh: '采购管理', desc: '采购批次、数量、单价与保质期' }, procurement_management_bak_20260909: { zh: '采购管理备份', desc: '采购管理 2026-09-09 备份' }, product_main: { zh: '商品主档', desc: '商品条码、价格、状态与陈列标准' }, replenish_log: { zh: '补货日志', desc: '补货计划与实际执行记录' }, replenish_subscribe: { zh: '补货订阅', desc: '补货提醒邮件订阅' }, shelf_product_rel: { zh: '货架-商品关联', desc: '货架编号与商品条码的摆放关系' }, store_info: { zh: '门店信息', desc: '门店基础档案' }, store_stat_raw: { zh: '门店统计', desc: '门店统计原始数据' }, sync_meta: { zh: '同步元数据', desc: '各同步管道的最新同步时间' } }, fields: { item_id: '明细行编号', order_no: '订单号', user_id: '用户编号', store_id: '门店编号', original_amount: '原始金额', discount_total: '优惠总额', pay_amount: '实付金额', order_create_time: '下单时间', order_status: '订单状态', product_qty: '商品数量', product_price: '商品单价', order_date: '下单日期', product_id: '商品编号', product_name: '商品名称', cost_price: '成本价', standard_price: '标准售价', shelf_life_days: '保质期(天)', unit: '单位', product_status: '商品状态', cate_code: '品类编码', cate_name: '品类名称', big_category: '大类', mid_category: '中类', sort_no: '排序号', standard_put_qty: '标准陈列数量', inv_id: '库存记录编号', warehouse_stock: '仓库库存', shelf_current_stock: '货架现库存', safety_stock: '安全库存', stock_update_time: '库存更新时间', date: '日期', year: '年', quarter: '季度', month: '月份', week: '周序号', day: '日', year_month: '年月', is_weekend: '是否周末', is_holiday: '是否节假日', id: '编号', train_date: '生成批次', eval_date: '评估日期', period_start: '评估窗口起', period_end: '评估窗口止', evaluated_days: '评估天数', actual_qty: '实际销量', abs_error: '绝对误差', accuracy_pct: '准确率(%)', forecast_date: '预测日期', predicted_qty: '预测销量', predicted_lower: '预测下界', predicted_upper: '预测上界', model_generation_date: '模型生成时间', model_name: '模型名称', sub_id: '订阅编号', email: '邮箱', name: '姓名', department: '部门', status: '状态', token: '访问令牌', created_at: '创建时间', approved_at: '审核通过时间', approved_by: '审核人', cancelled_at: '取消时间', timestamp: '操作时间', operator: '操作人', operation: '操作类型', target_id: '操作对象编号', detail: '详情', sql_snapshot: 'SQL快照', procurement_id: '采购批次编号', pack_spec: '包装规格', quantity: '数量', unit_price: '单价', total_amount: '总金额', procurement_date: '采购日期', produce_date: '生产日期', expire_date: '到期日期', is_processed: '是否已处理', replenish_id: '补货记录编号', shelf_id: '货架编号', plan_repl_qty: '计划补货量', actual_repl_qty: '实际补货量', repl_type: '补货类型', repl_status: '补货状态', operator_name: '操作人姓名', finish_time: '完成时间', create_time: '创建时间', create_date: '创建日期', contact_email: '联系邮箱', subscribe_type: '订阅类型', rel_id: '关联记录编号', shelf_code: '货架编号', product_code: '商品条码', sync_key: '同步项', sync_value: '同步值', updated_at: '更新时间', key: '配置键', value: '配置值', warehouse: '仓库', category: '品类' } }
// HTTP 层统一走全局 fetch（原 curl 子进程路径已删除：省去每请求一次进程 spawn 的开销与 curl 依赖）。
// 非 2xx → 抛结构化 Error，携带 {status, body}（body 尽量解析为 JSON，失败保留截断文本）。
// ctx 参数保留仅为兼容既有调用点签名，fetch 不再依赖 subprocess 服务。
// 将 http(s)://localhost:PORT 归一化为 http(s)://127.0.0.1:PORT：
// web/server.py 默认只绑 127.0.0.1（IPv4），而 Node 18 fetch 解析 localhost 可能命中 ::1（IPv6），
// 导致请求被拒（倒计时环空白回归的根因）。仅改 host 部分；路径/端口/查询串原样保留；
// https 同样归一化为 https://127.0.0.1（注意：若服务端证书是签给 localhost 的，会存在证书名不匹配的隐患）。
function toIpv4Localhost(url) {
  return String(url).replace(/^(https?):\/\/localhost(?=[:/?#]|$)/i, '$1://127.0.0.1')
}
async function callApi(ctx, method, path, body, timeoutMs) {
  await cfgReady
  const url = toIpv4Localhost(path.indexOf('http') === 0 ? path : CFG.dataApi + path)
  const init = { method, signal: AbortSignal.timeout(timeoutMs || 90000) }
  if (body !== undefined) { init.headers = { 'Content-Type': 'application/json' }; init.body = JSON.stringify(body) }
  let res
  try { res = await fetch(url, init) } catch (e) { throw new Error('数据服务请求失败: ' + String((e && e.message) || e).slice(0, 200)) }
  const text = await res.text()
  if (!res.ok) {
    let parsed = text.slice(0, 500)
    try { parsed = JSON.parse(text) } catch (e) {}
    const err = new Error('数据服务 HTTP ' + res.status + ': ' + String(text).slice(0, 200))
    err.status = res.status; err.body = parsed
    throw err
  }
  return text
}
// 8080 状态服务透传 POST：响应体原样返回（含 409 的 {"busy":true}/{"status":"busy"}/{"status":"paused"}），
// 主机侧不再维护任何本地冷却时间戳——防重入的唯一事实源在 8080。
async function forwardStatusPost(path) {
  await cfgReady
  const url = toIpv4Localhost(String(CFG.statusUrl || '').replace(/\/+$/, '')) + path
  try {
    const r = await fetch(url, { method: 'POST', signal: AbortSignal.timeout(8000) })
    const text = await r.text()
    try { return JSON.parse(text || '{}') } catch (e) { return r.ok ? { ok: true } : { error: 'HTTP ' + r.status + ': ' + text.slice(0, 200) } }
  } catch (e) { return { error: '状态服务请求失败: ' + String((e && e.message) || e).slice(0, 200) } }
}
async function getJson(ctx, method, path, body, timeoutMs) { const text = await callApi(ctx, method, path, body, timeoutMs); try { return JSON.parse(text) } catch (e) { throw new Error('数据服务返回非 JSON: ' + String(text).slice(0, 200)) } }
// ===== 插件自更新（双形态统一入口）：git 仓库安装走 git fetch / pull --ff-only + node scripts/build.mjs；
// github: 快照安装（非 git）走 DSH 原生刷新 dsh plugin --profile web add github:LYJ132/dsh-bi-dashboards =====
// 红线：git 形态只做 ff-only 拉取与构建；快照形态只调官方 add 命令；绝不跑 reset/checkout/clean 等破坏性命令，绝不触碰 ~/.dsh/bi-dashboards/（用户数据在包外）。
const REPO_URL = 'github:LYJ132/dsh-bi-dashboards'
const UPD_HINT = 'dsh plugin --profile web add ' + REPO_URL + ' 更新'
const UPD_NATIVE_HINT = '点更新将从 GitHub 拉取最新版'
let PKG_VERSION = '1.1.0'
try { PKG_VERSION = String(JSON.parse(readFileSync(PKG_DIR + '/package.json', 'utf8')).version || PKG_VERSION) } catch (e) {}
async function runCmd(ctx, argv, cwd, timeoutMs) {
  const sub = ctx.get('subprocess'); if (!sub) throw new Error('subprocess 服务不可用')
  const handle = sub.spawn({ argv, cwd, stdio: { stdin: 'ignore', stdout: { maxBytes: 4 * 1024 * 1024 }, stderr: { maxBytes: 1024 * 1024 } }, graceMs: 15000 })
  const outcome = await handle.done
  return { code: outcome && typeof outcome === 'object' ? outcome.exitCode : outcome, out: (handle.collected.stdout.readFrom(0).text || '').trim(), err: (handle.collected.stderr.readFrom(0).text || '').trim() }
}
function updateRepoDir() {
  let real = PKG_DIR
  try { real = realpathSync(PKG_DIR) } catch (e) {}
  if (!existsSync(real + '/.git')) return null
  return real
}
// 实时读取仓库 package.json 版本号：与 current/behind 来自同一份磁盘快照，避免未重启进程上报过期的加载期版本；读不到才退回模块常量
function livePkgVersion(repo) {
  try { return String(JSON.parse(readFileSync(repo + '/package.json', 'utf8')).version || PKG_VERSION) } catch (e) { return PKG_VERSION }
}
async function updateCheckState(ctx) {
  const repo = updateRepoDir()
  if (!repo) {
    // 快照安装（github: 形态，包目录无 .git）：本地版本实时读包内 package.json；
    // 远端最新版 best-effort 走 `npm view github:… version`（外层 timeout 40s 硬上限——弱网/劫持环境
    // 下 npm 会无限挂起，runCmd 的 timeoutMs 不强制；失败只置 null，绝不臆造落后数）
    const version = livePkgVersion(PKG_DIR)
    let latestVersion = null
    try {
      const nv = await runCmd(ctx, ['timeout', '-k', '5', '40', 'npm', 'view', REPO_URL, 'version'], '/tmp', 45000)
      if (nv.code === 0) { const m = String(nv.out).match(/\d+\.\d+\.\d+[0-9A-Za-z.\-]*/); if (m) latestVersion = m[0] }
    } catch (e) {}
    return { repo: false, version, latestVersion, canUpdate: true, method: 'native-add', hint: UPD_NATIVE_HINT }
  }
  const fr = await runCmd(ctx, ['git', 'fetch', 'origin'], repo, 60000)
  if (fr.code !== 0) return { repo: true, error: 'git fetch 失败: ' + (fr.err || fr.out || ('exit ' + fr.code)).slice(0, 200) }
  const head = await runCmd(ctx, ['git', 'rev-parse', 'HEAD'], repo, 15000)
  const orig = await runCmd(ctx, ['git', 'rev-parse', 'origin/master'], repo, 15000)
  if (head.code !== 0 || orig.code !== 0) return { repo: true, error: '无法读取 git 版本: ' + ((orig.err || head.err) || 'rev-parse 失败').slice(0, 200) }
  const cnt = await runCmd(ctx, ['git', 'rev-list', '--count', 'HEAD..origin/master'], repo, 15000)
  const st = await runCmd(ctx, ['git', 'status', '--porcelain'], repo, 15000)
  const dt = await runCmd(ctx, ['git', 'show', '-s', '--format=%cI', 'HEAD'], repo, 15000)
  // 远端最新版本：直接读 origin/master 上的 package.json（与工作区读取相互独立），失败回退 null
  let latestVersion = null
  const rv = await runCmd(ctx, ['git', 'show', 'origin/master:package.json'], repo, 15000)
  if (rv.code === 0) { try { latestVersion = String(JSON.parse(rv.out).version || '') || null } catch (e) {} }
  return { repo: true, version: livePkgVersion(repo), latestVersion, current: head.out.slice(0, 7) + (dt.out ? ' · ' + dt.out.slice(0, 10) : ''), behind: parseInt(cnt.out, 10) || 0, clean: st.code === 0 && st.out === '' }
}
// ===== 更新执行唯一入口：设置页「一键更新」(bi.update.run) 与斜杠命令 /bi-update 共用同一条路径， =====
// ===== 保证两入口行为一致（git 安装 pull --ff-only + build；快照安装原生 dsh plugin add 重装）。 =====
async function performUpdate(ctx) {
  try {
    const repo = updateRepoDir()
    if (!repo) {
      // 快照安装：DSH 原生刷新——dsh plugin --profile web add <REPO_URL>（重装最新快照；
      // 用户数据在包外 PERSIST_DIR，不受重装影响；长超时 300s 容忍弱网 clone+装依赖）
      let nat
      try {
        nat = await runCmd(ctx, ['dsh', 'plugin', '--profile', 'web', 'add', REPO_URL], '/tmp', 300000)
      } catch (e) {
        const em = String((e && e.message) || e)
        return { ok: false, error: (/ENOENT/.test(em) ? '未找到 dsh 命令，无法自动更新，请在终端手动执行：' + UPD_HINT + '（' + em + '）' : em) }
      }
      if (nat.code !== 0) {
        const detail = String(nat.err || nat.out || ('exit ' + nat.code)).slice(0, 400)
        const notFound = nat.code === 127 || /ENOENT|command not found|no such file/i.test(detail)
        return { ok: false, error: notFound ? '未找到 dsh 命令，请手动执行：' + UPD_HINT : 'dsh plugin add 失败: ' + detail }
      }
      return { ok: true, updated: true, method: 'native-add', note: '重启 DSH 生效' }
    }
    const pre = await updateCheckState(ctx)
    if (pre.error) return { ok: false, error: pre.error }
    if (!pre.repo) return { ok: false, hint: UPD_HINT }
    if (pre.behind === 0) return { ok: true, updated: false, version: pre.version, note: '已是最新' }
    if (!pre.clean) return { ok: false, error: '工作区有改动，已拒绝更新（请先在插件目录处理未提交修改）' }
    // from/to 一律以「更新后实时读取的版本号」为准（读不到才退回提交号），与卡片展示口径一致
    const from = pre.version ? 'v' + pre.version : pre.current
    const pull = await runCmd(ctx, ['git', 'pull', '--ff-only', 'origin', 'master'], repo, 180000)
    if (pull.code !== 0) return { ok: false, error: 'git pull 失败: ' + (pull.err || pull.out || ('exit ' + pull.code)).slice(0, 400) }
    const bld = await runCmd(ctx, [process.execPath, 'scripts/build.mjs'], repo, 300000)
    if (bld.code !== 0) return { ok: false, error: '构建失败: ' + (bld.err || bld.out || ('exit ' + bld.code)).slice(0, 400) }
    const chk = await updateCheckState(ctx)
    return { ok: true, updated: true, from, to: chk && chk.version ? 'v' + chk.version : ((chk && chk.current) || ''), note: '重启 DSH 生效' }
  } catch (e) { return { ok: false, error: String(e && e.message || e) } }
}
// ===== 斜杠命令工厂（@deepseek-ai/dsh-commands 契约：CommandDefinition = {name, description, input?, recordInput?, handler(invocation)->CommandResult} =====
// ===== 参考实现 dsh-mnemon/lib/index.js:404-419（createMnemonCommand/registerCommands）与 dsh-plan-mode（agent 显式调度消息） =====
function createBiUpdateCommand(ctx) {
  return {
    name: 'bi-update',
    description: '检查并更新 BI 插件到最新版',
    handler: async () => {
      const r = await performUpdate(ctx)
      if (!r || r.ok !== true) return { kind: 'error', text: String((r && (r.error || r.hint)) || '更新失败') }
      if (!r.updated) return { kind: 'success', text: '已是最新版本 ' + (r.version ? 'v' + r.version : (r.note || '')) }
      return { kind: 'success', text: '更新完成' + (r.from ? ' ' + r.from + '→' + (r.to || '') : '') + '，' + (r.note || '重启 DSH 生效') }
    }
  }
}
function createBiCreateCommand() {
  return {
    name: 'bi-create',
    description: '用自然语言描述生成 BI 看板',
    input: { hint: '<看板描述，如：近30天各品类销售额趋势>' },
    // 提交给 agent 的用户消息本身即权威领域事件、已承载描述文本，故 recordInput:false 避免会话日志重复记录
    recordInput: false,
    handler: (invocation) => {
      const desc = String(invocation.rawInput || '').trim()
      if (!desc) return { kind: 'success', text: '用法: /bi-create <描述>，例如 /bi-create 近30天各品类销售额趋势' }
      if (invocation.signal && invocation.signal.aborted) return { kind: 'error', text: '请求已取消' }
      const agent = invocation.agent
      if (!agent || typeof agent.followup !== 'function') return { kind: 'error', text: '当前会话无法直接发起生成，请在对话框中输入该描述。' }
      try {
        agent.followup({
          role: 'user',
          content: [{ type: 'text', text: '用户通过 /bi-create 请求生成看板：' + desc + '\n请按看板生成流程处理：先用 get_meta 核对字段（销售口径需 filters order_status=1，趋势图加时间过滤），再调用 render_dashboard 生成预览，回复末尾用 dsh-ui 围栏 {"kind":"dashboard","id":"<本次 previewId>"} 展示，并询问用户是否保存到「我的看板」。' }],
          source: { kind: 'user' }
        })
      } catch (e) {
        return { kind: 'error', text: '提交失败: ' + String((e && e.message) || e) }
      }
      return { kind: 'success', text: '已提交看板生成请求：' + desc + '（模型生成中，稍候查看预览）' }
    }
  }
}
// 审计 C13 排序比较器：数值对按数值比；否则两值都可被 Date.parse 解析时按时间比；兜底 localeCompare
function cmpVal(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  const na = a === '' || a == null ? NaN : Number(a), nb = b === '' || b == null ? NaN : Number(b)
  if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb
  const sa = a == null ? '' : String(a), sb = b == null ? '' : String(b)
  if (/\d/.test(sa) && /\d/.test(sb)) { const ta = Date.parse(sa), tb = Date.parse(sb); if (!Number.isNaN(ta) && !Number.isNaN(tb)) return ta - tb }
  return sa.localeCompare(sb)
}
function aggregate(rows, chart) { const gb = chart.group_by || []; const metrics = chart.metrics || []; const groups = new Map(); for (const row of rows) { const key = gb.map(c => String(row[c] == null ? '' : row[c])).join('\u0001'); let g = groups.get(key); if (!g) { g = { gvals: gb.map(c => (row[c] == null ? '' : row[c])), sum: metrics.map(() => 0), n: metrics.map(() => 0), vn: metrics.map(() => 0), min: metrics.map(() => Infinity), max: metrics.map(() => -Infinity) }; groups.set(key, g) }; metrics.forEach((m, i) => { g.n[i] += 1; const v = Number(row[m.column]); if (Number.isFinite(v)) { g.sum[i] += v; g.vn[i] += 1; if (v < g.min[i]) g.min[i] = v; if (v > g.max[i]) g.max[i] = v } }) }; let out = []; for (const g of groups.values()) { const r = {}; gb.forEach((c, i) => { r[c] = g.gvals[i] }); metrics.forEach((m, i) => { let val; if (m.agg === 'count') val = g.n[i]; else if (m.agg === 'avg') val = g.vn[i] ? g.sum[i] / g.vn[i] : 0; else if (m.agg === 'min') val = g.vn[i] ? g.min[i] : 0; else if (m.agg === 'max') val = g.vn[i] ? g.max[i] : 0; else val = g.sum[i]; r[m.alias] = Math.round(val * 100) / 100 }); out.push(r) }; if (chart.sort && chart.sort.by) { const by = chart.sort.by, desc = chart.sort.desc !== false; out = out.sort((a, b) => { const c = cmpVal(a[by], b[by]); return desc ? -c : c }) }; if (chart.limit) out = out.slice(0, chart.limit); return out }
function buildOption(chart, rows) { if (chart.type === 'text') return { type: 'text', title: chart.title, text: chart.text || '' }; const metric = chart.metrics && chart.metrics[0]; const gb = (chart.group_by || [])[0]; if (chart.type === 'table') { const tcols = rows.length ? Object.keys(rows[0]) : []; const tl = {}; tcols.forEach(function (c2) { tl[c2] = NAME_MAP_ZH.fields[c2] || c2 }); return { type: 'table', title: chart.title, columns: tcols, columnLabels: tl, rows } } if (chart.type === 'kpi') return { type: 'kpi', title: chart.title, value: rows.length && metric ? rows[0][metric.alias] : null }; const names = rows.map(r => String(r[gb] != null ? r[gb] : '')); const vals = rows.map(r => Number(metric ? r[metric.alias] : 0)); if (chart.type === 'pie') return { type: 'pie', title: chart.title, series: [{ type: 'pie', radius: ['30%', '65%'], data: rows.map((r, i) => ({ name: names[i], value: vals[i] })) }] }; return { type: chart.type, title: chart.title, xAxis: { type: 'category', data: names, axisLabel: { rotate: 30, interval: 0 } }, yAxis: { type: 'value' }, series: [{ type: chart.type, data: vals, name: metric ? metric.alias : '' }] } }
function neededColumns(chart) { const s = new Set(); (chart.group_by || []).forEach(c => s.add(c)); (chart.metrics || []).forEach(m => m.column && s.add(m.column)); (chart.filters || []).forEach(f => f.column && s.add(f.column)); const tc = chart.time_column || (chart.granularity === 'month' ? 'order_date' : null); if (tc) s.add(tc); return Array.from(s) }
async function renderChartDef(ctx, chart, extraFilters) { if (chart.type === 'text') return { type: 'text', title: chart.title || '', text: chart.text || '' }; const payload = { table: chart.table, filters: (chart.filters || []).concat(extraFilters || []), limit: 200000 }; const cols = neededColumns(chart); if (cols.length) payload.columns = cols; const data = await getJson(ctx, 'POST', '/api/query', payload); const rows = data.rows || []
  if (chart.granularity === 'month') {
    // 审计 C13：月度聚合按图表 time_column 分组（缺省 order_date），不再硬编码 r.order_date
    const tc = chart.time_column || 'order_date'
    const mdefs = chart.metrics || []
    const daily = {}
    rows.forEach(function (r) {
      const d = r[tc] ? String(r[tc]).slice(0, 10) : ''
      if (!d) return
      if (!daily[d]) { daily[d] = {}; mdefs.forEach(function (mm) { daily[d][mm.alias] = 0 }) }
      mdefs.forEach(function (mm) {
        if (mm.agg === 'count') daily[d][mm.alias] += 1
        else { const v = Number(r[mm.column]); if (Number.isFinite(v)) daily[d][mm.alias] += v }
      })
    })
    const mb = {}
    Object.keys(daily).sort().forEach(function (d) {
      const k = d.slice(0, 7)
      if (!mb[k]) { mb[k] = {}; mdefs.forEach(function (mm) { mb[k][mm.alias] = 0 }) }
      mdefs.forEach(function (mm) { mb[k][mm.alias] += daily[d][mm.alias] })
    })
    const gk = (chart.group_by && chart.group_by[0]) || 'order_date'
    const rowsM = Object.keys(mb).sort().map(function (k) { const o = {}; o[gk] = k; mdefs.forEach(function (mm) { o[mm.alias] = Math.round(mb[k][mm.alias] * 100) / 100 }); return o })
    return { type: chart.type, title: chart.title || '', option: buildOption(chart, rowsM), rows: rowsM }
  }
  let agg = rows; if (chart.type !== 'table' || (chart.group_by && chart.group_by.length)) agg = aggregate(rows, chart); return { type: chart.type, title: chart.title || '', option: buildOption(chart, agg), rows: agg } }
// ===== 图表定义校验（审计 C12）=====
// 决策：现在就收紧校验（多指标一律拒绝并给出明确修复指引），渲染能力后补。
// 核心键一律 additionalProperties:false，杜绝拼写错误的键静默生效；
// time_column 纳入定义，供月粒度聚合与取数列使用（缺省 order_date）。
const filterItem = { type: 'object', additionalProperties: false, properties: { column: { type: 'string', required: true }, op: { type: 'string', required: true, enum: ['=', '!=', '>', '>=', '<', '<=', 'IN', 'NOT_IN', 'LIKE', 'ILIKE', 'BETWEEN', 'IS_NULL', 'IS_NOT_NULL'] }, value: { type: 'json' } } }
const metricItem = { type: 'object', additionalProperties: false, properties: { column: { type: 'string', required: true }, agg: { type: 'string', required: true, enum: ['sum', 'count', 'avg', 'min', 'max'] }, alias: { type: 'string', required: true } } }
const chartDef = { type: 'object', additionalProperties: false, properties: { type: { type: 'string', required: true, enum: ['bar', 'line', 'pie', 'table', 'text', 'kpi'] }, title: { type: 'string', required: true }, table: { type: 'string', required: true }, filters: { type: 'array', items: filterItem }, group_by: { type: 'array', items: { type: 'string' } }, metrics: { type: 'array', minItems: 1, maxItems: 1, items: metricItem }, sort: { type: 'object', additionalProperties: false, properties: { by: { type: 'string' }, desc: { type: 'boolean' } } }, limit: { type: 'integer' }, text: { type: 'string' }, granularity: { type: 'string', enum: ['day', 'month'] }, time_column: { type: 'string' } } }
const CHART_TYPES = ['bar', 'line', 'pie', 'table', 'text', 'kpi']
const CHART_KEYS = ['type', 'title', 'table', 'filters', 'group_by', 'metrics', 'sort', 'limit', 'text', 'granularity', 'time_column']
// JS 侧执行同一套约束并输出人类/模型可读的中文错误；text 图不取数，豁免 table/metrics。
function validateChartDef(def, tag) {
  const errs = []
  if (!def || typeof def !== 'object' || Array.isArray(def)) return [tag + ': 必须是对象']
  Object.keys(def).forEach(function (k) { if (CHART_KEYS.indexOf(k) < 0) errs.push(tag + ': 未知字段 "' + k + '"（允许: ' + CHART_KEYS.join(', ') + '）') })
  if (CHART_TYPES.indexOf(def.type) < 0) errs.push(tag + ': type 必须为 ' + CHART_TYPES.join('/'))
  if (!def.title || !String(def.title).trim()) errs.push(tag + ': title 必填')
  if (def.sort !== undefined && def.sort !== null) {
    if (typeof def.sort !== 'object' || Array.isArray(def.sort)) errs.push(tag + ': sort 必须是对象')
    else Object.keys(def.sort).forEach(function (k) { if (['by', 'desc'].indexOf(k) < 0) errs.push(tag + ': sort 含未知字段 "' + k + '"') })
  }
  if (def.type !== 'text') {
    if (!def.table || !String(def.table).trim()) errs.push(tag + ': table 必填（图表必须绑定数据表）')
    const ms = def.metrics
    if (!Array.isArray(ms) || ms.length === 0) errs.push(tag + ': metrics 必填，至少 1 个指标引用（{column, agg, alias}）')
    else if (ms.length > 1) errs.push(tag + ': 暂不支持多指标图表（检测到 ' + ms.length + ' 个指标，当前只允许 1 个）。请把每个指标拆成独立图表。')
    if (Array.isArray(ms)) ms.forEach(function (m, i) {
      if (!m || typeof m !== 'object') { errs.push(tag + ': metrics[' + i + '] 必须是对象'); return }
      Object.keys(m).forEach(function (k) { if (['column', 'agg', 'alias'].indexOf(k) < 0) errs.push(tag + ': metrics[' + i + '] 含未知字段 "' + k + '"') })
      if (!m.column) errs.push(tag + ': metrics[' + i + '].column 必填')
      if (['sum', 'count', 'avg', 'min', 'max'].indexOf(m.agg) < 0) errs.push(tag + ': metrics[' + i + '].agg 必须为 sum/count/avg/min/max')
      if (!m.alias) errs.push(tag + ': metrics[' + i + '].alias 必填')
    })
    if (def.filters !== undefined && !Array.isArray(def.filters)) errs.push(tag + ': filters 必须是数组')
    if (Array.isArray(def.filters)) def.filters.forEach(function (f, i) {
      if (!f || typeof f !== 'object' || !f.column || !f.op) errs.push(tag + ': filters[' + i + '] 必须含 column/op')
    })
    if (def.group_by !== undefined && (!Array.isArray(def.group_by) || def.group_by.some(function (g) { return typeof g !== 'string' || !g }))) errs.push(tag + ': group_by 必须是非空列名字符串数组')
  }
  return errs
}
function assertChartDefs(defs, prefix) {
  const all = []
  ;(defs || []).forEach(function (d, i) { const t = prefix + (i) + (d && d.title ? '「' + d.title + '」' : ''); validateChartDef(d, t).forEach(function (m) { if (all.indexOf(m) < 0) all.push(m) }) })
  if (all.length) throw new Error('图表定义校验失败：\n- ' + all.join('\n- '))
}
// ===== Store 层（审计 C1-C3）=====
// 单一 async 写队列：所有落盘经 queueStoreWrite 串行，杜绝并发 writeText 交叠出半截文件；
// 真正写盘用 temp 文件 + rename 原子替换（rename 同分区原子）。写错误抛给 RPC 调用方，不再吞掉。
// 读失败（非 ENOENT / JSON 损坏）置 storeReadonlyError：bi.getStatus 透出，且在修复前拒绝一切写入；
// 之后每次读取都重试磁盘——文件修好后标志自动解除（直到 fixed 的"fixed"由重试成功来判定）。
let storeCache = null
let storeReadonlyError = null
let storeReadInflight = null
let storeWriteChain = Promise.resolve()
function storeDefault() { return { charts: [], views: [{ id: 1, name: '全部' }] } }
function readStore() {
  if (storeCache && !storeReadonlyError) return Promise.resolve(storeCache)
  if (storeReadInflight) return storeReadInflight
  const p = readStoreFromDisk().finally(function () { storeReadInflight = null })
  storeReadInflight = p
  return p
}
async function readStoreFromDisk() {
  let txt
  try { txt = await fsp.readFile(CFG.storeFile, 'utf8') }
  catch (e) {
    if (e && e.code === 'ENOENT') { storeCache = storeDefault(); storeReadonlyError = null; return storeCache }
    storeReadonlyError = '看板存储读取失败: ' + String((e && e.message) || e)
    throw new Error(storeReadonlyError)
  }
  try { storeCache = JSON.parse(txt) }
  catch (e) {
    storeReadonlyError = '看板存储 JSON 损坏: ' + String((e && e.message) || e)
    throw new Error(storeReadonlyError)
  }
  storeReadonlyError = null
  if (storeCache.dashboards && !storeCache.charts) { const charts = []; (storeCache.dashboards || []).forEach(function (d) { (d.schema && d.schema.charts || []).forEach(function (c, i) { charts.push({ id: String(d.id) + '-' + i, title: c.title || (d.title + ' ' + (i + 1)), type: c.type, chart_def: c, view_ids: [1], created_at: d.created_at || new Date().toISOString() }) }) }); storeCache.charts = charts; storeCache.dashboards = null; await queueStoreWrite() }
  if (!storeCache.charts) storeCache.charts = []
  if (!storeCache.views) storeCache.views = [{ id: 1, name: '全部' }]
  return storeCache
}
function queueStoreWrite() { const run = storeWriteChain.then(writeStoreNow); storeWriteChain = run.then(function () {}, function () {}); return run }
async function writeStoreNow() {
  if (storeReadonlyError) throw new Error('看板存储只读: ' + storeReadonlyError + '（修复存储文件后自动恢复）')
  if (!storeCache) return
  const target = CFG.storeFile
  const tmp = target + '.tmp-' + process.pid + '-' + Date.now()
  try {
    await fsp.mkdir(dirname(target), { recursive: true })
    await fsp.writeFile(tmp, JSON.stringify(storeCache))
    await fsp.rename(tmp, target)
  } catch (e) {
    try { await fsp.unlink(tmp) } catch (e2) {}
    throw new Error('看板存储写入失败: ' + String((e && e.message) || e))
  }
}
// 快照含图表定义（title/type/chart_def），使 modify_chart 的变更可经 bi.undoLayout 回滚；
// 旧格式快照无 def 键 → undo 时跳过定义恢复，向后兼容。
function snapLayout(s) { return { layout_locked: !!s.layout_locked, charts: (s.charts || []).map(function (c) { return { id: c.id, title: c.title, type: c.type, def: c.chart_def ? JSON.parse(JSON.stringify(c.chart_def)) : null, layout: c.layout ? { w: c.layout.w, h: c.layout.h } : null, layout_locked: !!c.layout_locked } }), views: (s.views || []).map(function (v) { return { id: v.id, free_layout: !!v.free_layout, chart_pos: JSON.parse(JSON.stringify(v.chart_pos || {})), chart_locks: JSON.parse(JSON.stringify(v.chart_locks || {})) } }) } }
function pushUndo(s) { s.undo_stack = s.undo_stack || []; s.undo_stack.push({ at: Date.now(), snap: snapLayout(s) }); if (s.undo_stack.length > 40) s.undo_stack = s.undo_stack.slice(s.undo_stack.length - 40) }
// ===== latestSchema 会话缓存：LRU 封顶 ~100 条（审计 C4：原实现无界增长，长会话内存泄漏）=====
const latestSchema = new Map()
const LATEST_SCHEMA_MAX = 100
function schemaGet(k) { if (!latestSchema.has(k)) return undefined; const v = latestSchema.get(k); latestSchema.delete(k); latestSchema.set(k, v); return v }
function schemaSet(k, v) { if (latestSchema.has(k)) latestSchema.delete(k); latestSchema.set(k, v); while (latestSchema.size > LATEST_SCHEMA_MAX) { latestSchema.delete(latestSchema.keys().next().value) } }
let LAST_SCHEMA = null
const PREVIEW_MAX = 200
const PREVIEW_TTL_DAYS = 30
export default { inject: ['subprocess', 'systemPrompt', 'webServer', 'fs', 'tools', 'commands'], apply(ctx) {
  // 先确保持久化目录结构存在（fs 服务不保证建父目录，走 subprocess mkdir -p）
  const persistReady = (async function () { const sub = ctx.get('subprocess'); if (!sub) return; try { const h = sub.spawn({ argv: ['mkdir', '-p', PERSIST_DIR + '/vendor', PERSIST_DIR + '/data'], cwd: '/tmp', stdio: { stdin: 'ignore', stdout: { maxBytes: 65536 }, stderr: { maxBytes: 65536 } }, graceMs: 5000 }); await h.done } catch (e) {} })()
  cfgReady = (async function () {
    await persistReady
    const f0 = ctx.get('fs'); if (!f0) return
    const readJson = async (p) => JSON.parse(await f0.readText(await f0.resolve(p)) || '{}')
    const exists = async (p) => { try { await f0.readText(await f0.resolve(p)); return true } catch (e) { return false } }
    // 旧包遗留位置（install-to-dsh.sh 时代的 bi-dashboards-host 单包布局，与新包同装在 profile node_modules 下）
    const LEGACY_PKG = PKG_DIR + '/../bi-dashboards-host'
    // 一次性迁移：持久化目录没有 config.json 时，从旧包收编配置/看板数据（绝不覆盖已存在的持久化文件）
    if (!await exists(PERSIST_DIR + '/config.json')) {
      const merged = {}
      const isLocal = (u) => !u || /\/\/(localhost|127\.0\.0\.1)/.test(u)
      // 归档版 lib/config.json.migrated → lib/config.json → 包根 config.json；服务地址只有「非本机默认值」才收编
      for (const p of [LEGACY_PKG + '/lib/config.json.migrated', LEGACY_PKG + '/lib/config.json', LEGACY_PKG + '/config.json']) {
        let c = {}; try { c = await readJson(p) } catch (e) { continue }
        if (c.dataApi && (!isLocal(c.dataApi) || !merged.dataApi || isLocal(merged.dataApi))) merged.dataApi = c.dataApi
        if (c.statusUrl && (!isLocal(c.statusUrl) || !merged.statusUrl || isLocal(merged.statusUrl))) merged.statusUrl = c.statusUrl
        ;['vendorFile', 'storeFile', 'crawlConfigFile'].forEach(function (k) { if (typeof c[k] === 'string' && c[k]) merged[k] = c[k] })
      }
      // 旧包相对路径按新布局重写：static/vendor/echarts.min.js → vendor/echarts.min.js（其余路径原样保留，按持久化目录解析）
      if (merged.vendorFile && merged.vendorFile.indexOf('static/vendor/echarts.min.js') >= 0) merged.vendorFile = 'vendor/echarts.min.js'
      const next = Object.assign({ dataApi: CFG.dataApi, statusUrl: CFG.statusUrl, vendorFile: 'vendor/echarts.min.js', storeFile: 'data/bi-dashboards.json', crawlConfigFile: '' }, merged)
      try { await f0.writeText(await f0.resolve(PERSIST_DIR + '/config.json'), JSON.stringify(next, null, 2)); console.log('[bi] 已在 ' + PERSIST_DIR + ' 生成 config.json' + (Object.keys(merged).length ? '（含旧包迁移配置）' : '')) } catch (e) {}
      // 看板数据（旧包 data/bi-dashboards.json → 持久化目录）
      if (!await exists(PERSIST_DIR + '/data/bi-dashboards.json')) {
        try { const txt = await f0.readText(await f0.resolve(LEGACY_PKG + '/data/bi-dashboards.json')); if (txt) await f0.writeText(await f0.resolve(PERSIST_DIR + '/data/bi-dashboards.json'), txt); console.log('[bi] 看板数据已迁移至 ' + PERSIST_DIR + '/data/') } catch (e) {}
      }
    }
    // vendor echarts：持久化目录缺失 → 先迁旧包副本，再退回包内种子副本（仓库保留 static/vendor/echarts.min.js 供首次运行播种）
    if (!await exists(PERSIST_DIR + '/vendor/echarts.min.js')) {
      for (const src of [LEGACY_PKG + '/static/vendor/echarts.min.js', PKG_DIR + '/static/vendor/echarts.min.js']) {
        try { const txt = await f0.readText(await f0.resolve(src)); await f0.writeText(await f0.resolve(PERSIST_DIR + '/vendor/echarts.min.js'), txt); console.log('[bi] echarts vendor 已就位: ' + PERSIST_DIR + '/vendor/echarts.min.js'); break } catch (e) {}
      }
    }
    try { const c = await readJson(PERSIST_DIR + '/config.json'); CFG = Object.assign({}, CFG, c) }
    catch (e) {}
    ;['vendorFile', 'storeFile', 'crawlConfigFile'].forEach(function (k) { if (CFG[k] && CFG[k].charAt(0) !== '/' && CFG[k].indexOf('://') < 0) CFG[k] = PERSIST_DIR + '/' + CFG[k] })
  })()
  const ws = ctx.get('webServer'); const fsv = ctx.get('fs'); const biApi = {}; if (ws && fsv) ctx.effect(() => ws.register({ kind: 'exact', path: ECHARTS_ROUTE, handler: async (req, res) => { try { await cfgReady; const t = await fsv.resolve(CFG.vendorFile); const buf = await fsv.readBytes(t, undefined, 4 * 1024 * 1024); res.setHeader('Content-Type', 'application/javascript'); res.setHeader('Cache-Control', 'public, max-age=3600'); res.writeHead(200); res.end(buf) } catch (e) { try { res.writeHead(404); res.end('not found') } catch (e2) {} } },}))
  ctx.systemPrompt.section({ name: 'unmanned-store:dashboard-schema', order: 160, text: '【看板 Dashboard 生成】\n1. 调用 render_dashboard 生成看板（传入结构化 schema，顶层含 title/description/charts；销售必须 filters order_status=1；趋势图加时间过滤；字段来自 get_meta）。月度汇总柱状图可在图表定义里加 granularity:"month"，并用 time_column 指定日期列（缺省 order_date，Host 会按日聚合后合并为月）。每个图表 metrics 只允许 1 个指标（{column, agg, alias}），多指标需拆成多个图表；图表必须写 table。\n2. 生成后，工具结果会给出本次预览ID（previewId）。用一句话总结看板要点，并在回复【最后】追加 dsh-ui 围栏，ID 必须使用本次返回的 previewId（每个看板一个独立ID，互不覆盖）：\n```\ndsh-ui\n{"kind":"dashboard","id":"<previewId>"}\n```\n3. 然后询问用户是否保存到「我的看板」，确认后调用 save_dashboard 工具。也可以让用户直接点预览卡片里每个图表旁的「保存」按钮单独保存。' })
  const renderTool = defineTool({ name: 'render_dashboard', description: '根据 Dashboard Schema 生成可交互看板（取数→聚合→ECharts）。', parameters: { schema: { type: 'object', required: true, additionalProperties: true, properties: { title: { type: 'string' }, description: { type: 'string' }, charts: { type: 'array', items: chartDef } } } }, output: { schema: { type: 'object', additionalProperties: true }, render: (_a, v) => [{ type: 'text', text: '已生成看板「' + (v.title || '') + '」，含 ' + (v.chartCount || 0) + ' 个图表。本次预览ID: ' + (v.previewId || '') + ' —— 回复末尾的 dsh-ui 围栏必须写成 {"kind":"dashboard","id":"' + (v.previewId || '') + '"}（用上面的预览ID）。候选筛选字段: ' + ((v.filterCandidates || []).join('、') || '（无维度字段）') + ' —— 请向用户确认要用作筛选的字段；用户确认后调用 save_dashboard 时通过 filter_fields 参数传入（数组，未确认则不传）。' }] }, async execute(args, exec) { const schema = args.schema || {}; assertChartDefs(schema.charts, 'charts['); let sessionId = 'unknown'; try { sessionId = exec.agent && exec.agent.session ? exec.agent.session.id : 'unknown' } catch (e) {}; schemaSet(sessionId, schema); LAST_SCHEMA = { title: schema.title || '', description: schema.description || '', schema: schema };
        const pid = 'pv' + Date.now() + Math.random().toString(36).slice(2, 6)
        // 预览持久化失败不再静默吞掉：store 读/写错误直接抛给调用方（审计 C1 写错误传播）
        const st0 = await readStore(); st0.previews = st0.previews || {}
        st0.previews[pid] = { title: LAST_SCHEMA.title, description: LAST_SCHEMA.description, schema: schema, created_at: new Date().toISOString(), sessionId: String(sessionId) }
        st0.lastPreview = LAST_SCHEMA
        const ttlMs = PREVIEW_TTL_DAYS * 86400000; const nowMs = Date.now()
        let entries = Object.keys(st0.previews).map(function (k) { return { k: k, at: Date.parse(st0.previews[k].created_at || '') || 0 } })
        entries.sort(function (a, b) { return b.at - a.at })
        const keep = {}
        entries.forEach(function (en, i) { if (i < PREVIEW_MAX && (nowMs - en.at) <= ttlMs) keep[en.k] = st0.previews[en.k] })
        st0.previews = keep
        await queueStoreWrite()
        const filterCandidates = []; (schema.charts || []).forEach(function (c) { (c.group_by || []).forEach(function (g) { if (g && filterCandidates.indexOf(g) < 0) filterCandidates.push(g) }) })
        return { title: schema.title || '', chartCount: (schema.charts || []).length, previewId: pid, filterCandidates: filterCandidates } } })
  ctx.tools.register(renderTool)
  const saveTool = defineTool({ name: 'save_dashboard', description: '把最近生成且用户确认的看板保存到「我的看板」，每个图表作为独立项加入「全部」。', parameters: { title: { type: 'string', description: '看板名称，可选' }, filter_fields: { type: 'array', items: { type: 'string' }, description: '用户确认的筛选字段（列名数组，来自生成时的候选筛选字段）' } }, output: { schema: { type: 'object', additionalProperties: true }, render: (_a, v) => [{ type: 'text', text: '已保存 ' + (v.count || 0) + ' 个图表到我的看板。' }] }, async execute(args, exec) { let sessionId = 'unknown'; try { sessionId = exec.agent && exec.agent.session ? exec.agent.session.id : 'unknown' } catch (e) {}; const schema = schemaGet(sessionId); if (!schema || !schema.charts || !schema.charts.length) throw new Error('没有可保存的看板，请先生成看板'); assertChartDefs(schema.charts, 'charts['); const s = await readStore(); const now = new Date().toISOString(); var base = args.title || schema.title || '看板'; (schema.charts || []).forEach(function (c, i) { const ff = Array.isArray(args.filter_fields) ? args.filter_fields.filter(function (f) { return (c.group_by || []).indexOf(f) >= 0 }) : null; if (s.layout_custom) { s.charts.unshift({ id: String(Date.now()) + '-' + i, title: c.title || (base + ' ' + (i + 1)), type: c.type, chart_def: c, view_ids: [1], created_at: now, session_id: String(sessionId), filterable: ff && ff.length ? ff : undefined }) } else { s.charts.push({ id: String(Date.now()) + '-' + i, title: c.title || (base + ' ' + (i + 1)), type: c.type, chart_def: c, view_ids: [1], created_at: now, session_id: String(sessionId) }) } }); await queueStoreWrite(); return { count: (schema.charts || []).length, saved: true } } })
  ctx.tools.register(saveTool)
  biApi['bi.renderLatest'] = async (args) => {
    let src = null
    const pid = args && args.id
    if (pid) { try { const st = await readStore(); const pv = (st.previews || {})[String(pid)]; if (pv && pv.schema) src = pv } catch (e) {} }
    if (!src) { try { const st = await readStore(); if (st.lastPreview && st.lastPreview.schema) src = st.lastPreview } catch (e) {} }
    if (!src) src = LAST_SCHEMA
    if (!src) { try { const st = await readStore(); const rec = (st.dashboards || [])[0]; if (rec && rec.schema) src = { title: rec.title, description: rec.description || '', schema: rec.schema } } catch (e) {} }
    if (!src) return { error: 'none' }
    const out = []
    for (const ch of (src.schema.charts || [])) {
      const r = await renderChartDef(ctx, ch)
      const item = { type: r.type, title: r.title }
      if (r.option !== undefined) item.option = r.option
      if (r.text !== undefined) item.text = r.text
      out.push(item)
    }
    const result = { title: src.title, charts: out }
    if (pid !== undefined && pid !== null && pid !== '') result.previewId = String(pid)
    return result
  }
  biApi['bi.listPreviewIds'] = async (args) => {
    try {
      const st = await readStore(); const sid = args && args.sessionId ? String(args.sessionId) : null
      let arr = Object.keys(st.previews || {}).map(function (k) { const r = st.previews[k]; return { id: k, at: r.created_at || '', sid: r.sessionId || null } })
      if (sid !== null) { const mine = arr.filter(function (x) { return x.sid === sid }); if (mine.length > 0) arr = mine }
      arr.sort(function (a, b) { return a.at < b.at ? -1 : a.at > b.at ? 1 : 0 })
      return { ids: arr.map(function (x) { return x.id }) }
    } catch (e) { return { ids: [] } }
  }
  biApi['bi.saveChartFromPreview'] = async (args) => {
    let src = null
    const pid = args && args.id
    if (pid) { try { const st = await readStore(); const pv = (st.previews || {})[String(pid)]; if (pv && pv.schema) src = pv } catch (e) {} }
    if (!src) src = LAST_SCHEMA
    if (!src) { try { const st = await readStore(); if (st.lastPreview && st.lastPreview.schema) src = st.lastPreview } catch (e) {} }
    const idx = Number(args && args.index)
    const cd = src && src.schema && Array.isArray(src.schema.charts) ? src.schema.charts[idx] : null
    if (!cd) return { error: 'not found' }
    const cdErrs = validateChartDef(cd, '预览图表')
    if (cdErrs.length) return { error: '图表定义校验失败：\n- ' + cdErrs.join('\n- ') }
    const s = await readStore()
    const id = String(Date.now()) + '-p' + idx
    const rec = { id: id, title: cd.title || ('图表 ' + idx), type: cd.type, chart_def: cd, view_ids: [1], created_at: new Date().toISOString(), session_id: String((args && args.sessionId) || '') }
    if (s.layout_custom) { s.charts.unshift(rec) } else { s.charts.push(rec) }
    await queueStoreWrite()
    return { ok: true, id: id }
  }
  biApi['bi.duplicateChart'] = async (args) => {
    const s = await readStore()
    const c = (s.charts || []).find(function (x) { return x.id === String(args.id) })
    if (!c) return { error: 'not found' }
    const id = String(Date.now()) + '-c'
    const rec = { id: id, title: (c.title || '图表') + ' 副本', type: c.type, chart_def: JSON.parse(JSON.stringify(c.chart_def)), view_ids: (c.view_ids || [1]).slice(), created_at: new Date().toISOString(), session_id: c.session_id || '' }
    if (s.layout_custom) { s.charts.unshift(rec) } else { s.charts.push(rec) }
    await queueStoreWrite()
    return { ok: true, id: id }
  }
  biApi['bi.setupChartModificationBranch'] = async (args) => {
    const sid = String(args && args.sessionId || '')
    if (!sid) return { error: 'sessionId 缺失' }
    const title = String((args && args.chartTitle) || '图表').slice(0, 40)
    const change = String((args && args.change) || '')
    const msg = '用户请求修改图表「' + title + '」（id: ' + String(args && args.chartId || '') + '，类型: ' + String(args && args.chartType || '') + '）' + (change ? '：' + change : '。请先询问用户想如何修改（指标/维度/时间范围/图表类型等），确认后用 modify_chart 工具保存新定义。')
    const agents = ctx.get('agents'); const sessions = ctx.get('sessions'); const titleSvc = ctx.get('sessionTitle')
    if (agents) {
      let agent = null
      for (let i = 0; i < 10 && !agent; i++) {
        agent = agents.get(sid)
        if (!agent) { try { await ctx.get('timer').timeout(400) } catch (e) { break } }
      }
      if (agent) {
        try { agent.followup({ role: 'user', content: [{ type: 'text', text: msg }], source: { kind: 'user' } }) } catch (e) { return { error: String(e) } }
      } else { return { error: 'agent not ready' } }
    }
    if (titleSvc && sessions) {
      try { const sess = sessions.get(sid); if (sess) titleSvc.rename(sess, '修改图表「' + title + '」') } catch (e) {}
    }
    return { ok: true }
  }
  biApi['bi.listViews'] = async (args) => { const s = await readStore(); return (s.views || []).map(function (v) { var cnt = (s.charts || []).filter(function (c) { return (c.view_ids || []).indexOf(v.id) >= 0 }).length; return { id: v.id, name: v.name, count: cnt } }) }
  biApi['bi.createView'] = async (args) => { const s = await readStore(); if (!args.name || !String(args.name).trim()) return { error: '视图名不能为空' }; const id = Date.now(); s.views.push({ id, name: String(args.name).trim(), created_at: new Date().toISOString() }); await queueStoreWrite(); return { id, name: String(args.name).trim() } }
  biApi['bi.renameView'] = async (args) => { const s = await readStore(); const v = (s.views || []).find(function (x) { return x.id === Number(args.id) }); if (!v) return { error: '视图不存在' }; if (v.id === 1) return { error: '「全部」视图不能重命名' }; v.name = String(args.name || v.name); await queueStoreWrite(); return { id: v.id, name: v.name } }
  biApi['bi.deleteView'] = async (args) => { const s = await readStore(); const v = (s.views || []).find(function (x) { return x.id === Number(args.id) }); if (!v) return { error: '视图不存在' }; if (v.id === 1) return { error: '「全部」视图不能删除' }; s.views = (s.views || []).filter(function (x) { return x.id !== Number(args.id) }); (s.charts || []).forEach(function (c) { if (c.view_ids) c.view_ids = c.view_ids.filter(function (vid) { return vid !== Number(args.id) }) }); await queueStoreWrite(); return { ok: true } }
  biApi['bi.listCharts'] = async (args) => { const s = await readStore(); const viewId = args && args.viewId ? Number(args.viewId) : 1; const view = (s.views || []).find(function (v) { return v.id === viewId }); return { filters: (view && view.filters) || [], free_layout: viewId === 1 ? false : !!(view && view.free_layout), chart_pos: (view && view.chart_pos) || {}, layout_locked: !!s.layout_locked, charts: (s.charts || []).filter(function (c) { return viewId === 1 || (c.view_ids || []).indexOf(viewId) >= 0 }).slice().sort(function (a, b) { return s.layout_custom ? 0 : (b.created_at || '').localeCompare(a.created_at || '') }).map(function (c) { const defL = c.type === 'kpi' ? { w: 3, h: 1 } : { w: 6, h: 2 }; return { id: c.id, title: c.title, type: c.type, created_at: c.created_at, view_ids: c.view_ids || [1], session_id: c.session_id || '', table: c.chart_def ? c.chart_def.table : undefined, filterable: ((c.filterable && c.filterable.length) ? c.filterable : (function () { const cd = c.chart_def || {}; const cols = []; (cd.group_by || []).forEach(function (g2) { if (g2 && cols.indexOf(g2) < 0) cols.push(g2) }); (cd.metrics || []).forEach(function (m2) { if (m2 && m2.column && cols.indexOf(m2.column) < 0) cols.push(m2.column) }); return cols.slice(0, 8) })()).map(function (f) { return { column: f, label: NAME_MAP_ZH.fields[f] || f } }), user_filter: c.user_filter || null, layout: c.layout || defL, layout_locked: !!c.layout_locked, locked: ((view && view.chart_locks) || {})[c.id] } }) } }
  biApi['bi.setChartFilter'] = async (args) => {
    const s = await readStore()
    const c = (s.charts || []).find(function (x) { return x.id === String(args && args.id) })
    if (!c) return { error: 'not found' }
    const f = args && args.filter
    const OPS = ['=', '!=', '>', '>=', '<', '<=', 'LIKE', 'BETWEEN', 'IS_NULL', 'IS_NOT_NULL']
    if (f && f.column && (OPS.indexOf(f.op) >= 0 && (f.op === 'IS_NULL' || f.op === 'IS_NOT_NULL' || f.op === 'BETWEEN' || (f.value !== undefined && f.value !== '')))) c.user_filter = { column: String(f.column), op: f.op, value: f.value }
    else c.user_filter = null
    await queueStoreWrite()
    return { ok: true, id: c.id, user_filter: c.user_filter }
  }
  biApi['bi.getFilterValues'] = async (args) => {
    if (!args || !args.table || !args.column) return { error: 'table/column 必填', values: [] }
    const table = String(args.table), col = String(args.column)
    const nullProbe = async () => { try { const nul = await getJson(ctx, 'POST', '/api/query', { table: table, columns: [col], filters: [{ column: col, op: 'IS_NULL' }], limit: 1 }); return (nul.rows || []).length > 0 } catch (e) { return false } }
    // 审计 C14：优先走后端契约端点 GET /api/query/{table}/distinct/{column}?limit=100 -> {"values":[...]}
    // （去重下沉到 DB，不再拉 20 万行回来在 JS 里去重）
    try {
      const data = await getJson(ctx, 'GET', '/api/query/' + encodeURIComponent(table) + '/distinct/' + encodeURIComponent(col) + '?limit=100')
      if (data && Array.isArray(data.values)) {
        const vals = data.values.filter(function (v) { return v !== null && v !== undefined && v !== '' })
        return { values: vals.slice(0, 100), has_empty: await nullProbe() }
      }
    } catch (e) {
      if (e && e.status !== 404) return { error: String((e && e.message) || e), values: [] }
      // 404 = 旧版数据服务没有 distinct 端点 → 落回下方旧路径
    }
    // DEPRECATED 兜底（仅当数据服务尚未提供 distinct 端点时触发）：全量拉列在 JS 去重——
    // 重查询，数据服务全面铺开 distinct 后应删除此分支。
    try {
      const data = await getJson(ctx, 'POST', '/api/query', { table: table, columns: [col], limit: 200000 })
      const seen = new Map()
      for (const r of (data.rows || [])) { const v = r[col]; if (v === null || v === undefined || v === '') continue; const k = String(v); if (!seen.has(k)) seen.set(k, v) }
      return { values: Array.from(seen.values()).slice(0, 100), has_empty: await nullProbe() }
    } catch (e) { return { error: String((e && e.message) || e), values: [] } }
  }
  biApi['bi.setViewFilter'] = async (args) => {
    const s = await readStore()
    const view = (s.views || []).find(function (v) { return v.id === Number(args && args.viewId) })
    if (!view) return { error: 'view not found' }
    if (!view.filters) view.filters = []
    const column = String((args && args.column) || '')
    const op = (args && args.op) || '='
    const value = args && args.value
    view.filters = view.filters.filter(function (f) { return f.column !== column })
    const valueless = op === 'IS_NULL' || op === 'IS_NOT_NULL'
    const hasVal = value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && !value.length)
    if (column && (valueless || hasVal)) view.filters.push({ column: column, op: valueless ? op : (op || '='), value: valueless ? undefined : value })
    await queueStoreWrite()
    return { ok: true, viewId: view.id, filters: view.filters }
  }
  biApi['bi.getChart'] = async (args) => { const s = await readStore(); const c = (s.charts || []).find(function (x) { return x.id === args.id }); if (!c) return { error: 'not found' }; const extras = []
    const uf = c.user_filter
    if (uf && uf.column) { const uv = String(uf.value === undefined || uf.value === null ? '' : uf.value); const uop = uv.startsWith('\u0000!') ? '!=' : (uf.op || '='); extras.push({ column: uf.column, op: uop, value: uop === '!=' ? uv.slice(2) : uf.value }) }
    const exs = (args && args.extras) || (args && args.extra ? [args.extra] : [])
    exs.forEach(function (e) { if (!e || !e.column) return; const ev = String(e.value === undefined || e.value === null ? '' : e.value); const eop = ev.startsWith('\u0000!') ? '!=' : (e.op || '='); extras.push({ column: e.column, op: eop, value: eop === '!=' ? ev.slice(2) : e.value }) }); const rendered = await renderChartDef(ctx, c.chart_def, extras); rendered.id = c.id; rendered.user_filter = c.user_filter || null
    rendered.filterable = (c.filterable && c.filterable.length) ? c.filterable : (function () { const cd = c.chart_def || {}; const cols = []; (cd.group_by || []).forEach(function (g2) { if (g2 && cols.indexOf(g2) < 0) cols.push(g2) }); (cd.metrics || []).forEach(function (m2) { if (m2 && m2.column && cols.indexOf(m2.column) < 0) cols.push(m2.column) }); return cols.slice(0, 8) })().map(function (f) { return { column: f, label: NAME_MAP_ZH.fields[f] || f } })
    rendered.table = c.chart_def ? c.chart_def.table : undefined
    return rendered }
  biApi['bi.deleteChart'] = async (args) => { const s = await readStore(); const id = String(args.id); const viewId = Number(args.viewId || 1); const c = (s.charts || []).find(function (x) { return x.id === id }); if (!c) return { error: 'not found' }; if (viewId === 1) { s.charts = (s.charts || []).filter(function (x) { return x.id !== id }) } else { if (c.view_ids) c.view_ids = c.view_ids.filter(function (v) { return v !== viewId }) }; await queueStoreWrite(); return { ok: true } }
  biApi['bi.addChartToView'] = async (args) => { const s = await readStore(); const c = (s.charts || []).find(function (x) { return x.id === String(args.chartId) }); if (!c) return { error: 'not found' }; if (!c.view_ids) c.view_ids = [1]; if (c.view_ids.indexOf(Number(args.viewId)) < 0) c.view_ids.push(Number(args.viewId)); await queueStoreWrite(); return { ok: true } }
  biApi['bi.getStatus'] = async (args) => {
    await cfgReady
    const out = {}
    // 审计 C3：store 读失败置的只读标志透出，前端可据此提示"看板数据只读（存储损坏）"
    if (storeReadonlyError) { out.store_readonly = true; out.store_readonly_error = storeReadonlyError }
    let sync = null
    if (CFG.statusUrl) {
      let st = null
      try { const t = await callApi(ctx, 'GET', CFG.statusUrl + '/status.json', undefined, 5000); const j = JSON.parse(t); if (j && typeof j === 'object' && ('running' in j || 'end_time' in j)) st = j } catch (e) {}
      if (st) {
        // 倒计时环：优先从爬虫配置取 interval/last_run；crawlConfigFile 为空（如数据主机部署）
        // 时回退到默认 15 分钟 + status.json 的 end_time 推算 next_run_at，保证任意部署都能画出倒计时弧。
        try {
          let interval = 15
          let last = null
          if (CFG.crawlConfigFile) {
            try {
              const cfg = JSON.parse(await fsp.readFile(CFG.crawlConfigFile, 'utf8'))
              const pc = (cfg.pipelines || {}).cloud || {}
              interval = Math.max(1, parseInt(pc.interval_minutes, 10) || 15)
              last = (cfg.last_run || {}).cloud || null
            } catch (e2) {}
          }
          if (!last) last = st.end_time || null
          if (last) { st.next_run_at = new Date(new Date(last).getTime() + interval * 60000).toISOString() }
          st.crawl_interval_minutes = interval
        } catch (e) {}
        try { const iv = ((st.crawl_interval_minutes || 15) * 2) * 60000; const end = st.end_time ? new Date(st.end_time).getTime() : 0; if (!end || Date.now() - end > iv) st.stale = true } catch (e) {}
        sync = st
      }
    }
    out.sync = sync
    if (sync) { Object.assign(out, sync); out.offline = false } else { out.offline = true }
    return out
  }
  biApi['bi.triggerSync'] = async (args) => await forwardStatusPost('/run')
  biApi['bi.update.check'] = async (args) => { try { return await updateCheckState(ctx) } catch (e) { return { repo: true, error: String(e && e.message || e) } } }
  // 「一键更新」委托共享内部函数 performUpdate（/bi-update 命令走同一条路径，行为完全一致）
  biApi['bi.update.run'] = async (args) => await performUpdate(ctx)
  biApi['bi.reorderViews'] = async (args) => { const s = await readStore(); const ids = (args.ids || []).map(Number); if (!ids.length) return { error: 'ids 不能为空' }; const byId = {}; (s.views || []).forEach(function (v) { byId[v.id] = v }); const reordered = []; ids.forEach(function (id) { if (byId[id]) { reordered.push(byId[id]); delete byId[id] } }); Object.keys(byId).forEach(function (id) { reordered.push(byId[id]) }); s.views = reordered; await queueStoreWrite(); return { ok: true } }
  const metaTool = defineTool({ name: 'get_meta', description: '获取无人超市数据库数据字典。', parameters: { subject: { type: 'string', enum: ['tables', 'relationships', 'columns'] }, table: { type: 'string' } }, output: { schema: { type: 'object', additionalProperties: true }, render: (_a, v) => [{ type: 'text', text: JSON.stringify(v, null, 2) }] }, async execute(args, exec) { const subject = args.subject || 'tables'; if (subject === 'relationships') return await getJson(ctx, 'GET', '/api/meta/relationships'); if (subject === 'columns') { if (!args.table) throw new Error('需要 table'); return await getJson(ctx, 'GET', '/api/meta/table/' + encodeURIComponent(args.table)) } return await getJson(ctx, 'GET', '/api/meta/tables') } })
  ctx.tools.register(metaTool)
  const queryTool = defineTool({ name: 'query_data', description: '查询无人超市数据库原始数据。', parameters: { table: { type: 'string', required: true }, columns: { type: 'array', items: { type: 'string' } }, filters: { type: 'array', items: filterItem }, order_by: { type: 'array', items: { type: 'object', additionalProperties: true, properties: { column: { type: 'string', required: true }, desc: { type: 'boolean' } } } }, limit: { type: 'integer' }, offset: { type: 'integer' } }, output: { schema: { type: 'object', additionalProperties: true }, render: (_a, v) => [{ type: 'text', text: JSON.stringify(v, null, 2) }] }, async execute(args, exec) { if (!args.table) throw new Error('需要 table 参数'); const payload = { table: args.table }; if (args.columns) payload.columns = args.columns; if (args.filters) payload.filters = args.filters; if (args.order_by) payload.order_by = args.order_by; payload.limit = args.limit || 20; payload.offset = args.offset || 0; return await getJson(ctx, 'POST', '/api/query', payload) } })
  ctx.tools.register(queryTool)
  const modifyTool = defineTool({
    name: 'modify_chart',
    description: '修改「我的看板」中已保存图表的定义（指标/维度/时间范围/图表类型等）。',
    parameters: { id: { type: 'string', required: true, description: '要修改的图表 id' }, chart_def: chartDef },
    output: { schema: { type: 'object', additionalProperties: true }, render: (_a, v) => [{ type: 'text', text: '已修改图表「' + (v.title || '') + '」(' + (v.type || '') + ')。' }] },
    async execute(args, exec) {
      const s = await readStore()
      const c = (s.charts || []).find(function (x) { return x.id === String(args.id) })
      if (!c) throw new Error('图表不存在: ' + args.id)
      const def = args.chart_def || {}
      const verrs = validateChartDef(def, 'chart_def')
      if (verrs.length) throw new Error('图表定义校验失败：\n- ' + verrs.join('\n- '))
      // 审计 C15：变更前先压入含图表定义的完整快照，bi.undoLayout 可回滚
      pushUndo(s)
      c.chart_def = def
      c.title = def.title
      c.type = def.type
      await queueStoreWrite()
      return { ok: true, id: c.id, title: def.title, type: def.type }
    }
  })
  ctx.tools.register(modifyTool)
  // 斜杠命令注册（@deepseek-ai/dsh-commands：ctx.commands.register，宿主全局，客户端 / 菜单自动出现）
  // 用 ctx.effect 持有 register 返回的 disposer，插件卸载时反注册（dsh-mnemon/plan-mode 同款）
  ctx.effect(() => ctx.commands.register(createBiUpdateCommand(ctx)))
  ctx.effect(() => ctx.commands.register(createBiCreateCommand()))
  // 登录/飞书同步触发：主机侧本地冷却时间戳已删除（多实例/重启会绕过冷却，且与 8080 的
  // _inflight 状态机双轨冲突）。防重入完全交给 8080：忙时它返回 {"busy":true}/409，这里原样透传给客户端。
  biApi['bi.triggerLogin'] = async (args) => await forwardStatusPost('/runlogin')
  biApi['bi.triggerFeishuSync'] = async (args) => await forwardStatusPost('/runfeishu')
  biApi['bi.setChartLayout'] = async (args) => {
    const s = await readStore()
    const c = (s.charts || []).find(function (x) { return x.id === String(args && args.id) })
    if (!c) return { error: 'not found' }
    pushUndo(s)
    const w = Math.max(1, Math.min(12, parseInt(args && args.w, 10) || 6))
    const h = Math.max(1, Math.min(6, parseInt(args && args.h, 10) || 2))
    c.layout = { w: w, h: h }
    s.layout_custom = true
    await queueStoreWrite()
    return { ok: true, id: c.id, layout: c.layout }
  }
  biApi['bi.setChartLayoutLock'] = async (args) => {
    const s = await readStore()
    const c = (s.charts || []).find(function (x) { return x.id === String(args && args.id) })
    if (!c) return { error: 'not found' }
    pushUndo(s)
    c.layout_locked = !!args.locked
    await queueStoreWrite()
    return { ok: true, id: c.id, layout_locked: c.layout_locked }
  }
  biApi['bi.setLayoutLock'] = async (args) => {
    const s = await readStore()
    pushUndo(s)
    const v = !!args.locked
    s.layout_locked = v
    ;(s.views || []).forEach(function (view) {
      if (!view.chart_locks) view.chart_locks = {}
      ;(s.charts || []).forEach(function (c) {
        if ((c.view_ids || [1]).indexOf(view.id) >= 0) view.chart_locks[c.id] = v
      })
    })
    await queueStoreWrite()
    return { ok: true, layout_locked: s.layout_locked }
  }
  biApi['bi.reorderCharts'] = async (args) => {
    const s = await readStore()
    const ids = (args && args.ids || []).map(String)
    if (!ids.length) return { error: 'ids 必填' }
    pushUndo(s)
    const byId = {}; (s.charts || []).forEach(function (c) { byId[c.id] = c })
    const head = []; const rest = []
    ids.forEach(function (id) { if (byId[id]) { head.push(byId[id]); delete byId[id] } })
    Object.keys(byId).forEach(function (k) { rest.push(byId[k]) })
    s.charts = head.concat(rest)
    s.layout_custom = true
    await queueStoreWrite()
    return { ok: true, order: s.charts.map(function (c) { return c.id }) }
  }
  biApi['bi.setFreeLayout'] = async (args) => {
    const s = await readStore()
    const viewId = Number(args && args.viewId)
    if (viewId === 1) return { error: '「全部」视图保持三列式，不支持自由布局' }
    const view = (s.views || []).find(function (v) { return v.id === viewId })
    if (!view) return { error: 'view not found' }
    pushUndo(s)
    view.free_layout = !!args.enabled
    if (!args.enabled) view.chart_pos = {}
    else if (args.posMap && typeof args.posMap === 'object') {
      const clean = {}
      Object.keys(args.posMap).forEach(function (k) { const p = args.posMap[k] || {}; clean[String(k)] = { x: Math.max(0, Math.round(p.x || 0)), y: Math.max(0, Math.round(p.y || 0)), w: Math.max(120, Math.round(p.w || 300)), h: Math.max(80, Math.round(p.h || 200)) } })
      if (Object.keys(clean).length) view.chart_pos = clean
    }
    await queueStoreWrite()
    return { ok: true, viewId: viewId, free_layout: view.free_layout }
  }
  biApi['bi.setChartPos'] = async (args) => {
    const s = await readStore()
    const viewId = Number(args && args.viewId)
    if (viewId === 1) return { error: '「全部」视图保持三列式' }
    const view = (s.views || []).find(function (v) { return v.id === viewId })
    if (!view) return { error: 'view not found' }
    pushUndo(s)
    if (!view.chart_pos) view.chart_pos = {}
    const pos = args && args.pos || {}
    view.chart_pos[String(args.chartId)] = { x: Math.max(0, Math.round(pos.x || 0)), y: Math.max(0, Math.round(pos.y || 0)), w: Math.max(80, Math.round(pos.w || 300)), h: Math.max(60, Math.round(pos.h || 240)) }
    view.free_layout = true
    await queueStoreWrite()
    return { ok: true, pos: view.chart_pos[String(args.chartId)] }
  }
  biApi['bi.clearChartPos'] = async (args) => {
    const s = await readStore()
    const view = (s.views || []).find(function (v) { return v.id === Number(args && args.viewId) })
    if (!view) return { error: 'view not found' }
    const id = String(args && args.chartId)
    if (!view.chart_pos || !view.chart_pos[id]) return { ok: true, cleared: false }
    pushUndo(s)
    delete view.chart_pos[id]
    await queueStoreWrite()
    return { ok: true, cleared: true }
  }
  biApi['bi.setChartLockToggle'] = async (args) => {
    const s = await readStore()
    const view = (s.views || []).find(function (v) { return v.id === Number(args && args.viewId) })
    if (!view) return { error: 'view not found' }
    pushUndo(s)
    if (!view.chart_locks) view.chart_locks = {}
    const id = String(args && args.chartId)
    view.chart_locks[id] = args && args.locked !== undefined ? !!args.locked : !view.chart_locks[id]
    await queueStoreWrite()
    return { ok: true, chartId: id, locked: view.chart_locks[id] }
  }
  biApi['bi.resetViewLayout'] = async (args) => {
    const s = await readStore()
    const view = (s.views || []).find(function (v) { return v.id === Number(args && args.viewId) })
    if (!view) return { error: 'view not found' }
    pushUndo(s)
    view.free_layout = false
    view.chart_pos = {}
    view.chart_locks = {}
    s.charts = (s.charts || []).slice().sort(function (a, b) { return String(b.created_at || '').localeCompare(String(a.created_at || '')) })
    await queueStoreWrite()
    return { ok: true, viewId: view.id, free_layout: false }
  }
  biApi['bi.undoLayout'] = async (args) => {
    const s = await readStore()
    const stack = s.undo_stack || []
    if (!stack.length) return { ok: false, reason: '没有可撤销的布局操作' }
    const entry = stack[stack.length - 1]
    const snap = entry && entry.snap
    if (!snap) return { ok: false, reason: '快照损坏' }
    s.undo_stack = stack.slice(0, -1)
    s.layout_locked = !!snap.layout_locked
    const byId = {}; (s.charts || []).forEach(function (c) { byId[c.id] = c })
    const ordered = []
    ;(snap.charts || []).forEach(function (cc) { const c = byId[cc.id]; if (!c) return; if (cc.layout) c.layout = { w: cc.layout.w, h: cc.layout.h }; else delete c.layout; c.layout_locked = !!cc.layout_locked; if (cc.def != null) { c.chart_def = JSON.parse(JSON.stringify(cc.def)); if (cc.title != null) c.title = cc.title; if (cc.type) c.type = cc.type } ordered.push(c); delete byId[cc.id] })
    Object.keys(byId).forEach(function (k) { ordered.push(byId[k]) })
    s.charts = ordered
    ;(snap.views || []).forEach(function (vv) { const v = (s.views || []).find(function (x) { return x.id === vv.id }); if (!v) return; v.free_layout = !!vv.free_layout; v.chart_pos = JSON.parse(JSON.stringify(vv.chart_pos || {})); v.chart_locks = JSON.parse(JSON.stringify(vv.chart_locks || {})) })
    await queueStoreWrite()
    return { ok: true, undoneAt: entry.at }
  }
  biApi['bi.getTableConfig'] = async (args) => {
    let tables = []
    let unreachable = false
    let lastErr = ''
    try { const r = await getJson(ctx, 'GET', '/api/settings/tables', undefined, 8000); tables = (r.tables || []).map(function (t) { const m = NAME_MAP_ZH.tables[t.table]; return m ? Object.assign({}, t, { title: t.title || m.zh, description: t.description || m.desc }) : t }) } catch (e) { unreachable = true; lastErr = String(e.message || e).slice(0, 120) }
    let pipelines = {}
    try { const cfg = JSON.parse(await fsp.readFile(CFG.crawlConfigFile, 'utf8')); pipelines = cfg.pipelines || {} } catch (e) { pipelines = {} }
    return { tables: tables, pipelines: unreachable ? {} : pipelines, unreachable: unreachable, error: unreachable ? ('数据服务不可达：' + lastErr) : undefined }
  }
  biApi['bi.setTableAccess'] = async (args) => {
    if (!args || !args.table) return { error: 'table 必填' }
    return await getJson(ctx, 'POST', '/api/settings/tables', { table: String(args.table), accessible: !!args.accessible }, 8000)
  }
  // 管道固定白名单（与设置页 saveFreq 的 targets 一致）：任意字符串管道名会往共享爬虫配置里
  // 注入垃圾键，下游 Crawler 不可控——超出白名单一律拒绝。
  const CRAWL_PIPELINES = ['cloud', 'shelf', 'standard_qty', 'procurement']
  biApi['bi.setCrawlFrequency'] = async (args) => {
    if (!args || !args.pipeline) return { error: 'pipeline 必填' }
    const pipeline = String(args.pipeline)
    if (CRAWL_PIPELINES.indexOf(pipeline) < 0) return { error: '未知管道: ' + pipeline + '（允许: ' + CRAWL_PIPELINES.join(', ') + '）' }
    if (!CFG.crawlConfigFile) return { error: '未配置爬虫（crawlConfigFile 为空，仅数据浏览可用）' }
    const minutes = Math.max(1, parseInt(args.minutes, 10) || 15)
    // 审计 C10：旧实现读失败 → cfg={} 照常写盘，等于把损坏/未知的爬虫配置直接抹掉重置。
    // 现在读/解析失败一律拒绝写入并返回错误（配置归 Crawler 侧所有，宁可不动）。
    let raw = ''
    try { raw = await fsp.readFile(CFG.crawlConfigFile, 'utf8') } catch (e) { return { error: '爬虫配置读取失败，已拒绝写入: ' + String((e && e.message) || e) } }
    let cfg = {}
    try { cfg = JSON.parse(raw || '{}') } catch (e) { return { error: '爬虫配置 JSON 损坏，已拒绝写入: ' + String((e && e.message) || e) } }
    if (!cfg.pipelines || typeof cfg.pipelines !== 'object') cfg.pipelines = {}
    if (!cfg.pipelines[pipeline] || typeof cfg.pipelines[pipeline] !== 'object') cfg.pipelines[pipeline] = {}
    cfg.pipelines[pipeline].interval_minutes = minutes
    // 原子写：先留 .bak（覆盖为改动前的原文），再 temp+rename 替换主文件
    try {
      await fsp.writeFile(CFG.crawlConfigFile + '.bak', raw)
      const tmp = CFG.crawlConfigFile + '.tmp-' + process.pid + '-' + Date.now()
      try { await fsp.writeFile(tmp, JSON.stringify(cfg, null, 2)); await fsp.rename(tmp, CFG.crawlConfigFile) }
      catch (e) { try { await fsp.unlink(tmp) } catch (e2) {}; throw e }
    } catch (e) { return { error: '爬虫配置写入失败: ' + String((e && e.message) || e) } }
    return { ok: true, pipeline: pipeline, interval_minutes: minutes }
  }
  biApi['bi.getConfig'] = async () => { await cfgReady; return { dataApi: CFG.dataApi, statusUrl: CFG.statusUrl } }
  biApi['bi.setConfig'] = async (args) => {
    args = args || {}
    const upd = {}
    const normUrl = (raw, defPort) => { let v = String(raw).trim().replace(/\/+$/, ''); if (!/^https?:\/\//i.test(v)) v = 'http://' + v; try { if (!new URL(v).port) v = v + ':' + defPort } catch (e) { return null } return v }
    if (args.dataApi !== undefined) { const v = normUrl(args.dataApi, 8600); if (!v) return { error: '数据服务地址格式无效' }; upd.dataApi = v }
    if (args.statusUrl !== undefined) { const v = normUrl(args.statusUrl, 8080); if (!v) return { error: '状态服务地址格式无效' }; upd.statusUrl = v }
    if (!Object.keys(upd).length) return { error: '无变更' }
    await cfgReady
    Object.assign(CFG, upd)
    try { const f0 = ctx.get('fs'); if (f0) { const t = await f0.resolve(PERSIST_DIR + '/config.json'); let cur = {}; try { cur = JSON.parse(await f0.readText(t) || '{}') } catch (e) {}
      const toRel = (v) => (v && v.indexOf(PERSIST_DIR + '/') === 0) ? v.slice(PERSIST_DIR.length + 1) : (v || '')
      const next = Object.assign({}, cur, upd, { vendorFile: toRel(CFG.vendorFile), storeFile: toRel(CFG.storeFile), crawlConfigFile: toRel(CFG.crawlConfigFile) })
      await f0.writeText(t, JSON.stringify(next, null, 2)) } } catch (e) {}
    return { ok: true, dataApi: CFG.dataApi, statusUrl: CFG.statusUrl }
  }
  biApi['bi.testConnection'] = async (args) => {
    const raw = String((args && args.url) || '').trim().replace(/\/+$/, '')
    if (!/^https?:\/\//.test(raw)) return { ok: false, error: '地址需以 http:// 或 https:// 开头' }
    try { const r = await fetch(toIpv4Localhost(raw + '/api/meta/tables'), { signal: AbortSignal.timeout(5000) }); if (!r.ok) return { ok: false, error: 'HTTP ' + r.status }; const j = await r.json(); return { ok: true, tables: (j.tables || []).length } } catch (e) { return { ok: false, error: String((e && e.message) || e).slice(0, 200) } }
  }
  biApi['bi.testStatus'] = async (args) => {
    const raw = String((args && args.url) || '').trim().replace(/\/+$/, '')
    if (!/^https?:\/\//.test(raw)) return { ok: false, error: '地址需以 http:// 或 https:// 开头' }
    const t0 = Date.now()
    try { const r = await fetch(toIpv4Localhost(raw + '/status.json'), { signal: AbortSignal.timeout(5000) }); if (!r.ok) return { ok: false, error: 'HTTP ' + r.status }; const j = await r.json(); return { ok: true, ms: Date.now() - t0, running: !!(j && j.running) } } catch (e) { return { ok: false, error: String((e && e.message) || e).slice(0, 200) } }
  }
  // 5s 轮询只打轻量 GET /health（契约：{"status":"ok"}，DB-pinging）。
  // 不再打 /api/meta/tables——重查询被高频轮询拖垮数据服务是审计 C7 的根因。
  biApi['bi.ping'] = async () => {
    await cfgReady
    const t0 = Date.now()
    const url = String(CFG.dataApi || '').trim().replace(/\/+$/, '')
    if (!url) return { ok: false, error: '未配置数据主机地址', ms: Date.now() - t0 }
    try { const r = await fetch(toIpv4Localhost(url + '/health'), { signal: AbortSignal.timeout(4000) }); if (!r.ok) return { ok: false, error: 'HTTP ' + r.status, ms: Date.now() - t0 }; let j = null; try { j = await r.json() } catch (e) {}; if (j && j.status && j.status !== 'ok') return { ok: false, error: 'unhealthy: ' + String(j.status), ms: Date.now() - t0 }; return { ok: true, ms: Date.now() - t0 } } catch (e) { return { ok: false, error: String((e && e.message) || e).slice(0, 200), ms: Date.now() - t0 } }
  }
  console.log('[bi] Phase5 Host 已加载 (static v1)')
  if (ws) ctx.effect(() => ws.register({ kind: 'exact', path: '/bi/api', handler: async (req, res) => {
    await cfgReady
    if (req.method !== 'POST') { res.writeHead(405, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'method not allowed' })); return }
    // 体积上限 1MB：在流式读取过程中按字节计数，超限立即断流返回 413（不允许先累积后检查）
    const MAX_BODY_BYTES = 1024 * 1024
    const chunks = []
    let received = 0
    let tooLarge = false
    try { for await (const chunk of req) { received += chunk.length; if (received > MAX_BODY_BYTES) { tooLarge = true; break } chunks.push(chunk) } } catch (e) {}
    if (tooLarge) { res.writeHead(413, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'request body too large (>1MB)' })); return }
    const body = Buffer.concat(chunks).toString('utf8')
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
} }