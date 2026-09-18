# docs/docker-windows — Windows Docker Desktop 一次性安装套件

本目录存放的是**数据主机（data host）首次搭建时的一次性 Windows Docker Desktop 安装/镜像加速套件**，属于历史性的一次性物料。

这些文件**不参与插件安装**：安装 dsh-bi-dashboards 插件走官方通道（GitHub 主通道 `dsh plugin --profile web add github:LYJ132/dsh-bi-dashboards`，Gitee 备选通道 `https://gitee.com/LYJ132/dsh-bi-dashboards.git`），见仓库根 [INSTALL.md](../../INSTALL.md)，无需本目录任何文件。

## 内容

| 文件 | 用途 |
| --- | --- |
| `安装 Docker Desktop 说明.md` | Docker Desktop 安装步骤说明 |
| `install-docker-with-mirrors.ps1` | PowerShell：安装 Docker Desktop 并配置国内镜像 |
| `run-docker-install.cmd` | CMD 入口，双击运行安装脚本 |
| `start-docker-install.sh` | WSL 侧启动安装流程 |
| `setup-docker-mirrors.sh` | 配置 Docker 镜像加速源 |
| `config-docker-dns.ps1` | 配置 Docker DNS |
| `daemon.json` | Docker daemon 镜像加速参考配置 |
| `DockerMirrorConfig.md` / `Docker镜像配置指南.md` / `Docker镜像配置快速参考.md` | 镜像配置说明文档 |
| `docker-compose.yml` | data-service 容器编排参考（数据主机上放到仓库根使用；必填变量来自 `.env`，外部 PostgreSQL/网络前置条件见文件内注释） |
| `.env.example` | compose 环境变量模板（仅占位符；真实的 `.env` 不入库） |
