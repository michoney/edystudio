#!/usr/bin/env bash
# edystudio 国内镜像 Worker 部署脚本（反向代理模式）
# 用法: ./deploy.sh
set -euo pipefail
cd "$(dirname "$0")"

echo "🚀 部署反向代理 Worker 到 Cloudflare..."
npx wrangler deploy

echo ""
echo "✅ 部署完成: https://edystudio.michoney68.workers.dev"
echo "   （自动实时镜像 https://michoney.github.io/edystudio/）"
