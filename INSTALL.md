# INSTALL.md — 无人超市 AI BI 插件 · 全流程安装指南（给执行本文件的 AI / 人）

> **插件版本**：v1.1.0（官方 DSH 插件单包形态 `dsh-bi-dashboards`，通过 `dsh plugin add` 安装）
>
> **目标**：在一台全新（或已有）WSL2 的 Windows 电脑上，从 WSL 环境准备 → Node/nvm → DSH 安装启动 →
> 插件安装 → 连接数据主机 → 验证看板，全流程跑通。
>
> **执行者请按顺序执行**，每一步都有「验证点」；卡住时先查第 7 节「故障排查」。
> 文中所有命令均在本插件的开发验证环境（Ubuntu 22.04 / WSL2 / Node v22）验证。

## 三行上手（给非技术用户）

不关心原理？在 WSL 终端里照抄三行，逐行执行：

```bash
bash static/scripts/doctor.sh                                    # 1. 体检：全部 [通过] 再继续（有 [失败] 按提示修）
dsh plugin --profile web add github:LYJ132/dsh-bi-dashboards     # 2. 装插件
# 3. 重启 DSH（运行 dsh 的终端 Ctrl+C，再 dsh --profile web），浏览器 Ctrl+F5
```

第 1 步若提示「需先修复」，把输出里每条 [失败] 下方的「修复：」命令照抄执行，再重跑体检直到通过。
装完后看板是空的属正常——在 DSH 对话框里让 AI 生成看板（见第 5 节）。

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
dsh plugin --profile web add github:LYJ132/dsh-bi-dashboards
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
dsh plugin --profile web add github:LYJ132/dsh-bi-dashboards   # 或本地路径
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
> **安全须知（本版本应用层零鉴权）**：8600 数据服务与 8080 状态服务器**没有任何应用层鉴权**，能连通即可读取白名单表的**全量**数据——表白名单只是限定「只能 SELECT 这些表」，不是访问控制。因此：同一局域网直连 = 同网段任何人都能看全部业务数据，是否接受由数据主人决策；跨网络访问**必须走 Tailscale/VPN**（见第 4 节表与第 9.2 节），严禁用 frp/ngrok/公网映射暴露 8600。加固步骤（8080 锁本机、8600 仅经 VPN、可选 nginx 反代）见 **9.2 网络安全姿态**。

**验证点**：

- 数据表区不再是红色「**✗ 数据服务不可达**」，出现中文表名列表（销售明细、商品主档、库存总览……）
- 同步状态条（云平台/飞书三项）显示灰色「**离线**」**属预期**——浏览端没有爬虫，不代表故障

## 5. 使用看板

1. 侧栏进入「**我的看板**」：KPI 有数值、图表渲染、表格表头为中文
2. 任一图表右上角筛选 → 选「下单日期」→「介于」→ 填两个日期 → 应用 → 柱/线图变化
3. 浏览器 DevTools Network：`/bi/vendor/echarts.min.js` 200、`/bi/api` 200

看板数据由 **AI 对话生成**（模型调用 `render_dashboard` 生成预览 → 你确认后 `save_dashboard` 保存进「我的看板」）。**新装时看板为空属正常**；生成看板需要 DSH 已配置可用的模型（按 DSH 界面引导完成）。

## 6. 升级与卸载

- **升级**：重新执行 `dsh plugin --profile web add github:LYJ132/dsh-bi-dashboards`（或新版本地路径）。用户数据在 `~/.dsh/bi-dashboards/`，**升级不会丢失配置与看板**。
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

## 8. 常见报错对照表（2026-09-14 实际部署事故沉淀）

> 下面 8 条全部来自真实安装事故。装之前先跑 `bash static/scripts/doctor.sh`，其中 1/2/3/6 会提前替你查到这里的大多数坑。

### 8.1 github.com 解析到 127.0.0.1

