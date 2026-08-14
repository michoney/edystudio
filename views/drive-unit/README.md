# Tesla Model Y 电驱总成 · 3D 爆炸图

基于 **Three.js** 的交互式 3D 电驱总成爆炸示意图 —— 针对门店维修工程师，参照 Tesla 官方 EPC 零件目录的零件划分与命名，几何体示意建模。

> An interactive Three.js exploded view of the Tesla Model Y rear drive unit — drive motor + single-speed reduction gearbox + differential, organized by Tesla's official EPC parts catalog.

## ✨ 功能特性

- **⚙️ 齿轮耦合啮合** — 输入小齿轮(15 齿) ↔ 减速齿圈(75 齿) 按 1:5 传动比反向旋转，齿形程序化生成、正确啮合
- **🔁 电机转动可见** — 转子带亮色键条、半轴带标记条，转动方向/转速一目了然；转速可调、可暂停
- **🧩 每个零部件单独开合** — 13 个零部件各自独立滑块 + 一键拆分/合并 + 总分解滑块
- **🖱️ 点击选中** — 3D 视图点选部件（高亮框）+ 列表点选，两种方式联动
- **👁️ 全透视 X-Ray** / **🏷️ 部件标注**（中英双语 + 引线）/ **🔄 自动旋转**

## 🚀 运行

直接用浏览器打开（需联网，Three.js 从 CDN 加载）：

```bash
open index.html
```

## 🧩 零件清单（参照 EPC 划分）

| # | 零件 | 说明 |
|---|------|------|
| 1 | 逆变器 Inverter | 高压功率电子，电机上方 |
| 2 | 定子壳体 Stator Housing | 透明外壳 |
| 3 | 定子绕组 Stator & Windings | 铁芯 + 发卡式铜绕组 |
| 4 | 转子 Rotor | 电机转子（转动件） |
| 5 | 输入轴+小齿轮 Input Shaft & Pinion | 15 齿，驱动齿轮（转动件） |
| 6 | 减速齿圈 Ring Gear | 75 齿，1:5 减速（转动件） |
| 7 | 差速器壳 Differential Case | 含法兰螺栓（转动件） |
| 8 | 半轴齿轮 Side Gears ×2 | 差速器内部 |
| 9 | 行星齿轮 Spider Gears ×2 | 差速器内部 |
| 10 | 左半轴 Left Half Shaft | 输出到左轮 |
| 11 | 右半轴 Right Half Shaft | 输出到右轮 |
| 12 | 齿轮箱前壳 Gearbox Housing | 透明外壳 |
| 13 | 电机后盖 Rear End Cap | 后端盖 |

## 🧮 技术要点

- **齿轮生成**：`THREE.Shape` 梯形齿廓 + `ExtrudeGeometry` 沿轴向拉伸，`rotateY(π/2)` 使齿轴沿 X；中心距 = 两齿轮节圆半径之和，保证啮合
- **传动比**：`ringAngle = -motorAngle × (15/75) + 半齿相位`，方向相反、转速按齿数比
- **差速器**：均匀旋转时整体绕 X 轴刚体转动（半轴齿轮自转、行星齿轮公转）
- **爆炸视图**：`position = base + explode × factor`，factor 平滑插值；每个零件独立 `target`
- 单位为毫米（示意），Y 轴向上，Model Y 后置单速电驱（示意建模，非精确尺寸）

## 📄 技术栈

- [Three.js](https://threejs.org/) `0.160.0`（ES Module + import map，CDN）
- OrbitControls / CSS2DRenderer
