# Aethera · EdyStudio 第一个网页作品

EdyStudio 第一条 3D 网页展示作品。React + Vite + Tailwind CSS + TypeScript。

线上入口：https://michoney.github.io/edystudio/3d-web/ 。作品地址：https://michoney.github.io/edystudio/3d-web/aethera/ 。

运行 `npm install` 后使用 `npm run dev` 开发；`npm run build` 类型检查并输出到 `../3d-web/aethera/`，使用 `npm run preview` 预览成品。

整站本地预览：`node local-preview.mjs`，打开 http://127.0.0.1:8767/3d-web/aethera/ 。服务器支持视频 Range 请求。预览运行时执行 `node verify.mjs` 检查视频循环与页面交互。

EdyStudio 首页入口：`3d-web/`；第一个作品：`3d-web/aethera/`。构建使用相对资源路径，兼容 GitHub Pages `/edystudio/` 子目录。

字体在 `src/styles/fonts.css` 导入并打包到本地。动画定义在 `src/styles/theme.css`。视频原始链接保留在 `src/App.tsx`，本地副本在 `public/media/aethera.mp4`。

视频使用 requestAnimationFrame 检测播放进度，前后各 0.5 秒淡入淡出，结束后等待 100ms 从头播放。支持暂停、移动端菜单、对话框键盘关闭、减少动态效果设置。示范品牌导航打开站内介绍面板，Begin Journey 通往作品合集。

部署前执行构建，随主站发布 `3d-web/` 和首页入口即可；无需发布 node_modules 或启动 Node 服务。
