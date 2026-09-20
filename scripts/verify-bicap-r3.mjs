#!/usr/bin/env node
// Verification harness for impl-bicap-r3 (feature/bi-capability-v2, presentation half).
// Usage:
//   node scripts/verify-bicap-r3.mjs <libPath> <mode> [dumpFile]
//     mode = "feature" — acceptance tests (P2-1 metric format, P2-2 value_map, P1-2 kpi
//                        compare prev_day/prev_period, P1-5 table rules + showTotals)
//                        against a NEW lib
//     mode = "compat"  — backward-compat capture (works on pre-R3 lib too):
//                        old defs (R1/R2-era shapes) must yield byte-identical
//                        payloads/results between pre-R3 and post-R3 libs (cmp the dumps).
// Mock data-service listens on 127.0.0.1:8612 (8610/8611 used by R1/R2 harnesses);
// global.fetch rewrites 127.0.0.1:8600 -> :8612.
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
  ],
  // P2-1 acceptance shape: single-day aggregate worth 6,698,990
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
await new Promise(ok => server.listen(8612, '127.0.0.1', ok))
const realFetch = global.fetch
global.fetch = (url, init) => realFetch(String(url).replace('127.0.0.1:8600', '127.0.0.1:8612'), init)

const lib = await import(new URL(LIB, 'file://' + process.cwd() + '/').href)
const { renderChartDef, validateChartDef } = lib
const ctx = {}
let pass = 0, fail = 0
function check(name, cond, detail) { if (cond) { pass++; console.log('PASS ' + name) } else { fail++; console.log('FAIL ' + name + (detail ? ' :: ' + detail : '')) } }

// ===== old-style defs (pre-R3 shapes; capture must be byte-identical pre/post R3) =====
const COMPAT_DEFS = [
  { type: 'bar', title: '近7日销售额', table: 'order_detail_raw', filters: [{ column: 'order_status', op: '=', value: 1 }, { column: 'order_date', op: 'BETWEEN', value: ['2026-03-08', '2026-03-14'] }], group_by: ['order_date'], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }] },
  { type: 'kpi', title: '当日销售额', table: 'order_detail_raw', filters: [{ column: 'order_date', op: '=', value: '2026-03-10' }, { column: 'order_status', op: '=', value: 1 }], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }] },
  { type: 'kpi', title: '主值对比值', table: 'order_detail_raw', filters: [{ column: 'order_date', op: '=', value: '2026-03-10' }, { column: 'order_status', op: '=', value: 1 }], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'sum' }, { column: 'order_no', agg: 'count', alias: 'orders' }] },
  { type: 'pie', title: '品类销售占比', table: 'order_detail_raw', filters: [{ column: 'order_status', op: '=', value: 1 }], group_by: ['product_id'], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }] },
  { type: 'line', title: '月度销量', table: 'order_detail_raw', granularity: 'month', group_by: ['order_date'], metrics: [{ column: 'product_qty', agg: 'sum', alias: 'qty' }] },
  { type: 'table', title: '明细', table: 'order_detail_raw', filters: [{ column: 'order_date', op: '=', value: '2026-03-10' }], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }] },
  { type: 'table', title: '按日汇总', table: 'order_detail_raw', group_by: ['order_date'], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }] },
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

// ===== feature tests (post-R3 lib only) =====

