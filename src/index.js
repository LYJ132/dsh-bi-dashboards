// 无人超市 AI BI 插件 — Host 半部（全局静态化 v1：由动态插件 v20 适配而来）
import { defineTool } from '@deepseek-ai/dsh-tools'
import { existsSync, readFileSync, realpathSync, promises as fsp } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
// 表达式求值 / join 合并 / JS 行过滤纯函数层（esbuild 打包时并入 lib/index.js）
import { EXPR_IDENT, parseExpr, exprCols, colAccessor, metricAccessor, evalKeysIfExpr, mergeJoinRows, normalizeJoins, applyJsFilters, resolveFilters, currentNow, setNowProvider, resolveRelToken, havingFilters, applyHaving, jsFilterMatch, filtersUseRelTokens } from './bi-expr.js'
// 能力契约单一事实源（R4 P2-5）：图型/上限/枚举常量与 systemPrompt 事实句全部由此渲染，
// 手写文本与生成事实的分歧由 scripts/verify-capability-guard.mjs 在 build/verify 路径 loudly 报错
import { CHART_TYPES, METRIC_CAPS, AGG_ENUM, JOIN_MAX_LEVELS, describeCapabilities, capabilityFacts, dashboardSchemaSection } from './bi-capabilities.js'
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
// ===== 插件自更新（双形态统一入口）：git 仓库安装（含 node_modules 符号链接指向 git 仓库的形态，
// realpath 解析后识别）走 git fetch / pull --ff-only + node scripts/build.mjs；
// 快照安装（非 git）走压缩包自更新：Gitee 主通道 repository/archive/master.tar.gz → GitHub 备通道
// codeload tar.gz，解压后仅按 package.json 'files' 清单（+ cordis.patch.yml）覆盖本插件安装目录，
// 不再依赖 dsh CLI（v1.3：dsh 在宿主 PATH 缺 nvm 路径时 spawn 即 ENOENT，已从快照主通道移除） =====
// 红线：git 形态只做 ff-only 拉取与构建；快照形态只做「清单内文件覆盖」——绝不删除/触碰清单外任何文件，
// 绝不跑 reset/checkout/clean 等破坏性命令，绝不触碰 ~/.dsh/bi-dashboards/（用户数据在包外 PERSIST_DIR）。
// 压缩包双通道均不可达时才降级 dsh plugin add（改经 sh -lc 登录 shell 补 nvm PATH），仍失败才报手动提示。
const REPO_URL = 'https://gitee.com/LYJ132/dsh-bi-dashboards.git'
// GitHub 备通道：Gitee 主通道拉取失败（网络/劫持/限流）时的自动重试目标
const FALLBACK_REPO_URL = 'github:LYJ132/dsh-bi-dashboards'
// 快照形态远端最新版探针主通道：Gitee raw 直读 master 分支 package.json（失败时再回退 npm view GitHub 备通道）
const PKG_JSON_RAW_URL = REPO_URL.replace(/\.git$/, '') + '/raw/master/package.json'
const UPD_HINT = 'dsh plugin --profile web add ' + REPO_URL + ' 更新'
const UPD_NATIVE_HINT = '点更新将拉取最新版本'
// 快照形态压缩包下载通道（GET 匿名可达，实测 200）：Gitee 主通道 → GitHub codeload 备通道。
// BI_UPD_ARCHIVE_GITEE / BI_UPD_ARCHIVE_GITHUB 环境变量仅供回归 harness 指向 mock 服务器。
const ARCHIVE_URLS = [
  String(process.env.BI_UPD_ARCHIVE_GITEE || 'https://gitee.com/LYJ132/dsh-bi-dashboards/repository/archive/master.tar.gz'),
  String(process.env.BI_UPD_ARCHIVE_GITHUB || 'https://codeload.github.com/LYJ132/dsh-bi-dashboards/tar.gz/refs/heads/master')
]
let PKG_VERSION = '1.1.0'
try { PKG_VERSION = String(JSON.parse(readFileSync(PKG_DIR + '/package.json', 'utf8')).version || PKG_VERSION) } catch (e) {}
async function runCmd(ctx, argv, cwd, timeoutMs) {
  const sub = ctx.get('subprocess'); if (!sub) throw new Error('subprocess 服务不可用')
  const handle = sub.spawn({ argv, cwd, stdio: { stdin: 'ignore', stdout: { maxBytes: 4 * 1024 * 1024 }, stderr: { maxBytes: 1024 * 1024 } }, graceMs: 15000 })
  const outcome = await handle.done
  return { code: outcome && typeof outcome === 'object' ? outcome.exitCode : outcome, out: (handle.collected.stdout.readFrom(0).text || '').trim(), err: (handle.collected.stderr.readFrom(0).text || '').trim() }
}
function updateRepoDir() {
  // 关键：先 realpath 再验 .git——node_modules 里的包目录若是指向 git 仓库的符号链接（用户真实机器布局），
  // 必须解析到真身才能识别出 git 安装形态；realpath 失败（目录不存在等）退回原始路径
  let real = PKG_DIR
  try { real = realpathSync(PKG_DIR) } catch (e) {}
  if (!existsSync(real + '/.git')) return null
  return real
}
// 递归覆盖拷贝单个 files 清单项（目录或文件）：只新建/覆盖 dst 路径内的内容，绝不删除 dst 已有其他文件
async function overlayCopy(srcPath, dstPath) {
  const st = await fsp.stat(srcPath)
  if (st.isDirectory()) {
    await fsp.mkdir(dstPath, { recursive: true })
    for (const name of await fsp.readdir(srcPath)) await overlayCopy(srcPath + '/' + name, dstPath + '/' + name)
  } else if (st.isFile()) {
    await fsp.mkdir(dirname(dstPath), { recursive: true })
    await fsp.copyFile(srcPath, dstPath)
  }
}
// ===== 快照形态压缩包自更新：下载 → tar 解压 → 仅按 files 清单覆盖安装目录。 =====
// 成功返回 {ok:true, channel}；双通道都失败返回 {ok:false, error}（调用方再降级 dsh 通道）。
// 只覆盖、不删除：清单外文件（含用户放进包目录的任何东西）原样保留；用户数据在包外 PERSIST_DIR，天然不受影响。
async function updateSnapshotByArchive(ctx) {
  let fallbackList = null
  try { fallbackList = JSON.parse(readFileSync(PKG_DIR + '/package.json', 'utf8')).files } catch (e) {}
  let lastErr = ''
  for (let i = 0; i < ARCHIVE_URLS.length; i++) {
    try {
      const res = await fetch(ARCHIVE_URLS[i], { signal: AbortSignal.timeout(120000) })
      if (!res.ok) throw new Error('HTTP ' + res.status)
      const buf = Buffer.from(await res.arrayBuffer())
      if (buf.length < 64) throw new Error('压缩包过小(' + buf.length + 'B)，疑似劫持页')
      const tmp = String(process.env.TMPDIR || '/tmp').replace(/\/+$/, '') + '/dsh-bi-upd-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)
      await fsp.mkdir(tmp + '/x', { recursive: true })
      await fsp.writeFile(tmp + '/repo.tar.gz', buf)
      const tr = await runCmd(ctx, ['tar', '-xzf', tmp + '/repo.tar.gz', '-C', tmp + '/x'], '/tmp', 120000)
      if (tr.code !== 0) throw new Error('tar 解压失败: ' + (tr.err || tr.out || ('exit ' + tr.code)).slice(0, 200))
      // 压缩包根可能是单层版本化目录（Gitee: dsh-bi-dashboards-master/，GitHub: LYJ132-...-<sha>/），
      // 也可能直接就是仓库内容（tar -C repo .）——先看根下是否直接有 package.json，否则取第一个子目录
      let top = tmp + '/x'
      if (!existsSync(top + '/package.json')) {
        let found = null
        for (const n of await fsp.readdir(top)) { try { if ((await fsp.stat(top + '/' + n)).isDirectory()) { found = top + '/' + n; break } } catch (e) {} }
        if (!found) throw new Error('压缩包内未找到仓库根目录')
        top = found
      }
      // 覆盖清单以压缩包内 package.json 'files' 为准（新版定义随包内容），读不到退回本包清单
      let list = null
      try { list = JSON.parse(await fsp.readFile(top + '/package.json', 'utf8')).files } catch (e) {}
      if (!Array.isArray(list) || !list.length) list = fallbackList
      const manifest = Array.isArray(list) ? list.slice() : []
      if (manifest.indexOf('cordis.patch.yml') < 0) manifest.push('cordis.patch.yml')
      for (const item of manifest) {
        const rel = String(item).replace(/\/+$/, '')
        if (!rel || rel.startsWith('/') || rel.split('/').indexOf('..') >= 0) continue // 安全：拒绝越出仓库根的清单项
        try { await overlayCopy(top + '/' + rel, PKG_DIR + '/' + rel) } catch (e) { if (e && e.code === 'ENOENT') continue; throw e }
      }
      try { await fsp.rm(tmp, { recursive: true, force: true }) } catch (e) {}
      return { ok: true, channel: i === 0 ? 'Gitee' : 'GitHub' }
    } catch (e) { lastErr = String((e && e.message) || e).slice(0, 200) }
  }
  return { ok: false, error: lastErr || '压缩包下载失败' }
}
// 实时读取仓库 package.json 版本号：与 current/behind 来自同一份磁盘快照，避免未重启进程上报过期的加载期版本；读不到才退回模块常量
function livePkgVersion(repo) {
  try { return String(JSON.parse(readFileSync(repo + '/package.json', 'utf8')).version || PKG_VERSION) } catch (e) { return PKG_VERSION }
}
async function updateCheckState(ctx) {
  const repo = updateRepoDir()
  if (!repo) {
    // 快照安装（非 git 形态，包目录无 .git）：本地版本实时读包内 package.json；
    // 远端最新版 best-effort：先匿名 fetch Gitee raw master package.json（主通道，40s 硬上限），
    // 失败再回退 `npm view github:… version`（外层 timeout 40s 硬上限——弱网/劫持环境
    // 下 npm 会无限挂起，runCmd 的 timeoutMs 不强制）；两通道都失败只置 null，绝不臆造落后数
    const version = livePkgVersion(PKG_DIR)
    let latestVersion = null
    try {
      const r = await fetch(PKG_JSON_RAW_URL, { signal: AbortSignal.timeout(40000) })
      if (r.ok) { const j = await r.json(); const m = String((j && j.version) || '').match(/\d+\.\d+\.\d+[0-9A-Za-z.\-]*/); if (m) latestVersion = m[0] }
    } catch (e) {}
    if (latestVersion === null) {
      try {
        const nv = await runCmd(ctx, ['timeout', '-k', '5', '40', 'npm', 'view', FALLBACK_REPO_URL, 'version'], '/tmp', 45000)
        if (nv.code === 0) { const m = String(nv.out).match(/\d+\.\d+\.\d+[0-9A-Za-z.\-]*/); if (m) latestVersion = m[0] }
      } catch (e) {}
    }
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
      // 快照安装：压缩包自更新（主通道，无 dsh CLI 依赖）——Gitee 主通道 → GitHub 备通道，仅按 files 清单覆盖。
      // 双通道都不可达才降级老的 dsh plugin add 通道（改经 sh -lc 登录 shell：nvm 初始化会补全 PATH），
      // 降级也失败才报手动提示。用户数据在包外 PERSIST_DIR，覆盖清单外文件一律不触碰。
      const arch = await updateSnapshotByArchive(ctx)
      if (arch && arch.ok) {
        return { ok: true, updated: true, method: 'archive-overlay', channel: arch.channel, note: '重启 DSH 生效' + (arch.channel === 'GitHub' ? '（Gitee 拉取失败，已改用 GitHub 备通道）' : '') }
      }
      async function dshAdd(url) {
        try { return await runCmd(ctx, ['sh', '-lc', 'dsh plugin --profile web add ' + url], '/tmp', 300000) }
        catch (e) { return { code: -1, err: String((e && e.message) || e), out: '' } }
      }
      const nat = await dshAdd(REPO_URL)
      if (nat.code !== 0) {
        const detail = String(nat.err || nat.out || ('exit ' + nat.code)).slice(0, 200)
        const notFound = nat.code === 127 || /ENOENT|command not found|no such file/i.test(detail)
        if (notFound) return { ok: false, error: '未找到 dsh 命令，请手动执行：' + UPD_HINT + '（压缩包下载亦失败: ' + String((arch && arch.error) || '').slice(0, 120) + '）' }
        const fb = await dshAdd(FALLBACK_REPO_URL)
        if (fb.code !== 0) {
          const fbDetail = String(fb.err || fb.out || ('exit ' + fb.code)).slice(0, 200)
          return { ok: false, error: '自动更新失败（压缩包下载与 dsh plugin add 降级通道均已尝试）: Gitee: ' + detail + '；GitHub: ' + fbDetail }
        }
        return { ok: true, updated: true, method: 'native-add', channel: 'GitHub', note: '重启 DSH 生效（压缩包下载失败，已降级 dsh 通道）' }
      }
      return { ok: true, updated: true, method: 'native-add', channel: 'Gitee', note: '重启 DSH 生效（压缩包下载失败，已降级 dsh 通道）' }
    }
    const pre = await updateCheckState(ctx)
    if (pre.error) return { ok: false, error: pre.error }
    if (!pre.repo) return { ok: false, hint: UPD_HINT }
    if (pre.behind === 0) return { ok: true, updated: false, version: pre.version, note: '已是最新' }
    if (!pre.clean) return { ok: false, error: '工作区有改动，已拒绝更新（请先在插件目录处理未提交修改）' }
    // detached HEAD（用户在插件目录切过提交）：不安全也不该悄悄修——如实报告并给出出路，绝不跑 checkout 等破坏性命令
    const br = await runCmd(ctx, ['git', 'symbolic-ref', '--short', 'HEAD'], repo, 15000)
    if (br.code !== 0) return { ok: false, error: '插件目录处于 detached HEAD 状态，无法安全自动更新（请手动执行 git checkout master 后重试，或重装插件）' }
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
          content: [{ type: 'text', text: BI_CREATE_HEAD + desc + BI_CREATE_PROMPT }],
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
// 表达式感知聚合（feat-20260920-chart-schema）：group_by 项与指标列可为表达式；
// 纯列名旧定义的分组键/聚合值/别名输出与原实现逐键一致（访问器对旧输入是恒等映射）。
// bi-capability-v2 P0-1：各指标独立聚合（多指标天然支持，单指标路径零改动）；
// P1-1：count_distinct —— 组内按原始值（非数值化）去重计数，空值不计入；
// P1-3：having（{metric,op,value} 筛选）在聚合后、sort/limit 前执行。
function aggregate(rows, chart) {
  const gb = chart.group_by || []; const metrics = chart.metrics || []
  const gacc = gb.map(colAccessor); const macc = metrics.map(metricAccessor)
  const keys = evalKeysIfExpr(chart, rows)
  const groups = new Map()
  for (const row of rows) {
    const gvals = gacc.map(function (a) { const v = a.get(row, keys); return v === null || v === undefined ? '' : v })
    const key = gvals.map(String).join('\u0001')
    let g = groups.get(key)
    if (!g) { g = { gvals: gvals, sum: metrics.map(() => 0), n: metrics.map(() => 0), vn: metrics.map(() => 0), min: metrics.map(() => Infinity), max: metrics.map(() => -Infinity), ds: metrics.map(() => null) }; groups.set(key, g) }
    metrics.forEach((m, i) => {
      g.n[i] += 1
      if (m.agg === 'count_distinct') {
        const raw = macc[i].num(row, keys)
        if (raw === null || raw === undefined || raw === '') return
        if (!g.ds[i]) g.ds[i] = new Set()
        g.ds[i].add(String(raw)); return
      }
      const v = Number(macc[i].num(row, keys))
      if (Number.isFinite(v)) { g.sum[i] += v; g.vn[i] += 1; if (v < g.min[i]) g.min[i] = v; if (v > g.max[i]) g.max[i] = v }
    })
  }
  let out = []
  for (const g of groups.values()) {
    const r = {}
    gacc.forEach((a, i) => { r[a.label] = g.gvals[i] })
    metrics.forEach((m, i) => {
      let val
      if (m.agg === 'count') val = g.n[i]
      else if (m.agg === 'count_distinct') val = g.ds[i] ? g.ds[i].size : 0
      else if (m.agg === 'avg') val = g.vn[i] ? g.sum[i] / g.vn[i] : 0
      else if (m.agg === 'min') val = g.vn[i] ? g.min[i] : 0
      else if (m.agg === 'max') val = g.vn[i] ? g.max[i] : 0
      else val = g.sum[i]
      r[m.alias] = Math.round(val * 100) / 100
    })
    out.push(r)
  }
  out = applyHaving(out, chart)
  if (chart.sort && chart.sort.by) { const by = chart.sort.by, desc = chart.sort.desc !== false; out = out.sort((a, b) => { const c = cmpVal(a[by], b[by]); return desc ? -c : c }) }
  if (chart.limit) out = out.slice(0, chart.limit)
  return out
}
// 热力图色带（ColorBrewer Oranges 五档线性插值）：单元格按值预着色，
// 同时 option 里输出规范 visualMap——当前 client 的 toEcharts 只透传 series，
// itemStyle 着色保证热力图在现有渲染层也能正确显示色阶。
const HEAT_RAMP = ['#fff5eb', '#fdd0a2', '#fd8d3c', '#d94801', '#7f2704']
function hexToRgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)] }
function heatColor(v, min, max) {
  const span = max - min
  const t = span > 0 ? Math.max(0, Math.min(1, (v - min) / span)) : 0.5
  const seg = HEAT_RAMP.length - 1, pos = t * seg, i = Math.min(seg - 1, Math.floor(pos)), f = pos - i
  const c1 = hexToRgb(HEAT_RAMP[i]), c2 = hexToRgb(HEAT_RAMP[i + 1])
  return 'rgb(' + Math.round(c1[0] + (c2[0] - c1[0]) * f) + ',' + Math.round(c1[1] + (c2[1] - c1[1]) * f) + ',' + Math.round(c1[2] + (c2[2] - c1[2]) * f) + ')'
}
// ===== 显示层格式化（bi-capability-v2 P2-1/P2-2/P1-5）：纯展示变换，原始聚合值/行数据不动 =====
// P2-1：metrics[].format {unit:'千'|'万', decimals, prefix:'¥'} —— 千/万缩放 + 前缀 + 小数位 + 千分位
const UNIT_DIV = { '千': 1000, '万': 10000 }
function fmtMetricDisplay(v, fmt) {
  if (v === null || v === undefined || v === '') return ''
  let n = Number(v)
  if (!Number.isFinite(n)) return String(v)
  if (fmt && fmt.unit && UNIT_DIV[fmt.unit]) n = n / UNIT_DIV[fmt.unit]
  const d = fmt && Number.isInteger(fmt.decimals) ? Math.max(0, Math.min(6, fmt.decimals)) : null
  let out = d !== null ? n.toFixed(d) : String(Math.round(n * 100) / 100)
  if (d === null && out.indexOf('.') >= 0) out = out.replace(/0+$/, '').replace(/\.$/, '')
  const parts = out.split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  out = parts.join('.')
  return (fmt && fmt.prefix ? fmt.prefix : '') + out + (fmt && fmt.unit ? fmt.unit : '')
}
// P2-2：value_map {原始值: 显示名} 显示层枚举映射（未命中原样返回）
function mapDisp(v, vm) { if (!vm || v === null || v === undefined) return v; const l = vm[String(v)]; return l === undefined ? v : l }
// P1-5：表格条件格式/合计行的显示副本构建；无任何新键时返回与旧实现完全一致的对象（rows 原数组透传）
function buildTableOption(chart, rows) {
  const tcols = rows.length ? Object.keys(rows[0]) : []
  const tl = {}; tcols.forEach(function (c2) { tl[c2] = NAME_MAP_ZH.fields[c2] || c2 })
  const fmts = {}; (chart.metrics || []).forEach(function (m) { if (m && m.format) fmts[m.alias] = m.format })
  const vm = chart.value_map || null
  const rules = chart.rules
  const totals = chart.showTotals === true
  if (!Object.keys(fmts).length && !vm && !(rules && rules.length) && !totals) return { type: 'table', title: chart.title, columns: tcols, columnLabels: tl, rows }
  const disp = rows.map(function (r) { const o = {}; tcols.forEach(function (c2) { let v = r[c2]; if (fmts[c2]) v = fmtMetricDisplay(v, fmts[c2]); else v = mapDisp(v, vm); o[c2] = v === undefined ? null : v }); return o })
  const opt = { type: 'table', title: chart.title, columns: tcols, columnLabels: tl, rows: disp }
  // 条件格式：对原始行按规则匹配（数值口径），产出与显示行对齐的单元格样式数组。
  // 探针结论：当前 client 表格渲染 td 仅取 String(value)，不消费样式 —— cellStyles 作为数据透出，
  // 客户端表格暂不渲染（不做超出能力的宣称，echarts/客户端探测记录见 PLUGIN.md E9）。
  if (rules && rules.length) opt.cellStyles = rows.map(function (r) { const st = {}; rules.forEach(function (ru) { if (ru && ru.column && ru.style && Object.prototype.hasOwnProperty.call(r, ru.column) && jsFilterMatch(r, { column: ru.column, op: ru.op, value: ru.value })) st[ru.column] = Object.assign({}, st[ru.column], ru.style) }); return st })
  // 合计行：数值指标列求和（沿用显示格式）；其余列留空，首列标「总计」。仅进显示副本，原始 rows 不变。
  if (totals && rows.length) { const sum = {}; tcols.forEach(function (c2) { sum[c2] = '' }); sum[tcols[0]] = '总计'; (chart.metrics || []).forEach(function (m) { if (!m || !m.alias) return; const total = rows.reduce(function (a, r) { const n = Number(r[m.alias]); return a + (Number.isFinite(n) ? n : 0) }, 0); sum[m.alias] = fmts[m.alias] ? fmtMetricDisplay(total, fmts[m.alias]) : Math.round(total * 100) / 100 }); disp.push(sum) }
  return opt
}
// ===== 同环比（P1-2）时间窗平移：绝对日期字符串/数组整体平移 N 天（保留时间成分）=====
const CMP_DAY_MS = 86400000
function cmpPad2(n) { return (n < 10 ? '0' : '') + n }
function shiftAbsDateStr(s, days) {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})(.*)$/.exec(String(s).trim())
  if (!m) return s
  const t = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) - days * CMP_DAY_MS)
  return t.getUTCFullYear() + '-' + cmpPad2(t.getUTCMonth() + 1) + '-' + cmpPad2(t.getUTCDate()) + m[4]
}
function shiftAbsDateValues(v, days) {
  if (Array.isArray(v)) return v.map(function (x) { return shiftAbsDateValues(x, days) })
  if (typeof v === 'string') return shiftAbsDateStr(v, days)
  return v
}
// prev_period 窗口跨度：取时间列筛选覆盖的 [最早起, 最晚止] 闭区间天数（单日=1）
function periodSpanDays(timeFilters) {
  let minT = Infinity, maxT = -Infinity
  const scan = function (v) {
    if (Array.isArray(v)) { v.forEach(scan); return }
    const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(v == null ? '' : v).trim())
    if (!m) return
    const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    if (t < minT) minT = t; if (t > maxT) maxT = t
  }
  timeFilters.forEach(function (f) { scan(f.value) })
  if (!Number.isFinite(minT) || !Number.isFinite(maxT)) return 1
  return Math.max(1, Math.round((maxT - minT) / CMP_DAY_MS) + 1)
}
// kpi compare：主值聚合完成后，按平移后的（已解析为绝对时间的）时间筛选重跑同一管线取一次对比值
async function computeCompare(ctx, chart, resolvedFilters, aggRows) {
  const timeCol = chart.time_column || 'order_date'
  const tf = resolvedFilters.filter(function (f) { return f && f.column === timeCol })
  if (!tf.length) throw new Error('compare 同环比需要图表定义包含时间列筛选（column="' + timeCol + '"，如 BETWEEN ["today-6","today"]）')
  const days = chart.compare.type === 'prev_day' ? 1 : periodSpanDays(tf)
  const cmpDef = Object.assign({}, chart, { compare: undefined, filters: resolvedFilters.map(function (f) { return f && f.column === timeCol ? Object.assign({}, f, { value: shiftAbsDateValues(f.value, days) }) : f }) })
  const r = await renderChartDef(ctx, cmpDef)
  const metric = (chart.metrics || [])[0]
  const prev = r.rows.length && metric ? r.rows[0][metric.alias] : null
  const cur = aggRows.length && metric ? aggRows[0][metric.alias] : null
  let pct = null
  if (typeof prev === 'number' && typeof cur === 'number' && prev !== 0) pct = Math.round((cur - prev) / prev * 1000) / 10
  return { prev: prev, pct: pct, label: chart.compare.type === 'prev_day' ? '较前一日' : '较上一周期' }
}
// 表达式感知的 option 构建：分组列名统一走 colAccessor().label（纯列名旧行为不变）
// bi-capability-v2 P0-1：多指标泛化 —— 直角坐标图型（bar/line/area/scatter/radar 回退折线）
// 2+ 指标时每个指标一条 series，第 2 条起 yAxisIndex:1 挂第二 Y 轴（通用组合规则，非新图型）；
// 单指标路径逐字节保持旧输出；kpi 允许主值 + 对比值（P1-2 同环比的落点，本版仅透出数值）。
// bi-capability-v2 R3：P2-1 format / P2-2 value_map / P1-2 compare —— 全部显示层变换，
// 未使用新键的旧定义输出逐字节不变（table rows 原数组透传、kpi value 原值）。
function buildOption(chart, rows, cmp) {
  if (chart.type === 'text') return { type: 'text', title: chart.title, text: chart.text || '' }
  const metrics = chart.metrics || []
  const metric = metrics[0]
  const gbs = chart.group_by || []
  if (chart.type === 'table') return buildTableOption(chart, rows)
  if (chart.type === 'kpi') {
    const fmt0 = metric && metric.format
    let v = rows.length && metric ? rows[0][metric.alias] : null
    if (fmt0) v = fmtMetricDisplay(v, fmt0)
    const o = { type: 'kpi', title: chart.title, value: v }
    if (metrics.length > 1 && rows.length) o.compare = rows[0][metrics[1].alias]
    else if (cmp && rows.length) {
      // P1-2：同环比副标签。探针结论：client 仅渲染 option.value 文本（React 与静态 DOM 两路径同），
      // 故展示上把「较前一日/较上一周期 ±x.x%」并入 value 文本；compare/comparePct/compareLabel 结构化字段同步透出。
      const pctTxt = cmp.pct === null ? '—' : (cmp.pct > 0 ? '+' + cmp.pct + '%' : cmp.pct + '%')
      o.compare = fmt0 ? fmtMetricDisplay(cmp.prev, fmt0) : cmp.prev
      o.compareLabel = cmp.label
      if (cmp.pct !== null) o.comparePct = cmp.pct
      o.value = String(o.value) + '（' + cmp.label + ' ' + pctTxt + '）'
    }
    return o
  }
  const g0 = gbs.length ? colAccessor(gbs[0]) : null
  const vm = chart.value_map || null
  const names = rows.map(function (r) { const v = mapDisp(g0 ? r[g0.label] : '', vm); return String(v != null ? v : '') })
  const vals = rows.map(function (r) { return Number(metric ? r[metric.alias] : 0) })
  if (chart.type === 'pie') return { type: 'pie', title: chart.title, series: [{ type: 'pie', radius: ['30%', '65%'], data: rows.map((r, i) => ({ name: names[i], value: vals[i] })) }] }
  if (chart.type === 'heatmap') {
    // 热力图：group_by[0]=X 轴维度、group_by[1]=Y 轴维度、1 个指标 → [xIdx,yIdx,value] 单元格矩阵 + visualMap
    if (gbs.length !== 2 || !metric) throw new Error('热力图需要恰好 2 个 group_by 维度与 1 个指标（当前 ' + gbs.length + ' 个维度）')
    const a1 = colAccessor(gbs[0]), a2 = colAccessor(gbs[1])
    const xs = [], ys = [], xix = new Map(), yix = new Map(), cells = []
    rows.forEach(function (r) {
      const x = String(mapDisp(r[a1.label], vm) != null ? mapDisp(r[a1.label], vm) : ''), y = String(mapDisp(r[a2.label], vm) != null ? mapDisp(r[a2.label], vm) : ''), v = Number(r[metric.alias])
      if (!xix.has(x)) { xix.set(x, xs.length); xs.push(x) }
      if (!yix.has(y)) { yix.set(y, ys.length); ys.push(y) }
      cells.push([xix.get(x), yix.get(y), Number.isFinite(v) ? v : 0])
    })
    let vmin = Infinity, vmax = -Infinity
    cells.forEach(function (c) { if (c[2] < vmin) vmin = c[2]; if (c[2] > vmax) vmax = c[2] })
    if (!Number.isFinite(vmin)) { vmin = 0; vmax = 1 }
    const data = cells.map(function (c) { return { value: c, itemStyle: { color: heatColor(c[2], vmin, vmax) } } })
    return { type: 'heatmap', title: chart.title, xAxis: { type: 'category', data: xs, axisLabel: { rotate: 30, interval: 0 } }, yAxis: { type: 'category', data: ys }, visualMap: { min: Math.round(vmin * 100) / 100, max: Math.round(vmax * 100) / 100, calculable: true, orient: 'horizontal', left: 'center', bottom: 0, inRange: { color: HEAT_RAMP } }, series: [{ type: 'heatmap', name: metric.alias, data: data, label: { show: false }, emphasis: { itemStyle: { shadowBlur: 8, shadowColor: 'rgba(0,0,0,0.3)' } } }] }
  }
  // funnel/gauge 等无坐标系独立布局图型：当前 client 的 toEcharts 仅在 option.type === 'pie' 时走
  // 「独立 series 直通」通道；直角坐标通道会强注 dataZoom，对无坐标轴的 series 直接抛
  // r.getAxesOnZeroOf（echarts 5.5 实测）。故内层路由标记写 'pie'——仅路由用，
  // series.type 仍是 funnel/gauge，外层 chart.type/卡片/围栏渲染都不受影响。
  if (chart.type === 'funnel') return { type: 'pie', title: chart.title, series: [{ type: 'funnel', name: metric ? metric.alias : '', left: '12%', width: '76%', top: 36, bottom: 16, sort: 'descending', gap: 2, label: { show: true, position: 'inside' }, data: rows.map((r, i) => ({ name: names[i], value: vals[i] })) }] }
  if (chart.type === 'gauge') {
    let gmax = 0; vals.forEach(function (v) { if (Number.isFinite(v) && v > gmax) gmax = v }); if (!(gmax > 0)) gmax = 100
    return { type: 'pie', title: chart.title, series: [{ type: 'gauge', name: metric ? metric.alias : '', min: 0, max: gmax, splitNumber: 5, progress: { show: true, width: 14 }, axisLine: { lineStyle: { width: 14 } }, detail: { formatter: '{value}' }, data: rows.slice(0, 1).map((r, i) => ({ name: names[i], value: vals[i] })) }] }
  }
  // 通用直角坐标：bar/line 原样；area=折线+areaStyle；scatter=类目位上的散点；
  // radar → 折线回退（当前 client 的 toEcharts 只透传 xAxis/yAxis/series，radar 组件会被丢弃）
  const t = chart.type
  const sType = (t === 'area' || t === 'radar') ? 'line' : t
  // 多指标（P0-1）：每指标一条 series；第 2 条起挂第二 Y 轴（yAxisIndex:1，通用组合规则）
  if (metrics.length > 1) {
    const series = metrics.map(function (m, mi) {
      const vals = rows.map(function (r) { return Number(r[m.alias]) })
      const s = { type: sType, data: t === 'scatter' ? rows.map((r, j) => [names[j], vals[j]]) : vals, name: m.alias }
      if (t === 'area') s.areaStyle = { opacity: 0.3 }
      if (mi > 0) s.yAxisIndex = 1
      return s
    })
    return { type: t, title: chart.title, xAxis: { type: 'category', data: names, axisLabel: { rotate: 30, interval: 0 } }, yAxis: [{ type: 'value' }, { type: 'value' }], series }
  }
  // 键序保持旧版 {type, data, name}，存量看板序列化结果逐字节不变
  const series = { type: sType, data: t === 'scatter' ? rows.map((r, i) => [names[i], vals[i]]) : vals, name: metric ? metric.alias : '' }
  if (t === 'area') series.areaStyle = { opacity: 0.3 }
  return { type: t, title: chart.title, xAxis: { type: 'category', data: names, axisLabel: { rotate: 30, interval: 0 } }, yAxis: { type: 'value' }, series: [series] }
}
// 取数列展开：纯列名原样；表达式取其引用的列标识符（语法错误留给 validateChartDef 统一报错）
function addColumnRefs(s, ref) {
  let expr = null
  if (typeof ref === 'string') { if (EXPR_IDENT.test(ref)) { s.add(ref); return } expr = ref }
  else if (ref && typeof ref === 'object' && typeof ref.expr === 'string') expr = ref.expr
  else return
  try { exprCols(parseExpr(expr)).forEach(function (c) { s.add(c) }) } catch (e) {}
}
function neededColumns(chart) { const s = new Set(); (chart.group_by || []).forEach(c => addColumnRefs(s, c)); (chart.metrics || []).forEach(m => { if (m && m.column) addColumnRefs(s, m.column) }); (chart.filters || []).forEach(f => f.column && s.add(f.column)); const tc = chart.time_column || ((chart.granularity === 'month' || chart.granularity === 'day') ? 'order_date' : null); if (tc) s.add(tc); return Array.from(s) }
// 表列元数据缓存（GET /api/meta/table/{t} → {names:Set<列名>, types:Map<列名,data_type>}；
// 失败返回 null 不缓存，join 走降级路径，相对时间记号走「不查类型=既有输出形态」降级路径。
// r7-B：types 供 date/timestamp 列判定；r7-A 前 join 路径只用 names，语义不变）
const tableMetaCache = new Map()
async function tableMeta(ctx, table) {
  if (tableMetaCache.has(table)) return tableMetaCache.get(table)
  let meta = null
  try {
    const resp = await getJson(ctx, 'GET', '/api/meta/table/' + encodeURIComponent(table), undefined, 8000)
    if (resp && Array.isArray(resp.columns)) meta = { names: new Set(resp.columns.map(function (c) { return c && c.name }).filter(Boolean)), types: new Map(resp.columns.filter(function (c) { return c && c.name }).map(function (c) { return [c.name, String(c.type || c.data_type || '')] })) }
  } catch (e) { meta = null }
  if (meta) { if (tableMetaCache.size > 100) tableMetaCache.clear(); tableMetaCache.set(table, meta) }
  return meta
}
async function tableColumnNames(ctx, table) { const m = await tableMeta(ctx, table); return m ? m.names : null }
async function tableColTypes(ctx, table) { const m = await tableMeta(ctx, table); return m ? m.types : null }
// granularity:'day' 日分桶适用的时序图型（r7-A）：直角坐标 bar/line/area（与 METRIC_CAPS 时序三兄弟同族）；
// kpi/table/text 维持既有聚合语义（kpi 的「近N日合计」单值、table 的明细行不受影响），heatmap 本就不允许 granularity。
const DAY_BUCKET_TYPES = ['bar', 'line', 'area']
async function renderChartDef(ctx, chart, extraFilters) { if (chart.type === 'text') return { type: 'text', title: chart.title || '', text: chart.text || '' };
  // ===== 相对时间筛选（P0-3）：解析一次 now 快照（每图渲染一个 now，确定性）， =====
  // ===== 记号值('now'/'today-1'/'-30d'/{relative}) 在取数前统一替换为绝对时间， =====
  // ===== 之后同时作用于 /api/query payload 与合并后 JS 过滤两条路径；静态值原对象透传（零改动）。 =====
  // ===== having（P1-3）：{metric,op,value} 筛选拆出，聚合后执行，绝不进入取数 payload。 =====
  const nowSnap = currentNow()
  const preFilters = (chart.filters || []).filter(function (f) { return !(f && typeof f === 'object' && !Array.isArray(f) && f.metric !== undefined && f.metric !== '') })
  const allRawFilters = preFilters.concat(extraFilters || [])
  // ===== r7-B：含相对时间记号时按筛选列 data_type 决定输出形态——date 列一律 YYYY-MM-DD =====
  // ===== （裸偏移 -30d/+30d 与 now 系同样截断，避免数据服务 date 列 400）；timestamp/未知类型 =====
  // ===== 保持既有形态（now 系完整 datetime）。列类型走 join 路径同款 meta 缓存；无记号定义 =====
  // ===== 不产生额外请求（旧静态筛选 payload 逐字节不变的前提）。now 快照仍每图一次（确定性）。 =====
  let filterTypeOf = null
  if (filtersUseRelTokens(allRawFilters)) {
    const typeMaps = []
    const mainTypes = await tableColTypes(ctx, chart.table); if (mainTypes) typeMaps.push(mainTypes)
    for (const j of normalizeJoins(chart.join)) { const t = await tableColTypes(ctx, j.table); if (t && typeMaps.indexOf(t) < 0) typeMaps.push(t) }
    if (typeMaps.length) filterTypeOf = function (col) { for (const m of typeMaps) { const t = m.get(col); if (t) return t } return undefined }
  }
  const allFilters = resolveFilters(allRawFilters, nowSnap, filterTypeOf)
  // ===== 跨表关联（feat-20260920-chart-schema；bi-capability-v2 扩展：join 数组链式 + join.type）=====
  // meta 可用时裁列：事实查询只取事实列（含各级主表侧关联键），每级维表查询取该级被引用的维表列+关联键；
  // 维表列上的筛选合并后走 JS 执行（服务端筛选无法正确剔除"未命中维表"的事实行）。
  // join 数组按序合并：后级 left_key 可引用前级产出的维表列（链式取数 order_detail_raw→product_main→category_dim）。
  // join.type: 'left'（缺省=旧合并语义：未命中事实行保留、维表列为空）| 'inner'（未命中事实行剔除）。
  // meta 不可用则降级：维持旧列裁剪 + 维表整表取回合并。
  const payload = { table: chart.table, filters: allFilters, limit: 200000 }
  const cols = neededColumns(chart)
  const joins = normalizeJoins(chart.join)
  let dimFilterGroups = [], dimColPlans = null
  if (joins.length) {
    const mainSet = await tableColumnNames(ctx, chart.table)
    const dimSets = []
    for (const j of joins) dimSets.push(await tableColumnNames(ctx, j.table))
    if (mainSet && dimSets.every(function (s) { return s })) {
      dimColPlans = joins.map(function (j, i) { return { rk: j.right_key, refDim: [], dimFilters: [] } })
      // 引用列分配：主表列→事实查询；维表列→首个含它的维表层（后级可引用前级产出，故按首次出现归属）
      const pushU = function (arr, c) { if (arr.indexOf(c) < 0) arr.push(c) }
      const factCols = []
      cols.forEach(function (c) { if (mainSet.has(c)) pushU(factCols, c); else { const i = dimSets.findIndex(function (s) { return s.has(c) }); if (i < 0) throw new Error('图表定义引用未知列 "' + c + '"（主表 ' + chart.table + ' 与关联表 ' + joins.map(function (j) { return j.table }).join('/') + ' 均无此列）'); pushU(dimColPlans[i].refDim, c) } })
      joins.forEach(function (j) { if (mainSet.has(j.left_key)) pushU(factCols, j.left_key) })
      // 筛选分配：主表列留在 payload（服务端过滤）；维表列归入含它的层并从 payload 剔除（合并后 JS 过滤）
      const dimAssigned = []
      allFilters.forEach(function (f) {
        if (!f || !f.column) return
        if (mainSet.has(f.column)) return
        const i = dimSets.findIndex(function (s) { return s.has(f.column) })
        const lv = i < 0 ? 0 : i
        pushU(dimColPlans[lv].refDim, f.column); pushU(dimColPlans[lv].dimFilters, f); dimAssigned.push(f)
      })
      payload.filters = allFilters.filter(function (f) { return dimAssigned.indexOf(f) < 0 })
      payload.columns = factCols
      // 链式依赖：第 i 级维表查询还须取回「后级 left_key 落在本级维表上的列」，
      // 否则后级合并时行上没有关联键（如 明细→商品主档→品类：商品主档须带出 cate_code）
      joins.forEach(function (j, i) {
        for (let k = i + 1; k < joins.length; k++) { if (dimSets[i].has(joins[k].left_key)) pushU(dimColPlans[i].refDim, joins[k].left_key) }
      })
      dimFilterGroups = dimColPlans.map(function (p) { return p.dimFilters })
    } else if (cols.length) payload.columns = cols
  } else if (cols.length) payload.columns = cols
  const data = await getJson(ctx, 'POST', '/api/query', payload); let rows = data.rows || []
  for (let ji = 0; ji < joins.length; ji++) {
    const j = joins[ji]
    const dp = { table: j.table, limit: 200000 }
    if (dimColPlans) { const ref = dimColPlans[ji].refDim; dp.columns = [j.right_key].concat(ref.filter(function (c) { return c !== j.right_key })) }
    const dimData = await getJson(ctx, 'POST', '/api/query', dp)
    rows = mergeJoinRows(rows, dimData.rows || [], j.left_key, j.right_key, j.type)
    if (dimFilterGroups[ji] && dimFilterGroups[ji].length) rows = applyJsFilters(rows, dimFilterGroups[ji])
  }
  // ===== r7-A：granularity:'day' 此前在 renderChartDef 里根本没有分支（枚举自 26d3d93 就含 day， =====
  // ===== 历史无一日实现；旧「按日趋势」全靠 group_by:['order_date'] 承担分组）。v1.2.0 的模型指引 =====
  // ===== 普及了 granularity:'day' 不带 group_by 的写法后，此类定义落进 aggregate() 的空分组， =====
  // ===== 整表塌缩为一个点。现在 bar/line/area 的 day 粒度统一按 time_column（缺省 order_date） =====
  // ===== 日分桶：桶键 String(r[tc]).slice(0,10)（timestamp 列亦正确归一日），聚合复用 aggregate() =====
  // ===== 全套语义（sum/count/count_distinct/avg/min/max + having/sort/limit），一日一个点。 =====
  if (chart.granularity === 'day' && DAY_BUCKET_TYPES.indexOf(chart.type) >= 0) {
    const tc = chart.time_column || 'order_date'
    // 与月路径一致：时间列为空的行无法归日，不参与日分桶（月路径 if (!d) return 同款语义）
    const bucketed = []
    for (const r of rows) {
      const v = r[tc]
      if (v === null || v === undefined || v === '') continue
      const o = Object.assign({}, r); o[tc] = String(v).slice(0, 10); bucketed.push(o)
    }
    const dayChart = (chart.group_by && chart.group_by.length) ? chart : Object.assign({}, chart, { group_by: [tc] })
    let rowsD = aggregate(bucketed, dayChart)
    // 无显式 sort 时按日期升序（aggregate 出行序=到达序，日期轴必须有序）；显式 sort（如最近 N 天 desc+limit）仍由 aggregate 处理
    if (!(chart.sort && chart.sort.by) && (!chart.group_by || !chart.group_by.length || chart.group_by[0] === tc)) {
      const gk = colAccessor(dayChart.group_by[0]).label
      rowsD = rowsD.slice().sort(function (a, b) { const av = String(a[gk] == null ? '' : a[gk]), bv = String(b[gk] == null ? '' : b[gk]); return av < bv ? -1 : av > bv ? 1 : 0 })
    }
    return { type: chart.type, title: chart.title || '', option: buildOption(dayChart, rowsD), rows: rowsD }
  }
  if (chart.granularity === 'month') {
    // 审计 C13：月度聚合按图表 time_column 分组（缺省 order_date），不再硬编码 r.order_date
    // P1-1：count_distinct 指标按日收集去重集合，按月并集后取 size（跨日去重不可分解为日值相加）
    const tc = chart.time_column || 'order_date'
    const mdefs = chart.metrics || []
    const macc = mdefs.map(metricAccessor)
    const keys = evalKeysIfExpr(chart, rows)
    const daily = {}
    rows.forEach(function (r) {
      const d = r[tc] ? String(r[tc]).slice(0, 10) : ''
      if (!d) return
      if (!daily[d]) { daily[d] = {}; mdefs.forEach(function (mm) { daily[d][mm.alias] = mm.agg === 'count_distinct' ? null : 0 }) }
      mdefs.forEach(function (mm, mi) {
        if (mm.agg === 'count_distinct') {
          const raw = macc[mi].num(r, keys)
          if (raw === null || raw === undefined || raw === '') return
          if (!daily[d][mm.alias]) daily[d][mm.alias] = new Set()
          daily[d][mm.alias].add(String(raw)); return
        }
        if (mm.agg === 'count') daily[d][mm.alias] += 1
        else { const v = Number(macc[mi].plain ? r[macc[mi].column] : macc[mi].num(r, keys)); if (Number.isFinite(v)) daily[d][mm.alias] += v }
      })
    })
    const mb = {}
    Object.keys(daily).sort().forEach(function (d) {
      const k = d.slice(0, 7)
      if (!mb[k]) { mb[k] = {}; mdefs.forEach(function (mm) { mb[k][mm.alias] = mm.agg === 'count_distinct' ? null : 0 }) }
      mdefs.forEach(function (mm) {
        if (mm.agg === 'count_distinct') {
          const s = daily[d][mm.alias]
          if (s) { if (!mb[k][mm.alias]) mb[k][mm.alias] = new Set(); s.forEach(function (x) { mb[k][mm.alias].add(x) }) }
          return
        }
        mb[k][mm.alias] += daily[d][mm.alias]
      })
    })
    // 分组列名走 label（纯列名时即列名本身，表达式时为其 {expr,as} 别名/原文），与 buildOption 取键一致
    const gk = (chart.group_by && chart.group_by.length) ? colAccessor(chart.group_by[0]).label : 'order_date'
    const rowsM = Object.keys(mb).sort().map(function (k) { const o = {}; o[gk] = k; mdefs.forEach(function (mm) { const v = mm.agg === 'count_distinct' ? (mb[k][mm.alias] ? mb[k][mm.alias].size : 0) : mb[k][mm.alias]; o[mm.alias] = Math.round(v * 100) / 100 }); return o })
    const rowsH = applyHaving(rowsM, chart)
    return { type: chart.type, title: chart.title || '', option: buildOption(chart, rowsH), rows: rowsH }
  }
  // 表格明细（无分组）：表达式指标按 alias 落为明细新列；纯列名定义行为与旧实现一致（不做额外计算）
  if (chart.type === 'table' && !(chart.group_by && chart.group_by.length)) {
    const macc = (chart.metrics || []).map(metricAccessor).filter(function (a) { return !a.plain })
    if (macc.length && rows.length) { const keys = Object.keys(rows[0]); rows.forEach(function (r) { macc.forEach(function (a) { const v = Number(a.num(r, keys)); r[a.alias] = Number.isFinite(v) ? v : null }) }) }
    const rowsH = applyHaving(rows, chart)
    return { type: chart.type, title: chart.title || '', option: buildOption(chart, rowsH), rows: rowsH }
  }
  let agg = rows; if (chart.type !== 'table' || (chart.group_by && chart.group_by.length)) agg = aggregate(rows, chart)
  // P1-2 同环比：kpi + compare —— 主值聚合完成后，Host 对时间列筛选做对齐平移（prev_day/prev_period）再取一次数
  let cmp = null
  if (chart.type === 'kpi' && chart.compare) cmp = await computeCompare(ctx, chart, allFilters, agg)
  return { type: chart.type, title: chart.title || '', option: buildOption(chart, agg, cmp), rows: agg } }
