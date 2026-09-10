# Docker Desktop 安装及镜像配置脚本
# 以管理员权限运行

Write-Host "=== Docker Desktop 安装及镜像配置 ===" -ForegroundColor Cyan

# 1. 运行安装
$installerPath = "C:\Users\LIN YU JIAN\PROGRAMS\bi-plugin\DockerDesktopInstaller.exe"
if (-not (Test-Path $installerPath)) {
    Write-Host "错误：找不到安装程序 $installerPath" -ForegroundColor Red
    exit 1
}

Write-Host "正在安装 Docker Desktop..." -ForegroundColor Yellow
Start-Process -FilePath $installerPath -Wait

# 2. 配置镜像加速器
$dockerConfigDir = "C:\ProgramData\docker\config"
$daemonJsonPath = Join-Path $dockerConfigDir "daemon.json"

if (-not (Test-Path $dockerConfigDir)) {
    New-Item -ItemType Directory -Path $dockerConfigDir -Force | Out-Null
}

$mirrorConfig = @{
    "registry-mirrors" = @(
        "https://docker.mirrors.ustc.edu.cn",
        "https://hub-mirror.c.163.com",
        "https://mirror.baidubce.com"
    )
    "insecure-registries" = @()
    "max-concurrent-downloads" = 10
    "log-driver" = "json-file"
    "log-opts" = @{
        "max-size" = "10m"
        "max-file" = "3"
    }
} | ConvertTo-Json -Depth 3

Write-Host "写入镜像配置到 $daemonJsonPath" -ForegroundColor Yellow
$mirrorConfig | Out-File -FilePath $daemonJsonPath -Encoding utf8

Write-Host ""
Write-Host "=== 安装完成 ===" -ForegroundColor Green
Write-Host "请重启 Docker Desktop 使配置生效" -ForegroundColor Yellow
Write-Host ""
Write-Host "验证配置：" -ForegroundColor Cyan
Write-Host "  docker info | grep 'Registry Mirrors'" -ForegroundColor Gray
