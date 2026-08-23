#!/usr/bin/env python3
import json
import mimetypes
import os
import subprocess
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

HOST = "127.0.0.1"
PORT = int(os.environ.get("J_PREVIEW_PORT", "8765"))
BASE_DIR = Path.home() / "Library" / "Application Support" / "JMacAgent"
EDITOR = BASE_DIR / "j_video_editor.py"
EDIT_DIR = Path.home() / "Movies" / "J Edits"
DOWNLOADS = Path.home() / "Downloads"
VIDEO_EXTS = {".mp4", ".mov", ".m4v", ".webm", ".mkv", ".avi"}


def newest_in(folder: Path):
    if not folder.exists():
        return None
    items = [p for p in folder.iterdir() if p.is_file() and p.suffix.lower() in VIDEO_EXTS]
    return max(items, key=lambda p: p.stat().st_mtime) if items else None


def latest_edit(): return newest_in(EDIT_DIR)
def latest_source(): return newest_in(DOWNLOADS)
def latest_video(): return latest_edit() or latest_source()


def meta_for(video, kind="edit"):
    if not video:
        return {"ok": False, "error": "No video found", "kind": kind}
    st = video.stat()
    return {"ok": True, "name": video.name, "size": st.st_size, "modified": st.st_mtime, "kind": kind}


class Handler(BaseHTTPRequestHandler):
    server_version = "JPreview/1.3"

    def log_message(self, fmt, *args):
        pass

    def cors(self):
        origin = self.headers.get("Origin") or "*"
        self.send_header("Access-Control-Allow-Origin", origin)
        self.send_header("Vary", "Origin")
        self.send_header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS, POST")
        self.send_header("Access-Control-Allow-Headers", "Range, Content-Type, Cache-Control")
        self.send_header("Access-Control-Allow-Private-Network", "true")
        self.send_header("Access-Control-Expose-Headers", "Content-Length, Content-Range, Accept-Ranges, X-J-Video-Name")
        self.send_header("Cross-Origin-Resource-Policy", "cross-origin")
        self.send_header("Cache-Control", "no-store")

    def send_json(self, payload, code=200):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.cors()
        self.end_headers()

    def do_HEAD(self): self._route(True)
    def do_GET(self): self._route(False)

    def do_POST(self):
        path = urlparse(self.path).path
        if path != "/render":
            return self.send_json({"ok": False, "error": "Not found"}, 404)
        try:
            length = min(int(self.headers.get("Content-Length", "0") or 0), 65536)
            body = json.loads(self.rfile.read(length).decode("utf-8") or "{}") if length else {}
            source = latest_source()
            if not source:
                return self.send_json({"ok": False, "error": "No source video found in Downloads"}, 404)
            if not EDITOR.exists():
                return self.send_json({"ok": False, "error": "J video editor is not installed"}, 500)
            start = max(0.0, min(float(body.get("start", 0)), 3600.0))
            duration = max(1.0, min(float(body.get("duration", 15)), 60.0))
            output = Path(str(body.get("output") or "MV-Chaos-Live.mp4")).name
            if not output.lower().endswith(".mp4"): output += ".mp4"
            p = subprocess.run([sys.executable, str(EDITOR), str(source), output, str(start), str(duration)], capture_output=True, text=True, timeout=180)
            if p.returncode != 0:
                return self.send_json({"ok": False, "error": (p.stderr or p.stdout or "Render failed")[-2500:]}, 500)
            payload = meta_for(latest_edit(), "edit")
            payload["stdout"] = p.stdout[-1200:]
            return self.send_json(payload)
        except Exception as e:
            return self.send_json({"ok": False, "error": str(e)}, 500)

    def _route(self, head_only=False):
        path = urlparse(self.path).path
        if path == "/health":
            return self._json_route({"ok": True, "server": "JPreview/1.3", "edit": meta_for(latest_edit(), "edit"), "source": meta_for(latest_source(), "source")}, head_only)
        if path == "/preview":
            html = b'''<!doctype html><meta charset="utf-8"><title>J Local Preview</title><style>html,body{margin:0;background:#000;color:#fff;font-family:-apple-system;height:100%}body{display:grid;place-items:center}.wrap{width:min(1000px,96vw)}video{width:100%;max-height:82vh;background:#000;border:1px solid #333;border-radius:18px}.h{font-size:13px;letter-spacing:.15em;margin:0 0 12px;color:#9eefff}</style><div class="wrap"><div class="h">J LOCAL VIDEO BRIDGE</div><video controls autoplay playsinline src="/latest-video"></video></div>'''
            self.send_response(200); self.cors(); self.send_header("Content-Type", "text/html; charset=utf-8"); self.send_header("Content-Length", str(len(html))); self.end_headers()
            if not head_only: self.wfile.write(html)
            return
        if path == "/latest-meta":
            video = latest_video(); kind = "edit" if latest_edit() else "source"; payload = meta_for(video, kind); payload["url"] = f"http://{HOST}:{PORT}/latest-video"
            return self._json_route(payload, head_only, 200 if payload.get("ok") else 404)
        if path == "/source-meta":
            payload = meta_for(latest_source(), "source"); payload["url"] = f"http://{HOST}:{PORT}/source-video"
            return self._json_route(payload, head_only, 200 if payload.get("ok") else 404)
        if path == "/latest-video": video = latest_video()
        elif path == "/source-video": video = latest_source()
        else:
            self.send_response(404); self.cors(); self.end_headers(); return
        if not video:
            self.send_response(404); self.cors(); self.end_headers(); return
        self._send_video(video, head_only)

    def _json_route(self, payload, head_only=False, code=200):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(code); self.cors(); self.send_header("Content-Type", "application/json"); self.send_header("Content-Length", str(len(body))); self.end_headers()
        if not head_only: self.wfile.write(body)

    def _send_video(self, video, head_only=False):
        size = video.stat().st_size; start, end = 0, size - 1; partial = False
        rh = self.headers.get("Range", "")
        if rh.startswith("bytes="):
            partial = True; spec = rh[6:].split(",", 1)[0].strip(); left, _, right = spec.partition("-")
            try:
                if left:
                    start = int(left); end = int(right) if right else end
                elif right: start = max(0, size - int(right))
            except ValueError: start, end, partial = 0, size - 1, False
            start = max(0, min(start, size - 1)); end = max(start, min(end, size - 1))
        length = end - start + 1
        self.send_response(206 if partial else 200); self.cors(); self.send_header("Content-Type", mimetypes.guess_type(video.name)[0] or "video/mp4"); self.send_header("Accept-Ranges", "bytes"); self.send_header("Content-Length", str(length)); self.send_header("X-J-Video-Name", video.name)
        if partial: self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.end_headers()
        if head_only: return
        with video.open("rb") as f:
            f.seek(start); remaining = length
            while remaining > 0:
                chunk = f.read(min(1024 * 1024, remaining))
                if not chunk: break
                self.wfile.write(chunk); remaining -= len(chunk)


def main():
    EDIT_DIR.mkdir(parents=True, exist_ok=True)
    httpd = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"J Preview Server 1.3 online at http://{HOST}:{PORT}", flush=True)
    httpd.serve_forever()


if __name__ == "__main__": main()
