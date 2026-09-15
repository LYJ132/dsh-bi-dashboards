# 无人超市 AI BI 插件（dsh-bi-dashboards）

> GitHub 仓库名：`dsh-bi-dashboards`（安装通道 `dsh plugin add github:LYJ132/dsh-bi-dashboards`）。

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
| `/bi-update` | 检查并更新 BI 插件到最新版（与设置页「一键更新」同一条执行路径：git 安装走 pull+build，快照安装走原生 `dsh plugin add`） | `/bi-update` |
| `/bi-create` | 用自然语言描述生成 BI 看板（描述将作为消息交给模型，触发 get_meta→render_dashboard→dsh-ui 预览流程） | `/bi-create 近30天各品类销售额趋势` |

> 注：插件更新后需**重启 DSH** 生效。扩展（新增/修改斜杠命令）工作流见 `rules/COMMANDS.md`。

## 目录结构（模式路由）

| 路径 | 作用 | 谁读 |
|---|---|---|
| `rules/CHART.md` | **图表模式规范**：模式边界、请求分类、需求确认清单、绘制流程、修改规范 + 架构约束（分层/输出优先级/稳定性） | 做图表时按需读 |
| `rules/CHART-ITERATION.md` | 图表方向迭代记忆（问题/原因/解决/工作流修改 四段式） | 图表模式按需读 |
| `rules/PLUGIN.md` | **创造模式规范 + 经验账本**：开发契约速查 + E 序号经验条目 | 改插件代码前必读 |
| `static/` | 部署包（bundle 即源码）：bi-dashboards-host / bi-dashboards-client / vendor | 插件本体 |
| `data/` | 运行时数据 bi-dashboards.json（gitignore，不入库） | host 读写 |
| `data-service/` | 数据服务（FastAPI :8600，白名单/MCP），`docs/docker-windows/docker-compose.yml` 编排 | 全部数据工具 |
| `web/` | 状态服务器（:8080 status.json + 手动同步通道），crawler 容器写入状态 | SyncBar 状态源 |
| `sql/` | PG DDL/迁移（bi_plugin schema 约定） | L1/L2 场景 |

## 模式边界

- **图表模式**（对话默认）：只做看板操作，**禁止修改本目录任何插件文件**；规范见 `rules/CHART.md`
- **创造模式**：用户明确要求改插件时进入，先读 `rules/PLUGIN.md`，走三道门验证再提交
- 迭代管理：无计数脚本——经验按 `E<序号>` 追加进 PLUGIN.md，条目过多时按内容重叠度判断合并精简

迭代历史见 `../docs/dsh-plugin-progress.md`（第十二章补 1~N）。
