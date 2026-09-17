#!/usr/bin/env python3
"""修复 convert_host.py 产生的 biApi handler 闭合多余括号。

规则（锚点式，不依赖行号）：
- 多行 handler：`  biApi['bi.X'] = async (args) => {` 开、独立行 `  })` 收 —— 该收尾行去掉末尾 `)`
- 单行 handler：以 `  biApi['bi.` 开且以 `})` 结尾的行 —— 去掉行末一个 `)`
- defineTool（modifyTool 等）的 `  })` 收尾在 biApi 块之外，不受影响

目标文件不再硬编码个人目录：argv[1] 或 $BI_HOST_INDEX_JS，
默认 ~/.dsh/profiles/web/node_modules/bi-dashboards-host/lib/index.js。
写入：先备份 .bak → 临时文件 → os.replace 原子替换。
退出码：0 成功；1 读/写失败。
"""
import os
import re
import sys

DEFAULT_PATH = os.path.expanduser(
    "~/.dsh/profiles/web/node_modules/bi-dashboards-host/lib/index.js")


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("BI_HOST_INDEX_JS") or DEFAULT_PATH
    try:
        with open(path, encoding="utf-8") as f:
            src = f.read()
    except OSError as e:
        print(f'[fix_host2] 错误：无法读取 {path}: {e}', file=sys.stderr)
        return 1

    out = []
    in_handler = False
    multi_fixed = 0
    single_fixed = 0
    for line in src.split('\n'):
        if re.fullmatch(r"  biApi\['bi\.[a-zA-Z]+'\] = async \(args\) => \{", line):
            in_handler = True
            out.append(line)
            continue
        if in_handler and line == '  })':
            out.append('  }')
            in_handler = False
            multi_fixed += 1
            continue
        stripped = line.rstrip()
        if not in_handler and stripped.startswith("  biApi['bi.") and stripped.endswith('})'):
            out.append(stripped[:-1])
            single_fixed += 1
            continue
        out.append(line)

    result = '\n'.join(out)
    try:
        if result != src:
            with open(path + ".bak", "w", encoding="utf-8") as f:
                f.write(src)
        tmp = path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            f.write(result)
        os.replace(tmp, path)
    except OSError as e:
        print(f'[fix_host2] 错误：写入 {path} 失败: {e}', file=sys.stderr)
        try:
            os.remove(path + ".tmp")
        except OSError:
            pass
        return 1
    print('[fix_host2]', path, '| multi fixed:', multi_fixed, '| single fixed:', single_fixed)
    return 0


if __name__ == "__main__":
    sys.exit(main())
