# Edy.AI.Studio 🎨

Edy Studio 主页源码仓库 — 粒子特效画廊与 AI 作品集。

## 在线地址

| 平台 | 地址 | 说明 |
|------|------|------|
| **Cloudflare Workers** | https://edystudio.michoney68.workers.dev | 国内可直接访问（推荐） |
| GitHub Pages | https://michoney.github.io/edystudio/ | 海外访问 |
| CNB 镜像 | https://cnb.cool/edyai.cc.cd/edystudio | 代码仓库（无托管） |
| AI 大脑 | https://urban-tree-ai-demo.michoney68.workers.dev/ai-brain | 数字化树木 AI 应用 |

## 内容

- **gallery/** — p5.js 粒子特效画廊（gallery.html 主页 + 每个特效独立目录）
- **models.html** — Model 产品库（数字孪生与 AI 可视化产品）
- **benchmark/** — 马哥验机：手机性能检测工具
- **tools/** — AI 交互工具集
- **video/** — AI 视频作品
- **camp.html / recruit.html** — AI 实战训练营入口
- **github-weekly.html** — GitHub 每周热门趋势图

## 技术栈

- HTML / CSS / JavaScript（纯静态站点，零依赖）
- p5.js / Three.js（粒子特效）
- Cloudflare Workers 静态托管 + GitHub Pages 双部署

## 本地预览

```bash
cd edystudio
python3 -m http.server 8080
# 打开 http://localhost:8080
```

## 部署

### Cloudflare Workers（国内可访问）

```bash
./deploy.sh
# 或手动: npx wrangler deploy
```

部署配置见 `wrangler.toml`。发布目录 `dist/` 由 `deploy.sh` 自动构建（排除 `.git`、`AI-work` 等非站点内容），无需手动维护。

### GitHub Pages

```bash
git push origin main
# GitHub Pages 自动构建（需在仓库 Settings → Pages 开启）
```

## 相关仓库

- [skill-library](https://github.com/michoney/skill-library) — 技能库
- [michoney-tutorials](https://github.com/michoney/michoney-tutorials) — AI 教程合集
