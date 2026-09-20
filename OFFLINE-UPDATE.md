# 离线更新包使用说明

> **维护者必读（发布流程的一部分）**：离线更新包**不是手工拼装**的，由仓库脚本一键生成：
>
> ```bash
> bash scripts/make-offline-package.sh        # 重建 lib/（esbuild）并打包
> bash scripts/make-offline-package.sh --no-build
> ```
>
> 产物为 `dist/bi-dashboards-offline-<version>-<shortsha>.tar.gz`（`dist/` 不入库）。
> 每次执行 `chore(release): vX.Y.Z` 提交后**必须紧接着运行该脚本**刷新离线包，
> 否则离线机器会停留在旧版（v1.1.6 → v1.1.7 发布时曾遗漏，dist 中 1.1.6 包未更新，事后于本机制补齐）。

本包用于在**完全无网络**的数据宿主机上离线更新 dsh-bi-dashboards 插件。包内已包含构建产物 `lib/index.js`、`lib/client.js`、`static/`、`cordis.patch.yml`、`package.json`、`scripts/` 与 `INSTALL.md`，无需再执行任何构建或联网操作。

## 联网宿主机的自动更新通道（v1.3 起）

- **git 安装**（含 node_modules 内符号链接指向 git 仓库）：`/bi-update` / 设置页「一键更新」走 `git fetch` + `pull --ff-only` + 重建；工作区脏或 detached HEAD 时如实报告并拒绝，绝不跑 reset/checkout/clean 等破坏性命令。
- **快照安装**（非 git）：**不再依赖 `dsh` CLI**（宿主 PATH 缺 nvm 路径时 `dsh` spawn 即 ENOENT）。插件直接下载仓库 tar.gz——Gitee `https://gitee.com/LYJ132/dsh-bi-dashboards/repository/archive/master.tar.gz`（匿名 GET 实测 200）为主通道，GitHub codeload tar.gz 为备通道——解压后**仅按 `package.json` `files` 清单 + cordis.patch.yml 覆盖插件安装目录**，清单外文件（含用户放进包目录的任何文件）一律不删除不触碰；用户数据在包外 `PERSIST_DIR`（`~/.dsh/bi-dashboards/`），天然不受影响。`lib/index.js` 已提交且零外部 bare import，目标机无需装依赖或重建。
- **降级链**：压缩包双通道均不可达 → 退回 `sh -lc 'dsh plugin add …'`（登录 shell 初始化 nvm 补 PATH）→ 仍失败则报手动提示（`dsh plugin --profile web add https://gitee.com/LYJ132/dsh-bi-dashboards.git 更新`）。更新结果语义不变：`重启 DSH 生效`。

本文件其余部分针对**完全无网络**的宿主机。

## 包内容核对

| 内容 | 说明 |
|---|---|
| `lib/index.js` / `lib/client.js` | 已构建好的插件半部（Node / Client），零外部依赖 |
| `static/` | 前端静态资源 |
| `cordis.patch.yml` | dsh 插件安装清单 |
| `package.json` | 插件描述（版本见其中 `version` 字段） |
| `scripts/`、`INSTALL.md` | 构建脚本与官方安装说明 |
| `OFFLINE-UPDATE.md` | 本文件 |

## 在线宿主机上：解包

把 tar.gz 拷到离线宿主机上（如 Windows 共享盘复制），然后：

```bash
tar -xzf bi-dashboards-offline-<version>-<shortsha>.tar.gz -C /tmp/
# 解出的目录形如 /tmp/bi-dashboards-offline-<version>-<shortsha>/
EXTRACTED=/tmp/bi-dashboards-offline-<version>-<shortsha>
```

## 方式一（优先）：用 dsh 官方命令指向本地目录

先尝试用本地目录作为来源重新添加插件：

```bash
dsh plugin --profile web add "$EXTRACTED"
```

如果该命令接受本地目录并成功，则更新完成，跳到“最后一步”。

## 方式二（回退）：git-repo 安装的手动替换

若 `dsh plugin ... add` 不接受本地目录，且目标宿主机上的插件是 **git repo 安装**（其 `git fetch origin` 因无代理而失败），按 `INSTALL.md` 的安装方式做手动替换：

1. 找到宿主机上已安装的插件 repo 目录（即当初 `dsh plugin add` 时的那个 git 目录）。
2. 直接用解包目录的文件**覆盖**该目录（先备份旧的）：

   ```bash
   INSTALLED=<宿主机上已安装插件的目录>   # 例如 ~/.dsh/plugins/dsh-bi-dashboards 之类
   cp -a "$INSTALLED" "$INSTALLED.bak"    # 备份
   rsync -a --delete --exclude '.git' "$EXTRACTED/" "$INSTALLED/"
   ```

   （没有 rsync 就用 `cp -a` 逐项覆盖；**保留**宿主机目录里的 `.git`，以便日后恢复联网后还能正常 fetch。）
3. 确认覆盖后 `lib/index.js`、`lib/client.js`、`cordis.patch.yml`、`static/` 均为新版本。

## 最后一步：重启 dsh 并强刷浏览器

```bash
# 重启 dsh（方式按宿主机实际部署：systemd / docker / 直接进程）
systemctl restart dsh    # 或 docker restart dsh，或重启 dsh 进程
```

然后在浏览器里对看板页面做**强制刷新**（Ctrl+F5 或 Ctrl+Shift+R），确保 Client 半部的新静态资源生效。

## 验证

- `dsh plugin --profile web list`（或等效命令）能看到插件且版本为包内 `package.json` 的 `version`。
- 看板页面功能正常，浏览器控制台无加载错误。
