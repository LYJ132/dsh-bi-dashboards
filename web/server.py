import os, sys, json, subprocess, threading, time
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

BASE = os.path.dirname(os.path.abspath(__file__))
PROJECT = os.path.dirname(os.path.dirname(BASE))  # web/ 已移入 bi-plugin/，仓库根在其上两级

# 手动触发的在飞标志（防重入；超过 timeout 秒自动视为结束）
_inflight = {}


def _inflight_ok(key, timeout):
    at = _inflight.get(key)
    if at and (time.time() - at) < timeout:
        return False
    _inflight[key] = time.time()
    return True


def _clear_inflight(key):
    _inflight.pop(key, None)


class Handler(SimpleHTTPRequestHandler):
    def handle(self):
        # 浏览器刷新/关闭导致的断连异常只影响当前线程,不应打断其他请求
        try:
            super().handle()
        except (BrokenPipeError, ConnectionResetError):
            pass

    def do_POST(self):
        if self.path == "/run":
            self.run_sync()
        elif self.path == "/runfeishu":
            self.run_feishu()
        elif self.path == "/runlogin":
            self.run_login()
        else:
            self.send_error(404)

    def _respond(self, code, payload):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(payload).encode())

    def run_sync(self):
        try:
            with open(os.path.join(BASE, "status.json"), encoding="utf-8") as f:
                st = json.load(f)
        except Exception:
            st = {}
        if st.get("paused_reason") or (st.get("login") or {}).get("state") in ("invalid", "renewing"):
            self._respond(409, {"status": "paused", "reason": st.get("paused_reason")})
            return
        threading.Thread(target=self._run_sync, daemon=True).start()
        self._respond(202, {"status": "started"})

    def _run_sync(self):
        try:
            subprocess.run(
                [sys.executable, "Crawler/sync_cloud_to_db.py", "--mode", "incremental"],
                cwd=PROJECT, capture_output=True, text=True, timeout=300)
        except Exception:
            pass

    def run_feishu(self):
        """手动触发 3 条飞书同步管线（货架/陈列标准/采购，顺序执行）。"""
        if not _inflight_ok("feishu", 300):
            self._respond(409, {"status": "busy", "reason": "飞书同步进行中"})
            return
        scripts = ["sync_shelf_from_feishu.py",
                   "sync_standard_put_qty_from_feishu.py",
                   "sync_procurement_from_feishu.py"]
        log_path = "/tmp/bi-feishu-sync.log"

        def _run():
            try:
                # 宿主机直跑：飞书脚本 DEFAULT_DSN 指向容器名 biz-postgres，须覆写 localhost
                env = dict(os.environ)
                env["PG_DSN"] = "host=localhost port=5432 dbname=unmanned_supermarket user=appuser password=ChangeMe_Strong_123"
                for s in scripts:
                    with open(log_path, "a", encoding="utf-8") as log:
                        log.write("\n===== %s @ %s =====\n" % (s, time.strftime("%H:%M:%S")))
                        log.flush()
                        subprocess.run([sys.executable, "Crawler/" + s],
                                       cwd=PROJECT, env=env, stdout=log, stderr=log,
                                       timeout=600)
            except Exception as e:
                try:
                    with open(log_path, "a", encoding="utf-8") as log:
                        log.write("[error] %s\n" % e)
                except Exception:
                    pass
            finally:
                _clear_inflight("feishu")

        threading.Thread(target=_run, daemon=True).start()
        self._respond(202, {"status": "started", "log": log_path})

    def run_login(self):
        """一键登录：弹出独立 Chromium 由用户手动完成登录（login_helper.py）。"""
        if not _inflight_ok("login", 15 * 60):
            self._respond(409, {"status": "busy", "reason": "登录流程进行中"})
            return

        def _run():
            try:
                env = dict(os.environ)
                env.setdefault("DISPLAY", ":0")
                env["PYTHONUNBUFFERED"] = "1"
                subprocess.run([sys.executable, "Crawler/login_helper.py"],
                               cwd=PROJECT, env=env, timeout=15 * 60)
            except Exception:
                pass
            finally:
                _clear_inflight("login")

        threading.Thread(target=_run, daemon=True).start()
        self._respond(202, {"status": "started"})

    def log_message(self, fmt, *args):
        pass

if __name__ == "__main__":
    os.chdir(BASE)
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    srv = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    print(f"Dashboard server on http://0.0.0.0:{port}")
    srv.serve_forever()
