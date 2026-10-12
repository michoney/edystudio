/* 罗盘几何校验：node tests/layout.js
 *
 * 为什么要有这个：八卦扇区只有 45° 宽，往里塞文字极易糊成一片，
 * 而这个问题在截图里看起来只是"有点挤"，很难一眼定位到是哪两环相撞。
 * 这里把每个环形元素按半径算出内外缘，用数值断言强制它们互不重叠。
 *
 * 约定：r 为距圆心的距离，文字半高按 font-size 的一半估（CJK 满格字形）。
 */
'use strict';
global.window = global;

// luopan.js 依赖 DOM，这里只取它导出的半径配置，故提供最小 document 桩
global.document = { createElementNS: function () { return {}; } };

require('../js/luopan.js');

var R = global.Luopan.R;
var CX = global.Luopan.CX;

var pass = 0, fail = 0;
function ok(cond, label) {
  if (cond) { pass++; console.log('  ✓ ' + label); }
  else { fail++; console.log('  ✗ ' + label); }
}

/* 栈式环带：自外向内依次排布，相邻者不得重叠。
   注意有两类元素不参与这个检查，另见第二、三节：
     · 二十四山界线是「径向细线」，本就该跨过文字所在的半径范围，
       它把每个 15° 楔形隔开，文字落在楔形内部；
     · 天池面是「实心圆盘」，太极是画在它之上的，属于包含而非相邻。 */
var stack = [
  { n: '天球点阵',   in: 381 - 3.6,             out: 381 + 3.6 },
  { n: '二十四山字', in: R.mtnText - 13,         out: R.mtnText + 13 },
  { n: '刻度',       in: R.tickIn,              out: R.tickOut },
  { n: '五行带·外',  in: R.elementBand - 2.5,   out: R.elementBand + 2.5 },
  { n: '爻符·初',    in: R.yao[0] - R.yaoW / 2, out: R.yao[0] + R.yaoW / 2 },
  { n: '爻符·中',    in: R.yao[1] - R.yaoW / 2, out: R.yao[1] + R.yaoW / 2 },
  { n: '爻符·上',    in: R.yao[2] - R.yaoW / 2, out: R.yao[2] + R.yaoW / 2 },
  { n: '卦名',       in: R.name - 21,           out: R.name + 21 },
  { n: '三爻二进制', in: R.binary - 7,          out: R.binary + 7 },
  { n: '八门',       in: R.gate - 8.5,          out: R.gate + 8.5 },
  { n: '五行带·内',  in: R.elementBand2 - 2,    out: R.elementBand2 + 2 },
  { n: '天池面外缘', in: R.pool,                out: R.pool }
];

console.log('\n一、栈式环带相邻不得重叠');
var MIN_GAP = 3;   /* 至少留 3px 呼吸位 */
for (var i = 0; i < stack.length - 1; i++) {
  var a = stack[i], b = stack[i + 1];
  var gap = a.in - b.out;
  ok(gap >= 0, a.n + ' 内缘 ' + a.in.toFixed(1) + ' ≥ ' + b.n + ' 外缘 ' + b.out.toFixed(1) +
     '（间距 ' + gap.toFixed(1) + '）');
  if (gap >= 0 && gap < MIN_GAP) {
    console.log('    ⚠ 间距不足 ' + MIN_GAP + 'px：' + a.n + ' ↔ ' + b.n);
  }
}

console.log('\n二、二十四山界线（径向细线）的约束');
ok(R.mtnLineIn <= R.mtnText - 13,
   '界线内缘 ' + R.mtnLineIn + ' ≤ 山字内缘 ' + (R.mtnText - 13) + '（山字落在楔形内）');
ok(R.mtnLineOut > R.mtnText + 13,
   '界线外缘 ' + R.mtnLineOut + ' > 山字外缘 ' + (R.mtnText + 13) + '（字不越出分界）');
ok(R.mtnLineOut < R.frameIn,
   '界线外缘 ' + R.mtnLineOut + ' < 内框 ' + R.frameIn);
ok(R.mtnLineIn <= R.tickOut,
   '界线内缘 ' + R.mtnLineIn + ' ≤ 刻度外缘 ' + R.tickOut +
   '（二者相接，分界线自外框连至八卦环，连贯为佳）');

console.log('\n三、包含关系');
ok(R.taiji < R.pool,
   '太极半径 ' + R.taiji + ' 在天池面半径 ' + R.pool + ' 之内');
ok(R.taiji + 12 < R.elementBand2 - 2,
   '太极装饰圈 ' + (R.taiji + 12) + ' 不碰内五行带 ' + (R.elementBand2 - 2));
ok(R.poolSplit > R.pool, '天池分隔线 ' + R.poolSplit + ' 在天池面之外');

console.log('\n四、卦名必须在八卦扇区内，且不压爻符');
ok(R.name + 21 < R.baguaOut && R.name - 21 > R.baguaIn,
   '卦名 [' + (R.name - 21) + ', ' + (R.name + 21) + '] 落在八卦环 [' + R.baguaIn + ', ' + R.baguaOut + '] 内');
ok(R.yao[2] - R.yaoW / 2 - (R.name + 21) >= 3,
   '最内爻符下缘 ' + (R.yao[2] - R.yaoW / 2) + ' 距卦名上缘 ' + (R.name + 21) + ' 留白充足');

console.log('\n五、扇区横向余量（卦名单字不得挤出 45° 扇区）');
var arcAt = function (r) { return r * Math.PI / 4; };   /* 45° 弧长 */
ok(arcAt(R.name) > 42 * 1.8,
   '卦名处 45° 弧长 ' + arcAt(R.name).toFixed(1) + 'px，可容两字以上（需 >75.6）');

console.log('\n六、各环不得越出外框');
var maxR = stack.reduce(function (m, b) { return Math.max(m, b.out); }, 0);
ok(maxR <= R.frameIn, '最外元素半径 ' + maxR.toFixed(1) + ' ≤ 内框 ' + R.frameIn);

console.log('\n七、二十四山必须与八卦环不交');
ok(R.mtnLineIn > R.baguaOut,
   '山界内缘 ' + R.mtnLineIn + ' > 八卦环外缘 ' + R.baguaOut);

console.log('\n────────────────────────────');
console.log('通过 ' + pass + ' 项，失败 ' + fail + ' 项');
process.exit(fail ? 1 : 0);
