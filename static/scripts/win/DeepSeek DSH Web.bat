@echo off
setlocal EnableDelayedExpansion
title DeepSeek DSH Web Launcher

set "PORT=3080"
set "URL=http://127.0.0.1:%PORT%"
set "LOCK=%TEMP%\dsh-web.lock"
set "MAXWAIT=150"

set "HARNESS_EXE=D:\Tabbit Browser\Application\chrome_proxy.exe"
set "HARNESS_ARGS=--profile-directory=Default --app-id=hgiemfgfjhalibdoboikeiepnnjapnpc"

echo [DSH] ========================================
echo [DSH] DeepSeek DSH Web Launcher
echo [DSH] Target: %URL%
echo [DSH] Open in: DeepSeek Harness (Tabbit PWA)
echo [DSH] To STOP later: use the "Stop DSH" desktop shortcut (or close the WSL window)
echo [DSH] ========================================

call :porttest
if %ERRORLEVEL%==0 goto :open_browser

echo [DSH] Service not running, preparing to start in WSL...

where wsl >nul 2>&1
if not %ERRORLEVEL%==0 goto :err_nowsl

if exist "%LOCK%" goto :have_lock
goto :fresh_start

:have_lock
for /f %%a in ('powershell -NoProfile -Command "[int]((Get-Date)-(Get-Item '%LOCK%').LastWriteTime).TotalSeconds"') do set "AGE=%%a"
if !AGE! GTR 200 goto :clear_stale_lock
echo [DSH] Another start is in progress, waiting for port...
goto :waitloop

:clear_stale_lock
del /f /q "%LOCK%" >nul 2>&1

:fresh_start
echo locked > "%LOCK%"
echo [DSH] Starting in new WSL window: dsh --profile web
echo [DSH] (fallback to npx -y @deepseek-ai/dsh web if dsh not found)
start "DSH Web (WSL)" wsl -- bash -lc "command -v dsh >/dev/null 2>&1 && dsh --profile web || npx -y @deepseek-ai/dsh web"

:waitloop
call :porttest
if %ERRORLEVEL%==0 goto :open_browser
set /a TRIES+=1
if %TRIES% GEQ %MAXWAIT% goto :err_timeout
timeout /t 1 >nul
goto :waitloop

:open_browser
if exist "%LOCK%" del /f /q "%LOCK%" >nul 2>&1
echo [DSH] Service ready, opening in DeepSeek Harness app...
if exist "%HARNESS_EXE%" goto :open_harness
echo [DSH] Harness app not found, falling back to default browser...
start "" "%URL%"
goto :done

:open_harness
start "DSH Web" "%HARNESS_EXE%" %HARNESS_ARGS% "%URL%"
goto :done

:err_nowsl
echo [DSH] ERROR: 'wsl' command not found.
echo [DSH] Please install WSL first. Run "wsl --install" in PowerShell as admin.
pause
goto :done

:err_timeout
if exist "%LOCK%" del /f /q "%LOCK%" >nul 2>&1
echo [DSH] ERROR: Timeout waiting for service %MAXWAIT%s.
echo [DSH] Check the WSL window for errors. Make sure node and npm are installed.
pause
goto :done

:done
exit /b 0

:porttest
powershell -NoProfile -Command "try{$c=New-Object System.Net.Sockets.TcpClient;$c.Connect('127.0.0.1',%PORT%);$c.Close();exit 0}catch{exit 1}"
exit /b %ERRORLEVEL%
