#!/bin/bash
# Docker 国内镜像配置脚本

MIRROR_CONFIG='{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com"
  ],
  "insecure-registries": [],
  "max-concurrent-downloads": 10,
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "features": {
    "buildkit": true
  }
}'

echo "=========================================="
echo " Docker 国内镜像配置"
echo "=========================================="
echo ""

# Windows Docker Desktop
if [ -d "/mnt/c/ProgramData/docker/config" ]; then
    echo "$MIRROR_CONFIG" > "/mnt/c/ProgramData/docker/config/daemon.json"
    echo "✅ Windows Docker Desktop 镜像配置已更新"
    echo "   位置: C:\\ProgramData\\docker\\config\\daemon.json"
else
    echo "⚠️  Windows Docker Desktop 未安装"
fi

# WSL2 Docker Engine
WSL_DAEMON="/etc/docker/daemon.json"
if [ -d "/etc/docker" ]; then
    echo "$MIRROR_CONFIG" > "$WSL_DAEMON"
    echo "✅ WSL2 Docker Engine 镜像配置已更新"
    echo "   位置: $WSL_DAEMON"
    echo ""
    echo "请运行以下命令重启 Docker："
    echo "   sudo systemctl restart docker"
else
    echo "⚠️  WSL2 Docker Engine 未安装"
fi

echo ""
echo "=========================================="
echo " 验证配置"
echo "=========================================="
echo ""
echo "运行以下命令验证："
echo "   docker info | grep -A 5 'Registry Mirrors'"
echo ""
echo "=========================================="
