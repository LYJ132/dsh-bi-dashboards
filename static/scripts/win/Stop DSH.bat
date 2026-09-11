@echo off
setlocal EnableDelayedExpansion
title Stop DSH Web Service
set "PORT=3080"

echo [DSH] ========================================
echo [DSH] Stop DSH Web Service
echo [DSH] Target port: %PORT%
echo [DSH] ========================================

echo [DSH] Sending stop signal to dsh web inside WSL...
wsl -- bash -lc "pkill -f 'ds[h] --profile web' 2>/dev/null; pkill -f 'ds[h]' 2>/dev/null; echo stop-signal-sent"

echo [DSH] Waiting for port to free...
timeout /t 2 >nul

echo [DSH] Verifying port %PORT% ...
powershell -NoProfile -Command "try{$c=New-Object System.Net.Sockets.TcpClient;$c.Connect('127.0.0.1',%PORT%);$c.Close();Write-Host 'PORT STILL OPEN - service may still be running'}catch{Write-Host 'PORT FREE - service stopped'}"

echo [DSH] Done.
pause
