// bi-capability-v2 R4 (P2-5)：看板能力契约的单一事实源（single source of truth）。
// systemPrompt 的 dashboard-schema 段落里所有「能力事实」句（图型枚举/每图型指标上限/agg 枚举/
// join 形态与上限/表达式函数表/相对时间记号/having/format/value_map/rules/showTotals/filtersFrom）
// 一律由 describeCapabilities() 从这里的常量渲染生成；index.js 只保留流程性散文（调用步骤、
// dsh-ui 围栏、示例），经 dashboardSchemaSection() 拼接。scripts/verify-capability-guard.mjs
// 在 build/verify 路径上 loudly 校验：手写文本与生成事实分歧（漏改/改错数字）即 fail。
// 原则：生成紧凑事实句，不生成教程（模型侧 token 成本不膨胀）。
import { EXPR_FUNCS } from './bi-expr.js'

export const CHART_TYPES = ['bar', 'line', 'area', 'pie', 'scatter', 'heatmap', 'radar', 'funnel', 'gauge', 'table', 'text', 'kpi']
// 每图型指标上限（P0-1）：柱/线/面积 4 条 series（第 2 条起双轴）；表格 6 个聚合列；
// kpi 主值+对比值 2 个；其余图型保持该类型自然形态（1 个指标）
export const METRIC_CAPS = { bar: 4, line: 4, area: 4, table: 6, kpi: 2 }
export const AGG_ENUM = ['sum', 'count', 'avg', 'min', 'max', 'count_distinct']
// join 链上限（P0-4/P1-4）：链式对象数组按序合并的最大级数
export const JOIN_MAX_LEVELS = 4
// 相对时间记号偏移单位（P0-3）
export const REL_UNITS = ['d', 'w', 'm', 'y', 'h', 'min']

