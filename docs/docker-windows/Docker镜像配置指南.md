# Docker Desktop 国内镜像配置指南

## 问题原因

Docker Desktop 运行在一个独立的 WSL2 VM (`docker-desktop`) 中，
该 VM 有自己的网络栈和 DNS 配置，不直接使用宿主机的 DNS 设置。

daemon.json 中的 `dns` 配置只影响容器的 DNS，不影响 Docker daemon 本身的网络。

## 解决方案

### 方案一：通过 Docker Desktop GUI 配置（推荐）

1. **打开 Docker Desktop Settings**
   - 右键系统托盘鲸鱼图标
   - 点击 Settings (齿轮图标)

2. **配置 Docker Engine**
   - 左侧菜单选择 **Docker Engine**
   - 在 JSON 编辑器中添加：

```json
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com"
  ],
  "dns": [
    "223.5.5.5",
    "114.114.114.114",
    "8.8.8.8"
  ]
}
```

3. **应用配置**
   - 点击 **Apply & Restart**
   - 等待 Docker Desktop 重启完成

4. **验证配置**
   ```powershell
   docker info | Select-String "Registry Mirrors"
   docker info | Select-String "DNS"
   ```

### 方案二：配置 WSL2 VM 的 DNS

1. 编辑 `/etc/wsl.conf`：
```ini
[network]
generateResolvConf = false
```

2. 创建 `/etc/resolv.conf`：
```
nameserver 223.5.5.5
nameserver 114.114.114.114
nameserver 8.8.8.8
```

3. 重启 WSL：
```bash
wsl.exe --shutdown
# 然后重新启动 WSL
```

4. 重启 Docker Desktop

### 方案三：使用代理

如果镜像源仍然不可用，可以尝试配置 HTTP 代理：

```json
{
  "proxies": {
    "http-proxy": "http://your-proxy:port",
    "https-proxy": "http://your-proxy:port",
    "no-proxy": "*.internal.com"
  }
}
```

## 常用国内镜像源

| 镜像源 | URL | 状态 |
|--------|-----|------|
| 中国科学技术大学 | https://docker.mirrors.ustc.edu.cn | ⭐ 推荐 |
| 网易 | https://hub-mirror.c.163.com | ✅ 可用 |
| 百度 | https://mirror.baidubce.com | ✅ 可用 |
| 阿里云 | https://<你的ID>.mirror.aliyuncs.com | 需要注册 |
| 腾讯云 | https://mirror.ccs.tencentyun.com | ✅ 可用 |

## 验证方法

```powershell
# 检查镜像配置
docker info | Select-String "Registry Mirrors"

# 检查 DNS 配置
docker info | Select-String "DNS"

# 测试拉取镜像
docker pull busybox
```

## 当前配置状态

✅ 已配置：
- 配置文件：`C:\ProgramData\docker\config\daemon.json`
- 镜像源：ustc、163、baidubce
- DNS：223.5.5.5、114.114.114.114、8.8.8.8

⚠️ 注意：由于 Docker Desktop 网络隔离，daemon.json 配置可能不会自动生效，
请通过 GUI 手动配置。
