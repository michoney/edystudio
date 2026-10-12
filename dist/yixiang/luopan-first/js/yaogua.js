/* ============================================================================
 *  摇卦 —— 铜钱起卦
 * ----------------------------------------------------------------------------
 *  法：铜钱三枚掷之，「背」为阳计三，「字」为阴计二。一掷成一爻，
 *      六掷成卦，自初爻而上。六次之数：
 *        三背  9  老阳 ○  阳极而动，动则变阴
 *        两背一字 8  少阴   阴静不动
 *        一背两字 7  少阳   阳静不动
 *        三字  6  老阴 ×  阴极而动，动则变阳
 *  成卦后可见：本卦、之卦（变卦）、互卦；有动爻则别体用。
 * ========================================================================== */

(function (global) {
  'use strict';

  var D = global.BaguaData;
  var C = global.YiCore;
  var G = global.Glyph;

  var SPIN_MS = 1500;
  var lineState = [];   /* 六个 {n, moving} */
  var busy = false;

  function tossOnce() {
    /* 每枚铜钱独立掷出正反，背为阳、字为阴 */
    var coins = [0, 1, 2].map(function () { return Math.random() < 0.5; });
    var yangCount = coins.filter(Boolean).length;
    var n = yangCount * 3 + (3 - yangCount) * 2;
    return { coins: coins, n: n };
  }

  /**
   * 设定铜钱正反面。
   * coin-yin（字）无自身旋转，是 0° 正面；coin-yang（背）自转 180°，是背面。
   * 故 isYang（背）须把父级 --face 置 180°。同时切 is-yang 类，让正反面
   * 靠 opacity 也能区分——不单靠 backface-visibility，该属性在部分环境下
   * 对 SVG 子元素不生效，两面会同时画出来。
   */
  function setFace(node, isYang) {
    node.style.setProperty('--face', isYang ? '180deg' : '0deg');
    node.classList.toggle('is-yang', isYang);
  }

  function lineOf(n) {
    /* 9 / 7 为阳爻（记 1），8 / 6 为阴爻（记 0）。
       必须返回数字而非布尔：卦象反查用 === 严格比较 0/1。 */
    return (n === 9 || n === 7) ? 1 : 0;
  }

  function hexOf(lines) {
    var lower = idOf([lines[0], lines[1], lines[2]]);
    var upper = idOf([lines[3], lines[4], lines[5]]);
    return C.of(upper, lower);
  }

  function idOf(triple) {
    for (var i = 0; i < D.TRIGRAMS.length; i++) {
      var t = D.TRIGRAMS[i];
      if (t.lines[0] === triple[0] && t.lines[1] === triple[1] && t.lines[2] === triple[2]) return t.id;
    }
    return null;
  }

  /* ------------------------------------------------------------------ 渲染 */
  function coinSVG() {
    var s = '<svg viewBox="0 0 120 120" class="coin-face coin-yin">' +
      G.coinFace(60, 60, 48, false) + '</svg>';
    s += '<svg viewBox="0 0 120 120" class="coin-face coin-yang">' +
      G.coinFace(60, 60, 48, true) + '</svg>';
    return s;
  }

  function renderCoins(host) {
    host.innerHTML = '';
    for (var i = 0; i < 3; i++) {
      var c = document.createElement('div');
      c.className = 'coin';
      c.innerHTML = '<div class="coin-3d">' + coinSVG() + '</div>';
      host.appendChild(c);
    }
  }

  function lineRowHTML(i, n, moving) {
    var info = D.COIN_VALUES[n];
    var isYang = info.yang;
    var figure = isYang
      ? '<svg viewBox="0 0 76 12" class="yao-fig" aria-hidden="true"><rect x="0" y="2" width="76" height="8" rx="2.5" fill="currentColor"/></svg>'
      : '<svg viewBox="0 0 76 12" class="yao-fig" aria-hidden="true">' +
        '<rect x="0" y="2" width="33" height="8" rx="2.5" fill="currentColor"/>' +
        '<rect x="43" y="2" width="33" height="8" rx="2.5" fill="currentColor"/></svg>';
    var mark = moving ? '<span class="yao-mark">' + (isYang ? '○' : '×') + '</span>' : '';
    return '<li class="yao-row' + (moving ? ' is-moving' : '') + '" data-i="' + i + '"' +
      ' style="--d:' + (i * 90) + 'ms">' +
      '<span class="yao-pos">' + D.YAO_NAME[i] + '</span>' +
      figure + mark +
      '<span class="yao-mark-slot" data-role="mark-slot"></span>' +
      '<span class="yao-n">' + n + '</span>' +
      '<span class="yao-name">' + info.name + '</span>' +
      '<button class="yao-dyn" data-role="dyn" title="标记为动爻">' + (moving ? '动' : '静') + '</button>' +
      '</li>';
  }

  function resultCard(label, hex, note, cls) {
    if (!hex) return '';
    return '<div class="res-card ' + (cls || '') + '">' +
      '<div class="res-label">' + label + '</div>' +
      '<svg class="bars" viewBox="0 0 62 100" aria-hidden="true">' +
        G.hexagramBars(hex.lines, { width: 62, height: 100 }) + '</svg>' +
      '<div class="res-name">' + hex.name + '</div>' +
      '<div class="res-no">第 ' + hex.no + ' 卦</div>' +
      '<div class="res-note">' + note + '</div>' +
      '</div>';
  }

  function render(host, lineHost, resHost, moveHost) {
    lineHost.innerHTML = '<ol class="yao-list">' +
      lineState.map(function (s, i) { return lineRowHTML(i, s.n, s.moving); }).join('') +
      '</ol>';

    var lines = lineState.map(function (s) { return lineOf(s.n); });
    var ben = hexOf(lines);
    var movingIdx = [];
    lineState.forEach(function (s, i) { if (s.moving) movingIdx.push(i); });

    var zhi = ben;
    if (movingIdx.length) {
      var changed = lines.slice();
      movingIdx.forEach(function (i) { changed[i] = !changed[i]; });
      zhi = hexOf(changed);
    }
    var hu = C.nuclear(lines);

    var ty = movingIdx.length ? C.tiYong(ben, movingIdx) : null;

    resHost.innerHTML =
      resultCard('本卦', ben, '现状所呈现之象', 'res-ben') +
      resultCard(movingIdx.length ? '之卦' : '之卦（同本卦）', zhi,
        movingIdx.length ? '动爻变后之象' : '六爻皆静，无变卦', 'res-zhi') +
      resultCard('互卦', hu, '二三四爻为下卦，三四五爻为上卦', 'res-hu');

    moveHost.innerHTML = movingIdx.length
      ? '<div class="ty">动爻 ' + movingIdx.map(function (i) { return D.YAO_NAME[i]; }).join('、') +
        '　<span class="ty-body">体 ' + ty.ti.name + ' · 用 ' + ty.yong.name + '</span>' +
        '<span class="ty-note">' + ty.note + '</span></div>'
      : '<div class="ty ty-none">六爻皆静，无动爻，不分体用。</div>';
  }

  /* ------------------------------------------------------------------ 交互 */
  function init(opts) {
    var coinHost = opts.coins;
    var lineHost = opts.lines;
    var resHost = opts.result;
    var moveHost = opts.moving;
    var btn = opts.button;

    renderCoins(coinHost);

    function refresh() {
      render(coinHost, lineHost, resHost, moveHost);
      lineHost.querySelectorAll('.yao-dyn').forEach(function (b) {
        b.addEventListener('click', function (e) {
          e.stopPropagation();
          var i = +b.closest('.yao-row').dataset.i;
          lineState[i].moving = !lineState[i].moving;
          refresh();
        });
      });
      lineHost.querySelectorAll('.yao-row').forEach(function (r) {
        r.addEventListener('click', function () {
          var i = +r.dataset.i;
          /* 静 ⇄ 动：静按少阳少阴取值 */
          var cur = lineState[i];
          cur.n = (cur.n === 7 || cur.n === 9) ? 8 : 7;
          cur.moving = false;
          refresh();
        });
      });
    }

    function reset() {
      lineState = [
        { n: 7, moving: false }, { n: 8, moving: false }, { n: 7, moving: false },
        { n: 8, moving: false }, { n: 7, moving: false }, { n: 8, moving: false }
      ];
    }

    btn.addEventListener('click', function () {
      if (busy) return;
      busy = true;
      btn.disabled = true;
      btn.classList.add('is-busy');
      reset();
      lineHost.innerHTML = '';
      resHost.innerHTML = '';
      moveHost.innerHTML = '';

      var coins = Array.prototype.slice.call(coinHost.querySelectorAll('.coin-3d'));

      /* 六掷：每次三枚同掷，逐爻自初而上 */
      var seq = [];
      for (var k = 0; k < 6; k++) {
        var t = tossOnce();
        seq.push({ n: t.n, coins: t.coins });
      }

      /* 起手：先翻到初爻的结果，再启动翻转动画。
         逐枚取 coins[i]，不可写成 coins[0]，否则三枚永远同面。 */
      coins.forEach(function (c, i) {
        setFace(c, seq[0].coins[i]);
        setTimeout(function () {
          c.classList.remove('is-spinning');
          void c.offsetWidth;
          c.classList.add('is-spinning');
        }, i * 150);
      });

      setTimeout(function () {
        lineState = seq.map(function (s) {
          return { n: s.n, moving: D.COIN_VALUES[s.n].moving };
        });
        refresh();
        busy = false;
        btn.disabled = false;
        btn.classList.remove('is-busy');
      }, SPIN_MS + 60);
    });

    opts.resetBtn.addEventListener('click', function () {
      reset();
      refresh();
      coinHost.querySelectorAll('.coin-3d').forEach(function (c) {
        setFace(c, false);
      });
    });

    reset();
    refresh();
  }

  global.YaoGua = { init: init };
})(window);
