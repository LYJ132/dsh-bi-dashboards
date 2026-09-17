#!/usr/bin/env python3
"""看板状态服务器（:8080）。

审计整改要点（fix-20260917-p2-webops）：
- 默认仅绑定 127.0.0.1；确需放行局域网时用环境变量 BI_STATUS_HOST=0.0.0.0 显式打开
  （无鉴权，仅限可信网络，见 A5；鉴权本身超出本次范围）。
- GET 只服务显式白名单（index.html / status.json / status_history.json），
  无目录列表；server.py、pid、log、lock 等一律 404。
- /run、/runfeishu、/runlogin 三个触发端点共用同一按 job 键控的在飞守卫；
  并发触发返回 202 {"busy": true}（宿主包 P3 依赖此契约，已去掉宿主侧冷却）。
- subprocess 返回码检查，stdout/stderr 尾部写入 status.json 的 manual_runs 字段。
- 飞书同步的 PG_DSN 只从环境读取；缺失时中止并在 status 记录明确错误，不再回退硬编码目标。
- 飞书日志 5MB x3 轮转（server.log 的轮转在 start.sh 完成），杜绝 /tmp 无限追加。
"""
import os, sys, json, subprocess, threading, time
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, unquote

BASE = os.path.dirname(os.path.abspath(__file__))
PROJECT = os.path.dirname(os.path.dirname(BASE))  # web/ 已移入 bi-plugin/，仓库根在其上两级

STATUS_FILE = os.path.join(BASE, "status.json")
FEISHU_LOG = os.environ.get("BI_FEISHU_LOG", "/tmp/bi-feishu-sync.log")
LOG_MAX_BYTES = 5 * 1024 * 1024
LOG_BACKUPS = 3
TAIL_CHARS = 2000

# 静态服务白名单（仅这些文件名；其余路径 404，不做目录列表）
SERVE_WHITELIST = {"index.html", "status.json", "status_history.json"}
SERVE_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".json": "application/json",
}

# ---- 在飞守卫：三个触发端点共用的同一机制，按 job 键控 ----
# 值为守卫有效期（子进程 timeout 的安全上界；正常路径在 finally 里释放，
# 过期兜底仅防线程/进程异常死亡导致永久 busy）。
JOBS = {
    "sync": 6 * 60,      # sync_cloud_to_db.py timeout=300s
    "feishu": 31 * 60,   # 3 条飞书脚本各 timeout=600s
    "login": 16 * 60,    # login_helper.py timeout=15min
}
_inflight = {}
_inflight_lock = threading.Lock()


def _job_busy(job):
    """返回该 job 是否正忙；不忙时原子地登记为在飞（检查+置位同锁内）。"""
    with _inflight_lock:
        at = _inflight.get(job)
        if at is not None and (time.time() - at) < JOBS[job]:
            return True
        _inflight[job] = time.time()
        return False


def _job_done(job):
    with _inflight_lock:
        _inflight.pop(job, None)


# ---- status.json 更新（读-合并-原子写，仅动 manual_runs 子树）----
_status_lock = threading.Lock()


def _tail(text):
    return (text or "")[-TAIL_CHARS:]


def _record_manual(job, entry):
    entry = dict(entry)
    entry["finished_at"] = time.strftime("%Y-%m-%dT%H:%M:%S%z")
    with _status_lock:
        st = {}
        try:
            with open(STATUS_FILE, encoding="utf-8") as f:
                st = json.load(f)
            if not isinstance(st, dict):
                st = {}
        except Exception:
            st = {}
        st.setdefault("manual_runs", {})[job] = entry
        tmp = "%s.tmp.%d" % (STATUS_FILE, os.getpid())
        try:
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(st, f, ensure_ascii=False, indent=1)
            os.replace(tmp, STATUS_FILE)
        except OSError:
            try:
                os.remove(tmp)
            except OSError:
                pass


