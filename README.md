# Tesla Model Y · 整车建模仓库（拓扑框架）

一台 Tesla Model Y 的交互式 3D 建模仓库。**根 = 整车**，**分支 = 各子系统**（后桥电驱、电池包、前悬挂、车轮……），每个分支是一个独立的详细爆炸视图。所有视图基于 **Three.js**，统一视觉与交互框架，几何体示意建模，零件划分与命名参照 Tesla 官方 EPC 目录。

> A single-vehicle 3D modeling repo. Root = the whole Model Y; branches = sub-systems (drive unit, battery, suspension, wheels, …), each a self-contained exploded view built on a shared Three.js framework.

## 🗺️ 框架结构

```
tesla-model3/
├── index.html            # 根：整车拓扑枢纽（车身大壳 + 各分支区域，点选进入）
├── README.md             # 本文档（框架约定 + 路线图）
└── views/                # 分支：各子系统详细视图
    ├── drive-unit/       # 后桥电驱总成（✅ 已建模）
    │   ├── index.html
    │   └── README.md
    └── battery/          # 电池包（✅ 已建模，含三色线路）
        └── index.html
```

- **根 `index.html`**：整车外观（大壳）+ 电池包 / 后桥电驱 / 前悬挂 / 车轮等分支区域，可透视、掀壳、点选，导航到分支视图。
- **分支 `views/<name>/index.html`**：该子系统的详细爆炸视图，顶部有「← 返回整车拓扑」按钮。

## ✅ 已完成分支

| 分支 | 路径 | 说明 |
|------|------|------|
| 后桥电驱 Rear Drive Unit | `views/drive-unit/` | 电机 + 减速齿轮箱（齿轮耦合啮合）+ 差速器，13 个零件单独开合、电机转动可见 |
| 电池包 Battery Pack | `views/battery/` | 下托盘 + 上盖 + 4 模组 + 配电盒，红(高压)/蓝(冷却)/黄(BMS信号) 三色线路 + 图例，零件单独开合 |
| 3D 打印机 3D Printer | `views/printer/` | 床式 FDM 打印机 · 半透明结构 · 爆炸视图 · 部件标注 · 打印动画（独立分支展示） |

## 🔮 未来蓝图（待建模分支）

1. **车身外观 Body Shell** — 完整汽车大壳（外观曲面、车灯、玻璃、开门/开门见内）
2. **电池包 Battery Pack** — ✅ 已建（模组 / 电芯 / 配电盒 / 红蓝黄三色线路）
3. **前悬挂/转向 Front Suspension** — 摆臂、转向节、减震器
4. **后悬挂 Rear Suspension** — 与后桥电驱联动
5. **车轮 Wheels** — 轮毂 / 轮胎 / 刹车盘 / 卡钳
6. **内饰/中控 Interior** — 座椅、仪表、中控大屏

## 🧩 如何新增一个分支视图

1. 复制任一已有分支（如 `views/drive-unit/`）到 `views/<name>/`
2. 保持顶部「← 返回整车拓扑」按钮指向 `../../index.html`
3. 复用这套统一框架约定：

   | 能力 | 约定 |
   |------|------|
   | 场景/相机/灯光 | `OrbitControls` + ACES 色调映射 + 阴影 |
   | 半透明 + X-Ray | `reg(mat, baseOpacity)` 注册 → `setXray(on)` |
   | 爆炸视图 | 每零件 `{ base, explode, factor }`，`position = base + explode × factor` 平滑插值 |
   | 每零件单独开合 | 左侧滑块列表，每零件独立 `target` |
   | 部件标注 | `CSS2DObject` + 引线 `Line` |
   | 齿轮 | `THREE.Shape` 齿廓 + `ExtrudeGeometry`，中心距 = 节圆半径和 |
   | 3D 点选 | `Raycaster` → `BoxHelper` 高亮 + 列表联动 |

4. 在根 `index.html` 的 `BRANCHES` 数组里加一行，设置 `status: 'built'` 与 `link: 'views/<name>/'`
5. **分支关联**：每个分支顶部加 `#related` 导航条，写清「关联系统」的跳转——如电池包 `→ 后桥电驱（受电）`、电驱 `← 电池包（供电）`，形成整车下的关联拓扑

## 🚀 运行

分支视图（电驱/电池）是自包含单文件，直接 `open` 即可。但**整车枢纽 `index.html` 会加载真实车身 `assets/model-y.glb`**，GLB 必须走 HTTP 加载（`file://` 会被浏览器 CORS 拦截），所以要起本地服务器：

```bash
cd tesla-model3
./serve.sh                 # 或 python3 -m http.server 8000
# 浏览器打开 http://localhost:8000
```

> 若 `assets/model-y.glb` 不存在，整车枢纽会自动回退到程序化车身，仍可直接 `open index.html` 查看。

```bash
open views/drive-unit/index.html      # 直接进电驱分支（单文件，无需服务器）
```

## 🧮 技术栈

- [Three.js](https://threejs.org/) `0.160.0`（ES Module + import map，CDN）
- OrbitControls / CSS2DRenderer
- 单位毫米（示意），Y 轴向上，Model Y 后置单速电驱（非精确尺寸）
