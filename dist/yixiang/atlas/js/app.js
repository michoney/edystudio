/* ============================================================================
 *  装配 —— 把数据、图元与三块交互接起来
 * ========================================================================== */

(function (global) {
  'use strict';

  var D = global.BaguaData;
  var C = global.YiCore;
  var G = global.Glyph;
  var NS = 'http://www.w3.org/2000/svg';

  /* ─────────────────────────  序：封面太极  ───────────────────────── */
  function buildHero() {
    var svg = document.getElementById('heroSvg');
    if (!svg) return;
    var CX = 310, CY = 310;

    function add(tag, attrs, parent) {
      var n = document.createElementNS(NS, tag);
      for (var k in attrs) { n.setAttribute(k, attrs[k]); }
      (parent || svg).appendChild(n);
      return n;
    }

    /* 缓转外环：只有刻点与弧，不放字，保证字始终可读 */
    var ring = add('g', { 'class': 'ht-ring' });
    add('circle', { cx: CX, cy: CY, r: 284, 'class': 'ht-arc' }, ring);
    add('circle', { cx: CX, cy: CY, r: 292, 'class': 'ht-arc' }, ring);
    for (var i = 0; i < 48; i++) {
      var a = i * 7.5 * Math.PI / 180;
      var r1 = i % 6 === 0 ? 272 : 279;
      add('circle', {
        cx: G.f(CX + 284 * Math.cos(a)), cy: G.f(CY + 284 * Math.sin(a)),
        r: i % 6 === 0 ? 3.4 : 1.5, fill: 'rgba(201,162,39,.42)'
      }, ring);
    }

    /* 八卦：静态，爻符沿圆周排布 */
    add('circle', { cx: CX, cy: CY, r: 148, 'class': 'ht-arc' });
    D.TRIGRAMS.forEach(function (t) {
      var g = add('g', {});
      [204, 186, 168].forEach(function (r, i) {
        var a0 = (t.bearing - 90 - 13) * Math.PI / 180;
        var a1 = (t.bearing - 90 + 13) * Math.PI / 180;
        var x0 = CX + r * Math.cos(a0), y0 = CY + r * Math.sin(a0);
        var x1 = CX + r * Math.cos(a1), y1 = CY + r * Math.sin(a1);
        var d;
        if (t.lines[i]) {
          d = 'M' + G.f(x0) + ',' + G.f(y0) + 'A' + r + ',' + r + ' 0 0 1 ' + G.f(x1) + ',' + G.f(y1);
        } else {
          var gm = 4.2;
          var m0 = (t.bearing - 90 - 13 + gm) * Math.PI / 180;
          var m1 = (t.bearing - 90 - 13) * Math.PI / 180;
          var m2 = (t.bearing - 90 + 13) * Math.PI / 180;
          var m3 = (t.bearing - 90 + 13 - gm) * Math.PI / 180;
          d = 'M' + G.f(CX + r * Math.cos(m1)) + ',' + G.f(CY + r * Math.sin(m1)) +
              'A' + r + ',' + r + ' 0 0 1 ' + G.f(CX + r * Math.cos(m0)) + ',' + G.f(CY + r * Math.sin(m0)) + ' ' +
              'M' + G.f(CX + r * Math.cos(m2)) + ',' + G.f(CY + r * Math.sin(m2)) +
              'A' + r + ',' + r + ' 0 0 1 ' + G.f(CX + r * Math.cos(m3)) + ',' + G.f(CY + r * Math.sin(m3));
        }
        add('path', { d: d, 'class': 'ht-yang' + (t.lines[i] ? '' : ' is-yin') }, g);
      });
      var lp = G.pt(CX, CY, 248, t.bearing);
      var tx = add('text', { x: G.f(lp[0]), y: G.f(lp[1]), 'class': 'ht-name' });
      tx.textContent = t.name;
    });

    /* 太极：反向缓转 */
    var spin = add('g', { 'class': 'ht-taiji' });
    var holder = document.createElementNS(NS, 'g');
    holder.innerHTML = G.taiji(CX, CY, 112, {
      light: '#e9dfc9', dark: '#100d0a', ring: 'rgba(201,162,39,.4)'
    });
    while (holder.firstChild) spin.appendChild(holder.firstChild);
  }

  /* ─────────────────────────  壹：罗盘面板  ───────────────────────── */
  function panelHTML(t, pinned) {
    if (!t) {
      return '<p class="lp-hint">将指针移至任一卦位，或以 Tab 键聚焦</p>';
    }
    var bits = t.lines.map(function (v, i) {
      return '<span class="lp-bit' + (v ? '' : ' is-zero') + '" style="animation-delay:' + (i * 70) + 'ms">' + v + '</span>';
    }).join('');

    function row(k, v, note) {
      return '<div class="lp-attr"><dt>' + k + '</dt><dd>' + v +
        (note ? '<small>' + note + '</small>' : '') + '</dd></div>';
    }

    return '' +
      (pinned ? '<span class="lp-lock">已钉住</span>' : '') +
      '<div class="lp-body">' +
        '<div class="lp-vertical">' +
          '<div class="lp-glyph">' + t.glyph + '</div>' +
          '<div class="lp-name">' + t.name + '</div>' +
          '<div class="lp-ci">' + t.ci + '</div>' +
        '</div>' +
      '</div>' +
      '<dl class="lp-attrs">' +
        row('自然象', t.nature, '「' + t.image + '」') +
        row('方位', t.dir, t.branch) +
        row('五行', '<em>' + t.element + '</em>') +
        row('家人', t.family) +
        row('先天数', '<em>' + t.xianTian + '</em>', '伏羲序') +
        row('洛书数', '<em>' + t.luoshu + '</em>', '后天位') +
        row('八　门', t.gate, '堪舆层') +
        row('取　象', t.beasts + ' · ' + t.flesh + ' · ' + t.natureObj) +
      '</dl>' +
      '<div class="lp-bits">' +
        '<div class="lp-bits-label">三爻二进制 · 自初爻起</div>' +
        '<div class="lp-bits-bar">' + bits + '</div>' +
        '<div class="lp-bits-cap">' +
          '阳记 1，阴记 0，得 <b>' + t.binary + '</b>，八减之即先天数 <b>' + t.xianTian + '</b>。' +
          '此处是现代编码演示，位序采用初爻为高位。' +
        '</div>' +
      '</div>';
  }

  /* ─────────────────────────  装配  ───────────────────────── */
  function boot() {
    buildHero();

    /* 壹 · 罗盘 */
    var dial = document.getElementById('dial');
    var panel = document.getElementById('lpPanel');
    var lpApi = null;
    if (dial && panel) {
      global.Luopan.build(dial);
      lpApi = global.Luopan.init(dial, panel, function (t, pinned) {
        panel.innerHTML = panelHTML(t, pinned);
      });
    }

    /* 贰 · 六十四卦 */
    var grid = document.getElementById('hxGrid');
    if (grid) {
      global.LiuShiYa.init({
        grid: grid,
        detail: document.getElementById('hxDetail'),
        tabs: Array.prototype.slice.call(document.querySelectorAll('.lx-tab')),
        onTrigram: function (id) {
          if (lpApi) lpApi.pick(id);
          var target = document.getElementById('luopan');
          location.hash='luopan';
        }
      });
    }

    /* 叁 · 摇卦 */
    if (document.getElementById('ygCoins')) {
      global.YaoGua.init({
        coins: document.getElementById('ygCoins'),
        lines: document.getElementById('ygLines'),
        result: document.getElementById('ygResult'),
        moving: document.getElementById('ygMoving'),
        button: document.getElementById('ygBtn'),
        resetBtn: document.getElementById('ygReset')
      });
    }

    /* 入场动画与目次高亮
       不依赖 IntersectionObserver：部分环境（无头浏览器、打印、部分旧版
       WebView）不会触发 IO，一旦不触发元素就永远隐形。这里改用确定性的
       视口位置判定，行为可控且可复现。 */
    var vh = function () { return window.innerHeight || document.documentElement.clientHeight; };

    function revealCheck() {
      var h = vh();
      Array.prototype.forEach.call(document.querySelectorAll('.reveal:not(.is-in)'), function (n) {
        var r = n.getBoundingClientRect();
        if (r.top < h * 0.9 && r.bottom > 0) n.classList.add('is-in');
      });
    }

    var links = Array.prototype.slice.call(document.querySelectorAll('[data-nav]'));
    var scenes = links.map(function (a) {
      return document.querySelector(a.getAttribute('href'));
    }).filter(Boolean);

    function spyCheck() {
      if (!scenes.length) return;
      var line = vh() * 0.4;
      var current = null;
      scenes.forEach(function (s) {
        if (s.getBoundingClientRect().top <= line) current = s.id;
      });
      links.forEach(function (a) {
        a.classList.toggle('is-on', !!current && a.getAttribute('href') === '#' + current);
      });
    }

    var ticking = false;
    function onFrame() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        ticking = false;
        revealCheck();
        spyCheck();
      });
    }

    window.addEventListener('scroll', onFrame, { passive: true });
    window.addEventListener('resize', onFrame);
    /* 打印时必须全部可见 */
    window.addEventListener('beforeprint', function () {
      Array.prototype.forEach.call(document.querySelectorAll('.reveal'), function (n) {
        n.classList.add('is-in');
      });
    });

    revealCheck();
    spyCheck();
    window.setTimeout(function () { revealCheck(); spyCheck(); }, 120);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window);
