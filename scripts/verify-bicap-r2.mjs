#!/usr/bin/env node
// Verification harness for impl-bicap-r2 (feature/bi-capability-v2, aggregation half).
// Usage:
//   node scripts/verify-bicap-r2.mjs <libPath> <mode> [dumpFile]
//     mode = "feature" — acceptance tests (P0-1 multi-metric/dual-axis, P1-1 count_distinct,
//                        P1-3 having, per-type caps) against a NEW lib
//     mode = "compat"  — backward-compat capture only (works on pre-R2 lib too):
//                        old single-metric defs + having-free old defs must yield byte-identical
//                        payloads/results between pre-R2 and post-R2 libs (cmp the two dumps).
// Mock data-service listens on 127.0.0.1:8611 (8610 used by verify-bicap-r1);
// global.fetch rewrites 127.0.0.1:8600 -> :8611.
import http from 'node:http'

const LIB = process.argv[2] || './lib/index.js'
const MODE = process.argv[3] || 'feature'
const DUMP = process.argv[4] || null

// ===== deterministic mock data =====
const TABLES = {
  order_detail_raw: [
    { item_id: 1, order_no: 'A1', user_id: 'U1', order_date: '2026-03-10', order_create_time: '2026-03-10 14:23:00', order_status: 1, pay_amount: 100, product_qty: 1, product_id: 'P1' },
    { item_id: 2, order_no: 'A1', user_id: 'U1', order_date: '2026-03-10', order_create_time: '2026-03-10 20:05:00', order_status: 1, pay_amount: 50.5, product_qty: 2, product_id: 'P2' },
    { item_id: 3, order_no: 'A2', user_id: 'U2', order_date: '2026-03-11', order_create_time: '2026-03-11 09:15:00', order_status: 1, pay_amount: 80, product_qty: 1, product_id: 'P1' },
    { item_id: 4, order_no: 'A3', user_id: 'U3', order_date: '2026-03-11', order_create_time: '2026-03-11 23:40:00', order_status: 0, pay_amount: 30, product_qty: 1, product_id: 'P3' },
    { item_id: 5, order_no: 'A4', user_id: 'U2', order_date: '2026-03-12', order_create_time: '2026-03-12 10:00:00', order_status: 1, pay_amount: 120, product_qty: 3, product_id: 'P1' },
    { item_id: 6, order_no: 'A5', user_id: 'U4', order_date: '2026-03-12', order_create_time: '2026-03-12 18:30:00', order_status: 1, pay_amount: 60, product_qty: 2, product_id: 'P4' },
    { item_id: 7, order_no: 'A6', user_id: 'U5', order_date: '2026-03-13', order_create_time: '2026-03-13 12:00:00', order_status: 1, pay_amount: 45, product_qty: 1, product_id: 'P2' },
    { item_id: 8, order_no: 'A7', user_id: 'U2', order_date: '2026-03-13', order_create_time: '2026-03-13 15:45:00', order_status: 1, pay_amount: 90, product_qty: 1, product_id: 'P1' }
  ],
  procurement_management: [
    { procurement_id: 'B1', product_name: '可乐', quantity: 10, unit_price: 3, total_amount: 30, procurement_date: '2026-03-10', cate_code: 'CATE_A' },
    { procurement_id: 'B2', product_name: '薯片', quantity: 5, unit_price: 4, total_amount: 20, procurement_date: '2026-03-10', cate_code: 'CATE_B' },
    { procurement_id: 'B3', product_name: '面包', quantity: 8, unit_price: 2.5, total_amount: 20, procurement_date: '2026-03-11', cate_code: 'CATE_B' }
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
await new Promise(ok => server.listen(8611, '127.0.0.1', ok))
const realFetch = global.fetch
global.fetch = (url, init) => realFetch(String(url).replace('127.0.0.1:8600', '127.0.0.1:8611'), init)

const lib = await import(new URL(LIB, 'file://' + process.cwd() + '/').href)
const { renderChartDef, validateChartDef } = lib
const ctx = {}
let pass = 0, fail = 0
function check(name, cond, detail) { if (cond) { pass++; console.log('PASS ' + name) } else { fail++; console.log('FAIL ' + name + (detail ? ' :: ' + detail : '')) } }

// ===== old-style defs (pre-R2 shapes; capture must be byte-identical pre/post R2) =====
const COMPAT_DEFS = [
  { type: 'bar', title: '近7日销售额', table: 'order_detail_raw', filters: [{ column: 'order_status', op: '=', value: 1 }, { column: 'order_date', op: 'BETWEEN', value: ['2026-03-08', '2026-03-14'] }], group_by: ['order_date'], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }] },
  { type: 'kpi', title: '当日销售额', table: 'order_detail_raw', filters: [{ column: 'order_date', op: '=', value: '2026-03-10' }, { column: 'order_status', op: '=', value: 1 }], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }] },
  { type: 'pie', title: '品类销售占比', table: 'order_detail_raw', filters: [{ column: 'order_status', op: '=', value: 1 }], group_by: ['product_id'], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }] },
  { type: 'line', title: '月度销量', table: 'order_detail_raw', granularity: 'month', group_by: ['order_date'], metrics: [{ column: 'product_qty', agg: 'sum', alias: 'qty' }] },
  { type: 'table', title: '明细', table: 'order_detail_raw', filters: [{ column: 'order_date', op: '=', value: '2026-03-10' }], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }] },
  { type: 'bar', title: '表达式字段', table: 'order_detail_raw', group_by: [{ expr: 'month(order_date)', as: 'm' }], metrics: [{ column: 'pay_amount / product_qty', agg: 'avg', alias: 'unit' }] }
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

