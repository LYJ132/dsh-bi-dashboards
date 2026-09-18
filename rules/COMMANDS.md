# COMMANDS.md —— 斜杠命令扩展工作流

> 本文件记录**如何给 dsh-bi-dashboards 新增/修改宿主侧斜杠命令**（slash command）。
> 机制：命令注册在 **Host 半部**，经 `@deepseek-ai/dsh-commands` 服务的 `ctx.commands.register()` 完成；
> 客户端（Web）的 `/` 命令菜单由 RPC `commands/list` 自动拉取并刷新（注册变更时宿主广播 `commands/change`），
> **无需改动 `lib/client.js`、无需 package.json 的 `dsh.client` 声明**。

## 契约速查（证据锚点）

`CommandDefinition` / `CommandInvocation` / `CommandResult` 的类型定义见 dsh-commands 包
（本机位于 DSH 应用自带 node_modules：`~/.nvm/versions/node/v22.23.2/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-commands/`，下文简写为 `$CMDS/`；服务说明见同包 `README.zh.md`）：

- `$CMDS/lib/types/index.d.ts:16-33` — `CommandInvocation { commandId, agent, rawInput, attachments, signal }`
- `$CMDS/lib/types/index.d.ts:35-50` — `CommandDefinition { name, description, input?, recordInput?, handler(invocation): CommandResult | Promise<CommandResult> }`；`register()` 返回精确的 effect disposer（`index.d.ts:87`）
- `$CMDS/lib/types/types.d.ts:24-32` — `CommandResult = { kind:'success', text?, sourceEventSeq? } | { kind:'error', text }`
- `name` 仅允许小写字母/数字/`_`/`-`（`parseCommand` 第 0 字节须为 `/`）；`rawInput` 为命令名之后的原始文本（含分隔空白），语法由各命令自行解析
- `recordInput` 默认 true；命令若把载荷经权威领域事件提交（例如把描述交给 agent），设 false 避免会话日志重复记录
- 处理器返回的 `text` 由 UI 直接渲染，**不进模型历史**；注册表同时等待 handler 完成与 `signal`，以先发生者为准，不响应中止的 handler 仍可能产生外部副作用

参考实现（宿主侧注册 + agent 调度模式）：

- 注册结构：`~/.dsh/profiles/web/node_modules/dsh-mnemon/lib/index.js:406-419`（`createMnemonCommand`/`registerCommands`：definition 工厂 + `.catch` 兜底转 `{kind:'error', text: message}`）；挂载点 `dsh-mnemon/lib/index.js:10840-10880`（inject 数组含 `commands`，`apply()` 内 `registerCommands(ctx.commands, …)`）
- agent 调度：`$DSH/node_modules/@deepseek-ai/dsh-plan-mode/lib/index.js:210-257`（`commandCtx.commands.register({name:'plan', …, handler({agent, rawInput})})` 内 `agent.steer(...)` 把消息显式提交给接收 agent——注册表从不隐式提交）

## 本插件的落点（文件:行号）

| 位置 | 内容 |
|---|---|
| `src/index.js:181` | inject 数组含 `'commands'`（宿主侧服务注入） |
| `src/index.js:67` | `performUpdate(ctx)` —— 更新执行唯一内部函数（`bi.update.run` 与 `/bi-update` 共用） |
| `src/index.js:104-114` | `createBiUpdateCommand(ctx)` —— `/bi-update` 定义（复用 `updateCheckState` + `performUpdate`） |
| `src/index.js:116-141` | `createBiCreateCommand()` —— `/bi-create` 定义（空输入给用法提示；非空经 `agent.followup` 提交生成请求，`recordInput:false`） |
| `src/index.js:434-435` | `apply()` 内注册：`ctx.effect(() => ctx.commands.register(…))` —— effect 持有 disposer，插件卸载时自动反注册 |
| `README.md`「斜杠命令」节 | 面向用户的命令一览（名称/用法/示例） |

## 新增一条命令的工作流

1. **src/index.js 定义**：写一个 `createXxxCommand(...)` 工厂返回 `CommandDefinition`——
   `name` 小写、`description` 一句话（出现在 `/` 菜单）、需要参数时给 `input.hint`、
   handler 接 `invocation { commandId, agent, rawInput, signal }`，**只返回 `CommandResult`**
   （`{kind:'success', text}` / `{kind:'error', text}`）。异步 handler 自己 `.catch` 兜底成 error（dsh-mnemon 模式），
   别把异常抛给注册表（会以 error 结算但文本是渲染后的异常，不可控）。
2. **inject**：若尚无 `'commands'`，加进 `src/index.js:181` 的 inject 数组。
3. **注册**：在 `apply()` 内用 `ctx.effect(() => ctx.commands.register(createXxxCommand(...)))`——
   register 的返回值是 disposer，经 effect 持有保证卸载反注册。
4. **要模型干活就显式提交**：注册表绝不隐式把 `rawInput` 交给 agent；需要模型响应时用
   `invocation.agent.followup(...)`（空闲排队开轮）或 `agent.steer(...)`（打断当前轮，dsh-plan-mode 用法），
   此时该命令负责产生的消息约定，并把 `recordInput` 设为 false。
5. **构建**：`npm run build`（esbuild 全量打包 src/index.js → lib/index.js，零外部裸 import）；
   `node --check src/index.js lib/index.js lib/client.js` 全过。
6. **重启 DSH**：宿主侧插件在 boot 加载，命令注册随包挂载——**改完必须重启 DSH 才生效**（不要自行 kill；由用户重启验证）。
   重启后客户端输入 `/`，新命令自动出现在菜单里。

## 备选方案（为何不选）

- **client 侧 `commandUi` 的 `popupSelect` / `inputTriggers`**：只能在客户端 UI 层拦截/补全输入，不进入宿主命令注册表、
  没有 `command/run`/`command/done` 生命周期事件、ACP 等非 Web 适配器不可见——适合纯 UI 快捷入口，不适合需要宿主动作的命令。
- **systemPrompt 里教模型识别 `/bi-create`**：会污染模型上下文、消耗 token、且命令文本会作为普通消息提交——
  而宿主注册命令的执行与输出完全不加模型 token（README「Token 影响」节）。

## 现有命令语义

- `/bi-update`：等价于设置页「一键更新」按钮——git 安装 `git pull --ff-only` + 构建；快照安装先 `dsh plugin --profile web add github:LYJ132/dsh-bi-dashboards`（GitHub 主通道），失败自动改用 `https://gitee.com/LYJ132/dsh-bi-dashboards.git`（Gitee 备选通道）。
  成功文案 `更新完成 v旧→v新，重启 DSH 生效` / `已是最新版本 v1.1.3`；失败返回 error 文本（含 stderr 尾部）。
- `/bi-create <描述>`：空/纯空白 → success + 用法提示 `用法: /bi-create <描述>，例如 /bi-create 近30天各品类销售额趋势`；
  非空 → `agent.followup` 把描述+生成流程指令提交给接收会话的 agent（模型随后走 get_meta→render_dashboard→dsh-ui 预览→save 询问流程）。
