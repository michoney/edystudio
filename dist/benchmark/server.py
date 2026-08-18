#!/usr/bin/env python3
"""吉验机跑分服务端 — 静态文件 + 评论区 API"""
import http.server, json, os, re, base64, time, uuid, urllib.parse, cgi, io
from pathlib import Path

ROOT = Path(__file__).parent
DATA_FILE = ROOT / "comments.json"
UPLOAD_DIR = ROOT / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

def load_comments():
    if DATA_FILE.exists():
        try: return json.loads(DATA_FILE.read_text())
        except: pass
    return []

def save_comments(data):
    DATA_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_POST(self):
        if self.path == "/api/comment":
            try:
                ct = self.headers.get("Content-Type", "")
                length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(length)

                if "multipart/form-data" in ct:
                    # Parse multipart
                    boundary = ct.split("boundary=")[1].encode()
                    parts = body.split(b"--" + boundary)
                    name = ""; score = 0; device = ""; img_data = None; img_ext = "png"
                    for part in parts:
                        if b"Content-Disposition" not in part: continue
                        headers_end = part.find(b"\r\n\r\n")
                        if headers_end < 0: continue
                        headers = part[:headers_end].decode(errors="replace")
                        content = part[headers_end+4:]
                        if content.endswith(b"\r\n"): content = content[:-2]

                        if 'name="name"' in headers:
                            name = content.decode(errors="replace").strip()
                        elif 'name="score"' in headers:
                            try: score = int(content.decode().strip())
                            except: pass
                        elif 'name="device"' in headers:
                            device = content.decode(errors="replace").strip()
                        elif 'name="image"' in headers:
                            img_data = content
                            if b"image/png" in headers.encode(): img_ext = "png"
                            elif b"image/jpeg" in headers.encode() or b"image/jpg" in headers.encode(): img_ext = "jpg"
                            elif b"image/gif" in headers.encode(): img_ext = "gif"
                            elif b"image/webp" in headers.encode(): img_ext = "webp"
                else:
                    try: data = json.loads(body)
                    except: data = {}
                    name = data.get("name","").strip()
                    score = data.get("score",0)
                    device = data.get("device","").strip()
                    if data.get("image"):
                        img_data = base64.b64decode(data["image"].split(",",1)[-1])
                        img_ext = "png"

                if not name: name = "匿名用户"
                if not device: device = "未知设备"

                img_url = ""
                if img_data and len(img_data) > 100:
                    fname = f"{uuid.uuid4().hex[:12]}.{img_ext}"
                    fpath = UPLOAD_DIR / fname
                    fpath.write_bytes(img_data)
                    img_url = f"/uploads/{fname}"

                comments = load_comments()
                comments.insert(0, {
                    "id": uuid.uuid4().hex[:8],
                    "name": name,
                    "device": device,
                    "score": score,
                    "image": img_url,
                    "time": time.strftime("%m-%d %H:%M")
                })
                if len(comments) > 200: comments = comments[:200]
                save_comments(comments)

                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"ok":True,"comment":comments[0]}).encode())
            except Exception as e:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def do_GET(self):
        if self.path == "/api/comments":
            comments = load_comments()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            self.wfile.write(json.dumps(comments, ensure_ascii=False).encode())
        elif self.path == "/api/comments/clear":
            save_comments([])
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"ok")
        else:
            super().do_GET()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8888))
    print(f"吉验机服务启动: http://0.0.0.0:{port}")
    http.server.HTTPServer(("0.0.0.0", port), Handler).serve_forever()
