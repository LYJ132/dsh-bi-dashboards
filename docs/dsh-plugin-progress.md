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
### 12.6 bi-capability-v2 r4 —— 治理层：筛选显式绑定 + 能力契约单一源（P2-3 / P2-5）

- **目标**：治理半部：① P2-3 看板级筛选绑定显式化——缺省规则文档化（筛选列在图表取数列中才应用，用不到的筛选自动跳过不报错），图表可加 filtersFrom 显式收窄/放宽/全拒；候选筛选字段不再推荐无图可消费的维表列；② P2-5 能力契约单一源——systemPrompt dashboard-schema 事实句全部由 describeCapabilities() 生成，build 期 guard 对手写文本做分歧报错
- **产出**：`src/bi-capabilities.js`（CHART_TYPES/METRIC_CAPS/AGG_ENUM/JOIN_MAX_LEVELS/REL_UNITS 常量 + describeCapabilities()/capabilityFacts()/dashboardSchemaSection()）；`src/index.js`（chartDef/validateChartDef 增加 filtersFrom 校验；chartAcceptsFilter/applyDashboardBinding/dashboardFilterCandidates 纯函数；bi.getChart 对视图筛选走图级绑定（user_filter 仍逐图显式，不裁剪）；render_dashboard 候选与 save_dashboard filterable 改走绑定判定；join 级数常量化；RENDER_TOOL_DESC/BI_CREATE_PROMPT 抽出并经 DASH_CONTRACT_HAND 导出供 guard 对账）；`scripts/verify-capability-guard.mjs`（19 能力边记号 + 手写文本记号对账，npm run build 末尾自动运行）；`scripts/verify-bicap-r4.mjs`（8613 端口，feature/compat 双模式）；lib/index.js 重建；CHART.md 筛选绑定规则 + 候选语义更新；PLUGIN.md E10
- **验证**：R4 harness 27/27（缺省命中/未命中跳过无错、filtersFrom 收窄/放宽/[] 全拒、join 看板维表列筛选不进未 join 图表 payload、候选排除仅维表列、T8 事实覆盖与 radar/表格样式 caveat 保留、named-field 报错）；R1 18/18、R2 34/34、R3 35/35；R1-R4 各自 compat 双跑（pre-R4 lib = master 99a942b）payload+结果 cmp 逐字节相等（向后兼容）；手改 render_dashboard 描述 ≤4→≤5 实测 build 失败、还原后恢复绿；node --check ×3 + npm run build + guard 通过
- **契约要点**：缺省绑定规则=「筛选列 ∈ neededColumns（group_by/metrics/filters/time_column 及表达式引用列）才应用，否则跳过不报错」；filtersFrom 三形态=子集收窄/未取列放宽/空数组全拒；候选字段=group_by 纯列名 ∧ ∃图可消费；能力事实改数字/枚举只改 bi-capabilities.js 一处，guard 保证其余文本同步
- **提交**：feature/bi-capability-v2 @ e3eaeaf + harness + docs（本次）

### 12.7 bi-capability-v2 终验 —— 提案交付汇总（acceptance sweep @ master 305c53b）

- **终验环境**：合并后 master lib（305c53b，非 worktree 副本）串行跑全部四套 harness + build/guard，结果逐字如下：
  - `verify-bicap-r1.mjs`（8610）：`RESULT pass=18 fail=0`；master/feature 双跑 compat capture 字节对拍通过
  - `verify-bicap-r2.mjs`（8611）：`RESULT pass=34 fail=0`
  - `verify-bicap-r3.mjs`（8612）：`RESULT pass=35 fail=0`
  - `verify-bicap-r4.mjs`（8613）：`27 passed, 0 failed`
  - `npm run build`：`built lib/index.js (bundled, zero external imports)` + `capability contract guard OK (19 fact edges, hand texts: renderTool/cmdPrompt)`
- **提案覆盖矩阵**（P2-4 排除在外，等用户决策）：

