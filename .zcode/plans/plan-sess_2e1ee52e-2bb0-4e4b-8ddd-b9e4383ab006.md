## 四文件规范重构 + 迭代记忆迁移

### 目标结构
```
rules/
├── PLUGIN.md              # 插件开发规范（原 DEVELOPMENT.md 重构）
├── PLUGIN-ITERATION.md    # 插件迭代记忆（纯记录，MD 分级格式）
├── CHART.md               # 图表规范（原 CONSTRAINTS.md 按大纲重构）
└── CHART-ITERATION.md     # 图表迭代记忆（纯记录，MD 分级格式）
scripts/norm-stats.sh      # 删除（不再使用计数脚本）
```

### 各文件内容

**PLUGIN.md**（9 章节 + 迭代记忆目录）：
- 0. 模式行为规范（创造/图表模式边界，进入动作）
- 1. 插件形态与声明契约
- 2. 源码修改规范（区间替换风险、转换脚本）
- 3. 运行时环境差异（静态 vs 动态）
- 4. 验证清单（三道门）
- 4.5 布局系统契约（v11）
- 4.6 图表修改流程
- 5. 修改代码流程
- 6. 运维备忘
- 7. **迭代规范**（新增）：触发条件=解决耗时较长的问题立即记录；格式=MD 分级（#### 问题/原因/解决/工作流修改），每条都填；整理=定期手动合并精简；脚本注入=待定
- 附：迭代记忆目录 → [PLUGIN-ITERATION.md](../rules/PLUGIN-ITERATION.md)

**CHART.md**（4 章节 + 迭代记忆目录）：
- 0. 模式边界（图表模式禁止修改插件代码）
- 1. 图表绘制
  - 1.1 图表分类（L0/L1/L2/L3，判定依据）
  - 1.2 需求确认清单（绘制形式、图表样式自动推荐、筛选项、算法判定）
  - 1.3 绘制流程（get_meta → render_dashboard → 围栏预览 → save_dashboard）
  - 1.4 绘制注意事项（注意事项索引表）
- 2. 修改规范（可改/不可改/流程）
- 3. 迭代规范（同上格式标准，图表方向记录）
- 附：迭代记忆目录 → [CHART-ITERATION.md](../rules/CHART-ITERATION.md)

**PLUGIN-ITERATION.md / CHART-ITERATION.md**：
- 格式：`### 条目标题` / `#### 问题` / `#### 原因` / `#### 解决` / `#### 工作流修改`
- 将 `docs/dsh-plugin-progress.md` 中 33 条「第十二章补」按主题分流迁移（插件相关→PLUGIN，图表相关→CHART）

### 执行步骤
1. 读取 docs/dsh-plugin-progress.md 全文，按主题分类 33 条记录
2. 新建 rules/PLUGIN.md（内容从 DEVELOPMENT.md 重构）
3. 新建 rules/CHART.md（内容从 CONSTRAINTS.md 按大纲重构）
4. 新建 rules/PLUGIN-ITERATION.md（迁移插件相关迭代条目）
5. 新建 rules/CHART-ITERATION.md（迁移图表相关迭代条目）
6. 删除 rules/DEVELOPMENT.md、rules/CONSTRAINTS.md
7. 删除 scripts/norm-stats.sh
8. 在 docs/dsh-plugin-progress.md 头部添加迁移说明
9. 提交 git commit