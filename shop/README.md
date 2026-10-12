# EDY STUDIO 选品 · Web3D 独立站

挂在 EdyStudio 站点下的一个独立电商站：`/shop/`
商品图**不是图片文件**，是浏览器用 three.js 实时渲染出来的 3D 模型，
所以加一件商品不用拍图、不用建模，写几行数据就有图。

```
shop/
├── index.html          首页：3D 主推轮播 + 商品网格 + 购物车抽屉
├── product.html        详情页：大 3D 视图 + 换配色 + 加购
├── checkout.html       结算页：填收货信息 → 生成订单
├── data/products.js    ★ 商品数据，平时只改这一个文件
├── css/shop.css        样式
├── js/models.js        程序化 3D 模型（项链/手镯/戒指/包/表/胸针/耳饰）
├── js/viewer.js        3D 引擎：影棚灯光、轨道控制、离屏出图
├── js/store.js         购物车、订单
├── js/thumbs.js        缩略图队列
└── vendor/three.min.js three.js r149（本地存放，不依赖任何 CDN）
```

---

## 一、日常怎么用（只会改一个文件）

打开 `data/products.js`，照着现有格式加一行商品就上架了：

```js
{
  id: 'my-necklace-01',       // 唯一编号，详情页靠它找货
  name: '我的项链',
  brand: '',                  // 品牌名，自有货留空
  demo: false,                // 正式货写 false（demo:true 前台会打「示例」角标）
  category: 'necklace',       // 分类 id，见 categories
  price: 880,
  origin: 0,                  // 划线价，没有写 0
  stock: 1,
  model: 'necklace',          // 用哪个 3D 模型，见下表
  variant: { metal: 'gold', gem: 'clear' },
  tagline: '一句话卖点',
  tags: ['特价'],
  specs: [['材质', '18K 金'], ['链长', '42cm']],
  desc: ['第一段', '第二段']
}
```

改完刷新页面就生效，**不用打包、不用构建**。

### 3D 模型和配色对照

| `model` | 长什么样 | 可换的配色 |
|--------|----------|------------|
| `necklace` | 链条 + 吊坠（带 T 型展示架） | `metal`、`gem` |
| `bracelet` | 开口手镯 | `metal` |
| `ring` | 戒指 + 四爪托座 + 主石 | `metal`、`gem` |
| `bag` | 翻盖包 + 链条提手 | `body`、`metal` |
| `watch` | 腕表（表壳/表盘/指针/钢带） | `metal`、`dial` |
| `brooch` | 花形胸针 | `metal`、`gem` |
| `earring` | 一对圆环耳饰 | `metal` |

配色表在 `data/products.js` 底部的 `SHOP_MATERIALS`：
`METALS`（金色/玫瑰金/银/钢/黑金）、`GEMS`（无色/白钻/托帕/祖母绿/红宝）、
`LEATHERS`（黑/驼/米白/酒红）、`DIALS`（黑盘/白盘/蓝盘）。
想加新颜色，往表里加一行即可，例如：

```js
gold: { name: '18K 金', color: 0xE9C583, metalness: 1.0, roughness: 0.17 },
```

> 颜色是按 sRGB 十六进制填的，代码里会自动转成线性，
> 所以照着屏幕取色器填就行，不用自己换算。

### 想加一个全新的款式

在 `js/models.js` 的 `BUILDERS` 里加一个函数，返回
`{ group, spin, tilt }`（`spin` 是自动旋转速度，`tilt` 是摆放角度），
然后在 `products.js` 里把 `model` 写成它的名字。
现有的函数可以直接抄：链环用 `InstancedMesh` 一次画完，包体用
`ExtrudeGeometry` + 倒角，花瓣用压扁的球体。

---

## 二、现在还没接的东西（说清楚免得误会）

- **没有支付**：点「生成订单」不会扣款。买家复制订单文本发到你的微信，
  你确认后手工收款。想自动收款要接支付网关（微信支付 / 支付宝），
  需要商户号，这块得单独做。
- **订单不落库**：订单只在买家的浏览器里生成（localStorage 留档 30 条）。
- **商品数据是本地文件**：改商品要改 `data/products.js` 再上传，
  没有后台管理系统。

