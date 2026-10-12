/**
 * divination-core.js —— 八卦/六十四卦/梅花起卦 纯计算核心(无 DOM)
 *
 * 编码约定: 三爻数组一律"自下而上"。
 *   数组[0]=初爻(下爻) 数组[1]=中爻 数组[2]=上爻;1=阳 0=阴。
 *   3D 绘制爻线自上而下排布,展示时需倒序(见 index.html 绘制处)。
 *
 * 梅花易数: 上卦=(Y+M+D) mod 8,余0取8;下卦=(Y+M+D+H) mod 8,余0取8;
 *   动爻=(Y+M+D+H) mod 6,余0取第6爻(上爻)。
 *   数字映射: 1乾 2兑 3离 4震 5巽 6坎 7艮 8坤。
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.DivCore = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ============ 八卦编码(自下而上,八者唯一) ============
  var BA = {
    qian: { name: '乾', symbol: '☰', yang: [1, 1, 1] },
    dui:  { name: '兑', symbol: '☱', yang: [1, 1, 0] },
    li:   { name: '离', symbol: '☲', yang: [1, 0, 1] },
    zhen: { name: '震', symbol: '☳', yang: [1, 0, 0] },
    xun:  { name: '巽', symbol: '☴', yang: [0, 1, 1] },
    kan:  { name: '坎', symbol: '☵', yang: [0, 1, 0] },
    gen:  { name: '艮', symbol: '☶', yang: [0, 0, 1] },
    kun:  { name: '坤', symbol: '☷', yang: [0, 0, 0] }
  };
  var BA_KEYS = ['qian', 'dui', 'li', 'zhen', 'xun', 'kan', 'gen', 'kun'];

  // 梅花数序: 1乾 2兑 3离 4震 5巽 6坎 7艮 8坤
  var NUM_TO_KEY = { 1: 'qian', 2: 'dui', 3: 'li', 4: 'zhen', 5: 'xun', 6: 'kan', 7: 'gen', 8: 'kun' };
  var KEY_TO_NUM = {};
  BA_KEYS.forEach(function (k) { KEY_TO_NUM[k] = parseInt(Object.keys(NUM_TO_KEY).find(function (n) { return NUM_TO_KEY[n] === k; }), 10); });

  // ============ 64 卦(文王卦序,与 384 爻辞 YAO_TEXTS 的 1-64 对应) ============
  // [卦名, 上卦key, 下卦key, 卦辞核心]
  var HEX = [
    ['乾', 'qian', 'qian', '元亨利贞。'],
    ['坤', 'kun', 'kun', '元亨，利牝马之贞。'],
    ['屯', 'kan', 'zhen', '元亨利贞，勿用有攸往，利建侯。'],
    ['蒙', 'gen', 'kan', '亨。匪我求童蒙，童蒙求我。'],
    ['需', 'kan', 'qian', '有孚，光亨，贞吉，利涉大川。'],
    ['讼', 'qian', 'kan', '有孚窒惕，中吉，终凶。利见大人。'],
    ['师', 'kun', 'kan', '贞，丈人吉，无咎。'],
    ['比', 'kan', 'kun', '吉。原筮，元永贞，无咎。'],
    ['小畜', 'xun', 'qian', '亨。密云不雨，自我西郊。'],
    ['履', 'qian', 'dui', '履虎尾，不咥人，亨。'],
    ['泰', 'kun', 'qian', '小往大来，吉亨。'],
    ['否', 'qian', 'kun', '否之匪人，不利君子贞，大往小来。'],
    ['同人', 'qian', 'li', '同人于野，亨。利涉大川，利君子贞。'],
    ['大有', 'li', 'qian', '元亨。'],
    ['谦', 'kun', 'gen', '亨，君子有终。'],
    ['豫', 'zhen', 'kun', '利建侯行师。'],
    ['随', 'dui', 'zhen', '元亨利贞，无咎。'],
    ['蛊', 'gen', 'xun', '元亨，利涉大川。先甲三日，后甲三日。'],
    ['临', 'kun', 'dui', '元亨利贞。至于八月有凶。'],
    ['观', 'xun', 'kun', '盥而不荐，有孚颙若。'],
    ['噬嗑', 'li', 'zhen', '亨。利用狱。'],
    ['贲', 'gen', 'li', '亨。小利有攸往。'],
    ['剥', 'gen', 'kun', '不利有攸往。'],
    ['复', 'kun', 'zhen', '亨。出入无疾，朋来无咎。反复其道，七日来复。'],
    ['无妄', 'qian', 'zhen', '元亨利贞。其匪正有眚，不利有攸往。'],
    ['大畜', 'gen', 'qian', '利贞。不家食吉，利涉大川。'],
    ['颐', 'gen', 'zhen', '贞吉。观颐，自求口实。'],
    ['大过', 'dui', 'xun', '栋桡。利有攸往，亨。'],
    ['坎', 'kan', 'kan', '习坎，有孚，维心亨，行有尚。'],
    ['离', 'li', 'li', '利贞，亨。畜牝牛吉。'],
    ['咸', 'dui', 'gen', '亨，利贞。取女吉。'],
    ['恒', 'zhen', 'xun', '亨，无咎，利贞。利有攸往。'],
    ['遁', 'qian', 'gen', '亨，小利贞。'],
    ['大壮', 'zhen', 'qian', '利贞。'],
    ['晋', 'li', 'kun', '康侯用锡马蕃庶，昼日三接。'],
    ['明夷', 'kun', 'li', '利艰贞。'],
    ['家人', 'xun', 'li', '利女贞。'],
    ['睽', 'li', 'dui', '小事吉。'],
    ['蹇', 'kan', 'gen', '利西南，不利东北。利见大人，贞吉。'],
    ['解', 'zhen', 'kan', '利西南。无所往，其来复吉。有攸往，夙吉。'],
    ['损', 'gen', 'dui', '有孚，元吉，无咎，可贞，利有攸往。'],
    ['益', 'xun', 'zhen', '利有攸往，利涉大川。'],
    ['夬', 'dui', 'qian', '扬于王庭，孚号有厉。告自邑，不利即戎。'],
    ['姤', 'qian', 'xun', '女壮，勿用取女。'],
    ['萃', 'dui', 'kun', '亨。王假有庙。利见大人，亨利贞。'],
    ['升', 'kun', 'xun', '元亨。用见大人，勿恤，南征吉。'],
    ['困', 'dui', 'kan', '亨，贞，大人吉，无咎。有言不信。'],
    ['井', 'kan', 'xun', '改邑不改井，无丧无得，往来井井。'],
    ['革', 'dui', 'li', '巳日乃孚。元亨利贞，悔亡。'],
    ['鼎', 'li', 'xun', '元吉，亨。'],
    ['震', 'zhen', 'zhen', '亨。震来虩虩，笑言哑哑，震惊百里。'],
    ['艮', 'gen', 'gen', '艮其背，不获其身；行其庭，不见其人。'],
    ['渐', 'xun', 'gen', '女归吉，利贞。'],
    ['归妹', 'zhen', 'dui', '征凶，无攸利。'],
    ['丰', 'zhen', 'li', '亨，王假之。勿忧，宜日中。'],
    ['旅', 'li', 'gen', '小亨，旅贞吉。'],
    ['巽', 'xun', 'xun', '小亨。利有攸往，利见大人。'],
    ['兑', 'dui', 'dui', '亨，利贞。'],
    ['涣', 'xun', 'kan', '亨。王假有庙，利涉大川，利贞。'],
    ['节', 'kan', 'dui', '亨。苦节不可贞。'],
    ['中孚', 'xun', 'dui', '豚鱼吉。利涉大川，利贞。'],
    ['小过', 'zhen', 'gen', '亨，利贞。可小事，不可大事。'],
    ['既济', 'kan', 'li', '亨小，利贞。初吉终乱。'],
    ['未济', 'li', 'kan', '亨。小狐汔济，濡其尾，无攸利。']
  ];
  var HEX_MAP = {}; // 上卦key+下卦key -> 卦序索引(0-63)
  HEX.forEach(function (h, i) { HEX_MAP[h[1] + h[2]] = i; });

  // ============ 基础函数 ============
  function mod8(n) { var r = n % 8; return r === 0 ? 8 : r; } // 余0取8
  function mod6(n) { var r = n % 6; return r === 0 ? 6 : r; } // 余0取第6爻

  /** 数字1-8 -> 卦 key;越界返回 null */
  function numToKey(n) { return NUM_TO_KEY[n] || null; }

  /** 三爻数组 -> 卦 key;找不到(编码损坏/未定义)返回 null,不抛错 */
  function triToKey(tri) {
    if (!Array.isArray(tri) || tri.length !== 3) return null;
    if (tri.some(function (v) { return v !== 0 && v !== 1 && v !== false && v !== true; })) return null;
    var s = (tri[0] ? 1 : 0) + '' + (tri[1] ? 1 : 0) + '' + (tri[2] ? 1 : 0);
    for (var i = 0; i < BA_KEYS.length; i++) {
      var k = BA_KEYS[i];
      if (BA[k].yang.join('') === s) return k;
    }
    return null;
  }

  /** 8 个三爻编码是否全部唯一且覆盖 000-111 */
  function checkBAUnique() {
    var seen = {};
    var errs = [];
    BA_KEYS.forEach(function (k) {
      var s = BA[k].yang.join('');
      if (seen[s]) errs.push('重复编码 ' + s + ': ' + seen[s] + ' 与 ' + k);
      seen[s] = k;
    });
    for (var i = 0; i < 8; i++) {
      var s = ((i >> 2) & 1) + '' + ((i >> 1) & 1) + '' + (i & 1);
      if (!seen[s]) errs.push('缺编码 ' + s);
    }
    return { ok: errs.length === 0, errs: errs };
  }

  /** 翻转某卦第 pos 位(0=初爻,2=上爻),返回新数组 */
  function flipTri(tri, pos) {
    var t = tri.slice();
    if (pos >= 0 && pos < 3) t[pos] = t[pos] ? 0 : 1;
    return t;
  }

  /**
   * 梅花生辰终身卦计算(纯函数)
   * @param {number} Y 年支数 1-12(子1..亥12,立春制)
   * @param {number} M 农历月份(闰月按正数月序)
   * @param {number} D 农历日期
   * @param {number} H 时辰地支数 1-12
   * @returns {object|null} 计算数据;参数非法返回 null
   */
  function meihuaCalc(Y, M, D, H) {
    Y = parseInt(Y, 10); M = parseInt(M, 10); D = parseInt(D, 10); H = parseInt(H, 10);
    if (![Y, M, D, H].every(function (n) { return isFinite(n); })) return null;
    if (Y < 1 || Y > 12 || M < 1 || M > 12 || D < 1 || D > 30 || H < 1 || H > 12) return null;

    var upNum = mod8(Y + M + D);
    var loNum = mod8(Y + M + D + H);
    var dong = mod6(Y + M + D + H);          // 1-6,自下而上
    var upKey = numToKey(upNum);
    var loKey = numToKey(loNum);
    if (!upKey || !loKey) return null;

    var upperTri = BA[upKey].yang.slice();
    var lowerTri = BA[loKey].yang.slice();

    // 变卦:动爻 1-3 在下卦,4-6 在上卦
    var bLower = lowerTri.slice();
    var bUpper = upperTri.slice();
    if (dong <= 3) bLower = flipTri(lowerTri, dong - 1);
    else bUpper = flipTri(upperTri, dong - 4);

    var bLoKey = triToKey(bLower);
    var bUpKey = triToKey(bUpper);
    var benIndex = HEX_MAP[upKey + loKey];
    var bianIndex = (bLoKey !== null && bUpKey !== null) ? HEX_MAP[bUpKey + bLoKey] : undefined;

    return {
      Y: Y, M: M, D: D, H: H,
      upNum: upNum, loNum: loNum, dong: dong,
      upKey: upKey, loKey: loKey,
      upperTri: upperTri, lowerTri: lowerTri,
      bUpKey: bUpKey, bLoKey: bLoKey,
      bUpperTri: bUpper, bLowerTri: bLower,
      benIndex: (benIndex === undefined ? null : benIndex),
      bianIndex: (bianIndex === undefined ? null : bianIndex)
    };
  }

  /** 由 6 爻(自下而上)组六十四卦(龟壳摇卦用)。返回 null 表示编码异常 */
  function composeFromSix(yaoList) {
    if (!yaoList || yaoList.length !== 6) return null;
    var lower = triToKey([yaoList[0].yang, yaoList[1].yang, yaoList[2].yang]);
    var upper = triToKey([yaoList[3].yang, yaoList[4].yang, yaoList[5].yang]);
    if (lower === null || upper === null) return null;
    var hi = HEX_MAP[upper + lower];
    if (hi === undefined) return null;
    var bianList = yaoList.map(function (y) { return { yang: y.bian ? !y.yang : y.yang }; });
    var bLower = triToKey([bianList[0].yang, bianList[1].yang, bianList[2].yang]);
    var bUpper = triToKey([bianList[3].yang, bianList[4].yang, bianList[5].yang]);
    var hasBian = yaoList.some(function (y) { return y.bian; });
    var bHi = null;
    if (hasBian && bLower !== null && bUpper !== null) {
      var bm = HEX_MAP[bUpper + bLower];
      if (bm !== undefined) bHi = bm;
    }
    return {
      lower: lower, upper: upper, benIndex: hi,
      hasBian: hasBian, bLower: bLower, bUpper: bUpper, bianIndex: bHi,
      dongList: yaoList.map(function (y, i) { return y.bian ? (i + 1) : 0; }).filter(function (n) { return n > 0; })
    };
  }

  /** 64 卦组合完备性检查(测试用) */
  function checkAllCombos() {
    var missing = [];
    BA_KEYS.forEach(function (up) {
      BA_KEYS.forEach(function (lo) {
        if (HEX_MAP[up + lo] === undefined) missing.push(up + '+' + lo);
      });
    });
    return { ok: missing.length === 0, missing: missing };
  }

  return {
    BA: BA, BA_KEYS: BA_KEYS, NUM_TO_KEY: NUM_TO_KEY, KEY_TO_NUM: KEY_TO_NUM,
    HEX: HEX, HEX_MAP: HEX_MAP,
    mod8: mod8, mod6: mod6,
    numToKey: numToKey, triToKey: triToKey, flipTri: flipTri,
    checkBAUnique: checkBAUnique, checkAllCombos: checkAllCombos,
    meihuaCalc: meihuaCalc, composeFromSix: composeFromSix
  };
});