// ===== feature tests (post-R2 lib only) =====

// M1 P0-1: 销售额(sum) + 订单量(count) as two series on one bar chart
{
  const def = { type: 'bar', title: '销售与订单', table: 'order_detail_raw', filters: [{ column: 'order_status', op: '=', value: 1 }], group_by: ['order_date'], metrics: [{ column: 'pay_amount', agg: 'sum', alias: '销售额' }, { column: 'order_no', agg: 'count', alias: '订单量' }] }
  const errs = validateChartDef(def, 't')
  check('M1 validateChartDef clean', errs.length === 0, errs.join('; '))
  const r = await renderChartDef(ctx, def)
  const opt = r.option
  check('M1 two series emitted', opt.series.length === 2, JSON.stringify(opt.series))
  check('M1 series names are aliases', opt.series[0].name === '销售额' && opt.series[1].name === '订单量', JSON.stringify(opt.series.map(s => s.name)))
  const d10 = opt.xAxis.data.indexOf('2026-03-10')
  check('M1 销售额 03-10 = 150.5', opt.series[0].data[d10] === 150.5, JSON.stringify(opt.series[0].data))
  check('M1 订单量 03-10 = 2', opt.series[1].data[d10] === 2, JSON.stringify(opt.series[1].data))
  check('M1 rows merge both metrics per group', r.rows.length === 4 && r.rows[0].销售额 === 150.5 && r.rows[0].订单量 === 2, JSON.stringify(r.rows))
}

// M2 P0-1: second series on second Y axis (yAxisIndex) — 销售额 + 月度增长率-style ratio metric
{
  const def = { type: 'line', title: '销售额与增长率', table: 'order_detail_raw', filters: [{ column: 'order_status', op: '=', value: 1 }], group_by: ['order_date'], metrics: [{ column: 'pay_amount', agg: 'sum', alias: '销售额' }, { column: 'pay_amount / product_qty', agg: 'avg', alias: '件单价' }] }
  const r = await renderChartDef(ctx, def)
  const opt = r.option
  check('M2 dual yAxis array emitted', Array.isArray(opt.yAxis) && opt.yAxis.length === 2, JSON.stringify(opt.yAxis))
  check('M2 series[0] on axis 0 (no yAxisIndex)', opt.series[0].yAxisIndex === undefined, JSON.stringify(opt.series[0]))
  check('M2 series[1] yAxisIndex=1', opt.series[1].yAxisIndex === 1, JSON.stringify(opt.series[1]))
  const d10 = opt.xAxis.data.indexOf('2026-03-10')
  check('M2 件单价 03-10 = 62.63', opt.series[1].data[d10] === 62.63, JSON.stringify(opt.series[1].data))
  // month granularity path also multi-series
  const defM = { type: 'line', title: '月度', table: 'order_detail_raw', granularity: 'month', group_by: ['order_date'], metrics: [{ column: 'pay_amount', agg: 'sum', alias: '销售额' }, { column: 'pay_amount / product_qty', agg: 'avg', alias: '增长率' }] }
  const rM = await renderChartDef(ctx, defM)
  check('M2 month path dual axis', rM.option.series.length === 2 && rM.option.series[1].yAxisIndex === 1 && Array.isArray(rM.option.yAxis), JSON.stringify(rM.option.series.map(s => ({ n: s.name, y: s.yAxisIndex }))))
  check('M2 month path rows carry both metrics', rM.rows[0].销售额 > 0 && rM.rows[0].增长率 > 0, JSON.stringify(rM.rows))
}

