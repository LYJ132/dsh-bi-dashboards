#!/usr/bin/env python3
"""修复 convert_host.py 产生的 biApi handler 闭合多余括号。

规则（锚点式，不依赖行号）：
- 多行 handler：`  biApi['bi.X'] = async (args) => {` 开、独立行 `  })` 收 —— 该收尾行去掉末尾 `)`
- 单行 handler：以 `  biApi['bi.` 开且以 `})` 结尾的行 —— 去掉行末一个 `)`
- defineTool（modifyTool 等）的 `  })` 收尾在 biApi 块之外，不受影响
"""
import re

path = '/home/szulg/.dsh/profiles/web/node_modules/bi-dashboards-host/lib/index.js'
src = open(path, encoding='utf-8').read()

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

open(path, 'w', encoding='utf-8').write('\n'.join(out))
print('multi fixed:', multi_fixed, '| single fixed:', single_fixed)