### 想真的收到订单

在 `data/products.js` 里填：

```js
shop: {
  ...
  orderApi: 'https://你的域名/api/order'   // 留空就不发
}
```

填了之后，买家点「生成订单」时会 POST 一份 JSON 到这个地址：

```json
{
  "no": "EDY20261012-U86J",
  "createdAt": "2026-10-12T08:00:00.000Z",
  "contact": { "name": "张三", "phone": "13800138000", "address": "…", "note": "…" },
  "items": [{ "id": "demo-ring-01", "name": "单钻戒指 · 托座款", "variant": "925 银 · 白钻", "price": 460, "qty": 1, "sum": 460 }],
  "total": 460,
  "shop": { "name": "EDY STUDIO 选品", "wechat": "…", "phone": "…" }
}
```

接口要允许跨域（`Access-Control-Allow-Origin`），否则浏览器会拦。
Cloudflare Workers 写一个接收端大概 20 行，见 `wrangler.site.toml` 同目录下的部署说明。

---

## 三、上线

站点发布目录是 `dist/`，**改了东西一定要先重建 dist 再传**：

```bash
cd ~/Desktop/AI交互/edystudio

# 1) 重建发布目录
rsync -a --exclude '.git' --exclude '.clawhub' --exclude '.DS_Store' \
  --exclude 'AI-work' --exclude 'artifacts' --exclude 'tools' \
  --exclude '*.md' --exclude 'wrangler*.toml' --exclude 'deploy.sh' \
  --exclude 'dist*' --exclude '.worktrees' --exclude 'node_modules' ./ dist/

# 2) 删掉 dist 里两个超过 25MiB 的视频（Workers 单文件上限）
rm -f dist/web-showcase/public/media/aethera.mp4 dist/3d-web/aethera/media/aethera.mp4

# 3) 传到 Cloudflare
npx wrangler deploy -c wrangler.site.toml
```

传完访问 **https://edystudio.edyai.cc.cd/shop/**

本地预览：

```bash
cd ~/Desktop/AI交互/edystudio && python3 -m http.server 8137
# http://127.0.0.1:8137/shop/
```

> 注意：`data/products.js` 是普通 `<script>`，用 `file://` 直接双击打开也能跑，
> 但 `checkout` 的剪贴板接口在 `file://` 下会降级，建议用本地服务器预览。

---

## 四、代码里几个值得知道的点

- **three.js 用的是 r149**（`vendor/three.min.js`，从 `yixiang/` 复制过来的，
  和站内其它 3D 页面同版本）。这个版本**没有**自动做 sRGB→线性转换，
  所以所有颜色都要 `convertSRGBToLinear()`，`js/models.js` 里的 `srgb()` 就是干这个的。
- **没有 OrbitControls**：UMD 包里不含 examples 模块，轨道控制是 `js/viewer.js`
  自己写的（拖拽/滚轮/双指/阻尼），约 60 行。
- **环境贴图是画出来的**：`makeStudioTexture()` 用 canvas 画一张等距柱状全景
  （暗底 + 几块小柔光箱），再过 `PMREMGenerator` 给金属做反射。
- **缩略图是真的离屏渲染**：一个独立的 WebGL 上下文把所有商品依次渲成 PNG dataURL 缓存，
  避免每张卡片开一个上下文把手机搞卡。见 `js/viewer.js` 的 `renderThumbnails()`。
- **性能**：滚出视口自动暂停（IntersectionObserver），切到后台也暂停，
  不烧手机电池。
- **移动端优先**：买家多半在微信里打开，所以栅格、按钮、抽屉都是先按手机做的，
  760px / 900px 断点往上才变成多列和双栏。

---

## 五、已知边界

- 3D 模型是**示意**，比例和实物有出入，页脚已经写明「尺寸与细节以实物为准」。
- 数据文件里的 8 件商品都标了 `demo: true`（前台有「示例」角标），
  是拿来演示的。换成自己的货时把 `demo` 改成 `false`、把示例文案删掉。
- 想支持真图片（实拍图）的话，把 `cardHTML()` 里的 3D 缩略图换成
  `<img src="...">` 即可，两套可以共存。