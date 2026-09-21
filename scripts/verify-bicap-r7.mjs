#!/usr/bin/env node
// Verification harness for impl-bicap-r7 (feature/bi-capability-v2) — field regression fixes:
//   (A) granularity:'day' collapse — line/area/bar day charts aggregate down to a single point;
//   (B) relative-time tokens on pure date columns resolving to full datetimes ('+30d' ->
//       '2026-10-21 08:49:19') -> data-service 400 "Invalid value for ... (date) column".
// Usage:
//   node scripts/verify-bicap-r7.mjs <libPath> <mode> [dumpFile]
//     mode = "feature" — A/B regression tests (must FAIL on the pre-fix lib, PASS on the fixed lib)
//     mode = "compat"  — backward-compat capture (unaffected defs: /api/query payloads + render
//                        results, arrival order) -> byte-diff master dump vs fixed lib dump
// The mock data-service replicates production validation (data-service/api/query.py
// _convert_value): date columns receive 400 for any value carrying a time part
// (date.fromisoformat rejects 'YYYY-MM-DD HH:mm:ss'), timestamp columns accept date-only
// or full datetime, unknown tables keep varchar semantics. Mock listens on 127.0.0.1:8615
// (port OFF 8600); global.fetch rewrites :8600 -> :8615 for any lib.
import http from 'node:http'

const LIB = process.argv[2] || './lib/index.js'
const MODE = process.argv[3] || 'feature'
const DUMP = process.argv[4] || null

// deterministic clock: 2026-03-15 10:00:00 (local)
const NOW = new Date(2026, 2, 15, 10, 0, 0)

// ===== tables with production-shape meta (information_schema data_type) =====
const META = {
  order_detail_raw: [
    { name: 'item_id', type: 'bigint' }, { name: 'order_no', type: 'character varying' },
    { name: 'order_date', type: 'date' }, { name: 'order_create_time', type: 'timestamp without time zone' },
    { name: 'order_status', type: 'integer' }, { name: 'pay_amount', type: 'numeric' },
    { name: 'product_qty', type: 'integer' }, { name: 'store_id', type: 'character varying' }
  ],
  // meta present but WITHOUT type -> lib must degrade to the pre-R7 output shape (no guessing)
  notype_raw: [{ name: 'order_no' }, { name: 'order_date' }, { name: 'pay_amount' }, { name: 'order_status' }],
  product_main: [
    { name: 'product_id', type: 'character varying' }, { name: 'product_name', type: 'character varying' },
    { name: 'cate_code', type: 'character varying' }
  ],
  // pristine clone used only by the "token def fetches meta exactly once" counters below
  order_detail_raw2: [
    { name: 'item_id', type: 'bigint' }, { name: 'order_no', type: 'character varying' },
    { name: 'order_date', type: 'date' }, { name: 'order_create_time', type: 'timestamp without time zone' },
    { name: 'order_status', type: 'integer' }, { name: 'pay_amount', type: 'numeric' },
    { name: 'product_qty', type: 'integer' }, { name: 'store_id', type: 'character varying' }
  ]
}
const TABLES = {
  order_detail_raw: [
    { item_id: 1, order_no: 'A1', order_date: '2026-03-10', order_create_time: '2026-03-10 14:23:00', order_status: 1, pay_amount: 100, product_qty: 1, store_id: 'S1' },
    { item_id: 2, order_no: 'A1', order_date: '2026-03-10', order_create_time: '2026-03-10 20:05:00', order_status: 1, pay_amount: 50.5, product_qty: 2, store_id: 'S1' },
    { item_id: 3, order_no: 'A2', order_date: '2026-03-11', order_create_time: '2026-03-11 09:15:00', order_status: 1, pay_amount: 80, product_qty: 1, store_id: 'S1' },
    { item_id: 4, order_no: 'A1', order_date: '2026-03-11', order_create_time: '2026-03-11 23:40:00', order_status: 1, pay_amount: 30, product_qty: 1, store_id: 'S2' },
    { item_id: 5, order_no: 'A3', order_date: '2026-03-12', order_create_time: '2026-03-12 10:00:00', order_status: 1, pay_amount: 120, product_qty: 3, store_id: 'S2' },
    { item_id: 6, order_no: 'A4', order_date: '2026-03-12', order_create_time: '2026-03-12 18:30:00', order_status: 0, pay_amount: 999, product_qty: 1, store_id: 'S2' },
    { item_id: 7, order_no: 'A5', order_date: '2026-03-13', order_create_time: '2026-03-13 12:00:00', order_status: 1, pay_amount: 45, product_qty: 1, store_id: 'S1' },
    { item_id: 8, order_no: 'A6', order_date: '2026-03-14', order_create_time: '2026-03-14 08:00:00', order_status: 1, pay_amount: 200, product_qty: 2, store_id: 'S2' }
  ],
  // same rows, but every filter value passes (varchar semantics) and meta carries no types
  notype_raw: [
    { order_no: 'A1', order_date: '2026-03-10 14:23:00', pay_amount: 100, order_status: 1 },
    { order_no: 'A1', order_date: '2026-03-10 20:05:00', pay_amount: 50.5, order_status: 1 }
  ],
  product_main: [
    { product_id: 'P1', product_name: '茶饮料', cate_code: 'CATE_A' },
    { product_id: 'P2', product_name: '咖啡', cate_code: 'CATE_A' }
  ],
  order_detail_raw2: [
    { item_id: 1, order_no: 'B1', order_date: '2026-03-10', order_create_time: '2026-03-10 09:00:00', order_status: 1, pay_amount: 10, product_qty: 1, store_id: 'S1' },
    { item_id: 2, order_no: 'B2', order_date: '2026-03-11', order_create_time: '2026-03-11 09:00:00', order_status: 1, pay_amount: 20, product_qty: 1, store_id: 'S1' }
  ]
}
// per-column declared type used for production-like 400 validation on /api/query
const COL_TYPE = {}
Object.keys(META).forEach(function (t) { COL_TYPE[t] = {}; META[t].forEach(function (c) { COL_TYPE[t][c.name] = c.type || '' }) })

