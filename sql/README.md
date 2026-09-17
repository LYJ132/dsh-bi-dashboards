# bi-plugin/sql —— PG DDL/迁移目录

插件相关的 PostgreSQL 表结构定义（DDL）与迁移脚本**统一放在本目录**，纳入 git 管理。

## 命名空间约定

- 所有插件新建的表/视图/物化视图一律使用独立 schema：**`bi_plugin`**
- 建表必须带 schema 前缀，例如：`bi_plugin.xxx`（禁止裸表名落入 public）
- 脚本首行自带 `CREATE SCHEMA IF NOT EXISTS bi_plugin`，可重复执行

## 文件清单

| 文件 | 内容 |
| --- | --- |
| `views_forecast_zh.sql` | 中文视图 `bi_plugin."月度销量预测"`、`bi_plugin."预测准确率"`（读 public 底层英文表） |

> **访问提示**：视图落在 `bi_plugin` schema 后，引用需带前缀（`SELECT * FROM bi_plugin."月度销量预测"`）。
> search_path 默认只含 public，裸中文名不会命中。

## 待清理项

- `public."月度销量预测"` / `public."预测准确率"` —— `views_forecast_zh.sql` 2026-09-09 首版遗留的旧视图，
  已由 bi_plugin 版本替代。**确认无裸名引用后**按该文件文末注释里的 `DROP VIEW IF EXISTS` 语句人工清理
  （清理语句有意注释掉、不随脚本自动执行，避免打断存量 Power BI 报表）。

## 例外登记

- `public.forecast_results` —— 历史既有结果表，**不迁移**，继续留在 public schema（预测体系属 Power BI 侧、非本插件产物，见 [`../rules/CHART.md`](../rules/CHART.md) 第 5 节索引表「预测数据」行）
- `public.forecast_monthly` / `public.forecast_accuracy` —— Forecast 管道写入的底层英文表，同样保留 public；`views_forecast_zh.sql` 仅在其上建 bi_plugin 视图
- 今后插件新表一律建在 `bi_plugin` schema，不再新增 public 例外
