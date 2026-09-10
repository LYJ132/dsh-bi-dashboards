#!/bin/bash
cd "$(dirname "$0")"
pkill -f "server.py" 2>/dev/null
pkill -f "http.server" 2>/dev/null
nohup python3 server.py 8080 > server.log 2>&1 &
echo "Dashboard started on http://localhost:8080 (pid $!)"
