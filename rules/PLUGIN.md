# PLUGIN.md —— 插件迭代经验记录

> 本文件 = **插件经验账本 + 创造模式契约速查**（图表模式规范见 [CHART.md](./CHART.md)，迭代记忆见 [CHART-ITERATION.md](./CHART-ITERATION.md)）。
> 记录规则：凡是**解决耗时较长的问题**，解决后立即在此追加一条（不等阈值）；条目累积过多时按内容重叠度判断执行一次整理（合并精简进本文件契约章节）。无计数脚本，靠格式与条目序号管理。

## 条目格式

`### E<序号>：<标题>`，正文四要素：**症状 / 根因 / 修复 / 验证**，末尾可附「教训」。

## 条目

### E1：保存/创建副本 TDZ 崩溃（2026-09-04）

- **症状**：预览卡点「保存」后图表不进我的看板；「全部保存」显示成功但数据未写入
- **根因**：host saveChartFromPreview/duplicateChart 中 `const id = ... + idx` 下一行以 `(` 开头且缺分号——ASI 失效两行并成一条语句，`idx(...)` 被当函数调用，参数对象 `id: id` 在自身初始化前求值 → ReferenceError，函数提前返回
- **修复**：重构为显式语句（rec 对象 + if/else unshift/push）；「全部保存」改为如实统计成败
- **验证**：单测真实链路（id 形如 -p0/-c）+ ASI 全 bundle 扫描零残留
- **教训**：minified 风格 bundle 里 `const x = ...\n(...)` 是隐形地雷；「按钮显示成功」≠「写入成功」，保存链路验证必须落到 store 数据

### E2：筛选下拉值稀少 + 部分图表不响应筛选（2026-09-05）

- **症状**：时间字段下拉只有几个日期（实际 316 个）；应用时间筛选后只有表格/KPI 响应，柱/线/饼图不动
- **根因**：三处独立缺陷叠加 —— ① host getFilterValues 只取表中任意 1000 行去重（无排序无 DISTINCT 下推，1000 行只覆盖 7 天）；② ChartCell 的 ECharts 渲染 effect 有 `el.childElementCount === 0` 守卫，每张 bar/line/pie 图在 DOM 节点生命周期内只渲染一次，之后 setChart 的新数据被静默跳过（表格/KPI 每次重建 DOM 所以正常），哪张图「碰巧」已渲染决定它是否响应；③ 介于条件只填一边时 value 含空串，8600 整查询 400，client `.catch(()=>{})` 静默吞错
- **修复**：① getFilterValues 改 limit 200000 全列拉取后 JS 去重（与 renderChartDef 同模式）；② 渲染 effect 改 getInstanceByDom → setOption(opt, true)（notMerge），无实例才 init；③ FilterCard build() 介于单边时降级为 >= / <= 单边条件
- **验证**：8600 直查证明 1000 行采样只得 7 个日期（全表 316）；单边 BETWEEN 复现 HTTP 400；GUI 实测筛选 order_date=2025-07-03 后日销售额趋势 314→1 点、KPI=969.5（=单日实付总额）；介于只填起始值应用后 KPI=450027.2（与 8600 离线参考值一致）
- **教训**：「只渲染一次」类守卫会把首次渲染后的所有数据更新静默丢弃，数据到达（setChart）与渲染必须同生命周期；空 catch 让上游 400 完全不可见，筛选类交互失败必须可见

### E3：安装脚本生成的 config.json 静默失效（2026-09-10）

