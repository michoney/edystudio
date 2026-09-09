# 施工沙盘物理加强版实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 在 EdyStudio 内新增一个本地可玩的 Three.js 施工沙盘，玩家能倾倒沙子、加水和水泥、搅拌、摆放模板并浇筑出两层建筑。

**架构：** 游戏位于独立的 `3d-web/construction-sandbox/` Vite 子项目。Three.js 负责渲染，Rapier 负责车辆与散料刚体，权威材料账本和模板填充状态与视觉粒子分离；各模块通过 `GameState` 和语义事件通信。

**技术栈：** Vite、JavaScript ES Modules、Three.js、@dimforge/rapier3d-compat、Vitest、localStorage。

---

## 文件结构

- `3d-web/construction-sandbox/package.json`：依赖、开发、构建和测试命令。
- `3d-web/construction-sandbox/index.html`：游戏入口、加载层和无 WebGL 提示。
- `3d-web/construction-sandbox/src/style.css`：施工 HUD、面板和触控布局。
- `3d-web/construction-sandbox/src/main.js`：启动、渲染循环和模块装配。
- `3d-web/construction-sandbox/src/game/material-ledger.js`：沙、水泥、水和混凝土守恒。
- `3d-web/construction-sandbox/src/game/build-system.js`：网格吸附、模板、填充、凝固和楼层目标。
- `3d-web/construction-sandbox/src/game/save.js`：版本化保存与恢复。
- `3d-web/construction-sandbox/src/world/create-world.js`：工地、光照、天气和后处理。
- `3d-web/construction-sandbox/src/world/models.js`：程序化高质感低模机械、材料和建筑构件。
- `3d-web/construction-sandbox/src/physics/simulation.js`：Rapier 固定步长和碰撞世界。
- `3d-web/construction-sandbox/src/physics/material-particles.js`：沙、水、混凝土粒子与高度场表现。
- `3d-web/construction-sandbox/src/vehicles/loader.js`：铲车移动、铲斗和装卸。
- `3d-web/construction-sandbox/src/ui/controls.js`：键鼠、触控和模式切换。
- `3d-web/construction-sandbox/src/ui/hud.js`：任务、库存、配比和反馈。
- `3d-web/construction-sandbox/tests/*.test.js`：材料、建造和保存逻辑测试。

### 任务 1：建立可测试的 Three.js 项目

**文件：** 创建 `3d-web/construction-sandbox/package.json`、`index.html`、`src/main.js`、`src/style.css`。

- [ ] 创建含 `dev`、`build`、`test` 脚本的 package.json，依赖固定为 Three.js、Rapier、Vite、Vitest。
- [ ] 运行 `npm install`，预期生成 lockfile 且无安装错误。
- [ ] 创建加载界面和模块入口，main.js 渲染一个带阴影的测试场景。
- [ ] 运行 `npm run build`，预期生成 `dist/index.html`。
- [ ] 提交：`git commit -m "feat: 搭建施工沙盘 Three.js 项目"`。

### 任务 2：材料账本与配比

**文件：** 创建 `src/game/material-ledger.js`、`tests/material-ledger.test.js`。

- [ ] 先测试 `add()`、`consume()`、库存下限和 `mixConcrete()`；标准配比 `sand:2, cement:1, water:0.5` 应产生强度 1 的湿混凝土。
- [ ] 运行 `npm test -- material-ledger`，预期因模块不存在而失败。
- [ ] 实现 `MaterialLedger`，所有数值以升为单位，`mixConcrete(batch)` 返回 `{volume,strength,cureSeconds}`。
- [ ] 再运行测试，预期全部通过。
- [ ] 提交：`git commit -m "feat: 添加材料守恒与混凝土配比"`。

### 任务 3：模板建造与凝固状态机

**文件：** 创建 `src/game/build-system.js`、`tests/build-system.test.js`。

- [ ] 测试 0.5 米网格吸附、碰撞拒绝、模板容量、分批填充及 `wet → setting → cured` 状态迁移。
- [ ] 运行对应测试，预期失败。
- [ ] 实现 `BuildSystem.placeForm(type, position)`、`pour(id, liters, strength)`、`update(dt)` 和 `getProgress()`。
- [ ] 验证地基、四柱和楼板可形成两层任务进度，悬空楼板返回 `unsupported`。
- [ ] 提交：`git commit -m "feat: 实现模板浇筑与凝固系统"`。

