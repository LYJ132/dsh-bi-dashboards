# bi-plugin/sql —— PG DDL/迁移目录

插件相关的 PostgreSQL 表结构定义（DDL）与迁移脚本**统一放在本目录**，纳入 git 管理。

## 命名空间约定

- 所有插件新建的表/视图/物化视图一律使用独立 schema：**`bi_plugin`**
- 建表必须带 schema 前缀，例如：`bi_plugin.xxx`（禁止裸表名落入 public）
- schema 已创建：`CREATE SCHEMA IF NOT EXISTS bi_plugin`

## 例外登记

- `public.forecast_results` —— 历史既有结果表，**不迁移**，继续留在 public schema（详见 [`../rules/CONSTRAINTS.md`](../rules/CONSTRAINTS.md)）
- 今后插件新表一律建在 `bi_plugin` schema，不再新增 public 例外