function cmpNum(a, b) { const na = Number(a), nb = Number(b); if (Number.isFinite(na) && Number.isFinite(nb)) return na < nb ? -1 : na > nb ? 1 : 0; return String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0 }
function emptyV(v) { return v === null || v === undefined || v === '' }
// production mimicry: data-service/api/query.py _convert_value — date columns reject time parts
function validateValue(table, f, v) {
  const type = (COL_TYPE[table] || {})[f.column] || ''
  if (typeof v !== 'string' || v === '') return null
  if (type === 'date') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v.trim())) return 'Invalid value for ' + f.column + ' (date) column: ' + JSON.stringify(v)
    return null
  }
  if (type.startsWith('timestamp')) {
    if (!/^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2})?)?$/.test(v.trim())) return 'Invalid value for ' + f.column + ' (' + type + ') column: ' + JSON.stringify(v)
    return null
  }
  return null
}
function matchFilter(row, f) {
  const v = row[f.column], op = f.op, fv = f.value
  if (op === 'IS_NULL') return emptyV(v)
  if (op === 'IS_NOT_NULL') return !emptyV(v)
  if (op === '=') return String(v) === String(fv)
  if (op === '!=') return String(v) !== String(fv)
  if (op === 'IN') return Array.isArray(fv) && fv.some(x => String(v) === String(x))
  if (op === 'NOT_IN') return Array.isArray(fv) && !fv.some(x => String(v) === String(x))
  if (op === 'LIKE' || op === 'ILIKE') return !emptyV(v) && String(v).toLowerCase() === String(fv).toLowerCase()
  if (op === 'BETWEEN') { const a = Array.isArray(fv) ? fv : []; return a.length >= 2 && !emptyV(v) && cmpNum(v, a[0]) >= 0 && cmpNum(v, a[1]) <= 0 }
  if (['>', '>=', '<', '<='].indexOf(op) >= 0) { if (emptyV(v) || emptyV(fv)) return false; const c = cmpNum(v, fv); return op === '>' ? c > 0 : op === '>=' ? c >= 0 : op === '<' ? c < 0 : c <= 0 }
  return true
}
function scanValues(v, fn) { if (Array.isArray(v)) { v.forEach(function (x) { scanValues(x, fn) }); return } fn(v) }

