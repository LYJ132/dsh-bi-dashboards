#!/usr/bin/env node
// Verification harness for impl-bicap-r1 (feature/bi-capability-v2).
// Usage:
//   node scripts/verify-bicap-r1.mjs <libPath> <mode> [dumpFile]
//     mode = "feature" — full acceptance tests (P0-2/P0-3/P0-4/P1-4) against a NEW lib
//     mode = "compat"  — backward-compat capture only (works on master lib too)
// The compat dump (all /api/query payloads in arrival order + renderChartDef results
// for every old-style chart def) must be byte-identical between master and new lib.
// Mock data-service listens on 127.0.0.1:8610 (port OFF 8600, like prior feat);
// global.fetch rewrites 127.0.0.1:8600 -> :8610 so both master (hard default 8600)
// and new lib are exercised through the same mock.
import http from 'node:http'

const LIB = process.argv[2] || './lib/index.js'
const MODE = process.argv[3] || 'feature'
const DUMP = process.argv[4] || null

// ===== deterministic mock data =====
const TABLES = {
  order_detail_raw: [
    { item_id: 1, order_no: 'A1', order_date: '2026-03-10', order_create_time: '2026-03-10 14:23:00', order_status: 1, pay_amount: 100, product_qty: 1, product_id: 'P1' },
    { item_id: 2, order_no: 'A1', order_date: '2026-03-10', order_create_time: '2026-03-10 20:05:00', order_status: 1, pay_amount: 50.5, product_qty: 2, product_id: 'P2' },
    { item_id: 3, order_no: 'A2', order_date: '2026-03-11', order_create_time: '2026-03-11 09:15:00', order_status: 1, pay_amount: 80, product_qty: 1, product_id: 'P1' },
    { item_id: 4, order_no: 'A2', order_date: '2026-03-11', order_create_time: '2026-03-11 23:40:00', order_status: 0, pay_amount: 30, product_qty: 1, product_id: 'P3' },
    { item_id: 5, order_no: 'A3', order_date: '2026-03-12', order_create_time: '2026-03-12 10:00:00', order_status: 1, pay_amount: 120, product_qty: 3, product_id: 'P1' },
    { item_id: 6, order_no: 'A3', order_date: '2026-03-12', order_create_time: '2026-03-12 18:30:00', order_status: 1, pay_amount: 60, product_qty: 2, product_id: 'P4' },
    { item_id: 7, order_no: 'A4', order_date: '2026-03-13', order_create_time: '2026-03-13 12:00:00', order_status: 1, pay_amount: 45, product_qty: 1, product_id: 'P2' },
    { item_id: 8, order_no: 'A4', order_date: '2026-03-13', order_create_time: '2026-03-13 15:45:00', order_status: 1, pay_amount: 90, product_qty: 1, product_id: 'P1' }
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
await new Promise(ok => server.listen(8610, '127.0.0.1', ok))
const realFetch = global.fetch
global.fetch = (url, init) => realFetch(String(url).replace('127.0.0.1:8600', '127.0.0.1:8610'), init)

const lib = await import(new URL(LIB, 'file://' + process.cwd() + '/').href)
const { renderChartDef, validateChartDef } = lib
const ctx = {}
let pass = 0, fail = 0
function check(name, cond, detail) { if (cond) { pass++; console.log('PASS ' + name) } else { fail++; console.log('FAIL ' + name + (detail ? ' :: ' + detail : '')) } }

// ===== old-style defs (backward compat capture: master vs new must be identical) =====
const COMPAT_DEFS = [
  { type: 'bar', title: '近7日销售额', table: 'order_detail_raw', filters: [{ column: 'order_status', op: '=', value: 1 }, { column: 'order_date', op: 'BETWEEN', value: ['2026-03-08', '2026-03-14'] }], group_by: ['order_date'], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }] },
  { type: 'kpi', title: '当日销售额', table: 'order_detail_raw', filters: [{ column: 'order_date', op: '=', value: '2026-03-10' }, { column: 'order_status', op: '=', value: 1 }], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }] },
  { type: 'pie', title: '品类销售占比', table: 'order_detail_raw', join: { table: 'product_main', left_key: 'product_id', right_key: 'product_id' }, filters: [{ column: 'order_status', op: '=', value: 1 }, { column: 'cate_code', op: '=', value: 'CATE_A' }], group_by: ['cate_code'], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }] },
  { type: 'line', title: '月度销量', table: 'order_detail_raw', granularity: 'month', group_by: ['order_date'], metrics: [{ column: 'product_qty', agg: 'sum', alias: 'qty' }] },
  { type: 'table', title: '明细', table: 'order_detail_raw', filters: [{ column: 'order_date', op: '=', value: '2026-03-10' }], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }] },
  { type: 'bar', title: '表达式字段', table: 'order_detail_raw', group_by: [{ expr: 'month(order_date)', as: 'm' }], metrics: [{ column: 'pay_amount / product_qty', agg: 'avg', alias: 'unit' }] }
]
const compatResults = []
for (const def of COMPAT_DEFS) {
  const errs = validateChartDef(def, 't')
  if (errs.length) { console.log('compat def rejected: ' + errs.join('; ')) }
  compatResults.push(JSON.stringify(await renderChartDef(ctx, def)))
}
if (MODE === 'compat') {
  const out = JSON.stringify({ payloads: receivedPayloads, results: compatResults })
  if (DUMP) { const fs = await import('node:fs'); fs.writeFileSync(DUMP, out) }
  console.log('compat capture: ' + receivedPayloads.length + ' payloads, ' + compatResults.length + ' results -> ' + (DUMP || '(stdout)'))
  server.close(); process.exit(0)
}

