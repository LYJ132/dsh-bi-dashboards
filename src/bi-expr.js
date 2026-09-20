// 表达式求值 / join 合并 / JS 行过滤 —— src/index.js 的纯函数支撑层（feat-20260920-chart-schema）
// 安全表达式求值器：group_by / metrics.column 允许两种写法——
//   1) 纯列名字符串（旧行为，逐字节不变）：^[A-Za-z_][A-Za-z0-9_]*$；
//   2) 表达式字符串（如 "product_price * product_qty"、"month(order_date)"），
//      或 {expr, as} 对象（as 为结果列名，缺省用表达式原文）。
// 求值走「手写分词器 + 递归下降解析器 → AST → 逐行求值」，绝不触碰 eval/new Function。
export const EXPR_IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/
export const EXPR_FUNCS = ['abs', 'round', 'floor', 'ceil', 'sqrt', 'pow', 'exp', 'ln', 'log', 'log10', 'min', 'max', 'coalesce', 'if', 'year', 'month', 'quarter', 'day', 'weekday', 'length', 'concat', 'upper', 'lower']
const EXPR_FUNC_SET = new Set(EXPR_FUNCS)
const exprCache = new Map()

function tokenizeExpr(src) {
  const t = []; let i = 0
  while (i < src.length) {
    const c = src[i]
    if (/\s/.test(c)) { i++; continue }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) {
      let j = i; while (j < src.length && /[0-9.]/.test(src[j])) j++
      const n = src.slice(i, j)
      if (!/^(\d+(\.\d*)?|\.\d+)$/.test(n) || !Number.isFinite(Number(n))) throw new Error('非法数字 "' + n + '"')
      t.push({ k: 'num', v: Number(n) }); i = j; continue
    }
    if (c === "'" || c === '"') {
      let j = i + 1, s = ''
      while (j < src.length && src[j] !== c) { s += src[j]; j++ }
      if (j >= src.length) throw new Error('字符串未闭合')
      t.push({ k: 'str', v: s }); i = j + 1; continue
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i; while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++
      const w = src.slice(i, j), lw = w.toLowerCase()
      if (lw === 'and' || lw === 'or' || lw === 'not') t.push({ k: 'kw', v: lw })
      else if (lw === 'null') t.push({ k: 'lit', v: null })
      else if (lw === 'true' || lw === 'false') t.push({ k: 'lit', v: lw === 'true' })
      else if (EXPR_FUNC_SET.has(lw)) t.push({ k: 'fn', v: lw })
      else t.push({ k: 'id', v: w })
      i = j; continue
    }
    const two = src.slice(i, i + 2)
    if (two === '>=' || two === '<=' || two === '<>' || two === '!=' || two === '==') { t.push({ k: 'op', v: two === '<>' ? '!=' : two === '==' ? '=' : two }); i += 2; continue }
    if (c === '(' || c === ')' || c === ',') { t.push({ k: 'p', v: c }); i++; continue }
    if ('+-*/%^<>=?:'.indexOf(c) >= 0) { t.push({ k: 'op', v: c }); i++; continue }
    throw new Error('非法字符 "' + c + '"（位置 ' + i + '）')
  }
  return t
}

