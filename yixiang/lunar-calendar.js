/**
 * lunar-calendar.js —— 公历/农历换算 + 立春年支(民用日规则) + 时辰地支
 *
 * 底层: lunar.js(6tail lunar-javascript v1.7.7,数据驱动,支持公历 1900-2100)
 * 本地化文件,不依赖 CDN。
 *
 * 规则说明:
 *  - 立春分界按"当地民用日期":输入只有公历日期、无时刻时,输入日 >= 立春当日,
 *    该整天按当年年支计;早于立春日的日期采用上一公历年对应的年支。
 *  - 默认时区 Asia/Shanghai(库按本地时区计算节气时刻,仅用于定位立春日)。
 *  - 子时跨日:不把 23 点后的晚子时改为第二天,年/月/日以用户选择的公历日期为准。
 *  - 闰月:getMonth() 返回负数表示闰月(如 -6 = 闰六月),起卦月份取其正数(月序)。
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory(require('./lunar.js'));   // node: 命名空间对象 {Solar, Lunar,...}
  } else {
    root.LunarCal = factory(root);                     // 浏览器: lunar.js 把类平铺到 window
  }
})(typeof self !== 'undefined' ? self : this, function (NS) {
  'use strict';

  if (!NS) throw new Error('lunar-calendar.js 需要先加载 lunar.js');
  // node 命名空间含 Solar/Lunar;浏览器平铺,window.Lunar 即 Lunar 类本身
  var Solar = NS.Solar || NS.Lunar || NS;
  if (!Solar || !Solar.fromYmd) throw new Error('lunar-calendar.js 需要先加载 lunar.js');

  var SUPPORT = { from: '1900-01-01', to: '2100-12-31' };

  // 时辰表: [起时, 止时, 名, 地支数]  子时跨日归属原日期(晚子时仍计当日,不做跨日改期)
  var SHICHEN = [
    [23, 1,  '子时 23:00-00:59', 1],
    [1,  3,  '丑时 01:00-02:59', 2],
    [3,  5,  '寅时 03:00-04:59', 3],
    [5,  7,  '卯时 05:00-06:59', 4],
    [7,  9,  '辰时 07:00-08:59', 5],
    [9,  11, '巳时 09:00-10:59', 6],
    [11, 13, '午时 11:00-12:59', 7],
    [13, 15, '未时 13:00-14:59', 8],
    [15, 17, '申时 15:00-16:59', 9],
    [17, 19, '酉时 17:00-18:59', 10],
    [19, 21, '戌时 19:00-20:59', 11],
    [21, 23, '亥时 21:00-22:59', 12]
  ];
  var ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  var GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  /** 严格校验公历日期是否存在 */
  function isValidDate(y, m, d) {
    if (!(y >= 1900 && y <= 2100)) return false;
    var dt = new Date(y, m - 1, d);
    return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
  }

  /** 找公历年 y 的立春 Solar(遍历 2/3-2/5 附近取节气表,必然命中) */
  function findLiChunSolar(y) {
    for (var day = 2; day <= 6; day++) {
      var s = Solar.fromYmd(y, 2, day);
      var lc = s.getLunar().getJieQiTable()['立春'];
      if (lc && lc.getYear() === y) return lc;
    }
    // 兜底:直接由立春日反查
    for (day = 3; day <= 5; day++) {
      var cand = Solar.fromYmd(y, 2, day);
      if (cand.getLunar().getJieQi() === '立春') return cand;
    }
    return null;
  }

  /** 某公历年按立春制取年支(民用日整天规则:返回当年立春所在日 23:59 的干支年支名) */
  function yearZhiOf(y) {
    var lc = findLiChunSolar(y);
    var s = Solar.fromYmdHms(lc.getYear(), lc.getMonth(), lc.getDay(), 23, 59, 59);
    var gz = s.getLunar().getYearInGanZhiByLiChun(); // 如 丙午
    return gz.slice(1);
  }

  function zhiToNum(zhi) {
    var i = ZHI.indexOf(zhi);
    return i < 0 ? null : i + 1;
  }

  function ganZhiOf(y, m, d) {
    // 六十甲子序号:(公历年-4) mod 60;干支 = 天干[序%10]+地支[序%12] (以立春划分需特殊处理,此处仅给农历年参考)
    var s = Solar.fromYmd(y, m, d);
    var l = s.getLunar();
    return {
      yearGZExact: l.getYearInGanZhiExact(),
      monthGZ: l.getMonthInGanZhi(),
      dayGZ: l.getDayInGanZhi(),
      shengxiao: l.getYearShengXiao()
    };
  }

  /**
   * 换算主入口
   * @returns {object}
   *  { solarY, solarM, solarD, isFuture, lunarMonth, isLeap, lunarDay, monthCn, dayCn,
   *    yearBranchName, yearBranchNum, liChunText, liChunDateStr, usedPrevYearBranch }
   */
  function lunarInfo(y, m, d) {
    if (!isValidDate(y, m, d)) return { error: '无效日期或超出支持范围(1900-01-01 ~ 2100-12-31)' };

    var today = new Date();
    var input = new Date(y, m - 1, d);
    input.setHours(0, 0, 0, 0);
    var isFuture = input.getTime() > today.getTime();

    var s = Solar.fromYmd(y, m, d);
    var l = s.getLunar();
    var lm = l.getMonth(); // 负=闰月

    var lc = findLiChunSolar(y); // 输入公历年 y 的立春(民用日比较只用日期部分)
    var lcDate = new Date(lc.getYear(), lc.getMonth() - 1, lc.getDay());
    var usedPrev = input.getTime() < lcDate.getTime();
    var yearZhiName, yearZhiNum;
    if (usedPrev) {
      var prevZhi = yearZhiOf(y - 1); // 输入早于 y 年立春 → 用 y-1 公历年立春制年支
      yearZhiName = prevZhi;
      yearZhiNum = zhiToNum(prevZhi);
    } else {
      var curZhi = yearZhiOf(y);
      yearZhiName = curZhi;
      yearZhiNum = zhiToNum(curZhi);
    }

    return {
      solarY: y, solarM: m, solarD: d,
      isFuture: isFuture,
      lunarMonth: Math.abs(lm), isLeap: lm < 0,
      lunarDay: l.getDay(),
      monthCn: l.getMonthInChinese(),   // 正/二/.../冬/腊,闰月为 闰X
      dayCn: l.getDayInChinese(),       // 初一..三十
      yearBranchName: yearZhiName,      // 立春制年支(民用日整天)
      yearBranchNum: yearZhiNum,        // 子1..亥12
      zhiByExact: yearZhiName,
      liChunText: (lc ? lc.getYear() + '-' + pad2(lc.getMonth()) + '-' + pad2(lc.getDay()) + ' ' + pad2(lc.getHour()) + ':' + pad2(lc.getMinute()) : ''),
      liChunDateStr: (lc ? lc.getYear() + '年' + lc.getMonth() + '月' + lc.getDay() + '日' : ''),
      usedPrevYearBranch: usedPrev,
      isInLiChunRange: input.getTime() >= lcDate.getTime()
    };
  }

  return {
    SUPPORT: SUPPORT,
    SHICHEN: SHICHEN,
    ZHI: ZHI,
    isValidDate: isValidDate,
    lunarInfo: lunarInfo,
    findLiChunSolar: findLiChunSolar,
    zhiToNum: zhiToNum,
    yearZhiOf: yearZhiOf,
    pad2: pad2
  };
});
