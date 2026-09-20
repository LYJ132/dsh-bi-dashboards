# 无人超市 AI BI 插件（dsh-bi-dashboards）

> GitHub 仓库名：`dsh-bi-dashboards`（主安装通道 `dsh plugin add github:LYJ132/dsh-bi-dashboards`）；Gitee 镜像 `https://gitee.com/LYJ132/dsh-bi-dashboards` 为备选通道（GitHub 拉取失败时用 `dsh plugin add https://gitee.com/LYJ132/dsh-bi-dashboards.git`）。

DSH profile 级全局静态插件：提供「我的看板」视图标签、看板生成/保存/修改工具、图表统一画布布局、设置页（数据表管理）。宿主部署于 `~/.dsh/profiles/web/node_modules/`，由 `cordis.patch.yml` 挂载。

## 功能一览

- **数据工具**：get_meta / query_data（经 data-service:8600，表白名单管控）
- **看板生成**：render_dashboard（Schema → 取数 → ECharts）+ dsh-ui 围栏预览 → save_dashboard 保存
- **图表管理**：modify_chart 修改定义 / duplicateChart 副本 / 移入视图（三态反馈）/ 删除
- **统一画布布局**：拖标题移动、右下角圆弧缩放、边界钳制、对齐辅助线、Ctrl+Z 撤销
- **修改会话**：卡片 ⋮ 修改 → fork 分支会话 → 模型经 modify_chart 落新定义
- **设置页**：数据表访问开关（8600 白名单）、抓取频率、手动同步/一键登录
- **斜杠命令**：/bi-update 检查并更新插件、/bi-create 用自然语言描述生成看板（详见下）

## 斜杠命令（Slash commands）

宿主侧经 `@deepseek-ai/dsh-commands` 服务注册，客户端输入 `/` 时菜单自动列出，无需改动前端。

| 命令 | 用法 | 示例 |
|---|---|---|
| `/bi-update` | 检查并更新 BI 插件到最新版（与设置页「一键更新」同一条执行路径：git 安装（含 node_modules 内符号链接指向 git 仓库）走 pull+build；快照安装走压缩包自更新——Gitee archive 主通道 → GitHub codeload 备通道，仅按 `files` 清单 + cordis.patch.yml 覆盖安装目录、清单外文件一律不触碰；压缩包双通道均不可达才降级 `dsh plugin add`，仍失败报手动提示） | `/bi-update` |
| `/bi-create` | 用自然语言描述生成 BI 看板（描述将作为消息交给模型，触发 get_meta→render_dashboard→dsh-ui 预览流程；提示词已含进阶选型：heatmap 双维密度、单表/链式 join 跨表维度、表达式计算字段、相对时间筛选记号、多指标+双 Y 轴、count_distinct/having、kpi 同环比、指标格式化/枚举映射/表格条件格式、看板筛选显式绑定 filtersFrom） | `/bi-create 近30天各品类销售额趋势` |

> 注：插件更新后需**重启 DSH** 生效。扩展（新增/修改斜杠命令）工作流见 `rules/COMMANDS.md`。

## 目录结构（模式路由）

| 路径 | 作用 | 谁读 |
|---|---|---|
| `rules/CHART.md` | **图表模式规范**：模式边界、请求分类、需求确认清单、绘制流程、修改规范 + 架构约束（分层/输出优先级/稳定性） | 做图表时按需读 |
| `rules/CHART-ITERATION.md` | 图表方向迭代记忆（问题/原因/解决/工作流修改 四段式） | 图表模式按需读 |
| `rules/PLUGIN.md` | **创造模式规范 + 经验账本**：开发契约速查 + E 序号经验条目 | 改插件代码前必读 |
| `rules/COMMANDS.md` | **斜杠命令扩展工作流**：宿主侧 `ctx.commands.register` 契约、新增命令步骤、file:line 证据锚点 | 增改斜杠命令时读 |
| `static/` | 静态资源：`vendor/echarts.min.js` + 部署/巡检脚本（install/doctor/convert 等；v1.1.0 起插件本体是 lib 构建产物，bundle 不再放 static） | 插件随包资源 |
| `data/` | 运行时数据 bi-dashboards.json（gitignore，不入库） | host 读写 |
| `data-service/` | 数据服务（FastAPI :8600，白名单/MCP），`docs/docker-windows/docker-compose.yml` 编排 | 全部数据工具 |
| `web/` | 状态服务器（:8080 status.json + 手动同步通道），crawler 容器写入状态 | SyncBar 状态源 |
| `sql/` | PG DDL/迁移（bi_plugin schema 约定） | L1/L2 场景 |

## 发布与部署链（源码 → lib → 离线包 → 宿主机）

- `src/` 经 `pnpm build`（esbuild）打包成零外部依赖的 `lib/index.js`；`package.json` 的 `files`（lib、static、cordis.patch.yml 等）定义 `dsh plugin add` 安装到 `~/.dsh/profiles/web/node_modules/` 的内容。
- **离线更新包**：每次发布（`chore(release): vX.Y.Z`）后必须运行 `bash scripts/make-offline-package.sh` 刷新 `dist/bi-dashboards-offline-<version>-<shortsha>.tar.gz`（`dist/` 不入库），供无网络宿主机按 `OFFLINE-UPDATE.md` 手动替换。v1.1.7 发布时曾遗漏此步，导致 dist 停留在 1.1.6 包——现已固化为脚本 + 本条约定。
- git 安装的宿主机走 `/bi-update`（pull + 重建 lib），不依赖 dist 离线包；快照安装（`~/.dsh/profiles/web/node_modules/` 下的普通目录）走 v1.3 起的压缩包自更新——不再依赖 `dsh` CLI（其常因宿主 PATH 缺 nvm 路径 spawn 即 ENOENT），改由插件直接下载仓库 tar.gz（Gitee `repository/archive/master.tar.gz` 主通道、GitHub codeload 备通道，匿名 GET 可达）并按 `package.json` `files` 清单覆盖自身目录；`lib/index.js` 已提交且零外部 bare import，目标机无需装依赖或重建。

## 模式边界

- **图表模式**（对话默认）：只做看板操作，**禁止修改本目录任何插件文件**；规范见 `rules/CHART.md`
- **创造模式**：用户明确要求改插件时进入，先读 `rules/PLUGIN.md`，走三道门验证再提交
- 迭代管理：无计数脚本——经验按 `E<序号>` 追加进 PLUGIN.md，条目过多时按内容重叠度判断合并精简

迭代历史见 `../docs/dsh-plugin-progress.md`（第十二章补 1~N）。
