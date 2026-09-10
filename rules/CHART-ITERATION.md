# BI 插件迭代记忆（图表绘制方向）

> 纯记录文档，用于沉淀图表绘制/布局/修改方面的经验。规范文档见 [CHART.md](./CHART.md)。
> 格式标准：每条必填「问题 / 原因 / 解决 / 工作流修改」四项。

---

### 筛选系统 + 搜索 + 倒序（新需求实现）
#### 问题
图表缺少筛选能力，视图栏无搜索和排序。
#### 原因
初版无筛选/搜索功能。
#### 解决
- 生成时推荐筛选字段：render_dashboard 输出候选筛选字段（各图表 group_by 并集）并在 render 文本中引导模型向用户确认；save_dashboard 新增 filter_fields 参数
- 图表级筛选：菜单键左侧圆角矩形按钮 → 弹层（字段/值下拉 + 应用/清除）→ bi.setChartFilter
- 全局筛选：视图栏下方控件 → bi.setViewFilter
- 模糊搜索：视图栏下方输入框，客户端按标题子串过滤
- 倒序：listCharts 按 created_at desc
- 新增 RPC ×3：setChartFilter / getFilterValues / setViewFilter
#### 工作流修改
- 新增图表绘制需求确认清单第 3 条：筛选项自动推荐（写入 CHART.md 1.2 节）

---

### 全局筛选胶囊化重做 + 搜索框规范（用户反馈）
#### 问题
全局筛选改字段胶囊按钮组，搜索框去 emoji。
#### 原因
用户反馈胶囊化更直观。
#### 解决
- 搜索框：去 emoji，圆角矩形（.bi-search）
- 全局筛选改字段胶囊按钮组：字段 = 视图内图表 filterable 去重；按钮按 label 长度降序排列，宽度统一；点击向下弹出「前项(字段) 条件项(=/≠/包含) 后项(值下拉)」行
- 数据模型：view.filters = [{column, value}] 多字段（原单数 global_filter 废弃）
#### 工作流修改
- 无

---

### 布局系统实现（拖拽/缩放/双锁）+ 重叠修复
#### 问题
图表位置固定，无法自定义排布。
#### 原因
初版无布局系统。
#### 解决
- 布局模型：所有图表进统一 12 列网格；chart.layout = {w, h}；位置 = charts 数组顺序
- RPC ×4：setChartLayout / setChartLayoutLock / setLayoutLock / reorderCharts
- 锁：图表级（⋮ 菜单"锁定布局"）+ 全局（刷新按钮旁"锁定布局/解锁布局"）
- 缩放：右下角手柄 mousedown → document mousemove → mouseup 提交 setChartLayout + echarts resize()
- 重叠修复：.bi-viewbar 加 display:flex + gap + margin-bottom
#### 工作流修改
- 无（布局系统是新增功能，无历史经验沉淀）

---

### 自由布局回退 + 管线废弃（用户决定）
#### 问题
自由布局实现后不可用（看板空白且 headless 无法复现）。
#### 原因
自由布局实现有 bug，且 .dsh/v21-client.js 源文件已漂移，转换管线成为风险源。
#### 解决
- 回退自由布局（git revert e882d79）
- 弃用转换管线（.dsh/v21-client.js 存档），今后直接编辑 bundle
#### 工作流修改
- 修改代码流程从「转换管线」改为「直接编辑 bundle」（写入 PLUGIN.md 五节）

---

### 自由布局重做（按用户澄清需求，增量隔离策略）
#### 问题
用户要求全部视图三列式，其它视图支持自由拖拽。
#### 原因
初版自由布局是全模式切换，风险大。
#### 解决
- 三列式渲染代码一行不动，自由模式全部隔离在独立组件 FreeLayoutView
- host 增量加 setFreeLayout/setChartPos/setChartLockToggle/resetViewLayout
- 自动落位：揭锁时未存位置图表按三列拓扑排
- 修复两处同类笔误：heredoc 模板第三次出现多余 `)`，改用 edit 工具写文件
#### 工作流修改
- 无

---

### 全部视图按钮守卫补全（用户反馈）
#### 问题
「全部」视图仍显示自由布局按钮（可调整）。
#### 原因
上一轮补丁中途失败，按钮守卫没落盘。
#### 解决
补上按钮（带 `curView !== 1` 守卫：全部视图渲染 null）。
#### 工作流修改
- 多步补丁失败恢复流程：grep 关键标识符确认每步是否落盘（写入插件开发经验）

