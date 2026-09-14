-- 中文视图:月度预测 + 预测准确率(供 Power BI / 看板 / AI 查询直接用中文名)
-- 底层英文表不变,Forecast 管道照常写入;视图 CREATE OR REPLACE,可重复执行
-- 2026-09-09

CREATE OR REPLACE VIEW "月度销量预测" AS
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
FROM forecast_monthly;

CREATE OR REPLACE VIEW "预测准确率" AS
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
FROM forecast_accuracy;
