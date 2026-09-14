# INSTALL.md — 无人超市 AI BI 插件 · 全流程安装指南（给执行本文件的 AI / 人）

> **插件版本**：v1.0.0（tag `v1.0.0`；插件代码最后功能提交 `3dfc72c`；分发压缩包 `bi-plugin-v1.0.0.tar.gz`）
>
> **目标**：拿到 bi-plugin 压缩包后，在一台全新（或已有）WSL2 的 Windows 电脑上，
> 从 WSL 环境准备 → Node/nvm → DSH 安装启动 → 解压插件包 → 插件安装 → 连接数据主机 → 验证看板，全流程跑通。
>
> **执行者请按顺序执行**，每一步都有「验证点」；卡住时先查第 7 节「故障排查」。
> 文中所有命令均在本插件的开发验证环境（Ubuntu 22.04 / WSL2 / Node v22 / DSH 0.1.1-rc.2）实测。

## 0. 你将部署什么（架构一图流）

```
目标机（看板浏览端，本指南要装的机器）      数据主机（数据主人那台电脑，已就绪）
┌─────────────────────────┐            ┌──────────────────────────────┐
│ DSH + bi-dashboards-*   │  HTTP      │ 8600 data-service(FastAPI)   │
│   插件 host/client 包    │ ────────→ │   └→ PostgreSQL(biz-postgres)│
│   config.json 指向数据主机│            │ 8080 状态服务器（可选）        │
└─────────────────────────┘            └──────────────────────────────┘
```

- 插件本体（host/client 两个包 + echarts）**随压缩包自带**，装完即可用 UI。
- **数据不在压缩包里**：数据始终在数据主机的 PostgreSQL，经 8600 数据服务按白名单访问。
- **目标机不需要 Docker、不需要本地数据库**——装好 DSH + 本插件、网络能通到数据主机的 8600 即可。

## 1. 前置条件检查

| 前置 | 检查命令 | 不满足时 |
|---|---|---|
| Windows 10/11 + WSL2 | 在 **Windows PowerShell** 执行 `wsl.exe --status` | `wsl --install`（管理员 PowerShell），完成后重启 |
| WSL 内 Ubuntu 22.04+ | 在 WSL 内执行 `lsb_release -a`（本插件在 Ubuntu 22.04 验证） | `wsl --install -d Ubuntu-22.04` |
| Node.js **v22**（经 nvm） | `node --version`（预期 v22.x，验证机为 v22.23.2） | 见下方 nvm 安装 |
| bash + curl | `bash --version && curl --version` | WSL Ubuntu 自带 |

