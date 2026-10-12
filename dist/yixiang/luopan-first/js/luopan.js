/* ============================================================================
 *  天池罗盘 —— 后天八卦方位盘
 * ----------------------------------------------------------------------------
 *  自外向内分五层：
 *    一、二十四山      每山 15°，正北子、正南午、正东卯、正西酉
 *    二、刻度          每 7.5° 一细刻，每 15° 一长刻
 *    三、八卦主环      每卦 45°，卦名 / 爻符 / 自然象，外缘压五行色带
 *    四、八门          奇门遁甲八门配卦，堪舆罗盘参考层
 *    五、天池          太极图，缓转；外加反向缓转的天球环
 * ========================================================================== */

(function (global) {
  'use strict';

  var D = global.BaguaData;
  var G = global.Glyph;
  var NS = 'http://www.w3.org/2000/svg';

  var CX = 400, CY = 400;

  /* 半径配置
     八卦扇区只有 45°、宽约 180px，深约 144px。往里塞四层文字必然糊成一片，
     故环内只留「卦名 + 爻符 + 悬停二进制」，其余属性交给右侧面板。 */
  var R = {
    frameOut: 396, frameIn: 388,
    mtnText: 358, mtnLineIn: 340, mtnLineOut: 376,
    tickIn: 330, tickOut: 340,
    ringSplit: 326,
    baguaOut: 322, baguaIn: 178,
    elementBand: 320,
    yao: [304, 282, 260], yaoW: 14,
    name: 226, binary: 190,
    innerSplit: 174,
    gate: 150, elementBand2: 134,
    poolSplit: 128, pool: 124, taiji: 92
  };

  function el(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) { if (attrs.hasOwnProperty(k)) n.setAttribute(k, attrs[k]); }
    if (parent) parent.appendChild(n);
    return n;
  }

  function text(parent, x, y, content, size, cls, extra) {
    var a = {
      x: G.f(x), y: G.f(y), 'font-size': size,
      'text-anchor': 'middle', 'dominant-baseline': 'central',
      'class': cls || ''
    };
    if (extra) { for (var k in extra) a[k] = extra[k]; }
    var t = el('text', a, parent);
    t.textContent = content;
    return t;
  }

  /* ------------------------------------------------------------------ 构建 */
  function build(svg) {
    svg.setAttribute('viewBox', '0 0 800 800');
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    var gOuter = el('g', { 'class': 'lp-outer' }, svg);
    var gMtn = el('g', { 'class': 'lp-mountains' }, svg);
    var gTick = el('g', { 'class': 'lp-ticks' }, svg);
    var gSplit1 = el('g', { 'class': 'lp-split' }, svg);
    var gBagua = el('g', { 'class': 'lp-bagua' }, svg);
    var gInner = el('g', { 'class': 'lp-inner' }, svg);
    var gSplit2 = el('g', { 'class': 'lp-split' }, svg);
    var gPool = el('g', { 'class': 'lp-pool' }, svg);

    buildFrame(gOuter);
    buildMountains(gMtn);
    buildTicks(gTick);
    el('circle', { cx: CX, cy: CY, r: R.ringSplit, 'class': 'lp-rule lp-rule-major' }, gSplit1);
    D.TRIGRAMS.forEach(function (t) { buildSector(gBagua, t); });
    buildInnerRing(gInner);
    el('circle', { cx: CX, cy: CY, r: R.poolSplit, 'class': 'lp-rule lp-rule-major' }, gSplit2);
    el('circle', { cx: CX, cy: CY, r: R.pool, 'class': 'lp-pool-face' }, gPool);
    buildPool(gPool);

    return svg;
  }

  function buildFrame(g) {
    el('circle', { cx: CX, cy: CY, r: R.frameOut, 'class': 'lp-frame lp-frame-outer' }, g);
    el('circle', { cx: CX, cy: CY, r: R.frameIn, 'class': 'lp-frame lp-frame-inner' }, g);
    /* 天球环：与太极反向缓转。
       点阵须落在二十四山文字（外缘约 371）之外、内框 388 之内。 */
    var sky = el('g', { 'class': 'lp-sky' }, g);
    for (var i = 0; i < 24; i++) {
      var p = G.pt(CX, CY, 381, i * 15);
      el('circle', {
        cx: G.f(p[0]), cy: G.f(p[1]),
        r: i % 6 === 0 ? 3.6 : 1.6, 'class': 'lp-sky-dot'
      }, sky);
    }
  }

  function buildMountains(g) {
    D.MOUNTAINS.forEach(function (m) {
      el('path', {
        d: G.arc(CX, CY, R.mtnLineOut, m.bearing - 7.5, m.bearing + 7.5),
        'class': 'lp-mtn-divider'
      }, g);
      var isAxis = !!m.axis;
      text(g, G.pt(CX, CY, R.mtnText, m.bearing)[0], G.pt(CX, CY, R.mtnText, m.bearing)[1],
        m.name, isAxis ? 26 : 21,
        isAxis ? 'lp-mtn lp-mtn-axis' : 'lp-mtn');
    });
    /* 四正方位小字 */
    [['北', 0], ['东', 90], ['南', 180], ['西', 270]].forEach(function (p) {
      var q = G.pt(CX, CY, R.mtnText - 30, p[1]);
      text(g, q[0], q[1], p[0], 15, 'lp-cardinal', { 'letter-spacing': '0' });
    });
  }

  function buildTicks(g) {
    for (var a = 0; a < 360; a += 7.5) {
      var long = a % 15 === 0;
      el('path', {
        d: G.arc(CX, CY, R.tickOut, a - 0.18, a + 0.18),
        'class': long ? 'lp-tick lp-tick-long' : 'lp-tick'
      }, g);
      if (!long) {
        el('path', {
          d: G.arc(CX, CY, R.tickIn + 4, a - 0.12, a + 0.12),
          'class': 'lp-tick lp-tick-short'
        }, g);
      }
    }
  }

  function buildSector(parent, t) {
    var c = t.bearing;
    var g = el('g', {
      'class': 'lp-sector', 'data-id': t.id, tabindex: '0',
      role: 'button', 'aria-label': t.name + '卦 · ' + t.nature + ' · ' + t.dir
    }, parent);

    /* 扇形热区 */
    el('path', {
      d: G.sector(CX, CY, R.baguaIn, R.baguaOut, c - 22.5, c + 22.5),
      'class': 'lp-sector-hit'
    }, g);

    /* 扇面本体（默认极淡，悬停/选中时点亮） */
    el('path', {
      d: G.sector(CX, CY, R.baguaIn + 4, R.baguaOut - 4, c - 22.5, c + 22.5),
      'class': 'lp-sector-face', 'fill': t.color
    }, g);

    /* 分界扇线 */
    el('path', { d: G.arc(CX, CY, R.baguaOut, c - 22.5, c - 22.5), 'class': 'lp-sect-div' }, g);

    /* 五行色带 */
    el('path', {
      d: G.arc(CX, CY, R.elementBand, c - 20, c + 20),
      'class': 'lp-element-band', 'stroke': D.ELEMENT_COLOR[t.element]
    }, g);

    /* 卦名 */
    var np = G.pt(CX, CY, R.name, c);
    text(g, np[0], np[1], t.name, 42, 'lp-sect-name', { 'data-role': 'name' });

    /* 爻符：外为初爻 */
    var yaoG = el('g', { 'class': 'lp-yao' }, g);
    R.yao.forEach(function (r, i) {
      el('path', {
        d: G.yaoArc(CX, CY, r, c, 15, 4.2, t.lines[i] === 1),
        'class': t.lines[i] ? 'lp-yao-solid' : 'lp-yao-broken',
        'stroke-width': R.yaoW, fill: 'none'
      }, yaoG);
    });

    /* 三爻二进制，悬停时在卦名下方浮现 */
    var bp = G.pt(CX, CY, R.binary, c);
    text(g, bp[0], bp[1], t.binary, 14, 'lp-sect-binary');

    var title = el('title', {}, g);
    title.textContent = t.name + ' ' + t.glyph + ' · ' + t.nature + ' · ' + t.dir +
      ' · 先天' + t.xianTian + ' · 洛书' + t.luoshu + ' · ' + t.element + ' · ' + t.family;
  }

  function buildInnerRing(g) {
    D.TRIGRAMS.forEach(function (t) {
      var c = t.bearing;
      el('path', {
        d: G.arc(CX, CY, R.gate + 12, c - 22.5, c - 22.5),
        'class': 'lp-inner-div'
      }, g);
      el('path', {
        d: G.sector(CX, CY, R.gate - 14, R.gate + 14, c - 22.5, c + 22.5),
        'class': 'lp-inner-face'
      }, g);
      var gp = G.pt(CX, CY, R.gate + 3, c);
      text(g, gp[0], gp[1], t.gate, 17, 'lp-gate', { 'data-gate': t.id });

      el('path', {
        d: G.arc(CX, CY, R.elementBand2, c - 20, c + 20),
        'class': 'lp-element-band2', 'stroke': D.ELEMENT_COLOR[t.element]
      }, g);
    });
  }

  function buildPool(g) {
    el('circle', { cx: CX, cy: CY, r: R.taiji + 12, fill: 'none', 'class': 'lp-pool-rule' }, g);
    var spin = el('g', { 'class': 'lp-taiji-spin' }, g);
    var inner = document.createElementNS(NS, 'g');
    inner.innerHTML = G.taiji(CX, CY, R.taiji, { ring: 'rgba(201,162,39,.35)' });
    while (inner.firstChild) spin.appendChild(inner.firstChild);
  }

  /* ------------------------------------------------------------------ 交互 */
  function init(svg, panel, onSelect) {
    var sectors = Array.prototype.slice.call(svg.querySelectorAll('.lp-sector'));
    var selected = null;

    function paint(id, pinned) {
      sectors.forEach(function (s) {
        s.classList.toggle('is-active', s.dataset.id === id);
        s.classList.toggle('is-pinned', pinned && s.dataset.id === id);
      });
      svg.querySelectorAll('[data-gate]').forEach(function (n) {
        n.classList.toggle('is-active', n.getAttribute('data-gate') === id);
      });
    }

    function preview(id) {
      if (selected) return;          /* 已钉住时，悬停不改内容 */
      paint(id, false);
      onSelect(D.byId(id), false);
    }

    function clearPreview() {
      if (selected) return;
      paint(null, false);
      onSelect(null, false);
    }

    function pick(id) {
      selected = id;
      paint(id, true);
      onSelect(id ? D.byId(id) : null, true);
    }

    sectors.forEach(function (s) {
      var id = s.dataset.id;
      s.addEventListener('mouseenter', function () { preview(id); });
      s.addEventListener('focus', function () { preview(id); });
      s.addEventListener('mouseleave', clearPreview);
      s.addEventListener('blur', clearPreview);
      s.addEventListener('click', function () {
        pick(selected === id ? null : id);
      });
      s.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          pick(selected === id ? null : id);
        }
      });
    });

    /* 罗盘任意处点击空白：取消钉住 */
    svg.addEventListener('click', function (e) {
      if (e.target.closest('.lp-sector')) return;
      pick(null);
    });

    /* 天池点击：太极旋转 / 停驻 */
    var pool = svg.querySelector('.lp-pool');
    var spinning = true;
    pool.style.cursor = 'pointer';
    pool.addEventListener('click', function (e) {
      e.stopPropagation();
      spinning = !spinning;
      svg.classList.toggle('paused', !spinning);
    });

    /* 键盘左右方向键切换八卦 */
    svg.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      var idx = sectors.findIndex(function (s) { return s === document.activeElement; });
      var step = e.key === 'ArrowRight' ? 1 : -1;
      var next = (idx + step + sectors.length) % sectors.length;
      sectors[next].focus();
    });

    paint(null, false);
    return { pick: pick };
  }

  global.Luopan = { build: build, init: init, R: R, CX: CX, CY: CY };
})(window);
