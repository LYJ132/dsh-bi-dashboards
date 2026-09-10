// 无人超市 AI BI 插件 — Client 半部（v9：整合同步监控条，单面板压缩布局）
window.__ModuleLoader__.load({
  id: 'bi-dashboards-client',
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    const React = require('react');
function biCall(m, args) {
  return fetch('/bi/api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ m: m, args: args || {} }) }).then(function (r) { return r.json() })
}
function injectCss() {
  if (typeof document === 'undefined') return
  if (document.getElementById('bi-static-css')) return
  var styleEl = document.createElement('style')
  styleEl.id = 'bi-static-css'
  styleEl.textContent = CSS
  document.head.appendChild(styleEl)
}
var BI_TIMERS = []
function biTimerInterval(fn, ms) { try { var id = window.setInterval(fn, ms); BI_TIMERS.push(id); return function () { try { window.clearInterval(id) } catch (e) {} } } catch (e) { return null } }
function biTimerTimeout(fn, ms) { try { var id = window.setTimeout(fn, ms); BI_TIMERS.push(id); return function () { try { window.clearTimeout(id) } catch (e) {} } } catch (e) { return null } }


const ORANGE = '#f97316'
const GREEN = '#4caf50'
const RED = '#f56c6c'
const GRAY = '#667085'
const ICON_ADD = 'M544.256 480.256h307.2a32.256 32.256 0 0 1 0 64h-307.2v307.2a32.256 32.256 0 0 1-64 0v-307.2h-307.2a32.256 32.256 0 1 1 0-64h307.2v-307.2a32.256 32.256 0 1 1 64 0z'
const ICON_FILTER = 'M426.837333 515.029333c0-28.970667-15.061333-67.2-34.837333-88.490666L179.690667 198.229333C160.490667 177.066667 163.306667 170.666667 191.893333 170.666667h640.213334c28.522667 0 31.36 6.4 12.096 27.712l-211.498667 225.493333c-19.754667 21.056-34.816 59.221333-34.816 88.106667v298.794666a21.333333 21.333333 0 1 0 42.666667 0V512c0-18.048 10.944-45.76 23.253333-58.901333l211.776-225.792C919.872 178.325333 897.706667 128 832.106667 128H191.893333c-65.728 0-87.744 50.346667-43.648 99.072l212.501334 228.522667c12.458667 13.397333 23.424 41.258667 23.424 59.434666v359.381334a21.333333 21.333333 0 1 0 42.666666 0V515.029333z'
const ICON_MORE_V = 'M512 192a64 64 0 1 1 0 128 64 64 0 0 1 0-128z M512 448a64 64 0 1 1 0 128 64 64 0 0 1 0-128z M512 704a64 64 0 1 1 0 128 64 64 0 0 1 0-128z'
var TIMER_INTERVAL = null
var CURRENT_SESSION_ID = null
var SESSIONS = null
var TIMER_TIMEOUT = null
const CSS = `
.bi-page { font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; padding: 20px; width: 100%; max-width: none; height: 100%; overflow: auto; box-sizing: border-box; }
.bi-hdr { display:flex; justify-content:flex-end; align-items:center; margin-bottom:14px; gap:8px; }
.bi-vtabs { display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:18px; }
.bi-tab { position:relative; display:inline-flex; align-items:center; gap:2px; border:1px solid var(--dsw-alias-border-l1, #2a2e3d); color: var(--dsw-alias-label-secondary, #9fb3d8); border-radius:16px; padding:3px 6px 3px 12px; font-size:13px; cursor:grab; background:transparent; transition:border-color .15s, box-shadow .15s; }
.bi-tab:hover { border-color: ${ORANGE}; }
.bi-tab-on { background: ${ORANGE}; border-color: ${ORANGE}; color:#fff; }
.bi-tab-dragging { box-shadow: 0 0 0 2px ${ORANGE}; opacity:.6; }
.bi-tab-label { background:none; border:none; color:inherit; font-size:13px; cursor:pointer; padding:2px 0; white-space:nowrap; }
.bi-tabmore { background:none; border:none; color:inherit; cursor:pointer; padding:2px; display:inline-flex; align-items:center; justify-content:center; border-radius:4px; }
.bi-tabmore:hover { background: var(--dsw-alias-bg-layer-2, rgba(255,255,255,.18)); }
.bi-tabmenu { position:absolute; right:0; top:calc(100% + 4px); background: var(--dsw-alias-bg-overlay, #1c2030); border:1px solid var(--dsw-alias-border-l2, #333a4a); border-radius:8px; padding:4px; z-index:30; min-width:120px; box-shadow:0 6px 20px rgba(0,0,0,.3); }
.bi-btn { background: var(--dsw-alias-bg-layer-1, #1a1d27); color: var(--dsw-alias-label-primary, #e8e8e8); border:1px solid var(--dsw-alias-border-l1, #2a2e3d); border-radius:6px; padding:5px 10px; font-size:12px; cursor:pointer; }
.bi-btn:hover { border-color: ${ORANGE}; color: ${ORANGE}; }
.bi-btn:disabled { opacity:.4; cursor:not-allowed; }
.bi-add { display:inline-flex; align-items:center; justify-content:center; width:28px; height:28px; padding:0; border-radius:50%; background: var(--dsw-alias-bg-layer-1, #1a1d27); color: var(--dsw-alias-label-primary, #e8e8e8); border:1px solid var(--dsw-alias-border-l1, #2a2e3d); cursor:pointer; }
.bi-add:hover { border-color: ${ORANGE}; color: ${ORANGE}; }
.bi-layout { display:flex; gap:16px; align-items:flex-start; }
.bi-kpi-col { width:26%; flex:none; display:flex; flex-direction:column; gap:16px; }
.bi-chart-col { flex:1; min-width:0; display:grid; grid-template-columns:repeat(2, 1fr); gap:16px; align-items:start; }
.bi-cell { background: var(--dsw-alias-bg-layer-1, #12151c); border-radius:10px; padding:12px; position:relative; }
.bi-cell-kpi { padding:10px 12px; }
.bi-cell-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; gap:6px; }
.bi-cell-title { font-size:13px; font-weight:600; color: var(--dsw-alias-label-primary, #e8e8e8); }
.bi-cell-more { display:inline-flex; align-items:center; justify-content:center; width:22px; height:22px; background: var(--dsw-alias-bg-layer-2, rgba(0,0,0,.4)); color: var(--dsw-alias-label-primary, #e8e8e8); border:1px solid var(--dsw-alias-border-l1, #2a2e3d); border-radius:6px; padding:0; cursor:pointer; opacity:0; transition:opacity .15s; }
.bi-cell:hover .bi-cell-more { opacity:1; }
.bi-chart { width:100%; height:300px; overflow:hidden; }
.bi-chart-wrap { overflow-x:auto; scroll-behavior:smooth; }
.bi-chart-wrap::-webkit-scrollbar { height:4px; }
.bi-chart-wrap::-webkit-scrollbar-track { background:var(--dsw-alias-bg-layer-2,#242a38); }
.bi-chart-wrap::-webkit-scrollbar-thumb { background:var(--dsw-alias-border-l1,#2a2e3d); border-radius:2px; }
.bi-chart-scroll-hint { display:none; font-size:11px; color:var(--dsw-alias-label-secondary,#9fb3d8); opacity:.7; }
.bi-menu { position:absolute; right:0; top:30px; background: var(--dsw-alias-bg-overlay, #1c2030); border:1px solid var(--dsw-alias-border-l2, #333a4a); border-radius:8px; padding:4px; z-index:30; min-width:140px; box-shadow:0 6px 20px rgba(0,0,0,.3); }
.bi-menu-item { background:none; border:none; color: var(--dsw-alias-label-primary, #e8e8e8); width:100%; text-align:left; padding:6px 10px; font-size:13px; cursor:pointer; border-radius:6px; }
.bi-menu-item:hover { background: var(--dsw-alias-bg-layer-2, #2a2e3d); }
.bi-menu-item.danger { color: var(--dsw-alias-state-error-primary, #f56c6c); }
.bi-menu-label { padding:6px 10px 2px; font-size:11px; color: var(--dsw-alias-label-secondary, #9fb3d8); }
.bi-table { width:100%; border-collapse:collapse; font-size:12px; color: var(--dsw-alias-label-primary, #e8e8e8); }
.bi-filter-btn { display:inline-flex; align-items:center; justify-content:center; width:22px; height:22px; background: var(--dsw-alias-bg-layer-2, rgba(0,0,0,.4)); color: var(--dsw-alias-label-primary, #e8e8e8); border:1px solid var(--dsw-alias-border-l1, #2a2e3d); border-radius:6px; padding:0; cursor:pointer; opacity:0; transition:opacity .15s; }
.bi-cell:hover .bi-filter-btn { opacity:1; }
.bi-filter-btn.on { opacity:1; color:#f97316; border-color:#f97316; }
.bi-table th,.bi-table td { border:1px solid var(--dsw-alias-border-l1, #2a2e3d); padding:4px 6px; }
.bi-kpi { font-size:30px; font-weight:600; color: ${ORANGE}; padding:4px 0; }
.bi-text { white-space:pre-wrap; font-size:13px; line-height:1.6; color: var(--dsw-alias-label-primary, #e8e8e8); }
.bi-empty { color: var(--dsw-alias-label-secondary, #9fb3d8); font-size:13px; padding:24px; text-align:center; }
.bi-err { color: var(--dsw-alias-state-error-primary, #f56c6c); font-size:12px; padding:10px; }
.bi-sync-bar { display:flex; align-items:center; gap:14px; background: var(--dsw-alias-bg-layer-1, #161a23); border:1px solid var(--dsw-alias-border-l1, #2a2e3d); border-radius:12px; padding:10px 14px; margin-bottom:14px; }
.bi-sr-left { position:relative; width:52px; height:52px; flex:none; }
.bi-sr-txt { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; font-variant-numeric:tabular-nums; color: var(--dsw-alias-label-primary, #e8e8e8); }
.bi-sr-mid { flex:1; min-width:0; display:flex; flex-direction:column; gap:5px; }
.bi-sr-row { display:flex; align-items:center; gap:6px; flex-wrap:wrap; min-width:0; }
.bi-sep { width:1px; height:14px; background: var(--dsw-alias-border-l1, #2a2e3d); margin:0 4px; flex:none; }
.bi-chip { display:inline-flex; align-items:center; gap:5px; font-size:11px; color: var(--dsw-alias-label-secondary, #9fb3d8); background: var(--dsw-alias-bg-layer-2, rgba(255,255,255,.06)); border-radius:10px; padding:2px 8px; line-height:1.4; white-space:nowrap; }
.bi-chip i { width:7px; height:7px; border-radius:50%; display:inline-block; flex:none; }
.bi-glabel { font-size:10px; color: var(--dsw-alias-label-secondary, #9fb3d8); opacity:.75; flex:none; }
.bi-sr-last { font-size:11px; color: var(--dsw-alias-label-secondary, #9fb3d8); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%; }
.bi-sr-last.err { color: var(--dsw-alias-state-error-primary, #f56c6c); }
.bi-sr-last.ok { color:#4caf50; }
.bi-mode { font-size:10px; padding:1px 7px; border-radius:8px; background: var(--dsw-alias-bg-layer-2, #242a38); color: var(--dsw-alias-label-secondary, #9fb3d8); flex:none; text-transform:uppercase; }
.bi-sr-right { display:flex; align-items:center; gap:8px; flex:none; }
.bi-fence-card { margin: 10px 0 14px 0; background: var(--dsw-alias-bg-layer-1, #161a23); border:1px solid var(--dsw-alias-border-l1,#2a2e3d); border-radius:12px; padding:12px 14px; max-width: 860px; }
.bi-fence-title { font-size:13px; font-weight:600; color: var(--dsw-alias-label-primary,#e8e8e8); margin-bottom:10px; }
.bi-fence-grid { display:grid; grid-template-columns:repeat(2, 1fr); gap:12px; }
.bi-fence-cell:last-child:nth-child(odd) { grid-column: 1 / -1; }
.bi-fence-cell { position:relative; background: var(--dsw-alias-bg-layer-2, rgba(255,255,255,.04)); border-radius:10px; padding:10px 12px; min-width:0; }
.bi-fence-head { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:6px; }
.bi-fence-save { background:none; border:1px solid var(--dsw-alias-border-l1,#2a2e3d); color:var(--dsw-alias-label-secondary,#9fb3d8); border-radius:6px; font-size:11px; padding:2px 8px; cursor:pointer; flex:none; }
.bi-fence-save:hover { color:#f97316; border-color:#f97316; }
.bi-fence-save:disabled { opacity:.5; cursor:default; }
.bi-set-wrap { max-width: 940px; }
.bi-set-note { font-size:12px; color: var(--dsw-alias-label-secondary,#9fb3d8); }
.bi-set-h2 { font-size:14px; font-weight:600; margin:16px 0 8px; color: var(--dsw-alias-label-primary,#e8e8e8); }
.bi-set-table { width:100%; border-collapse:collapse; font-size:12px; margin-bottom:6px; }
.bi-set-table th,.bi-set-table td { border:1px solid var(--dsw-alias-border-l1,#2a2e3d); padding:5px 8px; text-align:left; color: var(--dsw-alias-label-primary,#e8e8e8); }
.bi-set-freq { display:flex; align-items:center; gap:8px; margin:8px 0; flex-wrap:wrap; }
.bi-set-freq input { width:72px; background:var(--dsw-alias-bg-layer-1,#1a1d27); color:var(--dsw-alias-label-primary,#e8e8e8); border:1px solid var(--dsw-alias-border-l1,#2a2e3d); border-radius:6px; padding:4px 6px; }
.bi-set-off { opacity:.55; }
.bi-set-dash { display:flex; gap:18px; align-items:center; background:var(--dsw-alias-bg-layer-1,#161a23); border:1px solid var(--dsw-alias-border-l1,#2a2e3d); border-radius:12px; padding:14px 16px; margin-bottom:6px; flex-wrap:wrap; }
.bi-ring-lg { position:relative; width:84px; height:84px; flex:none; }
.bi-ring-lg svg { display:block; }
.bi-ring-txt { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:700; font-variant-numeric:tabular-nums; color:var(--dsw-alias-label-primary,#e8e8e8); }
.bi-status-grid { flex:1; display:grid; grid-template-columns:1fr 1fr; gap:7px 20px; min-width:260px; }
.bi-status-row { display:flex; gap:6px; align-items:baseline; font-size:12px; min-width:0; }
.bi-status-name { color:var(--dsw-alias-label-secondary,#9fb3d8); flex:none; }
.bi-status-val { color:var(--dsw-alias-label-primary,#e8e8e8); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.bi-dot { display:inline-block; width:8px; height:8px; border-radius:50%; flex:none; }
.bi-switch { position:relative; display:inline-block; width:40px; height:22px; border-radius:11px; background:var(--dsw-alias-bg-layer-2,#3a4152); border:1px solid var(--dsw-alias-border-l1,#2a2e3d); cursor:pointer; padding:0; transition:background .2s,border-color .2s; vertical-align:middle; }
.bi-switch.on { background:#f97316; border-color:#f97316; }
.bi-switch:disabled { opacity:.5; cursor:default; }
.bi-switch-knob { position:absolute; top:2px; left:2px; width:16px; height:16px; border-radius:50%; background:#fff; transition:left .2s; }
.bi-switch.on .bi-switch-knob { left:20px; }
.bi-set-login-warn { border-color:#f56c6c; color:#f56c6c; }
.bi-set-login-warn:hover { border-color:#f56c6c; color:#f56c6c; }
.bi-viewbar { display:flex; flex-wrap:wrap; align-items:center; gap:10px; margin-bottom:14px; }
.bi-grid { display:grid; grid-template-columns:repeat(12, 1fr); gap:16px; grid-auto-rows:150px; }
.bi-grid3 { display:grid; grid-template-columns:1fr 1.5fr 1.5fr; gap:16px; align-items:start; }
.bi-col { display:flex; flex-direction:column; gap:16px; min-width:0; }
.bi-grid3-item { position:relative; min-width:0; }
.bi-grid3-item .bi-cell { height:320px; display:flex; flex-direction:column; overflow:hidden; }
.bi-grid3-item .bi-cell .bi-chart { flex:1; min-height:0; height:auto; }
.bi-grid3-item.bi-kpi-item .bi-cell { height:auto; min-height:96px; }
.bi-grid3-item.drag-over { outline:2px dashed #f97316; outline-offset:2px; }
.bi-grid3-item[draggable='true'] { cursor:move; }
.bi-free-wrap { position:relative; }
.bi-free-item, .bi-free-item .bi-cell { box-sizing:border-box; }
.bi-free-item { position:absolute; background:var(--dsw-alias-bg-layer-1, #1a1d27); border:1px solid var(--dsw-alias-border-l1, #2a2e3d); border-radius:12px; }
.bi-free-item.dragging { opacity:.9; box-shadow:0 10px 30px rgba(0,0,0,.4); }
.bi-free-item .bi-cell { height:100%; display:flex; flex-direction:column; background:transparent; border:none; }
.bi-free-item .bi-cell .bi-chart { flex:1; min-height:0; height:auto; overflow:hidden; border-radius:0 0 9px 9px; }
.bi-free-item .bi-cell .bi-table { display:block; flex:1; min-height:0; overflow:auto; border-radius:0 0 9px 9px; max-width:100%; }
.bi-free-item .bi-cell-title { cursor:grab; }
.bi-free-item .bi-cell-title:active { cursor:grabbing; }
.bi-free-item .bi-resize-h { opacity:1; }
.bi-grid-item { position:relative; display:flex; flex-direction:column; min-width:0; }
.bi-grid-item .bi-cell { flex:1; display:flex; flex-direction:column; overflow:hidden; height:auto; }
.bi-grid-item .bi-cell .bi-chart { flex:1; min-height:180px; height:auto; }
.bi-resize-h { position:absolute; right:3px; bottom:3px; width:16px; height:16px; cursor:nwse-resize; z-index:5; opacity:1; }
.bi-resize-h::before { content:''; position:absolute; right:1px; bottom:1px; width:12px; height:12px; border-right:2px solid #565d6b; border-bottom:2px solid #565d6b; border-bottom-right-radius:100%; opacity:.9; }
.bi-free-item:hover .bi-resize-h::before { border-right-color:#c3cbd8; border-bottom-color:#c3cbd8; opacity:1; }
.bi-filter-card { min-width:300px; }
.bi-fc-op { width:100%; margin-bottom:6px; }
.bi-fc-input { width:100%; box-sizing:border-box; background: var(--dsw-alias-bg-layer-1, #1a1d27); color: var(--dsw-alias-label-primary, #e8e8e8); border:1px solid var(--dsw-alias-border-l1, #2a2e3d); border-radius:8px; padding:5px 8px; font-size:12px; outline:none; }
.bi-fc-inputwrap { position:relative; }
.bi-fc-list { position:absolute; left:0; right:0; top:calc(100% + 4px); max-height:160px; overflow-y:auto; background: var(--dsw-alias-bg-overlay, #1c2030); border:1px solid var(--dsw-alias-border-l2, #333a4a); border-radius:8px; z-index:40; box-shadow:0 6px 20px rgba(0,0,0,.3); }
.bi-fc-opt { padding:5px 8px; font-size:12px; cursor:pointer; color: var(--dsw-alias-label-primary, #e8e8e8); }
.bi-fc-opt:hover { background:#232838; }
.bi-fc-empty { color: var(--dsw-alias-label-secondary, #9fb3d8); cursor:default; }
.bi-fc-range { display:flex; align-items:center; gap:6px; }
.bi-fc-sep { color: var(--dsw-alias-label-secondary, #9fb3d8); }
.bi-fc-btns { display:flex; gap:6px; margin-top:8px; }
.bi-fc-btns .bi-menu-item { flex:1; text-align:center; }
.bi-fc-apply { color:#f97316; }
.bi-guide { position:absolute; background:#f97316; opacity:.75; pointer-events:none; z-index:60; box-shadow:0 0 4px rgba(249,115,22,.55); }
.bi-guide-x { top:0; bottom:0; width:1px; }
.bi-guide-y { left:0; right:0; height:1px; }
.bi-grid-item.drag-over { outline:2px dashed #f97316; outline-offset:2px; }
.bi-grid-item[draggable='true'] { cursor:move; }
.bi-search { width: 200px; background: var(--dsw-alias-bg-layer-1, #1a1d27); color: var(--dsw-alias-label-primary, #e8e8e8); border: 1px solid var(--dsw-alias-border-l1, #2a2e3d); border-radius: 10px; padding: 5px 10px; font-size: 12px; font-family: inherit; outline: none; }
.bi-search:focus { border-color: #f97316; }
.bi-search::placeholder { color: var(--dsw-alias-label-secondary, #9fb3d8); }
.bi-vf-row { position: absolute; top: calc(100% + 4px); left: 0; min-width: 100%; background: var(--dsw-alias-bg-overlay, #1c2030); border: 1px solid var(--dsw-alias-border-l2, #333a4a); border-radius: 10px; padding: 8px; display: flex; align-items: center; gap: 6px; z-index: 30; box-shadow: 0 6px 20px rgba(0,0,0,.3); flex-wrap: wrap; }
.bi-vf-row .bi-select { background: var(--dsw-alias-bg-layer-1, #1a1d27); color: var(--dsw-alias-label-primary, #e8e8e8); border: 1px solid var(--dsw-alias-border-l1, #2a2e3d); border-radius: 6px; padding: 3px 6px; font-size: 12px; font-family: inherit; }
.bi-vf-row .bi-fc { width:100%; min-width:0; }
.bi-capsule { display:flex; align-items:center; background:var(--dsw-alias-bg-layer-2,#1c2030); border:1px solid var(--dsw-alias-border-l1,#2a2e3d); border-radius:999px; padding:9px 16px; flex-wrap:wrap; }
.bi-capsule-seg { display:flex; align-items:center; gap:7px; font-size:13px; color:var(--dsw-alias-label-primary,#e8e8e8); }
.bi-capsule-sep { width:1px; height:18px; background:var(--dsw-alias-border-l1,#2a2e3d); margin:0 14px; flex:none; }
.bi-capsule-btn { background:none; border:none; color:inherit; cursor:pointer; padding:0; font-size:13px; display:flex; align-items:center; gap:7px; font-family:inherit; }
.bi-capsule-btn:hover { color:#f97316; }
.bi-feishu-detail { flex-basis:100%; display:flex; gap:24px; padding-top:10px; flex-wrap:wrap; }
.bi-chevron { display:inline-block; transition:transform .2s; font-size:10px; }
.bi-chevron.open { transform:rotate(90deg); }
.bi-pill-col { display:flex; flex-direction:column; gap:8px; align-items:flex-start; }
.bi-pill { position:relative; display:inline-flex; align-items:center; gap:7px; border:1px solid var(--dsw-alias-border-l1,#2a2e3d); border-radius:16px; padding:0 14px; font-size:13px; background:transparent; color:var(--dsw-alias-label-primary,#e8e8e8); height:30px; box-sizing:border-box; font-family:inherit; }
.bi-sync-round { width:22px; height:22px; border-radius:50%; border:1px solid var(--dsw-alias-border-l1,#2a2e3d); background:transparent; color:var(--dsw-alias-label-secondary,#9fb3d8); cursor:pointer; font-size:12px; line-height:1; display:inline-flex; align-items:center; justify-content:center; padding:0; flex:none; font-family:inherit; margin-left:2px; }
.bi-sync-round:hover { border-color:#f97316; color:#f97316; }
.bi-sync-round:disabled { opacity:.5; cursor:default; }
.bi-pill-btn { cursor:pointer; }
.bi-pill-btn:hover { border-color:#f97316; color:#f97316; }
.bi-feishu-detail { flex-basis:100%; display:flex; gap:24px; padding:2px 4px 0; flex-wrap:wrap; }
`
function Icon(props) { return React.createElement('svg', { viewBox: '0 0 1024 1024', width: props.size || 16, height: props.size || 16, style: { display: 'block' }, 'aria-hidden': true }, React.createElement('path', { d: props.d, fill: 'currentColor' })) }
function MiniIcon(props) { return React.createElement('svg', { viewBox: props.viewBox || '0 0 1024 1024', width: props.size || 15, height: props.size || 15, style: { display: 'block' }, 'aria-hidden': true }, React.createElement('path', { d: props.d, fill: 'currentColor' })) }
const ICON_COPY = 'M731.68184 676.057473 731.68184 183.323259c0-30.233582-24.512277-54.745858-54.747905-54.745858L184.216093 128.577401c-30.233582 0-54.746882 24.512277-54.746882 54.745858l0 492.734214c0 30.207999 24.5133 54.746882 54.746882 54.746882l492.717841 0C707.16854 730.804355 731.68184 706.265472 731.68184 676.057473zM622.1891 676.057473 238.962975 676.057473c-30.233582 0-54.746882-24.538883-54.746882-54.745858L184.216093 238.07014c0-30.233582 24.5133-54.746882 54.746882-54.746882l383.226125 0c30.233582 0 54.744835 24.512277 54.744835 54.746882l0 383.242498C676.933935 651.51859 652.421658 676.057473 622.1891 676.057473zM841.17458 292.817022l-54.745858 0 0 54.746882c30.232558 0 54.745858 24.5133 54.745858 54.759161l0 383.228171c0 30.206976-24.5133 54.745858-54.745858 54.745858L403.201573 840.297095c-30.233582 0-54.746882-24.538883-54.746882-54.745858l-54.746882 0 0 54.745858c0 30.207999 24.5133 54.747905 54.746882 54.747905l492.719888 0c30.234605 0 54.747905-24.539906 54.747905-54.747905L895.922485 347.563904C895.922485 317.329299 871.408161 292.817022 841.17458 292.817022z'
const ICON_EDIT = 'M872.533333 307.2c0-21.333333-8.533333-42.666667-23.466666-57.6l-91.733334-91.733333c-32-32-85.333333-32-115.2 0L177.066667 622.933333c-4.266667 4.266667-6.4 8.533333-8.533334 14.933334l-49.066666 213.333333c-2.133333 10.666667 0 21.333333 8.533333 29.866667 6.4 6.4 14.933333 8.533333 23.466667 8.533333h6.4l213.333333-49.066667c6.4-2.133333 10.666667-4.266667 14.933333-8.533333l465.066667-465.066667c12.8-17.066667 21.333333-38.4 21.333333-59.733333z m-68.266666 12.8L345.6 778.666667 192 814.933333l36.266667-153.6L686.933333 202.666667c6.4-6.4 19.2-6.4 25.6 0l91.733334 91.733333c4.266667 4.266667 4.266667 8.533333 4.266666 12.8 0 4.266667 0 8.533333-4.266666 12.8zM874.666667 825.6H599.466667c-17.066667 0-32 14.933333-32 32s14.933333 32 32 32H874.666667c17.066667 0 32-14.933333 32-32s-14.933333-32-32-32z'
const ICON_BOLT = 'M582.39205 0l52.805057 34.254652-388.450271 598.80154-52.805057-34.254652 388.450271-598.80154z m228.146057 390.868247l52.805057 34.254652-388.450271 598.801539-52.805057-34.254652 388.450271-598.801539z m0 0 M585.477488 0h57.250605v379.420644H585.477488z M585.477488 368.086384h277.865676v57.238012H585.477488v-57.238012zM193.954373 599.494189h280.485149v57.250606H193.954373v-57.250606z m0 0 M417.188917 647.82851h57.238012v376.17149h-57.238012z'
const ICON_CHECK = 'M218.843 208.468c-4.55 2.434-7.941 5.825-10.375 10.375-3.3 6.171-4.468 12.218-4.468 32.074v522.166c0 19.856 1.168 25.903 4.468 32.074 2.434 4.55 5.825 7.941 10.375 10.375 6.171 3.3 12.218 4.468 32.074 4.468h522.166c19.856 0 25.903-1.168 32.074-4.468 4.55-2.434 7.941-5.825 10.375-10.375 3.3-6.171 4.468-12.218 4.468-32.074V357.176c0-12.479-0.295-16.284-1.164-20.053-0.62-2.694-1.514-4.85-2.98-7.195-2.05-3.279-4.533-6.178-13.357-15.002L709.074 221.5c-8.824-8.824-11.723-11.307-15.002-13.358-2.344-1.465-4.5-2.359-7.195-2.98-3.769-0.868-7.574-1.163-20.053-1.163H250.917c-19.856 0-25.903 1.168-32.074 4.468zM250.917 144h415.907c16.624 0 24.466 0.608 33.529 2.696 9.186 2.117 17.54 5.578 25.533 10.576 7.885 4.932 13.86 10.047 25.615 21.802l93.425 93.425c11.755 11.756 16.87 17.73 21.802 25.615 4.998 7.993 8.459 16.347 10.576 25.533 2.088 9.063 2.696 16.905 2.696 33.53v415.906c0 28.914-2.975 44.318-11.56 60.37-8.025 15.006-19.98 26.962-34.987 34.987-16.052 8.585-31.456 11.56-60.37 11.56H250.917c-28.914 0-44.318-2.975-60.37-11.56-15.006-8.025-26.962-19.98-34.987-34.987-8.585-16.052-11.56-31.456-11.56-60.37V250.917c0-28.914 2.975-44.318 11.56-60.37 8.025-15.006 19.98-26.962 34.987-34.987 16.052-8.585 31.456-11.56 60.37-11.56zM674 203.475h60v199.686c0 30.316-3.854 46.832-14.731 63.661-9.743 15.074-23.834 26.734-41.15 34.397C659.975 509.25 642.757 512 608.723 512H415.277c-34.034 0-51.252-2.751-69.396-10.78-17.316-7.664-31.407-19.324-41.15-34.398C293.854 449.992 290 433.477 290 403.161V203.88h60v199.28c0 11.255 0.63 18.6 1.75 23.393 0.7 3.004 1.507 4.814 3.373 7.7 3.212 4.971 8.132 9.042 15.04 12.099 9.385 4.153 18.738 5.648 45.114 5.648h193.446c26.376 0 35.73-1.495 45.115-5.648 6.907-3.057 11.827-7.128 15.04-12.098 1.865-2.887 2.672-4.697 3.373-7.7 1.118-4.794 1.749-12.139 1.749-23.393V203.475z'
const iconBtn = { width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0', borderRadius: '8px', border: '1px solid #3d2f1f', background: '#241c10', color: '#f97316', cursor: 'pointer', flex: 'none' }
const iconBtnHover = { onMouseEnter: function (e) { e.currentTarget.style.borderColor = '#f97316' }, onMouseLeave: function (e) { e.currentTarget.style.borderColor = '#3d2f1f' } }
function toEcharts(c) { const o = c.option || {}; if (o.type === 'pie') return { tooltip: { trigger: 'item' }, series: o.series }; var labels = (o.xAxis && o.xAxis.data) || []; var maxLen = 0; labels.forEach(function (l) { var s = String(l == null ? '' : l); if (s.length > maxLen) maxLen = s.length }); var rot = maxLen <= 6 ? 0 : maxLen <= 12 ? 30 : maxLen <= 18 ? 45 : 60; var axisLabel = Object.assign({}, (o.xAxis && o.xAxis.axisLabel) || {}, { rotate: rot, interval: 0, hideOverlap: true, overflow: 'truncate', formatter: function (v) { var s = String(v == null ? '' : v); return s.length > 12 ? s.slice(0, 12) + '…' : s } }); var xAxis = Object.assign({}, o.xAxis || {}, { axisLabel: axisLabel }); var grid = Object.assign({ containLabel: true, left: 14, right: 18, top: 42, bottom: 14 }, o.grid || {}); return { tooltip: { trigger: 'axis' }, grid: grid, xAxis: xAxis, yAxis: o.yAxis, color: [ORANGE], series: o.series, dataZoom: [{ type: 'inside', start: 0, end: 100, minValueSpan: 1 }] } }
function ensureEcharts(cb) { if (typeof window !== 'undefined' && window.echarts) { cb(); return } if (typeof document !== 'undefined') { const s = document.createElement('script'); s.src = '/bi/vendor/echarts.min.js'; s.onload = function () { cb() }; document.head.appendChild(s) } }
function renderChartBody(chart, dashId, i) { if (chart.type === 'kpi') return React.createElement('div', { className: 'bi-kpi' }, chart.option ? chart.option.value : ''); if (chart.type === 'text') return React.createElement('div', { className: 'bi-text' }, chart.text || chart.title); if (chart.type === 'table') { const cols = (chart.option && chart.option.columns) || []; const labels = (chart.option && chart.option.columnLabels) || {}; const rows = (chart.option && chart.option.rows) || []; return React.createElement('table', { className: 'bi-table' }, React.createElement('thead', null, React.createElement('tr', null, cols.map(function (cl, j) { return React.createElement('th', { key: j, title: cl }, labels[cl] || cl) }))), React.createElement('tbody', null, rows.map(function (r, ri) { return React.createElement('tr', { key: ri }, cols.map(function (cl, ci) { return React.createElement('td', { key: ci }, String(r[cl] === null || r[cl] === undefined ? '' : r[cl])) })) }))) }
  return React.createElement('div', { className: 'bi-chart', 'data-cid': chart.id }) }
function Chip(label, color, title) { return React.createElement('span', { className: 'bi-chip', title: title || '' }, React.createElement('i', { style: { background: color } }), label) }
function SyncBar(props) {
  const [st, setSt] = React.useState(null)
  const [nowTs, setNowTs] = React.useState(Date.now())
  const [msg, setMsg] = React.useState('')
  const [busy, setBusy] = React.useState('')
  React.useEffect(function () {
    var dead = false
    function poll() { biCall('bi.getStatus', {}).then(function (d) { if (!dead) setSt(d && d.error ? { offline: true } : d) }).catch(function () { if (!dead) setSt({ offline: true }) }) }
    poll()
    const a = TIMER_INTERVAL(function () { if (!dead) poll() }, 5000)
    const b = TIMER_INTERVAL(function () { if (!dead) setNowTs(Date.now()) }, 1000)
    return function () { dead = true; if (a) a(); if (b) b() }
  }, [])
  const act = function (kind, rpc, okMsg) {
    setBusy(kind)
    biCall(rpc, {}).then(function (r) {
      setBusy('')
      const ok = !!(r && (r.ok || r.status === 'started'))
      setMsg(ok ? okMsg : String((r && (r.error || r.reason)) || '触发失败'))
      if (TIMER_TIMEOUT) TIMER_TIMEOUT(function () { setMsg('') }, 6000)
    }).catch(function () { setBusy(''); setMsg('触发失败') })
  }
  const offline = !st || !!st.offline
  const running = !offline && !!st.running
  const nextMs = (!offline && st && st.next_run_at) ? (new Date(st.next_run_at).getTime() - nowTs) : NaN
  const remS = isNaN(nextMs) ? 0 : Math.max(0, Math.floor(nextMs / 1000))
  const cyc = 900
  const p = running ? 1 : (!isFinite(nextMs) || nextMs <= 0 ? 0 : 1 - Math.min(1, Math.max(0, remS / cyc)))
  const mm = Math.floor(remS / 60), ss = remS % 60
  const ringText = offline ? '离线' : running ? '同步中' : (!isFinite(nextMs) || nextMs <= 0 ? '00:00' : mm + ':' + (ss < 10 ? '0' : '') + ss)
  const ringColor = running ? GREEN : ORANGE
  const cloud = st || {}
  const cloudOk = cloud.success !== false
  const cloudVal = offline ? '离线' : (running ? '进行中' : (cloud.success === true ? '成功 ' + fmtTs(cloud.end_time) : (cloud.success === false ? '失败' : '-')))
  const feishuDefs = [['shelf_sync', '货架'], ['standard_qty_sync', '陈列'], ['procurement_sync', '采购']]
  const feishuStats = feishuDefs.map(function (d) { return st ? st[d[0]] : null })
  const anyFail = feishuStats.some(function (s) { return s && s.success === false })
  const feishuVal = offline ? '离线' : (anyFail ? '异常' : '正常')
  return React.createElement('div', { className: 'bi-sync-bar' },
    React.createElement(BigRing, { p: p, color: ringColor, text: ringText, size: 56, font: 12 }),
    React.createElement('div', { className: 'bi-pill' },
      React.createElement('span', { className: 'bi-dot', style: { background: offline ? GRAY : (running ? GREEN : (cloudOk ? GREEN : RED)) } }),
      React.createElement('span', null, '云平台'),
      React.createElement('span', { className: 'bi-status-val' }, cloudVal),
      React.createElement(SyncRoundBtn, { title: '手动同步', disabled: busy === 'cloud', onClick: function () { act('cloud', 'bi.triggerSync', '已触发云平台同步') } })),
    React.createElement('div', { className: 'bi-pill' },
      React.createElement('span', { className: 'bi-dot', style: { background: offline ? GRAY : (anyFail ? RED : GREEN) } }),
      React.createElement('span', null, '飞书'),
      React.createElement('span', { className: 'bi-status-val' }, feishuVal),
      React.createElement(SyncRoundBtn, { title: '手动同步（货架/陈列/采购）', disabled: busy === 'feishu', onClick: function () { act('feishu', 'bi.triggerFeishuSync', '已触发飞书同步') } })),
    msg ? React.createElement('span', { className: 'bi-set-note' }, msg) : null)
}
var FENCE_ON = false
var FENCE_TIMER = null
var FENCE_IV = null
var FENCE_MAP = new Map()
function bodyTextOf(el) { var pre = el.querySelector ? el.querySelector('pre') : null; return ((pre ? pre.textContent : el.textContent) || '').trim() }
function tryParseFence(txt) {
  try { const s = JSON.parse(txt); return (s && s.kind === 'dashboard') ? s : null } catch (e) {}
  var i = txt.indexOf('{')
  if (i === -1) return null
  try { const s = JSON.parse(txt.slice(i)); return (s && s.kind === 'dashboard') ? s : null } catch (e) { return null }
}
function looksLikeFence(el) {
  var info = el.querySelector('[class*=infostring]')
  if (info && (info.textContent || '').indexOf('dsh-ui') >= 0) return true
  return /\{"kind"\s*:\s*"dashboard"/.test(bodyTextOf(el))
}
function restoreBlock(blk) {
  var rec = FENCE_MAP.get(blk)
  blk.style.display = ''
  blk.removeAttribute('data-bi-fence')
  if (rec && rec.card && rec.card.parentNode) rec.card.remove()
  FENCE_MAP.delete(blk)
}
function buildCardContent(card, data) {
  card.innerHTML = ''
  var titleRow = document.createElement('div'); titleRow.className = 'bi-fence-head'; card.appendChild(titleRow)
  var title = document.createElement('div'); title.className = 'bi-fence-title'; title.style.marginBottom = '0'; title.textContent = (data.title || '') + ' \u00b7 \u9884\u89c8'; titleRow.appendChild(title)
  var saveAll = document.createElement('button'); saveAll.className = 'bi-fence-save'; saveAll.textContent = '全部保存到我的看板'
  saveAll.onclick = function () {
    if (saveAll.disabled || !data.previewId) return
    saveAll.disabled = true
    var n = (data.charts || []).length; var done = 0
    var failN = 0
    for (var i = 0; i < n; i++) { biCall('bi.saveChartFromPreview', { id: data.previewId, index: i }).then(function (r) { if (r && r.ok) done += 1; else failN += 1; if (done + failN >= n) saveAll.textContent = failN ? ('已保存 ' + done + '/' + n + '，失败 ' + failN) : '已全部保存 ✓' }) }
  }
  if (!data.previewId) saveAll.style.display = 'none'
  titleRow.appendChild(saveAll)
  var grid = document.createElement('div'); grid.className = 'bi-fence-grid'; card.appendChild(grid)
  ;(data.charts || []).forEach(function (ch, chIdx) { ch._idx = chIdx
    var cell = document.createElement('div'); cell.className = 'bi-fence-cell'; grid.appendChild(cell)
    var head = document.createElement('div'); head.className = 'bi-fence-head'; cell.appendChild(head)
    var h = document.createElement('div'); h.className = 'bi-cell-title'; h.textContent = ch.title || ''; head.appendChild(h)
    var sb = document.createElement('button'); sb.className = 'bi-fence-save'; sb.textContent = '保存'
    sb.onclick = function () {
      if (sb.disabled) return
      sb.disabled = true
      var sa = {}
      if (data.previewId) sa.id = data.previewId
      sa.index = ch._idx
      biCall('bi.saveChartFromPreview', sa).then(function (r) { if (r && r.ok) sb.textContent = '已保存 ✓'; else { sb.disabled = false; sb.textContent = '保存失败' } }).catch(function () { sb.disabled = false; sb.textContent = '保存失败' })
    }
    head.appendChild(sb)
    if (ch.type === 'kpi') { var k = document.createElement('div'); k.className = 'bi-kpi'; k.textContent = ch.option && ch.option.value != null ? String(ch.option.value) : ''; cell.appendChild(k) }
    else if (ch.type === 'text') { var t = document.createElement('div'); t.className = 'bi-text'; t.textContent = ch.text || ''; cell.appendChild(t) }
    else if (ch.type === 'table') {
      var tb = document.createElement('table'); tb.className = 'bi-table'
      var cols = (ch.option && ch.option.columns) || []; var labels = (ch.option && ch.option.columnLabels) || {}; var rows = (ch.option && ch.option.rows) || []
      var thead = document.createElement('thead'); var trh = document.createElement('tr')
      cols.forEach(function (cl) { var th = document.createElement('th'); th.textContent = labels[cl] || cl; th.title = cl; trh.appendChild(th) }); thead.appendChild(trh); tb.appendChild(thead)
      var tbody = document.createElement('tbody')
      rows.slice(0, 50).forEach(function (r) { var tr = document.createElement('tr'); cols.forEach(function (cl) { var td = document.createElement('td'); td.textContent = r[cl] == null ? '' : String(r[cl]); tr.appendChild(td) }); tbody.appendChild(tr) })
      tb.appendChild(tbody); cell.appendChild(tb)
    }
    else { var dv = document.createElement('div'); dv.className = 'bi-chart'; dv.style.height = '260px'; cell.appendChild(dv); dv.setAttribute('data-pending', '1') }
  })
}
function fillCard(card, pid) {
  var args = {}
  if (pid) args.id = String(pid)
  biCall('bi.renderLatest', args).then(function (d) {
    if (!card.isConnected) return
    if (!d || d.error) { console.debug('[bi-fence] waiting:', pid || '(latest)', d && d.error); return }
    buildCardContent(card, d)
    ensureEcharts(function () {
      card.querySelectorAll('.bi-chart[data-pending]').forEach(function (dv) {
        dv.removeAttribute('data-pending')
        var idx = [].indexOf.call(dv.parentElement.parentElement.parentElement.querySelectorAll('.bi-fence-cell .bi-chart'), dv)
        var ch = (d.charts || [])[idx]
        if (ch && ch.option) { try { window.echarts.init(dv).setOption(toEcharts({ option: ch.option })) } catch (e) {} }
      })
    })
  }).catch(function (e) { console.debug('[bi-fence] rpc fail:', String(e).slice(0, 140)) })
}
function topFences() {
  var out = []
  document.querySelectorAll('.md-code-block').forEach(function (blk) {
    if (blk.parentElement && blk.parentElement.closest('.md-code-block')) return
    out.push(blk)
  })
  document.querySelectorAll('pre>code').forEach(function (code) {
    if ((code.className || '').indexOf('dsh-ui') < 0) return
    var pre = code.closest ? (code.closest('pre') || code) : code
    if (pre.closest && pre.closest('.md-code-block')) return
    out.push(pre)
  })
  return out
}
function scanPass() {
  if (!FENCE_ON || typeof document === 'undefined') return
  Array.from(FENCE_MAP.keys()).forEach(function (blk) {
    var rec = FENCE_MAP.get(blk)
    if (!blk.isConnected) { if (rec.card.parentNode) rec.card.remove(); FENCE_MAP.delete(blk); return }
    if (!looksLikeFence(blk) || tryParseFence(bodyTextOf(blk)) === null) { restoreBlock(blk); return }
    if (rec.card.previousElementSibling !== blk || rec.card.parentElement !== blk.parentElement) blk.after(rec.card)
    if (blk.style.display !== 'none') blk.style.display = 'none'
    var raw = bodyTextOf(blk)
    if (raw !== rec.lastRaw) {
      rec.lastRaw = raw
      var spec = tryParseFence(raw)
      fillCard(rec.card, spec && spec.id)
    }
  })
  topFences().forEach(function (blk) {
    if (FENCE_MAP.has(blk)) return
    var spec = tryParseFence(bodyTextOf(blk))
    if (!spec) return
    blk.setAttribute('data-bi-fence', '1')
    console.debug('[bi-fence] render fence, previewId =', spec.id || '(legacy)')
    var card = document.createElement('div'); card.className = 'bi-fence-card'
    blk.after(card)
    blk.style.display = 'none'
    FENCE_MAP.set(blk, { card: card, lastRaw: bodyTextOf(blk) })
    fillCard(card, spec.id)
  })
}

function fallbackModify(chart) {
  var change = window.prompt('要如何修改图表「' + (chart.title || '') + '」？（此图表没有原始会话记录，请直接在输入框说明）', '')
  if (!change || !change.trim()) return
  var txt = '请修改图表「' + (chart.title || '') + '」（id: ' + chart.id + '，当前类型: ' + chart.type + '）：' + change.trim()
  var copied = false
  try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(txt); copied = true } } catch (e) {}
  if (copied) { if (window.confirm) window.confirm('已复制修改请求，请在下方输入框粘贴发送（或直接打字告诉我）。\n\n' + txt) }
  else if (window.alert) { window.alert('请把下面内容粘贴到输入框发送：\n\n' + txt) }
}
function FilterCard(props) {
  const [vals, setVals] = React.useState([])
  const [hasEmpty, setHasEmpty] = React.useState(false)
  const [kind, setKind] = React.useState('text')
  const [op, setOp] = React.useState((props.initial && props.initial.op) || '=')
  const [draft, setDraft] = React.useState((props.initial && props.initial.value != null && !Array.isArray(props.initial.value)) ? String(props.initial.value) : '')
  const [range, setRange] = React.useState(function () { const v0 = props.initial && props.initial.value; return Array.isArray(v0) ? [String(v0[0] || ''), String(v0[1] || '')] : ['', ''] })
  const [openList, setOpenList] = React.useState(false)
  const [focusIdx, setFocusIdx] = React.useState(0)
  React.useEffect(function () {
    console.log('[bi-fc-debug] effect start col=' + props.column)
    biCall('bi.getFilterValues', { table: props.table, column: props.column }).then(function (r) {
      console.log('[bi-fc-debug] resp col=' + props.column)
      const vs = (r && r.values) || []
      setVals(vs); setHasEmpty(!!(r && r.has_empty))
      const s0 = vs.length ? String(vs[0]) : ''
      console.log('[bi-fc-debug] col=' + props.column + ' s0=' + s0 + ' n=' + vs.length)
      if (!s0) { setKind('text'); return }
      console.log('[bi-fc-debug] col=' + props.column + ' s0=' + s0 + ' n=' + vs.length)
      if (/^\d{4}-\d{2}-\d{2}([T ]|$)/.test(s0)) setKind(s0.length > 10 || s0.indexOf(':') >= 0 ? 'datetime' : 'date')
      else if (vs.every(function (v) { return String(v).trim() !== '' && !isNaN(Number(v)) })) setKind('num')
      else setKind('text')
    }).catch(function (e) { console.log('[bi-fc-debug] catch ' + String(e && e.message || e)) })
  }, [props.table, props.column])
  const sortable = kind === 'num' || kind === 'date' || kind === 'datetime'
  const OPS = [['=', '等于'], ['!=', '不等于'], ['>', '大于'], ['<', '小于'], ['>=', '大于等于'], ['<=', '小于等于']]
  if (sortable) OPS.push(['BETWEEN', '介于'])
  const valueless = op === 'IS_NULL' || op === 'IS_NOT_NULL'
  const between = op === 'BETWEEN'
  const curDraft = between ? (focusIdx === 0 ? range[0] : range[1]) : draft
  const filtered = vals.filter(function (v) { return !curDraft || String(v).toLowerCase().indexOf(curDraft.toLowerCase()) >= 0 }).slice(0, 80)
  const build = function () {
    if (between) { if (!range[0] && !range[1]) return null; if (range[0] && !range[1]) return { column: props.column, op: '>=', value: range[0] }; if (!range[0] && range[1]) return { column: props.column, op: '<=', value: range[1] }; return { column: props.column, op: 'BETWEEN', value: [range[0], range[1]] } }
    if (valueless) return { column: props.column, op: op }
    if (!draft) return null
    return { column: props.column, op: op, value: draft }
  }
  const ph = kind === 'datetime' ? '开始时间' : (kind === 'date' ? '开始日期' : '起始值')
  const ph2 = kind === 'datetime' ? '结束时间' : (kind === 'date' ? '结束日期' : '结束值')
  const boundInput = function (idx) {
    return React.createElement('input', { className: 'bi-fc-input', type: 'text', placeholder: idx === 0 ? ph : ph2, value: range[idx],
      onFocus: function () { setFocusIdx(idx); setOpenList(true) },
      onChange: function (e) { setRange(idx === 0 ? [e.target.value, range[1]] : [range[0], e.target.value]); setOpenList(true) } })
  }
  return React.createElement('div', { className: 'bi-fc' },
    React.createElement('select', { className: 'bi-select bi-fc-op', value: op, onChange: function (e) { setOp(e.target.value) } },
      OPS.map(function (p2) { return React.createElement('option', { key: p2[0], value: p2[0] }, p2[1]) }),
      hasEmpty ? React.createElement('option', { value: 'IS_NULL' }, '为空') : null,
      hasEmpty ? React.createElement('option', { value: 'IS_NOT_NULL' }, '不为空') : null),
    between ? React.createElement('div', { className: 'bi-fc-range' }, boundInput(0), React.createElement('span', { className: 'bi-fc-sep' }, '-'), boundInput(1)) : null,
    !between && !valueless ? React.createElement('div', { className: 'bi-fc-inputwrap' },
      React.createElement('input', { className: 'bi-fc-input', placeholder: '输入或从列表选择（支持模糊）', value: draft, onFocus: function () { setOpenList(true) }, onChange: function (e) { setDraft(e.target.value); setOpenList(true) } })) : null,
    openList && filtered.length ? React.createElement('div', { className: 'bi-fc-list' },
      filtered.map(function (v, vi) { return React.createElement('div', { key: vi, className: 'bi-fc-opt', onClick: function () { if (between) { setRange(focusIdx === 0 ? [String(v), range[1]] : [range[0], String(v)]) } else { setDraft(String(v)) } setOpenList(false) } }, String(v)) })) : null,
    React.createElement('div', { className: 'bi-fc-btns' },
      React.createElement('button', { className: 'bi-menu-item bi-fc-apply', onClick: function () { const f = build(); props.onApply(f || null) } }, '应用'),
      React.createElement('button', { className: 'bi-menu-item', onClick: function () { props.onApply(null) } }, '清除筛选')))
}
function ChartCell(props) { const [chart, setChart] = React.useState(null); const [ready, setReady] = React.useState(false); const [menu, setMenu] = React.useState(false); const [views, setViews] = React.useState([]); const [fOpen, setFOpen] = React.useState(false); const [fField, setFField] = React.useState(''); const [fVals, setFVals] = React.useState([]); const [fBusy, setFBusy] = React.useState(''); const [addBusy, setAddBusy] = React.useState('');
  const reload = function () { const exs = (props.vFilters || []).filter(function (f) { return f && f.column }); biCall('bi.getChart', { id: props.id, extras: exs, extra: props.extraFilter || null }).then(function (d) { if (d && !d.error) setChart(d) }).catch(function () {}) };
  React.useEffect(function () { ensureEcharts(function () { setReady(true) }); reload(); biCall('bi.listViews', {}).then(function (v) { setViews((v || []).filter(function (x) { return x.id !== 1 })) }).catch(function () {}) }, []);
  React.useEffect(function () { reload() }, [props.extraFilter ? (props.extraFilter.column + '=' + props.extraFilter.value) : '', JSON.stringify(props.vFilters || [])]);
  React.useEffect(function () { if (!ready || !chart || typeof window === 'undefined' || !window.echarts) return; var el = document.querySelector('[data-cid="' + chart.id + '"]'); if (el && ['bar', 'line', 'pie'].indexOf(chart.type) >= 0) { try { var opt = toEcharts(chart); var inst = window.echarts.getInstanceByDom(el); if (inst) inst.setOption(opt, true); else window.echarts.init(el).setOption(opt) } catch (e) {} } return function () {} }, [ready, chart]);
  if (!chart) return React.createElement('div', { className: 'bi-cell' }, React.createElement('div', { className: 'bi-empty' }, '加载中'));
  const isKpi = !!props.isKpi; const cellClass = 'bi-cell' + (isKpi ? ' bi-cell-kpi' : '');
  const head = React.createElement('div', { className: 'bi-cell-head' },
    React.createElement('div', { className: 'bi-cell-title', style: { flex: '1', minWidth: '0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, chart.title || ''),
    (chart && chart.filterable && chart.filterable.length) ? React.createElement('button', { className: 'bi-filter-btn' + (chart.user_filter ? ' on' : ''), onClick: function (e) { e.stopPropagation(); setFOpen(!fOpen); if (!fOpen && fField === '') setFField(chart.filterable[0] && (chart.filterable[0].column || chart.filterable[0])) } }, React.createElement(Icon, { d: ICON_FILTER, size: 14 })) : null,
    React.createElement('button', { className: 'bi-cell-more', onClick: function (e) { e.stopPropagation(); setMenu(!menu) } }, React.createElement(Icon, { d: ICON_MORE_V, size: 16 })));
  let menuEl = null; if (menu) {
    const addBtns = views.map(function (v) {
      const state = addBusy === v.id ? 'busy' : (addBusy === 'ok-' + v.id ? 'ok' : (addBusy === 'err-' + v.id ? 'err' : ''))
      const label = state === 'busy' ? '加入中…' : (state === 'ok' ? '已加入' : (state === 'err' ? '加入失败，请重试' : '加入「' + v.name + '」'))
      return React.createElement('button', { key: v.id, className: 'bi-menu-item' + (state === 'err' ? ' danger' : '') + (state === 'ok' ? ' bi-add-ok' : ''), disabled: !!state, style: state === 'ok' ? { color: '#f97316' } : null, onClick: function () {
        if (state) return
        setAddBusy(v.id)
        biCall('bi.addChartToView', { chartId: chart.id, viewId: v.id }).then(function (r) {
          if (r && r.ok) {
            setAddBusy('ok-' + v.id)
            if (props.onViewsChanged) props.onViewsChanged()
            TIMER_TIMEOUT(function () { setAddBusy(''); setMenu(false); if (props.onChange) props.onChange() }, 700)
          } else { setAddBusy('err-' + v.id); TIMER_TIMEOUT(function () { setAddBusy('') }, 1600) }
        }).catch(function () { setAddBusy('err-' + v.id); TIMER_TIMEOUT(function () { setAddBusy('') }, 1600) })
      } }, label)
    });
    const modifyBtn = React.createElement('button', { className: 'bi-menu-item', onClick: function () {
      setMenu(false)
      var origin = props.sessionId || chart.sessionId || ''
      if (!origin || !SESSIONS) { fallbackModify(chart); return }
      var change = window.prompt('要如何修改图表「' + (chart.title || '') + '」？\n（留空则跳转到分支后由模型询问细节）', '')
      SESSIONS.fork({ sessionId: origin }).then(function (childId) {
        if (!childId) { fallbackModify(chart); return }
        SESSIONS.open(childId)
        var delay = TIMER_TIMEOUT(function () {
          biCall('bi.setupChartModificationBranch', { sessionId: childId, chartId: chart.id, chartTitle: chart.title || '', chartType: chart.type || '', change: (change || '').trim() }).catch(function () {})
        }, 1200)
        if (window.confirm) window.confirm('已跳转到制作该图表的原始会话并创建分支「修改图表「' + (chart.title || '') + '」」。模型会接着询问或执行修改。')
      }).catch(function () { fallbackModify(chart) })
    } }, '修改')
    const copyBtn = React.createElement('button', { className: 'bi-menu-item', onClick: function () { setMenu(false); biCall('bi.duplicateChart', { id: chart.id }).then(function (r) { if (r && r.ok) props.onChange() }) } }, '创建副本')
    const delBtn = React.createElement('button', { className: 'bi-menu-item danger', onClick: function () { if (props.curView === 1) { if (window.confirm('彻底删除该图表？（将从所有视图移除）')) biCall('bi.deleteChart', { id: chart.id, viewId: 1 }).then(function () { props.onChange(); if (props.onViewsChanged) props.onViewsChanged() }) } else { biCall('bi.deleteChart', { id: chart.id, viewId: props.curView }).then(function () { props.onChange(); if (props.onViewsChanged) props.onViewsChanged() }) } } }, props.curView === 1 ? '彻底删除' : '从该视图移除')
    menuEl = React.createElement('div', { className: 'bi-menu', style: { width: '200px', boxSizing: 'border-box' } },
      (props.curView === 1 ? null : React.createElement('button', { className: 'bi-menu-item', onClick: function () { setMenu(false); if (props.onToggleLock) props.onToggleLock() } }, props.chartLocked ? '解锁布局' : '锁定布局')),
      (props.curView === 1 || !props.hasCustomPos ? null : React.createElement('button', { className: 'bi-menu-item', onClick: function () { setMenu(false); biCall('bi.clearChartPos', { viewId: props.curView, chartId: chart.id }).then(function () { props.onChange() }).catch(function () {}) } }, '回到默认位置')),
      modifyBtn, copyBtn, delBtn,
      React.createElement('div', { className: 'bi-menu-label' }, '移入视图'),
      addBtns)
  }
  const applyFilter = function (f) { setFBusy(1); biCall('bi.setChartFilter', { id: chart.id, filter: f }).then(function (r) { setFBusy(''); if (r && r.ok) { setFOpen(false); reload() } }).catch(function () { setFBusy('') }) }
  const filterEl = (fOpen && chart && chart.filterable && chart.filterable.length) ? React.createElement('div', { className: 'bi-menu bi-filter-card', style: { left: 'auto', right: '30px', minWidth: '250px' } },
    React.createElement('div', { className: 'bi-menu-label' }, '筛选字段'),
    React.createElement('select', { className: 'bi-select bi-fc-op', value: fField, onChange: function (e) { setFField(e.target.value) } }, chart.filterable.slice().sort(function (a, b) { const la = a.label || a.column || a; const lb = b.label || b.column || b; return String(lb).length - String(la).length }).map(function (f) { const col = f.column || f; const lbl = f.label || f.column || f; return React.createElement('option', { key: col, value: col, title: col }, lbl) })),
    fField ? React.createElement(FilterCard, { table: chart.table, column: fField, initial: chart.user_filter && chart.user_filter.column === fField ? chart.user_filter : null, onApply: function (f) { applyFilter(f) } }) : null) : null
  const body = renderChartBody(chart, chart.id, 0);
  const chartBody = body;
  return React.createElement('div', { className: cellClass, onMouseLeave: function () { setMenu(false); setFOpen(false) } }, head, menuEl, filterEl, chartBody) }
function BigRing(props) {
  const circ = 213.6
  const p = Math.max(0, Math.min(1, props.p || 0))
  return React.createElement('div', { className: 'bi-ring-lg' },
    React.createElement('svg', { width: 84, height: 84, viewBox: '0 0 84 84' },
      React.createElement('circle', { cx: 42, cy: 42, r: 34, fill: 'none', stroke: '#2a2e3d', strokeWidth: 6 }),
      React.createElement('circle', { cx: 42, cy: 42, r: 34, fill: 'none', stroke: props.color || '#f97316', strokeWidth: 6, strokeLinecap: 'round', strokeDasharray: String(circ), strokeDashoffset: String(circ * (1 - p)), transform: 'rotate(-90 42 42)' })),
    React.createElement('div', { className: 'bi-ring-txt' }, props.text))
}
function fmtTs(s) { if (!s) return '-'; try { const d = new Date(s); return (d.getMonth() + 1) + '-' + String(d.getDate()).padStart(2, '0') + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') } catch (e) { return String(s) } }
function dotColor(v) { return v === true ? GREEN : v === false ? RED : GRAY }
function SyncRoundBtn(props) {
  return React.createElement('button', {
    title: props.title || '手动同步',
    disabled: !!props.disabled,
    onClick: props.onClick,
    style: {
      width: '22px', height: '22px', borderRadius: '50%', padding: '0',
      border: '1px solid ' + (props.disabled ? '#2a2e3d' : (props.accent ? '#3d2f1f' : 'var(--dsw-alias-border-l1,#2a2e3d)')),
      background: props.accent ? '#241c10' : 'transparent', color: props.accent || 'var(--dsw-alias-label-secondary,#9fb3d8)',
      cursor: props.disabled ? 'default' : 'pointer', fontSize: '12px', lineHeight: '1',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      flex: 'none', marginLeft: '2px', fontFamily: 'inherit',
      appearance: 'none', outline: 'none', boxShadow: 'none', opacity: props.disabled ? 0.5 : 1,
      transition: 'border-color .15s, color .15s'
    },
    onMouseEnter: function (e) { if (!props.disabled) { e.currentTarget.style.borderColor = '#f97316'; e.currentTarget.style.color = '#f97316' } },
    onMouseLeave: function (e) { if (!props.disabled) { e.currentTarget.style.borderColor = props.accent ? '#3d2f1f' : 'var(--dsw-alias-border-l1,#2a2e3d)'; e.currentTarget.style.color = props.accent || 'var(--dsw-alias-label-secondary,#9fb3d8)' } }
  }, props.disabled ? '…' : '↻')
}
function TableManagerSection(props) {
  const [data, setData] = React.useState(null)
  const [err, setErr] = React.useState('')
  const [busy, setBusy] = React.useState('')
  const [freq, setFreq] = React.useState({})
  const [saved, setSaved] = React.useState('')
  const [st, setSt] = React.useState(null)
  const [nowTs, setNowTs] = React.useState(Date.now())
  const [loginMsg, setLoginMsg] = React.useState('')
  const [feishuOpen, setFeishuOpen] = React.useState(false)
  const [curCfg, setCurCfg] = React.useState({ dataApi: '', statusUrl: '' })
  const [hostInput, setHostInput] = React.useState('')
  const [advOpen, setAdvOpen] = React.useState(false)
  const [statusInput, setStatusInput] = React.useState('')
  const [addrMsg, setAddrMsg] = React.useState('')
  const [addrOk, setAddrOk] = React.useState(null)
  const [editMode, setEditMode] = React.useState(true)
  const [copyTip, setCopyTip] = React.useState('')
  React.useEffect(function () {
    biCall('bi.getConfig', {}).then(function (d) { if (d && !d.error) setCurCfg({ dataApi: d.dataApi || '', statusUrl: d.statusUrl || '' }); setEditMode(!(d && d.dataApi)) }).catch(function () {})
  }, [])
  React.useEffect(function () {
    biCall('bi.getTableConfig', {}).then(function (d) {
      if (d && (d.unreachable || !d.error)) { setData(d); setFreq(d.pipelines || {}) }
      else setErr(String((d && d.error) || '加载失败'))
    }).catch(function (e) { setErr(String((e && e.message) || e)) })
  }, [])
  React.useEffect(function () {
    var dead = false
    function poll() { biCall('bi.getStatus', {}).then(function (d) { if (!dead) setSt(d && d.error ? { offline: true } : d) }).catch(function () { if (!dead) setSt({ offline: true }) }) }
    poll()
    const a = TIMER_INTERVAL(function () { if (!dead) poll() }, 5000)
    const b = TIMER_INTERVAL(function () { if (!dead) setNowTs(Date.now()) }, 1000)
    return function () { dead = true; if (a) a(); if (b) b() }
  }, [])
  const addrInputStyle = { flex: '1', minWidth: '260px', boxSizing: 'border-box', padding: '6px 10px', borderRadius: '8px', border: '1px solid #3d2f1f', background: '#11151d', color: '#e5e9f0', fontSize: '13px', outline: 'none' }
  const fallbackCopy = function (txt) { try { const ta = document.createElement('textarea'); ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta) } catch (e) {} }
  const copyText = function (txt) {
    const done = function () { setCopyTip(txt); if (TIMER_TIMEOUT) TIMER_TIMEOUT(function () { setCopyTip('') }, 1500) }
    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(txt).then(done, function () { fallbackCopy(txt); done() }) } else { fallbackCopy(txt); done() }
  }
  const testCur = function () {
    const url = (editMode && hostInput.trim()) ? hostInput.trim() : curCfg.dataApi
    if (!url) { setAddrOk(false); setAddrMsg('✗ 请先填写地址'); return }
    setAddrMsg('测试中…'); setAddrOk(null)
    biCall('bi.testConnection', { url: url }).then(function (r) {
      if (r && r.ok) { setAddrOk(true); setAddrMsg('✓ 连通' + ((r.tables || 0) ? '（' + r.tables + ' 表）' : '')) }
      else { setAddrOk(false); setAddrMsg('✗ ' + ((r && r.error) || '连接失败')) }
    }).catch(function (e) { setAddrOk(false); setAddrMsg('✗ ' + String((e && e.message) || e)) })
  }
  const saveHost = function () {
    const dataApi = editMode ? hostInput.trim() : curCfg.dataApi
    if (!dataApi) { setAddrOk(false); setAddrMsg('✗ 请先填写地址'); return }
    setAddrMsg('保存中…')
    const payload = { dataApi: dataApi }
    if (advOpen && statusInput.trim()) payload.statusUrl = statusInput.trim()
    biCall('bi.setConfig', payload).then(function (r) {
      if (r && r.ok) { setCurCfg({ dataApi: r.dataApi, statusUrl: r.statusUrl }); setEditMode(false); setHostInput(''); setAddrOk(null); setAddrMsg('已保存'); if (TIMER_TIMEOUT) TIMER_TIMEOUT(function () { setAddrMsg('') }, 3000) }
      else { setAddrOk(false); setAddrMsg('✗ ' + ((r && r.error) || '保存失败')) }
    }).catch(function (e) { setAddrOk(false); setAddrMsg('✗ ' + String((e && e.message) || e)) })
  }
  const toggle = function (t) {
    setBusy(t.table)
    biCall('bi.setTableAccess', { table: t.table, accessible: !t.accessible }).then(function (r) {
      setBusy('')
      if (r && r.ok) setData(function (prev) { return Object.assign({}, prev, { tables: prev.tables.map(function (x) { return x.table === t.table ? Object.assign({}, x, { accessible: !t.accessible }) : x }) }) })
    }).catch(function () { setBusy('') })
  }
  const saveFreq = function (group) {
    setBusy('freq-' + group)
    const minutes = group === 'cloud' ? (freq.cloud && freq.cloud.interval_minutes) : (freq.shelf && freq.shelf.interval_minutes)
    const targets = group === 'cloud' ? ['cloud'] : ['shelf', 'standard_qty', 'procurement']
    Promise.all(targets.map(function (p) { return biCall('bi.setCrawlFrequency', { pipeline: p, minutes: minutes }) })).then(function (rs) {
      setBusy('')
      if (rs.every(function (r) { return r && r.ok })) { setSaved(group); if (TIMER_TIMEOUT) TIMER_TIMEOUT(function () { setSaved('') }, 2000) }
    }).catch(function () { setBusy('') })
  }
  const act = function (kind, rpc, okMsg) {
    setBusy(kind)
    biCall(rpc, {}).then(function (r) {
      setBusy('')
      const ok = !!(r && (r.ok || r.status === 'started'))
      setLoginMsg(ok ? okMsg : String((r && (r.error || r.reason)) || '触发失败'))
      if (TIMER_TIMEOUT) TIMER_TIMEOUT(function () { setLoginMsg('') }, 6000)
    }).catch(function () { setBusy(''); setLoginMsg('触发失败') })
  }
  const triggerLogin = function () { act('login', 'bi.triggerLogin', '浏览器已弹出，请在窗口内完成登录（手机号 → 图形码 → 短信码），成功后自动恢复同步') }
  const syncCloud = function () { act('cloud', 'bi.triggerSync', '已触发云平台同步') }
  const syncFeishu = function () { act('feishu', 'bi.triggerFeishuSync', '已触发飞书同步') }
  const offline = !st || !!st.offline
  const running = !offline && !!st.running
  const nextMs = (!offline && st && st.next_run_at) ? (new Date(st.next_run_at).getTime() - nowTs) : NaN
  const remS = isNaN(nextMs) ? 0 : Math.max(0, Math.floor(nextMs / 1000))
  const cyc = 900
  const p = running ? 1 : (!isFinite(nextMs) || nextMs <= 0 ? 0 : 1 - Math.min(1, Math.max(0, remS / cyc)))
  const mm = Math.floor(remS / 60), ss = remS % 60
  const ringText = offline ? '离线' : running ? '同步中' : (!isFinite(nextMs) || nextMs <= 0 ? '00:00' : mm + ':' + (ss < 10 ? '0' : '') + ss)
  const ringColor = running ? GREEN : ORANGE
  const login = (st && st.login) || {}
  const loginValid = login.state === 'valid'
  const needLogin = login.state === 'invalid' || login.state === 'unknown'
  const cloud = st || {}
  const cloudOk = cloud.success !== false
  const cloudVal = offline ? '离线' : (running ? '进行中' : (cloud.success === true ? '成功 ' + fmtTs(cloud.end_time) : (cloud.success === false ? '失败' : '-')))
  const feishuDefs = [['shelf_sync', '货架信息'], ['standard_qty_sync', '陈列标准'], ['procurement_sync', '采购管理']]
  const feishuStats = feishuDefs.map(function (d) { return st ? st[d[0]] : null })
  const anyFail = feishuStats.some(function (s) { return s && s.success === false })
  const allOk = feishuStats.length === 3 && feishuStats.every(function (s) { return s && s.success === true })
  let latestTs = 0
  feishuStats.forEach(function (s) { if (s && s.checked_at) { const t = Date.parse(s.checked_at); if (t > latestTs) latestTs = t } })
  const feishuVal = offline ? '离线' : (anyFail ? '异常' : allOk ? '成功 ' + fmtTs(latestTs ? new Date(latestTs).toISOString() : null) : '未到期')
  const feishuDot = offline ? GRAY : (anyFail ? RED : GREEN)
  let tableArea = null
  if (err) tableArea = React.createElement('div', { className: 'bi-err' }, '加载失败: ' + err)
  else if (!data) tableArea = React.createElement('div', { className: 'bi-empty', style: { color: '#e5b48a' } }, '加载中')
  else if (data.unreachable) tableArea = React.createElement('div', { className: 'bi-err', style: { color: '#f87171', padding: '10px 2px' } }, '✗ 数据服务不可达——检查数据主机地址或网络后重试')
  return React.createElement('div', { className: 'bi-page bi-set-wrap' },
    React.createElement('div', { className: 'bi-set-dash' },
      React.createElement(BigRing, { p: p, color: ringColor, text: ringText }),
      React.createElement('div', { className: 'bi-pill-col' },
        React.createElement('div', { className: 'bi-pill' },
          React.createElement('span', { className: 'bi-dot', style: { background: offline ? GRAY : (running ? GREEN : (cloudOk ? GREEN : RED)) } }),
          React.createElement('span', null, '云平台'),
          React.createElement('span', { className: 'bi-status-val' }, cloudVal),
          React.createElement(SyncRoundBtn, { title: '手动同步', accent: '#e5b48a', disabled: busy === 'cloud', onClick: syncCloud })),
        React.createElement('div', { className: 'bi-pill' },
          React.createElement('button', { className: 'bi-capsule-btn', onClick: function () { setFeishuOpen(!feishuOpen) } },
            React.createElement('span', { className: 'bi-dot', style: { background: offline ? GRAY : feishuDot } }),
            React.createElement('span', null, '飞书'),
            React.createElement('span', { className: 'bi-status-val' }, feishuVal),
            React.createElement('span', { className: 'bi-chevron' + (feishuOpen ? ' open' : '') }, '▸')),
          React.createElement(SyncRoundBtn, { title: '手动同步（货架/陈列/采购）', accent: '#e5b48a', disabled: busy === 'feishu', onClick: syncFeishu })),
        React.createElement('button', { className: 'bi-pill bi-pill-btn' + (needLogin ? ' bi-set-login-warn' : ''), disabled: busy === 'login', onClick: triggerLogin }, busy === 'login' ? '启动中…' : '一键登录')),
      feishuOpen ? React.createElement('div', { className: 'bi-feishu-detail' },
        feishuDefs.map(function (def) {
          const ps = st ? st[def[0]] : null
          const val = offline ? '离线' : (ps && ps.success === true ? '成功 ' + fmtTs(ps.checked_at) : (ps && ps.success === false ? '失败' : ((ps && ps.detail) || '-')))
          return React.createElement('span', { className: 'bi-status-row', key: def[0] },
            React.createElement('span', { className: 'bi-dot', style: { background: offline ? GRAY : (ps && ps.success === false ? RED : GREEN) } }),
            React.createElement('span', { className: 'bi-status-name' }, def[1]),
            React.createElement('span', { className: 'bi-status-val' }, val))
        })) : null),
    loginMsg ? React.createElement('div', { className: 'bi-set-note', style: { margin: '8px 0', color: '#e5b48a' } }, loginMsg) : null,
    React.createElement('div', { style: { background: 'var(--dsw-alias-bg-layer-1,#161a23)', border: '1px solid #3d2f1f', borderRadius: '12px', padding: '14px 16px', margin: '8px 0' } },
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' } },
        React.createElement('span', { style: { fontSize: '13px', color: '#f97316', flex: 'none' } }, '数据主机'),
        React.createElement('input', { type: 'text', value: editMode ? hostInput : curCfg.dataApi, placeholder: 'http://192.168.1.100:8600', readOnly: !editMode, onChange: function (e) { setHostInput(e.target.value) }, style: Object.assign({}, addrInputStyle, { background: editMode ? '#11151d' : '#0d1017', color: editMode ? '#e5e9f0' : '#e5b48a', borderColor: editMode ? '#f97316' : '#3d2f1f' }) }),
        editMode ? React.createElement('button', { key: 'test', className: 'bi-btn', style: iconBtn, onMouseEnter: iconBtnHover.onMouseEnter, onMouseLeave: iconBtnHover.onMouseLeave, title: '测试连接', disabled: addrMsg === '测试中…', onClick: testCur }, React.createElement(MiniIcon, { d: ICON_BOLT, viewBox: '0 0 1179 1024' })) : null,
        editMode ? React.createElement('button', { key: 'save', className: 'bi-btn', style: iconBtn, onMouseEnter: iconBtnHover.onMouseEnter, onMouseLeave: iconBtnHover.onMouseLeave, title: '保存', disabled: addrMsg === '保存中…', onClick: saveHost }, React.createElement(MiniIcon, { d: ICON_CHECK })) : null,
        !editMode ? React.createElement('button', { key: 'copy', className: 'bi-btn', style: iconBtn, onMouseEnter: iconBtnHover.onMouseEnter, onMouseLeave: iconBtnHover.onMouseLeave, title: '复制地址', onClick: function () { copyText(curCfg.dataApi) } }, React.createElement(MiniIcon, { d: ICON_COPY })) : null,
        !editMode ? React.createElement('button', { key: 'test2', className: 'bi-btn', style: iconBtn, onMouseEnter: iconBtnHover.onMouseEnter, onMouseLeave: iconBtnHover.onMouseLeave, title: '测试连接', disabled: addrMsg === '测试中…', onClick: testCur }, React.createElement(MiniIcon, { d: ICON_BOLT, viewBox: '0 0 1179 1024' })) : null,
        !editMode ? React.createElement('button', { key: 'edit', className: 'bi-btn', style: iconBtn, onMouseEnter: iconBtnHover.onMouseEnter, onMouseLeave: iconBtnHover.onMouseLeave, title: '编辑', onClick: function () { setHostInput(curCfg.dataApi); setEditMode(true) } }, React.createElement(MiniIcon, { d: ICON_EDIT })) : null),
      addrMsg ? React.createElement('div', { style: { marginTop: '6px', fontSize: '12px', color: addrOk === false ? '#f87171' : (addrOk === true ? '#4ade80' : '#e5b48a') } }, addrMsg) : null,
      copyTip ? React.createElement('div', { style: { marginTop: '4px', fontSize: '12px', color: '#4ade80' } }, '已复制') : null,
      React.createElement('div', { style: { marginTop: '8px', fontSize: '12px' } },
        React.createElement('button', { style: { background: 'none', border: 'none', color: '#e5b48a', cursor: 'pointer', padding: '0', fontSize: '12px' }, onMouseEnter: function (e) { e.currentTarget.style.color = '#f97316' }, onMouseLeave: function (e) { e.currentTarget.style.color = '#e5b48a' }, onClick: function () { setAdvOpen(!advOpen); if (!statusInput && curCfg.statusUrl) setStatusInput(curCfg.statusUrl) } },
          (advOpen ? '▾ ' : '▸ ') + '其他'),
        advOpen ? React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' } },
          React.createElement('span', { style: { fontSize: '12px', color: '#e5b48a', flex: 'none' } }, '状态服务'),
          React.createElement('input', { type: 'text', value: statusInput, placeholder: 'http://192.168.1.100:8080', onChange: function (e) { setStatusInput(e.target.value) }, style: addrInputStyle }),
          React.createElement('button', { className: 'bi-btn', style: iconBtn, onMouseEnter: iconBtnHover.onMouseEnter, onMouseLeave: iconBtnHover.onMouseLeave, title: '保存', disabled: addrMsg === '保存中…', onClick: saveHost }, React.createElement(MiniIcon, { d: ICON_CHECK }))) : null)),
    tableArea == null ? React.createElement(React.Fragment, null,
      React.createElement('div', { className: 'bi-set-h2' }, '数据表访问开关'),
    React.createElement('table', { className: 'bi-set-table' },
      React.createElement('thead', null, React.createElement('tr', null,
        React.createElement('th', null, '数据表'), React.createElement('th', null, '说明'), React.createElement('th', null, '允许访问'))),
      React.createElement('tbody', null, data.tables.map(function (t) {
        return React.createElement('tr', { key: t.table },
          React.createElement('td', { title: t.table }, t.title || t.table),
          React.createElement('td', { style: { maxWidth: '360px' } }, t.description || ''),
          React.createElement('td', null, React.createElement('button', {
            role: 'switch', 'aria-checked': t.accessible ? 'true' : 'false',
            disabled: busy === t.table,
            onClick: function () { toggle(t) },
            style: {
              position: 'relative', display: 'inline-block', boxSizing: 'border-box',
              width: '42px', height: '24px', borderRadius: '12px', padding: '0',
              cursor: busy === t.table ? 'default' : 'pointer',
              background: t.accessible ? '#f97316' : '#3a4152',
              border: '1px solid ' + (t.accessible ? '#f97316' : '#2a2e3d'),
              transition: 'background .2s, border-color .2s',
              opacity: busy === t.table ? 0.5 : 1,
              flex: 'none', verticalAlign: 'middle', outline: 'none', appearance: 'none', boxShadow: 'none'
            }
          }, React.createElement('span', {
            style: {
              position: 'absolute', top: '2px', left: t.accessible ? '21px' : '2px',
              width: '18px', height: '18px', borderRadius: '50%', background: '#fff',
              transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.35)'
            }
          }))))
      }))),
    React.createElement('div', { className: 'bi-set-h2' }, '抓取频率（分钟）'),
    React.createElement('div', { className: 'bi-set-freq' },
      React.createElement('span', { style: { minWidth: '80px', fontSize: '13px' } }, '云平台'),
      React.createElement('input', {
        type: 'number', min: 1, value: freq.cloud && freq.cloud.interval_minutes != null ? String(freq.cloud.interval_minutes) : '',
        onChange: function (e) { const v = e.target.value; setFreq(function (prev) { const n = Object.assign({}, prev); n.cloud = Object.assign({}, prev.cloud || {}, { interval_minutes: v }); return n }) }
      }),
      React.createElement('button', { className: 'bi-btn', disabled: busy === 'freq-cloud', onClick: function () { saveFreq('cloud') } }, busy === 'freq-cloud' ? '保存中' : (saved === 'cloud' ? '已保存 ✓' : '保存')),
      React.createElement('span', { className: 'bi-set-note', style: { color: '#e5b48a' } }, '商品 / 订单 / 库存 / 用户')),
    React.createElement('div', { className: 'bi-set-freq' },
      React.createElement('span', { style: { minWidth: '80px', fontSize: '13px' } }, '飞书'),
      React.createElement('input', {
        type: 'number', min: 1, value: freq.shelf && freq.shelf.interval_minutes != null ? String(freq.shelf.interval_minutes) : '',
        onChange: function (e) { const v = e.target.value; setFreq(function (prev) { const n = Object.assign({}, prev); n.shelf = Object.assign({}, prev.shelf || {}, { interval_minutes: v }); return n }) }
      }),
      React.createElement('button', { className: 'bi-btn', disabled: busy === 'freq-feishu', onClick: function () { saveFreq('feishu') } }, busy === 'freq-feishu' ? '保存中' : (saved === 'feishu' ? '已保存 ✓' : '保存')),
      React.createElement('span', { className: 'bi-set-note', style: { color: '#e5b48a' } }, '同时作用于货架 / 陈列标准 / 采购三条管线'))
    ) : tableArea)
}
function VfValues(props) {
  const [vals, setVals] = React.useState([])
  React.useEffect(function () { if (!props.table || !props.column) return; biCall('bi.getFilterValues', { table: props.table, column: props.column }).then(function (r) { setVals((r && r.values) || []) }).catch(function () { setVals([]) }) }, [props.table, props.column])
  return React.createElement('select', { className: 'bi-select bi-vfval', defaultValue: '' },
    React.createElement('option', { value: '' }, vals.length ? '选择值…' : '（无可选值）'),
    vals.map(function (v) { return React.createElement('option', { key: String(v), value: String(v) }, String(v)) }))
}
function FreeLayoutView(props) {
  const [dragPos, setDragPos] = React.useState(null)
  const [resizePos, setResizePos] = React.useState(null)
  const [guides, setGuides] = React.useState(null)
  const charts = props.charts || []
  const kpis = charts.filter(function (c) { return c.type === 'kpi' })
  const stds = charts.filter(function (c) { return c.type !== 'kpi' })
  const W = (function () { try { const el = document.querySelector('.bi-viewbar'); return el && el.clientWidth > 400 ? el.clientWidth : 1200 } catch (e) { return 1200 } })()
  const g = 16
  const c1 = Math.round((W - 2 * g) * 0.25)
  const c23 = Math.round((W - 2 * g) * 0.375)
  const slotPos = function (c) {
    const ki = kpis.indexOf(c)
    if (ki >= 0) return { x: 0, y: ki * 126, w: c1, h: 110 }
    const si = stds.indexOf(c); const col = si % 2, row = Math.floor(si / 2)
    return { x: c1 + g + col * (c23 + g), y: row * 336, w: c23, h: 320 }
  }
  const rectHit = function (a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y }
  const findFreeSlot = function (c) {
    const occupied = []
    charts.forEach(function (cc) { if (cc.id === c.id) return; occupied.push(props.chartPos[cc.id] || slotPos(cc)) })
    const cands = [slotPos(c)]
    if (c.type === 'kpi') { for (let r = 0; r < 10; r++) cands.push({ x: 0, y: r * 126, w: c1, h: 110 }) }
    else { for (let r = 0; r < 10; r++) { cands.push({ x: c1 + g, y: r * 336, w: c23, h: 320 }); cands.push({ x: c1 + g + c23 + g, y: r * 336, w: c23, h: 320 }) } }
    const fb = occupied.reduce(function (m, p) { return Math.max(m, p.y + p.h) }, 0) + 360
    cands.push({ x: 0, y: fb, w: c.type === 'kpi' ? c1 : c23, h: c.type === 'kpi' ? 110 : 320 })
    for (let i = 0; i < cands.length; i++) {
      let hit = false
      for (let j = 0; j < occupied.length; j++) { if (rectHit(cands[i], occupied[j])) { hit = true; break } }
      if (!hit) return cands[i]
    }
    return cands[cands.length - 1]
  }
  const posOf = function (c) { return props.chartPos[c.id] || findFreeSlot(c) }
  const maxBottom = charts.reduce(function (m, c) { const p = posOf(c); return Math.max(m, p.y + p.h) }, 400)
  const snapT = 6
  const buildSnaps = function (id) {
    const xs = []; const ys = []
    charts.forEach(function (cc) { if (cc.id === id) return; const p = posOf(cc); xs.push(p.x, p.x + p.w / 2, p.x + p.w); ys.push(p.y, p.y + p.h / 2, p.y + p.h) })
    return { xs: xs, ys: ys }
  }
  const trySnap = function (val, myEdges, lines) {
    for (let i = 0; i < myEdges.length; i++) {
      for (let j = 0; j < lines.length; j++) {
        if (Math.abs(myEdges[i] - lines[j]) <= snapT) return { v: lines[j] - (myEdges[i] - val), line: lines[j] }
      }
    }
    return null
  }
  const startDrag = function (e, id, base) {
    e.preventDefault()
    const sx = e.clientX, sy = e.clientY; const ox = base.x, oy = base.y
    const sn = buildSnaps(id)
    let othersBottom = 0
    charts.forEach(function (cc) { if (cc.id === id) return; const p = posOf(cc); othersBottom = Math.max(othersBottom, p.y + p.h) })
    const maxY = Math.max(360, othersBottom + 360)
    const maxX = Math.max(0, W - base.w)
    const move = function (ev) {
      let nx = Math.max(0, Math.min(ox + ev.clientX - sx, maxX))
      let ny = Math.max(0, Math.min(oy + ev.clientY - sy, maxY))
      let gx = null, gy = null
      const sr = trySnap(nx, [nx, nx + base.w / 2, nx + base.w], sn.xs)
      if (sr) { nx = Math.max(0, Math.min(sr.v, maxX)); gx = sr.line }
      const sr2 = trySnap(ny, [ny, ny + base.h / 2, ny + base.h], sn.ys)
      if (sr2) { ny = Math.max(0, Math.min(sr2.v, maxY)); gy = sr2.line }
      setDragPos({ id: id, x: nx, y: ny })
      setGuides({ x: gx, y: gy })
    }
    const up = function () {
      document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up)
      setGuides(null)
      setDragPos(function (p2) { const cur = p2; if (cur && cur.id === id) { props.onSetPos(id, { x: cur.x, y: cur.y, w: base.w, h: base.h }) } return null })
    }
    document.addEventListener('mousemove', move); document.addEventListener('mouseup', up)
  }
  const startResize = function (e, id, base) {
    e.preventDefault(); e.stopPropagation()
    const sx = e.clientX, sy = e.clientY
    const sn = buildSnaps(id)
    const move = function (ev) {
      let nw = Math.max(120, Math.min(base.w + ev.clientX - sx, Math.max(120, W - base.x)))
      let nh = Math.max(80, Math.min(base.h + ev.clientY - sy, 800))
      let gx = null, gy = null
      const sr = trySnap(base.x + nw, [base.x + nw], sn.xs)
      if (sr) { nw = Math.max(120, Math.min(sr.v - base.x, W - base.x)); gx = sr.line }
      const sr2 = trySnap(base.y + nh, [base.y + nh], sn.ys)
      if (sr2) { nh = Math.max(80, Math.min(sr2.v - base.y, 800)); gy = sr2.line }
      setResizePos({ id: id, w: nw, h: nh })
      setGuides({ x: gx, y: gy })
    }
    const up = function () {
      document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up)
      setGuides(null)
      setResizePos(function (p2) { const cur = p2; if (cur && cur.id === id) { props.onSetPos(id, { x: base.x, y: base.y, w: cur.w, h: cur.h }) } return null })
    }
    document.addEventListener('mousemove', move); document.addEventListener('mouseup', up)
  }
  return React.createElement('div', { className: 'bi-free-wrap', style: { height: maxBottom + 'px' } },
    guides && guides.x != null ? React.createElement('div', { className: 'bi-guide bi-guide-x', style: { left: guides.x + 'px' } }) : null,
    guides && guides.y != null ? React.createElement('div', { className: 'bi-guide bi-guide-y', style: { top: guides.y + 'px' } }) : null,
    charts.map(function (c) {
      const p = posOf(c)
      const dp = dragPos && dragPos.id === c.id ? dragPos : null
      const rp = resizePos && resizePos.id === c.id ? resizePos : null
      const pos = Object.assign({}, p, dp || {}, rp ? { w: rp.w, h: rp.h } : {})
      const locked = props.forceLocked ? true : (c.locked === true ? true : (c.locked === false ? false : !!props.globalLocked))
      return React.createElement('div', { key: c.id, 'data-id': c.id, className: 'bi-free-item' + (dragPos && dragPos.id === c.id ? ' dragging' : ''), style: { left: pos.x + 'px', top: pos.y + 'px', width: pos.w + 'px', height: pos.h + 'px', zIndex: dp ? 50 : undefined },
        onMouseDown: function (e) { const t = e.target; if (!locked && !dp && t && t.closest && t.closest('.bi-cell-title')) startDrag(e, c.id, p) } },
      React.createElement(ChartCell, { id: c.id, curView: props.curView, isKpi: c.type === 'kpi', onChange: props.onReload, onViewsChanged: props.onViewsChanged, sessionId: c.session_id || '', vFilters: props.vFilters, freeMode: true, hasCustomPos: !!props.chartPos[c.id], chartLocked: locked, onToggleLock: function () { props.onToggleLock(c.id, locked) } }),
      !locked ? React.createElement('div', { className: 'bi-resize-h', onMouseDown: function (e) { startResize(e, c.id, pos) } }) : null)
    }))
}
function BiView(props) { if (props && props.sessionId) { CURRENT_SESSION_ID = String(props.sessionId) } const [list, setList] = React.useState(null); const [views, setViews] = React.useState([]); const [curView, setCurView] = React.useState(1); const [openMenu, setOpenMenu] = React.useState(null); const [dragIdx, setDragIdx] = React.useState(null); const [err, setErr] = React.useState(''); const [refreshTick, setRefreshTick] = React.useState(0); const [q, setQ] = React.useState(''); const [vFilters, setVFilters] = React.useState([]); const [vfOpen, setVfOpen] = React.useState(''); const [vfField, setVfField] = React.useState(''); const [vfBusy, setVfBusy] = React.useState(''); const [vfOp, setVfOp] = React.useState('='); const [layoutMenu, setLayoutMenu] = React.useState(false); const [vfValDraft, setVfValDraft] = React.useState({}); const [freeMode, setFreeMode] = React.useState(false); const [chartPos, setChartPos] = React.useState({}); const [layoutLocked, setLayoutLocked] = React.useState(false); const loadViews = function () { biCall('bi.listViews', {}).then(function (v) { setViews(v || []) }).catch(function () {}) }; const load = function () { biCall('bi.listCharts', { viewId: curView }).then(function (d) { setList((d && d.charts) || []); setFreeMode(!!(d && d.free_layout)); setChartPos((d && d.chart_pos) || {}); setVFilters((d && d.filters) || []); setLayoutLocked(!!(d && d.layout_locked)); setTimeout(resizeCharts, 80); loadViews() }).catch(function (e) { setErr(String(e && e.message || e)) }) }; React.useEffect(function () { loadViews(); load() }, [curView, refreshTick]); React.useEffect(function () { const h = function (e) { if (!(e.ctrlKey || e.metaKey) || String(e.key || '').toLowerCase() !== 'z') return; const t = e.target; const tag = t && t.tagName ? String(t.tagName).toLowerCase() : ''; if (tag === 'input' || tag === 'textarea' || tag === 'select' || (t && t.isContentEditable)) return; e.preventDefault(); biCall('bi.undoLayout', {}).then(function (r) { if (r && r.ok) { setRefreshTick(function (t2) { return t2 + 1 }) } }).catch(function () {}) }; window.addEventListener('keydown', h); return function () { window.removeEventListener('keydown', h) } }, [curView, refreshTick]); React.useEffect(function () { const h = function () { setRefreshTick(function (t) { return t + 1 }) }; window.addEventListener('resize', h); return function () { window.removeEventListener('resize', h) } }, []); React.useEffect(function () { if (!layoutMenu) return; const h = function (e) { const t = e.target; if (!(t && t.closest && t.closest('.bi-layout-wrap'))) setLayoutMenu(false) }; document.addEventListener('mousedown', h); return function () { document.removeEventListener('mousedown', h) } }, [layoutMenu]); const newView = function () { var name = window.prompt('新视图名称'); if (name && name.trim()) biCall('bi.createView', { name: name.trim() }).then(function () { loadViews() }) }; const renameView = function (v) { var n = window.prompt('重命名视图', v.name); if (n && n.trim()) biCall('bi.renameView', { id: v.id, name: n.trim() }).then(function () { loadViews() }) }; const deleteView = function (v) { if (window.confirm('删除视图「' + v.name + '」？')) biCall('bi.deleteView', { id: v.id }).then(function () { setCurView(1); loadViews() }) }; const onDragStart = function (idx) { setDragIdx(idx) }; const onDragOver = function (e, idx) { e.preventDefault(); if (dragIdx === null || dragIdx === idx) return; setViews(function (prev) { const next = prev.slice(); const moved = next.splice(dragIdx, 1)[0]; next.splice(idx, 0, moved); setDragIdx(idx); biCall('bi.reorderViews', { ids: next.map(function (v) { return v.id }) }).catch(function () {}); return next }) }; const onDrop = function () { setDragIdx(null) }; const resizeCharts = function () { try { if (!window.echarts) return; document.querySelectorAll('.bi-chart').forEach(function (el2) { const inst = window.echarts.getInstanceByDom(el2); if (inst) inst.resize() }) } catch (e) {} };
  const filterFields = (function () {
    const byCol = {}
    ;(list || []).forEach(function (c) { (c.filterable || []).forEach(function (f) { if (!byCol[f.column]) byCol[f.column] = { column: f.column, label: f.label || f.column, table: c.table } }) })
    const arr = Object.keys(byCol).map(function (k) { return byCol[k] })
    arr.sort(function (a, b) { return b.label.length - a.label.length })
    return arr
  })(); const maxFieldLen = filterFields.reduce(function (m, f) { return Math.max(m, (f.label || '').length) }, 0); const searchedList = (list || []).filter(function (c) { return !q || (c.title || '').toLowerCase().indexOf(q.toLowerCase()) >= 0 }); return React.createElement('div', { className: 'bi-page' },
    React.createElement(SyncBar, {}),
    React.createElement('div', { className: 'bi-vtabs' }, views.map(function (v, idx) { const on = curView === v.id; return React.createElement('div', { key: v.id, className: 'bi-tab' + (on ? ' bi-tab-on' : '') + (dragIdx === idx ? ' bi-tab-dragging' : ''), draggable: true, onDragStart: function () { onDragStart(idx) }, onDragOver: function (e) { onDragOver(e, idx) }, onDrop: onDrop }, React.createElement('button', { className: 'bi-tab-label', onClick: function () { setCurView(v.id) } }, v.name + ' (' + v.count + ')'), v.id !== 1 ? React.createElement('button', { className: 'bi-tabmore', title: '更多', onClick: function (e) { e.stopPropagation(); setOpenMenu(openMenu === v.id ? null : v.id) } }, React.createElement(Icon, { d: ICON_MORE_V, size: 14 })) : null, (v.id !== 1 && openMenu === v.id) ? React.createElement('div', { className: 'bi-tabmenu' }, React.createElement('div', { className: 'bi-menu-label' }, '视图操作'), React.createElement('button', { className: 'bi-menu-item', onClick: function () { setOpenMenu(null); renameView(v) } }, '重命名'), React.createElement('button', { className: 'bi-menu-item danger', onClick: function () { setOpenMenu(null); deleteView(v) } }, '删除')) : null) }), React.createElement('button', { className: 'bi-add', title: '新建视图', onClick: newView }, React.createElement(Icon, { d: ICON_ADD, size: 16 })), React.createElement('button', { className: 'bi-btn', title: '重新加载图表与视图列表', style: { marginLeft: 'auto' }, onClick: function () { setRefreshTick(function (t) { return t + 1 }); load(); loadViews() } }, '刷新'),
      (curView !== 1 ? React.createElement('div', { className: 'bi-layout-wrap', style: { position: 'relative', marginLeft: 6 } },
        React.createElement('button', { className: 'bi-btn', style: freeMode ? { borderColor: '#f97316', color: '#f97316' } : null, title: '当前布局状态；点击打开布局操作（默认布局 / 锁定布局），Ctrl+Z 撤销调整', onClick: function () { setLayoutMenu(function (o) { return !o }) } }, freeMode ? '自定义布局' : '默认布局'),
        layoutMenu ? React.createElement('div', { className: 'bi-tabmenu', style: { minWidth: '200px' } },
          React.createElement('div', { className: 'bi-menu-label' }, '布局操作'),
          React.createElement('button', { className: 'bi-menu-item', onClick: function () { setLayoutMenu(false); setVfBusy('lock'); biCall('bi.resetViewLayout', { viewId: curView }).then(function () { setVfBusy(''); setRefreshTick(function (t) { return t + 1 }) }).catch(function () { setVfBusy('') }) } }, '默认布局'),
          React.createElement('button', { className: 'bi-menu-item', onClick: function () { setLayoutMenu(false); setVfBusy('lock'); biCall('bi.setLayoutLock', { locked: !layoutLocked }).then(function () { setVfBusy(''); load() }).catch(function () { setVfBusy('') }) } }, layoutLocked ? '解锁布局' : '锁定布局'),
          React.createElement('div', { className: 'bi-menu-label' }, '拖卡片标题栏移动，右下角圆弧缩放'),
          React.createElement('div', { className: 'bi-menu-label' }, 'Ctrl+Z 可撤销上一步布局调整')) : null) : null)), err ? React.createElement('div', { className: 'bi-err' }, err) : null,
    React.createElement('div', { className: 'bi-viewbar' },
      React.createElement('input', { className: 'bi-search', placeholder: '搜索图表', value: q, onChange: function (e) { setQ(e.target.value) } }),
      filterFields.map(function (ff) {
        const active = vFilters.filter(function (f) { return f.column === ff.column })[0]
        const open = vfOpen === ff.column
        return React.createElement('div', { className: 'bi-pill' + (active ? ' on' : ''), key: ff.column, style: { justifyContent: 'flex-start' } },
          React.createElement('button', { className: 'bi-pill-btn', title: ff.column, style: { border: 'none', background: 'transparent', padding: 0, minHeight: 0, color: 'inherit', flex: '1', justifyContent: 'flex-start' }, onClick: function () { setVfOpen(open ? '' : ff.column); setVfOp('='); setVfValDraft(function (p2) { const n = Object.assign({}, p2); n[ff.column] = active ? active.value : ''; return n }) } },
            React.createElement('span', null, ff.label),
            React.createElement('span', { className: 'bi-status-val' }, active ? ': ' + (Array.isArray(active.value) ? active.value[0] + '~' + active.value[1] : String(active.value).slice(0, 10)) : '')),
          open ? React.createElement('div', { className: 'bi-vf-row bi-filter-card', style: { minWidth: '250px' } },
            React.createElement(FilterCard, { table: ff.table, column: ff.column, initial: active ? { column: ff.column, op: active.op || '=', value: active.value } : null, onApply: function (f) {
              setVfBusy(ff.column)
              biCall('bi.setViewFilter', { viewId: curView, column: ff.column, op: f ? f.op : '=', value: f ? f.value : '' }).then(function () { setVfBusy(''); load() }).catch(function () { setVfBusy('') })
            } })) : null)
      }),
    ),
    list === null ? React.createElement('div', { className: 'bi-empty' }, '加载中') : (searchedList.length === 0 ? React.createElement('div', { className: 'bi-empty' }, q ? '没有匹配「' + q + '」的图表' : '该视图下没有图表。在「全部」生成保存看板后，可用图表「更多」菜单添加到当前视图。') : React.createElement(FreeLayoutView, { charts: searchedList, curView: curView, chartPos: chartPos, vFilters: vFilters, forceLocked: curView === 1, globalLocked: layoutLocked, onReload: load, onViewsChanged: loadViews, onSetPos: function (id, pos) { biCall('bi.setChartPos', { viewId: curView, chartId: id, pos: pos }).then(function () { load(); setTimeout(resizeCharts, 60) }).catch(function () {}) }, onToggleLock: function (id, curLocked) { biCall('bi.setChartLockToggle', { viewId: curView, chartId: id, locked: !curLocked }).then(function () { load() }).catch(function () {}) } }))) }
exports.inject = ['slots'];
exports.apply = function apply(ctx) { injectCss(); SESSIONS = ctx.get('sessions'); TIMER_INTERVAL = biTimerInterval;
      TIMER_TIMEOUT = biTimerTimeout;
      ctx.effect(function () { return function () { BI_TIMERS.forEach(function (id) { try { window.clearInterval(id) } catch (e) {} try { window.clearTimeout(id) } catch (e2) {} }) } }); ctx.effect(function () {
        FENCE_ON = true
        scanPass()
        var mo = typeof MutationObserver !== 'undefined' ? new MutationObserver(function () {
          if (FENCE_TIMER) { try { FENCE_TIMER() } catch (e) {} }
          FENCE_TIMER = TIMER_TIMEOUT(scanPass, 400)
        }) : null
        if (mo) mo.observe(document.body, { childList: true, subtree: true, characterData: true })
        var iv = TIMER_INTERVAL(scanPass, 2000); if (iv) FENCE_IV = iv
        return function () { FENCE_ON = false; if (mo) mo.disconnect(); if (FENCE_TIMER) { try { FENCE_TIMER() } catch (e) {} }; if (FENCE_IV) { try { FENCE_IV() } catch (e) {} } }
      })
      ctx.effect(function () {
        const tintIcon = function () {
          try {
            document.querySelectorAll('button').forEach(function (btn) {
              if ((btn.textContent || '').trim() !== '无人超市') return
              const svg = btn.querySelector('svg')
              if (svg && svg.getAttribute('data-bi-tint') !== '1') { svg.style.color = '#f97316'; svg.setAttribute('data-bi-tint', '1') }
                const lbl = btn.querySelector('span')
                if (lbl) lbl.style.color = '#f97316'
            })
          } catch (e) {}
        }
        tintIcon()
        const iv = TIMER_INTERVAL(tintIcon, 1500)
        return function () { if (iv) iv() }
      })
      const slots = ctx.get('slots'); if (!slots) return; slots.inject('settings.section', function () { return slots.register({ name: 'settings.section', id: 'bi-tables', order: 60, label: '无人超市' }, TableManagerSection) }); slots.inject('conversation.view', function () { return slots.register({ name: 'conversation.view', id: 'bi-dashboards', priority: 50, order: 900, label: '我的看板' }, function (props) { return React.createElement(BiView, { sessionId: props.sessionId }) }) })
}
return module.exports;
  }
});

