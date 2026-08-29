# 旋转扭紧宇宙双版对比实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 依据同一份扭转宇宙规格，产出 Codex 与 DeepSeek 两个完全独立、可并排对比的三维网页原型。

**架构：** 两个版本分别位于 `torsion-universe-codex/` 和 `torsion-universe-deepseek/`，各自拥有 HTML、CSS 与 JavaScript，不相互引用。两者共享同一规格、测试契约和视觉参考，但不共享实现代码，确保对比有意义。选出胜出版本前不修改 `models.html`。

**技术栈：** HTML5、CSS3、JavaScript ES Modules、Three.js CDN、Node.js 静态结构测试、Playwright 浏览器截图与交互验收。

---

## 文件结构

### Codex 版

- 创建：`torsion-universe-codex/index.html` — 页面语义结构、模式控件、时间轴与仪表盘容器。
- 创建：`torsion-universe-codex/css/style.css` — 科研终端视觉、桌面/移动布局、降低动效支持。
- 创建：`torsion-universe-codex/js/config.js` — 颜色、几何密度、阶段区间和设备质量档。
- 创建：`torsion-universe-codex/js/cycle.js` — 归一化循环求值、阶段名与仪表数值。
- 创建：`torsion-universe-codex/js/universe-field.js` — 环形/双锥网格、层间扭转与流线系统。
- 创建：`torsion-universe-codex/js/analysis-field.js` — 分区节点群、角动量连线与临界面。
- 创建：`torsion-universe-codex/js/ui.js` — 播放、时间轴、速度、模式与指标更新。
- 创建：`torsion-universe-codex/js/main.js` — 渲染器、摄像机、OrbitControls、动画循环与降级入口。

### DeepSeek 版

- 创建：`torsion-universe-deepseek/index.html`
- 创建：`torsion-universe-deepseek/css/style.css`
- 创建：`torsion-universe-deepseek/js/*.js`

DeepSeek 可自行决定 `js/` 内的模块划分，但不得在指定目录之外写入代码。

### 共同验收

- 创建：`tests/torsion-universe-contract.mjs` — 校验两个版本的必需 DOM、可访问文字和独立文件。
- 创建：`tests/torsion-universe-browser.mjs` — 打开两页、切换模式、拖动时间轴、检查 WebGL/静态降级与导出截图。
- 创建：`comparison/torsion-universe/index.html` — 只用于本地并排对比，不作为正式产品页。

### 不得修改

- `src/index.js` — 存在用户未提交变更。
- `models.html` — 待用户选出胜出版本后再接入。

## 任务 1：建立共同契约测试

**文件：**
- 创建：`tests/torsion-universe-contract.mjs`

- [ ] **步骤 1：写入失败的结构测试**

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const variants = ["torsion-universe-codex", "torsion-universe-deepseek"];
for (const variant of variants) {
  const html = await readFile(new URL(`../${variant}/index.html`, import.meta.url), "utf8");
  for (const marker of ["data-mode=\"cycle\"", "data-mode=\"analysis\"", "id=\"phase-slider\"", "MAXIMUM TORSION"]) {
    assert.ok(html.includes(marker), `${variant} missing ${marker}`);
  }
}
console.log("torsion universe contract: PASS");
```

- [ ] **步骤 2：确认测试首次失败**

运行：`node tests/torsion-universe-contract.mjs`

预期：因两个 `index.html` 尚不存在而以 `ENOENT` 失败。

- [ ] **步骤 3：提交测试契约**

```bash
git add tests/torsion-universe-contract.mjs
git commit -m "test: define torsion universe comparison contract"
```

## 任务 2：实现 Codex 版循环场

**文件：**
- 创建：`torsion-universe-codex/index.html`
- 创建：`torsion-universe-codex/css/style.css`
- 创建：`torsion-universe-codex/js/config.js`
- 创建：`torsion-universe-codex/js/cycle.js`
- 创建：`torsion-universe-codex/js/universe-field.js`
- 创建：`torsion-universe-codex/js/main.js`

- [ ] **步骤 1：创建满足 DOM 契约的最小页面**

`index.html` 必须包含：

```html
<button data-mode="cycle" aria-pressed="true">01 宇宙循环场</button>
<button data-mode="analysis" aria-pressed="false">02 扭转结构分析</button>
<input id="phase-slider" type="range" min="0" max="1" step="0.001" value="0.18">
<span class="concept-label">CONCEPTUAL MODEL · MAXIMUM TORSION</span>
<div id="universe-canvas" aria-label="旋转扭紧宇宙三维模型"></div>
```

- [ ] **步骤 2：实现单一循环求值器**

`cycle.js` 导出稳定接口：

```js
export function evaluateCycle(phase) {
  return {
    phase,
    stage: "EXPANSION",
    radius: 1,
    length: 1,
    twist: 0,
    angularVelocity: 0,
    torsionDensity: 0,
    curvature: 0,
    bounce: 0,
  };
}
```

实际求值按规格的八个阶段连续插值；阶段边界不得造成几何跳变。

- [ ] **步骤 3：实现差速扭转几何**

`universe-field.js` 中每个网格点使用纯函数求值：

```js
const waist = 0.24 + 0.76 * Math.pow(Math.abs(axial), 0.58);
const layerTwist = state.twist * (1 - Math.abs(axial)) * (0.35 + radialLayer * 0.65);
const theta = baseTheta + layerTwist * Math.sign(axial || 1);
```

这保证中央收腰但不归零，且各层旋转量不同。

- [ ] **步骤 4：实现光轨与 Big Bounce 相位波**

光轨的轴向速度由当前阶段决定；`bounce` 达到峰值时扩大中央环的 emissive 强度，不改变中央最小半径。

- [ ] **步骤 5：运行本地页面并检查控制台**

运行：`python3 -m http.server 8080`

打开：`http://127.0.0.1:8080/torsion-universe-codex/`

