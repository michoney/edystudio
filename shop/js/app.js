/* =============================================================
   独立站 · 首页逻辑
   ============================================================= */

(function () {
  'use strict';

  const S = window.SHOP;
  const esc = S.esc;

  /* ── 主推轮播 ─────────────────────────────────────────── */

  const featured = S.products().slice(0, 6);
  let heroIdx = 0;
  let viewer = null;
  let autoTimer = null;

  function initHero() {
    const stage = document.getElementById('heroStage');
    if (!stage || !featured.length) return;

    const first = featured[0];
    viewer = new window.SHOP_VIEWER.Viewer(stage, {
      model: first.model,
      variant: first.variant,
      autoRotate: true,
      floor: true,
      padding: 1.12
    });

    if (viewer.error) {
      stage.innerHTML = '<p style="position:absolute;inset:0;display:grid;place-items:center;color:#6f7883;font-size:13px">' +
        esc(viewer.error) + '</p>';
      return;
    }
    viewer.start();

    const dots = document.getElementById('heroDots');
    dots.innerHTML = featured.map(function (_, i) {
      return '<i data-i="' + i + '" class="' + (i === 0 ? 'on' : '') + '"></i>';
    }).join('');
    dots.addEventListener('click', function (e) {
      const i = e.target.getAttribute('data-i');
      if (i == null) return;
      go(+i, true);
    });

    document.getElementById('heroPrev').addEventListener('click', function () { go(heroIdx - 1, true); });
    document.getElementById('heroNext').addEventListener('click', function () { go(heroIdx + 1, true); });

    /* 手机上左右滑动切换 */
    let sx = 0;
    stage.addEventListener('pointerdown', function (e) { sx = e.clientX; });
    stage.addEventListener('pointerup', function (e) {
      if (Math.abs(e.clientX - sx) > 60) go(heroIdx + (e.clientX < sx ? 1 : -1), true);
    });

    render(0);
    play();
  }

  function go(i, userAction) {
    if (!featured.length) return;
    heroIdx = (i + featured.length) % featured.length;
    render(heroIdx);
    if (userAction) play();
  }

  function render(i) {
    const p = featured[i];
    if (viewer && !viewer.error && viewer.model) {
      viewer.setModel(p.model, p.variant);
    }
    document.getElementById('heroKicker').textContent = p.brand || ('FEATURED · ' + S.catName(p.category));
    document.getElementById('heroName').textContent = p.name;
    document.getElementById('heroTagline').textContent = p.tagline || '';
    document.getElementById('heroPrice').textContent = S.money(p.price);
    document.getElementById('heroLink').href = 'product.html?id=' + encodeURIComponent(p.id);
    document.querySelectorAll('#heroDots i').forEach(function (dot, n) {
      dot.classList.toggle('on', n === i);
    });
  }

  function play() {
    clearInterval(autoTimer);
    autoTimer = setInterval(function () { go(heroIdx + 1); }, 6500);
  }

  /* ── 分类 ────────────────────────────────────────────── */

  let activeCat = 'all';

  function renderFilters() {
    const box = document.getElementById('filters');
    box.innerHTML = (S.data.categories || []).map(function (c) {
      return '<button class="chip' + (c.id === activeCat ? ' on' : '') +
        '" data-cat="' + c.id + '">' + esc(c.name) + '</button>';
    }).join('');

    box.addEventListener('click', function (e) {
      const btn = e.target.closest('.chip');
      if (!btn) return;
      activeCat = btn.getAttribute('data-cat');
      box.querySelectorAll('.chip').forEach(function (c) {
        c.classList.toggle('on', c === btn);
      });
      renderGrid();
    });
  }

  /* ── 商品网格 ────────────────────────────────────────── */

  function cardHTML(p) {
    const tags = (p.tags || []).map(function (t) {
      return '<span class="tag">' + esc(t) + '</span>';
    });
    if (p.demo) tags.push('<span class="tag tag-demo">示例</span>');
    if (!p.stock) tags.push('<span class="tag tag-sold">已售罄</span>');

    return '<article class="card" data-id="' + esc(p.id) + '">' +
      '<a class="card-media" href="product.html?id=' + encodeURIComponent(p.id) + '">' +
        '<span class="thumb-ph" data-thumb="' + esc(p.id) + '"></span>' +
        '<span class="card-tags">' + tags.join('') + '</span>' +
      '</a>' +
      '<div class="card-body">' +
        '<a href="product.html?id=' + encodeURIComponent(p.id) + '">' +
          '<h3 class="card-name">' + esc(p.name) + '</h3>' +
          (p.brand ? '<p class="card-brand">' + esc(p.brand) + '</p>' : '') +
        '</a>' +
        '<div class="card-foot">' +
          '<span class="card-price">' + S.money(p.price) + '</span>' +
          (p.origin ? '<span class="card-origin">' + S.money(p.origin) + '</span>' : '') +
          '<button class="card-add" data-add="' + esc(p.id) + '" aria-label="加入购物车">＋</button>' +
        '</div>' +
      '</div>' +
    '</article>';
  }

  function renderGrid() {
    const list = S.byCategory(activeCat);
    const grid = document.getElementById('grid');
    if (!list.length) {
      grid.innerHTML = '<p class="empty-note">这个分类还没有商品</p>';
      return;
    }
    grid.innerHTML = list.map(cardHTML).join('');
    window.SHOP_THUMBS.fill(grid);
  }

  document.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-add]');
    if (!btn) return;
    e.preventDefault();
    const p = S.byId(btn.getAttribute('data-add'));
    if (!p) return;
    if (!p.stock) { S.toast('这一件已经出手了'); return; }
    S.addToCart(p.id, p.variant, 1);
    S.toast('已加入购物车 · ' + p.name);
  });

  /* ── 页脚 ────────────────────────────────────────────── */

  function renderFoot() {
    const c = S.data.shop.contact;
    document.getElementById('footContact').textContent =
      '微信 ' + c.wechat + '　·　电话 ' + c.phone + '　·　' + c.note;
  }

  /* ── 启动 ────────────────────────────────────────────── */

  document.addEventListener('DOMContentLoaded', function () {
    S.mountCart();
    renderFilters();
    renderGrid();
    renderFoot();
    initHero();

    /* 购物车里的缩略图 */
    window.addEventListener('shop:cart', function () {
      window.SHOP_THUMBS.fill(document);
    });
  });

})();