const receivedPayloads = []
const metaGets = []
const server = http.createServer((req, res) => {
  let body = ''
  req.on('data', c => { body += c })
  req.on('end', () => {
    const url = req.url || ''
    if (req.method === 'POST' && url === '/api/query') {
      const p = JSON.parse(body || '{}')
      receivedPayloads.push(JSON.stringify(p))
      const rows0 = TABLES[p.table] || []
      let bad = null
      ;(p.filters || []).forEach(f => { if (bad || !f || !f.column) return; if (f.value !== undefined) scanValues(f.value, function (v) { const e = validateValue(p.table, f, v); if (e) bad = e }) })
      if (bad) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ detail: bad })); return }
      let rows = rows0.map(r => Object.assign({}, r))
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
      metaGets.push(t)
      if (!META[t]) { res.writeHead(404); res.end('not found'); return }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ table: t, columns: META[t] }))
      return
    }
    res.writeHead(404); res.end('not found')
  })
})
await new Promise(ok => server.listen(8615, '127.0.0.1', ok))
const realFetch = global.fetch
global.fetch = (url, init) => realFetch(String(url).replace('127.0.0.1:8600', '127.0.0.1:8615'), init)

const lib = await import(new URL(LIB, 'file://' + process.cwd() + '/').href)
const { renderChartDef, setNowProvider } = lib
if (setNowProvider) setNowProvider(function () { return new Date(NOW.getTime()) })
const ctx = {}
let pass = 0, fail = 0
function check(name, cond, detail) { if (cond) { pass++; console.log('PASS ' + name) } else { fail++; console.log('FAIL ' + name + (detail ? ' :: ' + detail : '')) } }

// ===== old/unaffected defs for the compat dual-run (static values + timestamp-column tokens:
// these must stay byte-identical payloads/results between pre-fix and fixed libs) =====
const COMPAT_DEFS = [
  { type: 'bar', title: '近7日销售额', table: 'order_detail_raw', filters: [{ column: 'order_status', op: '=', value: 1 }, { column: 'order_date', op: 'BETWEEN', value: ['2026-03-08', '2026-03-14'] }], group_by: ['order_date'], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }] },
  { type: 'kpi', title: '当日销售额', table: 'order_detail_raw', filters: [{ column: 'order_date', op: '=', value: '2026-03-10' }, { column: 'order_status', op: '=', value: 1 }], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }] },
  { type: 'line', title: '月度销量', table: 'order_detail_raw', granularity: 'month', group_by: ['order_date'], metrics: [{ column: 'product_qty', agg: 'sum', alias: 'qty' }] },
  { type: 'line', title: '月度多指标', table: 'order_detail_raw', granularity: 'month', group_by: ['order_date'], metrics: [{ column: 'pay_amount', agg: 'sum', alias: '销售额' }, { column: 'order_no', agg: 'count_distinct', alias: '订单量' }] },
  { type: 'pie', title: '品类销售', table: 'order_detail_raw', join: { table: 'product_main', left_key: 'store_id', right_key: 'product_id' }, filters: [{ column: 'order_status', op: '=', value: 1 }], group_by: ['store_id'], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }] },
  { type: 'line', title: '旧日趋势（group_by 承载分组）', table: 'order_detail_raw', granularity: 'day', group_by: ['order_date'], filters: [{ column: 'order_status', op: '=', value: 1 }], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }] },
  { type: 'kpi', title: '时间戳列裸偏移（timestamp 保持完整时刻）', table: 'order_detail_raw', filters: [{ column: 'order_create_time', op: '>=', value: '-5d' }], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }] },
  { type: 'table', title: '明细', table: 'order_detail_raw', filters: [{ column: 'order_date', op: '=', value: '2026-03-10' }], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }] }
]
const compatResults = []
for (const def of COMPAT_DEFS) compatResults.push(JSON.stringify(await renderChartDef(ctx, def)))
if (MODE === 'compat') {
  const out = JSON.stringify({ payloads: receivedPayloads, results: compatResults })
  if (DUMP) { const fs = await import('node:fs'); fs.writeFileSync(DUMP, out) }
  console.log('compat capture: ' + receivedPayloads.length + ' payloads, ' + compatResults.length + ' results -> ' + (DUMP || '(stdout)'))
  server.close(); process.exit(0)
}

