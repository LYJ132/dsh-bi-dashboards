#!/usr/bin/env node
// Verification harness for impl-bicap-r4 (feature/bi-capability-v2, governance half).
// Usage:
//   node scripts/verify-bicap-r4.mjs <libPath> <mode> [dumpFile]
//     mode = "feature" — acceptance tests: P2-3 explicit dashboard-level filter binding
//                        (chart-level filtersFrom narrow/broaden, documented default =
//                        extra filters hit only charts whose fetch columns include the
//                        field, skipped otherwise with no error; filter candidates exclude
//                        dim-only columns no chart consumes) + P2-5 describeCapabilities
//                        contract facts, against a NEW lib.
//     mode = "compat"  — backward-compat capture (works on pre-R4 lib too):
//                        old defs render + explicit extras must yield byte-identical
//                        payloads/results between pre-R4 and post-R4 libs (cmp dumps).
// Mock data-service listens on 127.0.0.1:8613 (8610/8611/8612 used by R1/R2/R3);
// global.fetch rewrites 127.0.0.1:8600 -> :8613.
import http from 'node:http'

const LIB = process.argv[2] || './lib/index.js'
const MODE = process.argv[3] || 'feature'
const DUMP = process.argv[4] || null

// ===== deterministic mock data (same shapes as R1/R3 harnesses) =====
const TABLES = {
  order_detail_raw: [
    { item_id: 1, order_no: 'A1', user_id: 'U1', order_date: '2026-03-10', order_status: 1, pay_amount: 100, product_qty: 1, product_id: 'P1', store_id: 'S1' },
    { item_id: 2, order_no: 'A1', user_id: 'U1', order_date: '2026-03-10', order_status: 1, pay_amount: 50.5, product_qty: 2, product_id: 'P2', store_id: 'S1' },
    { item_id: 3, order_no: 'A2', user_id: 'U2', order_date: '2026-03-11', order_status: 1, pay_amount: 80, product_qty: 1, product_id: 'P1', store_id: 'S2' },
    { item_id: 4, order_no: 'A3', user_id: 'U3', order_date: '2026-03-11', order_status: 0, pay_amount: 30, product_qty: 1, product_id: 'P3', store_id: 'S2' },
    { item_id: 5, order_no: 'A4', user_id: 'U2', order_date: '2026-03-12', order_status: 1, pay_amount: 120, product_qty: 3, product_id: 'P1', store_id: 'S1' },
    { item_id: 6, order_no: 'A5', user_id: 'U4', order_date: '2026-03-12', order_status: 1, pay_amount: 60, product_qty: 2, product_id: 'P2', store_id: 'S2' }
  ],
  product_main: [
    { product_id: 'P1', product_name: '茶饮料', cate_code: 'CATE_A', product_price: 25 },
    { product_id: 'P2', product_name: '咖啡', cate_code: 'CATE_A', product_price: 20 },
    { product_id: 'P3', product_name: '薯片', cate_code: 'CATE_B', product_price: 15 }
  ],
  category_dim: [
    { cate_code: 'CATE_A', cate_name: '饮料', big_category: '饮料', mid_category: '饮料-茶咖' },
    { cate_code: 'CATE_B', cate_name: '零食', big_category: '零食', mid_category: '零食-膨化' },
    { cate_code: 'CATE_C', cate_name: '便当', big_category: '便当', mid_category: '便当-加热' }
  ],
  sales_big: [
    { order_date: '2026-03-10', order_status: 1, pay_amount: 6698990, product_qty: 3 },
    { order_date: '2026-03-11', order_status: 1, pay_amount: 1234567, product_qty: 2 }
  ]
}

function cmpNum(a, b) { const na = Number(a), nb = Number(b); if (Number.isFinite(na) && Number.isFinite(nb)) return na < nb ? -1 : na > nb ? 1 : 0; return String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0 }
function emptyV(v) { return v === null || v === undefined || v === '' }
function matchFilter(row, f) {
  const v = row[f.column], op = f.op, fv = f.value
  if (op === 'IS_NULL') return emptyV(v)
  if (op === 'IS_NOT_NULL') return !emptyV(v)
  if (op === '=') return String(v) === String(fv)
  if (op === '!=') return String(v) !== String(fv)
  if (op === 'IN') return Array.isArray(fv) && fv.some(x => String(v) === String(x))
  if (op === 'NOT_IN') return Array.isArray(fv) && !fv.some(x => String(v) === String(x))
  if (op === 'BETWEEN') { const a = Array.isArray(fv) ? fv : []; return a.length >= 2 && !emptyV(v) && cmpNum(v, a[0]) >= 0 && cmpNum(v, a[1]) <= 0 }
  if (op === 'LIKE' || op === 'ILIKE') return !emptyV(v) && String(v).toLowerCase() === String(fv).toLowerCase()
  if (['>', '>=', '<', '<='].indexOf(op) >= 0) { if (emptyV(v) || emptyV(fv)) return false; const c = cmpNum(v, fv); return op === '>' ? c > 0 : op === '>=' ? c >= 0 : op === '<' ? c < 0 : c <= 0 }
  return true
}