---

### 全部视图彻底锁定 + 布局按钮合并 + Ctrl+Z 撤销（用户反馈三项）
#### 问题
①全部视图图表仍可调整 ②无撤销 ③默认布局按钮分散。
#### 原因
守卫不完整；无撤销机制。
#### 解决
- 两按钮合并为「布局」下拉菜单（默认布局/自由布局↔退出自由布局/锁定布局↔解锁布局 + Ctrl+Z 提示）
- 全部视图 `locked = curView === 1 || …` 强制锁
- host：snapLayout/pushUndo 快照（环 40 条，随 store 持久化）；bi.undoLayout 弹出栈顶全量恢复
- 发现 host.call 幽灵引用 3 处（静态化转换残留）→ 全部改为 biCall
- undoLayout 包装 bug：初版把包装对象当快照用 → 改 entry.snap
#### 工作流修改
- 布局系统契约写入 PLUGIN.md 四.5 节（单渲染器/撤销/锁定/变更反馈契约）
- 新增门 3 检查项：grep 确认 host.call 为 0

---

### 布局模式再澄清（用户三项反馈）
#### 问题
①默认布局不是真三列 ②无模式标记 ③体感反转。
#### 原因
旧"三列式"实为 12 列 flow 网格；默认布局拖拽一直正常但自由布局有 host.call 幽灵引用。
#### 解决
- 默认布局重写为 `.bi-grid3`（grid-template-columns:1fr 1.5fr 1.5fr）
- 移除默认布局的缩放把手；模式徽章常显
- host resetViewLayout 改为 created_at 倒序
#### 工作流修改
- 布局系统契约更新：默认布局 = 三列结构（KPI 列 25%、其余两列 37.5% 交错）

---

### 自由布局拖拽终修复 + 按钮即模式（用户反馈）
#### 问题
自由布局点击后图表完全拖不动。
#### 原因
`.bi-free-wrap`/`.bi-free-item` 的基础 CSS 规则在早前重写轮次中整块丢失——无 `position:absolute` 则 inline left/top 全部无效。
#### 解决
- 补齐 CSS（wrap 相对定位 / item 绝对定位 + 圆角边框 / dragging 阴影 / cell 撑满）
- **首次真实鼠标拖拽验证**（Playwright mouse.down/move/up）：卡片 0,0→120,80 视觉位移
- 删除独立徽章，布局按钮文字直接显示当前模式（按钮即模式）
#### 工作流修改
- 验证清单加一增加：真实鼠标拖拽验证（非仅断言节点存在）

---

### 无损切换（默认布局 = 自由布局的特例）+ autoPos 统一（用户设计原则）
#### 问题
从默认布局切到自由布局时图表位置变化；autoPos 与新三列比例不一致。
#### 原因
旧 autoPos 用固定像素（250/300px），新默认布局用百分比。
#### 解决
- grid3-item/free-item 加 data-id
- 切自由布局时测量 .bi-grid3 各卡 getBoundingClientRect → 生成 posMap 随 setFreeLayout 提交
- autoPos 改为同一三列比例规则（W 取 .bi-page 实宽，KPI 列 25% 高 110、其余两列 37.5% 高 320 交错）
- 缩放把手常态可见 + hover 橙色
#### 工作流修改
- 布局系统契约：默认布局是自由布局的特例（写入 PLUGIN.md 四.5 节）

---

### 统一画布布局（用户设计定案）
#### 问题
双模式切换复杂，默认/自由布局区分用户困惑。
#### 原因
双模式设计增加了复杂度。
#### 解决
- 取消双模式：所有视图统一用 FreeLayoutView 画布渲染
- 默认位置由三列规则实时计算
- 交互：拖卡片标题栏移动、右下角缩放，处处可用
- 约束：①横向不超出页面 ②y ≤ 其他卡最低底边+360 ③6px 吸附辅助线
- 缩放把手 = 1/4 圆弧（::before border）
- 按钮即状态：「默认布局」↔「自定义布局」（有落位时橙描边）
- 全部视图 globalLocked 无把手
#### 工作流修改
- 布局系统契约 v11 更新：单渲染器 + 统一画布（写入 PLUGIN.md 四.5 节）

---

