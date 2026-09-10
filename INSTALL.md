# INSTALL.md — 无人超市 AI BI 插件 · 异机安装指南（给执行本文件的 AI / 人）

> 目标：把 `bi-plugin/` 整个文件夹拿到另一台装有 DSH 的电脑后，按本文执行即可跑通。
> 执行者请严格按顺序做，每一步都有验证点；卡住时查「故障排查」。

## 0. 架构一图流（决定你该怎么配）

```
目标机（看板浏览端）                      数据主机（这台电脑）
┌─────────────────────────┐            ┌──────────────────────────────┐
│ DSH + bi-dashboards-*   │  HTTP      │ 8600 data-service(FastAPI)   │
│   插件 host/client 包    │ ────────→ │   └→ PostgreSQL(biz-postgres)│
│   config.json 指向数据主机│            │ 8080 状态服务器（可选）        │
└─────────────────────────┘            └──────────────────────────────┘
```

- 插件本体（host/client 两个包 + echarts）随文件夹自带，装完即可用 UI。
- **数据不在文件夹里**：数据始终在数据主机的 PostgreSQL，经 8600 数据服务按白名单访问。

## 1. 网络模式判定（先选后装）

| 情形 | 是否需要内网穿透 | 目标机 `dataApi` 填什么 |
|---|---|---|
| 两台机在同一局域网（同一 WiFi/路由器） | **不需要** | 设置页「服务地址」里粘贴数据主机展示的地址，或 `http://<数据主机内网IP>:8600` |
| 跨网络（异地/不同网络） | **需要**，推荐 Tailscale（免费、免公网服务器、组私有网） | `http://<Tailscale IP>:8600`（形如 `http://100.x.x.x:8600`） |
| 就装在数据主机本机 | 不需要 | `http://localhost:8600`（默认值，零配置即用） |

- 查数据主机内网 IP：在数据主机执行 `hostname -I | awk '{print $1}'`。
- Tailscale 路径：两台机都安装并登录同一账号（`curl -fsSL https://tailscale.com/install.sh | sh` → `tailscale up`），各自 `tailscale ip -4` 得到 100.x 地址，填入即可。不要用 frp/ngrok 把无鉴权的 8600 暴露到公网。
- 安全须知：8600 目前无鉴权，仅数据表白名单兜底。请只在你信任的网络里开放；Tailscale 属私有网络，风险可控。

## 2. 数据主机一侧（一次性检查）

在数据主机上执行并确认输出正常：

```bash
cd bi-plugin && docker compose up -d          # 启动 8600 数据服务（含 PG）
curl -s http://localhost:8600/api/meta/tables | head -c 200   # 应返回 JSON
```

8600/8080 已绑定 0.0.0.0，局域网默认可达；若目标机连不通，检查主机防火墙是否放行 8600（和 8080，可选）。

## 3. 目标机安装

前置：目标机已安装并启动过 DSH（存在 `~/.dsh/profiles/web/`）；有 bash + curl。

```bash
cd bi-plugin
bash static/scripts/install-to-dsh.sh --data-api http://<数据主机IP>:8600
```

脚本做了什么（幂等，可重复执行）：
1. 拷贝 `bi-dashboards-host` / `bi-dashboards-client` 两个包到 `~/.dsh/profiles/web/node_modules/`（自命名目录，不覆盖 DSH 任何文件）
2. 拷贝 echarts 到包内并生成 `bi-dashboards-host/config.json`（路径为相对路径，跨机通用；已存在则保留）
3. 在 `~/.dsh/profiles/web/cordis.patch.yml` 追加挂载块（已存在则跳过）
4. 检测到旧版 `lib/config.json` 时自动合并其服务地址并归档为 `config.json.migrated`

然后**重启 DSH**，浏览器 Ctrl+F5。

**异机装完后配置数据主机地址（二选一）：**
- 推荐：设置页「无人超市」→「服务地址」→ 粘贴数据主机设置页展示的 IP → 「测试连接」→「保存」，**保存即生效无需重启**
- 或重跑安装脚本：`bash static/scripts/install-to-dsh.sh --data-api http://<数据主机IP>:8600`

## 4. config.json 字段说明

位置：`~/.dsh/profiles/web/node_modules/bi-dashboards-host/config.json`（首次启动若缺失会自动生成默认值）

日常**改地址优先用设置页「服务地址」**（可视化、保存即生效、还能测试连通性）；直接编辑此文件则需重启 DSH。

| 字段 | 作用 | 默认 |
|---|---|---|
| `dataApi` | 数据服务地址（**跨机必改**，设置页可直接改） | `http://localhost:8600` |
| `statusUrl` | 同步状态服务器（数据主机爬虫状态台；不配则状态条显示离线，看板功能不受影响） | `http://localhost:8080` |
| `vendorFile` | echarts 文件路径，**相对插件包根**（如 `static/vendor/echarts.min.js`），跨机通用 | 包内 `static/vendor/` |
| `storeFile` | 看板配置存档（views/charts，各机器独立），**相对插件包根** | 包内 `data/` |
| `crawlConfigFile` | 爬虫配置（仅数据主机本机有；留空自动禁用同步频率设置） | `""` |

设置页「服务地址」卡片还会**展示本机局域网 IP**：数据主机打开设置页即可看到自己的可分享地址（一键复制），其他机器粘贴即用。改完 config.json 需重启 DSH 生效（设置页修改则即时生效）。

## 5. 验证清单（按序）

1. `curl -s http://<数据主机IP>:8600/api/meta/tables | head -c 200` —— 从**目标机**执行，应返回 JSON（网络通）；或在设置页「服务地址」点「测试连接」
2. DSH 设置页出现「无人超市」分区，「服务地址」卡片显示本机局域网 IP；数据表列表为中文表名（销售明细、商品主档……）
3. 侧栏进入「我的看板」：KPI 有数值、图表渲染、表格表头为中文
4. 任一图表右上角筛选 → 选「下单日期」→「介于」→ 填两个日期 → 应用 → 柱/线图变化
5. 浏览器 DevTools Network：`/bi/vendor/echarts.min.js` 200、`/bi/api` 200

## 6. 故障排查

| 症状 | 原因与处理 |
|---|---|
| 看板为空 / KPI 显示加载中 | `dataApi` 不通：设置页「服务地址」点「测试连接」查原因；不通查 IP、防火墙、数据主机 docker 是否在跑 |
| 图表区域空白、Network 里 echarts 404 | `vendorFile` 路径不对：重跑安装脚本（相对路径版）即可修复 |
| 设置页没有「无人超市」 | patch 块未生效：确认 `cordis.patch.yml` 含 `bi-dashboards-host` 段且 DSH 已重启 |
| 设置页没有「服务地址」卡片 | 部署的是旧版 client：重跑安装脚本更新插件包 |
| 同步状态条一直「离线」 | 目标机正常现象（没爬虫）；要显示数据主机状态就把「状态服务地址」指向数据主机（8080），且数据主机已放行 8080 |
| 同步频率保存报错 | 正常——`crawlConfigFile` 为空时禁用（仅数据主机本机配置爬虫） |
| 看板配置两台机不一样 | 设计如此：`storeFile` 各机独立；要复制看板就把数据主机的 store 文件拷到目标机同路径 |

## 7. 数据主机侧的爬虫/同步（仅本机相关）

数据同步（云平台/飞书 → PG）只在数据主机运行，由 `bi-plugin/web/`（:8080）+ `Crawler/` 承担，与本安装无关；目标机不需要也不应运行爬虫。