// ============================================================================
// FEATURE mode — regression tests for (A) and (B). Expected on the PRE-FIX
// (434cbbc) lib: every T-A* collapse assertion and every T-B* date-column
// assertion FAILS (T-B* even throw, since the mock 400s exactly like production).
// ============================================================================
if (!lib.setNowProvider || !lib.resolveRelToken) { console.log('FAIL harness-precondition: lib missing setNowProvider/resolveRelToken'); server.close(); process.exit(1) }
const lastPayload = () => JSON.parse(receivedPayloads[receivedPayloads.length - 1])
const fBy = (p, col) => p.filters.filter(function (f) { return f.column === col })
// graceful render: a pre-fix lib 400s on date-column tokens (the bug) — the harness must record
// FAIL and continue, not crash the process
async function tryRender(def, extra) { try { return { r: await renderChartDef(ctx, def, extra) } } catch (e) { return { err: String((e && e.message) || e) } } }

// ---- T-A: day-granularity bucketing (line AND area, single AND multi metric) ----
{
  const def = { type: 'line', title: '日销售额', table: 'order_detail_raw', granularity: 'day', filters: [{ column: 'order_status', op: '=', value: 1 }], metrics: [{ column: 'pay_amount', agg: 'sum', alias: '销售额' }] }
  const { r, err } = await tryRender(def)
  check('T-A1 line day no-groupby: one point per day (5)', !err && r.rows.length === 5, err || JSON.stringify(r && r.rows))
  check('T-A1 x axis dates ascending', !!r && JSON.stringify(r.option.xAxis.data) === JSON.stringify(['2026-03-10', '2026-03-11', '2026-03-12', '2026-03-13', '2026-03-14']), r ? JSON.stringify(r.option.xAxis.data) : err)
  check('T-A1 per-day sums correct', !!r && JSON.stringify(r.rows.map(x => x['销售额'])) === JSON.stringify([150.5, 110, 120, 45, 200]), r ? JSON.stringify(r.rows) : err)
  check('T-A1 order_status=0 row excluded', !!r && r.rows.reduce((a, x) => a + x['销售额'], 0) === 625.5, '')
}
{
  const def = { type: 'area', title: '日销售额面积', table: 'order_detail_raw', granularity: 'day', time_column: 'order_date', filters: [{ column: 'order_status', op: '=', value: 1 }], metrics: [{ column: 'pay_amount', agg: 'sum', alias: '销售额' }] }
  const { r, err } = await tryRender(def)
  check('T-A2 area day: one point per day (5)', !err && r.rows.length === 5 && r.option.series[0].type === 'line' && !!r.option.series[0].areaStyle, err || JSON.stringify(r && r.rows))
}
{
  const def = { type: 'line', title: '日销售额+订单量', table: 'order_detail_raw', granularity: 'day', filters: [{ column: 'order_status', op: '=', value: 1 }], metrics: [{ column: 'pay_amount', agg: 'sum', alias: '销售额' }, { column: 'order_no', agg: 'count_distinct', alias: '订单量' }] }
  const { r, err } = await tryRender(def)
  check('T-A3 multi-metric day: 5 points, dual series', !err && r.rows.length === 5 && r.option.series.length === 2 && r.option.series[1].yAxisIndex === 1, err || JSON.stringify(r && r.rows))
  // 03-10: rows A1+A1 -> distinct=1; 03-11: A2+A1 -> 2
  check('T-A3 count_distinct per day', !!r && JSON.stringify(r.rows.map(x => x['订单量'])) === JSON.stringify([1, 2, 1, 1, 1]), r ? JSON.stringify(r.rows) : err)
}
{
  const def = { type: 'bar', title: '日销量柱', table: 'order_detail_raw', granularity: 'day', filters: [{ column: 'order_status', op: '=', value: 1 }], metrics: [{ column: 'product_qty', agg: 'sum', alias: 'qty' }] }
  const { r, err } = await tryRender(def)
  check('T-A4 bar day bucketing', !err && r.rows.length === 5 && r.rows[0].order_date === '2026-03-10', err || JSON.stringify(r && r.rows))
}
{
  const def = { type: 'line', title: '最近3天', table: 'order_detail_raw', granularity: 'day', filters: [{ column: 'order_status', op: '=', value: 1 }], metrics: [{ column: 'pay_amount', agg: 'sum', alias: '销售额' }], sort: { by: '销售额', desc: true }, limit: 3 }
  const { r, err } = await tryRender(def)
  check('T-A5 day + sort/limit honored after bucketing', !err && JSON.stringify(r.rows.map(x => x['销售额'])) === JSON.stringify([200, 150.5, 120]), err || JSON.stringify(r && r.rows))
}
{
  const def = { type: 'line', title: '高销日', table: 'order_detail_raw', granularity: 'day', filters: [{ column: 'order_status', op: '=', value: 1 }, { metric: '销售额', op: '>', value: 100 }], metrics: [{ column: 'pay_amount', agg: 'sum', alias: '销售额' }] }
  const { r, err } = await tryRender(def)
  check('T-A6 day + having', !err && JSON.stringify(r.rows.map(x => x['销售额'])) === JSON.stringify([150.5, 110, 120, 200]), err || JSON.stringify(r && r.rows))
  check('T-A6 having never enters payload', fBy(lastPayload(), '销售额').length === 0, JSON.stringify(lastPayload()))
}
{
  const def = { type: 'line', title: '按下单时刻归日', table: 'order_detail_raw', granularity: 'day', time_column: 'order_create_time', filters: [{ column: 'order_status', op: '=', value: 1 }], metrics: [{ column: 'pay_amount', agg: 'sum', alias: '销售额' }] }
  const { r, err } = await tryRender(def)
  check('T-A7 timestamp column slices to day', !err && r.rows.length === 5 && r.rows[0].order_create_time === '2026-03-10', err || JSON.stringify(r && r.rows))
}
{
  const def = { type: 'kpi', title: '近5日合计', table: 'order_detail_raw', granularity: 'day', filters: [{ column: 'order_status', op: '=', value: 1 }], metrics: [{ column: 'pay_amount', agg: 'sum', alias: '销售额' }] }
  const { r, err } = await tryRender(def)
  check('T-A8 kpi day unchanged (single total)', !err && r.rows.length === 1 && r.rows[0]['销售额'] === 625.5, err || JSON.stringify(r && r.rows))
}
{
  // table is NOT a day-bucket type: detail rows must stay detail (non-regression guard, green pre- AND post-fix)
  const def = { type: 'table', title: '明细', table: 'order_detail_raw', granularity: 'day', filters: [{ column: 'order_date', op: '=', value: '2026-03-10' }, { column: 'order_status', op: '=', value: 1 }], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }] }
  const { r, err } = await tryRender(def)
  check('T-A9 table day stays detail rows', !err && r.rows.length === 2 && r.rows[0].pay_amount === 100, err || JSON.stringify(r && r.rows))
}
{
  // join + day + relative token on DATE column: dim fetch, meta-typed resolution, one point per day
  const def = { type: 'line', title: '日销售额(join)', table: 'order_detail_raw', granularity: 'day', join: { table: 'product_main', left_key: 'store_id', right_key: 'product_id' }, filters: [{ column: 'order_status', op: '=', value: 1 }, { column: 'order_date', op: 'BETWEEN', value: ['today-4', '+30d'] }], metrics: [{ column: 'pay_amount', agg: 'sum', alias: '销售额' }] }
  const { r, err } = await tryRender(def)
  check('T-A10 join+day+relative: no 400 (pre-fix lib fails exactly like the field)', !err, err || 'ok')
  const p = err ? null : JSON.parse(receivedPayloads[receivedPayloads.length - 2]) // fact payload (dim query follows)
  check('T-A10 join+day+relative: fact BETWEEN date-only', !!p && JSON.stringify(fBy(p, 'order_date')[0].value) === JSON.stringify(['2026-03-11', '2026-04-14']), p ? JSON.stringify(p.filters) : err)
  check('T-A10 join+day: one point per day', !err && r.rows.length === 4, err || JSON.stringify(r && r.rows))
}

