#!/usr/bin/env python3
"""启动前保险：确保 bi-dashboards-host 的 inject 声明包含 'tools'。

背景：v20-host.js / 部署文件曾多次被外部还原（丢 'tools' 导致 DSH 启动失败
报 cannot get property "tools" without inject）。此脚本幂等，可重复执行。

目标路径不再硬编码个人目录：
- 项目根（放 .dsh/v20-host.js）：argv[1] 或 $DSH_PROJECT_DIR，默认 $HOME/Project
- profile 根（放已安装 host 包）：$DSH_PROFILE_DIR，默认 ~/.dsh/profiles/web

写文件一律：先备份 .bak → 临时文件 → os.replace 原子替换。
退出码：0 成功（含"无需修复"）；1 出现写入错误。
"""
import os
import sys

OLD = "inject: ['subprocess', 'systemPrompt', 'webServer', 'fs']"
NEW = "inject: ['subprocess', 'systemPrompt', 'webServer', 'fs', 'tools']"


def target_paths():
    project = (sys.argv[1] if len(sys.argv) > 1
               else os.environ.get("DSH_PROJECT_DIR")
               or os.path.expanduser("~/Project"))
    profile = os.environ.get("DSH_PROFILE_DIR") or os.path.expanduser("~/.dsh/profiles/web")
    return [
        os.path.join(project, ".dsh", "v20-host.js"),
        os.path.join(profile, "node_modules", "bi-dashboards-host", "lib", "index.js"),
    ]


def atomic_write(path, content):
    """temp 文件 + os.replace 原子写入；覆盖前保留 .bak。"""
    try:
        if os.path.isfile(path):
            with open(path, encoding="utf-8") as f:
                old = f.read()
            if old != content:
                with open(path + ".bak", "w", encoding="utf-8") as f:
                    f.write(old)
        tmp = path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            f.write(content)
        os.replace(tmp, path)
    except OSError as e:
        print(f'[ensure_host_inject] 错误：写入 {path} 失败: {e}', file=sys.stderr)
        try:
            os.remove(path + ".tmp")
        except OSError:
            pass
        raise


def main():
    fixed = 0
    errored = False
    for path in target_paths():
        try:
            with open(path, encoding="utf-8") as f:
                src = f.read()
        except FileNotFoundError:
            print(f'[ensure_host_inject] 跳过（不存在）: {path}')
            continue
        except OSError as e:
            print(f'[ensure_host_inject] 错误：读取 {path} 失败: {e}', file=sys.stderr)
            errored = True
            continue
        if NEW in src:
            continue
        if OLD in src:
            try:
                atomic_write(path, src.replace(OLD, NEW))
            except OSError:
                errored = True
                continue
            print(f'[ensure_host_inject] fixed: {path}')
            fixed += 1
        else:
            print(f'[ensure_host_inject] WARN 未匹配到已知 inject 模式: {path}')
    print(f'[ensure_host_inject] 完成：修复 {fixed} 处')
    return 1 if errored else 0


if __name__ == "__main__":
    sys.exit(main())
