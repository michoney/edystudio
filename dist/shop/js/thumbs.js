/* =============================================================
   独立站 · 缩略图队列
   -------------------------------------------------------------
   卡片上的图不是图片文件，而是离屏 WebGL 真渲染出来的 3D 图。
   全部商品共用一个离屏渲染器，渲完缓存成 dataURL，避免开一堆
   WebGL 上下文把手机搞卡。
   ============================================================= */

(function (global) {
  'use strict';

  const cache = {};
  let chain = Promise.resolve();

  function paint(root) {
    if (!root) return;
    root.querySelectorAll('[data-thumb]').forEach(function (el) {
      const id = el.getAttribute('data-thumb');
      const url = cache[id];
      if (!url || el.querySelector('img')) return;
      const img = new Image();
      img.alt = '';
      img.onload = function () {
        el.classList.add('done');
        img.classList.add('in');
      };
      img.src = url;
      el.appendChild(img);
    });
  }

  /* 把 root 里所有 [data-thumb] 渲染出来；已渲染过的直接跳过 */
  function fill(root) {
    const host = root || document;
    const missing = [];
    host.querySelectorAll('[data-thumb]').forEach(function (el) {
      const id = el.getAttribute('data-thumb');
      if (cache[id]) return;
      if (missing.indexOf(id) < 0) missing.push(id);
    });

    if (!missing.length) { paint(host); return; }

    const items = missing.map(function (id) {
      const p = global.SHOP.byId(id);
      return p ? { id: id, model: p.model, variant: p.variant } : null;
    }).filter(Boolean);

    if (!items.length) return;

    chain = chain
      .then(function () { return global.SHOP_VIEWER.renderThumbnails(items); })
      .then(function (out) {
        Object.keys(out).forEach(function (k) { cache[k] = out[k]; });
        paint(document);
      })
      .catch(function (e) { console.warn('[shop] 缩略图渲染失败', e); });
  }

  function get(id) { return cache[id] || null; }

  global.SHOP_THUMBS = { fill: fill, get: get, cache: cache };

})(window);