| 提案项 | 交付提交（feature/bi-capability-v2） | 验收状态 |
|---|---|---|
| P0-1 一图多指标 + 双 Y 轴（按图型上限） | eb81c1b（docs b659977） | 已验收：R2 harness M1/M2/V1（bar≤4/table≤6/kpi≤2、yAxisIndex=1、alias 唯一） |
| P0-2 相对时间筛选记号 | 772e669（docs f54b9ae） | 已验收：R1 harness T2（today/today-1/-30d/BETWEEN/{relative}、注入时钟窗口平移、同图 now 快照） |
| P0-3 链式 join 数组 + join.type | 772e669 + 973641c（docs f54b9ae） | 已验收：R1 harness T3/T4（4 级上限、后级引用前级产出列、left 保留/inner 剔除）；E7 字节对拍 |
| P0-4 日期时间表达式函数 | 772e669（docs f54b9ae） | 已验收：R1 harness T1（hour×weekday 24x7 heatmap）、函数表进契约（guard 记号覆盖） |
| P1-1 count_distinct | eb81c1b（docs b659977） | 已验收：R2 harness CD1（组路径去重 + 月路径并集口径）；E8 |
| P1-2 kpi 同环比 compare | eee64e6（docs bbedfec） | 已验收：R3 harness F3/F3b/F3c（prev_day/prev_period 对齐平移取数、named-field 报错）；E9 探针 |
| P1-3 having 聚合后筛选 | eb81c1b（docs b659977） | 已验收：R2 harness H1（聚合后执行、不进 payload、与 pre-agg 筛选/limit 叠加） |
| P1-4 时间成分函数（hour/minute/weekday，与 P0-4 同批交付） | 772e669（docs f54b9ae） | 已验收：同 P0-4 的 R1 T1（提案原文不在仓库，P0-4/P1-4 归属按 12.3 章节口径「P0-4+P1-4」合并交付记录） |
| P1-5 表格条件格式 rules + showTotals | eee64e6（docs bbedfec） | 已验收：R3 harness F4/F4b（合计行 23/70、cellStyles 数据透出、白名单校验）；E9 明示客户端表格暂不渲染样式 |
| P2-1 指标格式化 format | eee64e6（docs bbedfec） | 已验收：R3 harness F1 系列（¥669.9万 缩放+前缀+千分位、原始值不变、单位白名单） |
| P2-2 枚举映射 value_map | eee64e6（docs bbedfec） | 已验收：R3 harness F2（仅显示层映射、原始行/轴数值不变） |
| P2-3 看板筛选显式绑定 filtersFrom | e3eaeaf（docs f8dcc7c） | 已验收：R4 harness T1-T7（缺省命中/跳过、收窄/放宽/全拒、join 维表列不进未 join 图、候选排除） |
| P2-5 能力契约单一源 + build guard | e3eaeaf + e44df51（docs f8dcc7c） | 已验收：guard 19 记号、手改数字 build 失败实测；E10 |

- **不可在仓库内验证、如实标注**：用户原始提案的总体验收基线「11 项失败清单 → ≤3」依赖其现场测试的 4 页 FineBI 看板与失败明细（存于用户现场会话记录，不在本仓库），本仓库无法复现该基线数字，故以上矩阵以逐项 harness 检查为可验证替代，**不宣称** 11→≤3 已达成；需用户用真实看板数据回归后方可下结论。
- **一致性终检**：systemPrompt dashboard-schema 段全句由 describeCapabilities() 生成（guard 保证），与 rules/CHART.md L1/选型/筛选绑定各节、README /bi-create 提逐条核对一致；本次修正两处过时表述——README 进阶选型清单停留在 R0 世代（缺多指标/相对记号/count_distinct/having/同环比/格式化/filtersFrom），CHART.md format 示例「6698990+万/1/¥」写法含混——已修正并提交。
- **E7-E10 与 ch.12 核对**：四章经验各附当轮 harness/对拍验证记录，与实际交付物（scripts/verify-bicap-r1..r4.mjs、verify-capability-guard.mjs、src/bi-capabilities.js）一一对应，无宣称未落地项。
- **提交**：feature/bi-capability-v2 @ 337d02f（文档一致性）+ 本条（本次）

