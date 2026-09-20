# dsh-bi-dashboards 插件迭代进度

> 记录各轮 feature 迭代的目标 / 产出 / 验证 / 提交。章节号沿用主进度文档约定（第十二章 = 本插件）。

## 第十二章：dsh-bi-dashboards（无人超市 AI BI 插件）

### 12.1 feat-20260920-chart-schema —— 图表 Schema 扩展（heatmap / Host join / 表达式字段）

- **目标**：Host 侧图表 Schema 扩展：heatmap 注册 + 放开 ECharts 类型、JS 侧 join、表达式 group_by/计算字段（不改 ECharts/data-service）
- **产出**：`src/bi-expr.js` 安全表达式求值器 + join/JS 过滤纯函数层；heatmap 因客户端剥离 visualMap 改用 itemStyle 预着色；join 限一表
- **验证**：19 单测 + 6 e2e 全绿、npm run build 通过
- **提交**：bdb9c02 + 19bdd27（已 ff-merge 至 master 19bdd27）

### 12.2 slash-20260920-bicreate —— 新图表能力融入斜杠命令层

- **目标**：/bi-create 引导文案、CHART.md、README、lib 重建
- **产出**：纯文案改动，/bi-create 流程字节一致；CHART.md 三处过时表述修正
- **提交**：a8d2d9e（已 ff-merge 至 master）

### 12.3 bi-capability-v2 r1 —— 取数能力增强（P0-2 / P0-3 / P0-4+P1-4）

- **目标**：数据获取半部能力提升：① 日期时间表达式函数 hour/minute/datediff/date_add；② 筛选值支持相对时间记号（'now'/'today-1'/'-30d'/{relative}，取数时解析为绝对时间，payload 与 JS 过滤两路径一致，每图渲染一个 now 快照，静态值逐字节不变）；③ join 接受链式对象数组（最多 4 级按序合并，后级可引用前级产出列）+ join.type left|inner（缺省=旧合并语义）
- **产出**：`src/bi-expr.js`（EXPR_FUNCS 扩展 + exprDateParts 时间成分 + shiftDate/resolveRelToken/resolveFilters + mergeJoinRows 带 joinType + normalizeJoins）；`src/index.js`（renderChartDef 泛化为多级 join + 相对时间解析点；validateChartDef join 段全量校验；systemPrompt / render_dashboard / /bi-create 契约文案同步）；`scripts/verify-bicap-r1.mjs`（mock 数据服务 8610 端口回归 harness，支持 master/新 lib 双跑字节对拍）；lib/index.js 重建
- **验证**：18/18 功能检查（24x7 heatmap hour×weekday、注入时钟验证相对窗口自动平移与同图 now 确定性、两级链 mid_category 中文名分组、left 保留/inner 剔除未命中行）；6 个旧式定义 payload+render 结果与 master b663926 cmp 字节相等（向后兼容）；node --check ×2 + npm run build 通过
- **契约要点**：datediff(后,前)=相差整天数；date_add 单位 day/week/month/year/hour/minute（月/年平移钳制月末），为 P1-2 同环比预留可组合底座；相对记号对日期列用 today 系（输出 YYYY-MM-DD）、时间戳列用 now 系（输出完整时刻）；join 链上限 4 级
- **提交**：feature/bi-capability-v2 @ 772e669 / 973641c / docs（本次）

### 12.4 bi-capability-v2 r2 —— 聚合能力增强（P0-1 / P1-1 / P1-3）