// ---- T-B: type-aware relative-time resolution (mock 400s timestamp-for-date like production) ----
{
  const def = { type: 'line', title: '近30日', table: 'order_detail_raw', group_by: ['order_date'], filters: [{ column: 'order_status', op: '=', value: 1 }, { column: 'order_date', op: 'BETWEEN', value: ['today-29', '+30d'] }], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }] }
  let threw = '', p = null
  try { await renderChartDef(ctx, def); p = lastPayload() } catch (e) { threw = String(e.message || e) }
  check('T-B1 date column BETWEEN [today-29,+30d] must not 400', threw === '', threw)
  check('T-B1 members strictly YYYY-MM-DD', !!p && JSON.stringify(fBy(p, 'order_date')[0].value) === JSON.stringify(['2026-02-14', '2026-04-14']), p ? JSON.stringify(p.filters) : threw)
}
{
  const def = { type: 'kpi', title: '+30d 裸偏移', table: 'order_detail_raw', filters: [{ column: 'order_date', op: '=', value: '+30d' }], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }] }
  let threw = '', p = null
  try { await renderChartDef(ctx, def); p = lastPayload() } catch (e) { threw = String(e.message || e) }
  check('T-B2 bare +30d on date column -> YYYY-MM-DD', threw === '' && p && /^\d{4}-\d{2}-\d{2}$/.test(p.filters[0].value), threw || JSON.stringify(p && p.filters))
}
{
  const def = { type: 'kpi', title: 'today+30', table: 'order_detail_raw', filters: [{ column: 'order_date', op: '=', value: 'today+30' }], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }] }
  await renderChartDef(ctx, def); const p = lastPayload()
  check('T-B3 today+N stays YYYY-MM-DD', p.filters[0].value === '2026-04-14', JSON.stringify(p.filters))
}
{
  const def = { type: 'kpi', title: 'now 在 date 列', table: 'order_detail_raw', filters: [{ column: 'order_date', op: '>=', value: 'now' }], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }] }
  let threw = '', p = null
  try { await renderChartDef(ctx, def); p = lastPayload() } catch (e) { threw = String(e.message || e) }
  check('T-B4 now on date column truncates (was 400 in production)', threw === '' && p && p.filters[0].value === '2026-03-15', threw || JSON.stringify(p && p.filters))
}
{
  const def = { type: 'kpi', title: '+8h 在 date 列', table: 'order_detail_raw', filters: [{ column: 'order_date', op: '>=', value: '+8h' }], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }] }
  let threw = '', p = null
  try { await renderChartDef(ctx, def); p = lastPayload() } catch (e) { threw = String(e.message || e) }
  check('T-B5 hour offset on date column -> date-only', threw === '' && p && p.filters[0].value === '2026-03-15', threw || JSON.stringify(p && p.filters))
}
{
  const def = { type: 'kpi', title: '{relative}对象形', table: 'order_detail_raw', filters: [{ column: 'order_date', op: '>=', value: { relative: '+30d' } }], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }] }
  let threw = '', p = null
  try { await renderChartDef(ctx, def); p = lastPayload() } catch (e) { threw = String(e.message || e) }
  check('T-B6 {relative} object form on date column', threw === '' && p && p.filters[0].value === '2026-04-14', threw || JSON.stringify(p && p.filters))
}
{
  const def = { type: 'kpi', title: 'timestamp 列裸偏移保持完整时刻', table: 'order_detail_raw', filters: [{ column: 'order_create_time', op: '>=', value: '+30d' }], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }] }
  await renderChartDef(ctx, def); const p = lastPayload()
  check('T-B7 timestamp column keeps full datetime', p.filters[0].value === '2026-04-14 10:00:00', JSON.stringify(p.filters))
}
{
  const def = { type: 'kpi', title: 'timestamp 列 today 系', table: 'order_detail_raw', filters: [{ column: 'order_create_time', op: '>=', value: 'today-6' }], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }] }
  await renderChartDef(ctx, def); const p = lastPayload()
  check('T-B8 timestamp today-6 stays date-only (R1 rule intact)', p.filters[0].value === '2026-03-09', JSON.stringify(p.filters))
}
{
  const def = { type: 'kpi', title: 'BETWEEN 混合静态+记号', table: 'order_detail_raw', filters: [{ column: 'order_date', op: 'BETWEEN', value: ['2026-03-01', '+30d'] }], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }] }
  const { err } = await tryRender(def); const p = err ? { filters: [{ value: '(threw ' + err + ')' }] } : lastPayload()
  check('T-B9 mixed BETWEEN: static member byte-preserved, token member date-only', !err && JSON.stringify(p.filters[0].value) === JSON.stringify(['2026-03-01', '2026-04-14']), err || JSON.stringify(p.filters))
}
{
  const def = { type: 'kpi', title: '看板级筛选记号', table: 'order_detail_raw', metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }] }
  const { err } = await tryRender(def, [{ column: 'order_date', op: '>=', value: 'today-6' }])
  const p = lastPayload()
  check('T-B10 extraFilters token also type-aware', !err && p.filters.length === 1 && p.filters[0].value === '2026-03-09', err || JSON.stringify(p.filters))
}
{
  // meta without column types -> degrade to pre-R7 shapes (no guessing)
  const def = { type: 'kpi', title: '无类型 meta 降级', table: 'notype_raw', filters: [{ column: 'order_date', op: '>=', value: '+30d' }], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }] }
  const { err } = await tryRender(def); const p = lastPayload()
  check('T-B11 unknown column type keeps legacy now-系 datetime', !err && p.filters[0].value === '2026-04-14 10:00:00', err || JSON.stringify(p.filters))
}
{
  // meta 404 -> same fallback, render still succeeds
  const def = { type: 'kpi', title: 'meta缺失降级', table: 'missing_raw', filters: [{ column: 'order_date', op: '>=', value: '+30d' }], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }] }
  let threw = ''
  try { await renderChartDef(ctx, def) } catch (e) { threw = String(e.message || e) }
  const p = lastPayload()
  check('T-B12 meta 404 fallback: render survives, legacy shape', threw === '' && p.filters[0].value === '2026-04-14 10:00:00', threw || JSON.stringify(p.filters))
}
{
  // one deterministic now snapshot per render: two now tokens identical + BETWEEN window members from same base
  const def = { type: 'kpi', title: 'now快照', table: 'order_detail_raw', filters: [{ column: 'order_create_time', op: 'BETWEEN', value: ['now', 'now+1d'] }, { column: 'order_create_time', op: '<', value: 'now+2d' }], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }] }
  const { err } = await tryRender(def); const p = lastPayload()
  check('T-B13 single now snapshot', !err && p.filters[0].value[0] === '2026-03-15 10:00:00' && p.filters[0].value[1] === '2026-03-16 10:00:00' && p.filters[1].value === '2026-03-17 10:00:00', err || JSON.stringify(p.filters))
}
{
  // static definitions must not trigger any new meta request (zero-cost guarantee)
  const before = metaGets.length
  await tryRender({ type: 'kpi', title: '静态', table: 'order_detail_raw', filters: [{ column: 'order_date', op: '>=', value: '2026-03-01' }], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }] })
  check('T-B14 static def: no meta fetch', metaGets.length === before, metaGets.slice(before).join(','))
  const { err } = await tryRender({ type: 'kpi', title: 'date记号', table: 'order_detail_raw2', filters: [{ column: 'order_date', op: '>=', value: '-30d' }], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }] })
  const got = metaGets.slice(before)
  check('T-B15 token def fetches main-table meta once', !err && got.length === 1 && got[0] === 'order_detail_raw2', err || got.join(','))
  await tryRender({ type: 'kpi', title: 'date记号2', table: 'order_detail_raw2', filters: [{ column: 'order_date', op: '>=', value: '-30d' }], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }] })
  check('T-B16 meta cached (no re-fetch)', metaGets.length === before + 1, metaGets.slice(before).join(','))
}

console.log('r7 harness (' + LIB + '): ' + pass + ' PASS, ' + fail + ' FAIL')
server.close()
process.exit(fail ? 1 : 0)
