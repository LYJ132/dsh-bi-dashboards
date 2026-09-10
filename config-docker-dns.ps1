# 配置 Docker Desktop DNS 和镜像加速器
# 以管理员权限运行

Write-Host "=== 配置 Docker Desktop DNS 和镜像 ===" -ForegroundColor Cyan

# 获取 Docker Desktop 设置文件路径
$settingsPath = "$env:APPDATA\Docker\settings-store.json"

# 读取现有设置
if (Test-Path $settingsPath) {
    $settings = Get-Content $settingsPath -Raw | ConvertFrom-Json
    Write-Host "现有设置已加载" -ForegroundColor Green
} else {
    $settings = @{}
    Write-Host "创建新设置文件" -ForegroundColor Yellow
}

# 配置镜像加速器
$mirrorConfig = @{
    registryMirrors = @(
        "https://docker.mirrors.ustc.edu.cn",
        "https://hub-mirror.c.163.com",
        "https://mirror.baidubce.com"
    )
    dns = @(
        "223.5.5.5",
        "114.114.114.114",
        "8.8.8.8"
    )
}

Write-Host "镜像加速器: $([string]::Join(', ', $mirrorConfig.registryMirrors))" -ForegroundColor Green
Write-Host "DNS 服务器: $([string]::Join(', ', $mirrorConfig.dns))" -ForegroundColor Green

Write-Host ""
Write-Host "请手动在 Docker Desktop GUI 中配置：" -ForegroundColor Yellow
Write-Host "1. 右键系统托盘鲸鱼图标 → Settings → Docker Engine"
Write-Host "2. 添加以下配置："
Write-Host ""
Write-Host '{
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
}' -ForegroundColor Gray
Write-Host ""
Write-Host "3. 点击 Apply & Restart" -ForegroundColor Yellow