Node v22 未安装时，在 WSL 内执行（nvm 方式）：

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc        # 或重开一个终端
nvm install 22
node --version          # 验证点：输出 v22.x
```

> 下载慢或失败通常是网络问题，可配置代理后重试。
>
> **明确说明：本机不需要安装 Docker，也不需要本地数据库。** 看板数据全部来自数据主机的 8600 端口。

## 2. 安装 DSH

DSH（DeepSeek Harness）是看板插件的运行宿主，通过 npm 全局安装：

```bash
npm install -g @deepseek-ai/dsh
dsh --version            # 验证点：输出 0.1.1-rc.2 或更新
which dsh                # 验证点：~/.nvm/versions/node/v22.x/bin/dsh
```

> **别装错包**：npm 上另有一个同名包 `dsh@1.0.1`（别人写的 JS shell，与本项目无关）。
> 一定认准 **`@deepseek-ai/dsh`**。装错了就 `npm uninstall -g dsh` 再装正确的。

首次启动（会自动创建 profile 并常驻运行，**保持该终端开着**）：

```bash
dsh --profile web
```

- 首次启动会自动创建 `~/.dsh/profiles/web/`（含 package.json、cordis.patch.yml 等），并在 **http://127.0.0.1:3080** 起 web 服务。
- 浏览器打开 **http://127.0.0.1:3080**（WSL2 默认把端口转发到 Windows 的 localhost，用 Windows 浏览器即可；没有自动弹出就手动打开）。

**验证点**：

```bash
curl -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3080/    # 输出 200
```

且浏览器出现 DSH 界面。

**卡住怎么办**：端口被占用 → 换端口 `dsh --profile web --port 3081`（后面提到的 3080 相应替换）；命令不存在 → 回到第 1 步检查 node/nvm，再重装。停止 DSH = 在该终端按 Ctrl+C（之后重启插件时要用）。

### 2.1 桌面快捷方式（可选，推荐）

在 WSL 内执行一条命令，即可在 Windows 桌面生成「DSH」启动与「Stop DSH」停止两个快捷方式
（内部调用 Windows PowerShell；`wslpath -w` 把 WSL 路径转成 Windows 路径，对任何解压位置都成立）：

```bash
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$(wslpath -w ~/bi-plugin/static/scripts/win/create-desktop-shortcuts.ps1)"
```

执行后桌面出现两个图标（重复执行会覆盖旧图标，幂等）：

- **DSH**：双击启动 DSH Web——自动等待 http://127.0.0.1:3080 就绪后，用 DeepSeek Harness PWA 窗口打开；未装 Harness 则自动回退默认浏览器。内置锁文件防重入（另一次启动进行中会等待，超 200s 的残留锁自动清理）。
- **Stop DSH**：一键停止 DSH Web（向 WSL 内的 dsh 发停止信号，并自动验证 3080 端口已释放）。

注意：

- 需在 Windows 侧执行 `powershell.exe`（在 WSL 内按上面的命令调用即可，脚本会自动定位自身目录）。
- 若双击「DSH」弹出的是默认浏览器而非 Harness 窗口，说明这台机器没装 DeepSeek Harness——**无碍**，功能等价。
- 两个 .bat 通过 `wsl --` 调用 WSL **默认发行版**，请确保默认发行版就是装 DSH 的那个（`wsl -l -v` 查看，需要时 `wsl --set-default <名称>`）。

## 3. 解压插件包

假设压缩包在当前目录（按实际路径替换 `~/Downloads/bi-plugin-v1.0.0.tar.gz`）：

```bash
mkdir -p ~/bi-plugin
tar -xzf ~/Downloads/bi-plugin-v1.0.0.tar.gz -C ~/bi-plugin
ls ~/bi-plugin/
```

**验证点**：目录下出现 `INSTALL.md`、`README.md`、`static/`、`data-service/`、`rules/`、`web/`、`sql/` 等。

> 压缩包内没有顶层目录，所以先 `mkdir -p` 再解压进去；`~/bi-plugin` 在 `$HOME` 下，任何机器都能创建（`mkdir -p` 保证目录不存在时自动建立），不依赖任何预存在目录。解压到其他位置同理，下文以 `~/bi-plugin` 为准。

## 4. 安装插件到 DSH

```bash
cd ~/bi-plugin
bash static/scripts/install-to-dsh.sh
```

脚本做什么（**幂等，可重复执行**）：

1. 拷贝 `bi-dashboards-host` / `bi-dashboards-client` 两个插件包到 `~/.dsh/profiles/web/node_modules/`（自命名目录，不覆盖 DSH 任何文件）
2. 拷贝 echarts 到包内，并生成 `bi-dashboards-host/config.json`（**已存在则保留**；默认 `dataApi=http://localhost:8600`、`statusUrl=http://localhost:8080`，路径均为相对路径，跨机通用）
3. 在 `~/.dsh/profiles/web/cordis.patch.yml` 追加插件挂载块（已存在则跳过）
4. 检测到旧版 `lib/config.json` 时自动合并其服务地址，并归档为 `config.json.migrated`

然后**重启 DSH 并强刷浏览器**：

```bash
# 在运行 dsh 的终端按 Ctrl+C，再重新执行：
dsh --profile web
```

浏览器按 **Ctrl+F5** 强制刷新。

**验证点**：DSH 设置页出现「**无人超市**」分区；「**数据主机**」地址卡片可见（橙色主题、输入框 + icon 按钮）。

**卡住怎么办**：脚本报「未找到 DSH profile」→ 说明第 2 步的 DSH 还没启动过，先启动一次再跑脚本；设置页没有「无人超市」→ 查第 7 节故障排查。

