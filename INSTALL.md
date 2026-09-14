# INSTALL.md — 无人超市 AI BI 插件 · 全流程安装指南（给执行本文件的 AI / 人）

> **插件版本**：v1.1.0（官方 DSH 插件单包形态 `dsh-bi-dashboards`，通过 `dsh plugin add` 安装）
>
> **目标**：在一台全新（或已有）WSL2 的 Windows 电脑上，从 WSL 环境准备 → Node/nvm → DSH 安装启动 →
> 插件安装 → 连接数据主机 → 验证看板，全流程跑通。
>
> **执行者请按顺序执行**，每一步都有「验证点」；卡住时先查第 7 节「故障排查」。
> 文中所有命令均在本插件的开发验证环境（Ubuntu 22.04 / WSL2 / Node v22）验证。

## 0. 你将部署什么（架构一图流）

```
目标机（看板浏览端，本指南要装的机器）      数据主机（数据主人那台电脑，已就绪）
┌──────────────────────────┐            ┌──────────────────────────────┐
│ DSH + dsh-bi-dashboards  │  HTTP      │ 8600 data-service(FastAPI)   │
│  （单包：host + client）  │ ────────→ │   └→ PostgreSQL(biz-postgres)│
│  持久化配置指向数据主机    │            │ 8080 状态服务器（可选）        │
└──────────────────────────┘            └──────────────────────────────┘
```

- 插件本体（一个 npm 包：Node 半部 + Client 半部 + echarts 种子副本）**随仓库自带**，装完即可用 UI。
- **数据不在仓库里**：数据始终在数据主机的 PostgreSQL，经 8600 数据服务按白名单访问。
- **目标机不需要 Docker、不需要本地数据库**——装好 DSH + 本插件、网络能通到数据主机的 8600 即可。
- **用户数据（config.json、看板、echarts vendor）存放在包外的持久化目录 `~/.dsh/bi-dashboards/`**（可用环境变量 `BI_DASHBOARDS_HOME` 覆盖）。插件升级/重装不影响这些数据；首次运行时若该目录为空，会自动从旧安装位置（如有）迁移，否则用包内种子文件初始化。

## 1. 前置条件检查

| 前置 | 检查命令 | 不满足时 |
|---|---|---|
| Windows 10/11 + WSL2 | 在 **Windows PowerShell** 执行 `wsl.exe --status` | `wsl --install`（管理员 PowerShell），完成后重启 |
| WSL 内 Ubuntu 22.04+ | 在 WSL 内执行 `lsb_release -a` | `wsl --install -d Ubuntu-22.04` |
| Node.js **v22**（经 nvm） | `node --version`（预期 v22.x） | 见下方 nvm 安装 |
| bash + curl | `bash --version && curl --version` | WSL Ubuntu 自带 |

Node v22 未安装时，在 WSL 内执行（nvm 方式）：

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc        # 或重开一个终端
nvm install 22
node --version          # 验证点：输出 v22.x
```

> **明确说明：本机不需要安装 Docker，也不需要本地数据库。** 看板数据全部来自数据主机的 8600 端口。

## 2. 安装并启动 DSH

```bash
npm install -g @deepseek-ai/dsh
dsh --version            # 验证点：输出 0.1.x 或更新
dsh --profile web        # 首次启动：自动创建 ~/.dsh/profiles/web/，Web 服务在 http://127.0.0.1:3080
```

浏览器打开 **http://127.0.0.1:3080**（WSL2 默认把端口转发到 Windows 的 localhost）。保持该终端开着。

**验证点**：`curl -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3080/` 输出 200，且浏览器出现 DSH 界面。

## 3. 安装插件（官方 dsh plugin 通道）

```bash
dsh plugin --profile web add github:LYJ132/bi-plugin
```

也可从本地路径安装（克隆/解压本仓库后）：

```bash
dsh plugin --profile web add /path/to/bi-plugin
```

安装器会读取包内 `package.json` 的 `dsh.bundle.patch`（指向 `cordis.patch.yml`），自动完成挂载——**无需手动改 profile 的 cordis.patch.yml**。安装完成后**重启 DSH 并强刷浏览器**（运行 dsh 的终端 Ctrl+C 后重新 `dsh --profile web`，浏览器 Ctrl+F5）。

**首次运行行为**：

- 若 `~/.dsh/bi-dashboards/` 不存在，自动创建并在其中生成 `config.json`（默认 `dataApi=http://localhost:8600`、`statusUrl=http://localhost:8080`）、`vendor/echarts.min.js`（从包内种子副本播种）与 `data/`（看板存储，初始为空）。
- **老机器迁移**：若 profile 里还装着旧版 `bi-dashboards-host`（含其 `config.json`、`data/bi-dashboards.json`、`static/vendor/echarts.min.js`），首次运行会自动把服务地址（含旧 `lib/config.json` 归档文件的合并逻辑）、看板数据和 vendor 迁入 `~/.dsh/bi-dashboards/`，旧文件不动（作为备份保留）。

