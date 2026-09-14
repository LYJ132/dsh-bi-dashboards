#!/bin/bash
# 一键启动 Docker Desktop 安装
echo "正在启动 Docker Desktop 安装程序..."
echo ""
echo "如果弹出 UAC 权限对话框，请点击'是'"
echo ""
echo "安装选项：请勾选 'Use WSL 2 instead of Hyper-V'"
echo ""
echo "=========================================="
exec "/tmp/DockerDesktopComplete.exe"