- **症状**：异机按 INSTALL.md 装完后 echarts 404、dataApi 落回 localhost；手工改包根 `config.json` 无效
- **根因**：index.js 的 `PKG_DIR = new URL('.', import.meta.url)` 指向 **lib/**（import.meta.url 基于 lib/index.js），config.json 实际读取 `lib/config.json`，与安装脚本写入的**包根** config.json 错配；且 vendorFile/storeFile 默认值按 `lib/static/...` 拼接而文件在包根——三层路径全部错位，配置静默落回 localhost 默认值
- **修复**：PKG_DIR 改 `new URL('../', ...)` 指向包根；config.json 的 vendorFile/storeFile/crawlConfigFile 支持相对路径（cfgReady 按包根解析、setConfig 落盘时转回相对）；安装脚本生成相对路径配置 + 旧 lib/config.json 自动迁移归档为 `config.json.migrated`；设置页新增「服务地址」卡片（枚举本机网卡 IP 供复制/填入、testConnection 探测、setConfig 热更新 CFG 免重启）
- **验证**：node --check ×2、RPC 方法对齐（client 调用 ⊆ host biApi）、ASI 扫描零残留、curl 全链路（echarts 200 / getLocalAddresses 正确枚举与 isDataHost 判定 / testConnection 24 表 / setConfig 落盘保持相对路径）、迁移逻辑实测
- **教训**：「bundle 即源码」的静态插件里，包内相对定位必须显式核对 import.meta.url 的实际解析位置；安装脚本与运行时读取路径要有一致性测试，配置写错位置比没有配置更难排查（表现为"改了没反应"）；配置文件里绝不应出现机器相关绝对路径，相对化是跨机即用的前提

### E4：同步环冻结 + 同步停摆两天（2026-09-12）

- **症状**：看板顶部倒计时环卡死 00:00；云平台增量同步自 9/10 晚起 2 天未跑；状态条离线（8080 死于机器重启）
- **根因**：三层叠加 —— ① 文件夹重组后爬虫容器 bind mount 失联（内核挂载仍指旧目录 inode，容器里的 /opt/Crawler 只剩 logs/，controller.py「消失」→ 退出码 2 崩溃循环，日志在容器侧看不到）；② 爬虫镜像缺 `holidays` 库（代码挂载是新的、镜像旧，修好挂载后云同步仍 FATAL）；③ 机器重启后 docker 5432 转发失效（宿主机连 localhost:5432 被断，server.py 的 /run、/runfeishu 宿主触发路径全挂）
- **修复**：`docker restart crawler`（挂载按路径重绑）+ 容器内 `pip install holidays` + `docker restart biz-postgres`（5432 转发重建）；web/start.sh 改 PID 文件管理 + @reboot crontab 自启（防重启后 8080 再离线）
- **验证**：sync_meta.last_incr_sync 更新至当日、status.json success:true 28.6s、getStatus next_run_at 每轮刷新、宿主机直连 localhost:5432 OK、8600 200
- **教训**：宿主机目录移动/重建后，引用它的容器 bind mount 不会自动跟随——`docker restart` 该容器即重绑；「调度没跑」先看容器内 controller 自身日志（/opt/Crawler/logs/controller.log），supervisor 的退出码循环会把真实报错吞在容器里；机器重启后必查：8080（crontab 已自启）、docker 容器 Up 时长是否与 boot 时间匹配

### E5：双机分叉副本合并为一份通用插件包（2026-09-14）

- **症状**：数据主机与目标机两份副本各自迭代分叉（TEMP 副本多出预测数据面/停摆检测/PID 启动脚本，主副本多出配置热更/服务地址卡片/离线探测），无法互收
- **根因**：早期按"机器角色"分两套包，数据主机一套、目标机一套；角色差异其实只由 config.json 的 dataApi/statusUrl 指向决定，代码层本无差异
- **修复**：合并为 ONE 通用插件包——同一份代码部署在任意机器，角色纯由 config.json 决定（数据主机把 dataApi 填本机地址，目标机填数据主机地址）；按文件逐一移植 TEMP 独有改动（query.py 预测白名单、sql/views_forecast_zh.sql、NAME_MAP_ZH 预测表/字段、getStatus 停摆语义、start.sh PID 管理、PLUGIN.md 事故条目），主副本版本为基底不回退
- **验证**：node --check ×2、py_compile query.py、双方独有功能清单逐项核对无丢失、无运行时垃圾（server.pid/*.bak/data/*.venv）入库
- **教训**：「角色」是配置不是代码；一旦发现按机器分叉代码，先收敛为一份通用实现 + 配置驱动，杜绝第二次分叉

### E6：pnpm link 安装后 DSH 启动失败——外部依赖未打包未声明（2026-09-14）

- **症状**：`pnpm link` 装入 dsh-bi-dashboards 后 DSH 启动即崩：`failed to apply loader entry include (cordis:include): failed to import loader entry dsh-bi-dashboards ... Cannot find package '@deepseek-ai/dsh-tools' imported from .../PROGRAMS/bi-plugin/lib/index.js`（ERR_MODULE_NOT_FOUND，boot 直接 Exit 1；早期观测到的 dsh-notification client.js 报错是同一根因的连带表象）
- **根因**：lib/index.js 顶层 `import { defineTool } from '@deepseek-ai/dsh-tools'` 是**外部依赖**，但 package.json 未声明 dependencies、仓库无 node_modules；cordis-plugin-loader 用普通 ESM 解析导入插件入口（对 @deepseek-ai/* 无任何特殊回退），Node 从包真实路径逐级上溯找不到该包 → Entry.init 抛错 → 整个 include 应用失败、boot 中止。dsh-notification 等官方插件能跑，是因为它们的 lib 是 esbuild **全量打包产物**（零外部 import）；symlink 安装（pnpm link）进一步使 Node 沿 realpath（仓库目录）解析，profile node_modules 完全不参与，即使 profile 里有依赖也救不了
- **修复**：仓库根（gitignored 的 node_modules/）放入 @deepseek-ai/dsh-tools 及其依赖闭包（cordis/cosmokit/schemastery/dsh-invariants/dsh-scope/dsh-llm/dsh-session/dsh-agent/dsh-code-runtime/dsh-system-prompt/dsh-user-approval，均 symlink 至 dsh 应用自带的同版本包，保证运行时与宿主一致）；重启后 DSH 正常启动
- **验证**：boot 日志无 error/fail；`[bi] Phase5 Host 已加载 (static v1)`；curl `/plugins/dsh-notification/client.js?rev=db1e9ee79535`、`/plugins/dsh-notification/client.js`、`/plugins/dsh-bi-dashboards/client.js` 全部 200；`dsh plugin --profile web list` 两包均在
- **教训**：本包走「源码直发」路线时，lib 内任何外部 import 必须二选一：① 像 dsh-notification 一样 esbuild 全量打包进 lib（发布形态首选）；② package.json 声明 dependencies 且保证装到包的解析上溯路径内。symlink/link 安装下 Node 按 realpath 解析，profile node_modules 不在链上；开发期可用仓库根 node_modules 兜底（与 dsh 应用版本严格一致）。「Packages: -3」pnpm 裁剪与 loader 缓存均非本因

### E7：join 泛化重构险些静默改变旧 payload——身份透传 + 双跑字节对拍兜底（2026-09-20）

- **症状**：bi-capability-v2 把 join 从单对象泛化为「单对象或链式数组 + join.type」时，首轮回归发现旧定义（维表列筛选，如 cate_code='CATE_A'）的 /api/query payload 不再剔除维表筛选列（真实数据服务会 400），且链式合并后行上缺后级关联键（明细→商品→品类，商品主档未带出 cate_code，中类分组全空）
- **根因**：两处泛化遗漏——① 旧实现把「列不在主表」的筛选从 payload 拆出（splitDim），新代码只做了分配给某一级、忘了从 payload 移除；② 链式 join 中第 i 级维表查询只取本级被引用列，没有把「后级 left_key 落在本级维表上的列」一并取回，合并链在中间断键
- **修复**：payload.filters 按对象身份剔除已分配给维表层的筛选（resolveFilters 对静态值返回原对象，身份稳定，旧 payload 逐字节不变）；每级维表查询附加 refDim_i ∪ {后级 left_key ∈ dimSet_i}；用 mock 数据服务（8610 端口）双跑对拍——master lib 与新 lib 各跑同一组 6 个旧式定义，全部 /api/query payload + render 结果 cmp 字节相等
- **验证**：18/18 功能检查（heatmap hour×weekday、可注入时钟的相对时间窗口平移、两级链中文名分组、left/inner 语义）+ 字节对拍 OK；node --check ×2、npm run build 通过
- **教训**：泛化「单对象→数组」类重构，旧路径等价性必须靠机械对拍（payload+结果逐字节 diff）证明，人眼核对必然漏拆分/漏传递这类细节；解析器对非记号值返回「原对象」而非重建对象，是让未触达路径零改动的关键手法

### E8：count_distinct 不能按日/月分解累加——月粒度路径必须并集去重（2026-09-20）

- **症状**：给 month-granularity 聚合加 count_distinct 时若沿用旧「按日累加再按月求和」结构，月值=各日去重数之和，与真实去重计数不符（同一用户/订单跨日重复）
- **根因**：sum/count 可分解（日值相加即月值），count_distinct 不可分解——去重语义定义在整体集合上，只能对集合做并集后取 size；已有月路径的累加结构对可分解聚合正确、对去重聚合是陷阱
- **修复**：月路径为 count_distinct 指标按日收集 Set（原始值字符串化，空值不计），按月并集后取 size；分组聚合路径（aggregate）每个组独立持 Set，两路径口径一致
- **验证**：harness 用重复原始行（同日两行同 order_no）验证组路径去重；月路径 7 个独立订单跨 4 天聚合为月值 7（而非日值之和）；R1/R2 兼容双跑逐字节对拍证明旧定义零改动
- **教训**：给聚合管线加新聚合函数时，先判断该函数在所有中间聚合层（日→月、组→sort/limit）上是否可分解；不可分解的聚合要在每一层改为携带集合，沿用「数值累加」骨架的可分解假设必然算错

### E9：展示层能力先探针后宣称——client 只渲染 option.value/表格纯文本，格式化函数过不了 JSON（2026-09-20）

- **症状**：R3 落地 P2-1 指标格式化 / P1-2 kpi 同环比 / P1-5 表格条件格式时，最初想把 ECharts axisLabel/tooltip formatter、表格 td style 直接挂进 option —— 需先确认 client 端到底渲染什么
- **根因**：三层探测结论（client.js 阅读 + echarts 5.5.1 SSR 渲染对拍）：① option 经 biApi JSON 序列化到客户端，任何 function（formatter）都过不了 JSON；② kpi 渲染（React 与静态 DOM 两路径）只输出 `option.value` 文本，`option.compare` 等其余字段不渲染；③ 表格 td 仅取 `String(cell)`，不消费任何样式；SSR 对拍证明 series.data 换成格式化字符串会破坏数值轴（path 数 14→4，柱子不画）
- **修复**：格式化只落在 client 真正渲染的文本面上——kpi 把「较前一日 -25%」并入 option.value 文本 + compare/comparePct/compareLabel 结构化字段同步透出；表格走显示副本行（option.rows 格式化拷贝，原始 rows 不动），cellStyles 作为数据透出并在文档明示「客户端表格暂不渲染样式」；柱/线 series 保持数值，文档写明数值轴仍按原始刻度。绝不把渲染不了的能力写进 systemPrompt 宣称
- **验证**：R3 harness 35/35（kpi/表格格式化值、value_map 显示层映射、注入时钟证明同环比窗口平移、rules/showTotals）；兼容双跑 8 旧定义 payload+结果与 pre-R3 lib cmp 字节相等
- **教训**：「往 option 里塞了」≠「用户看得到」——展示层能力落地前必须先探针渲染管线（读 client 代码 + SSR/浏览器实测），只在确认能渲染的面上做宣称，其余以数据透出并如实记录

### E10：能力契约手写漂移——facts 单一源 + build 期分歧 guard（2026-09-20）

- **症状**：bi-capability-v2 R1-R3 连续多轮向 systemPrompt dashboard-schema 段追加能力事实（图型上限/agg/join 级数/表达式函数表/相对记号/having/format/value_map/rules），同一事实散落在 systemPrompt、render_dashboard 描述、/bi-create 命令提示三处手写文本里，已出现同一边界两处口径不一致的苗头；R4 又要加 filtersFrom 绑定规则，继续手写必然漂移
- **根因**：契约事实没有单一事实源——数字/枚举散在手写散文中，能力改了文案没跟上时无任何机制报错；而 systemPrompt 又要求保持 prose 风格，不能整段变成机器清单
- **修复**：新建 `src/bi-capabilities.js` 作为单一事实源（CHART_TYPES/METRIC_CAPS/AGG_ENUM/JOIN_MAX_LEVELS/REL_UNITS 常量 + describeCapabilities() 渲染全部事实句 + dashboardSchemaSection() 拼接全文），index.js 只留流程散文；`scripts/verify-capability-guard.mjs` 在 npm run build 末尾 loudly 校验：①生成事实覆盖全部能力边记号 ②段全文逐字包含 describeCapabilities() 输出 ③手写文本（render_dashboard 描述/命令提示，经 DASH_CONTRACT_HAND 导出）必须含与生成事实一致的记号——手改数字即 build 失败（实测把 ≤4 改 ≤5 → guard 2 处报错退出）；模型侧 token 成本不变（只生成紧凑事实句，不生成教程）
- **验证**：npm run build + guard OK（19 能力边记号）；R4 harness 27/27（含 T8 facts 覆盖、T9 旧定义+命中筛选 payload 逐字节不变）；R1-R3 + R4 compat 双跑 cmp 逐字节相等
- **教训**：「文档即代码」的下一级是「契约事实即常量」——凡同一事实出现在 3 处以上手写文本，就该收敛为单一源渲染 + 机械 guard，靠人肉同步三处散文必然漂移；guard 必须挂在 build/verify 路径（离开验证路径的 guard 等于没有）

## 开发契约速查（创造模式必读，细节见 git 历史 0098511 版 DEVELOPMENT.md）

1. **声明红线**：client package.json `dsh.client.inject` 必须为 `[]`；bundle `exports.inject` 只许 `['slots']`（timer 走 window、sessions 走 ctx.get、CSS 走 injectCss）
2. **RPC 协议**：client `biCall('bi.x')` ↔ host `biApi['bi.x']` 前缀一致；bundle 内禁止 `host.call`（动态沙箱才有）
3. **禁止同名动态插件**：cordis_define 会与静态注册工具重名冲突
4. **验证三道门 + 1**：顶层定义清单核对 / stub React hooks 渲染模拟 / 方法对齐（client 调用 ⊆ host biApi）+ Playwright 真实浏览器回归
5. **运行时差异**：CSS 类样式被全局压制（交互控件用内联样式）；SVG 表现属性不支持 CSS 变量；host 侧 fire-and-forget 子进程会消失（触发类走 :8080 通道）；asyncpg JSONB 读回 str 需 json.loads；web/ 状态服务器已迁 `bi-plugin/web/`（crawler 的 /opt/web 挂载指向此处）
6. **部署**：编辑 `static/bi-dashboards-*/lib/*.js`（bundle 即源码）→ node --check → 三道门 → cp 到 node_modules → **重启 DSH 生效**（client 刷新即生效）；机器相关路径/地址（dataApi/statusUrl/vendorFile/storeFile/crawlConfigFile）统一在包目录 `config.json`（缺失自动生成默认值；本机 config 指向 bi-plugin 原路径），异机安装走 INSTALL.md + `static/scripts/install-to-dsh.sh`
7. **UI 文本极简 + icon 按钮**：交互按钮优先用 SVG icon（24 网格 MiniIcon 组件，Material path），非必要不用文字按钮；界面提示语最小化（错误/状态反馈除外），说明性长文案一律写文档不进 UI；标签只写必要名词（如「数据主机」「其他」）

### E11：快照自更新 ENOENT——dsh CLI 从主通道降级为兜底，清单内覆盖替换「绝不越界」（2026-09-20）

- **症状**：用户快照安装的宿主机点「一键更新」报 `未找到 dsh 命令…ENOENT`——performUpdate 在 DSH 宿主进程内 spawn `dsh plugin add`，而宿主进程 PATH 没有 nvm 路径，`dsh` 根本不可达；用户决策：若 dsh CLI 对更新无增益就彻底移出更新流。
- **根因**：把「重装快照」寄托在宿主进程内调外部 CLI 上，等于依赖一个宿主自己没注入的 PATH；且 pnpm add 重装会整目录替换，安全面过大。
- **修复**：快照形态改为**压缩包自更新**——直接 GET 下载仓库 tar.gz（Gitee `repository/archive/master.tar.gz` 主通道匿名可达实测 200，GitHub codeload 备通道），`tar -xzf` 解包后**仅按 package.json `files` 清单 + cordis.patch.yml 逐项覆盖**插件安装目录：只新建/覆盖、绝不删除清单外任何文件（新红线取代旧「只调官方 add」红线；用户数据在包外 PERSIST_DIR 不受影响）；`lib/index.js` 已提交且零外部 bare import，目标机无需装依赖重建。dsh CLI 降级为最后兜底且改经 `sh -lc`（登录 shell 补 nvm PATH），仍失败才报手动提示（文案风格保留）。git 形态补 detached HEAD 优雅报告（拒绝但不 brick）；`updateRepoDir` 先 realpath 再验 `.git`，node_modules 符号链接指向 git 仓库的安装形态正确走 git pull 路径。
- **验证**：`scripts/verify-updstab-r6.mjs`（8614 端口，mock 压缩包服务器）33/33：S1 符号链接 realpath 探针（node --preserve-symlinks 下 PKG_DIR 本身是符号链接，仅 realpathSync 能识别）；S2 压缩包覆盖端到端 + dsh 全程未被调用 + 清单外/PERSIST_DIR 哨兵文件原样；S3 Gitee 503 → GitHub 备通道；S4/S5/S6 双通道不可达 → `sh -lc` 降级 → 127/非127/成功三分支；S7 detached HEAD 报告且无破坏性 git 命令。R1-R4 harness 全绿 + build/guard/node --check 通过。
- **教训**：进程内自动更新不要依赖宿主没给的 CLI/PATH——能纯 Node（fetch + tar + fs 覆盖）就纯 Node；「只覆盖清单内路径」比「整目录重装」的安全不变量更容易验证（哨兵文件断言即可机器证明）。

### E12：granularity:'day' 从无分桶分支 + 相对记号裸偏移未按列型截断——字段回归双修（2026-09-21）

- **症状**：v1.2.0（434cbbc）部署后现场双报 —— ① `granularity:"day"` 的 line/area 图整表塌缩为一个点（1 个与多个指标同样），`"month"` 正常；用户 4 页 FineBI 复刻看板只能拿 month 粒度顶替日趋势；② `'+30d'` 等裸偏移记号在纯 date 列解析成 `'2026-10-21 08:49:19'`，数据服务 400 `Invalid value for order_date (date) column`；用户改静态上界规避
- **根因**：① (A) 不是 R1/R2 改坏的——全历史 `git log -S "granularity === 'day'"` 零增删、v1.1.7 与 master lib 双跑实测同样塌缩：`day` 自 26d3d93 起只进了枚举与校验、renderChartDef 从未实现分支，旧「日趋势」全靠 `group_by:['order_date']` 承载分组；R1 相对记号 + R2 多指标的能力文案普及了 `granularity:"day"` 不带 group_by 的写法后，此类定义落进 `aggregate()` 空 group_by → 全表一组 → 一个点；且 neededColumns 只给 month 兜底时间列，无 group_by 的 day 定义连日期列都可能不取。② R1 记号输出规则「now 系/时分偏移 → 完整 datetime」把隐式 now 系的裸偏移（±Nu）推到带时刻的输出上，而契约「日期列用 today 系」只是把列型选择责任转嫁给模型/用户
- **修复**：① renderChartDef 增 bar/line/area 的 day 分支：`String(r[tc]).slice(0,10)` 日分桶（timestamp 列亦正确归一日；空时间列行同月路径剔除），聚合整体复用 `aggregate()`——sum/count/count_distinct/avg/min/max + having/sort/limit 全套语义不重写；无显式 sort 时按日期升序（月路径同款），kpi/table/text 不受分支影响（kpi「近N日合计」单值语义保持）；neededColumns 对 day 同 month 兜底 order_date。② resolveFilters 增 typeOf 参数：date 列记号一律输出 YYYY-MM-DD（BETWEEN 数组逐元素、`{relative}` 对象形、看板级 extraFilters 同样生效），timestamp/未知类型保持既有形态；列类型走 join 路径同款 meta 缓存（tableColsCache 升级为 tableMeta 同时存 names+types），仅含记号的定义才查 meta（静态定义零额外请求），meta 404/无 type 字段降级旧形态；now 快照仍每图渲染一次（确定性）；用户两类绕法（month 顶替、静态上界）无需迁移即失效。③ 契约文本同步收口：relTokenSentence 与 capabilityFacts（新增 rel_output/granularity 两条边）、PROSE_HEAD、render_dashboard 工具描述、/bi-create 提示、CHART.md 全部改成「输出形态按列类型自动适配」口径
- **验证**：`scripts/verify-bicap-r7.mjs`（8615，mock 数据服务复刻 query.py `date.fromisoformat` 校验——date 列收到带时刻值即 400）34/34；同 harness 跑 master lib 22 FAIL 且报错文本与现场逐字一致（含塌缩输出 `[{"销售额":625.5}]`）；r1-r4 feature 18/34/35/27 全绿、r6 33/33；r1-r4 + r7 compat 双跑（pre-fix lib vs 新 lib）/api/query payload + render 结果 cmp 字节相等（含「day+group_by 原本能跑」「timestamp 列裸偏移」两类近邻定义）；npm run build + capability guard（19 记号）+ node --check ×4 通过
- **教训**：schema 枚举里放上而实现无分支的能力就是潜伏契约——能力文案一旦普及对应写法必被踩中；断言「哪次 refactor 引入」前先用 `git log -S` 与旧 lib 双跑证明存在性历史。契约要求调用方「按列型挑写法」= 把 Host 自己查得到的信息推给模型侧；机械适配（类型截断）应下沉实现侧，模型侧只管意图
