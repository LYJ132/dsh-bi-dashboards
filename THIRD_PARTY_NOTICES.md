# THIRD_PARTY_NOTICES — 第三方资产声明

本仓库分发/捆绑的第三方资产清单。新增任何 vendor 文件时**必须**在此登记（版本、许可证、来源、哈希）。

## ECharts

| 项 | 值 |
|---|---|
| 组件 | Apache ECharts（浏览器图表库；产物内捆绑其子项目 zrender） |
| 版本 | **5.5.1**（见产物文件头部 `version="5.5.1"`） |
| 许可证 | Apache License, Version 2.0（SPDX: `Apache-2.0`）；LICENSE 全文见 <https://www.apache.org/licenses/LICENSE-2.0>，另见上游仓库 <https://github.com/apache/echarts/blob/master/LICENSE> |
| 版权 | The Apache Software Foundation 及 contributors；zrender 同为 Apache-2.0（<https://github.com/ecomfe/zrender>） |
| 来源 | 官方 npm 包 `echarts@5.5.1` 的 `dist/echarts.min.js`（等价于 CDN `echarts@5.5.1/dist/echarts.min.js`），未经修改直接落盘 |
| 仓库内位置 | `static/vendor/echarts.min.js`（安装/首启时播种到 `~/.dsh/bi-dashboards/vendor/echarts.min.js`，经 `/bi/vendor/echarts.min.js` 提供） |
| SHA-256 | `e84270bd0cd5bdf60fefc26d00c2a391cb2e81f4d26a7a9ee16185a54773a3cf` |

升级 ECharts 时的操作：替换 `static/vendor/echarts.min.js` → 重新计算 `sha256sum` 并更新本表 → 目标机需同步替换 `~/.dsh/bi-dashboards/vendor/echarts.min.js`（或删除该目录重新播种）。

## 运行时依赖（另行声明）

Python（`data-service/requirements.txt`）与 Node 依赖（`package.json`）按各自包许可证使用，未作为源码/产物捆绑进本仓库，不在本清单逐条登记。