const receivedPayloads = []
const server = http.createServer((req, res) => {
  let body = ''
  req.on('data', c => { body += c })
  req.on('end', () => {
    const url = req.url || ''
    if (req.method === 'POST' && url === '/api/query') {
      const p = JSON.parse(body || '{}')
      receivedPayloads.push(JSON.stringify(p))
      let rows = TABLES[p.table] || []
      ;(p.filters || []).forEach(f => { rows = rows.filter(r => matchFilter(r, f)) })
      if (Array.isArray(p.columns) && p.columns.length) rows = rows.map(r => { const o = {}; p.columns.forEach(c => { o[c] = r[c] }); return o })
      if (p.limit) rows = rows.slice(0, p.limit)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ rows }))
      return
    }
    const m = /^\/api\/meta\/table\/(.+)$/.exec(url)
    if (req.method === 'GET' && m) {
      const t = decodeURIComponent(m[1])
      const cols = (TABLES[t] || []).length ? Object.keys(TABLES[t][0]) : null
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ table: t, columns: cols ? cols.map(n => ({ name: n })) : [] }))
      return
    }
    res.writeHead(404); res.end('not found')
  })
})
await new Promise(ok => server.listen(8613, '127.0.0.1', ok))
const realFetch = global.fetch
global.fetch = (url, init) => realFetch(String(url).replace('127.0.0.1:8600', '127.0.0.1:8613'), init)

const lib = await import(new URL(LIB, 'file://' + process.cwd() + '/').href)
const { renderChartDef, validateChartDef, chartAcceptsFilter, applyDashboardBinding, dashboardFilterCandidates } = lib
const ctx = {}
let pass = 0, fail = 0
function check(name, cond, detail) { if (cond) { pass++; console.log('PASS ' + name) } else { fail++; console.log('FAIL ' + name + (detail ? ' :: ' + detail : '')) } }

// ===== old-style defs (pre-R4 shapes; capture must be byte-identical pre/post R4) =====
const COMPAT_DEFS = [
  { type: 'bar', title: '近7日销售额', table: 'order_detail_raw', filters: [{ column: 'order_status', op: '=', value: 1 }, { column: 'order_date', op: 'BETWEEN', value: ['2026-03-08', '2026-03-14'] }], group_by: ['order_date'], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }] },
  { type: 'kpi', title: '当日销售额', table: 'order_detail_raw', filters: [{ column: 'order_date', op: '=', value: '2026-03-10' }, { column: 'order_status', op: '=', value: 1 }], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }] },
  { type: 'pie', title: '品类销售占比', table: 'order_detail_raw', filters: [{ column: 'order_status', op: '=', value: 1 }], group_by: ['product_id'], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }] },
  { type: 'table', title: '按日汇总', table: 'order_detail_raw', group_by: ['order_date'], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }] },
  { type: 'bar', title: '两级链分组', table: 'order_detail_raw', join: [{ table: 'product_main', left_key: 'product_id', right_key: 'product_id' }, { table: 'category_dim', left_key: 'cate_code', right_key: 'cate_code' }], group_by: ['mid_category'], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }] },
  { type: 'bar', title: '维表列筛选', table: 'order_detail_raw', join: { table: 'category_dim', left_key: 'cate_code', right_key: 'cate_code' }, filters: [{ column: 'big_category', op: '=', value: '饮料' }], group_by: ['cate_name'], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }] }
]
const compatResults = []
for (const def of COMPAT_DEFS) {
  const errs = validateChartDef(def, 't')
  if (errs.length) console.log('compat def rejected: ' + errs.join('; '))
  compatResults.push(JSON.stringify(await renderChartDef(ctx, def)))
}
if (MODE === 'compat') {
  const out = JSON.stringify({ payloads: receivedPayloads, results: compatResults })
  if (DUMP) { const fs = await import('node:fs'); fs.writeFileSync(DUMP, out) }
  console.log('compat capture: ' + receivedPayloads.length + ' payloads, ' + compatResults.length + ' results -> ' + (DUMP || '(stdout)'))
  server.close(); process.exit(0)
}

