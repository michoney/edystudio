/* ============================================================================
 *  八卦 · 六十四卦  数据层
 * ----------------------------------------------------------------------------
 *  考据出处：
 *   · 后天八卦方位 —— 《周易·说卦》「立天、地、雷、风、水、火、山、泽」
 *   · 先天八卦数   —— 伏羲 乾一、兑二、离三、震四、巽五、坎六、艮七、坤八
 *   · 洛书九数     —— 坎一、坤二、震三、巽四、中五、乾六、兑七、艮八、离九
 *   · 八门         —— 《奇门遁甲》八门配八卦（坎休、艮生、震伤、巽杜、
 *                      离景、坤死、兑开、乾开）。此为玄空/奇门体系，
 *                      非《周易》经文，仅作堪舆罗盘参考层标注。
 *   · 六十四卦序   —— 文王卦序（通行本《周易》卦次）
 *   · 京房八宫     —— 汉·京房《京氏易传》八宫卦序
 *   · 卦辞         —— 《周易》经文卦辞（《周易正义》通行本）
 *
 *  约定：
 *   lines[0] = 初爻（最下），lines[1] = 中爻，lines[2] = 上爻（最上）
 *   阳爻 = 1（实线），阴爻 = 0（断线）
 *   bearing  = 罗盘度数，正北为 0°，顺时针，东 90°，正南 180°
 * ========================================================================== */