- **症状**：`dsh plugin add github:...` 报连接失败 / `getent hosts github.com` 输出 `127.0.0.1`；换 DNS、重装系统包都无效。
- **原因**：DNS 层劫持或 `/etc/hosts` 里残留了把 github.com 指到本机的映射（与证书无关，别去重装 ca-certificates 走弯路）。
- **修复**：
  ```bash
  getent hosts github.com                # 先确认：输出 127.0.0.1 即中招
  grep -n github /etc/hosts              # 有映射行就 sudo 编辑删掉
  # /etc/hosts 干净仍被劫持 → 路由器/运营商 DNS 问题，换 DNS 或开代理 TUN 模式：
  # 例如 sudo 编辑 /etc/resolv.conf 写入 nameserver 223.5.5.5
  ```

### 8.2 证书验证失败（curl 报 certificate / SSL）

- **症状**：`curl https://github.com` 报 `certificate verify failed` 之类的证书错误。
- **原因**：系统 CA 证书过期/缺失（少数情况是系统时间不对）。
- **修复**：
  ```bash
  date                                   # 时间不对先校时
  sudo apt-get update && sudo apt-get install --reinstall ca-certificates
  ```
  > 注意：先确认不是 8.1 的 DNS 劫持（DNS 被劫持时也会伪装成证书错误）——`getent hosts github.com` 不是 127.0.0.1 再走本条。

### 8.3 ERR_PNPM_IGNORED_BUILDS（依赖构建被拦截）

- **症状**：安装/启动 DSH 时报 `ERR_PNPM_IGNORED_BUILDS`，提示 ignored build scripts，插件加载失败或功能残缺。
- **原因**：pnpm 默认拦截依赖的原生构建，`@deepseek-ai/dsh-subprocess-local`、`koffi`、`node-pty`、`protobufjs` 这几个包没被放行。
- **修复**：把下面整块并入 `~/.dsh/profiles/web/pnpm-workspace.yaml`（已有 `allowBuilds:` 段就把键并进去，没有就整块追加到文件末尾），然后重跑安装：
  ```yaml
  allowBuilds:
    '@deepseek-ai/dsh-subprocess-local': true
    koffi: true
    node-pty: true
    protobufjs: true
    all: true
  ```

### 8.4 duplicate loader entry id（挂载项 id 重复）

- **症状**：DSH 启动报 `duplicate loader entry` / `failed to import loader entry <id>`，插件加载不出来。
- **原因**：profile 的 `~/.dsh/profiles/web/cordis.patch.yml` 里手写/残留了一条 insert，而它的 id 与某个包**自带**的 `cordis.patch.yml` 里的 id 相同（典型：把旧包的补丁整段抄进了 profile 补丁，新版单包又由 bundle patch 自动挂载），同一 id 挂了两次。
- **修复**：删除 profile 补丁里的重复块，只留包自带的：
  ```bash
  cat ~/.dsh/profiles/web/cordis.patch.yml     # 看有哪些 id
  # 用编辑器删掉与包内 cordis.patch.yml 重复的那条 insert（profile 补丁为空时写成 []）
  dsh --profile web                            # 重启验证
  ```

### 8.5 insert 指向不存在的包（悬空 insert）

- **症状**：启动报 `failed to import loader entry <包名>: Cannot find package ...`，但那个包根本没装。
- **原因**：profile 的 cordis.patch.yml 里残留着已卸载/已改名包的 insert 块（典型：旧双包删了，补丁块没删干净）。
- **修复**：
  ```bash
  ls ~/.dsh/profiles/web/node_modules/<报错的包名>   # 确认目录确实不存在
  # 编辑 ~/.dsh/profiles/web/cordis.patch.yml，整块删掉指向该包的 insert（含 "- insert:" 到下一条目之间）
  ```

### 8.6 sharp 提示其它平台下载/预编译警告