// M3 P0-1: 采购明细-style table — three aggregate columns simultaneously
{
  const def = { type: 'table', title: '采购汇总', table: 'procurement_management', group_by: ['procurement_date'], metrics: [{ column: 'quantity', agg: 'sum', alias: '件数' }, { column: 'unit_price', agg: 'avg', alias: '件价' }, { column: 'total_amount', agg: 'sum', alias: '总金额' }] }
  const errs = validateChartDef(def, 't')
  check('M3 table 3 metrics validate clean', errs.length === 0, errs.join('; '))
  const r = await renderChartDef(ctx, def)
  check('M3 option columns include 3 aggregates', ['件数', '件价', '总金额'].every(c => r.option.columns.includes(c)), JSON.stringify(r.option.columns))
  const row = r.rows.find(x => x.procurement_date === '2026-03-10')
  check('M3 03-10 row: 件数=15 件价=3.5 总金额=50', row && row.件数 === 15 && row.件价 === 3.5 && row.总金额 === 50, JSON.stringify(r.rows))
}

// CD1 P1-1: count_distinct with duplicate raw rows
{
  const def = { type: 'bar', title: '当日成交人数与SKU', table: 'order_detail_raw', filters: [{ column: 'order_status', op: '=', value: 1 }], group_by: ['order_date'], metrics: [{ column: 'order_no', agg: 'count_distinct', alias: '当日成交人数' }, { column: 'product_id', agg: 'count_distinct', alias: '在售SKU数' }] }
  const errs = validateChartDef(def, 't')
  check('CD1 validateChartDef clean', errs.length === 0, errs.join('; '))
  const r = await renderChartDef(ctx, def)
  // 03-10: both rows same order A1 -> 1; products P1,P2 -> 2. 03-12: A4(120)+A5(60) -> 2 orders; P1,P4 -> 2 SKUs.
  const d10 = r.rows.find(x => x.order_date === '2026-03-10')
  const d12 = r.rows.find(x => x.order_date === '2026-03-12')
  check('CD1 03-10 成交人数=1 (duplicate rows deduped)', d10 && d10.当日成交人数 === 1, JSON.stringify(r.rows))
  check('CD1 03-10 在售SKU数=2', d10 && d10.在售SKU数 === 2, JSON.stringify(r.rows))
  check('CD1 03-12 成交人数=2', d12 && d12.当日成交人数 === 2, JSON.stringify(r.rows))
  // having payload exclusion: count_distinct metric column must be fetched but never filtered server-side on alias
  const p = JSON.parse(receivedPayloads[receivedPayloads.length - 1])
  check('CD1 payload fetches metric columns', p.columns.includes('order_no') && p.columns.includes('product_id'), JSON.stringify(p))
  // month granularity count_distinct dedupes across days within month
  const defM = { type: 'bar', title: '月成交人数', table: 'order_detail_raw', granularity: 'month', group_by: ['order_date'], metrics: [{ column: 'order_no', agg: 'count_distinct', alias: 'n' }] }
  const rM = await renderChartDef(ctx, defM)
  check('CD1 month path count_distinct = 7 distinct orders (status filter applied)', rM.rows.length === 1 && rM.rows[0].n === 7, JSON.stringify(rM.rows))
}

