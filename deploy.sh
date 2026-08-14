#!/usr/bin/env bash
# edystudio 一键部署脚本（Cloudflare Workers 静态托管）
# 用法: ./deploy.sh
set -euo pipefail
cd "$(dirname "$0")"

echo "📦 构建发布目录 dist/（排除 .git/.clawhub/AI-work 等非站点内容）..."
rm -rf dist
mkdir -p dist
rsync -a --exclude '.git' --exclude '.clawhub' --exclude '.DS_Store' \
  --exclude 'AI-work' --exclude 'artifacts' --exclude 'tools' \
  --exclude '*.md' --exclude 'wrangler.toml' --exclude 'deploy.sh' --exclude 'dist' \
  ./ dist/

echo "🚀 部署到 Cloudflare Workers..."
npx wrangler deploy

echo ""
echo "✅ 部署完成: https://edystudio.michoney68.workers.dev"
