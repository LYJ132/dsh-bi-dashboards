#!/usr/bin/env node
// bi-capability-v2 R4 (P2-5)：能力契约分歧 guard（loudly fail on divergence）。
// 校验 lib（默认 ./lib/index.js，也可传 src 组合模块路径）中：
//   1. describeCapabilities() 生成的紧凑事实清单覆盖 R1-R4 全部能力边（图型/上限/agg/join 级数/
//      表达式函数表/相对记号/having/format/value_map/compare/rules/showTotals/filtersFrom）；
//   2. systemPrompt dashboard-schema 段全文包含 describeCapabilities() 输出逐字（组合未脱钩）；
//   3. 手写契约文本（render_dashboard 工具描述、/bi-create 命令提示）与生成事实一致：
//      手写数字/枚举必须与生成事实中的记号逐字出现（漏改/改错即失败）。
// build 路径：scripts/build.mjs 打包后自动调用；也可独立运行 node scripts/verify-capability-guard.mjs [libPath]。
const REQUIRED_FACT_SUBSTRINGS = [
  'bar/line/area ≤4 个', 'table ≤6 个聚合列', 'kpi 最多 2 个',
  'sum/count/avg/min/max/count_distinct',
  '最多 4 级按序合并', 'join.type:"left"|"inner"',
  'weekday(0=周日)', 'datediff(后,前)=相差天数', 'date_add(日期,n,单位=day|week|month|year|hour|minute)',
  '单位 d/w/m/y/h/min', '"-30d"/"+7w"/"-1m"',
  '{metric:"<指标alias>", op, value}',
  'format {unit:"千"|"万", decimals:0~6, prefix:"¥"}',
  'value_map {原始值:"显示名"}', 'prev_day"|"prev_period', 'rules [{column, op, value, style:{color,background}}]', 'showTotals:true',
  'filtersFrom:["列",...]', 'filtersFrom:[] 表示不接受任何看板筛选'
]
// 手写文本必须出现的生成事实记号（改错数字 → 记号消失 → guard 报错）
const HAND_TOKENS = {
  renderTool: ['≤4、表≤6、kpi≤2', 'count_distinct', 'join.type=left|inner', 'now/today-1/-30d/{relative}', '{metric, op, value}', 'metrics.format', 'value_map', 'prev_day/prev_period', 'rules', 'showTotals', 'filtersFrom'],
  cmdPrompt: ['≤4 个', '≤6 列', 'count_distinct', 'type:"left"|"inner"', '"today"=今天', '{metric:"<指标alias>", op, value}', 'prev_day"|"prev_period', 'showTotals:true', 'filtersFrom']
}

export async function runGuard(libPath) {
  const lib = await import(new URL(libPath, 'file://' + process.cwd() + '/').href)
  const problems = []
  const facts = lib.describeCapabilities && lib.describeCapabilities()
  if (!facts || typeof facts !== 'string' || facts.length < 100) problems.push('describeCapabilities() 缺失或输出异常')
  const factsCompact = lib.capabilityFacts && lib.capabilityFacts()
  if (!factsCompact || typeof factsCompact !== 'string') problems.push('capabilityFacts() 缺失')
  const section = lib.dashboardSchemaSection && lib.dashboardSchemaSection()
  if (!section || typeof section !== 'string') problems.push('dashboardSchemaSection() 缺失')
  if (facts && section && section.indexOf(facts) < 0) problems.push('systemPrompt 段未逐字包含 describeCapabilities() 输出（组合已脱钩）')
  if (facts) {
    REQUIRED_FACT_SUBSTRINGS.forEach(function (t) { if (facts.indexOf(t) < 0) problems.push('生成事实缺少能力边记号: "' + t + '"') })
  }
  const hand = lib.DASH_CONTRACT_HAND || {}
  Object.keys(HAND_TOKENS).forEach(function (k) {
    const txt = hand[k]
    if (typeof txt !== 'string' || !txt) { problems.push('DASH_CONTRACT_HAND.' + k + ' 缺失（guard 无法对手写契约文本对账）'); return }
    HAND_TOKENS[k].forEach(function (t) { if (txt.indexOf(t) < 0) problems.push('手写契约文本 ' + k + ' 与生成事实分歧：缺少记号 "' + t + '"（能力变更后请同步更新，或改由生成）') })
  })
  if (problems.length) {
    console.error('CAPABILITY GUARD FAILED — 手写契约文本与生成能力事实分歧：')
    problems.forEach(function (p) { console.error('  - ' + p) })
    throw new Error('capability contract guard failed (' + problems.length + ' problem(s))')
  }
  console.log('capability contract guard OK (' + REQUIRED_FACT_SUBSTRINGS.length + ' fact edges, hand texts: ' + Object.keys(HAND_TOKENS).join('/') + ')')
}

if (process.argv[1] && process.argv[1].endsWith('verify-capability-guard.mjs')) {
  runGuard(process.argv[2] || './lib/index.js').catch(function (e) { console.error(e.message); process.exit(1) })
}
