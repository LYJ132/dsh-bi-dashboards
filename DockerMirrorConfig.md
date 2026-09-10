# Docker Desktop 中国镜像配置

## 镜像加速器配置

在 Docker Desktop 中配置中国镜像加速器：

1. 打开 Docker Desktop
2. 点击右上角齿轮图标进入 Settings
3. 选择 "Docker Engine"
4. 添加以下内容到 `registry-mirrors` 数组：

```json
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com"
  ]
}
```

5. 点击 "Apply & Restart"

## 常用镜像加速器

| 镜像源 | URL |
|--------|-----|
| 中国科学技术大学 | https://docker.mirrors.ustc.edu.cn |
| 网易 | https://hub-mirror.c.163.com |
| 百度 | https://mirror.baidubce.com |
| 阿里云 | https://<你的ID>.mirror.aliyuncs.com |
| 腾讯云 | https://mirror.ccs.tencentyun.com |

## 验证配置

```bash
docker info | grep -A 5 "Registry Mirrors"
```