## 5. 连接数据主机（关键一步）

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

## 6. 使用看板

1. 侧栏进入「**我的看板**」：KPI 有数值、图表渲染、表格表头为中文
2. 任一图表右上角筛选 → 选「下单日期」→「介于」→ 填两个日期 → 应用 → 柱/线图变化
3. 浏览器 DevTools Network：`/bi/vendor/echarts.min.js` 200、`/bi/api` 200

看板数据由 **AI 对话生成**（模型调用 `render_dashboard` 生成预览 → 你确认后 `save_dashboard` 保存进「我的看板」）。**新装时看板为空属正常**；生成看板需要 DSH 已配置可用的模型（按 DSH 界面引导完成）。

## 7. 故障排查

| 症状 | 原因与处理 |
|---|---|
| 设置页地址卡片正常，但数据表区红字「✗ 数据服务不可达——检查数据主机地址或网络后重试」 | 不在数据主机所在网络 / 地址填错 / 数据主机服务没起。用卡片的「测试连接」定位：连不通 → 查 IP、是否同一局域网、数据主机 `docker compose up -d` 是否在跑、防火墙是否放行 8600 |
| 同步状态条（云平台/飞书）一直灰色「离线」 | 浏览端正常现象（浏览端没有爬虫）。要显示数据主机的爬虫状态：展开「其他」，把「状态服务」填成数据主机地址（8080 端口），且数据主机已放行 8080 |
| DSH 设置页没有「无人超市」分区 | 挂载块未生效：`grep bi-dashboards-host ~/.dsh/profiles/web/cordis.patch.yml` 应有输出；没有就重跑安装脚本，然后**重启 DSH** |
| 浏览器还是旧界面 | Ctrl+F5 强制刷新 |
| 图表区域空白、Network 里 echarts 404 | vendor 路径不对：重跑安装脚本（相对路径版）即可修复 |
| 端口不是默认的 8600/8080 | 数据主机侧改端口后要**同步改其 config.json**（展示地址自动跟随）；客户端地址必须填**完整 URL（含端口）** |
| 看板为空 / KPI 显示加载中 | 新装无看板属正常——让 AI 对话生成（见第 6 节）；KPI 加载中多为 dataApi 不通，回上一条排查 |
| 同步频率保存报错 | 正常——`crawlConfigFile` 为空时禁用（仅数据主机本机配置爬虫） |
| 看板配置两台机不一样 | 设计如此：`storeFile` 各机独立；要复制看板就把数据主机的 store 文件拷到目标机同路径 |
| `dsh` 命令不存在 | node/nvm 没装好或没 `source ~/.bashrc`；`npm install -g @deepseek-ai/dsh` 重装 |
| 安装脚本报「未找到 DSH profile」 | DSH 没启动过：先执行第 2 步 `dsh --profile web`，出现 `~/.dsh/profiles/web/` 后再跑脚本 |

## 8. 数据主机侧（可选：对方想自己当数据主机时才需要）

**仅看板浏览端可完全跳过本节。** 想自己搭建数据主机时，需要以下组件（均只在数据主机运行）：

- **data-service（:8600）**：FastAPI 数据服务，Docker 部署（根目录 `docker-compose.yml`），依赖外部 PostgreSQL（biz-postgres，库名 `unmanned_supermarket`）与外部网络 `unmanned-store_default`；环境变量参考 `data-service/.env.example`，表结构见 `sql/README.md`
- **状态服务器（:8080，可选）**：`bash web/start.sh`（python3，绑定 0.0.0.0）
- **爬虫同步**：云平台/飞书 → PG 的数据同步只在数据主机运行

端口自定义：8600 改 `docker-compose.yml` 端口映射，8080 改 `web/start.sh` 里的参数，改完同步更新数据主机自己的 config.json（或在其设置页地址卡片改），展示地址自动跟随。

详见仓库内 `README.md`（目录结构表）与各 Docker 指南（`DockerMirrorConfig.md`、`安装 Docker Desktop 说明.md` 等）。
