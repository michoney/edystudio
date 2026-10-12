/* =============================================================
   独立站 · 程序化 3D 商品模型
   -------------------------------------------------------------
   所有商品模型都由代码实时生成，不依赖任何外部 3D 文件。
   想加新款式，在 BUILDERS 里加一个函数，再在 data/products.js
   里把 model 字段写成它的名字就行。

   用法：
     const model = SHOP_MODELS.create('necklace', {metal:'gold'}, TABLES);
     scene.add(model.group);
     SHOP_MODELS.applyVariant(model, {metal:'rose'});   // 换色
   ============================================================= */

(function (global) {
  'use strict';

  const T = global.THREE;
  if (!T) { console.warn('[shop] three.js 未加载'); return; }

  /* ── 材质 ──────────────────────────────────────────────── */

  /* three r149 默认 legacyMode：颜色不做 sRGB→线性转换，
     这里手动转一次，否则同样的十六进制会明显发白 */
  function srgb(hex) {
    return new T.Color(hex).convertSRGBToLinear();
  }

  function metalMat(def) {
    return new T.MeshPhysicalMaterial({
      color: srgb(def.color),
      metalness: def.metalness != null ? def.metalness : 1,
      roughness: def.roughness != null ? def.roughness : 0.2,
      envMapIntensity: 2.3,
      clearcoat: 0.4,
      clearcoatRoughness: 0.25
    });
  }

  function gemMat(def) {
    return new T.MeshPhysicalMaterial({
      color: srgb(def.color),
      metalness: 0.0,
      roughness: 0.02,
      transparent: true,
      opacity: def.opacity != null ? def.opacity : 0.62,
      envMapIntensity: 3.6,
      emissive: srgb(def.color),
      emissiveIntensity: 0.08,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      ior: 2.2,
      reflectivity: 1.0
    });
  }

  function leatherMat(def) {
    return new T.MeshPhysicalMaterial({
      color: srgb(def.color),
      metalness: 0.0,
      roughness: def.roughness != null ? def.roughness : 0.55,
      envMapIntensity: 0.7,
      clearcoat: 0.25,
      clearcoatRoughness: 0.65
    });
  }

  function dialMat(def) {
    return new T.MeshPhysicalMaterial({
      color: srgb(def.color),
      metalness: 0.35,
      roughness: 0.35,
      envMapIntensity: 1.0
    });
  }

  /* 展台 / 道具材质：不随商品配色变化 */
  function propMat(color, rough) {
    return new T.MeshStandardMaterial({
      color: srgb(color != null ? color : 0x0a0c0f),
      metalness: 0.12,
      roughness: rough != null ? rough : 0.82,
      envMapIntensity: 0.16
    });
  }

  /* ── 小工具 ────────────────────────────────────────────── */

  function mesh(geo, mat, x, y, z) {
    const m = new T.Mesh(geo, mat);
    if (x || y || z) m.position.set(x || 0, y || 0, z || 0);
    m.castShadow = true;
    return m;
  }

  /* 圆角矩形轮廓 */
  function roundRectShape(w, h, r) {
    const s = new T.Shape();
    const x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y);
    s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r);
    s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h);
    s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r);
    s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }

  /* 展台底盘：带一点反光的圆台 */
  function pedestal(r, h, mat) {
    const g = new T.Group();
    g.add(mesh(new T.CylinderGeometry(r, r * 1.03, h, 64), mat, 0, h / 2, 0));
    g.add(mesh(new T.CylinderGeometry(r * 1.06, r * 1.06, h * 0.22, 64), mat, 0, h * 0.11, 0));
    return g;
  }

  /* ── 01 项链：T 型展示架 + 链身 + 吊坠 ─────────────────── */

  function necklace(v, mats) {
    const g = new T.Group();
    const prop = propMat();

    /* 展示架：细长底座 + 双立柱 + 横梁（别用大盘子，会挡住吊坠） */
    g.add(mesh(new T.BoxGeometry(1.52, 0.035, 0.18), prop, 0, 0.018, 0));
    const bar = mesh(new T.CylinderGeometry(0.018, 0.018, 1.42, 20), prop, 0, 1.45, 0);
    bar.rotation.z = Math.PI / 2;
    g.add(bar);
    [-0.68, 0.68].forEach(function (x) {
      g.add(mesh(new T.CylinderGeometry(0.022, 0.022, 1.42, 20), prop, x, 0.73, 0));
    });

    /* 链身：闭合样条上等距排布小环，InstancedMesh 一个 draw call 搞定 */
    const V = function (x, y, z) { return new T.Vector3(x, y, z); };
    const pts = [
      V(-0.62, 1.45, 0.00), V(-0.46, 1.08, 0.07), V(-0.20, 0.80, 0.09),
      V( 0.00, 0.72, 0.09), V( 0.20, 0.80, 0.09), V( 0.46, 1.08, 0.07),
      V( 0.62, 1.45, 0.00), V( 0.42, 1.52, -0.07), V( 0.00, 1.54, -0.09),
      V(-0.42, 1.52, -0.07)
    ];
    const curve = new T.CatmullRomCurve3(pts, true, 'catmullrom', 0.4);
    const N = 110;
    const linkGeo = new T.TorusGeometry(0.034, 0.0125, 8, 22);
    const links = new T.InstancedMesh(linkGeo, mats.metal, N);
    const dummy = new T.Object3D();
    const up = new T.Vector3(0, 1, 0);
    const q = new T.Quaternion();
    const qSpin = new T.Quaternion();

    for (let i = 0; i < N; i++) {
      const t = i / N;
      const p = curve.getPointAt(t);
      const tan = curve.getTangentAt(t).normalize();
      q.setFromUnitVectors(up, tan);
      qSpin.setFromAxisAngle(tan, i % 2 ? Math.PI / 2 : 0);
      dummy.position.copy(p);
      dummy.quaternion.copy(qSpin).multiply(q);
      dummy.updateMatrix();
      links.setMatrixAt(i, dummy.matrix);
    }
    links.instanceMatrix.needsUpdate = true;
    g.add(links);

    /* 吊坠：接在链条最低点上（沿弧长找最低点，不能写死 t 值） */
    let bottom = new T.Vector3(0, 0.19, 0.09);
    curve.getSpacedPoints(160).forEach(function (p) {
      if (p.y < bottom.y) bottom = p;
    });
    const ring = mesh(new T.TorusGeometry(0.05, 0.014, 10, 28), mats.metal, 0, bottom.y - 0.06, 0.09);
    g.add(ring);
    const bail = mesh(new T.TorusGeometry(0.07, 0.016, 10, 28), mats.metal, 0, bottom.y - 0.15, 0.09);
    g.add(bail);

    const gemGeo = new T.IcosahedronGeometry(0.17, 0);
    const gem = mesh(gemGeo, mats.gem, 0, bottom.y - 0.36, 0.09);
    gem.scale.set(1, 1.3, 0.6);
    gem.rotation.z = Math.PI;
    g.add(gem);

    const bezel = mesh(new T.TorusGeometry(0.185, 0.016, 10, 40), mats.metal, 0, bottom.y - 0.36, 0.09);
    bezel.scale.set(1, 1.3, 1);
    g.add(bezel);

    return { group: g, spin: 0.0016, tilt: -0.05 };
  }

  /* ── 02 手镯：开口镯身 + 侧面标识 + 底座 ───────────────── */

  function bracelet(v, mats) {
    const g = new T.Group();
    const prop = propMat();
    g.add(pedestal(0.46, 0.045, prop));

    const bangle = new T.Group();
    const band = mesh(new T.TorusGeometry(0.42, 0.056, 20, 120, Math.PI * 1.84), mats.metal, 0, 0, 0);
    band.rotation.z = -Math.PI * 0.08;
    bangle.add(band);

    /* 开口两端的封头 + 卡扣 */
    [-1, 1].forEach(function (s) {
      const a = Math.PI * 0.92 * s - Math.PI * 0.08;
      const cap = mesh(new T.SphereGeometry(0.056, 20, 14), mats.metal, Math.cos(a) * 0.42, Math.sin(a) * 0.42, 0);
      bangle.add(cap);
    });
    const clasp = mesh(new T.BoxGeometry(0.1, 0.05, 0.05), mats.metal, 0.3, 0.36, 0);
    bangle.add(clasp);

    /* 侧面标识：三枚小方块，模拟字母件 */
    for (let i = -1; i <= 1; i++) {
      const a = -Math.PI / 2 + i * 0.19;
      const bar = mesh(new T.BoxGeometry(0.045, 0.05, 0.014), mats.metal,
        Math.cos(a) * 0.475, Math.sin(a) * 0.475, 0);
      bar.rotation.z = a + Math.PI / 2;
      bangle.add(bar);
    }

    /* 镯身内侧刻线 */
    const line = mesh(new T.TorusGeometry(0.372, 0.008, 8, 80, Math.PI * 1.84), mats.metal, 0, 0, 0);
    line.rotation.z = -Math.PI * 0.08;
    line.rotation.y = 0.02;
    bangle.add(line);

    bangle.position.y = 0.50;
    bangle.rotation.x = -0.42;
    g.add(bangle);

    return { group: g, spin: 0.0022, tilt: 0 };
  }

  /* ── 03 戒指：戒圈 + 四爪托座 + 主石 ──────────────────── */

  function ring(v, mats) {
    const g = new T.Group();
    const prop = propMat();
    g.add(pedestal(0.42, 0.04, prop));

    const r = new T.Group();

    /* 戒圈：截面是圆角的方条，比圆管更接近实拍 */
    const bandGeo = new T.TorusGeometry(0.3, 0.055, 18, 90);
    r.add(mesh(bandGeo, mats.metal));

    /* 托座：四爪 + 底座 */
    const seat = mesh(new T.CylinderGeometry(0.115, 0.085, 0.14, 8), mats.metal, 0, 0.38, 0);
    r.add(seat);
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + i * Math.PI / 2;
      const prong = mesh(new T.CylinderGeometry(0.017, 0.02, 0.17, 8), mats.metal,
        Math.cos(a) * 0.095, 0.44, Math.sin(a) * 0.095);
      prong.rotation.z = -Math.cos(a) * 0.2;
      prong.rotation.x = Math.sin(a) * 0.2;
      r.add(prong);
    }

    /* 主石 */
    const gem = mesh(new T.IcosahedronGeometry(0.19, 0), mats.gem, 0, 0.5, 0);
    gem.scale.set(1, 0.92, 1);
    r.add(gem);

    r.position.y = 0.42;
    r.rotation.x = -0.28;
    g.add(r);

    return { group: g, spin: 0.0026, tilt: 0 };
  }

  /* ── 04 箱包：翻盖包体 + 提手 + 五金 ───────────────────── */

  function bag(v, mats) {
    const g = new T.Group();
    const prop = propMat();
    g.add(pedestal(0.54, 0.045, prop));

    const b = new T.Group();
    const W = 0.86, H = 0.62, D = 0.26;

    /* 主体：圆角矩形挤出 + 倒角 */
    const bodyGeo = new T.ExtrudeGeometry(roundRectShape(W, H, 0.09), {
      depth: D, bevelEnabled: true, bevelThickness: 0.045,
      bevelSize: 0.05, bevelSegments: 4, curveSegments: 14
    });
    bodyGeo.center();
    b.add(mesh(bodyGeo, mats.body));

    /* 翻盖：略小的圆角矩形，压在包体上半部 */
    const flapGeo = new T.ExtrudeGeometry(roundRectShape(W * 0.98, H * 0.52, 0.08), {
      depth: 0.07, bevelEnabled: true, bevelThickness: 0.02,
      bevelSize: 0.02, bevelSegments: 3, curveSegments: 12
    });
    flapGeo.center();
    const flap = mesh(flapGeo, mats.body, 0, H * 0.2, D / 2 + 0.055);
    flap.scale.set(1, 1, 1);
    b.add(flap);

    /* 提手：半圆弧管 */
    const hc = new T.CatmullRomCurve3([
      new T.Vector3(-0.24, H / 2 + 0.02, 0.02),
      new T.Vector3(-0.2,  H / 2 + 0.22, 0.02),
      new T.Vector3( 0.0,  H / 2 + 0.3, 0.02),
      new T.Vector3( 0.2,  H / 2 + 0.22, 0.02),
      new T.Vector3( 0.24, H / 2 + 0.02, 0.02)
    ]);
    b.add(mesh(new T.TubeGeometry(hc, 40, 0.026, 12, false), mats.metal));

    /* 提手两端挂耳 + 翻盖锁扣 */
    [-0.24, 0.24].forEach(function (x) {
      b.add(mesh(new T.TorusGeometry(0.045, 0.011, 8, 24), mats.metal, x, H / 2 + 0.01, 0.02));
    });
    const lock = mesh(new T.CylinderGeometry(0.055, 0.055, 0.02, 24), mats.metal, 0, -0.02, D / 2 + 0.1);
    lock.rotation.x = Math.PI / 2;
    b.add(lock);
    b.add(mesh(new T.BoxGeometry(0.05, 0.09, 0.014), mats.metal, 0, -0.05, D / 2 + 0.115));

    b.position.y = 0.42;
    b.rotation.x = -0.18;
    g.add(b);

    return { group: g, spin: 0.0018, tilt: 0 };
  }

  /* ── 05 腕表：表壳 + 表盘 + 指针 + 钢带 ────────────────── */

  function watch(v, mats) {
    const g = new T.Group();
    const prop = propMat();
    g.add(pedestal(0.56, 0.045, prop));

    const w = new T.Group();

    /* 表壳 */
    const caseMesh = mesh(new T.CylinderGeometry(0.42, 0.4, 0.17, 72), mats.metal);
    caseMesh.rotation.x = Math.PI / 2;
    w.add(caseMesh);

    /* 表圈 */
    const bezel = mesh(new T.TorusGeometry(0.42, 0.042, 14, 80), mats.metal, 0, 0, 0.075);
    w.add(bezel);

    /* 表盘 */
    const dial = mesh(new T.CircleGeometry(0.365, 64), mats.dial, 0, 0, 0.088);
    w.add(dial);

    /* 时标 */
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2;
      const tick = mesh(new T.BoxGeometry(0.022, 0.062, 0.008), mats.metal,
        Math.sin(a) * 0.3, Math.cos(a) * 0.3, 0.094);
      tick.rotation.z = -a;
      w.add(tick);
    }

    /* 指针：时针 / 分针 / 秒针 */
    const hour = mesh(new T.BoxGeometry(0.03, 0.19, 0.006), mats.metal, 0, 0.07, 0.1);
    hour.rotation.z = -0.7;
    const min = mesh(new T.BoxGeometry(0.022, 0.27, 0.006), mats.metal, 0, 0.1, 0.102);
    min.rotation.z = 1.9;
    const sec = mesh(new T.BoxGeometry(0.012, 0.3, 0.005), mats.metal, 0, 0.12, 0.104);
    sec.rotation.z = -2.6;
    w.add(hour, min, sec);
    w.add(mesh(new T.CylinderGeometry(0.028, 0.028, 0.02, 20), mats.metal, 0, 0, 0.106)
      .rotateX(Math.PI / 2));

    /* 冠表 */
    const crown = mesh(new T.CylinderGeometry(0.045, 0.045, 0.06, 20), mats.metal, 0.46, 0, 0);
    crown.rotation.z = Math.PI / 2;
    w.add(crown);

    /* 钢带：上下两段弧形带 */
    [1, -1].forEach(function (s) {
      const strap = mesh(new T.TorusGeometry(0.5, 0.085, 12, 48, Math.PI * 0.62), mats.metal, 0, 0, -0.02);
      strap.scale.set(1, 1, 0.42);
      strap.rotation.z = s > 0 ? -Math.PI * 0.31 : Math.PI * 0.69;
      w.add(strap);
    });

    w.position.y = 0.66;
    w.rotation.x = -0.35;
    g.add(w);

    return { group: g, spin: 0.0014, tilt: 0 };
  }

  /* ── 06 胸针：花形花瓣 + 花心 + 别针 ───────────────────── */

  function brooch(v, mats) {
    const g = new T.Group();
    const prop = propMat();
    g.add(pedestal(0.46, 0.04, prop));

    const flower = new T.Group();
    const petalGeo = new T.SphereGeometry(0.17, 26, 16);

    /* 外层花瓣 */
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      const p = mesh(petalGeo, mats.metal, Math.cos(a) * 0.19, Math.sin(a) * 0.19, 0);
      p.scale.set(1, 0.62, 0.4);
      p.rotation.z = a;
      p.rotation.x = 0.45;
      flower.add(p);
    }
    /* 内层花瓣（错开半个角度） */
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2 + Math.PI / 8;
      const p = mesh(petalGeo, mats.metal, Math.cos(a) * 0.1, Math.sin(a) * 0.1, 0.035);
      p.scale.set(0.66, 0.44, 0.32);
      p.rotation.z = a;
      p.rotation.x = 0.35;
      flower.add(p);
    }
    /* 花心 + 小石 */
    flower.add(mesh(new T.SphereGeometry(0.085, 24, 16), mats.metal, 0, 0, 0.05));
    flower.add(mesh(new T.IcosahedronGeometry(0.05, 0), mats.gem, 0, 0, 0.1));

    /* 背面别针 */
    const pin = mesh(new T.CylinderGeometry(0.012, 0.012, 0.52, 12), propMat(), 0, 0, -0.06);
    pin.rotation.z = Math.PI / 2;
    flower.add(pin);

    flower.position.y = 0.42;
    flower.rotation.x = -0.5;
    g.add(flower);

    return { group: g, spin: 0.0024, tilt: 0 };
  }

  /* ── 07 耳饰：一对圆环挂在横杆上 ───────────────────────── */

  function earring(v, mats) {
    const g = new T.Group();
    const prop = propMat();

    const bar = mesh(new T.CylinderGeometry(0.016, 0.016, 1.0, 20), prop, 0, 0.78, 0);
    bar.rotation.z = Math.PI / 2;
    g.add(bar);
    [-0.46, 0.46].forEach(function (x) {
      g.add(mesh(new T.CylinderGeometry(0.02, 0.02, 0.78, 20), prop, x, 0.39, 0));
    });
    g.add(pedestal(0.4, 0.035, prop));

    [-0.26, 0.26].forEach(function (x) {
      const hoop = mesh(new T.TorusGeometry(0.2, 0.026, 12, 64), mats.metal, x, 0.28, 0);
      hoop.rotation.y = 0.18;
      g.add(hoop);
      g.add(mesh(new T.SphereGeometry(0.038, 20, 14), mats.metal, x, 0.50, 0.005));
      g.add(mesh(new T.TorusGeometry(0.03, 0.009, 8, 20), mats.metal, x, 0.46, 0.005));
    });

    return { group: g, spin: 0.002, tilt: 0 };
  }

  /* ── 表 ───────────────────────────────────────────────── */

  const BUILDERS = {
    necklace: necklace,
    bracelet: bracelet,
    ring: ring,
    bag: bag,
    watch: watch,
    brooch: brooch,
    earring: earring
  };

  /* ── 对外接口 ─────────────────────────────────────────── */

  function pick(table, key, fallbackKey) {
    if (!table) return null;
    return table[key] || table[fallbackKey] || table[Object.keys(table)[0]];
  }

  function applyVariant(model, variant) {
    if (!model || !model.mats) return;
    const v = variant || {};
    const tbl = model.tables;
    const set = function (mat, def) {
      if (!mat || !def) return;
      mat.color.setHex(def.color).convertSRGBToLinear();
      if (def.metalness != null) mat.metalness = def.metalness;
      if (def.roughness != null) mat.roughness = def.roughness;
      if (def.opacity != null) mat.opacity = def.opacity;
      mat.needsUpdate = true;
    };
    const setGem = function (def) {
      if (!model.mats.gem || !def) return;
      model.mats.gem.color.setHex(def.color).convertSRGBToLinear();
      model.mats.gem.emissive.setHex(def.color).convertSRGBToLinear();
      if (def.opacity != null) model.mats.gem.opacity = def.opacity;
      model.mats.gem.needsUpdate = true;
    };
    set(model.mats.metal, pick(tbl.METALS, v.metal, 'gold'));
    setGem(pick(tbl.GEMS, v.gem, 'clear'));
    set(model.mats.body, pick(tbl.LEATHERS, v.body, 'black'));
    set(model.mats.dial, pick(tbl.DIALS, v.dial, 'black'));
  }

  function create(kind, variant, tables) {
    const builder = BUILDERS[kind] || necklace;
    const mats = {
      metal: metalMat(pick(tables.METALS, variant && variant.metal, 'gold')),
      gem: gemMat(pick(tables.GEMS, variant && variant.gem, 'clear')),
      body: leatherMat(pick(tables.LEATHERS, variant && variant.body, 'black')),
      dial: dialMat(pick(tables.DIALS, variant && variant.dial, 'black'))
    };
    const built = builder(variant, mats) || { group: new T.Group() };
    const model = {
      kind: kind,
      group: built.group,
      mats: mats,
      tables: tables,
      spin: built.spin != null ? built.spin : 0.002,
      tilt: built.tilt || 0
    };
    applyVariant(model, variant);
    return model;
  }

  global.SHOP_MODELS = { create: create, applyVariant: applyVariant, kinds: Object.keys(BUILDERS) };

})(window);