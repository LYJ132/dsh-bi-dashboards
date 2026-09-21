#!/usr/bin/env node
// verify-fence-index-r8.mjs — regression harness for the fence-preview chart index
// mapping in lib/client.js (task impl-fencefix-r8 / feature/fence-index).
//
// Bug-1 (field-test handover): buildCardContent() creates .bi-chart divs only for
// non-kpi/text/table cells, while fillCard() resolved the charts[] index by DOM-order
// position among '.bi-fence-cell .bi-chart'. Whenever a kpi/text/table block precedes
// charts in the same preview, options shift by the number of non-chart cells and the
// wrong option (e.g. a kpi option without series) is fed to setOption — blank charts,
// silently swallowed by an empty catch.
//
// The repo has no jsdom (devDependencies: esbuild only), so this file ships a
// hand-written mini-DOM implementing exactly the selector subset the fence path uses,
// and evaluates the REAL lib/client.js inside node:vm. It drives the module through its
// public entry (factory -> exports.apply(ctx) -> fence effect -> scanPass -> fillCard)
// with a stubbed fetch (bi.renderLatest) and a stubbed window.echarts that records
// init()/setOption() pairs.
//
// Usage:  node scripts/verify-fence-index-r8.mjs [path/to/lib/client.js]
// Exit 0 = all scenarios green; exit 1 = at least one failure.
import fs from 'node:fs'
import vm from 'node:vm'
import { setImmediate as tick } from 'node:timers'

const LIB = process.argv[2] || './lib/client.js'
const SOURCE = fs.readFileSync(LIB, 'utf8')

// ===== mini-DOM: element tree =====
const HTML = { tag: 'html' } // connection sentinel root
class El {
  constructor(tag) {
    this.tag = String(tag).toLowerCase()
    this.tagName = this.tag.toUpperCase()
    this.attrs = Object.create(null)
    this.style = {}
    this._children = []
    this._text = ''
    this.parentNode = null
  }
  get className() { return this.attrs.class || '' }
  set className(v) { this.attrs.class = String(v) }
  get id() { return this.attrs.id || '' }
  set id(v) { this.attrs.id = String(v) }
  get children() { return this._children }
  get parentElement() { return this.parentNode }
  setAttribute(k, v) { this.attrs[String(k)] = String(v) }
  getAttribute(k) { const v = this.attrs[String(k)]; return v === undefined ? null : v }
  removeAttribute(k) { delete this.attrs[String(k)] }
  hasAttribute(k) { return String(k) in this.attrs }
  appendChild(c) { c.parentNode = this; this._children.push(c); return c }
  after(n) {
    const p = this.parentNode
    if (!p) return
    const i = p._children.indexOf(this)
    p._children.splice(i + 1, 0, n)
    n.parentNode = p
  }
  remove() {
    const p = this.parentNode
    if (!p) return
    const i = p._children.indexOf(this)
    if (i >= 0) p._children.splice(i, 1)
    this.parentNode = null
  }
  get previousElementSibling() {
    const p = this.parentNode
    if (!p) return null
    const i = p._children.indexOf(this)
    return i > 0 ? p._children[i - 1] : null
  }
  get isConnected() { let n = this; while (n.parentNode) n = n.parentNode; return n === HTML }
  get textContent() {
    if (this._children.length) return this._children.map((c) => c.textContent).join('')
    return this._text
  }
  set textContent(v) {
    this._children.forEach((c) => { c.parentNode = null })
    this._children = []
    this._text = String(v)
  }
  set innerHTML(v) {
    if (String(v) === '') {
      this._children.forEach((c) => { c.parentNode = null })
      this._children = []
    }
  }
  get innerHTML() { return '' }
  addEventListener() {}
  removeEventListener() {}
  closest(sel) { let n = this; while (n) { if (matchSel(n, sel)) return n; n = n.parentNode } return null }
  querySelectorAll(sel) { const out = []; walk(this, (el) => { if (matchSel(el, sel)) out.push(el) }); return out }
  querySelector(sel) { const hits = this.querySelectorAll(sel); return hits.length ? hits[0] : null }
}
El.prototype._isEl = true
function walk(root, fn) {
  for (const c of root._children) { fn(c); walk(c, fn) }
}
function makeDocument() {
  const html = new El('html'); html.parentNode = HTML; HTML.parentNode = null
  const head = html.appendChild(new El('head'))
  const body = html.appendChild(new El('body'))
  const doc = {
    html, head, body,
    createElement: (tag) => new El(tag),
    getElementById(id) {
      let found = null
      walk(html, (el) => { if (!found && el.id === id) found = el })
      return found
    },
    addEventListener() {},
    removeEventListener() {},
    querySelector(sel) { const h = doc.querySelectorAll(sel); return h.length ? h[0] : null },
    querySelectorAll(sel) { const out = []; walk(html, (el) => { if (matchSel(el, sel)) out.push(el) }); return out },
  }
  return doc
}

