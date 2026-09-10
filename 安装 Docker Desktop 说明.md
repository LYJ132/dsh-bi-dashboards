# 安装 Docker Desktop 说明

## 方法一：手动双击安装（推荐）

1. 打开 Windows 资源管理器
2. 导航到：C:\Users\LIN YU JIAN\Desktop\
3. 双击 DockerDesktopSetup.exe
4. 在弹出的 UAC 对话框中点击"是"
5. 等待安装完成（约 2-5 分钟）
6. 安装完成后 Docker Desktop 会自动启动

## 方法二：使用命令行安装

1. 打开 PowerShell（管理员）
2. 运行以下命令：
```powershell
Start-Process -FilePath "C:\Users\LIN YU JIAN\Desktop\DockerDesktopSetup.exe" -Verb RunAs
```

## 安装选项

安装过程中请确保选择：
- [x] Use WSL 2 instead of Hyper-V
- 允许 Docker Desktop 访问 WSL 2

## 镜像加速器配置

安装完成后，Docker Desktop 会自动读取已配置的镜像加速器（配置文件已预置）：
- 中国科学技术大学：https://docker.mirrors.ustc.edu.cn
- 网易：https://hub-mirror.c.163.com
- 百度：https://mirror.baidubce.com

验证配置：
```bash
docker info | grep -A 5 "Registry Mirrors"
```

## 安装后验证

```bash
# 检查 Docker 版本
docker --version

# 检查 Docker Desktop 是否运行
docker info

# 测试运行 Hello World
docker run hello-world
```

## 故障排查

如果安装失败：
1. 确保 Windows 功能已启用：WSL 2 和 虚拟机平台
   - 控制面板 → 程序 → 启用或关闭 Windows 功能 → 勾选"虚拟机平台"和"Windows 子系统 for Linux"
2. 确保 BIOS 中已启用虚拟化（VT-x / AMD-V）
3. 关闭所有已运行的 Docker Desktop 实例
4. 以管理员身份运行安装程序
5. 如需重新安装：控制面板 → 程序 → 卸载 Docker Desktop → 重新运行安装程序
