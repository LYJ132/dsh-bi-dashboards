#!/usr/bin/env python3
"""启动前保险：确保 bi-dashboards-host 的 inject 声明包含 'tools'。

背景：v20-host.js / 部署文件曾多次被外部还原（丢 'tools' 导致 DSH 启动失败
报 cannot get property "tools" without inject）。此脚本幂等，可重复执行。
"""
import sys

PATHS = [
    '/home/szulg/Project/.dsh/v20-host.js',
    '/home/szulg/.dsh/profiles/web/node_modules/bi-dashboards-host/lib/index.js',
]
OLD = "inject: ['subprocess', 'systemPrompt', 'webServer', 'fs']"
NEW = "inject: ['subprocess', 'systemPrompt', 'webServer', 'fs', 'tools']"

fixed = 0
for path in PATHS:
    try:
        with open(path, encoding='utf-8') as f:
            src = f.read()
        if NEW in src:
            continue
        if OLD in src:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(src.replace(OLD, NEW))
            print(f'[ensure_host_inject] fixed: {path}')
            fixed += 1
        else:
            print(f'[ensure_host_inject] WARN 未匹配到已知 inject 模式: {path}')
    except FileNotFoundError:
        print(f'[ensure_host_inject] 跳过（不存在）: {path}')
sys.exit(0)
