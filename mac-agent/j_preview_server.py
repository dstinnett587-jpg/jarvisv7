#!/usr/bin/env python3
import json
import mimetypes
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

HOST = "127.0.0.1"
PORT = int(os.environ.get("J_PREVIEW_PORT", "8765"))
EDIT_DIR = Path.home() / "Movies" / "J Edits"
VIDEO_EXTS = {".mp4", ".mov", ".m4v", ".webm", ".mkv"}


def latest_video():
    if not EDIT_DIR.exists():
        return None
    items = [p for p in EDIT_DIR.iterdir() if p.is_file() and p.suffix.lower() in VIDEO_EXTS]
    if not items:
        return None
    return max(items, key=lambda p: p.stat().st_mtime)


class Handler(BaseHTTPRequestHandler):
    server_version = "JPreview/1.0"

    def log_message(self, fmt, *args):
        pass

    def cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Range, Content-Type")
        self.send_header("Access-Control-Expose-Headers", "Content-Length, Content-Range, Accept-Ranges, X-J-Video-Name")
        self.send_header("Cache-Control", "no-store")

    def do_OPTIONS(self):
        self.send_response(204)
        self.cors()
        self.end_headers()

    def do_HEAD(self):
        self._route(head_only=True)

    def do_GET(self):
        self._route(head_only=False)

    def _route(self, head_only=False):
        path = urlparse(self.path).path
        if path == "/health":
            body = b'{"ok":true}'
            self.send_response(200)
            self.cors()
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            if not head_only:
                self.wfile.write(body)
            return

        video = latest_video()
        if path == "/latest-meta":
            if not video:
                payload = {"ok": False, "error": "No rendered video found", "directory": str(EDIT_DIR)}
                code = 404
            else:
                st = video.stat()
                payload = {"ok": True, "name": video.name, "size": st.st_size, "modified": st.st_mtime, "url": f"http://{HOST}:{PORT}/latest-video"}
                code = 200
            body = json.dumps(payload).encode("utf-8")
            self.send_response(code)
            self.cors()
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            if not head_only:
                self.wfile.write(body)
            return

        if path != "/latest-video":
            self.send_response(404)
            self.cors()
            self.end_headers()
            return

        if not video:
            self.send_response(404)
            self.cors()
            self.end_headers()
            return

        size = video.stat().st_size
        start, end = 0, size - 1
        range_header = self.headers.get("Range", "")
        partial = False
        if range_header.startswith("bytes="):
            partial = True
            spec = range_header[6:].split(",", 1)[0].strip()
            left, _, right = spec.partition("-")
            try:
                if left:
                    start = int(left)
                    if right:
                        end = int(right)
                elif right:
                    suffix = int(right)
                    start = max(0, size - suffix)
            except ValueError:
                start, end, partial = 0, size - 1, False
            start = max(0, min(start, size - 1))
            end = max(start, min(end, size - 1))

        length = end - start + 1
        self.send_response(206 if partial else 200)
        self.cors()
        self.send_header("Content-Type", mimetypes.guess_type(video.name)[0] or "video/mp4")
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(length))
        self.send_header("X-J-Video-Name", video.name)
        if partial:
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.end_headers()
        if head_only:
            return
        with video.open("rb") as f:
            f.seek(start)
            remaining = length
            while remaining > 0:
                chunk = f.read(min(1024 * 1024, remaining))
                if not chunk:
                    break
                self.wfile.write(chunk)
                remaining -= len(chunk)


def main():
    EDIT_DIR.mkdir(parents=True, exist_ok=True)
    httpd = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"J Preview Server online at http://{HOST}:{PORT}", flush=True)
    httpd.serve_forever()


if __name__ == "__main__":
    main()
