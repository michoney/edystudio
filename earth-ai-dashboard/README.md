# 🌍 Earth AI Command Center

3D 地球气象监控仪表盘 — Three.js 驱动的交互式地球可视化。

## 特性

- 🌍 **3D 地球** — Three.js 高精度纹理渲染
- ☁️ **实时云层** — 透明云层独立缓慢旋转
- 🔵 **大气光晕** — 发光边缘效果
- ⭐ **星空背景** — 3000 粒子星云
- 🖱 **交互控制** — 鼠标拖拽旋转 + 滚轮缩放
- 📊 **HUD 面板** — 实时天气数据展示

## 快速启动

```bash
cd earth-ai-dashboard
python3 -m http.server 8080
# 打开 http://localhost:8080
```

## 项目结构

```
earth-ai-dashboard/
├── index.html    # 主页面（单文件，无依赖）
└── README.md
```

## 技术栈

- Three.js r128
- ES Module / Classic Script
- 纯前端，零后端依赖