// ===== feature tests (post-R4 lib only) =====

// T1 documented default: field in fetch columns -> accepted; otherwise skipped silently
{
  const def = { type: 'bar', title: '日销售', table: 'order_detail_raw', filters: [{ column: 'order_status', op: '=', value: 1 }], group_by: ['order_date'], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }] }
  check('T1 default accepts group_by/metric/filter columns', chartAcceptsFilter(def, 'order_date') && chartAcceptsFilter(def, 'pay_amount') && chartAcceptsFilter(def, 'order_status'), '')
  check('T1 default rejects unreferenced column', chartAcceptsFilter(def, 'store_id') === false && chartAcceptsFilter(def, 'big_category') === false, '')
}
// T2 filtersFrom narrows
{
  const def = { type: 'bar', title: '日销售', table: 'order_detail_raw', group_by: ['order_date'], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }], filtersFrom: ['order_status'] }
  const errs = validateChartDef(def, 't')
  check('T2 validate clean', errs.length === 0, errs.join('; '))
  check('T2 declared field accepted though unreferenced', chartAcceptsFilter(def, 'order_status') === true, '')
  check('T2 non-declared group_by column rejected', chartAcceptsFilter(def, 'order_date') === false, '')
}
// T3 filtersFrom broadens
{
  const def = { type: 'kpi', title: '销售额', table: 'order_detail_raw', metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }], filtersFrom: ['store_id'] }
  check('T3 broaden: table column not in fetch columns accepted', chartAcceptsFilter(def, 'store_id') === true, '')
}
// T4 filtersFrom:[] explicit opt-out
{
  const def = { type: 'bar', title: '日销售', table: 'order_detail_raw', group_by: ['order_date'], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }], filtersFrom: [] }
  check('T4 empty filtersFrom accepts nothing', chartAcceptsFilter(def, 'order_date') === false && chartAcceptsFilter(def, 'store_id') === false, '')
}
// T5 named-field errors for bad filtersFrom
{
  const bad1 = { type: 'bar', title: 'x', table: 'order_detail_raw', group_by: ['order_date'], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }], filtersFrom: 'order_date' }
  const bad2 = { type: 'bar', title: 'x', table: 'order_detail_raw', group_by: ['order_date'], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }], filtersFrom: ['ok', ''] }
  const e1 = validateChartDef(bad1, 'charts[0]'), e2 = validateChartDef(bad2, 'charts[0]')
  check('T5 non-array filtersFrom named error', e1.length === 1 && e1[0].includes('filtersFrom 必须是字符串数组'), e1.join('; '))
  check('T5 empty string item named error', e2.some(x => x.includes('filtersFrom[1]')), e2.join('; '))
}
// T6 applyDashboardBinding: dashboard filters narrowed per chart, skipped without error
{
  const chartA = { type: 'bar', title: '品类销售', table: 'order_detail_raw', join: [{ table: 'product_main', left_key: 'product_id', right_key: 'product_id' }, { table: 'category_dim', left_key: 'cate_code', right_key: 'cate_code' }], filters: [{ column: 'order_status', op: '=', value: 1 }], group_by: ['big_category'], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }] }
  const chartB = { type: 'bar', title: '日销售', table: 'order_detail_raw', filters: [{ column: 'order_status', op: '=', value: 1 }], group_by: ['order_date'], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }] }
  const exs = [{ column: 'order_status', op: '=', value: 1 }, { column: 'big_category', op: '=', value: '饮料' }]
  const forA = applyDashboardBinding(chartA, exs)
  const forB = applyDashboardBinding(chartB, exs)
  check('T6 join chart gets both filters', forA.length === 2 && forA.some(f => f.column === 'big_category'), JSON.stringify(forA))
  check('T6 plain chart gets only its column; dim filter skipped silently', forB.length === 1 && forB[0].column === 'order_status', JSON.stringify(forB))
  // payload proof: chartB rendered with bound extras -> payload has no big_category; full extras would be an unknown-column error
  receivedPayloads.length = 0
  await renderChartDef(ctx, chartB, forB)
  const pB = JSON.parse(receivedPayloads[0])
  check('T6 chartB payload free of dim-only column', !pB.filters.some(f => f.column === 'big_category'), JSON.stringify(pB.filters))
  check('T6 chartB payload keeps bound column filter', pB.filters.some(f => f.column === 'order_status'), JSON.stringify(pB.filters))
  // unbound render of chartA: dim filter goes to JS path, not into payload
  receivedPayloads.length = 0
  await renderChartDef(ctx, chartA, forA)
  const pA = JSON.parse(receivedPayloads.find(x => JSON.parse(x).table === 'order_detail_raw'))
  check('T6 dim filter not in payload (JS-side)', !pA.filters.some(f => f.column === 'big_category'), JSON.stringify(pA.filters))
  const dimPayload = receivedPayloads.map(x => JSON.parse(x)).find(p => p.table === 'category_dim')
  check('T6 dim query fetched for join chain', !!dimPayload, '')
}
// T7 candidates: exclude dim-only columns no chart consumes (filtersFrom narrowing)
{
  const chartA = { type: 'bar', title: '品类销售', table: 'order_detail_raw', join: [{ table: 'product_main', left_key: 'product_id', right_key: 'product_id' }, { table: 'category_dim', left_key: 'cate_code', right_key: 'cate_code' }], filters: [{ column: 'order_status', op: '=', value: 1 }], group_by: ['big_category'], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }] }
  const chartB = { type: 'bar', title: '日销售', table: 'order_detail_raw', filters: [{ column: 'order_status', op: '=', value: 1 }], group_by: ['order_date'], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }] }
  const chartC = { type: 'bar', title: '中类销售', table: 'order_detail_raw', join: [{ table: 'product_main', left_key: 'product_id', right_key: 'product_id' }, { table: 'category_dim', left_key: 'cate_code', right_key: 'cate_code' }], group_by: ['mid_category'], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }], filtersFrom: ['order_date'] }
  const cands = dashboardFilterCandidates([chartA, chartB, chartC])
  check('T7 consumed dim column offered', cands.indexOf('big_category') >= 0, JSON.stringify(cands))
  check('T7 plain column offered', cands.indexOf('order_date') >= 0, JSON.stringify(cands))
  check('T7 dim-only column excluded when only chart declaring filtersFrom rejects it', cands.indexOf('mid_category') < 0, JSON.stringify(cands))
  check('T7 no expression aliases in candidates', dashboardFilterCandidates([{ type: 'bar', title: 'x', table: 'order_detail_raw', group_by: [{ expr: 'month(order_date)', as: 'm' }], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }] }]).length === 0, '')
}
// T8 P2-5 describeCapabilities contract facts
{
  const facts = lib.capabilityFacts()
  const all = lib.describeCapabilities()
  check('T8 facts cover metric caps', facts.includes('bar/line/area≤4') && facts.includes('table≤6') && facts.includes('kpi≤2'), facts)
  check('T8 facts cover join cap + type', facts.includes('≤4级') && facts.includes('left|inner'), '')
  check('T8 facts cover all expr funcs', ['abs', 'round', 'datediff', 'date_add', 'coalesce', 'concat'].every(f => facts.includes(f)), '')
  check('T8 facts cover rel tokens/units', facts.includes('now/today') && facts.includes('d/w/m/y/h/min'), '')
  check('T8 facts cover having/format/value_map/rules/compare/filtersFrom', ['having', 'decimals 0~6', 'value_map', 'showTotals', 'prev_day|prev_period', 'filtersFrom'].every(k => facts.includes(k)), '')
  check('T8 section contains facts verbatim', lib.dashboardSchemaSection().includes(all), '')
  check('T8 radar-line caveat + client-strip caveat stay in section', all.includes('radar 当前按折线渲染') && all.includes('客户端表格暂不渲染样式'), '')
}
// T9 compat shape: rendering old defs WITH extras still byte-stable (no join): payload unchanged vs pre-R4 semantics
{
  const def = { type: 'bar', title: '旧图', table: 'order_detail_raw', group_by: ['order_date'], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }] }
  receivedPayloads.length = 0
  const r = await renderChartDef(ctx, def, [{ column: 'order_date', op: '=', value: '2026-03-10' }])
  const p = JSON.parse(receivedPayloads[0])
  check('T9 old def + in-column extra filter identical payload shape', JSON.stringify(p.filters) === JSON.stringify([{ column: 'order_date', op: '=', value: '2026-03-10' }]) && r.rows.length === 1, JSON.stringify(p.filters))
}

console.log('\n' + pass + ' passed, ' + fail + ' failed')
server.close()
process.exit(fail ? 1 : 0)