**验证点**：`ls ~/.dsh/bi-dashboards/` 出现 `config.json vendor data`；DSH 设置页出现「**无人超市**」分区；「**数据主机**」地址卡片可见。

**卡住怎么办**：命令不存在 → 确认 DSH 版本支持 `plugin` 子命令（`dsh --help`）；设置页没有「无人超市」→ 查第 7 节故障排查。

### 3.1 从旧版手动安装迁移（老机器一次性操作）

旧版（v1.0.0 及更早）用 `static/scripts/install-to-dsh.sh` 把 `bi-dashboards-host` / `bi-dashboards-client` 双包拷进 profile。迁移到新版：

```bash
cd /path/to/bi-plugin
bash static/scripts/migrate-to-native.sh
dsh plugin --profile web add github:LYJ132/bi-plugin   # 或本地路径
```

脚本做什么（幂等）：

1. 备份旧包与 profile 补丁文件到 `~/.dsh/bi-dashboards/backup-<日期>/`
2. 迁移 config（含旧 `lib/config.json(.migrated)` 服务地址合并）、看板数据、vendor echarts 到 `~/.dsh/bi-dashboards/`
3. 从 profile `node_modules` 移除旧双包
4. 从 profile `cordis.patch.yml` 移除旧双包挂载块（新版由包内 bundle patch 自动挂载）

之后重启 DSH + Ctrl+F5。若有异常，可从备份目录手动恢复。

> `install-to-dsh.sh` 仍保留在仓库中供参考，但**已废弃**，不再作为安装方式。

## 4. 连接数据主机（关键一步）

> **通用包原则**：本插件只有一份代码，部署在任何机器上都一样——「数据主机」或「目标机」的角色不由代码区分，纯由 config.json（dataApi/statusUrl）指向决定。**数据主机上部署时 dataApi 填本机地址（`http://localhost:8600`）；目标机上部署时填数据主机的地址**（如 `http://192.168.1.100:8600`）。

先确认你在哪台机器上：

| 情形 | 怎么填 |
|---|---|
| **本机就是数据主机** | 默认 `http://localhost:8600` 即通，**零配置**。验证：`curl -s http://localhost:8600/api/meta/tables \| head -c 200` 应返回 JSON |
| **其他机器，同一局域网** | 问数据主人要地址（见下），在地址卡片填入，如 `http://192.168.1.100:8600` |
| **跨网络（异地）** | 推荐 Tailscale：两台机安装并登录同一账号（`curl -fsSL https://tailscale.com/install.sh \| sh` → `tailscale up`），各自 `tailscale ip -4` 得到 100.x 地址，填 `http://100.x.x.x:8600`。不要用 frp/ngrok 把无鉴权的 8600 暴露到公网 |

**怎么要地址**：数据主人打开其 DSH 设置页「无人超市」→「数据主机」卡片，上面展示当前配置的数据主机地址，点复制 icon 一键复制发给你。（若复制出来是 `localhost` 开头，让数据主人在数据主机上执行 `hostname -I | awk '{print $1}'` 查内网 IP 给你。）

**填地址的操作**（设置页 →「数据主机」卡片，橙色主题）：

1. 点铅笔 icon 解锁输入框，填入完整地址（如 `http://192.168.1.100:8600`）
2. 点闪电 icon「**测试连接**」→ 成功显示绿色「**✓ 连通（N 表）**」；失败显示红色「✗ 原因」
3. 点「保存」（✓ icon）→ 显示「已保存」，**保存即生效，无需重启 DSH**
4. 保存后输入框**锁定**；要改再点铅笔 icon
5. 下方的「**其他**」折叠区是状态服务地址（8080 爬虫状态台），**一般不用动**；状态服务地址与主行一样有锁定/编辑状态机

> 地址格式：**完整 URL 含端口**。只填 IP 点「保存」会自动补 `http://` 和 `:8600`（状态服务自动补 `:8080`）；但「测试连接」要求以 `http://` 开头的完整 URL，所以建议直接填完整。
>
> 安全须知：8600 目前无鉴权，仅数据表白名单兜底，请只在信任的网络里开放。

**验证点**：

- 数据表区不再是红色「**✗ 数据服务不可达**」，出现中文表名列表（销售明细、商品主档、库存总览……）
- 同步状态条（云平台/飞书三项）显示灰色「**离线**」**属预期**——浏览端没有爬虫，不代表故障