- **症状**：安装过程中刷出 sharp 在非当前平台（如 linux-x64 之外的 prebuilt）下载失败或跳过的警告。
- **原因**：sharp 的可选平台二进制按需下载，本机用不到的平台下载失败无影响。
- **修复**：**可忽略，无需处理**。只要安装最终成功、DSH 能启动即可。

### 8.7 remove 报 no such dependency

- **症状**：`dsh plugin remove <包名>` 时报 `no such dependency` 之类错误，卸不掉。
- **原因**：包已在 node_modules 里被删但元数据还在（或反之），remove 流程找不到它要删的东西。
- **修复**：**可跳过**。目标已不存在就是目的已达；继续装新版即可：
  ```bash
  dsh plugin --profile web add github:LYJ132/dsh-bi-dashboards
  ```

### 8.8 图表全部消失（store 看板数据文件丢失）

- **症状**：重启/迁移后「我的看板」空了，之前保存的图表全没了；`~/.dsh/bi-dashboards/data/` 下没有 `bi-dashboards.json`。
- **原因**：看板数据存在包外持久化文件 `~/.dsh/bi-dashboards/data/bi-dashboards.json`（由旧 config 的 `storeFile` 指定，老机器可能指向别的路径）。迁移/重装时该文件没被搬过来——只迁了 config 和 vendor 不够。
- **修复**：
  ```bash
  # 1) 找旧数据：迁移备份目录里通常有
  ls ~/.dsh/bi-dashboards/backup-*/bi-dashboards-host/data/
  # 2) 拷回持久化目录（把 <backup> 换成实际的 backup-日期 目录）
  cp ~/.dsh/bi-dashboards/<backup>/bi-dashboards-host/data/bi-dashboards.json \
     ~/.dsh/bi-dashboards/data/bi-dashboards.json
  # 3) 验证是合法 JSON 后重启 DSH
  node -e 'JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")); console.log("OK")' \
     ~/.dsh/bi-dashboards/data/bi-dashboards.json
  ```
  旧机器请改用 `static/scripts/migrate-to-native.sh`（新版已含 store 定位、拷贝与验证逻辑，会自动按旧 config 的 storeFile 找数据）。

## 9. 数据主机侧（可选：对方想自己当数据主机时才需要）

**仅看板浏览端可完全跳过本节。** 想自己搭建数据主机时，需要以下组件（均只在数据主机运行）：

- **data-service（:8600）**：FastAPI 数据服务，Docker 部署（`docs/docker-windows/docker-compose.yml`，放到仓库根与 `data-service/` 同级使用），依赖外部 PostgreSQL（biz-postgres，库名 `unmanned_supermarket`）与外部网络 `unmanned-store_default`（前置条件见 compose 文件内注释）。账户密码等**必填变量从 compose 旁 `.env` 注入**（模板 `docs/docker-windows/.env.example`，占位符，`.env` 不入库）；容器外手动跑的完整变量清单参考 `data-service/.env.example`；表结构见 `sql/README.md`
- **状态服务器（:8080，可选）**：`bash web/start.sh`（python3，当前固定绑定 0.0.0.0，锁本机见 9.2 节）
- **爬虫同步**：云平台/飞书 → PG 的数据同步只在数据主机运行

### 9.1 部署矩阵（组件 × 环境默认值）