// 优先级（低→高）：?: → or → and → not → 比较 → 加减 → 乘除模幂 → 一元± → 原子
export function parseExpr(src) {
  const s = String(src)
  if (!s || s.length > 300) throw new Error('表达式为空或过长（上限 300 字符）')
  const hit = exprCache.get(s); if (hit) return hit
  const toks = tokenizeExpr(s)
  if (!toks.length) throw new Error('表达式为空')
  let p = 0
  const peek = () => toks[p]
  const next = () => toks[p++]
  const eat = (v) => { const t = peek(); if (t && t.v === v && (t.k === 'op' || t.k === 'p')) { p++; return true } return false }
  const expect = (v) => { if (!eat(v)) throw new Error('缺少 "' + v + '"（位置 ' + p + '）') }
  function ternary() { const c = orE(); if (peek() && peek().k === 'op' && peek().v === '?') { next(); const a = ternary(); expect(':'); const b = ternary(); return { t: 'cond', c: c, a: a, b: b } } return c }
  function orE() { let l = andE(); while (peek() && peek().k === 'kw' && peek().v === 'or') { next(); l = { t: 'bin', op: 'or', l: l, r: andE() } } return l }
  function andE() { let l = notE(); while (peek() && peek().k === 'kw' && peek().v === 'and') { next(); l = { t: 'bin', op: 'and', l: l, r: notE() } } return l }
  function notE() { if (peek() && peek().k === 'kw' && peek().v === 'not') { next(); return { t: 'un', op: 'not', e: notE() } } return compare() }
  function compare() { let l = addE(); while (peek() && peek().k === 'op' && ['=', '!=', '>', '>=', '<', '<='].indexOf(peek().v) >= 0) { const op = next().v; l = { t: 'bin', op: op, l: l, r: addE() } } return l }
  function addE() { let l = mulE(); while (peek() && peek().k === 'op' && (peek().v === '+' || peek().v === '-')) { const op = next().v; l = { t: 'bin', op: op, l: l, r: mulE() } } return l }
  function mulE() { let l = unary(); while (peek() && peek().k === 'op' && ['*', '/', '%', '^'].indexOf(peek().v) >= 0) { const op = next().v; l = { t: 'bin', op: op, l: l, r: unary() } } return l }
  function unary() { if (peek() && peek().k === 'op' && peek().v === '-') { next(); return { t: 'un', op: '-', e: unary() } } if (peek() && peek().k === 'op' && peek().v === '+') { next(); return unary() } return primary() }
  function primary() {
    const t = next()
    if (!t) throw new Error('表达式意外结束')
    if (t.k === 'num' || t.k === 'str' || t.k === 'lit') return { t: 'lit', v: t.v }
    if (t.k === 'id') return { t: 'col', name: t.v }
    if (t.k === 'fn') { const args = []; expect('('); if (!eat(')')) { args.push(ternary()); while (eat(',')) args.push(ternary()); expect(')') } return { t: 'fn', name: t.v, args: args } }
    if (t.k === 'p' && t.v === '(') { const e = ternary(); expect(')'); return e }
    throw new Error('语法错误于 "' + t.v + '"')
  }
  const ast = ternary()
  if (p < toks.length) throw new Error('尾部多余内容 "' + toks[p].v + '"')
  if (exprCache.size > 500) exprCache.clear()
  exprCache.set(s, ast)
  return ast
}

function exprEmpty(v) { return v === null || v === undefined || v === '' }
function exprNum(v) { return exprEmpty(v) ? NaN : (typeof v === 'number' ? v : Number(v)) }
function exprTruthy(v) { if (exprEmpty(v) || v === false) return false; if (typeof v === 'number') return v !== 0; const n = Number(v); return Number.isFinite(n) ? n !== 0 : true }
function exprEq(a, b) {
  if (exprEmpty(a) && exprEmpty(b)) return true
  if (exprEmpty(a) || exprEmpty(b)) return false
  const na = Number(a), nb = Number(b)
  if (Number.isFinite(na) && Number.isFinite(nb)) return na === nb
  return String(a) === String(b)
}
function exprDateParts(v) {
  if (exprEmpty(v)) return null
  if (v instanceof Date) return { y: v.getFullYear(), mo: v.getMonth() + 1, d: v.getDate() }
  const s = String(v).trim()
  const m = /^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/.exec(s)
  if (m) return { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) }
  const ts = Date.parse(s)
  if (Number.isNaN(ts)) return null
  const dt = new Date(ts)
  return { y: dt.getFullYear(), mo: dt.getMonth() + 1, d: dt.getDate() }
}