### 把手灰阶 + 落位避让 + 菜单层级（用户三项反馈）
#### 问题
①把手颜色 ②新图落位与已锁卡重叠 ③⋮ 菜单被裁剪。
#### 原因
1. 把手默认橙色
2. posOf 未做相交检测
3. .bi-free-item 和 .bi-free-item .bi-cell 的 overflow:hidden 裁剪菜单
#### 解决
1. 把手灰阶两态：常态深灰 #565d6b、悬停浅灰 #c3cbd8
2. findFreeSlot：候选 = 自身 slot → 三列网格扫描 → 已占用最低底边+360；rectHit 矩形相交检测
3. 外层 item 去掉 overflow:hidden（内层 cell 保留），圆角裁剪下沉到 .bi-chart；非拖拽不写内联 zIndex
#### 工作流修改
- 布局系统契约：层叠/裁剪规则（写入 PLUGIN.md 四.5 节）

---

### 菜单裁剪真凶 + 轴标签溢出（用户反馈）
#### 问题
①菜单仍被裁 ②横轴长文字溢出图表。
#### 原因
1. 内层 .bi-cell 的 overflow:hidden 才是真凶
2. toEcharts 完全没有 grid 配置
#### 解决
1. cell 改 overflow visible，圆角裁剪下沉到 .bi-chart（overflow:hidden + 底部圆角 9px）
2. grid { containLabel:true, left:14, right:18, top:42, bottom:14 } + axisLabel { hideOverlap:true, overflow:'truncate' }
#### 工作流修改
- 布局系统契约：轴标签防溢出（写入 PLUGIN.md 四.5 节）
- 新增注意事项索引条目：长标签/矮图（写入 CHART.md 1.4 节）

---

### 移入视图反馈 + 计数即时刷新（用户反馈）
#### 问题
①加入视图无状态提示 ②视图标签图表计数不刷新。
#### 原因
fire-and-forget + 立即收菜单；无变更通知机制。
#### 解决
1. 加入按钮三态：「加入中…」（disabled）→「已加入」（橙色 700ms）→ 失败红字 1.6s
2. ChartCell 新增 onViewsChanged 回调 → BiView.loadViews
3. load() 末尾附带 loadViews 兜底
#### 工作流修改
- 布局系统契约：变更反馈契约（写入 PLUGIN.md 四.5 节）

---

### 图表级锁定三态语义（用户报告 bug）
#### 问题
全局锁定时 ⋮ 解锁某卡无效；全局解锁后该卡仍锁死。
#### 原因
⋮ 锁定是视图级 chart_locks 的**盲翻转**——全局锁定时卡片本无标志，点「解锁」把它从缺省翻成 true。
#### 解决
- 图表级锁改三态语义：true 显式锁 / false 显式解锁 / 缺省继承全局
- host setChartLockToggle 支持 args.locked 显式设值
- listCharts 的 locked 返回原始三态（去掉 !! 强转）
- client 传期望状态而非翻转
- 全部视图 forceLocked 结构锁独立于三态
#### 工作流修改
- 布局系统契约：锁定三态语义（写入 PLUGIN.md 四.5 节）

---

### 单卡归位 + 锁残留清理（用户报告「自定义后不随全局变化」）
#### 问题
用户感觉「卡死在偏离位置」。
#### 原因
有自定义落位的卡永远优先用自定义位置（这是设计使然）；叠加锁 bug 遗留的三把显式锁。
#### 解决
- 新增 bi.clearChartPos（删单卡落位 → 回三列默认位；幂等/可撤销）
- ⋮ 菜单「回到默认位置」（非全部视图且有自定义落位时显示）
- 清掉 top 视图三把 bug 遗留的显式锁
#### 工作流修改
- 布局系统契约：单卡归位（写入 PLUGIN.md 四.5 节）
- 设计确认：自定义落位「偏离后保持」是特性——归位是显式动作

---

### 全局锁定级联（用户需求）
#### 问题
全局锁定切换时，单卡显式状态不跟随。
#### 原因
setLayoutLock 只设全局标志，不写单卡 chart_locks。
#### 解决
- setLayoutLock 级联：置全局标志后，遍历所有视图 × 成员卡，把 chart_locks 一并写成全局值
- pushUndo 快照可撤销，一次 undo 回退整个级联
- 缺省继承语义保留
#### 工作流修改
- 布局系统契约：全局锁定级联（写入 PLUGIN.md 四.5 节）