// ===== feature tests (new lib only) =====
if (!lib.setNowProvider || !lib.resolveRelToken) { console.log('FAIL harness-precondition: lib missing setNowProvider/resolveRelToken'); server.close(); process.exit(1) }

// T1 heatmap hour x weekday
{
  const def = { type: 'heatmap', title: '24x7 热力', table: 'order_detail_raw', filters: [{ column: 'order_status', op: '=', value: 1 }], group_by: ['hour(order_create_time)', 'weekday(order_date)'], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }] }
  const errs = validateChartDef(def, 't')
  check('T1 heatmap validateChartDef clean', errs.length === 0, errs.join('; '))
  const r = await renderChartDef(ctx, def)
  const opt = r.option
  const xs = opt.xAxis.data, ys = opt.yAxis.data
  const cell = (x, y) => { const c = opt.series[0].data.find(d => d.value[0] === xs.indexOf(String(x)) && d.value[1] === ys.indexOf(String(y))); return c ? c.value[2] : undefined }
  // hour=14 status=1 rows: item1 (03-10 Tue, w=2, 100); item8 is 15:45 -> hour 15 (03-13 Fri, w=5, 90)
  check('T1 heatmap has hour 14 cells', xs.indexOf('14') >= 0, JSON.stringify(xs))
  check('T1 cell [14,Tue]=100', cell('14', '2') === 100, JSON.stringify(opt.series[0].data))
  check('T1 cell [15,Fri]=90', cell('15', '5') === 90)
  check('T1 cell [20,Tue]=50.5', cell('20', '2') === 50.5)
  check('T1 visualMap present', !!(opt.visualMap && opt.series[0].data.every(d => d.itemStyle && d.itemStyle.color)))
}