## 5. 使用看板

1. 侧栏进入「**我的看板**」：KPI 有数值、图表渲染、表格表头为中文
2. 任一图表右上角筛选 → 选「下单日期」→「介于」→ 填两个日期 → 应用 → 柱/线图变化
3. 浏览器 DevTools Network：`/bi/vendor/echarts.min.js` 200、`/bi/api` 200

看板数据由 **AI 对话生成**（模型调用 `render_dashboard` 生成预览 → 你确认后 `save_dashboard` 保存进「我的看板」）。**新装时看板为空属正常**；生成看板需要 DSH 已配置可用的模型（按 DSH 界面引导完成）。

## 6. 升级与卸载

- **升级**：重新执行 `dsh plugin --profile web add github:LYJ132/bi-plugin`（或新版本地路径）。用户数据在 `~/.dsh/bi-dashboards/`，**升级不会丢失配置与看板**。
- **查看已装**：`dsh plugin --profile web list`
- **卸载插件**：`dsh plugin --profile web remove dsh-bi-dashboards`；如需彻底清空用户数据再删除 `~/.dsh/bi-dashboards/`（会连带删掉看板与配置，慎做）。

## 7. 故障排查

| 症状 | 原因与处理 |
|---|---|
| 设置页地址卡片正常，但数据表区红字「✗ 数据服务不可达——检查数据主机地址或网络后重试」 | 不在数据主机所在网络 / 地址填错 / 数据主机服务没起。用卡片的「测试连接」定位：连不通 → 查 IP、是否同一局域网、数据主机 `docker compose up -d` 是否在跑、防火墙是否放行 8600 |
| 同步状态条（云平台/飞书）一直灰色「离线」 | 浏览端正常现象（浏览端没有爬虫）。要显示数据主机的爬虫状态：展开「其他」，把「状态服务」填成数据主机地址（8080 端口），且数据主机已放行 8080 |
| DSH 设置页没有「无人超市」分区 | 插件未装上或未重启：`ls ~/.dsh/profiles/web/node_modules/dsh-bi-dashboards/` 应存在；旧机器确认已跑 `static/scripts/migrate-to-native.sh` 清掉旧双包并重启 DSH |
| 浏览器还是旧界面 | Ctrl+F5 强制刷新 |
| 图表区域空白、Network 里 echarts 404 | `~/.dsh/bi-dashboards/vendor/echarts.min.js` 缺失：从包内 `static/vendor/echarts.min.js` 手动拷入，或删除持久化目录让其重新播种 |
| 端口不是默认的 8600/8080 | 数据主机侧改端口后要**同步改其 config.json**（展示地址自动跟随）；客户端地址必须填**完整 URL（含端口）** |
| 看板为空 / KPI 显示加载中 | 新装无看板属正常——让 AI 对话生成（见第 5 节）；KPI 加载中多为 dataApi 不通，回上一条排查 |
| 同步频率保存报错 | 正常——`crawlConfigFile` 为空时禁用（仅数据主机本机配置爬虫） |
| 看板配置两台机不一样 | 设计如此：`storeFile` 各机独立；要复制看板就把数据主机的 `~/.dsh/bi-dashboards/data/bi-dashboards.json` 拷到目标机同路径 |
| `dsh` 命令不存在 | node/nvm 没装好或没 `source ~/.bashrc`；`npm install -g @deepseek-ai/dsh` 重装 |
| 想换持久化目录位置 | 设环境变量 `BI_DASHBOARDS_HOME=/新路径` 后重启 DSH（目录结构需与原目录一致，或直接整体拷贝过去） |

## 8. 数据主机侧（可选：对方想自己当数据主机时才需要）

**仅看板浏览端可完全跳过本节。** 想自己搭建数据主机时，需要以下组件（均只在数据主机运行）：

- **data-service（:8600）**：FastAPI 数据服务，Docker 部署（根目录 `docker-compose.yml`），依赖外部 PostgreSQL（biz-postgres，库名 `unmanned_supermarket`）与外部网络 `unmanned-store_default`；环境变量参考 `data-service/.env.example`，表结构见 `sql/README.md`
- **状态服务器（:8080，可选）**：`bash web/start.sh`（python3，绑定 0.0.0.0）
- **爬虫同步**：云平台/飞书 → PG 的数据同步只在数据主机运行

端口自定义：8600 改 `docker-compose.yml` 端口映射，8080 改 `web/start.sh` 里的参数，改完同步更新数据主机自己的 config.json（或在其设置页地址卡片改），展示地址自动跟随。

详见仓库内 `README.md`（目录结构表）与各 Docker 指南。
