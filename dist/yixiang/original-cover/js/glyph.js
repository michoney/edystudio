/* ============================================================================
 *  SVG 图元库 —— 所有卦象都由代码生成路径，不依赖字体或图片
 *  坐标约定：罗盘度数 bearing，正北 0°，顺时针增大
 * ========================================================================== */

(function (global) {
  'use strict';

  var TAU = Math.PI * 180;

  /** 罗盘坐标：度数 → 直角坐标 */
  function pt(cx, cy, r, bearing) {
    var rad = (bearing - 90) * Math.PI / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  }

  /** 圆弧路径（不闭合） */
  function arc(cx, cy, r, a0, a1) {
    var p0 = pt(cx, cy, r, a0);
    var p1 = pt(cx, cy, r, a1);
    var large = Math.abs(a1 - a0) > 180 ? 1 : 0;
    var sweep = a1 > a0 ? 1 : 0;
    return 'M' + f(p0[0]) + ',' + f(p0[1]) +
           'A' + r + ',' + r + ' 0 ' + large + ' ' + sweep + ' ' + f(p1[0]) + ',' + f(p1[1]);
  }

  /** 环形扇面路径（闭合） */
  function sector(cx, cy, rIn, rOut, a0, a1) {
    var o0 = pt(cx, cy, rOut, a0);
    var o1 = pt(cx, cy, rOut, a1);
    var i1 = pt(cx, cy, rIn, a1);
    var i0 = pt(cx, cy, rIn, a0);
    var large = Math.abs(a1 - a0) > 180 ? 1 : 0;
    var sweep = a1 > a0 ? 1 : 0;
    return 'M' + f(o0[0]) + ',' + f(o0[1]) +
           'A' + rOut + ',' + rOut + ' 0 ' + large + ' ' + sweep + ' ' + f(o1[0]) + ',' + f(o1[1]) +
           'L' + f(i1[0]) + ',' + f(i1[1]) +
           'A' + rIn + ',' + rIn + ' 0 ' + large + ' ' + (sweep ? 0 : 1) + ' ' + f(i0[0]) + ',' + f(i0[1]) +
           'Z';
  }

  /**
   * 沿圆周排布的爻符：三爻自外向内（外为初爻）。
   * 阳爻为一整段弧，阴爻断为两段。
   */
  function yaoArc(cx, cy, r, center, half, gap, isYang) {
    if (isYang) return arc(cx, cy, r, center - half, center + half);
    return arc(cx, cy, r, center - half, center - gap) + ' ' +
           arc(cx, cy, r, center + gap, center + half);
  }

  /**
   * 横向卦象：lines 自初爻（上）在前。
   * 返回 <g> 的 innerHTML 片段，宽 w、高 h、爻宽 gapRatio。
   */
  function hexagramBars(lines, opt) {
    opt = opt || {};
    var w = opt.width || 120;
    var h = opt.height || 200;
    var barH = Math.max(3, h / 6 * 0.52);
    var gap = h / 6;
    var color = opt.color || 'currentColor';
    var out = '';
    for (var i = 0; i < 6; i++) {
      var y = f(i * gap + (gap - barH) / 2);
      var bh = f(barH);
      if (lines[i]) {
        out += '<rect x="0" y="' + y + '" width="' + f(w) + '" height="' + bh + '" fill="' + color + '" rx="' + f(barH / 2.6) + '"/>';
      } else {
        var seg = w * 0.44;
        out += '<rect x="0" y="' + y + '" width="' + f(seg) + '" height="' + bh + '" fill="' + color + '" rx="' + f(barH / 2.6) + '"/>' +
               '<rect x="' + f(w - seg) + '" y="' + y + '" width="' + f(seg) + '" height="' + bh + '" fill="' + color + '" rx="' + f(barH / 2.6) + '"/>';
      }
    }
    return out;
  }

  /** 太极图：白鱼右、黑鱼左，黑中有白、白中有黑 */
  function taiji(cx, cy, r, opt) {
    opt = opt || {};
    var light = opt.light || '#e9dfc9';
    var dark = opt.dark || '#14110d';
    var ring = opt.ring || 'rgba(201,162,39,.5)';
    var h = r / 2;
    return [
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + dark + '"/>',
      '<path d="M' + cx + ',' + f(cy - r) +
        'A' + r + ',' + r + ' 0 0 1 ' + cx + ',' + f(cy + r) + 'Z" fill="' + light + '"/>',
      '<path d="M' + cx + ',' + f(cy - r) +
        'A' + f(h) + ',' + f(h) + ' 0 0 1 ' + cx + ',' + cy + 'Z" fill="' + dark + '"/>',
      '<path d="M' + cx + ',' + cy +
        'A' + f(h) + ',' + f(h) + ' 0 0 0 ' + cx + ',' + f(cy + r) + 'Z" fill="' + light + '"/>',
      '<circle cx="' + cx + '" cy="' + f(cy - h) + '" r="' + f(r * 0.07) + '" fill="' + light + '"/>',
      '<circle cx="' + cx + '" cy="' + f(cy + h) + '" r="' + f(r * 0.07) + '" fill="' + dark + '"/>',
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + ring + '" stroke-width="1.5"/>'
    ].join('');
  }

  /** 方孔铜钱：正面上字为「阴」，背面为「阳」 */
  function coinFace(cx, cy, r, isYang) {
    /* 方孔须比字小一圈，否则正面的二字会压在孔上 */
    var hole = r * 0.22;
    var s = '';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="currentColor" stroke-width="' + f(r * 0.07) + '"/>';
    s += '<rect x="' + f(cx - hole) + '" y="' + f(cy - hole) + '" width="' + f(hole * 2) + '" height="' + f(hole * 2) +
         '" fill="none" stroke="currentColor" stroke-width="' + f(r * 0.07) + '"/>';
    if (isYang) {
      /* 背面：外郭八瓣 + 一个阳爻标记 */
      for (var i = 0; i < 8; i++) {
        var a = i * 45 * Math.PI / 180;
        s += '<circle cx="' + f(cx + r * 0.72 * Math.cos(a)) + '" cy="' + f(cy + r * 0.72 * Math.sin(a)) +
             '" r="' + f(r * 0.055) + '" fill="currentColor" opacity=".45"/>';
      }
      s += '<rect x="' + f(cx - r * 0.36) + '" y="' + f(cy - r * 0.09) + '" width="' + f(r * 0.72) +
           '" height="' + f(r * 0.18) + '" fill="currentColor" rx="' + f(r * 0.09) + '"/>';
    } else {
      /* 字心取 cx ± r*0.55、字高 r*0.55，内缘落在 cx ± 0.275r；
         孔半宽 0.22r，两者之间留出约 0.055r 空档。 */
      var fs = r * 0.55;
      var dx = r * 0.55;
      s += '<text x="' + f(cx - dx) + '" y="' + f(cy) + '" font-size="' + f(fs) +
           '" text-anchor="middle" dominant-baseline="central" fill="currentColor" font-family="' + FONT + '">通</text>';
      s += '<text x="' + f(cx + dx) + '" y="' + f(cy) + '" font-size="' + f(fs) +
           '" text-anchor="middle" dominant-baseline="central" fill="currentColor" font-family="' + FONT + '">寶</text>';
    }
    return s;
  }

  var FONT = '"Songti SC","STSong","Noto Serif CJK SC",serif';

  function f(n) { return Math.round(n * 100) / 100; }

  global.Glyph = {
    pt: pt, arc: arc, sector: sector, yaoArc: yaoArc,
    hexagramBars: hexagramBars, taiji: taiji, coinFace: coinFace,
    f: f, TAU: TAU
  };
})(window);