export function evalNode(n, row, keys) {
  switch (n.t) {
    case 'lit': return n.v
    case 'col': {
      if (Object.prototype.hasOwnProperty.call(row, n.name)) return row[n.name]
      throw new Error('表达式引用未知列 "' + n.name + '"' + (keys && keys.length ? '（可用列: ' + keys.slice(0, 30).join(', ') + '）' : ''))
    }
    case 'un': {
      if (n.op === 'not') return !exprTruthy(evalNode(n.e, row, keys))
      const x = exprNum(evalNode(n.e, row, keys)); return Number.isFinite(x) ? -x : null
    }
    case 'cond': return exprTruthy(evalNode(n.c, row, keys)) ? evalNode(n.a, row, keys) : evalNode(n.b, row, keys)
    case 'bin': {
      if (n.op === 'and') return exprTruthy(evalNode(n.l, row, keys)) && exprTruthy(evalNode(n.r, row, keys))
      if (n.op === 'or') return exprTruthy(evalNode(n.l, row, keys)) || exprTruthy(evalNode(n.r, row, keys))
      const l = evalNode(n.l, row, keys), r = evalNode(n.r, row, keys)
      if (n.op === '=' || n.op === '!=') { const eq = exprEq(l, r); return n.op === '=' ? eq : !eq }
      if (['+', '-', '*', '/', '%', '^'].indexOf(n.op) >= 0) {
        const a = exprNum(l), b = exprNum(r)
        if (!Number.isFinite(a) || !Number.isFinite(b)) return null
        if (n.op === '+') return a + b; if (n.op === '-') return a - b; if (n.op === '*') return a * b
        if (n.op === '/') return b === 0 ? null : a / b; if (n.op === '%') return b === 0 ? null : a % b
        return Math.pow(a, b)
      }
      // 大小比较：空值一律 null；两边可数值化按数值，否则按字符串
      if (exprEmpty(l) || exprEmpty(r)) return null
      const la = exprNum(l), lb = exprNum(r)
      const cmp = Number.isFinite(la) && Number.isFinite(lb) ? (la < lb ? -1 : la > lb ? 1 : 0) : (String(l) < String(r) ? -1 : String(l) > String(r) ? 1 : 0)
      if (n.op === '>') return cmp > 0; if (n.op === '>=') return cmp >= 0
      if (n.op === '<') return cmp < 0; return cmp <= 0
    }
    case 'fn': {
      const vals = n.args.map(function (a) { return evalNode(a, row, keys) })
      const nm = function (i) { const x = exprNum(vals[i]); return Number.isFinite(x) ? x : null }
      switch (n.name) {
        case 'abs': { const x = nm(0); return x === null ? null : Math.abs(x) }
        case 'round': { const x = nm(0); if (x === null) return null; const d = nm(1); const f = Math.pow(10, d === null ? 0 : Math.max(0, Math.min(10, Math.round(d)))); return Math.round(x * f) / f }
        case 'floor': { const x = nm(0); return x === null ? null : Math.floor(x) }
        case 'ceil': { const x = nm(0); return x === null ? null : Math.ceil(x) }
        case 'sqrt': { const x = nm(0); return x === null || x < 0 ? null : Math.sqrt(x) }
        case 'pow': { const a = nm(0), b = nm(1); return a === null || b === null ? null : Math.pow(a, b) }
        case 'exp': { const x = nm(0); return x === null ? null : Math.exp(x) }
        case 'ln': case 'log': { const x = nm(0); return x === null || x <= 0 ? null : Math.log(x) }
        case 'log10': { const x = nm(0); return x === null || x <= 0 ? null : Math.log10(x) }
        case 'min': case 'max': {
          let best = null
          vals.forEach(function (v) { const x = exprNum(v); if (!Number.isFinite(x)) return; if (best === null || (n.name === 'min' ? x < best : x > best)) best = x })
          return best
        }
        case 'coalesce': for (const v of vals) if (!exprEmpty(v)) return v; return null
        case 'if': return exprTruthy(vals[0]) ? (vals[1] === undefined ? null : vals[1]) : (vals[2] === undefined ? null : vals[2])
        case 'year': case 'month': case 'quarter': case 'day': case 'weekday': {
          const dp = exprDateParts(vals[0]); if (!dp) return null
          if (n.name === 'year') return dp.y
          if (n.name === 'month') return dp.mo
          if (n.name === 'quarter') return Math.floor((dp.mo - 1) / 3) + 1
          if (n.name === 'day') return dp.d
          return new Date(Date.UTC(dp.y, dp.mo - 1, dp.d)).getUTCDay() // 0=周日…6=周六
        }
        case 'length': return exprEmpty(vals[0]) ? 0 : String(vals[0]).length
        case 'concat': return vals.map(function (v) { return exprEmpty(v) ? '' : String(v) }).join('')
        case 'upper': return exprEmpty(vals[0]) ? null : String(vals[0]).toUpperCase()
        case 'lower': return exprEmpty(vals[0]) ? null : String(vals[0]).toLowerCase()
      }
      throw new Error('未知表达式函数 "' + n.name + '"（可用: ' + EXPR_FUNCS.join('/') + '）')
    }
  }
  throw new Error('未知表达式节点类型')
}

export function exprCols(n, out) {
  out = out || new Set()
  if (!n || typeof n !== 'object') return out
  if (n.t === 'col') out.add(n.name)
  else if (n.t === 'bin') { exprCols(n.l, out); exprCols(n.r, out) }
  else if (n.t === 'un') exprCols(n.e, out)
  else if (n.t === 'cond') { exprCols(n.c, out); exprCols(n.a, out); exprCols(n.b, out) }
  else if (n.t === 'fn') n.args.forEach(function (a) { exprCols(a, out) })
  return out
}

// group_by 项访问器：统一 {plain, label, cols, get(row, keys)}；纯列名走零开销直取（旧行为）
export function colAccessor(ref) {
  if (typeof ref === 'string' && EXPR_IDENT.test(ref)) {
    return { plain: true, label: ref, cols: [ref], get: function (row) { const v = row[ref]; return v === null || v === undefined ? '' : v } }
  }
  let expr = null, alias = null
  if (typeof ref === 'string') expr = ref
  else if (ref && typeof ref === 'object' && typeof ref.expr === 'string') { expr = ref.expr; alias = typeof ref.as === 'string' && ref.as ? ref.as : null }
  else throw new Error('group_by 项必须是列名字符串或 {expr, as} 表达式对象')
  const ast = parseExpr(expr)
  return { plain: false, label: alias || expr, cols: Array.from(exprCols(ast)), get: function (row, keys) { const v = evalNode(ast, row, keys); return v === undefined ? null : v } }
}