// ===== 图表定义校验（审计 C12）=====
// 决策：现在就收紧校验（多指标一律拒绝并给出明确修复指引），渲染能力后补。
// 核心键一律 additionalProperties:false，杜绝拼写错误的键静默生效；
// time_column 纳入定义，供月粒度聚合与取数列使用（缺省 order_date）。
// filter：{column, op, value}（取数前筛选）或 {metric, op, value}（P1-3 having，聚合后筛选），二选一
const filterItem = { type: 'object', additionalProperties: false, properties: { column: { type: 'string' }, metric: { type: 'string' }, op: { type: 'string', required: true, enum: ['=', '!=', '>', '>=', '<', '<=', 'IN', 'NOT_IN', 'LIKE', 'ILIKE', 'BETWEEN', 'IS_NULL', 'IS_NOT_NULL'] }, value: { type: 'json' } } }
// agg 枚举移至 src/bi-capabilities.js（AGG_ENUM 单一事实源，R4 起）
const metricItem = { type: 'object', additionalProperties: false, properties: { column: { type: 'string', required: true }, agg: { type: 'string', required: true, enum: AGG_ENUM }, alias: { type: 'string', required: true }, format: { type: 'json' } } }
// 每图型指标上限（P0-1）移至 src/bi-capabilities.js（METRIC_CAPS 单一事实源，R4 起）
// join：图表跨表关联（Host 端合并）。column 允许写表达式字符串（见 validateChartDef）。
// P0-4/P1-4：join 接受单对象（旧形态）或对象数组（链式，按序合并）；DSL 对象/数组联合类型
// 不受支持，schema 放开为 json、由 validateChartDef 全量 JS 校验。
// join 项合法键与取值见 validateChartDef 的 join 段（单对象/对象数组 + type: left|inner）。
// group_by 项：列名字符串 / 表达式字符串 / {expr, as} 对象，DSL 用 json 放行、JS 侧校验。
// type 枚举扩展常见 ECharts 图型；heatmap 要求恰好 2 个 group_by；radar 当前按折线渲染。
const chartDef = { type: 'object', additionalProperties: false, properties: { type: { type: 'string', required: true, enum: ['bar', 'line', 'area', 'pie', 'scatter', 'heatmap', 'radar', 'funnel', 'gauge', 'table', 'text', 'kpi'] }, title: { type: 'string', required: true }, table: { type: 'string', required: true }, join: { type: 'json' }, filters: { type: 'array', items: filterItem }, group_by: { type: 'array', items: { type: 'json' } }, metrics: { type: 'array', items: metricItem }, sort: { type: 'object', additionalProperties: false, properties: { by: { type: 'string' }, desc: { type: 'boolean' } } }, limit: { type: 'integer' }, text: { type: 'string' }, granularity: { type: 'string', enum: ['day', 'month'] }, time_column: { type: 'string' }, value_map: { type: 'json' }, compare: { type: 'json' }, rules: { type: 'json' }, showTotals: { type: 'boolean' }, filtersFrom: { type: 'json' } } }
// 图型枚举移至 src/bi-capabilities.js（CHART_TYPES 单一事实源，R4 起）
const CHART_KEYS = ['type', 'title', 'table', 'join', 'filters', 'group_by', 'metrics', 'sort', 'limit', 'text', 'granularity', 'time_column', 'value_map', 'compare', 'rules', 'showTotals', 'filtersFrom']
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
    else {
      const cap = METRIC_CAPS[def.type] || 1
      if (ms.length > cap) errs.push(tag + ': metrics 超出该图型上限（type "' + def.type + '" 最多 ' + cap + ' 个指标，当前 ' + ms.length + ' 个）；如需更多指标请拆成多个图表')
      ms.forEach(function (m, i) {
        if (!m || typeof m !== 'object') { errs.push(tag + ': metrics[' + i + '] 必须是对象'); return }
        Object.keys(m).forEach(function (k) { if (['column', 'agg', 'alias', 'format'].indexOf(k) < 0) errs.push(tag + ': metrics[' + i + '] 含未知字段 "' + k + '"') })
        if (!m.column) errs.push(tag + ': metrics[' + i + '].column 必填')
        if (AGG_ENUM.indexOf(m.agg) < 0) errs.push(tag + ': metrics[' + i + '].agg 必须为 ' + AGG_ENUM.join('/') + '（count_distinct=去重计数）')
        if (!m.alias) errs.push(tag + ': metrics[' + i + '].alias 必填')
      })
      const aliases = ms.filter(function (m) { return m && m.alias }).map(function (m) { return m.alias })
      if (aliases.length !== new Set(aliases).size) errs.push(tag + ': metrics 存在重复 alias（每指标别名必须唯一，输出列按 alias 命名）')
      // R3 P2-1：metrics[].format 显示格式校验（{unit:'千'|'万', decimals 0~6, prefix}）
      ms.forEach(function (m, i) {
        if (!m || m.format === undefined) return
        if (!m.format || typeof m.format !== 'object' || Array.isArray(m.format)) { errs.push(tag + ': metrics[' + i + '].format 必须是对象 {unit, decimals, prefix}'); return }
        Object.keys(m.format).forEach(function (k) { if (['unit', 'decimals', 'prefix'].indexOf(k) < 0) errs.push(tag + ': metrics[' + i + '].format 含未知字段 "' + k + '"（允许: unit/decimals/prefix）') })
        if (m.format.unit !== undefined && ['千', '万'].indexOf(m.format.unit) < 0) errs.push(tag + ': metrics[' + i + '].format.unit 必须为 "千" 或 "万"')
        if (m.format.decimals !== undefined && (!Number.isInteger(m.format.decimals) || m.format.decimals < 0 || m.format.decimals > 6)) errs.push(tag + ': metrics[' + i + '].format.decimals 必须是 0~6 的整数')
        if (m.format.prefix !== undefined && typeof m.format.prefix !== 'string') errs.push(tag + ': metrics[' + i + '].format.prefix 必须是字符串')
      })
    }
    if (def.filters !== undefined && !Array.isArray(def.filters)) errs.push(tag + ': filters 必须是数组')
    if (Array.isArray(def.filters)) def.filters.forEach(function (f, i) {
      if (!f || typeof f !== 'object' || Array.isArray(f)) { errs.push(tag + ': filters[' + i + '] 必须是对象'); return }
      if (f.metric !== undefined) {
        if (f.column) errs.push(tag + ': filters[' + i + '] 不能同时写 column 与 metric（column=取数前筛选，metric=聚合后筛选 having，二选一）')
        else if (typeof f.metric !== 'string' || !f.metric) errs.push(tag + ': filters[' + i + '].metric 必须是本图 metrics 中的指标别名（alias）字符串')
        else if (!f.op) errs.push(tag + ': filters[' + i + '].op 必填（metric 形式在聚合后执行，按指标值筛选）')
      } else if (!f.column || !f.op) errs.push(tag + ': filters[' + i + '] 必须含 column/op（或写 {metric, op, value} 做聚合后筛选）')
    })
    // having 的 metric 必须引用本图 metrics 的 alias（聚合后按结果列名取值）
    if (Array.isArray(def.filters) && Array.isArray(def.metrics)) def.filters.forEach(function (f, i) {
      if (f && f.metric !== undefined) { const al = def.metrics.map(function (m) { return m && m.alias }); if (al.indexOf(f.metric) < 0) errs.push(tag + ': filters[' + i + '].metric "' + f.metric + '" 不在本图 metrics 别名中（允许: ' + al.join('/') + '）') }
    })
    // group_by：列名字符串 / 表达式字符串 / {expr, as} 对象；非纯列名的字符串在定义期先试编译，语法错误早报
    if (def.group_by !== undefined && !Array.isArray(def.group_by)) errs.push(tag + ': group_by 必须是数组')
    else if (Array.isArray(def.group_by)) def.group_by.forEach(function (g, i) {
      const t2 = tag + ': group_by[' + i + ']'
      if (typeof g === 'string') {
        if (!g) { errs.push(t2 + ' 不能为空'); return }
        if (!EXPR_IDENT.test(g)) { try { parseExpr(g) } catch (e) { errs.push(t2 + ' 既不是列名也不是合法表达式（' + e.message + '）') } }
      } else if (g && typeof g === 'object' && typeof g.expr === 'string') {
        if (!g.expr) { errs.push(t2 + '.expr 不能为空'); return }
        try { parseExpr(g.expr) } catch (e) { errs.push(t2 + '.expr 不是合法表达式（' + e.message + '）') }
        if (g.as !== undefined && typeof g.as !== 'string') errs.push(t2 + '.as 必须是字符串')
      } else errs.push(t2 + ' 必须是列名字符串或 {expr, as} 表达式对象')
    })
    // 指标列同样允许表达式字符串（alias 即结果列名），定义期试编译
    if (Array.isArray(def.metrics)) def.metrics.forEach(function (m, i) {
      if (m && typeof m.column === 'string' && m.column && !EXPR_IDENT.test(m.column)) {
        try { parseExpr(m.column) } catch (e) { errs.push(tag + ': metrics[' + i + '].column 既不是列名也不是合法表达式（' + e.message + '）') }
      }
    })
    // R3 P2-2：value_map 显示层枚举映射
    if (def.value_map !== undefined) {
      if (!def.value_map || typeof def.value_map !== 'object' || Array.isArray(def.value_map)) errs.push(tag + ': value_map 必须是 {原始值: 显示名} 对象')
      else Object.keys(def.value_map).forEach(function (k) { if (typeof def.value_map[k] !== 'string') errs.push(tag + ': value_map["' + k + '"] 必须是字符串显示名') })
    }
    // R3 P1-2：kpi 同环比 compare（{type:'prev_day'|'prev_period'}，恰 1 个指标，不与月粒度混用）
    if (def.compare !== undefined) {
      if (def.type !== 'kpi') errs.push(tag + ': compare 同环比仅 kpi 支持（当前 type "' + def.type + '"）')
      if (!def.compare || typeof def.compare !== 'object' || Array.isArray(def.compare)) errs.push(tag + ': compare 必须是对象 {type}')
      else {
        Object.keys(def.compare).forEach(function (k) { if (k !== 'type') errs.push(tag + ': compare 含未知字段 "' + k + '"（仅 type）') })
        if (['prev_day', 'prev_period'].indexOf(def.compare.type) < 0) errs.push(tag + ': compare.type 必须为 prev_day/prev_period')
      }
      if (Array.isArray(def.metrics) && def.metrics.length !== 1) errs.push(tag + ': compare 需要恰好 1 个指标（主值），与双指标 compare 形态互斥')
      if (def.granularity === 'month') errs.push(tag + ': compare 不支持 granularity:"month"（按日窗口定义时间筛选即可）')
    }
    // R3 P1-5：table 条件格式 rules 与合计行 showTotals
    if (def.rules !== undefined) {
      if (def.type !== 'table') errs.push(tag + ': rules 条件格式仅 table 支持（当前 type "' + def.type + '"）')
      if (!Array.isArray(def.rules)) errs.push(tag + ': rules 必须是数组')
      else def.rules.forEach(function (ru, i) {
        if (!ru || typeof ru !== 'object' || Array.isArray(ru)) { errs.push(tag + ': rules[' + i + '] 必须是对象 {column, op, value, style}'); return }
        Object.keys(ru).forEach(function (k) { if (['column', 'op', 'value', 'style'].indexOf(k) < 0) errs.push(tag + ': rules[' + i + '] 含未知字段 "' + k + '"') })
        if (!ru.column || !String(ru.column).trim()) errs.push(tag + ': rules[' + i + '].column 必填（结果列名：指标 alias 或分组列）')
        if (!ru.op) errs.push(tag + ': rules[' + i + '].op 必填')
        if (!ru.style || typeof ru.style !== 'object' || Array.isArray(ru.style)) errs.push(tag + ': rules[' + i + '].style 必须是对象')
        else {
          const sk = Object.keys(ru.style)
          if (!sk.length) errs.push(tag + ': rules[' + i + '].style 至少含 color/background 之一')
          sk.forEach(function (k) {
            if (['color', 'background'].indexOf(k) < 0) errs.push(tag + ': rules[' + i + '].style 含不支持字段 "' + k + '"（仅 color/background）')
            else if (typeof ru.style[k] !== 'string') errs.push(tag + ': rules[' + i + '].style.' + k + ' 必须是字符串')
          })
        }
      })
    }
    if (def.showTotals !== undefined) {
      if (def.type !== 'table') errs.push(tag + ': showTotals 合计行仅 table 支持（当前 type "' + def.type + '"）')
      if (typeof def.showTotals !== 'boolean') errs.push(tag + ': showTotals 必须是布尔值')
    }
    // R4 P2-3：filtersFrom 显式声明本图接受的看板级筛选字段（数组；空数组=显式 opt-out）
    if (def.filtersFrom !== undefined) {
      if (!Array.isArray(def.filtersFrom)) errs.push(tag + ': filtersFrom 必须是字符串数组（[] 表示不接受任何看板筛选）')
      else def.filtersFrom.forEach(function (f, i) { if (typeof f !== 'string' || !f.trim()) errs.push(tag + ': filtersFrom[' + i + '] 必须是非空列名字符串') })
    }
    if (def.type === 'heatmap') {
      if (!Array.isArray(def.group_by) || def.group_by.length !== 2) errs.push(tag + ': heatmap 需要恰好 2 个 group_by 维度（第一维=X 轴，第二维=Y 轴）')
      if (def.granularity) errs.push(tag + ': heatmap 不支持 granularity（月度粒度会丢失第二维）')
    }
    if (def.join !== undefined) {
      // join：单对象（旧形态）或对象数组（链式，按序合并，后级可引用前级产出列；上限 4 级）
      const isArr = Array.isArray(def.join)
      const list = isArr ? def.join : [def.join]
      if (!isArr && (def.join === null || typeof def.join !== 'object')) errs.push(tag + ': join 必须是对象 {table, left_key, right_key}')
      else {
        if (isArr && list.length > JOIN_MAX_LEVELS) errs.push(tag + ': join 链最多 ' + JOIN_MAX_LEVELS + ' 级（当前 ' + list.length + ' 级）')
        list.forEach(function (j, ji) {
          const jt = isArr ? tag + ': join[' + ji + ']' : tag + ': join'
          if (!j || typeof j !== 'object' || Array.isArray(j)) { errs.push(jt + ' 必须是对象 {table, left_key, right_key}'); return }
          Object.keys(j).forEach(function (k) { if (['table', 'left_key', 'right_key', 'type'].indexOf(k) < 0) errs.push(jt + ' 含未知字段 "' + k + '"') })
          if (!j.table || !String(j.table).trim()) errs.push(jt + '.table 必填（关联维表名）')
          if (!j.left_key || !String(j.left_key).trim()) errs.push(jt + '.left_key 必填（主表/上一级关联列）')
          if (!j.right_key || !String(j.right_key).trim()) errs.push(jt + '.right_key 必填（维表关联列）')
          if (j.type !== undefined && ['left', 'inner'].indexOf(j.type) < 0) errs.push(jt + '.type 必须为 left/inner（缺省 left，即未命中事实行保留的缺省合并语义）')
        })
      }
    }
  }
  return errs
}
function assertChartDefs(defs, prefix) {
  const all = []
  ;(defs || []).forEach(function (d, i) { const t = prefix + (i) + (d && d.title ? '「' + d.title + '」' : ''); validateChartDef(d, t).forEach(function (m) { if (all.indexOf(m) < 0) all.push(m) }) })
  if (all.length) throw new Error('图表定义校验失败：\n- ' + all.join('\n- '))
}
// 筛选列候选只收纯列名（表达式/{expr,as} 对象不能作服务器端筛选列），join 维表纯列名可经 JS 过滤生效
function plainFilterCols(cd) { const cols = []; (cd.group_by || []).forEach(function (g2) { if (typeof g2 === 'string' && EXPR_IDENT.test(g2) && cols.indexOf(g2) < 0) cols.push(g2) }); (cd.metrics || []).forEach(function (m2) { if (m2 && typeof m2.column === 'string' && EXPR_IDENT.test(m2.column) && cols.indexOf(m2.column) < 0) cols.push(m2.column) }); return cols.slice(0, 8) }
// ===== R4 P2-3：看板级筛选的显式绑定 =====
// 缺省规则（文档化，向后兼容）：筛选列命中图表取数列（neededColumns：group_by/metrics/filters/time_column
// 及表达式引用列）才应用到该图；图表用不到该列的筛选自动跳过、不报错——join 引入维表列后，
// 旧「concat 进每个图表」的做法会让不 join 的图表拿到未知列（服务端 400 / 引用未知列异常）。
// 显式规则：图表声明 filtersFrom:["列",...] 时按声明走——可少选收窄（组内某字段不给本图）、
// 也可声明本表有但本图未取的列放宽；filtersFrom:[] 表示不接受任何看板筛选。
function chartAcceptsFilter(def, column) {
  if (!def || typeof def !== 'object') return false
  const col = String(column || '')
  if (!col) return false
  if (Array.isArray(def.filtersFrom)) return def.filtersFrom.indexOf(col) >= 0
  return neededColumns(def).indexOf(col) >= 0
}
// 对一批看板级筛选（视图筛选 extras）做图级绑定裁剪：保留本图能消费的，其余跳过（不报错）
function applyDashboardBinding(def, extras) {
  return (extras || []).filter(function (f) { return f && f.column && chartAcceptsFilter(def, f.column) })
}
// 筛选候选（render_dashboard 输出）：仍取各图 group_by 的纯列名，但仅保留「至少一个图能消费」
// 的列——filtersFrom 收窄后，只被不接收它的图表 group_by 的列不再进入候选（含仅维表可消费的列）
function dashboardFilterCandidates(charts) {
  const out = []
  ;(charts || []).forEach(function (c) {
    if (!c || !Array.isArray(c.group_by)) return
    c.group_by.forEach(function (g) {
      if (typeof g !== 'string' || !EXPR_IDENT.test(g) || out.indexOf(g) >= 0) return
      ;(charts || []).forEach(function (c2) {
        if (c2 && Array.isArray(c2.group_by) && c2.group_by.indexOf(g) >= 0 && chartAcceptsFilter(c2, g)) { out.push(g) }
      })
    })
  })
  return out
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
const RENDER_TOOL_DESC = '根据 Dashboard Schema 生成可交互看板（取数→聚合→ECharts）。图表类型含 bar/line/area/pie/scatter/heatmap(双维)/radar/funnel/gauge/table/text/kpi；多指标按图型上限（柱/线/面积≤4、表≤6、kpi≤2，2+ 指标自动双 Y 轴）；时间粒度 granularity:"day"（柱/线/面积按 time_column 日分桶，一日一个点）/"month"（按日聚合后合并为月，缺省 order_date）；agg 含 count_distinct 去重计数；支持 join 跨表关联（单对象或链式数组，join.type=left|inner）、group_by/metrics 表达式计算字段（含 hour/minute/datediff/date_add）、相对时间筛选记号（now/today-1/-30d/{relative}，输出形态按列类型自适应：date 列一律 YYYY-MM-DD）、having 聚合后筛选（{metric, op, value}）；看板级筛选绑定 filtersFrom（缺省=筛选列在图表取数列中才应用，否则跳过不报错）。展示层：metrics.format（千/万缩放/前缀/小数位）、value_map 枚举映射、kpi compare 同环比（prev_day/prev_period）、table rules 条件格式与 showTotals 合计行。'
const BI_CREATE_HEAD = '用户通过 /bi-create 请求生成看板：'
const BI_CREATE_PROMPT = '\n请按看板生成流程处理：先用 get_meta 核对字段（销售口径需 filters order_status=1，趋势图加时间过滤），再调用 render_dashboard 生成预览，回复末尾用 dsh-ui 围栏 {"kind":"dashboard","id":"<本次 previewId>"} 展示，并询问用户是否保存到「我的看板」。进阶选型（按需优先于回退 PG 视图）：二维密度/交叉分布用 type:"heatmap"（恰好 2 个 group_by 维度=XY 轴 + 1 指标）；日趋势图直接加 granularity:"day"（柱/线/面积按日分桶一日一点，时间列用 time_column 指定，缺省 order_date）、月度汇总加 granularity:"month"；一个图同时看多个指标直接写多个 metrics（柱/线/面积 ≤4 个，第 2 条 series 自动挂第二 Y 轴；表格 ≤6 列；去重计数用 agg:"count_distinct"）；需要他表维度（如大类）给图表加 join（单对象 {table:"维表", left_key:"主表列", right_key:"维表关联列"}，或多级链式对象数组，后级可引用前级产出列；可选 type:"left"|"inner"，缺省 left）；占比/客单价等派生指标把 metrics.column 写成表达式（如 "pay_amount / product_qty"，group_by 项同样支持，可用 hour/minute/datediff/date_add 等日期函数），字段与图型能力细节以系统提示中的看板 schema 为准；相对时间筛选把 filters[].value 写成记号（"today"=今天、"-30d"=近30天、BETWEEN ["today-29","today"] 等；date 列输出一律截断为 YYYY-MM-DD，timestamp 列保留完整时刻，无需按列型挑记号），看板每次打开自动重算时间窗；按聚合结果过滤（如 销售额>100 的品类）用 {metric:"<指标alias>", op, value} 形式的 filters。展示增强：指标可加 format {unit:"千"|"万", decimals, prefix:"¥"}、图表可加 value_map 枚举映射、kpi 可加 compare {type:"prev_day"|"prev_period"} 同环比（需时间筛选）、table 可加 rules 条件格式与 showTotals:true 合计行；看板级筛选绑定 filtersFrom（缺省=筛选列在图表取数列中才应用，图表用不到的筛选自动跳过）。'

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
  ctx.systemPrompt.section({ name: 'unmanned-store:dashboard-schema', order: 160, text: dashboardSchemaSection() })
    const renderTool = defineTool({ name: 'render_dashboard', description: RENDER_TOOL_DESC, parameters: { schema: { type: 'object', required: true, additionalProperties: true, properties: { title: { type: 'string' }, description: { type: 'string' }, charts: { type: 'array', items: chartDef } } } }, output: { schema: { type: 'object', additionalProperties: true }, render: (_a, v) => [{ type: 'text', text: '已生成看板「' + (v.title || '') + '」，含 ' + (v.chartCount || 0) + ' 个图表。本次预览ID: ' + (v.previewId || '') + ' —— 回复末尾的 dsh-ui 围栏必须写成 {"kind":"dashboard","id":"' + (v.previewId || '') + '"}（用上面的预览ID）。候选筛选字段: ' + ((v.filterCandidates || []).join('、') || '（无维度字段）') + ' —— 请向用户确认要用作筛选的字段；用户确认后调用 save_dashboard 时通过 filter_fields 参数传入（数组，未确认则不传）。' }] }, async execute(args, exec) { const schema = args.schema || {}; assertChartDefs(schema.charts, 'charts['); let sessionId = 'unknown'; try { sessionId = exec.agent && exec.agent.session ? exec.agent.session.id : 'unknown' } catch (e) {}; schemaSet(sessionId, schema); LAST_SCHEMA = { title: schema.title || '', description: schema.description || '', schema: schema };
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
        const filterCandidates = dashboardFilterCandidates(schema.charts)
        return { title: schema.title || '', chartCount: (schema.charts || []).length, previewId: pid, filterCandidates: filterCandidates } } })
  ctx.tools.register(renderTool)
  const saveTool = defineTool({ name: 'save_dashboard', description: '把最近生成且用户确认的看板保存到「我的看板」，每个图表作为独立项加入「全部」。', parameters: { title: { type: 'string', description: '看板名称，可选' }, filter_fields: { type: 'array', items: { type: 'string' }, description: '用户确认的筛选字段（列名数组，来自生成时的候选筛选字段）' } }, output: { schema: { type: 'object', additionalProperties: true }, render: (_a, v) => [{ type: 'text', text: '已保存 ' + (v.count || 0) + ' 个图表到我的看板。' }] }, async execute(args, exec) { let sessionId = 'unknown'; try { sessionId = exec.agent && exec.agent.session ? exec.agent.session.id : 'unknown' } catch (e) {}; const schema = schemaGet(sessionId); if (!schema || !schema.charts || !schema.charts.length) throw new Error('没有可保存的看板，请先生成看板'); assertChartDefs(schema.charts, 'charts['); const s = await readStore(); const now = new Date().toISOString(); var base = args.title || schema.title || '看板'; (schema.charts || []).forEach(function (c, i) { const ff = Array.isArray(args.filter_fields) ? args.filter_fields.filter(function (f) { return chartAcceptsFilter(c, f) }) : null; if (s.layout_custom) { s.charts.unshift({ id: String(Date.now()) + '-' + i, title: c.title || (base + ' ' + (i + 1)), type: c.type, chart_def: c, view_ids: [1], created_at: now, session_id: String(sessionId), filterable: ff && ff.length ? ff : undefined }) } else { s.charts.push({ id: String(Date.now()) + '-' + i, title: c.title || (base + ' ' + (i + 1)), type: c.type, chart_def: c, view_ids: [1], created_at: now, session_id: String(sessionId) }) } }); await queueStoreWrite(); return { count: (schema.charts || []).length, saved: true } } })
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
  biApi['bi.listCharts'] = async (args) => { const s = await readStore(); const viewId = args && args.viewId ? Number(args.viewId) : 1; const view = (s.views || []).find(function (v) { return v.id === viewId }); return { filters: (view && view.filters) || [], free_layout: viewId === 1 ? false : !!(view && view.free_layout), chart_pos: (view && view.chart_pos) || {}, layout_locked: !!s.layout_locked, charts: (s.charts || []).filter(function (c) { return viewId === 1 || (c.view_ids || []).indexOf(viewId) >= 0 }).slice().sort(function (a, b) { return s.layout_custom ? 0 : (b.created_at || '').localeCompare(a.created_at || '') }).map(function (c) { const defL = c.type === 'kpi' ? { w: 3, h: 1 } : { w: 6, h: 2 }; return { id: c.id, title: c.title, type: c.type, created_at: c.created_at, view_ids: c.view_ids || [1], session_id: c.session_id || '', table: c.chart_def ? c.chart_def.table : undefined, filterable: ((c.filterable && c.filterable.length) ? c.filterable : plainFilterCols(c.chart_def || {})).map(function (f) { return { column: f, label: NAME_MAP_ZH.fields[f] || f } }), user_filter: c.user_filter || null, layout: c.layout || defL, layout_locked: !!c.layout_locked, locked: ((view && view.chart_locks) || {})[c.id] } }) } }
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
    const exsBound = applyDashboardBinding(c.chart_def || {}, exs)
    exsBound.forEach(function (e) { if (!e || !e.column) return; const ev = String(e.value === undefined || e.value === null ? '' : e.value); const eop = ev.startsWith('\u0000!') ? '!=' : (e.op || '='); extras.push({ column: e.column, op: eop, value: eop === '!=' ? ev.slice(2) : e.value }) }); const rendered = await renderChartDef(ctx, c.chart_def, extras); rendered.id = c.id; rendered.user_filter = c.user_filter || null
    rendered.filterable = (c.filterable && c.filterable.length) ? c.filterable : plainFilterCols(c.chart_def || {}).map(function (f) { return { column: f, label: NAME_MAP_ZH.fields[f] || f } })
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
    description: '修改「我的看板」中已保存图表的定义（指标/维度/时间范围/图表类型/多指标双轴/join 跨表关联/表达式计算字段/having 聚合后筛选/指标格式化/value_map 枚举映射/kpi 同环比/表格条件格式与合计行等）。',
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
// 自检/回归钩子：仅具名导出纯函数，插件加载走 default，不影响运行时行为
export { aggregate, buildOption, neededColumns, validateChartDef, heatColor, renderChartDef, setNowProvider, resolveRelToken, currentNow, chartAcceptsFilter, applyDashboardBinding, dashboardFilterCandidates, describeCapabilities, capabilityFacts, dashboardSchemaSection, updateRepoDir, performUpdate }
export const DASH_CONTRACT_HAND = { renderTool: RENDER_TOOL_DESC, cmdPrompt: BI_CREATE_PROMPT }
