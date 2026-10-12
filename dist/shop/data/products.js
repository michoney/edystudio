/* =============================================================
   独立站 · 商品数据
   -------------------------------------------------------------
   改这个文件就能上下架、改价、换款，不用动任何其他文件。

   字段说明
     id       唯一编号（英文/数字/短横线），详情页靠它取货
     name     商品名
     brand    品牌名；自有货 / 演示数据留空 ''
     demo     true = 示例数据（前台会打「示例」角标）；正式开卖改成 false
     category 分类，必须是下面 categories 里的某个 id
     price    售价（元，整数或小数）
     origin   划线价（没有就填 0）
     stock    库存（数字，0 显示「已售罄」）
     model    3D 模型种类，见 js/models.js：necklace / bracelet / ring /
              bag / watch / brooch / earring
     variant  模型配色：metal 见 METALS 表，gem 见 GEMS 表，
              body 见 LEATHERS 表、dial 见 DIALS 表（没有该字段就跳过）
     tagline  一句话卖点，显示在卡片和详情页标题下面
     desc     详情段落（数组，每行一段）
     specs    参数表：[['材质','18K 金'], ['链长','42cm']] 这样写
     tags     角标，例如 ['特价','一件']，没有就写 []
   ============================================================= */

window.SHOP_DATA = {

  /* ── 店铺信息 ───────────────────────────────────────────── */
  shop: {
    name: 'EDY STUDIO 选品',
    slogan: '每一件，都可以转过来看',
    intro: '独立站 · Web3D 商品展示',
    contact: {
      wechat: '（改成你的微信号）',
      phone: '（改成你的联系电话）',
      note: '下单请注明「商品名 + 规格」，现货 24 小时内发出。'
    },
    /* 想接支付/订单接口时，把 POST 地址填这里；留空则订单只在前端生成，
       买家点「复制订单」发给你，你在微信里手工确认收款。 */
    orderApi: ''
  },

  /* ── 分类 ──────────────────────────────────────────────── */
  categories: [
    { id: 'all',       name: '全部' },
    { id: 'necklace',  name: '项链' },
    { id: 'bracelet',  name: '手镯手链' },
    { id: 'ring',      name: '戒指' },
    { id: 'bag',       name: '箱包' },
    { id: 'watch',     name: '腕表' },
    { id: 'brooch',    name: '胸针配饰' },
    { id: 'earring',   name: '耳饰' }
  ],

  /* ── 商品 ──────────────────────────────────────────────── */
  products: [

    {
      id: 'demo-necklace-01',
      name: '锁骨链 · 细链款',
      brand: '',
      demo: true,
      category: 'necklace',
      price: 150,
      origin: 0,
      stock: 2,
      model: 'necklace',
      variant: { metal: 'gold', gem: 'clear' },
      tagline: '细链贴颈，扣头处有自然氧化痕迹',
      tags: ['特价', '一件'],
      specs: [
        ['材质', '18K 金'],
        ['链长', '42cm'],
        ['扣型', '弹簧扣'],
        ['重量', '约 3.2g']
      ],
      desc: [
        '细链款锁骨链，链身贴合颈部弧线，正面不易挂到衣领。',
        '扣头与吊坠连接处可见轻微氧化色差，属正常状态，已在价格中体现。',
        '实拍为自然光下的效果，屏幕色差导致的偏差不作为瑕疵判断依据。'
      ]
    },

    {
      id: 'demo-necklace-02',
      name: '吊坠项链 · 单石款',
      brand: '',
      demo: true,
      category: 'necklace',
      price: 320,
      origin: 0,
      stock: 1,
      model: 'necklace',
      variant: { metal: 'silver', gem: 'topaz' },
      tagline: '单石吊坠，日常叠戴不出错',
      tags: ['仅此一件'],
      specs: [
        ['材质', '925 银'],
        ['主石', '托帕石款'],
        ['链长', '45cm'],
        ['重量', '约 4.6g']
      ],
      desc: [
        '单石吊坠，链身比锁骨链略粗，压得住小克拉主石。',
        '支持叠戴：单独戴正式，和锁骨链叠戴更日常。'
      ]
    },

    {
      id: 'demo-bracelet-01',
      name: '开口手镯 · 字母款',
      brand: '',
      demo: true,
      category: 'bracelet',
      price: 1699,
      origin: 0,
      stock: 1,
      model: 'bracelet',
      variant: { metal: 'gold' },
      tagline: '开口镯身，字母标识压在侧面',
      tags: ['高价件', '一件'],
      specs: [
        ['材质', '金色铜镀金'],
        ['内径', '16.5cm'],
        ['开口', '约 3cm'],
        ['重量', '约 38g']
      ],
      desc: [
        '开口结构，戴脱不需要工具，手腕偏细的话开口处可微调。',
        '字母标识为压制成型，边缘做倒角处理，不刮手。',
        '镀层有使用痕迹的会拍进实拍图，这一件侧面有轻微磨白。'
      ]
    },

    {
      id: 'demo-ring-01',
      name: '单钻戒指 · 托座款',
      brand: '',
      demo: true,
      category: 'ring',
      price: 460,
      origin: 0,
      stock: 3,
      model: 'ring',
      variant: { metal: 'silver', gem: 'diamond' },
      tagline: '四爪托座，主石抬高不易勾衣服',
      tags: ['现货'],
      specs: [
        ['材质', '925 银'],
        ['主石', '锆石款'],
        ['圈口', '可调节'],
        ['重量', '约 5.1g']
      ],
      desc: [
        '四爪托座，爪尖收细，正面看主石占比大，侧面不顶手。',
        '圈口为可调节款，收到后按指围微调。'
      ]
    },

    {
      id: 'demo-bag-01',
      name: '链条翻盖包 · 小号',
      brand: '',
      demo: true,
      category: 'bag',
      price: 890,
      origin: 0,
      stock: 2,
      model: 'bag',
      variant: { body: 'black', metal: 'gold' },
      tagline: '小号翻盖，手机卡包刚好',
      tags: ['可背可手拿'],
      specs: [
        ['尺寸', '18 × 13 × 6cm'],
        ['面料', 'PU 小牛皮纹'],
        ['内衬', '缎面'],
        ['五金', '金色']
      ],
      desc: [
        '小号容量：手机、卡包、口红、充电宝各一。',
        '翻盖磁扣开合，单手可操作；链条可斜挎也可手拿。'
      ]
    },

    {
      id: 'demo-watch-01',
      name: '钢带腕表 · 石英款',
      brand: '',
      demo: true,
      category: 'watch',
      price: 1680,
      origin: 0,
      stock: 1,
      model: 'watch',
      variant: { metal: 'steel', dial: 'black' },
      tagline: '钢带石英，走时稳定，电池可换',
      tags: ['一件', '带保'],
      specs: [
        ['机芯', '石英'],
        ['表径', '38mm'],
        ['表带', '钢带'],
        ['防水', '生活防水']
      ],
      desc: [
        '石英机芯，误差控制在月差 15 秒以内，电池寿命约 2 年，可自行更换。',
        '钢带已做防过敏处理，附赠两节备用表带节。'
      ]
    },

    {
      id: 'demo-brooch-01',
      name: '花形胸针 · 哑光金',
      brand: '',
      demo: true,
      category: 'brooch',
      price: 50,
      origin: 0,
      stock: 6,
      model: 'brooch',
      variant: { metal: 'gold' },
      tagline: '哑光金花形，别在包边或衣领都好看',
      tags: ['特价', '包邮'],
      specs: [
        ['材质', '合金镀金'],
        ['尺寸', '约 3.2cm'],
        ['背针', '一字针'],
        ['重量', '约 9g']
      ],
      desc: [
        '哑光金面，不反光，日常穿搭不跳。',
        '背面一字针，可以别在包盖、帽檐、毛衣肩线。'
      ]
    },

    {
      id: 'demo-earring-01',
      name: '圆环耳饰 · 一对',
      brand: '',
      demo: true,
      category: 'earring',
      price: 128,
      origin: 0,
      stock: 4,
      model: 'earring',
      variant: { metal: 'rose' },
      tagline: '细圆环，戴一整天不硌耳朵',
      tags: ['成对出售'],
      specs: [
        ['材质', '玫瑰金'],
        ['直径', '约 2.6cm'],
        ['针型', '耳针'],
        ['重量', '约 4g / 只']
      ],
      desc: [
        '圆环开口处打磨圆润，戴一整天耳朵不痛。',
        '成对出售，单只不单卖。'
      ]
    }

  ]
};