// 指标访问器：数值口径与原实现一致（调用方 Number(...)，非有限值按聚合规则跳过）
export function metricAccessor(m) {
  const col = m && m.column
  if (typeof col === 'string' && EXPR_IDENT.test(col)) {
    return { plain: true, column: col, alias: m.alias, num: function (row) { return row[col] } }
  }
  const ast = parseExpr(String(col))
  return { plain: false, column: col, alias: m.alias, num: function (row, keys) { return evalNode(ast, row, keys) } }
}

// 仅当定义里真的含表达式时才收集首行列名（供未知列错误信息），纯旧定义零额外开销
export function evalKeysIfExpr(chart, rows) {
  if (!rows.length) return null
  const hasExpr = (chart.group_by || []).some(function (g) { return !(typeof g === 'string' && EXPR_IDENT.test(g)) }) || (chart.metrics || []).some(function (m) { return !(m && typeof m.column === 'string' && EXPR_IDENT.test(m.column)) })
  return hasExpr ? Object.keys(rows[0]) : null
}

// ===== join：维表整行并入事实行（主表同名列优先，不覆盖）=====
export function mergeJoinRows(factRows, dimRows, leftKey, rightKey) {
  const map = new Map()
  for (const d of dimRows) {
    const k = d[rightKey]
    if (k === null || k === undefined) continue
    const kk = String(k)
    if (!map.has(kk)) map.set(kk, d)
  }
  for (const f of factRows) {
    const k = f[leftKey]
    if (k === null || k === undefined) continue
    const d = map.get(String(k))
    if (!d) continue
    for (const key in d) if (!Object.prototype.hasOwnProperty.call(f, key)) f[key] = d[key]
  }
  return factRows
}

// JS 侧行过滤器：覆盖 filterItem 全部 op（join 后维表列的筛选无法下沉到单表 /api/query，这里补）
function likeRegExp(pat, ci) {
  const body = String(pat).split('').map(function (ch) { if (ch === '%') return '.*'; if (ch === '_') return '.'; return /[.*+?^${}()|[\]\\]/.test(ch) ? '\\' + ch : ch }).join('')
  return new RegExp('^' + body + '$', ci ? 'i' : '')
}
export function jsFilterMatch(row, f) {
  const v = row[f.column], op = f.op, fv = f.value
  if (op === 'IS_NULL') return exprEmpty(v)
  if (op === 'IS_NOT_NULL') return !exprEmpty(v)
  if (op === '=') return exprEq(v, fv)
  if (op === '!=') return !exprEq(v, fv)
  if (op === 'IN') return Array.isArray(fv) && fv.some(function (x) { return exprEq(v, x) })
  if (op === 'NOT_IN') return Array.isArray(fv) && !fv.some(function (x) { return exprEq(v, x) })
  if (op === 'LIKE' || op === 'ILIKE') { if (exprEmpty(v) || exprEmpty(fv)) return false; return likeRegExp(fv, op === 'ILIKE').test(String(v)) }
  if (op === 'BETWEEN') {
    const arr = Array.isArray(fv) ? fv : []; if (arr.length < 2 || exprEmpty(v)) return false
    const cmp = function (x, y) { const nx = exprNum(x), ny = exprNum(y); if (Number.isFinite(nx) && Number.isFinite(ny)) return nx < ny ? -1 : nx > ny ? 1 : 0; return String(x) < String(y) ? -1 : String(x) > String(y) ? 1 : 0 }
    return cmp(v, arr[0]) >= 0 && cmp(v, arr[1]) <= 0
  }
  if (['>', '>=', '<', '<='].indexOf(op) >= 0) {
    if (exprEmpty(v) || exprEmpty(fv)) return false
    const nv = exprNum(v), nf = exprNum(fv)
    const c = Number.isFinite(nv) && Number.isFinite(nf) ? (nv < nf ? -1 : nv > nf ? 1 : 0) : (String(v) < String(fv) ? -1 : String(v) > String(fv) ? 1 : 0)
    if (op === '>') return c > 0; if (op === '>=') return c >= 0; if (op === '<') return c < 0; return c <= 0
  }
  return true
}
export function applyJsFilters(rows, filters) { return rows.filter(function (r) { return filters.every(function (f) { return jsFilterMatch(r, f) }) }) }
