# bi-plugin 安装最终状态报告

## ✅ 已完成

### 1. bi-plugin DSH 插件
- 位置：`~/.dsh/profiles/web/node_modules/bi-dashboards-host/`
- 配置：`config.json` 已设置 `dataApi=http://192.168.120.192:8600`
- 挂载：`cordis.patch.yml` 已配置

### 2. Docker Desktop
- 版本：4.90.0 (238679)
- 安装位置：`C:\Program Files\Docker\Docker\`
- WSL2 发行版：docker-desktop

### 3. Docker 国内镜像配置
- 配置文件：`C:\ProgramData\docker\config\daemon.json`
- 已配置镜像：
  - https://docker.mirrors.ustc.edu.cn
  - https://hub-mirror.c.163.com
  - https://mirror.baidubce.com

## ⚠️ 需要手动操作

### Docker Desktop 启动

1. 按 Win 键，搜索 "Docker Desktop"
2. 启动 Docker Desktop
3. 等待系统托盘出现鲸鱼图标
4. 右键鲸鱼图标 → Settings → General
5. ✅ 勾选 "Use WSL 2 based engine"
6. ✅ 勾选 "Ubuntu-22.04" (WSL Integration)
7. 点击 "Apply & Restart"

### 验证 Docker

在 PowerShell 中运行：
```powershell
docker ps
docker info | Select-String "Registry Mirrors"
```

## ⏳ 等待数据主机连接

当你在局域网内连接数据主机 (192.168.120.192) 后：

1. **在数据主机上启动数据服务：**
   ```bash
   cd bi-plugin
   docker compose up -d
   ```

2. **验证数据服务：**
   ```bash
   curl http://localhost:8600/api/meta/tables
   ```

3. **在本机验证连接：**
   ```bash
   curl http://192.168.120.192:8600/api/meta/tables
   ```

4. **重启 DSH**

5. **验证 bi-plugin 功能：**
   - DSH 设置页出现「无人超市」分区
   - 侧栏进入「我的看板」
   - KPI 有数值、图表渲染正常

## 📁 重要文件位置

| 文件 | 路径 |
|------|------|
| bi-plugin 配置 | `~/.dsh/profiles/web/node_modules/bi-dashboards-host/config.json` |
| DSH 挂载配置 | `~/.dsh/profiles/web/cordis.patch.yml` |
| Docker 镜像配置 | `C:\ProgramData\docker\config\daemon.json` |
| 安装指南 | `bi-plugin/安装完成指南.md` |
| 镜像配置指南 | `bi-plugin/Docker镜像配置指南.md` |
| 配置脚本 | `bi-plugin/setup-docker-mirrors.sh` |

## 🎯 下一步

1. 启动 Docker Desktop 并等待鲸鱼图标出现
2. 等待连接到局域网（数据主机 192.168.120.192）
3. 在数据主机上运行 `docker compose up -d`
4. 重启 DSH 并验证 bi-plugin 功能