# ---- 大小轮转日志（5MB x3），杜绝无界追加 ----
def _rotate_log(path):
    try:
        if not os.path.exists(path) or os.path.getsize(path) < LOG_MAX_BYTES:
            return
        oldest = "%s.%d" % (path, LOG_BACKUPS)
        if os.path.exists(oldest):
            os.remove(oldest)
        for i in range(LOG_BACKUPS - 1, 0, -1):
            src, dst = "%s.%d" % (path, i), "%s.%d" % (path, i + 1)
            if os.path.exists(src):
                os.replace(src, dst)
        os.replace(path, "%s.1" % path)
    except OSError:
        pass


def _append_log(path, text):
    _rotate_log(path)
    try:
        with open(path, "a", encoding="utf-8") as f:
            f.write(text)
    except OSError:
        pass


class Handler(BaseHTTPRequestHandler):
    def handle(self):
        # 浏览器刷新/关闭导致的断连异常只影响当前线程,不应打断其他请求
        try:
            super().handle()
        except (BrokenPipeError, ConnectionResetError):
            pass

    # ---- 静态服务：白名单外一律 404 ----
    def _allowed_file(self):
        """请求路径映射到白名单内且实际存在的文件绝对路径，否则 None。"""
        try:
            path = unquote(urlparse(self.path).path)
        except Exception:
            return None
        name = "index.html" if path in ("", "/") else path.lstrip("/")
        if name not in SERVE_WHITELIST:
            return None
        fp = os.path.join(BASE, name)
        return fp if os.path.isfile(fp) else None

    def _serve_file(self, fp, with_body):
        try:
            with open(fp, "rb") as f:
                data = f.read()
        except OSError:
            self.send_error(404)
            return
        self.send_response(200)
        self.send_header("Content-Type",
                         SERVE_TYPES.get(os.path.splitext(fp)[1], "application/octet-stream"))
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        if with_body:
            self.wfile.write(data)

    def do_GET(self):
        fp = self._allowed_file()
        if fp is None:
            self.send_error(404)
        else:
            self._serve_file(fp, True)

    def do_HEAD(self):
        fp = self._allowed_file()
        if fp is None:
            self.send_error(404)
        else:
            self._serve_file(fp, False)

    # ---- 触发端点 ----
    def do_POST(self):
        route = urlparse(self.path).path
        if route == "/run":
            self.run_sync()
        elif route == "/runfeishu":
            self.run_feishu()
        elif route == "/runlogin":
            self.run_login()
        else:
            self.send_error(404)

    def _respond(self, code, payload):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(payload).encode())

    def _busy(self):
        # 跨包契约（宿主 P3）：并发触发 → 202 {"busy": true}
        self._respond(202, {"busy": True})

    def run_sync(self):
        if _job_busy("sync"):
            self._busy()
            return
        try:
            with open(STATUS_FILE, encoding="utf-8") as f:
                st = json.load(f)
        except Exception:
            st = {}
        if st.get("paused_reason") or (st.get("login") or {}).get("state") in ("invalid", "renewing"):
            _job_done("sync")
            self._respond(409, {"status": "paused", "reason": st.get("paused_reason")})
            return

        def _run():
            try:
                r = subprocess.run(
                    [sys.executable, "Crawler/sync_cloud_to_db.py", "--mode", "incremental"],
                    cwd=PROJECT, capture_output=True, text=True, timeout=300)
                _record_manual("sync", {"ok": r.returncode == 0, "returncode": r.returncode,
                                        "stdout_tail": _tail(r.stdout),
                                        "stderr_tail": _tail(r.stderr)})
            except Exception as e:
                _record_manual("sync", {"ok": False, "error": repr(e)})
            finally:
                _job_done("sync")

        threading.Thread(target=_run, daemon=True).start()
        self._respond(202, {"status": "started"})

    def run_feishu(self):
        """手动触发 3 条飞书同步管线（货架/陈列标准/采购，顺序执行）。

        宿主机直跑：飞书脚本的库连接完全依赖环境变量 PG_DSN（由 start.sh / 部署环境提供）。
        之前在此硬编码 localhost DSN（含明文口令）已按审计要求移除——
        env 缺失即中止并记录明确错误，不再静默连向错误目标。
        """
        if _job_busy("feishu"):
            self._busy()
            return
        dsn = os.environ.get("PG_DSN")
        if not dsn:
            _job_done("feishu")
            _record_manual("feishu", {"ok": False, "aborted": True,
                                      "error": "PG_DSN 环境变量未设置，飞书同步已中止（不再回退硬编码连接串）"})
            self._respond(500, {"status": "error",
                                "reason": "PG_DSN environment variable is not set"})
            return

        scripts = ["sync_shelf_from_feishu.py",
                   "sync_standard_put_qty_from_feishu.py",
                   "sync_procurement_from_feishu.py"]

        def _run():
            results = []
            try:
                # 子进程直接继承本进程环境（含 PG_DSN），不再注入任何默认值
                for s in scripts:
                    header = "\n===== %s @ %s =====\n" % (s, time.strftime("%H:%M:%S"))
                    try:
                        r = subprocess.run([sys.executable, "Crawler/" + s],
                                           cwd=PROJECT, capture_output=True, text=True,
                                           timeout=600)
                        ok, rc, err = r.returncode == 0, r.returncode, None
                        out_tail, err_tail = _tail(r.stdout), _tail(r.stderr)
                        _append_log(FEISHU_LOG, header + (r.stdout or "")
                                    + ("\n[stderr]\n" + r.stderr if r.stderr else "")
                                    + "\n[exit] %d\n" % rc)
                    except Exception as e:
                        ok, rc, err = False, None, repr(e)
                        out_tail, err_tail = "", ""
                        _append_log(FEISHU_LOG, header + "[error] %s\n" % (e,))
                    # 单条失败不中断后续脚本；汇总时标记 partial failure
                    results.append({"script": s, "ok": ok, "returncode": rc,
                                    "stdout_tail": out_tail, "stderr_tail": err_tail,
                                    **({"error": err} if err else {})})
                failed = [x["script"] for x in results if not x["ok"]]
                _record_manual("feishu", {
                    "ok": not failed,
                    "failed": failed,
                    "partial_failure": 0 < len(failed) < len(results),
                    "results": results,
                    "log": FEISHU_LOG,
                })
            finally:
                _job_done("feishu")

        threading.Thread(target=_run, daemon=True).start()
        self._respond(202, {"status": "started", "log": FEISHU_LOG})

    def run_login(self):
        """一键登录：弹出独立 Chromium 由用户手动完成登录（login_helper.py）。"""
        if _job_busy("login"):
            self._busy()
            return

        def _run():
            try:
                env = dict(os.environ)
                env.setdefault("DISPLAY", ":0")
                env["PYTHONUNBUFFERED"] = "1"
                r = subprocess.run([sys.executable, "Crawler/login_helper.py"],
                                   cwd=PROJECT, env=env, capture_output=True, text=True,
                                   timeout=15 * 60)
                _record_manual("login", {"ok": r.returncode == 0, "returncode": r.returncode,
                                         "stdout_tail": _tail(r.stdout),
                                         "stderr_tail": _tail(r.stderr)})
            except Exception as e:
                _record_manual("login", {"ok": False, "error": repr(e)})
            finally:
                _job_done("login")

        threading.Thread(target=_run, daemon=True).start()
        self._respond(202, {"status": "started"})

    def log_message(self, fmt, *args):
        pass

if __name__ == "__main__":
    os.chdir(BASE)
    host = os.environ.get("BI_STATUS_HOST", "127.0.0.1")
    port = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get("BI_STATUS_PORT", "8080"))
    srv = ThreadingHTTPServer((host, port), Handler)
    print("Dashboard server on http://%s:%d" % (host, port))
    if host not in ("127.0.0.1", "localhost", "::1"):
        print("[warn] 状态服务器绑定在 %s：对局域网暴露且无鉴权，确属需要再这样设置" % host)
    srv.serve_forever()