/* =============================================================
   3D 配色表 —— 想让某款商品换个颜色时，改 variant 里的名字即可。
   例：variant: { metal: 'rose', gem: 'emerald' }
   ============================================================= */

window.SHOP_MATERIALS = {

  METALS: {
    gold:   { name: '18K 金',   color: 0xE9C583, metalness: 1.0, roughness: 0.17 },
    rose:   { name: '玫瑰金',   color: 0xE3A98C, metalness: 1.0, roughness: 0.19 },
    silver: { name: '925 银',   color: 0xDDE1E5, metalness: 1.0, roughness: 0.13 },
    steel:  { name: '不锈钢',   color: 0xB7BEC4, metalness: 1.0, roughness: 0.34 },
    black:  { name: '黑金',     color: 0x3A3D42, metalness: 0.9, roughness: 0.42 }
  },

  GEMS: {
    clear:   { name: '无色',   color: 0xEAF4FF, opacity: 0.55 },
    diamond: { name: '白钻',   color: 0xF2F8FF, opacity: 0.72 },
    topaz:   { name: '托帕',   color: 0x7FC7E8, opacity: 0.72 },
    emerald: { name: '祖母绿', color: 0x4FBF8B, opacity: 0.70 },
    ruby:    { name: '红宝',   color: 0xD8434E, opacity: 0.70 }
  },

  LEATHERS: {
    black:  { name: '黑色', color: 0x1B1C1F, roughness: 0.52 },
    camel:  { name: '驼色', color: 0xA9793F, roughness: 0.58 },
    cream:  { name: '米白', color: 0xDCD3C2, roughness: 0.55 },
    red:    { name: '酒红', color: 0x6B2430, roughness: 0.50 }
  },

  DIALS: {
    black:  { name: '黑盘', color: 0x14161A },
    white:  { name: '白盘', color: 0xE8E4DA },
    blue:   { name: '蓝盘', color: 0x1E3A5F }
  }

};