| 变量/地址 | 数据主机（宿主机） | data-service 容器内 | 目标机（远程浏览器，DSH 插件） |
|---|---|---|---|
| **DB host**（`DB_HOST`） | `biz-postgres:5432`（PG 是 unmanned-store 项目里的容器；宿主机手动跑 uvicorn 调试时改 `localhost`） | `biz-postgres`（由 `.env` 注入，走 `unmanned-store_default` 外部网络） | 不适用——只经 8600 取数，不直连 PG |
| **数据服务 URL**（`dataApi`） | `http://localhost:8600` | 监听 `0.0.0.0:8600`，compose 映射到宿主机 `:8600` | 默认 `http://localhost:8600`（即本机自建数据主机的零配置情形）；远程浏览填数据主机地址，如 `http://192.168.1.100:8600` 或 Tailscale 的 `http://100.x.x.x:8600` |
| **状态 URL**（`statusUrl`） | `http://localhost:8080` | 不适用——状态服务器不进容器 | 默认 `http://localhost:8080`（浏览端显示「离线」属预期）；要看数据主机爬虫状态才改填 `http://<数据主机>:8080` |
| **表/视图命名空间** | `sql/` DDL；插件新建对象在 `bi_plugin` schema（`public.forecast_*` 为登记的例外） | 同左（连接库 `unmanned_supermarket`） | 只读展示，中文视图引用需带 `bi_plugin.` 前缀 |

端口自定义：8600 改 `docs/docker-windows/docker-compose.yml` 端口映射，8080 改 `web/start.sh` 里的参数，改完同步更新数据主机自己的 config.json（或在其设置页地址卡片改），展示地址自动跟随。

### 9.2 网络安全姿态（本版本应用层零鉴权，安全完全由网络层承担）

前提认知：**8600/8080 没有任何应用层鉴权**。所谓「表白名单」只是限定 data-service 能对哪些表执行 SELECT，**不是访问控制**——网络可达者即可读白名单表的全量数据。据此有三条具体做法：

**（1）8080 状态服务器：锁到本机**

`web/server.py` 当前写死绑定 `0.0.0.0`（`web/start.sh` 只传端口），锁到本机靠防火墙收口：

```bash
# Ubuntu（非 WSL）：默认拒入站；loopback 不走 INPUT，本机访问不受影响
sudo ufw default deny incoming
sudo ufw allow in on tailscale0 to any port 8600 proto tcp   # 8600 仅经 VPN 进，见（2）
sudo ufw enable
```

```powershell
# WSL2：默认 NAT 模式下局域网本来就进不来 8080；
# 若开了 mirrored 网络模式或做过 portproxy，在 Windows（管理员 PowerShell）加阻断规则：
netsh advfirewall firewall add rule name="dsh-bi-8080-block" dir=in action=block protocol=tcp localport=8080
```

**（2）8600 数据服务：跨网络访问必须走 Tailscale/VPN**

- 标准做法：两台机安装 Tailscale 并登录同一账号，目标机 `dataApi` 填数据主机的 `100.x` 地址；同时按上面 ufw 把 8600 入站限制在 `tailscale0` 接口（WSL2 则用 netsh 只放行 Tailscale 虚拟网卡对应网段）。
- **禁止**：frp、ngrok、路由器端口映射、公网 IP 直开——8600 无鉴权，等于把数据库白名单表全量公开。
- 同一局域网直连属数据主人的便利取舍：接受即意味着同网段任何设备可读白名单表全量数据，本指南不做技术兜底。

**（3）可选 nginx 反向代理（仅 TLS 终结/统一入口；鉴权按用户决策暂缓）**

> 明确说明：本节示例**只提供 TLS 终结与统一入口，不构成访问控制**。接入层鉴权（Basic Auth / auth_request 等）按用户决策暂缓实现——不要把「挂了 nginx」当成安全边界，能到 nginx 的请求仍会被转发给无鉴权的 8600。

```nginx
server {
    listen 443 ssl;
    server_name bi.example.com;
    ssl_certificate     /etc/letsencrypt/live/bi.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bi.example.com/privkey.pem;

    location / {
        # 配合把 compose 端口映射改为 "127.0.0.1:8600:8600"，
        # 让 8600 只从 loopback 服务，外部流量必须经 nginx 进来
        proxy_pass http://127.0.0.1:8600;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

启用反代后：`docs/docker-windows/docker-compose.yml` 的映射改成 `"127.0.0.1:8600:8600"`，目标机 `dataApi` 填该 https 域名。

详见仓库内 `README.md`（目录结构表）与各 Docker 指南。