// ===== mini-DOM: selector engine (class/tag/#id/[attr]/[attr=v]/[attr*=v], ' ' and '>' combinators, comma lists) =====
const simpleCache = new Map()
function parseSimple(s) {
  if (simpleCache.has(s)) return simpleCache.get(s)
  const out = { tag: null, classes: [], id: null, attrs: [] }
  let rest = s
  const mt = rest.match(/^[a-zA-Z][a-zA-Z0-9-]*/)
  if (mt) { out.tag = mt[0].toLowerCase(); rest = rest.slice(mt[0].length) }
  while (rest.length) {
    let m
    if ((m = rest.match(/^\.[\w-]+/))) { out.classes.push(m[0].slice(1)); rest = rest.slice(m[0].length); continue }
    if ((m = rest.match(/^#[\w-]+/))) { out.id = m[0].slice(1); rest = rest.slice(m[0].length); continue }
    if ((m = rest.match(/^\[([a-zA-Z-]+)(?:([*^$|!~]?=)"([^"]*)")?\]/))) {
      out.attrs.push({ name: m[1], op: m[2] || null, val: m[3] === undefined ? null : m[3] })
      rest = rest.slice(m[0].length); continue
    }
    throw new Error('mini-DOM: unsupported selector fragment: ' + s)
  }
  simpleCache.set(s, out)
  return out
}
function matchSimple(el, sp) {
  if (sp.tag && el.tag !== sp.tag) return false
  if (sp.id && el.id !== sp.id) return false
  if (sp.classes.length) {
    const toks = String(el.className).split(/\s+/)
    for (const c of sp.classes) if (toks.indexOf(c) < 0) return false
  }
  for (const a of sp.attrs) {
    const v = el.getAttribute(a.name)
    if (v === null) return false
    if (a.op === '=') { if (v !== a.val) return false }
    else if (a.op === '*=') { if (v.indexOf(a.val) < 0) return false }
  }
  return true
}
function parseChain(group) {
  // split on descendant (' ') or child ('>') gaps, remembering which per token
  const parts = []
  const re = /\s*>\s*|\s+/g
  let last = 0
  let m
  let comb = ' ' // relation of THIS token to the previous; first token's value is discarded
  while ((m = re.exec(group))) {
    const tok = group.slice(last, m.index).trim()
    if (tok) parts.push({ simple: tok, comb })
    last = re.lastIndex
    comb = m[0].indexOf('>') >= 0 ? '>' : ' '
  }
  const tok = group.slice(last).trim()
  if (tok) parts.push({ simple: tok, comb })
  if (!parts.length) throw new Error('mini-DOM: empty selector: ' + group)
  parts[0].comb = null
  return parts
}
function matchChain(el, chain) {
  let i = chain.length - 1
  let node = el
  for (;;) {
    if (!node || node === HTML) return false
    if (!matchSimple(node, parseSimple(chain[i].simple))) return false
    if (i === 0) return true
    if (chain[i].comb === '>') { node = node.parentNode; i--; continue }
    i--
    let p = node.parentNode
    while (p) { if (matchSimple(p, parseSimple(chain[i].simple))) { node = p; break } p = p.parentNode }
    if (!p) return false
  }
}
const groupCache = new Map()
function matchSel(el, sel) {
  let groups = groupCache.get(sel)
  if (!groups) {
    groups = sel.split(',').map((g) => g.trim()).filter(Boolean).map(parseChain)
    groupCache.set(sel, groups)
  }
  return groups.some((chain) => matchChain(el, chain))
}

// ===== scenario runner: wires real lib/client.js into a stubbed browser-ish realm =====
// fixture: full chart objects as they'd come from bi.renderLatest
function kpi(title, value) { return { type: 'kpi', title, option: { value } } }
function textC(title, t) { return { type: 'text', title, text: t } }
function tableC(title) { return { type: 'table', title, option: { columns: ['a', 'b'], columnLabels: { a: 'A列', b: 'B列' }, rows: [{ a: 1, b: 2 }, { a: 3, b: 4 }] } } }
function chartC(title, kind) { return { type: kind, title, option: { type: kind === 'pie' ? 'pie' : 'cartesian', xAxis: { data: ['x1', 'x2', 'x3'] }, yAxis: { type: 'value' }, series: [{ type: kind, name: title, data: [1, 2, 3] }] } } }

async function runScenario({ charts, throwOnFirstSetOption = false }) {
  const doc = makeDocument()
  const win = {}
  const captured = { module: null }
  const intervals = []
  const logs = { warn: [], error: [], debug: [], log: [] }
  const initCalls = []   // { dom }
  const setOptionCalls = [] // { dom, opt }

  win.__ModuleLoader__ = { load: (m) => { captured.module = m } }
  win.setInterval = (fn, ms) => { intervals.push({ fn, ms }); return intervals.length }
  win.clearInterval = () => {}
  win.setTimeout = (fn, ms) => { return { fn, ms } }
  win.clearTimeout = () => {}
  win.prompt = () => null
  win.confirm = () => false
  win.echarts = {
    init(dom) {
      const rec = { dom }
      initCalls.push(rec)
      return {
        setOption(opt) {
          if (throwOnFirstSetOption && initCalls.length === 1) throw new Error('boom: synthetic setOption failure')
          setOptionCalls.push({ dom, opt })
        },
      }
    },
    getInstanceByDom() { return null },
  }
  const fetchStub = (url, opts) => {
    const p = JSON.parse(opts.body)
    let data
    if (p.m === 'bi.renderLatest') data = { kind: 'dashboard', title: '门店看板', previewId: 'p1', charts: charts.map((c) => Object.assign({}, c)) }
    else data = { ok: true }
    return Promise.resolve({
      ok: true,
      status: 200,
      headers: { get: (k) => (String(k).toLowerCase() === 'content-type' ? 'application/json' : '') },
      json: () => Promise.resolve(data),
      text: () => Promise.resolve(JSON.stringify(data)),
    })
  }
  const consoleStub = {
    warn: (...a) => logs.warn.push(a.map(String).join(' ')),
    error: (...a) => logs.error.push(a.map(String).join(' ')),
    debug: (...a) => logs.debug.push(a.map(String).join(' ')),
    log: (...a) => logs.log.push(a.map(String).join(' ')),
  }
  const sandbox = {
    window: win,
    document: doc,
    fetch: fetchStub,
    console: consoleStub,
    navigator: {},
    JSON, Promise, Object, Array, Map, Set, WeakSet, Error, String, Number, Boolean, Math, RegExp, Date,
    parseInt, parseFloat, isNaN, encodeURIComponent, decodeURIComponent,
  }
  // NOTE: MutationObserver intentionally left undefined -> fence effect falls back to
  // the interval-driven scanPass, and the FIRST scanPass runs synchronously inside apply().

  vm.runInNewContext(SOURCE, sandbox, { filename: LIB })
  const factory = captured.module && captured.module.factory
  if (typeof factory !== 'function') throw new Error('client.js did not register a __ModuleLoader__.load module')
  const exportsObj = factory((name) => {
    if (name === 'react') {
      return {
        createElement: (type, props, ...kids) => ({ type, props, kids }),
        useState: (i) => [typeof i === 'function' ? i() : i, () => {}],
        useEffect: () => {}, useMemo: (f) => f(), useCallback: (f) => f,
        useRef: () => ({ current: null }), Fragment: 'Fragment',
      }
    }
    throw new Error('unexpected require: ' + name)
  })
  if (typeof exportsObj.apply !== 'function') throw new Error('client module has no apply()')

  // a dsh-ui fence code block as the markdown renderer would leave it
  const block = doc.body.appendChild(new El('div'))
  block.className = 'md-code-block'
  const pre = block.appendChild(new El('pre'))
  const code = pre.appendChild(new El('code'))
  code.className = 'language-json'
  code.textContent = '{"kind":"dashboard","id":"p1"}'

  exportsObj.apply({
    get: (name) => (name === 'sessions' ? [] : undefined), // slots -> undefined: stop before view registration
    effect: (fn) => { fn() },
  })

  // fillCard is promise-driven (fetch -> buildCardContent -> ensureEcharts -> init/setOption)
  for (let i = 0; i < 6; i++) await new Promise((r) => tick(r))

  return { doc, win, initCalls, setOptionCalls, logs, intervals }
}

// ===== assertions =====
const failures = []
let checks = 0
function ok(cond, msg) { checks++; if (!cond) failures.push(msg) }

function expectFenceRendered(st, charts, chartTrueIdxs) {
  const cards = st.doc.body.querySelectorAll('.bi-fence-card')
  ok(cards.length === 1, `expected exactly 1 rendered fence card, got ${cards.length}`)
  const card = cards[0]
  const cells = card.querySelectorAll('.bi-fence-cell')
  ok(cells.length === charts.length, `expected ${charts.length} fence cells, got ${cells.length}`)
  const divs = card.querySelectorAll('.bi-chart[data-pending]')
  ok(divs.length === 0, `expected no chart div left pending after fill, got ${divs.length}`)
  const chartDivs = card.querySelectorAll('.bi-chart')
  ok(chartDivs.length === chartTrueIdxs.length, `expected ${chartTrueIdxs.length} .bi-chart divs, got ${chartDivs.length}`)
  return { card, chartDivs }
}

function expectIndexedByDataIdx(st, charts, chartTrueIdxs, label) {
  const { card, chartDivs } = expectFenceRendered(st, charts, chartTrueIdxs)
  // AC1a: every chart div carries data-idx = its TRUE index into charts[]
  chartDivs.forEach((dv, domPos) => {
    const want = String(chartTrueIdxs[domPos])
    ok(dv.getAttribute('data-idx') === want,
      `${label}: chart div at DOM position ${domPos} should carry data-idx="${want}", got "${dv.getAttribute('data-idx')}"`)
  })
  // AC1b: each chart div received setOption built from ITS OWN chart's series (by identity)
  ok(st.initCalls.length === chartTrueIdxs.length,
    `${label}: expected ${chartTrueIdxs.length} echarts.init calls, got ${st.initCalls.length}`)
  chartTrueIdxs.forEach((trueIdx, domPos) => {
    const dom = chartDivs[domPos]
    const rec = st.setOptionCalls.find((r) => r.dom === dom)
    ok(!!rec, `${label}: chart for true index ${trueIdx} never received setOption (blank chart — the Bug-1 symptom)`)
    if (rec) ok(rec.opt && rec.opt.series === charts[trueIdx].option.series,
      `${label}: chart div (true idx ${trueIdx}) got the WRONG option — index shift fed another cell's chart into setOption (expected its own series)`)
  })
}

// scenarios
const S1 = [kpi('销售额', 42), chartC('品类占比', 'pie'), chartC('销售热力', 'heatmap'), chartC('趋势', 'line')]
const S2 = [kpi('销售额', 42), tableC('明细'), textC('备注', '仅供预览'), chartC('品类占比', 'pie'), chartC('销售热力', 'heatmap'), chartC('趋势', 'line')]
const S3 = [chartC('柱A', 'bar'), chartC('折线B', 'line')]
const S4 = [chartC('C1', 'line'), chartC('C2', 'bar'), chartC('C3', 'pie')]
const S5 = [kpi('销售额', 42), tableC('明细'), textC('备注', '仅供预览')]

const results = {}
results.s1 = await runScenario({ charts: S1 })
results.s2 = await runScenario({ charts: S2 })
results.s3 = await runScenario({ charts: S3 })
results.s4 = await runScenario({ charts: S4, throwOnFirstSetOption: true })
results.s5 = await runScenario({ charts: S5 })

console.log(`[verify-fencefix-r8] harness = node:vm + hand-written mini-DOM (jsdom unavailable; deps are esbuild-only), lib = ${LIB}`)

// --- S1: the Bug-1 repro — a leading kpi must not shift chart options
console.log('S1 leading-kpi index shift repro')
expectIndexedByDataIdx(results.s1, S1, [1, 2, 3], 'S1')
// kpi cell still renders inline value
{
  const k = results.s1.doc.body.querySelector('.bi-kpi')
  ok(!!k && k.textContent === '42', 'S1: kpi cell should render value 42')
}

// --- S2: mixed layout regression (kpi/table/text precede pie/heatmap/line)
console.log('S2 mixed layout (kpi+table+text before pie/heatmap/line)')
expectIndexedByDataIdx(results.s2, S2, [3, 4, 5], 'S2')
{
  const st = results.s2
  const k = st.doc.body.querySelector('.bi-kpi'); ok(!!k && k.textContent === '42', 'S2: kpi renders 42')
  const ths = st.doc.body.querySelectorAll('.bi-table th'); ok(ths.length === 2, `S2: table renders 2 header cells, got ${ths.length}`)
  const tds = st.doc.body.querySelectorAll('.bi-table td'); ok(tds.length === 4, `S2: table renders 4 body cells, got ${tds.length}`)
  const bt = st.doc.body.querySelector('.bi-text'); ok(!!bt && bt.textContent === '仅供预览', 'S2: text cell renders')
}

// --- S3: no leading non-chart cell — passes even pre-fix; guards harness sanity
console.log('S3 plain charts (no leading non-chart cells) — must stay green before AND after fix')
expectIndexedByDataIdx(results.s3, S3, [0, 1], 'S3')

// --- S4: a throwing setOption must console.warn and NOT kill subsequent charts
console.log('S4 setOption failure warns and continues')
{
  const st = results.s4
  ok(st.initCalls.length === 3, `S4: all 3 charts must be init'd even if the first throws, got ${st.initCalls.length}`)
  ok(st.setOptionCalls.length === 2, `S4: charts after the throwing one must still receive setOption, got ${st.setOptionCalls.length}`)
  ok(st.logs.warn.length >= 1, 'S4: the setOption catch must console.warn the error (pre-fix it was an empty catch — Bug-1 was invisible for exactly this reason)')
  if (st.logs.warn.length) console.log('     warn sample: ' + st.logs.warn[0].slice(0, 120))
}

// --- S5: non-chart-only layout renders fully with zero chart engine calls
console.log('S5 kpi/table/text only — renders, no chart engine use')
{
  const st = results.s5
  const { card } = expectFenceRendered(st, S5, [])
  ok(st.initCalls.length === 0, 'S5: no echarts.init expected')
  const k = card.querySelector('.bi-kpi'); ok(!!k && k.textContent === '42', 'S5: kpi renders 42')
  ok(card.querySelectorAll('.bi-table tr').length === 3, 'S5: table header + 2 rows')
  ok(!!card.querySelector('.bi-text'), 'S5: text renders')
}

// --- fence wiring sanity: periodic scanPass armed (5s) — proves the fence effect really ran
{
  const st = results.s1
  ok(st.intervals.some((iv) => iv.ms === 5000), 'fence scan interval (5000ms) must be armed by apply()')
}

console.log(`\n[verify-fencefix-r8] ${checks - failures.length}/${checks} checks passed`)
if (failures.length) {
  console.log('FAILURES:')
  failures.forEach((f) => console.log('  ✗ ' + f))
  process.exit(1)
}
console.log('ALL GREEN')