// T2 relative-time KPI with injectable clock
{
  const def = { type: 'kpi', title: '当日销售额', table: 'order_detail_raw', filters: [{ column: 'order_date', op: '=', value: 'today-1' }, { column: 'order_status', op: '=', value: 1 }], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }] }
  lib.setNowProvider(() => new Date(2026, 2, 12, 10, 0, 0))
  receivedPayloads.length = 0
  let r = await renderChartDef(ctx, def)
  check('T2 yesterday KPI=80', r.option.value === 80, 'value=' + r.option.value)
  const p1 = receivedPayloads.map(x => JSON.parse(x))
  check('T2 payload token resolved to absolute date', JSON.stringify(p1[0].filters) === JSON.stringify([{ column: 'order_date', op: '=', value: '2026-03-11' }, { column: 'order_status', op: '=', value: 1 }]), JSON.stringify(p1[0].filters))
  lib.setNowProvider(() => new Date(2026, 2, 13, 10, 0, 0))
  receivedPayloads.length = 0
  r = await renderChartDef(ctx, def)
  check('T2 re-render next day shifts window (KPI=180)', r.option.value === 180, 'value=' + r.option.value)
  const p2 = JSON.parse(receivedPayloads[0])
  check('T2 shifted payload absolute date 2026-03-12', p2.filters[0].value === '2026-03-12', p2.filters[0].value)
  // determinism: two relative filters in one chart share one now snapshot
  const def2 = { type: 'kpi', title: '近30日', table: 'order_detail_raw', filters: [{ column: 'order_create_time', op: '>=', value: '-30d' }, { column: 'order_date', op: 'BETWEEN', value: ['today-29', 'today'] }], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }] }
  receivedPayloads.length = 0
  await renderChartDef(ctx, def2)
  const pf = JSON.parse(receivedPayloads[0]).filters
  check('T2 -30d resolves to datetime', pf[0].value === '2026-02-11 10:00:00', pf[0].value)
  check('T2 BETWEEN tokens resolved', JSON.stringify(pf[1].value) === JSON.stringify(['2026-02-12', '2026-03-13']), JSON.stringify(pf[1].value))
  // object form
  const def3 = { type: 'kpi', title: '对象形', table: 'order_detail_raw', filters: [{ column: 'order_date', op: '=', value: { relative: 'today' } }], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }] }
  receivedPayloads.length = 0
  await renderChartDef(ctx, def3)
  check('T2 {relative} object form resolved', JSON.parse(receivedPayloads[0]).filters[0].value === '2026-03-13', receivedPayloads[0])
  lib.setNowProvider(null) // restore real clock
}

// T3 two-level join chain -> mid_category Chinese names
{
  const def = { type: 'bar', title: '中类销售', table: 'order_detail_raw', join: [{ table: 'product_main', left_key: 'product_id', right_key: 'product_id' }, { table: 'category_dim', left_key: 'cate_code', right_key: 'cate_code' }], filters: [{ column: 'order_status', op: '=', value: 1 }], group_by: ['mid_category'], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }] }
  const errs = validateChartDef(def, 't')
  check('T3 chain validateChartDef clean', errs.length === 0, errs.join('; '))
  const r = await renderChartDef(ctx, def)
  const rows = r.rows
  const tea = rows.find(x => x.mid_category === '饮料-茶咖')
  const none = rows.find(x => x.mid_category === '')
  check('T3 mid_category Chinese group 485.5', !!tea && tea.amt === 485.5, JSON.stringify(rows))
  check('T3 default left keeps unmatched P4 (mid_category "")', !!none && none.amt === 60, JSON.stringify(rows))
}

// T4 join.type inner vs left
{
  const base = { type: 'bar', title: 'inner', table: 'order_detail_raw', join: [{ table: 'product_main', left_key: 'product_id', right_key: 'product_id', type: 'inner' }, { table: 'category_dim', left_key: 'cate_code', right_key: 'cate_code' }], filters: [{ column: 'order_status', op: '=', value: 1 }], group_by: ['mid_category'], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }] }
  const r = await renderChartDef(ctx, base)
  check('T4 inner level-1 drops P4 row', r.rows.length === 1 && r.rows[0].mid_category === '饮料-茶咖' && r.rows[0].amt === 485.5, JSON.stringify(r.rows))
  const base2 = { type: 'bar', title: 'left', table: 'order_detail_raw', join: [{ table: 'product_main', left_key: 'product_id', right_key: 'product_id' }, { table: 'category_dim', left_key: 'cate_code', right_key: 'cate_code', type: 'inner' }], filters: [{ column: 'order_status', op: '=', value: 1 }], group_by: ['mid_category'], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }] }
  const r2 = await renderChartDef(ctx, base2)
  // P4 misses product_main (level 1, left) -> cate_code undefined -> level-2 inner drops it
  check('T4 inner level-2 drops rows missing level-1 key', r2.rows.length === 1 && r2.rows[0].amt === 485.5, JSON.stringify(r2.rows))
}

// T5 byte-identical compat: dump shape identical is checked by diffing two runs;
// here just re-emit with the same capture buffer (feature lib) for local sanity.
{
  const out = JSON.stringify({ payloads: receivedPayloads.slice(0, 0).concat([]), results: compatResults })
  if (DUMP) { const fs = await import('node:fs'); fs.writeFileSync(DUMP + '.feature', out) }
  console.log('feature-lib compat capture written (diff against master run required)')
}

console.log('RESULT pass=' + pass + ' fail=' + fail)
server.close()
process.exit(fail ? 1 : 0)
