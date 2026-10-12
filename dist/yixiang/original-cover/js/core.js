/* ============================================================================
 *  易数推导层 —— 六十四卦由八卦按规则生成，而非穷举硬编码
 * ----------------------------------------------------------------------------
 *  一、六十四卦 = 上卦 × 下卦 8×8 = 64，文王卦次为查表所得
 *  二、京房八宫：以本宫卦为基准，按变爻集合推导
 *       八纯  ∅          一世  ①          二世  ①②         三世  ①②③
 *       四世  ①②③④      五世  ①②③④⑤    游魂  ①②③⑤     归魂  ⑤
 *     世爻分别落在 六 一 二 三 四 五 四 三 爻
 * ========================================================================== */

(function (global) {
  'use strict';

  var D = global.BaguaData;

  /* --- 六十四卦索引表 ------------------------------------------------------ */
  var HEX = {};        // "upper|lower" -> hexagram
  var BY_NO = {};      // 文王卦次 -> hexagram

  D.KING_WEN.forEach(function (row) {
    var up = D.byId(row[0]), low = D.byId(row[1]);
    var h = {
      key: row[0] + '|' + row[1],
      upper: up,
      lower: low,
      no: row[2],
      name: row[3],
      text: row[4],
      /* 六爻自初至上 */
      lines: low.lines.concat(up.lines),
      nameParts: {
        upper: up.name + up.nature,
        lower: low.name + low.nature
      }
    };
    h.bian = h.lines.slice().join('');   /* 000111 形式，阳 1 阴 0，初爻在左 */
    HEX[h.key] = h;
    BY_NO[h.no] = h;
  });

  /* --- 京房八宫推导 -------------------------------------------------------- */
  /**
   * 变卦：给定本宫卦与「卦内局部爻序」集合，返回变化后的三爻卦。
   * 全局爻序 1/2/3 属下卦，4/5/6 属上卦；换算到各自卦内的 0/1/2 索引。
   */
  function flip(trigram, localIdx) {
    var lines = trigram.lines.slice();
    localIdx.forEach(function (i) {
      if (i >= 0 && i <= 2) { lines[i] = lines[i] ? 0 : 1; }
    });
    /* 反查该三爻组合所属八卦 */
    for (var i = 0; i < D.TRIGRAMS.length; i++) {
      var t = D.TRIGRAMS[i];
      if (t.lines[0] === lines[0] && t.lines[1] === lines[1] && t.lines[2] === lines[2]) {
        return t;
      }
    }
    return null;
  }

  var PALACES = D.PALACE_ORDER.map(function (pid, pi) {
    var base = D.byId(pid);
    var items = D.PALACE_MUTATE.map(function (mut, mi) {
      /* 全局爻序 → 卦内局部索引：爻 1,2,3 属下卦，爻 4,5,6 属上卦 */
      var upper = flip(base, mut.filter(function (y) { return y > 3; }).map(function (y) { return y - 4; }));
      var lower = flip(base, mut.filter(function (y) { return y <= 3; }).map(function (y) { return y - 1; }));
      var h = HEX[upper.id + '|' + lower.id];
      return {
        palace: base,
        palaceIndex: pi,
        stage: D.PALACE_STAGES[mi],
        shi: D.PALACE_SHI[mi],
        hex: h
      };
    });
    return { base: base, index: pi, element: base.element, items: items };
  });

  /* 校验：64 卦是否被八宫恰好覆盖一次（开发期自检） */
  (function selfCheck() {
    var seen = {}, dup = [], total = 0;
    PALACES.forEach(function (p) {
      p.items.forEach(function (it) {
        total++;
        if (seen[it.hex.no]) { dup.push(it.hex.no); }
        seen[it.hex.no] = true;
        it.palace = p.base;
        it.palaceStage = it.stage;
      });
    });
    var missing = [];
    for (var n = 1; n <= 64; n++) { if (!seen[n]) { missing.push(n); } }
    PALACES.__verified = { total: total, duplicates: dup, missing: missing };
    if (dup.length || missing.length) {
      console.warn('[易数] 八宫自检未通过 — 重复:', dup, '缺失:', missing);
    }
  })();

  /* --- 互卦：二三四爻为下卦，三四五爻为上卦 ------------------------------- */
  function nuclear(lines) {
    var lowerId = idOf([lines[1], lines[2], lines[3]]);
    var upperId = idOf([lines[2], lines[3], lines[4]]);
    return HEX[upperId + '|' + lowerId];
  }

  function idOf(triple) {
    for (var i = 0; i < D.TRIGRAMS.length; i++) {
      var t = D.TRIGRAMS[i];
      if (t.lines[0] === triple[0] && t.lines[1] === triple[1] && t.lines[2] === triple[2]) return t.id;
    }
    return null;
  }

  /* --- 体用：变爻在下卦为「用」，在上卦为「体」 ----------------------------- */
  function tiYong(hex, changingIdx) {
    if (!changingIdx.length) return null;
    var hasMovingUpper = changingIdx.some(function (i) { return i >= 3; });
    var hasMovingLower = changingIdx.some(function (i) { return i < 3; });
    if (hasMovingUpper && hasMovingLower) return { ti: '互有', yong: '互有', note: '三爻皆动，体用不分明' };
    if (hasMovingUpper) return { ti: hex.lower, yong: hex.upper, note: '上卦动，下卦为体，上卦为用' };
    return { ti: hex.upper, yong: hex.lower, note: '下卦动，上卦为体，下卦为用' };
  }

  global.YiCore = {
    HEX: HEX,
    BY_NO: BY_NO,
    ALL: D.KING_WEN.map(function (r) { return HEX[r[0] + '|' + r[1]]; }),
    PALACES: PALACES,
    nuclear: nuclear,
    tiYong: tiYong,
    /* 由上卦 id + 下卦 id 取卦 */
    of: function (upperId, lowerId) { return HEX[upperId + '|' + lowerId]; },
    /* 由文王卦次取卦 */
    ofNo: function (no) { return BY_NO[no]; }
  };
})(window);
