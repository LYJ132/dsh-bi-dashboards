# create-desktop-shortcuts.ps1 — 在 Windows 桌面一键创建 DSH 启动/停止快捷方式
#
# 调用方式（在 WSL 内执行即可，路径经 wslpath -w 转换，对任何安装位置都成立）：
#   powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$(wslpath -w ~/bi-plugin/static/scripts/win/create-desktop-shortcuts.ps1)"
#
# 说明：
# - DeepSeek Harness PWA（D:\Tabbit Browser\Application\chrome_proxy.exe）是可选增强：
#   存在则用其图标并以 App 模式打开 http://127.0.0.1:3080；不存在则 .bat 内自动回退系统默认浏览器。
# - 两个 .bat 通过 `wsl --` 调用 WSL **默认发行版**，请确保默认发行版就是装有 DSH 的那个
#   （`wsl -l -v` 查看，`wsl --set-default <名称>` 设置）。
# - 幂等：桌面已存在同名 .bat 副本与 .lnk 时直接覆盖，可重复执行。

$ErrorActionPreference = 'Stop'

# 1. 定位脚本自身目录，确认两个 .bat 存在
$scriptDir  = $PSScriptRoot
$launcherBat = Join-Path $scriptDir 'DeepSeek DSH Web.bat'
$stopBat     = Join-Path $scriptDir 'Stop DSH.bat'
if (-not (Test-Path -LiteralPath $launcherBat)) { throw "[DSH] Not found: $launcherBat" }
if (-not (Test-Path -LiteralPath $stopBat))     { throw "[DSH] Not found: $stopBat" }

# 2. 复制两个 .bat 到用户桌面（GetFolderPath 自动适配自定义桌面，如 D:\Desktop）
$desktop = [Environment]::GetFolderPath('Desktop')
Copy-Item -LiteralPath $launcherBat -Destination (Join-Path $desktop 'DeepSeek DSH Web.bat') -Force
Copy-Item -LiteralPath $stopBat     -Destination (Join-Path $desktop 'Stop DSH.bat') -Force

# 3. 用 WScript.Shell COM 创建两个 .lnk（已存在则覆盖）
$shell = New-Object -ComObject WScript.Shell

# 3a. DSH.lnk -> 桌面上的 DeepSeek DSH Web.bat
$lnk = $shell.CreateShortcut((Join-Path $desktop 'DSH.lnk'))
$lnk.TargetPath       = Join-Path $desktop 'DeepSeek DSH Web.bat'
$lnk.WorkingDirectory = $desktop
$lnk.Description      = 'Start DSH Web at http://127.0.0.1:3080'
$harnessExe = 'D:\Tabbit Browser\Application\chrome_proxy.exe'
if (Test-Path -LiteralPath $harnessExe) {
    $lnk.IconLocation = "$harnessExe,0"                            # Harness PWA 图标（可选增强）
} else {
    $lnk.IconLocation = 'C:\Windows\System32\shell32.dll,220'      # 通用图标兜底
}
$lnk.Save()

# 3b. Stop DSH.lnk -> 桌面上的 Stop DSH.bat
$lnk = $shell.CreateShortcut((Join-Path $desktop 'Stop DSH.lnk'))
$lnk.TargetPath       = Join-Path $desktop 'Stop DSH.bat'
$lnk.WorkingDirectory = $desktop
$lnk.Description      = 'Stop DSH Web service (port 3080)'
$lnk.IconLocation     = 'C:\Windows\System32\shell32.dll,27'
$lnk.Save()

# 4. 输出创建结果
Write-Host "[DSH] Desktop: $desktop"
Write-Host "[DSH] Created shortcuts (existing ones overwritten):"
Write-Host "[DSH]   DSH.lnk      -> DeepSeek DSH Web.bat  (start, opens http://127.0.0.1:3080)"
Write-Host "[DSH]   Stop DSH.lnk -> Stop DSH.bat          (stop)"
