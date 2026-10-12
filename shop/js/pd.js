/* =============================================================
   独立站 · 商品详情页逻辑
   ============================================================= */

(function () {
  'use strict';

  const S = window.SHOP;
  const esc = S.esc;
  const T = window.SHOP_MATERIALS;

  /* 每种模型开放哪些配色选项 */
  const OPTION_PLAN = {
    necklace:  ['metal', 'gem'],
    bracelet:  ['metal'],
    ring:      ['metal', 'gem'],
    bag:       ['body', 'metal'],
    watch:     ['metal', 'dial'],
    brooch:    ['metal', 'gem'],
    earring:   ['metal']
  };

  const LABELS = {
    metal: '颜色',
    gem: '主石',
    body: '颜色',
    dial: '表盘'
  };

  const TABLES = { metal: 'METALS', gem: 'GEMS', body: 'LEATHERS', dial: 'DIALS' };

  const id = new URLSearchParams(location.search).get('id');
  const product = id ? S.byId(id) : null;

  let variant = Object.assign({}, (product && product.variant) || {});
  let qty = 1;
  let viewer = null;
  let spinning = true;

  /* ── 没带 id 或商品不存在 ────────────────────────────── */

  if (!product) {
    document.querySelector('.pd-info').innerHTML =
      '<p class="empty-note">没有找到这件商品<br><a class="back-home" href="index.html">← 返回全部商品</a></p>';
    document.querySelector('.pd-stage').style.display = 'none';
    return;
  }

  /* ── 基础信息 ────────────────────────────────────────── */

  document.title = product.name + ' · EDY STUDIO 选品';
  document.getElementById('pdKicker').textContent =
    (product.brand ? product.brand + ' · ' : '') + S.catName(product.category);
  document.getElementById('pdName').textContent = product.name;
  document.getElementById('pdTagline').textContent = product.tagline || '';
  document.getElementById('pdPrice').textContent = S.money(product.price);
  document.getElementById('pdOrigin').textContent = product.origin ? S.money(product.origin) : '';
  document.getElementById('pdStock').textContent = product.stock
    ? '现货 ' + product.stock + ' 件'
    : '已售罄';

  document.getElementById('pdDesc').innerHTML =
    (product.desc || []).map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') ||
    '<p>' + esc(product.tagline || '') + '</p>';

  document.getElementById('pdSpecs').innerHTML =
    (product.specs || []).map(function (r) {
      return '<tr><td>' + esc(r[0]) + '</td><td>' + esc(r[1]) + '</td></tr>';
    }).join('');

  if (!product.stock) {
    document.getElementById('btnAdd').disabled = true;
    document.getElementById('btnBuy').disabled = true;
  }

  /* ── 配色选项 ────────────────────────────────────────── */

  function renderOptions() {
    const box = document.getElementById('pdOptions');
    const plan = OPTION_PLAN[product.model] || ['metal'];

    box.innerHTML = plan.map(function (key) {
      const table = T[TABLES[key]] || {};
      const swatches = Object.keys(table).map(function (k) {
        const def = table[k];
        const on = variant[key] === k;
        return '<button class="swatch' + (on ? ' on' : '') + '" data-key="' + key + '" data-val="' + k + '"' +
          ' title="' + esc(def.name) + '" style="background:#' + ('000000' + def.color.toString(16)).slice(-6) + '">' +
          '<span>' + esc(def.name) + '</span></button>';
      }).join('');

      const cur = (T[TABLES[key]] || {})[variant[key]];
      return '<div class="opt-row">' +
        '<p class="opt-label">' + LABELS[key] + '　<b>' + esc(cur ? cur.name : '') + '</b></p>' +
        '<div class="swatches" data-group="' + key + '">' + swatches + '</div>' +
      '</div>';
    }).join('');

    box.addEventListener('click', function (e) {
      const sw = e.target.closest('.swatch');
      if (!sw) return;
      const key = sw.getAttribute('data-key');
      variant[key] = sw.getAttribute('data-val');
      renderOptions();
      if (viewer && !viewer.error) viewer.setVariant(variant);
    });
  }

  /* ── 数量 / 购买 ─────────────────────────────────────── */

  document.getElementById('qtyMinus').addEventListener('click', function () {
    qty = Math.max(1, qty - 1);
    document.getElementById('qtyVal').textContent = qty;
  });
  document.getElementById('qtyPlus').addEventListener('click', function () {
    qty = Math.min(product.stock || 99, qty + 1);
    document.getElementById('qtyVal').textContent = qty;
  });

  document.getElementById('btnAdd').addEventListener('click', function () {
    S.addToCart(product.id, variant, qty);
    S.openCart();
    S.toast('已加入购物车');
  });

  document.getElementById('btnBuy').addEventListener('click', function () {
    S.addToCart(product.id, variant, qty);
    location.href = 'checkout.html';
  });

  /* ── 3D 舞台 ─────────────────────────────────────────── */

  function initStage() {
    const stage = document.getElementById('pdStage');
    viewer = new window.SHOP_VIEWER.Viewer(stage, {
      model: product.model,
      variant: variant,
      autoRotate: spinning,
      floor: true,
      padding: 1.2,
      fov: 30
    });
    if (viewer.error) {
      stage.innerHTML = '<p style="position:absolute;inset:0;display:grid;place-items:center;color:#6f7883;font-size:13px">' +
        esc(viewer.error) + '</p>';
      return;
    }
    viewer.start();
    viewer.setVariant(variant);

    const spinBtn = document.getElementById('btnSpin');
    spinBtn.addEventListener('click', function () {
      spinning = !spinning;
      viewer.setSpin(spinning);
      spinBtn.textContent = spinning ? '暂停旋转' : '自动旋转';
    });

    document.getElementById('btnShot').addEventListener('click', function () {
      const url = viewer.snapshot();
      if (!url) { S.toast('这张图存不下来，换个浏览器试试'); return; }
      const a = document.createElement('a');
      a.href = url;
      a.download = product.id + '-3d.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      S.toast('3D 图片已保存');
    });
  }

  /* ── 相关推荐 ────────────────────────────────────────── */

  function renderRelated() {
    const list = S.byCategory(product.category)
      .filter(function (p) { return p.id !== product.id; })
      .slice(0, 4);
    const box = document.getElementById('pdRelated');
    if (!list.length) { box.style.display = 'none'; return; }

    box.innerHTML = list.map(function (p) {
      const tags = (p.tags || []).slice(0, 1).map(function (t) {
        return '<span class="tag">' + esc(t) + '</span>';
      }).join('');
      return '<article class="card">' +
        '<a class="card-media" href="product.html?id=' + encodeURIComponent(p.id) + '">' +
          '<span class="thumb-ph" data-thumb="' + esc(p.id) + '"></span>' +
          (tags ? '<span class="card-tags">' + tags + '</span>' : '') +
        '</a>' +
        '<div class="card-body">' +
          '<a href="product.html?id=' + encodeURIComponent(p.id) + '">' +
            '<h3 class="card-name">' + esc(p.name) + '</h3></a>' +
          '<div class="card-foot"><span class="card-price">' + S.money(p.price) + '</span></div>' +
        '</div>' +
      '</article>';
    }).join('');

    window.SHOP_THUMBS.fill(box);
  }

  /* ── 启动 ────────────────────────────────────────────── */

  document.addEventListener('DOMContentLoaded', function () {
    S.mountCart();
    renderOptions();
    initStage();
    renderRelated();
  });

})();