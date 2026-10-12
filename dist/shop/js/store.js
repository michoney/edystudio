/* =============================================================
   独立站 · 店铺逻辑（商品查询 / 购物车 / 订单）
   -------------------------------------------------------------
   纯前端：购物车存在浏览器 localStorage，订单在前端生成，
   买家复制订单文本发给卖家。README 里写了怎么接后端接口。
   ============================================================= */

(function (global) {
  'use strict';

  const DATA = global.SHOP_DATA;
  const CART_KEY = 'edy.shop.cart.v1';

  const money = function (n) {
    const v = Math.round(Number(n) * 100) / 100;
    const s = v.toFixed(2).replace(/\.00$/, '');
    return (DATA.shop.currency || '¥') + s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const escapeHTML = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  /* ── 商品 ──────────────────────────────────────────────── */

  const allProducts = function () { return (DATA.products || []); };
  const byId = function (id) {
    const list = allProducts();
    for (let i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  };
  const byCategory = function (cat) {
    if (!cat || cat === 'all') return allProducts();
    return allProducts().filter(function (p) { return p.category === cat; });
  };
  const catName = function (cat) {
    const list = DATA.categories || [];
    for (let i = 0; i < list.length; i++) if (list[i].id === cat) return list[i].name;
    return cat;
  };

  /* 变体 → 人话，例如「18K 金 / 托帕」 */
  function variantText(v) {
    if (!v) return '';
    const T = global.SHOP_MATERIALS || {};
    const out = [];
    if (v.metal && T.METALS && T.METALS[v.metal]) out.push(T.METALS[v.metal].name);
    if (v.body && T.LEATHERS && T.LEATHERS[v.body]) out.push(T.LEATHERS[v.body].name);
    if (v.dial && T.DIALS && T.DIALS[v.dial]) out.push(T.DIALS[v.dial].name);
    if (v.gem && T.GEMS && T.GEMS[v.gem]) out.push(T.GEMS[v.gem].name);
    return out.join(' · ');
  }

  /* ── 购物车 ────────────────────────────────────────────── */

  function readCart() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }

  function writeCart(list) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(list)); } catch (e) { /* 隐私模式忽略 */ }
    global.dispatchEvent(new CustomEvent('shop:cart', { detail: list }));
  }

  const cartKey = function (id, variant) {
    return id + '|' + JSON.stringify(variant || {});
  };

  function addToCart(id, variant, qty) {
    const p = byId(id);
    if (!p) return null;
    const key = cartKey(id, variant);
    const list = readCart();
    const hit = list.filter(function (i) { return i.key === key; })[0];
    if (hit) hit.qty += (qty || 1);
    else list.push({ key: key, id: id, variant: variant || {}, qty: qty || 1 });
    writeCart(list);
    return p;
  }

  function setQty(key, qty) {
    let list = readCart();
    if (qty <= 0) list = list.filter(function (i) { return i.key !== key; });
    else list.forEach(function (i) { if (i.key === key) i.qty = qty; });
    writeCart(list);
  }

  function removeItem(key) { setQty(key, 0); }

  function clearCart() { writeCart([]); }

  function cartLines() {
    return readCart().map(function (i) {
      const p = byId(i.id);
      return p ? {
        key: i.key, id: i.id, qty: i.qty, product: p,
        variant: i.variant, variantText: variantText(i.variant),
        price: Number(p.price) || 0,
        sum: (Number(p.price) || 0) * i.qty
      } : null;
    }).filter(Boolean);
  }

  function cartCount() {
    return readCart().reduce(function (s, i) { return s + i.qty; }, 0);
  }

  function cartTotal() {
    return cartLines().reduce(function (s, l) { return s + l.sum; }, 0);
  }

  /* ── 提示条 ────────────────────────────────────────────── */

  let toastTimer = null;
  function toast(msg) {
    let el = document.getElementById('shop-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'shop-toast';
      el.className = 'shop-toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('is-on'); }, 2000);
  }

  /* ── 购物车抽屉 ────────────────────────────────────────── */

  let drawer = null;

  function ensureDrawer() {
    if (drawer) return drawer;
    drawer = document.createElement('aside');
    drawer.className = 'cart-drawer';
    drawer.setAttribute('aria-hidden', 'true');
    drawer.innerHTML =
      '<header class="cart-head">' +
        '<h2>购物车</h2>' +
        '<button class="cart-close" aria-label="关闭">×</button>' +
      '</header>' +
      '<div class="cart-body"></div>' +
      '<footer class="cart-foot">' +
        '<div class="cart-sum"><span>合计</span><b class="cart-total">¥0</b></div>' +
        '<a class="btn btn-gold btn-block" href="checkout.html">去结算</a>' +
        '<button class="btn btn-ghost btn-block cart-clear">清空购物车</button>' +
      '</footer>';
    document.body.appendChild(drawer);

    const mask = document.createElement('div');
    mask.className = 'cart-mask';
    document.body.appendChild(mask);

    drawer.querySelector('.cart-close').addEventListener('click', closeCart);
    drawer.querySelector('.cart-clear').addEventListener('click', function () {
      clearCart(); renderCart(); toast('购物车已清空');
    });
    mask.addEventListener('click', closeCart);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeCart();
    });
    return drawer;
  }

  function openCart() {
    ensureDrawer();
    renderCart();
    document.body.classList.add('cart-open');
    drawer.setAttribute('aria-hidden', 'false');
  }

  function closeCart() {
    if (!drawer) return;
    document.body.classList.remove('cart-open');
    drawer.setAttribute('aria-hidden', 'true');
  }

  function renderCart() {
    if (!drawer) return;
    const body = drawer.querySelector('.cart-body');
    const lines = cartLines();

    if (!lines.length) {
      body.innerHTML = '<p class="cart-empty">购物车还是空的<br><a href="index.html">去挑一件 →</a></p>';
    } else {
      body.innerHTML = lines.map(function (l) {
        return '<article class="cart-item">' +
          '<a class="cart-thumb" href="product.html?id=' + encodeURIComponent(l.id) + '">' +
            '<span class="thumb-ph" data-thumb="' + escapeHTML(l.id) + '"></span>' +
          '</a>' +
          '<div class="cart-info">' +
            '<a class="cart-name" href="product.html?id=' + encodeURIComponent(l.id) + '">' +
              escapeHTML(l.product.name) + (l.product.demo ? '<i class="tag-demo">示例</i>' : '') + '</a>' +
            (l.variantText ? '<p class="cart-var">' + escapeHTML(l.variantText) + '</p>' : '') +
            '<p class="cart-price">' + money(l.price) + ' × ' + l.qty + ' = <b>' + money(l.sum) + '</b></p>' +
            '<div class="qty">' +
              '<button data-act="minus" data-key="' + escapeHTML(l.key) + '">−</button>' +
              '<span>' + l.qty + '</span>' +
              '<button data-act="plus" data-key="' + escapeHTML(l.key) + '">＋</button>' +
              '<button class="qty-del" data-act="del" data-key="' + escapeHTML(l.key) + '">删除</button>' +
            '</div>' +
          '</div>' +
        '</article>';
      }).join('');
    }

    drawer.querySelector('.cart-total').textContent = money(cartTotal());

    drawer.querySelectorAll('.qty button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const key = btn.getAttribute('data-key');
        const line = cartLines().filter(function (l) { return l.key === key; })[0];
        if (!line) return;
        const act = btn.getAttribute('data-act');
        if (act === 'plus') setQty(key, line.qty + 1);
        else if (act === 'minus') setQty(key, line.qty - 1);
        else removeItem(key);
        renderCart();
      });
    });
  }

  /* 打开页面时：把 [data-cart-btn] 绑上，统一更新角标 */
  function mountCart() {
    global.addEventListener('shop:cart', function () {
      const n = cartCount();
      document.querySelectorAll('[data-cart-btn]').forEach(function (b) {
        const badge = b.querySelector('.cart-badge');
        if (badge) { badge.textContent = n; badge.style.display = n ? 'inline-flex' : 'none'; }
      });
    });
    document.querySelectorAll('[data-cart-btn]').forEach(function (b) {
      b.addEventListener('click', function (e) { e.preventDefault(); openCart(); });
    });
    global.addEventListener('shop:cart', renderCart);
    const n = cartCount();
    document.querySelectorAll('[data-cart-btn]').forEach(function (b) {
      const badge = b.querySelector('.cart-badge');
      if (badge) { badge.textContent = n; badge.style.display = n ? 'inline-flex' : 'none'; }
    });
  }

  /* ── 订单 ──────────────────────────────────────────────── */

  function makeOrderNo() {
    const d = new Date();
    const p = function (n) { return String(n).padStart(2, '0'); };
    const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
    return 'EDY' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + rnd;
  }

  /* 生成订单对象（不写网络，纯本地） */
  function buildOrder(form) {
    const lines = cartLines();
    return {
      no: makeOrderNo(),
      createdAt: new Date().toISOString(),
      contact: {
        name: (form && form.name) || '',
        phone: (form && form.phone) || '',
        address: (form && form.address) || '',
        note: (form && form.note) || ''
      },
      items: lines.map(function (l) {
        return {
          id: l.id, name: l.product.name, variant: l.variantText,
          price: l.price, qty: l.qty, sum: l.sum
        };
      }),
      total: lines.reduce(function (s, l) { return s + l.sum; }, 0),
      shop: {
        name: DATA.shop.name,
        wechat: DATA.shop.contact.wechat,
        phone: DATA.shop.contact.phone
      }
    };
  }

  /* 订单转成一段可以直接粘到微信里发给卖家的文字 */
  function orderText(order) {
    const lines = order.items.map(function (i, n) {
      return (n + 1) + '. ' + i.name + (i.variant ? '（' + i.variant + '）' : '') +
        '  ' + money(i.price) + ' × ' + i.qty + ' = ' + money(i.sum);
    });
    return [
      '【' + order.shop.name + '】订单 ' + order.no,
      '—— 商品 ——',
      lines.join('\n'),
      '—— 合计：' + money(order.total),
      '—— 收货 ——',
      order.contact.name + '  ' + order.contact.phone,
      order.contact.address,
      order.contact.note ? '备注：' + order.contact.note : '',
      '——',
      '卖家微信：' + order.shop.wechat + '　电话：' + order.shop.phone
    ].filter(Boolean).join('\n');
  }

  function copyText(text) {
    if (navigator.clipboard && global.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    /* file:// 或老浏览器兜底 */
    return new Promise(function (resolve, reject) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); resolve(); } catch (e) { reject(e); }
      document.body.removeChild(ta);
    });
  }

  /* ============================================================= */

  global.SHOP = {
    data: DATA,
    money: money,
    esc: escapeHTML,
    variantText: variantText,
    products: allProducts,
    byId: byId,
    byCategory: byCategory,
    catName: catName,
    cartLines: cartLines,
    cartCount: cartCount,
    cartTotal: cartTotal,
    addToCart: addToCart,
    setQty: setQty,
    removeItem: removeItem,
    clearCart: clearCart,
    openCart: openCart,
    closeCart: closeCart,
    renderCart: renderCart,
    mountCart: mountCart,
    toast: toast,
    buildOrder: buildOrder,
    orderText: orderText,
    copyText: copyText
  };

})(window);