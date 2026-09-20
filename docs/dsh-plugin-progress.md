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