预期：无 uncaught exception，画布可拖拽和缩放。

- [ ] **步骤 6：提交 Codex 循环场**

```bash
git add torsion-universe-codex
git commit -m "feat: build codex torsion universe cycle field"
```

## 任务 3：实现 Codex 版分析场与控制面板

**文件：**
- 创建：`torsion-universe-codex/js/analysis-field.js`
- 创建：`torsion-universe-codex/js/ui.js`
- 修改：`torsion-universe-codex/js/main.js`
- 修改：`torsion-universe-codex/css/style.css`

- [ ] **步骤 1：实现分区结构数据**

```js
export const regions = [
  { id: "outer-a", layer: "outer", direction: 1 },
  { id: "outer-b", layer: "outer", direction: -1 },
  { id: "transfer", layer: "middle", direction: 1 },
  { id: "maximum-torsion", layer: "core", direction: -1 },
];
```

每个区域建立稳定的节点集合，连线从角动量源指向临界面，不每帧随机改变拓扑。

- [ ] **步骤 2：实现平滑模式切换**

切换时缓动摄像机位置、视点和两个场景组的透明度；完成后才禁用隐藏组的更新。

- [ ] **步骤 3：实现实时仪表盘**

`ui.js` 只消费 `evaluateCycle()` 的返回值；不自行重新计算另一套阶段或指标。

- [ ] **步骤 4：实现移动端折叠仪表盘与 reduced-motion**

屏宽小于 `760px` 时仪表盘改为底部抽屉。`prefers-reduced-motion` 为 `reduce` 时，初始 `playing=false`，但时间轴仍可使用。

- [ ] **步骤 5：运行合同测试**

运行：`node tests/torsion-universe-contract.mjs`

预期：DeepSeek 目录尚未创建时，仅因该目录 `ENOENT` 失败；Codex 标记不得失败。

- [ ] **步骤 6：提交 Codex 完整版**

```bash
git add torsion-universe-codex
git commit -m "feat: complete codex torsion analysis interface"
```

## 任务 4：独立产出 DeepSeek 版

**文件：**
- 创建：`torsion-universe-deepseek/index.html`
- 创建：`torsion-universe-deepseek/css/style.css`
- 创建：`torsion-universe-deepseek/js/*.js`

- [ ] **步骤 1：向 DeepSeek 提供完整、有边界的任务包**

提示必须包含：设计规格全文路径、三张用户参考图路径、本计划、只能写入 `torsion-universe-deepseek/`、不修改 `models.html` 与 `src/index.js`。

- [ ] **步骤 2：让 DeepSeek 实现而不读取 Codex 源码**

DeepSeek 可读规格与项目公共风格，但提示中明确禁止读取 `torsion-universe-codex/`，防止两版趋同。

- [ ] **步骤 3：运行合同测试**

运行：`node tests/torsion-universe-contract.mjs`

预期：输出 `torsion universe contract: PASS`。

- [ ] **步骤 4：提交 DeepSeek 版**

```bash
git add torsion-universe-deepseek
git commit -m "feat: add independent deepseek torsion universe prototype"
```

## 任务 5：浏览器验收与并排对比

**文件：**
- 创建：`tests/torsion-universe-browser.mjs`
- 创建：`comparison/torsion-universe/index.html`
- 创建：`comparison/torsion-universe/screenshots/codex-cycle.png`
- 创建：`comparison/torsion-universe/screenshots/codex-analysis.png`
- 创建：`comparison/torsion-universe/screenshots/deepseek-cycle.png`
- 创建：`comparison/torsion-universe/screenshots/deepseek-analysis.png`

- [ ] **步骤 1：编写浏览器合同**

```js
for (const variant of ["codex", "deepseek"]) {
  await page.goto(`http://127.0.0.1:8080/torsion-universe-${variant}/`);
  await page.locator('[data-mode="analysis"]').click();
  await page.locator('#phase-slider').fill('0.62');
  await page.waitForTimeout(900);
  if (await page.locator('canvas').count()) {
    await page.locator('canvas').screenshot({ path: `comparison/torsion-universe/screenshots/${variant}-analysis.png` });
  } else {
    throw new Error(`${variant}: no canvas`);
  }
}
```

- [ ] **步骤 2：运行桌面端截图和控制台检查**

预期：两个页面都产生循环场/分析场截图，无 `pageerror`。

- [ ] **步骤 3：运行手机窄屏检查**

视口：`390×844`。

预期：模式按钮可见，仪表盘可折叠，主模型中心不被大段文字遮挡。

- [ ] **步骤 4：创建并排页**

并排页对两个版本使用等尺寸 `iframe`，只提供“Codex”、“DeepSeek”标题和全屏打开按钮，不对任一版额外美化。

- [ ] **步骤 5：提交验收工具与截图**

```bash
git add tests comparison/torsion-universe
git commit -m "test: add torsion universe visual comparison"
```

## 任务 6：最终核验

- [ ] **步骤 1：确认用户现有变更仍在**

运行：`git status --short`

预期：`src/index.js` 仍显示为用户未提交修改，本任务的 commit 中不包含该文件。

- [ ] **步骤 2：重跑所有契约与浏览器测试**

运行：

```bash
node tests/torsion-universe-contract.mjs
node tests/torsion-universe-browser.mjs
```

预期：全部 PASS，无未处理的控制台错误。

- [ ] **步骤 3：打开并排页供用户选择**

打开：`http://127.0.0.1:8080/comparison/torsion-universe/`

交付时只报告可验证差异：动画逻辑、视觉密度、移动端性能、控制完整性。不提前替用户选定胜出版本。
