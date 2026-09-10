#!/bin/bash
# bi-plugin 一键启动脚本

echo "=========================================="
echo " bi-plugin 启动脚本"
echo "=========================================="
echo ""

# 检查 Docker Desktop 是否运行
if wsl.exe -d docker-desktop -- bash -c "docker ps > /dev/null 2>&1" 2>/dev/null; then
    echo "✅ Docker Desktop 正在运行"
else
    echo "⚠️ Docker Desktop 未运行，请先启动 Docker Desktop"
    echo "   在 Windows 开始菜单搜索 'Docker Desktop' 并启动"
    exit 1
fi

# 检查数据主机连接
echo ""
echo "检查数据主机连接..."
if curl -s --connect-timeout 5 http://192.168.120.192:8600/api/meta/tables > /dev/null 2>&1; then
    echo "✅ 数据主机连接成功"
    curl -s http://192.168.120.192:8600/api/meta/tables | head -c 200
    echo ""
else
    echo "⚠️ 无法连接到数据主机 (192.168.120.192:8600)"
    echo "   请确保:"
    echo "   1. 数据主机已启动: cd bi-plugin && docker compose up -d"
    echo "   2. 你已连接到数据主机所在的局域网"
    echo "   3. 防火墙已放行 8600 端口"
fi

echo ""
echo "=========================================="
echo " bi-plugin 插件状态"
echo "=========================================="
echo ""
echo "DSH 插件位置:"
echo "  ~/.dsh/profiles/web/node_modules/bi-dashboards-host/"
echo ""
echo "配置文件:"
cat ~/.dsh/profiles/web/node_modules/bi-dashboards-host/config.json
echo ""
echo "=========================================="
echo " 下一步"
echo "=========================================="
echo ""
echo "1. 重启 DSH"
echo "2. 浏览器 Ctrl+F5 刷新"
echo "3. 进入设置页查看「无人超市」分区"
echo "4. 进入「我的看板」验证功能"
echo ""
echo "=========================================="
