# 离线更新包使用说明

本包用于在**完全无网络**的数据宿主机上离线更新 dsh-bi-dashboards 插件。包内已包含构建产物 `lib/index.js`、`lib/client.js`、`static/`、`cordis.patch.yml`、`package.json`、`scripts/` 与 `INSTALL.md`，无需再执行任何构建或联网操作。

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
