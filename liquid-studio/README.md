# 002 — Liquid Studio

第二条网页作品，位于 Aethera 下方。React + Vite + TypeScript + Tailwind CSS + Framer Motion。当前为本地预览版。

`npm install` 安装依赖；`npm run dev` 开发；`npm run build` 检查类型并输出到 `../3d-web/liquid-studio/`。

整站本地服务器由 `../web-showcase/local-preview.mjs` 提供：`http://127.0.0.1:8767/3d-web/liquid-studio/`。合集入口 `http://127.0.0.1:8767/3d-web/`。

只有 Hero 与 Capabilities 两个 section。手机端能力卡片纵向排布；极矮窗口允许 Hero 随内容增高以保证可访问性。Google Fonts 按提示词在 index.html 使用 link 加载。

FadingVideo 支持字符串/字符串数组，loadeddata 淡入 500ms，结尾 timeupdate 淡出 550ms，ended 循环/切换资源；支持减少动态效果与暂停。BlurText 使用 IntersectionObserver 触发逐词 Framer Motion 动画。

Start a Project 为本地项目简报下载表单，不提交数据。Showreel 播放指定 Hero 视频，关闭即暂停。所有指标、品牌和营销文案来自用户提供的设计提示词，为展示内容。

原始视频：
- Hero: https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260619_191346_9d19d66e-86a4-47f7-8dc6-712c1788c3b2.mp4
- Capabilities: https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260622_093722_ccfc7ebf-182f-419f-8a62-2dc02db7dd9d.mp4