### 任务 4：工地世界与高质感程序模型

**文件：** 创建 `src/world/create-world.js`、`src/world/models.js`，修改 `src/main.js`。

- [ ] 建立 ACES 色调映射、物理光照、级联视觉层次、软阴影、雾和雨天地面反射。
- [ ] 用独立 Mesh 组合铲车、搅拌机、塔吊、泵车、围挡、沙堆、材料托盘和工人，并统一使用粗糙度/金属度材质。
- [ ] 为常用零件使用 InstancedMesh，给关键机械增加警示条纹、车灯、液压杆和轮胎细节。
- [ ] 运行 `npm run build`，预期无资源或着色器错误。
- [ ] 提交：`git commit -m "feat: 构建微缩施工现场与机械模型"`。

### 任务 5：固定步长物理与散料粒子

**文件：** 创建 `src/physics/simulation.js`、`src/physics/material-particles.js`，修改 `src/main.js`。

- [ ] 实现 60Hz Rapier 固定步长、最大追帧次数和页面失焦暂停。
- [ ] 实现 `MaterialParticles.emitSand()`、`emitWater()`、`emitConcrete()`；高画质粒子上限分别为 5000、2500、3500。
- [ ] 粒子落地后将体积写入简化高度场或目标模板，并回收对象池。
- [ ] 加入低/中/高质量档与低帧率自动降级。
- [ ] 运行 `npm run build` 并检查无逐帧新增大量对象的代码路径。
- [ ] 提交：`git commit -m "feat: 添加沙水与混凝土粒子物理"`。

### 任务 6：铲车、搅拌和浇筑交互

**文件：** 创建 `src/vehicles/loader.js`、`src/ui/controls.js`，修改 `src/main.js`。

- [ ] 实现 WASD/方向键驾驶、铲斗升降和倾倒，铲斗进入沙堆时按容量装料。
- [ ] 实现水阀、水泥袋、搅拌按钮和可拖动泵管喷口。
- [ ] 将视觉粒子与材料账本操作绑定；只有喷口位于模板上方时才增加填充量。
- [ ] 增加建造模式：选择构件、旋转、合法性预览、放置和撤销。
- [ ] 手工完成一次“装沙 → 加水泥和水 → 搅拌 → 放模板 → 浇筑”。
- [ ] 提交：`git commit -m "feat: 打通施工设备与浇筑玩法"`。

### 任务 7：HUD、任务和保存

**文件：** 创建 `src/ui/hud.js`、`src/game/save.js`、`tests/save.test.js`，修改 `src/style.css`、`src/main.js`。

- [ ] 测试存档版本、损坏 JSON 回退和旧版本拒绝加载。
- [ ] 实现顶部任务条、材料仪表、配比反馈、操作提示、施工平板和画质选择。
- [ ] 每次构件或库存变化后节流保存；恢复时重建构件而不保存瞬时粒子。
- [ ] 加入移动端摇杆、升降/倾倒/交互按钮及响应式 HUD。
- [ ] 运行全部测试，预期通过。
- [ ] 提交：`git commit -m "feat: 完成施工任务界面与自动存档"`。

### 任务 8：验收、性能与本地试玩

**文件：** 修改上述实现文件；创建 `3d-web/construction-sandbox/README.md`。

- [ ] 运行 `npm test`，预期全部测试通过。
- [ ] 运行 `npm run build`，预期构建成功且没有缺失资源。
- [ ] 启动 `npm run dev -- --host 127.0.0.1`，在桌面浏览器完成完整两层任务。
- [ ] 检查控制台错误、画质自动降级、刷新恢复和窗口尺寸变化。
- [ ] 在 README 记录本地启动、控制方式、材料配比和已知性能边界。
- [ ] 提交：`git commit -m "test: 验收施工沙盘本地试玩版"`。

## 规格覆盖自检

核心循环由任务 2、3、6 覆盖；视觉与机械由任务 4 覆盖；物理增强由任务 5 覆盖；移动控制、任务和保存由任务 7 覆盖；性能降级、错误恢复和端到端验收由任务 1、5、8 覆盖。首版不引入多人、有限元或无限楼层。