(function (global) {
  'use strict';

  /* --- 八十四山之二十四山：每山 15°，山名居中 --- */
  var MOUNTAINS = [
    { name: '壬', bearing: 345 }, { name: '子', bearing: 0, axis: 'N' },
    { name: '癸', bearing: 15 },  { name: '丑', bearing: 30 },
    { name: '艮', bearing: 45 },  { name: '寅', bearing: 60 },
    { name: '甲', bearing: 75 },  { name: '卯', bearing: 90, axis: 'E' },
    { name: '乙', bearing: 105 }, { name: '辰', bearing: 120 },
    { name: '巽', bearing: 135 }, { name: '巳', bearing: 150 },
    { name: '丙', bearing: 165 }, { name: '午', bearing: 180, axis: 'S' },
    { name: '丁', bearing: 195 }, { name: '未', bearing: 210 },
    { name: '坤', bearing: 225 }, { name: '申', bearing: 240 },
    { name: '庚', bearing: 255 }, { name: '酉', bearing: 270, axis: 'W' },
    { name: '辛', bearing: 285 }, { name: '戌', bearing: 300 },
    { name: '乾', bearing: 315 }, { name: '亥', bearing: 330 }
  ];

  /* --- 八卦：后天方位环（北 0°，顺时针） --- */
  var TRIGRAMS = [
    {
      id: 'qian', name: '乾', glyph: '☰', lines: [1, 1, 1],
      nature: '天', bearing: 315, dir: '西北', element: '金', family: '父',
      xianTian: 1, luoshu: 6, gate: '开门',
      image: '健', ci: '天行健，君子以自强不息。',
      beasts: '马', flesh: '首', natureObj: '玉', season: '立冬',
      branch: '戌乾亥', color: '#d8b45a'
    },
    {
      id: 'gen', name: '艮', glyph: '☶', lines: [0, 0, 1],
      nature: '山', bearing: 45, dir: '东北', element: '土', family: '少男',
      xianTian: 7, luoshu: 8, gate: '生门',
      image: '止', ci: '兼山艮，君子以思不出其位。',
      beasts: '狗', flesh: '手', natureObj: '石', season: '立春',
      branch: '丑艮寅', color: '#b8763e'
    },
    {
      id: 'zhen', name: '震', glyph: '☳', lines: [1, 0, 0],
      nature: '雷', bearing: 90, dir: '正东', element: '木', family: '长男',
      xianTian: 4, luoshu: 3, gate: '伤门',
      image: '动', ci: '洊雷震，君子以恐惧修省。',
      beasts: '龙', flesh: '足', natureObj: '竹', season: '春分',
      branch: '甲卯乙', color: '#6f9c5a'
    },
    {
      id: 'xun', name: '巽', glyph: '☴', lines: [0, 1, 1],
      nature: '风', bearing: 135, dir: '东南', element: '木', family: '长女',
      xianTian: 5, luoshu: 4, gate: '杜门',
      image: '入', ci: '随风巽，君子以申命行事。',
      beasts: '鸡', flesh: '股', natureObj: '绳', season: '立夏',
      branch: '辰巽巳', color: '#7aa88a'
    },
    {
      id: 'li', name: '离', glyph: '☲', lines: [1, 0, 1],
      nature: '火', bearing: 180, dir: '正南', element: '火', family: '中女',
      xianTian: 3, luoshu: 9, gate: '景门',
      image: '丽', ci: '明两作离，大人以继明照于四方。',
      beasts: '雉', flesh: '目', natureObj: '目', season: '夏至',
      branch: '丙午丁', color: '#c24a3a'
    },
    {
      id: 'kun', name: '坤', glyph: '☷', lines: [0, 0, 0],
      nature: '地', bearing: 225, dir: '西南', element: '土', family: '母',
      xianTian: 8, luoshu: 2, gate: '死门',
      image: '顺', ci: '地势坤，君子以厚德载物。',
      beasts: '牛', flesh: '腹', natureObj: '布', season: '立秋',
      branch: '未坤申', color: '#c8a86a'
    },
    {
      id: 'dui', name: '兑', glyph: '☱', lines: [1, 1, 0],
      nature: '泽', bearing: 270, dir: '正西', element: '金', family: '少女',
      xianTian: 2, luoshu: 7, gate: '开口',
      image: '悦', ci: '丽泽兑，君子以朋友讲习。',
      beasts: '羊', flesh: '口', natureObj: '羊', season: '秋分',
      branch: '庚酉辛', color: '#cfae72'
    },
    {
      id: 'kan', name: '坎', glyph: '☵', lines: [0, 1, 0],
      nature: '水', bearing: 0, dir: '正北', element: '水', family: '中男',
      xianTian: 6, luoshu: 1, gate: '休门',
      image: '陷', ci: '洊水坎，君子以常德行，习教事。',
      beasts: '豕', flesh: '耳', natureObj: '水', season: '冬至',
      branch: '壬子癸', color: '#4f7fa8'
    }
  ];

  var BY_ID = {};
  TRIGRAMS.forEach(function (t) {
    /* 伏羲先天数：把三爻视作二进制数（阳 1 阴 0），初爻为高位，
       则 乾=111→1、兑=110→2、离=101→3、震=100→4、巽=011→5、
       坎=010→6、艮=001→7、坤=000→8，故 先天数 = 8 − 二进制值。 */
    var bin = t.lines[0] * 4 + t.lines[1] * 2 + t.lines[2];
    t.binary = t.lines.map(String).join('');
    t.hexValue = bin;
    t.xianTianCalc = 8 - bin;
    BY_ID[t.id] = t;
  });

  /* --- 六十甲子式：五行配色 --- */
  var ELEMENT_COLOR = {
    金: '#cbb273', 木: '#6f9c5a', 水: '#4f7fa8',
    火: '#c24a3a', 土: '#b8763e'
  };

  /* --- 文王卦序：64 条，[上卦 id, 下卦 id, 卦次, 卦名, 卦辞] --- */
  var KING_WEN = [
    ['qian', 'qian', 1, '乾为天', '元亨利贞。'],
    ['kun', 'kun', 2, '坤为地', '元亨，利牝马之贞。君子有攸往，先迷后得主，利。西南得朋，东北丧朋。安贞，吉。'],
    ['kan', 'zhen', 3, '水雷屯', '元亨利贞。勿用有攸往，利建侯。'],
    ['gen', 'kan', 4, '山水蒙', '亨。匪我求童蒙，童蒙求我。初筮告，再三渎，渎则不告。利贞。'],
    ['kan', 'qian', 5, '水天需', '有孚，光亨，贞吉。利涉大川。'],
    ['qian', 'kan', 6, '天上讼', '有孚窒惕，中吉，终凶。利见大人，不利涉大川。'],
    ['kun', 'kan', 7, '地水师', '贞，丈人吉，无咎。'],
    ['kan', 'kun', 8, '水地比', '吉。原筮，元永贞，无咎。不宁方来，后夫凶。'],
    ['xun', 'qian', 9, '风天小畜', '亨。密云不雨，自我西郊。'],
    ['qian', 'dui', 10, '天泽履', '履虎尾，不咥人，亨。'],
    ['kun', 'qian', 11, '地天泰', '小往大来，吉亨。'],
    ['qian', 'kun', 12, '天地否', '否之匪人，不利君子贞，大往小来。'],
    ['qian', 'li', 13, '天火同人', '同人于野，亨。利涉大川，利君子贞。'],
    ['li', 'qian', 14, '火天大有', '元亨。'],
    ['kun', 'gen', 15, '地山谦', '亨，君子有终。'],
    ['zhen', 'kun', 16, '雷地豫', '利建侯行师。'],
    ['dui', 'zhen', 17, '泽雷随', '元亨利贞，无咎。'],
    ['gen', 'xun', 18, '山风蛊', '元亨，利涉大川。先甲三日，后甲三日。'],
    ['kun', 'dui', 19, '地泽临', '元亨利贞。至于八月有凶。'],
    ['xun', 'kun', 20, '风地观', '盥而不荐，有孚颙若。'],
    ['li', 'zhen', 21, '火雷噬嗑', '亨。利用狱。'],
    ['gen', 'li', 22, '山火贲', '亨。小利有攸往。'],
    ['gen', 'kun', 23, '山地剥', '不利有攸往。'],
    ['kun', 'zhen', 24, '地雷复', '亨。出入无疾，朋来无咎。反复其道，七日来复，利有攸往。'],
    ['qian', 'zhen', 25, '天雷无妄', '元亨利贞。其匪正有眚，不利有攸往。'],
    ['gen', 'qian', 26, '山天大畜', '利贞。不家食吉，利涉大川。'],
    ['gen', 'zhen', 27, '山雷颐', '贞吉。观颐，自求口实。'],
    ['dui', 'xun', 28, '泽风大过', '栋桡。利有攸往，亨。'],
    ['kan', 'kan', 29, '坎为水', '习坎，有孚，维心亨，行有尚。'],
    ['li', 'li', 30, '离为火', '利贞，亨。畜牝牛，吉。'],
    ['dui', 'gen', 31, '泽山咸', '亨，利贞。取女吉。'],
    ['zhen', 'xun', 32, '雷风恒', '亨，无咎，利贞。利有攸往。'],
    ['qian', 'gen', 33, '天山遁', '亨，小利贞。'],
    ['zhen', 'qian', 34, '雷天大壮', '利贞。'],
    ['li', 'kun', 35, '火地晋', '康侯用锡马蕃庶，昼日三接。'],
    ['kun', 'li', 36, '地火明夷', '利艰贞。'],
    ['xun', 'li', 37, '风火家人', '利女贞。'],
    ['li', 'dui', 38, '火泽睽', '小事吉。'],
    ['kan', 'gen', 39, '水山蹇', '利西南，不利东北。利见大人，贞吉。'],
    ['zhen', 'kan', 40, '雷水解', '利西南。无所往，其来复吉。有攸往，夙吉。'],
    ['gen', 'dui', 41, '山泽损', '有孚，元吉，无咎，可贞。利有攸往。'],
    ['xun', 'zhen', 42, '风雷益', '利有攸往，利涉大川。'],
    ['dui', 'qian', 43, '泽天夬', '扬于王庭，孚号有厉。告自邑，不利即戎，利有攸往。'],
    ['qian', 'xun', 44, '天风姤', '女壮，勿用取女。'],
    ['dui', 'kun', 45, '泽地萃', '亨。王假有庙，利见大人。亨，利贞。用大牲吉，利有攸往。'],
    ['kun', 'xun', 46, '地风升', '元亨。用见大人，勿恤，南征吉。'],
    ['dui', 'kan', 47, '泽水困', '亨，贞，大人吉，无咎。有言不信。'],
    ['kan', 'xun', 48, '水风井', '改邑不改井，无丧无得。往来井井。汔至，亦未繘井，羸其瓶，凶。'],
    ['dui', 'li', 49, '泽火革', '巳日乃孚，元亨利贞，悔亡。'],
    ['li', 'xun', 50, '火风鼎', '元吉，亨。'],
    ['zhen', 'zhen', 51, '震为雷', '亨。震来虩虩，笑言哑哑。震惊百里，不丧匕鬯。'],
    ['gen', 'gen', 52, '艮为山', '艮其背，不获其身，行其庭不见其人，无咎。'],
    ['xun', 'gen', 53, '风山渐', '女归吉，利贞。'],
    ['zhen', 'dui', 54, '雷泽归妹', '征凶，无攸利。'],
    ['zhen', 'li', 55, '雷火丰', '亨，王假之。勿忧，宜日中。'],
    ['li', 'gen', 56, '火山旅', '小亨，旅贞吉。'],
    ['xun', 'xun', 57, '巽为风', '小亨。利有攸往，利见大人。'],
    ['dui', 'dui', 58, '兑为泽', '亨，利贞。'],
    ['xun', 'kan', 59, '风水涣', '亨。王假有庙，利涉大川，利贞。'],
    ['kan', 'dui', 60, '水泽节', '亨。苦节不可贞。'],
    ['xun', 'dui', 61, '风泽中孚', '豚鱼吉，利涉大川，利贞。'],
    ['zhen', 'gen', 62, '雷山小过', '亨，利贞。可小事，不可大事。飞鸟遗之音，不宜上，宜下，大吉。'],
    ['kan', 'li', 63, '水火既济', '亨小。利贞。初吉终乱。'],
    ['li', 'kan', 64, '火水未济', '亨。小狐汔济，濡其尾，无攸利。']
  ];

  /* --- 京房八宫：八纯世六，一至五世，游魂世四，归魂世三 --- */
  var PALACE_ORDER = ['qian', 'kan', 'gen', 'zhen', 'xun', 'li', 'kun', 'dui'];
  var PALACE_STAGES = ['八纯', '一世', '二世', '三世', '四世', '五世', '游魂', '归魂'];
  var PALACE_SHI    = [6, 1, 2, 3, 4, 5, 4, 3];
  /* 相对本宫卦需变的爻序（自初爻起算，1 6） */
  var PALACE_MUTATE = [
    [], [1], [1, 2], [1, 2, 3], [1, 2, 3, 4], [1, 2, 3, 4, 5], [1, 2, 3, 5], [5]
  ];

  /* --- 爻位名 --- */
  var YAO_NAME = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];
  var YAO_NAME_SHORT = ['初', '二', '三', '四', '五', '上'];

  /* --- 铜钱卦数：背为阳三、字为阴二 --- */
  var COIN_VALUES = {
    6:  { name: '老阴', mark: '交', yang: false, moving: true,  desc: '阴极动' },
    7:  { name: '少阳', mark: '单', yang: true,  moving: false, desc: '阳静' },
    8:  { name: '少阴', mark: '拆', yang: false, moving: false, desc: '阴静' },
    9:  { name: '老阳', mark: '重', yang: true,  moving: true,  desc: '阳极动' }
  };

  global.BaguaData = {
    MOUNTAINS: MOUNTAINS,
    TRIGRAMS: TRIGRAMS,
    byId: function (id) { return BY_ID[id]; },
    ELEMENT_COLOR: ELEMENT_COLOR,
    KING_WEN: KING_WEN,
    PALACE_ORDER: PALACE_ORDER,
    PALACE_STAGES: PALACE_STAGES,
    PALACE_SHI: PALACE_SHI,
    PALACE_MUTATE: PALACE_MUTATE,
    YAO_NAME: YAO_NAME,
    YAO_NAME_SHORT: YAO_NAME_SHORT,
    COIN_VALUES: COIN_VALUES
  };
})(window);
