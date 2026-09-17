-- 中文视图:月度预测 + 预测准确率(供 Power BI / 看板 / AI 查询直接用中文名)
-- 底层英文表不变,Forecast 管道照常写入;视图 CREATE OR REPLACE,可重复执行
-- 2026-09-09 首版(视图落在 public schema)
-- 2026-09-17 审计 B24 修订:按 sql/README.md 命名空间约定,视图统一落在 bi_plugin schema;
--              底层表仍读 public.forecast_*;public 旧视图的清理见文末说明(需人工确认引用后再执行)

-- 命名空间约定:插件新建对象一律带 bi_plugin 前缀(README《命名空间约定》)
CREATE SCHEMA IF NOT EXISTS bi_plugin;

CREATE OR REPLACE VIEW bi_plugin."月度销量预测" AS
SELECT
    product_id            AS "商品编号",
    store_id              AS "门店编号",
    month                 AS "月份",
    predicted_qty         AS "预测销量",
    predicted_lower       AS "预测下界",
    predicted_upper       AS "预测上界",
    model_name            AS "模型名称",
    model_generation_date AS "模型生成时间",
    created_at            AS "创建时间"
FROM public.forecast_monthly;

CREATE OR REPLACE VIEW bi_plugin."预测准确率" AS
SELECT
    product_id     AS "商品编号",
    store_id       AS "门店编号",
    eval_date      AS "评估日期",
    period_start   AS "评估窗口起",
    period_end     AS "评估窗口止",
    evaluated_days AS "评估天数",
    actual_qty     AS "实际销量",
    predicted_qty  AS "预测销量",
    abs_error      AS "绝对误差",
    accuracy_pct   AS "准确率",
    model_name     AS "模型名称",
    created_at     AS "创建时间"
FROM public.forecast_accuracy;

-- ---- 旧 public 视图清理说明(人工执行,勿盲目跑) ----
-- 2026-09-09 首版曾在 public schema 建过同名视图,现由上方 bi_plugin 版本替代。
-- 访问方式变化:此后需带 schema 前缀引用,如 SELECT * FROM bi_plugin."月度销量预测";
-- (search_path 默认只含 public,裸中文名不再命中旧视图。)
-- 确认 Power BI / 看板 / 脚本文本里已无裸名引用后,执行:
--   DROP VIEW IF EXISTS public."月度销量预测";
--   DROP VIEW IF EXISTS public."预测准确率";
-- 核对当前视图落位:
--   SELECT schemaname, viewname FROM pg_views WHERE viewname IN ('月度销量预测','预测准确率');