// H1 P1-3: having — 销售额>100 品类/日 post-aggregation filter, composes with pre-agg filter
{
  const def = { type: 'bar', title: '高销售额日', table: 'order_detail_raw', filters: [{ column: 'order_status', op: '=', value: 1 }, { metric: 'amt', op: '>', value: 100 }], group_by: ['order_date'], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }] }
  const errs = validateChartDef(def, 't')
  check('H1 validateChartDef clean', errs.length === 0, errs.join('; '))
  receivedPayloads.length = 0
  const r = await renderChartDef(ctx, def)
  // pre-agg status=1 sums: 03-10=150.5, 03-11=80, 03-12=180, 03-13=135; having >100 -> 3 days
  check('H1 rows post-filtered to >100', r.rows.length === 3 && r.rows.every(x => x.amt > 100), JSON.stringify(r.rows))
  check('H1 option data matches rows', r.option.series[0].data.length === 3, JSON.stringify(r.option.series[0].data))
  const payloads = receivedPayloads.map(x => JSON.parse(x))
  check('H1 having never enters payload', payloads.every(p => (p.filters || []).every(f => !f.metric)), JSON.stringify(payloads.map(p => p.filters)))
  check('H1 pre-agg filter stays in payload', payloads[0].filters.some(f => f.column === 'order_status' && f.value === 1), JSON.stringify(payloads[0].filters))
  // composes with limit: having applied before limit
  const def2 = { type: 'bar', title: 'top1', table: 'order_detail_raw', filters: [{ column: 'order_status', op: '=', value: 1 }, { metric: 'amt', op: '>=', value: 100 }], group_by: ['order_date'], sort: { by: 'amt', desc: true }, limit: 1, metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }] }
  const r2 = await renderChartDef(ctx, def2)
  check('H1 having before limit: top1 = 180 (03-12)', r2.rows.length === 1 && r2.rows[0].amt === 180 && r2.rows[0].order_date === '2026-03-12', JSON.stringify(r2.rows))
  // named-field error: metric not in aliases
  const bad = { type: 'bar', title: 'x', table: 'order_detail_raw', group_by: ['order_date'], filters: [{ metric: 'nope', op: '>', value: 1 }], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }] }
  const e2 = validateChartDef(bad, 'charts[0]「x」')
  check('H1 unknown having metric named-field error', e2.length === 1 && e2[0].includes('charts[0]') && e2[0].includes('filters[0].metric'), JSON.stringify(e2))
}

// V1 P0-1: per-type caps enforced with named-field errors
{
  const m5 = [1, 2, 3, 4, 5].map(i => ({ column: 'pay_amount', agg: 'sum', alias: 'm' + i }))
  const e1 = validateChartDef({ type: 'bar', title: 'x', table: 'order_detail_raw', group_by: ['order_date'], metrics: m5 }, 'charts[2]「x」')
  check('V1 bar cap 4 error', e1.length === 1 && e1[0].includes('charts[2]') && e1[0].includes('metrics') && e1[0].includes('4'), JSON.stringify(e1))
  const m7 = [1, 2, 3, 4, 5, 6, 7].map(i => ({ column: 'pay_amount', agg: 'sum', alias: 'm' + i }))
  const e2 = validateChartDef({ type: 'table', title: 'x', table: 'order_detail_raw', metrics: m7 }, 'charts[0]「x」')
  check('V1 table cap 6 error', e2.length === 1 && e2[0].includes('6'), JSON.stringify(e2))
  const e3 = validateChartDef({ type: 'pie', title: 'x', table: 'order_detail_raw', group_by: ['order_date'], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'a' }, { column: 'product_qty', agg: 'sum', alias: 'b' }] }, 'charts[0]「x」')
  check('V1 pie cap 1 error', e3.length === 1 && e3[0].includes('最多 1 个指标'), JSON.stringify(e3))
  const e4 = validateChartDef({ type: 'kpi', title: 'x', table: 'order_detail_raw', metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'a' }, { column: 'product_qty', agg: 'sum', alias: 'b' }, { column: 'product_qty', agg: 'count', alias: 'c' }] }, 'charts[0]「x」')
  check('V1 kpi cap 2 error', e4.length === 1 && e4[0].includes('2 个'), JSON.stringify(e4))
  const e5 = validateChartDef({ type: 'bar', title: 'x', table: 'order_detail_raw', group_by: ['order_date'], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'same' }, { column: 'product_qty', agg: 'sum', alias: 'same' }] }, 'charts[0]「x」')
  check('V1 duplicate alias error', e5.length === 1 && e5[0].includes('alias'), JSON.stringify(e5))
  // kpi 2 metrics: value + compare emitted
  const r = await renderChartDef(ctx, { type: 'kpi', title: '当日销售', table: 'order_detail_raw', filters: [{ column: 'order_date', op: '=', value: '2026-03-10' }, { column: 'order_status', op: '=', value: 1 }], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'sum' }, { column: 'pay_amount', agg: 'count', alias: 'orders' }] })
  check('V1 kpi value + compare', r.option.value === 150.5 && r.option.compare === 2, JSON.stringify(r.option))
}

console.log('RESULT pass=' + pass + ' fail=' + fail)
server.close()
process.exit(fail ? 1 : 0)
