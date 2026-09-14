# Docker 国内镜像配置 - 快速参考

## ✅ 已完成配置

配置文件：`C:\ProgramData\docker\config\daemon.json`

```json
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com"
  ]
}
```

## 验证方法

**PowerShell:**
```powershell
docker info | Select-String "Registry Mirrors"
```

**WSL 终端:**
```bash
~/.local/bin/docker info | grep -A 5 "Registry Mirrors"
```

## 常见问题

### Q: 镜像配置不生效？
A: 按以下步骤排查：
1. 确认 Docker Desktop 正在运行（系统托盘鲸鱼图标）
2. 右键鲸鱼图标 → Settings → Docker Engine
3. 确认 `registry-mirrors` 数组已保存
4. 点击 Apply & Restart

### Q: 拉取镜像仍然很慢？
A: 尝试：
1. 更换镜像源顺序（把中科大放在第一位）
2. 检查网络连接
3. 使用 `docker pull docker.mirrors.ustc.edu.cn/library/ubuntu` 直接指定镜像

### Q: 如何添加更多镜像？
A: 编辑 `C:\ProgramData\docker\config\daemon.json`，在 `registry-mirrors` 数组中添加：
```json
"registry-mirrors": [
  "https://docker.mirrors.ustc.edu.cn",
  "https://hub-mirror.c.163.com",
  "https://mirror.baidubce.com",
  "https://registry.docker-cn.com"
]
```

## bi-plugin 相关

数据主机地址：`192.168.120.192:8600`

安装完成后验证：
```bash
curl http://192.168.120.192:8600/api/meta/tables
```
