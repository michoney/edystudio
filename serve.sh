#!/bin/bash
# 在 tesla-model3 目录下启动本地服务器（加载真实车身 GLB 必须走 http，file:// 会被 CORS 拦截）
cd "$(dirname "$0")"
PORT="${1:-8000}"
echo "▶ 服务已启动: http://localhost:${PORT}   (Ctrl+C 停止)"
python3 -m http.server "${PORT}"
