/* 数据层校验：node tests/verify.js
 * 校验三件事——
 *   1. 先天八卦数（伏羲序）是否与二进制推导一致
 *   2. 京房八宫推导出的 64 卦是否恰好覆盖、无重无漏
 *   3. 八宫卦序是否与《京氏易传》通行记载相符
 */
'use strict';
global.window = global;
require('../js/data.js');
require('../js/core.js');

var C = global.YiCore;
var D = global.BaguaData;

var pass = 0, fail = 0;
function ok(cond, label) {
  if (cond) { pass++; console.log('  ✓ ' + label); }
  else { fail++; console.log('  ✗ ' + label); }
}

console.log('\n一、先天八卦数');
D.TRIGRAMS.forEach(function (t) {
  ok(t.xianTianCalc === t.xianTian, t.name + ' ' + t.glyph + ' 二进制 ' + t.binary + ' → 先天 ' + t.xianTianCalc + '（记载 ' + t.xianTian + '）');
});

console.log('\n二、64 卦完备性');
var v = C.PALACES.__verified;
ok(v.total === 64, '八宫共推出 ' + v.total + ' 卦（应为 64）');
ok(v.duplicates.length === 0, '无重复卦（重复：' + (v.duplicates.join(',') || '无') + '）');
ok(v.missing.length === 0, '无遗漏卦（遗漏：' + (v.missing.join(',') || '无') + '）');
ok(new Set(C.ALL.map(function (h) { return h.no; })).size === 64, '文王卦序 1–64 去重后为 64');

console.log('\n三、上下卦组合唯一性');
var keys = new Set(C.ALL.map(function (h) { return h.key; }));
ok(keys.size === 64, '64 条「上卦|下卦」组合互不重复');

console.log('\n四、京房八宫卦序（对照《京氏易传》）');
var EXPECT = {
  qian: ['乾为天', '天风姤', '天山遁', '天地否', '风地观', '山地剥', '火地晋', '火天大有'],
  kan: ['坎为水', '水泽节', '水雷屯', '水火既济', '泽火革', '雷火丰', '地火明夷', '地水师'],
  gen: ['艮为山', '山火贲', '山天大畜', '山泽损', '火泽睽', '天泽履', '风泽中孚', '风山渐'],
  zhen: ['震为雷', '雷地豫', '雷水解', '雷风恒', '地风升', '水风井', '泽风大过', '泽雷随'],
  xun: ['巽为风', '风天小畜', '风火家人', '风雷益', '天雷无妄', '火雷噬嗑', '山雷颐', '山风蛊'],
  /* 第 7 位「天上讼」即第 6 卦，异名「天水讼」 */
  li: ['离为火', '火山旅', '火风鼎', '火水未济', '山水蒙', '风水涣', '天上讼', '天火同人'],
  kun: ['坤为地', '地雷复', '地泽临', '地天泰', '雷天大壮', '泽天夬', '水天需', '水地比'],
  dui: ['兑为泽', '泽水困', '泽地萃', '泽山咸', '水山蹇', '地山谦', '雷山小过', '雷泽归妹']
};
C.PALACES.forEach(function (p) {
  var got = p.items.map(function (it) { return it.hex.name; });
  var want = EXPECT[p.base.id];
  ok(JSON.stringify(got) === JSON.stringify(want),
    p.base.name + '宫：' + got.join(' → '));
});

console.log('\n五、世爻位');
C.PALACES.forEach(function (p) {
  var shi = p.items.map(function (it) { return it.shi; }).join(',');
  ok(shi === '6,1,2,3,4,5,4,3', p.base.name + '宫世爻 6,1,2,3,4,5,4,3 —— 实为 ' + shi);
});

console.log('\n六、互卦核验（互卦：二三四爻为下卦，三四五爻为上卦）');
// 既济(63) 上坎下离 → 二三四得坎、三四五得离 → 未济；未济之互为既济，二者互为对方互卦
ok(C.nuclear(C.ofNo(63).lines).no === 64, '水火既济 的互卦为 火水未济');
ok(C.nuclear(C.ofNo(64).lines).no === 63, '火水未济 的互卦为 水火既济');
ok(C.nuclear(C.ofNo(1).lines).no === 1, '乾为天 的互卦仍为乾为天');
ok(C.nuclear(C.ofNo(2).lines).no === 2, '坤为地 的互卦仍为坤为地');
ok(C.nuclear(C.ofNo(3).lines).no === 23, '水雷屯 的互卦为 山地剥');
ok(C.nuclear(C.ofNo(24).lines).no === 2, '地雷复 的互卦为 坤为地');

console.log('\n七、爻辞随机抽样');
[[1, '元亨利贞。'], [2, null], [11, '小往大来，吉亨。'], [64, null]].forEach(function (t) {
  var h = C.ofNo(t[0]);
  ok(!!h.name && h.lines.length === 6 && (t[1] === null || h.text === t[1]),
    '第' + t[0] + '卦 ' + h.name + '：' + h.text);
});

console.log('\n────────────────────────────');
console.log('通过 ' + pass + ' 项，失败 ' + fail + ' 项');
process.exit(fail ? 1 : 0);