- **目标**：聚合半部能力提升：① 多指标/图表（按图型上限：bar/line/area ≤4、table ≤6、kpi 主值+对比值 ≤2，其余 1 个；直角坐标 2+ 指标每指标一条 series、第 2 条起 yAxisIndex:1 双 Y 轴）；② count_distinct 去重计数聚合；③ having 聚合后筛选（filters 写 {metric, op, value}，聚合后、sort/limit 前执行，与取数前筛选叠加）
- **产出**：`src/index.js`（aggregate 组内 Set 去重 + applyHaving 前置；月粒度路径 count_distinct 按日 Set 按月并集；buildOption 多 series/双 Y 轴/kpi compare（单指标输出逐字节不变）；validateChartDef 按图型上限/alias 唯一/having 形式与 metric∈aliases 校验；DSL filterItem/metricItem 放开+AGG_ENUM；systemPrompt / render_dashboard / /bi-create / modify_chart 契约文案同步）；`src/bi-expr.js`（havingFilters/applyHaving）；`scripts/verify-bicap-r2.mjs`（8611 端口回归 harness，支持 pre-R2/新 lib 双跑字节对拍）；lib/index.js 重建
- **验证**：R2 harness 34/34（销售额+订单量双 series、件单价第二 Y 轴 yAxisIndex=1、采购三聚合列表格、重复行 count_distinct 当日成交人数/在售SKU数、销售额>100 having 及与 pre-agg 筛选/limit 组合、各图型上限 named-field 报错、kpi value+compare）；R1 harness 18/18；R1 6 定义 + R2 6 旧式定义 payload+render 与 pre-R2 lib cmp 字节相等（向后兼容）；node --check ×2 + npm run build 通过
- **契约要点**：多指标是通用组合规则非新图型（一条规则解锁一整类「量纲悬殊双轴」看板）；count_distinct 不可按日/月分解，月值=集合并集 size（见 PLUGIN.md E8）；having 绝不进入取数 payload（metric 无 column，服务端必 400），复用 jsFilterMatch 全 op；kpi 第 2 指标仅透出 option.compare 数值，P1-2 同环比下轮在此落点
- **提交**：feature/bi-capability-v2 @ eb81c1b + docs（本次）

### 12.5 bi-capability-v2 r3 —— 展示层能力增强（P2-1 / P2-2 / P1-2 / P1-5）+ 更新提示语精简

- **目标**：展示半部能力提升：① 指标格式化（metrics[].format {unit:'千'|'万', decimals, prefix:'¥'}，显示层 千/万缩放+前缀+千分位+小数位）；② 枚举映射（图表级 value_map {原始值:显示名}，表格分组列与轴/饼图/热力图类目名显示层映射）；③ kpi 同环比（compare {type:'prev_day'|'prev_period'}，Host 复用相对筛选机制解析时间窗后对齐平移，自行补一次 /api/query 取对比值）；④ 表格条件格式 rules（{column,op,value,style:{color,background}}）+ showTotals 数值列合计行；⑤ 附带文案：UPD_NATIVE_HINT 精简为「点更新将拉取最新版本」（通道逻辑零改动）
- **产出**：`src/index.js`（fmtMetricDisplay/mapDisp/buildTableOption 显示副本层 + shiftAbsDateStr/periodSpanDays/computeCompare 同环比取数；buildOption 增加 cmp 形参，未用新键路径逐字节不变；validateChartDef format/value_map/compare/rules/showTotals 全量校验；systemPrompt / render_dashboard / /bi-create / modify_chart 契约文案同步）；`scripts/verify-bicap-r3.mjs`（8612 端口回归 harness，支持 pre-R3/新 lib 双跑字节对拍）；lib/index.js 重建；CHART.md L1 层同环比表述更新 + 需求确认清单新增 4 条推荐；PLUGIN.md E9（探针先于宣称）
- **验证**：R3 harness 35/35（6,698,990→¥669.9万 kpi+表格且原始行不变、value_map 待处理/已处理仅显示层、注入时钟证明 prev_day/prev_period 窗口随时钟平移且 payload 落在前一日/上一等长窗、rules cellStyles+showTotals 合计 23/70、全部 named-field 报错）；R1 18/18、R2 34/34；8 旧式定义（含 R2 kpi 双指标形态）payload+render 与 pre-R3 lib cmp 字节相等（向后兼容）；echarts 5.5.1 SSR 探针证明格式化字符串不能进 series.data（见 E9）；node --check ×2 + npm run build 通过
- **契约要点**：一切展示变换只落 client 真正渲染的面——kpi 仅渲染 option.value 文本（同环比副标签并入 value，compare/comparePct/compareLabel 结构化透出）；表格 td 不消费样式（cellStyles 仅数据透出并如实记录）；option 经 JSON 序列化，formatter 函数不可用；柱/线 series 保持数值轴原始刻度
- **提交**：feature/bi-capability-v2 @ eee64e6 + docs（本次）