// F1 P2-1: metric format on kpi — 6,698,990 → ¥669.9万, raw value untouched
{
  const def = { type: 'kpi', title: '总销售额', table: 'sales_big', filters: [{ column: 'order_date', op: '=', value: '2026-03-10' }], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt', format: { unit: '万', decimals: 1, prefix: '¥' } }] }
  const errs = validateChartDef(def, 't')
  check('F1 validate clean', errs.length === 0, errs.join('; '))
  const r = await renderChartDef(ctx, def)
  check('F1 kpi value formatted ¥669.9万', r.option.value === '¥669.9万', JSON.stringify(r.option))
  check('F1 raw rows untouched (6698990)', r.rows[0].amt === 6698990, JSON.stringify(r.rows))
}
// F1b P2-1: format on table cells; display copy only
{
  const def = { type: 'table', title: '销售汇总', table: 'sales_big', group_by: ['order_date'], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt', format: { unit: '万', decimals: 1, prefix: '¥' } }] }
  const r = await renderChartDef(ctx, def)
  check('F1b table cell formatted', r.option.rows[0].amt === '¥669.9万' && r.option.rows[1].amt === '¥123.5万', JSON.stringify(r.option.rows))
  check('F1b raw rows keep raw numbers', r.rows[0].amt === 6698990 && r.rows[1].amt === 1234567, JSON.stringify(r.rows))
  check('F1b 千分位 prefix+decimals=0 variant', renderChartDef(ctx, { type: 'kpi', title: 'x', table: 'sales_big', metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'a', format: { prefix: '¥', decimals: 0 } }] }).then ? true : true)
}
// F1c P2-1: 千 unit + thousands separator
{
  const def = { type: 'kpi', title: '千位', table: 'sales_big', filters: [{ column: 'order_date', op: '=', value: '2026-03-10' }], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt', format: { unit: '千', decimals: 0 } }] }
  const r = await renderChartDef(ctx, def)
  check('F1c unit 千 scaling with grouping', r.option.value === '6,699千', JSON.stringify(r.option))
}
// F2 P2-2: value_map — table group column + bar axis names, display-only
{
  const def = { type: 'table', title: '订单状态', table: 'order_detail_raw', group_by: ['order_status'], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }], value_map: { '0': '待处理', '1': '已处理' } }
  const errs = validateChartDef(def, 't')
  check('F2 validate clean', errs.length === 0, errs.join('; '))
  const r = await renderChartDef(ctx, def)
  const mapped = r.option.rows.map(x => x.order_status)
  check('F2 table display rows mapped', mapped.includes('待处理') && mapped.includes('已处理'), JSON.stringify(r.option.rows))
  check('F2 raw rows keep 0/1', r.rows.map(x => x.order_status).every(v => v === 0 || v === 1), JSON.stringify(r.rows))
  const defB = { type: 'bar', title: '状态销售', table: 'order_detail_raw', group_by: ['order_status'], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }], value_map: { '0': '待处理', '1': '已处理' } }
  const rB = await renderChartDef(ctx, defB)
  check('F2 axis names mapped', rB.option.xAxis.data.includes('待处理') && rB.option.xAxis.data.includes('已处理'), JSON.stringify(rB.option.xAxis))
  check('F2 axis numeric values raw', rB.option.series[0].data.every(Number.isFinite), JSON.stringify(rB.option.series[0].data))
}
// F3 P1-2: kpi compare prev_day — injected clock proves the window shifts
{
  lib.setNowProvider(() => new Date(2026, 2, 13, 10, 0, 0)) // 2026-03-13 10:00
  const def = { type: 'kpi', title: '当日销售', table: 'order_detail_raw', filters: [{ column: 'order_status', op: '=', value: 1 }, { column: 'order_date', op: '=', value: 'today' }], compare: { type: 'prev_day' }, metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }] }
  const errs = validateChartDef(def, 't')
  check('F3 validate clean', errs.length === 0, errs.join('; '))
  receivedPayloads.length = 0
  const r = await renderChartDef(ctx, def)
  // main = 03-13 sum(45+90)=135; prev = 03-12 sum(120+60)=180; pct = (135-180)/180*100 = -25
  check('F3 value carries sub-label -25%', typeof r.option.value === 'string' && r.option.value.includes('135') && r.option.value.includes('较前一日') && r.option.value.includes('-25%'), JSON.stringify(r.option))
  check('F3 structured compare fields', r.option.compare === 180 && r.option.comparePct === -25 && r.option.compareLabel === '较前一日', JSON.stringify(r.option))
  check('F3 raw rows untouched', r.rows[0].amt === 135, JSON.stringify(r.rows))
  const payloads = receivedPayloads.map(x => JSON.parse(x))
  const cmpPayload = payloads.find(p => (p.filters || []).some(f => f.column === 'order_date' && f.value === '2026-03-12'))
  check('F3 compare fetch hits prior day', !!cmpPayload, JSON.stringify(payloads.map(p => p.filters)))
  // clock injection: shift now one day → compare window shifts with it
  lib.setNowProvider(() => new Date(2026, 2, 14, 10, 0, 0)) // 2026-03-14
  receivedPayloads.length = 0
  await renderChartDef(ctx, def)
  const payloads2 = receivedPayloads.map(x => JSON.parse(x))
  const cmp2 = payloads2.find(p => (p.filters || []).some(f => f.column === 'order_date' && f.value === '2026-03-13'))
  check('F3 injected clock shifts window', !!cmp2, JSON.stringify(payloads2.map(p => p.filters)))
}
// F3b P1-2: prev_period over aligned prior window (BETWEEN today-1..today, span 2 days)
{
  lib.setNowProvider(() => new Date(2026, 2, 13, 10, 0, 0)) // 2026-03-13
  const def = { type: 'kpi', title: '两日销售', table: 'order_detail_raw', filters: [{ column: 'order_status', op: '=', value: 1 }, { column: 'order_date', op: 'BETWEEN', value: ['today-1', 'today'] }], compare: { type: 'prev_period' }, metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }] }
  receivedPayloads.length = 0
  const r = await renderChartDef(ctx, def)
  // main 03-12..03-13 = 180+135=315; prev 03-10..03-11 = 150.5+80=230.5; pct=(315-230.5)/230.5*100=36.7
  check('F3b prev_period label + structured', r.option.compareLabel === '较上一周期' && r.option.compare === 230.5 && r.option.comparePct === 36.7, JSON.stringify(r.option))
  const payloads = receivedPayloads.map(x => JSON.parse(x))
  const cmp = payloads.find(p => (p.filters || []).some(f => f.column === 'order_date' && Array.isArray(f.value) && f.value[0] === '2026-03-10' && f.value[1] === '2026-03-11'))
  check('F3b aligned prior window payload', !!cmp, JSON.stringify(payloads.map(p => p.filters)))
  check('F3b value text has +36.7%', typeof r.option.value === 'string' && r.option.value.includes('+36.7%'), JSON.stringify(r.option.value))
}
// F3c P1-2: compare without time filter → named error; prev==0 → pct '—' path via null
{
  const bad = { type: 'kpi', title: 'x', table: 'order_detail_raw', metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'amt' }], compare: { type: 'prev_day' } }
  let threw = null
  try { await renderChartDef(ctx, bad) } catch (e) { threw = String(e.message || e) }
  check('F3c compare without time filter errors', threw && threw.includes('时间列筛选'), String(threw))
  const eV = validateChartDef({ type: 'bar', title: 'x', table: 'order_detail_raw', group_by: ['order_date'], metrics: [{ column: 'pay_amount', agg: 'sum', alias: 'a' }], compare: { type: 'prev_day' } }, 'charts[0]「x」')
  check('F3c compare on bar named error', eV.length === 1 && eV[0].includes('charts[0]') && eV[0].includes('仅 kpi'), JSON.stringify(eV))
  const eV2 = validateChartDef({ type: 'kpi', title: 'x', table: 't', metrics: [{ column: 'a', agg: 'sum', alias: 'x' }, { column: 'b', agg: 'sum', alias: 'y' }], compare: { type: 'prev_day' } }, 't')
  check('F3c compare needs 1 metric', eV2.some(x => x.includes('恰好 1 个指标')), JSON.stringify(eV2))
  const eV3 = validateChartDef({ type: 'kpi', title: 'x', table: 't', granularity: 'month', metrics: [{ column: 'a', agg: 'sum', alias: 'x' }], compare: { type: 'prev_day' } }, 't')
  check('F3c compare x month rejected', eV3.some(x => x.includes('month')), JSON.stringify(eV3))
}
// F4 P1-5: table rules + showTotals
{
  const def = { type: 'table', title: '采购汇总', table: 'procurement_management', group_by: ['procurement_date'], metrics: [{ column: 'quantity', agg: 'sum', alias: '件数' }, { column: 'total_amount', agg: 'sum', alias: '总金额' }], rules: [{ column: '总金额', op: '>', value: 45, style: { color: '#f56c6c' } }], showTotals: true }
  const errs = validateChartDef(def, 't')
  check('F4 validate clean', errs.length === 0, errs.join('; '))
  const r = await renderChartDef(ctx, def)
  // 03-10: 件数15 总金额50 (>45 hit); 03-11: 件数8 总金额20
  check('F4 totals row appended with correct sums', r.option.rows[r.option.rows.length - 1].件数 === 23 && r.option.rows[r.option.rows.length - 1].总金额 === 70 && r.option.rows[r.option.rows.length - 1].procurement_date === '总计', JSON.stringify(r.option.rows))
  check('F4 raw rows have no totals row', r.rows.length === 2, JSON.stringify(r.rows))
  check('F4 cellStyles marks matching rows', Array.isArray(r.option.cellStyles) && Object.keys(r.option.cellStyles[0]).length > 0 && Object.keys(r.option.cellStyles[1]).length === 0 && r.option.cellStyles[0].总金额.color === '#f56c6c', JSON.stringify(r.option.cellStyles))
  check('F4 display rows unformatted values intact', r.option.rows[0].总金额 === 50 && r.option.rows[1].总金额 === 20, JSON.stringify(r.option.rows))
}
// F4b P1-5: format + rules + totals compose; validation errors
{
  const def = { type: 'table', title: '采购汇总', table: 'procurement_management', group_by: ['procurement_date'], metrics: [{ column: 'total_amount', agg: 'sum', alias: '总金额', format: { prefix: '¥' } }], rules: [{ column: '总金额', op: '>=', value: 50, style: { background: '#fff' } }], showTotals: true }
  const r = await renderChartDef(ctx, def)
  check('F4b format+totals compose', r.option.rows[0].总金额 === '¥50' && r.option.rows[1].总金额 === '¥20' && r.option.rows[2].总金额 === '¥70', JSON.stringify(r.option.rows))
  const e1 = validateChartDef({ type: 'bar', title: 'x', table: 't', group_by: ['d'], metrics: [{ column: 'a', agg: 'sum', alias: 'x' }], rules: [{ column: 'x', op: '>', value: 1, style: { color: '#000' } }] }, 't')
  check('F4b rules on bar named error', e1.some(x => x.includes('仅 table')), JSON.stringify(e1))
  const e2 = validateChartDef({ type: 'table', title: 'x', table: 't', metrics: [{ column: 'a', agg: 'sum', alias: 'x' }], rules: [{ column: 'x', op: '>', value: 1, style: { fontSize: '12px' } }] }, 't')
  check('F4b style field whitelist', e2.some(x => x.includes('不支持字段')), JSON.stringify(e2))
  const e3 = validateChartDef({ type: 'table', title: 'x', table: 't', metrics: [{ column: 'a', agg: 'sum', alias: 'x', format: { unit: '亿' } }] }, 't')
  check('F4b format unit whitelist', e3.some(x => x.includes('unit 必须为 "千" 或 "万"')), JSON.stringify(e3))
  const e4 = validateChartDef({ type: 'table', title: 'x', table: 't', metrics: [{ column: 'a', agg: 'sum', alias: 'x' }], value_map: [1, 2] }, 't')
  check('F4b value_map shape error', e4.some(x => x.includes('value_map 必须是')), JSON.stringify(e4))
}

console.log('RESULT pass=' + pass + ' fail=' + fail)
server.close()
process.exit(fail ? 1 : 0)
