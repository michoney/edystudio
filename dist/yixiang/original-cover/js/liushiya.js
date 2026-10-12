/* ============================================================================
 *  六十四卦宫阵
 * ----------------------------------------------------------------------------
 *  两种排布：
 *    一、京房八宫  8 宫 × 8 卦，宫为行（乾坎艮震巽离坤兑），
 *                   列为八纯、一世、二世、三世、四世、五世、游魂、归魂
 *    二、周易序    文王卦次 1–64，按序横排
 *  两者共用同一份由 core.js 推导出的卦象数据
 * ========================================================================== */

(function (global) {
  'use strict';

  var D = global.BaguaData;
  var C = global.YiCore;
  var G = global.Glyph;

  /* 卦次 → 八宫归属 */
  var PLACE = {};
  C.PALACES.forEach(function (p) {
    p.items.forEach(function (it) {
      PLACE[it.hex.no] = {
        palace: p.base, palaceIndex: p.index,
        stage: it.stage, shi: it.shi, element: p.element
      };
    });
  });

  function barsSVG(hex, w, h, cls) {
    var inner = G.hexagramBars(hex.lines, { width: w, height: h });
    return '<svg class="' + (cls || 'bars') + '" viewBox="0 0 ' + w + ' ' + h + '" ' +
           'preserveAspectRatio="xMidYMid meet" aria-hidden="true">' + inner + '</svg>';
  }

  function triGlyph(trigram, cls) {
    return '<svg class="' + (cls || 'tri') + '" viewBox="0 0 30 40" aria-hidden="true">' +
      G.hexagramBars(trigram.lines, { width: 30, height: 40 }) + '</svg>';
  }

  /* ------------------------------------------------------------ 网格：宫阵 */
  function cellHTML(hex, meta, extraCls) {
    var place = meta || PLACE[hex.no] || {};
    return '<button class="hcell ' + (extraCls || '') + '" data-no="' + hex.no + '" ' +
      'style="--el:' + (D.ELEMENT_COLOR[place.element || '金'] || '#c9a227') + '" ' +
      'title="' + hex.no + '. ' + hex.name + ' — ' + hex.text + '">' +
      '<span class="hcell-no">' + hex.no + '</span>' +
      barsSVG(hex, 34, 54) +
      '<span class="hcell-name">' + hex.name + '</span>' +
      '<span class="hcell-meta">' + (place.palace ? place.palace.name + '·' + place.stage : '') + '</span>' +
      '</button>';
  }

  function renderPalace(root) {
    var html = '<div class="grid grid-palace">';
    html += '<div class="grid-corner">宫 \\ 世</div>';
    C.PALACES[0].items.forEach(function (it, i) {
      html += '<div class="grid-col-head" data-col="' + i + '">' +
        it.stage + '<span>世' + it.shi + '</span></div>';
    });
    C.PALACES.forEach(function (p) {
      html += '<div class="grid-row-head" data-palace="' + p.base.id + '" ' +
        'style="--el:' + D.ELEMENT_COLOR[p.element] + '" tabindex="0" role="button">' +
        '<b>' + p.base.name + '</b><span>' + p.element + '</span></div>';
      p.items.forEach(function (it) {
        html += cellHTML(it.hex, PLACE[it.hex.no], 'is-palace-cell');
      });
    });
    html += '</div>';
    root.innerHTML = html;
  }

  /* ------------------------------------------------------------ 网格：序 */
  function renderKingWen(root) {
    var html = '<div class="grid grid-order">';
    for (var r = 0; r < 8; r++) {
      for (var c = 0; c < 8; c++) {
        var hex = C.ofNo(r * 8 + c + 1);
        html += cellHTML(hex, PLACE[hex.no], 'is-order-cell');
      }
    }
    html += '</div>';
    root.innerHTML = html;
  }

  /* ------------------------------------------------------------ 详情面板 */
  function detailHTML(hex, place) {
    place = place || PLACE[hex.no] || {};
    var shi = place.shi || 1;
    var ying = shi <= 3 ? shi + 3 : shi - 3;
    var nuclearHex = C.nuclear(hex.lines);
    var upper = hex.upper, lower = hex.lower;

    return '' +
      '<div class="hx-top">' +
        barsSVG(hex, 110, 178, 'bars-lg') +
        '<div class="hx-id">' +
          '<div class="hx-no">第 ' + hex.no + ' 卦</div>' +
          '<h3 class="hx-name">' + hex.name + '</h3>' +
          '<div class="hx-order">文王卦序 · ' + (place.palace ? place.palace.name + '宫 · ' + place.stage + ' · 世在' : '') +
            D.YAO_NAME[shi - 1] + '</div>' +
        '</div>' +
      '</div>' +

      '<div class="hx-py">' +
        '<div class="hx-py-row"><span class="hx-py-tag">上卦</span>' +
          triGlyph(upper, 'tri tri-up') +
          '<b>' + upper.name + upper.nature + '</b>' +
          '<span class="hx-py-note">' + upper.dir + ' · ' + upper.element + ' · ' + upper.family + '</span></div>' +
        '<div class="hx-py-row"><span class="hx-py-tag">下卦</span>' +
          triGlyph(lower, 'tri tri-low') +
          '<b>' + lower.name + lower.nature + '</b>' +
          '<span class="hx-py-note">' + lower.dir + ' · ' + lower.element + ' · ' + lower.family + '</span></div>' +
      '</div>' +

      '<div class="hx-meta">' +
        '<span>世爻 ' + D.YAO_NAME_SHORT[shi - 1] + '</span>' +
        '<span>应爻 ' + D.YAO_NAME_SHORT[ying - 1] + '</span>' +
        '<span>互卦 ' + nuclearHex.name + '</span>' +
        '<span class="hx-binary">' + hex.bian + '</span>' +
      '</div>' +

      '<blockquote class="hx-text">' + hex.text + '</blockquote>' +

      '<div class="hx-actions">' +
        '<button class="hx-link" data-go-nuclear="1">观其互卦：' + nuclearHex.name + ' →</button>' +
        '<button class="hx-link hx-link-trigram" data-go-trigram="' + upper.id + '">上卦 ' + upper.name + '入罗盘 →</button>' +
        '<button class="hx-link hx-link-trigram" data-go-trigram="' + lower.id + '">下卦 ' + lower.name + '入罗盘 →</button>' +
      '</div>';
  }

  /* -------------------------------------------------------------- 对外接口 */
  function init(opts) {
    var root = opts.grid;
    var detail = opts.detail;
    var view = 'palace';

    function render() {
      if (view === 'palace') renderPalace(root); else renderKingWen(root);
      bind();
    }

    function select(no, scroll) {
      var hex = C.ofNo(no);
      if (!hex) return;
      detail.innerHTML = detailHTML(hex, PLACE[no]);
      detail.classList.add('has-content');
      root.querySelectorAll('.hcell.is-active').forEach(function (n) {
        n.classList.remove('is-active');
      });
      var cell = root.querySelector('.hcell[data-no="' + no + '"]');
      if (cell) {
        cell.classList.add('is-active');
        if (scroll) cell.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    }

    function bind() {
      root.querySelectorAll('.hcell').forEach(function (b) {
        b.addEventListener('click', function () { select(+b.dataset.no, true); });
      });
      root.querySelectorAll('.grid-row-head').forEach(function (h) {
        h.addEventListener('click', function () { highlightPalace(h.dataset.palace); });
        h.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); highlightPalace(h.dataset.palace); }
        });
      });
      detail.addEventListener('click', function (e) {
        var nuclear = e.target.closest('[data-go-nuclear]');
        if (nuclear) {
          var hex = C.ofNo(+detail.querySelector('.hx-no').textContent.replace(/\D/g, ''));
          if (hex) select(C.nuclear(hex.lines).no, true);
          return;
        }
        var tri = e.target.closest('[data-go-trigram]');
        if (tri && opts.onTrigram) opts.onTrigram(tri.dataset.goTrigram);
      });
    }

    function highlightPalace(id) {
      root.querySelectorAll('.grid-row-head').forEach(function (h) {
        h.classList.toggle('is-on', h.dataset.palace === id);
      });
      root.querySelectorAll('.is-palace-cell').forEach(function (c) {
        c.classList.toggle('is-dim', PLACE[+c.dataset.no].palace.id !== id);
      });
    }

    /* 视图切换 */
    opts.tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        opts.tabs.forEach(function (t) { t.classList.toggle('is-on', t === tab); });
        view = tab.dataset.view;
        root.classList.toggle('is-order', view === 'order');
        render();
        if (detail.classList.contains('has-content')) {
          var no = +detail.querySelector('.hx-no').textContent.replace(/\D/g, '');
          select(no, false);
        }
      });
    });

    render();
    select(1, false);
    return { select: select, render: render };
  }

  global.LiuShiYa = { init: init, PLACE: PLACE, barsSVG: barsSVG, triGlyph: triGlyph };
})(window);