// 生成：每图型指标上限句（数字全部来自 METRIC_CAPS，勿在别处手写）
function metricCapsSentence() {
  const byCap = {}
  ;['bar', 'line', 'area'].forEach(function (t) { (byCap[METRIC_CAPS[t]] = byCap[METRIC_CAPS[t]] || []).push(t) })
  const rect = Object.keys(byCap).map(function (cap) { return byCap[cap].join('/') + ' ≤' + cap + ' 个' }).join('、')
  return '指标（{column, agg, alias}）按图型有上限：' + rect + '（一个图同时看销售额+订单量等），table ≤' + METRIC_CAPS.table + ' 个聚合列，kpi 最多 ' + METRIC_CAPS.kpi + ' 个（第 1 个=主值，第 2 个=对比值）；其余图型 1 个指标。'
}
// 生成：join 形态句（级数来自 JOIN_MAX_LEVELS）
function joinSentence() {
  return '跨表关联：图表可加 join 关联维表——单对象 {table:"维表", left_key:"主表列", right_key:"维表关联列"} 或对象数组（链式，最多 ' + JOIN_MAX_LEVELS + ' 级按序合并，后级 left_key 可引用前级产出的维表列，如 销售明细→商品主档→品类维度 后按 mid_category 分组）；可选项 join.type:"left"|"inner"（缺省 left=未命中事实行保留，inner=未命中事实行剔除）。'
}
// 生成：表达式函数表（来自 EXPR_FUNCS）
function exprFuncsSentence() {
  const fns = EXPR_FUNCS.map(function (f) { if (f === 'weekday') return 'weekday(0=周日)'; if (f === 'datediff') return 'datediff(后,前)=相差天数'; if (f === 'date_add') return 'date_add(日期,n,单位=day|week|month|year|hour|minute)'; return f }).join('/')
  return '计算字段：group_by 项与 metrics.column 可写表达式字符串（如 "product_price * product_qty"、"pay_amount / product_qty"、"month(order_date)"）或 {expr:"...", as:"别名"}；支持 + - * / % ^、( )、==/!=/<>、> >= < <=、and/or/not、a?b:c、null/true/false 字面量，函数 ' + fns + '；纯列名照旧直接取值。'
}
// 生成：相对时间记号句（单位来自 REL_UNITS）
function relTokenSentence() {
  return '相对时间筛选：filters[].value 可写相对时间记号（渲染时解析为绝对时间）——"now"=当前时刻、"today"=今天、"today-1"=昨天、"-30d"/"+7w"/"-1m"=相对当前偏移（单位 ' + REL_UNITS.join('/') + '）、BETWEEN 数组逐项解析或对象 {relative:"-30d"}；同图多筛选共用同一 now 快照，每次打开看板自动重算窗口；日期列用 today 系（输出 YYYY-MM-DD），时间戳列用 now 系（输出完整时刻）。'
}
// 生成：agg 枚举句
function aggSentence() {
  return 'agg 支持 ' + AGG_ENUM.join('/') + '（去重计数，如 成交人数=count_distinct(order_no)）。'
}
// 生成：图型枚举句
function typesSentence() {
  return '【进阶能力】图表类型支持 bar/line/area(面积图)/pie/scatter/heatmap/radar/funnel/gauge/table/text/kpi；heatmap 需恰好 2 个 group_by（第一维=X 轴、第二维=Y 轴）+1 指标；radar 当前按折线渲染。'
}
// 生成：看板级筛选绑定句（P2-3，含缺省语义——文档化规则）
function filtersFromSentence() {
  return '看板级筛选（filter_fields）：默认绑定=筛选列出现在图表取数列中（group_by/metrics/filters/time_column）才应用到该图，图表用不到的筛选列自动跳过、不报错；图表可加 filtersFrom:["列",...] 显式声明接受的看板筛选字段（可少选收窄、也可声明本表有但未取的列放宽），filtersFrom:[] 表示不接受任何看板筛选。'
}
// 生成：紧凑事实清单（机器可校验形态，供 guard 与文档对账；非模型面）
export function capabilityFacts() {
  const byCap = {}
  ;['bar', 'line', 'area'].forEach(function (t) { (byCap[METRIC_CAPS[t]] = byCap[METRIC_CAPS[t]] || []).push(t) })
  const rect = Object.keys(byCap).map(function (cap) { return byCap[cap].join('/') + '≤' + cap }).join(' ')
  return [
    'types: ' + CHART_TYPES.join('/'),
    'metric_caps: ' + rect + ' table≤' + METRIC_CAPS.table + ' kpi≤' + METRIC_CAPS.kpi + ' 其余1',
    'agg: ' + AGG_ENUM.join('/'),
    'join: 单对象或链式数组≤' + JOIN_MAX_LEVELS + '级 type=left|inner(缺省left)',
    'expr_funcs: ' + EXPR_FUNCS.join('/'),
    'rel_tokens: now/today/today-N/±Nu 单位' + REL_UNITS.join('/'),
    'having: filters{metric,op,value}',
    'format: {unit:"千"|"万",decimals 0~6,prefix}',
    'value_map/rules/showTotals: table 展示增强',
    'compare: kpi prev_day|prev_period',
    'filtersFrom: 缺省=取数列命中才应用,否则跳过不报错;[]=全不接受'
  ].join('\n')
}
// 渲染 systemPrompt dashboard-schema 段的全部「能力事实」散文（保持既有 prose 风格，数字/枚举出自常量）
export function describeCapabilities() {
  return [
    metricCapsSentence(),
    '直角坐标图 2+ 指标时第 2 条 series 自动挂第二 Y 轴（量纲悬殊的组合如 销售额+客单价 直接写两个指标即可）；各指标别名 alias 必须唯一。',
    aggSentence(),
    '图表必须写 table。',
    typesSentence(),
    joinSentence(),
    'Host 分别取各表后按行合并，维表字段可直接用于 group_by/metrics/filters（如主表含 cate_code 时 join category_dim 后即可按 big_category 分组）。',
    exprFuncsSentence(),
    relTokenSentence(),
    '聚合后筛选（having）：filters 项可写 {metric:"<指标alias>", op, value}（如 "销售额>100 的品类"），在聚合后按指标值过滤，可与取数前 column 筛选叠加。',
    '显示层格式化：metrics 项可加 format {unit:"千"|"万", decimals:0~6, prefix:"¥"}（表格单元格与 kpi 数值按 千/万 缩放+前缀+千分位+小数位显示，如 6698990+{unit:"万",decimals:1,prefix:"¥"} → ¥669.9万；原始聚合值不变；柱/线等数值轴仍按原始刻度）。',
    '枚举映射：图表级可加 value_map {原始值:"显示名"}（表格分组列与轴/饼图类目名显示层映射，如 {"0":"待处理","1":"已处理"}）。',
    'kpi 同环比：kpi 可加 compare {type:"prev_day"|"prev_period"}（需带时间列筛选；Host 自动把时间窗对齐平移前一日/上一等长窗口再取一次数，KPI 显示值附「较前一日/较上一周期 ±x.x%」；此时 metrics 恰 1 个，不与 granularity:"month" 混用）。',
    '表格增强：table 可加 rules [{column, op, value, style:{color,background}}] 条件格式（匹配行/单元格按规则着色；当前客户端表格暂不渲染样式，仅透出数据）与 showTotals:true（数值指标列自动追加合计行）。',
    filtersFromSentence()
  ].join('\n')
}
// systemPrompt 段全文 = 流程散文(手写,无事实数字) + 生成事实 + 流程散文
const PROSE_HEAD = '【看板 Dashboard 生成】\n1. 调用 render_dashboard 生成看板（传入结构化 schema，顶层含 title/description/charts；销售必须 filters order_status=1；趋势图加时间过滤；字段来自 get_meta）。月度汇总柱状图可在图表定义里加 granularity:"month"，并用 time_column 指定日期列（缺省 order_date，Host 会按日聚合后合并为月）。'
const PROSE_TAIL = '\n2. 生成后，工具结果会给出本次预览ID（previewId）。用一句话总结看板要点，并在回复【最后】追加 dsh-ui 围栏，ID 必须使用本次返回的 previewId（每个看板一个独立ID，互不覆盖）：\n```\ndsh-ui\n{"kind":"dashboard","id":"<previewId>"}\n```\n3. 然后询问用户是否保存到「我的看板」，确认后调用 save_dashboard 工具。也可以让用户直接点预览卡片里每个图表旁的「保存」按钮单独保存。'
export function dashboardSchemaSection() { return PROSE_HEAD + describeCapabilities() + PROSE_TAIL }
