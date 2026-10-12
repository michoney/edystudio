// Live watchlist — market indices dashboard + A-share + US + HK quotes
// Tencent qt.gtimg.cn, frontend-only, refresh every 60s. Response is GBK.

const A_CODE = 'sz300502';
const INDEXES = [
  ['sh000001', '上证指数'], ['sz399001', '深证成指'], ['sz399006', '创业板指'],
  ['hkHSI',    '恒生指数'], ['usDJI',    '道琼斯'],   ['usIXIC',  '纳斯达克'],
  ['usINX',    '标普500']
];
const WATCH = [
  { title: '七姐妹 MAGNIFICENT 7', codes: [
    ['usAAPL',  '苹果'],   ['usMSFT', '微软'],   ['usNVDA', '英伟达'],
    ['usGOOGL', '谷歌'],   ['usAMZN', '亚马逊'], ['usMETA', 'Meta'],
    ['usTSLA',  '特斯拉']
  ]},
  { title: '美股其他 US OTHERS', codes: [
    ['usORCL',  '甲骨文'], ['usAMD',  '超威半导体'], ['usWDC', '西部数据'],
    ['usSPCX',  'SpaceX'], ['usSKHY', 'SK海力士'],   ['usSSNLF', '三星电子']
  ]},
  { title: '港股 HK', codes: [
    ['hk00992', '联想集团'], ['hk02513', '智谱'], ['hk00020', '商汤-W']
  ]}
];
let quoteTimer = null;

function parseBlock(line) {
  const m = line.match(/^v_([\w.]+)="([^"]*)"/);
  if (!m) return null;
  const f = m[2].split('~');
  if (f.length < 40) return null;
  return {
    varName: m[1],
    name: f[1],
    code: f[2],
    price: parseFloat(f[3]),
    prevClose: parseFloat(f[4]),
    ts: f[30] || '',
    change: parseFloat(f[31]),
    pct: parseFloat(f[32]),
    high: parseFloat(f[33]),
    low: parseFloat(f[34]),
    volume: parseInt(f[36] || '0', 10),
    amount: parseFloat(f[37] || '0')
  };
}

async function fetchQuotes() {
  try {
    const codes = [A_CODE];
    INDEXES.forEach(function (p) { codes.push(p[0]); });
    WATCH.forEach(function (g) {
      g.codes.forEach(function (p) { codes.push(p[0]); });
    });
    const res = await fetch('https://qt.gtimg.cn/q=' + codes.join(','), { cache: 'no-store' });
    const text = new TextDecoder('gbk').decode(await res.arrayBuffer());
    const data = {};
    text.split(';').forEach(function (line) {
      const q = parseBlock(line.trim());
      if (q) data[q.varName] = q;
    });
    renderA(data['v_' + A_CODE]);
    renderIndexes(data);
    renderWatch(data);
  } catch (e) {
    // network hiccup: keep last values, retry next tick
  }
}

function renderA(q) {
  if (!q) return;
  const up = q.change >= 0;
  const priceEl = document.getElementById('livePrice');
  const changeEl = document.getElementById('liveChange');
  const timeEl = document.getElementById('liveTime');
  const metaEl = document.getElementById('liveMeta');
  if (priceEl && isFinite(q.price)) {
    priceEl.textContent = '¥' + q.price.toFixed(2);
    priceEl.className = 'value ' + (up ? 'red' : 'green');
  }
  if (changeEl && isFinite(q.change)) {
    const sign = q.change >= 0 ? '+' : '';
    changeEl.textContent = sign + q.change.toFixed(2) + '  ' + sign + q.pct.toFixed(2) + '%';
    changeEl.className = 'value ' + (up ? 'red' : 'green');
  }
  if (timeEl) timeEl.textContent = q.ts.slice(-8);
  if (metaEl) {
    metaEl.textContent = '高 ' + q.high.toFixed(2) + ' · 低 ' + q.low.toFixed(2) +
      ' · 量 ' + (q.volume / 10000).toFixed(2) + '万手' +
      ' · 额 ' + (q.amount / 10000).toFixed(2) + '亿（' + (up ? '红涨' : '绿跌') + '）';
  }
}

function renderIndexes(data) {
  const grid = document.getElementById('indexGrid');
  const timeEl = document.getElementById('indexTime');
  if (!grid) return;
  let html = '';
  let lastTs = '';
  INDEXES.forEach(function (pair) {
    const q = data['v_' + pair[0]];
    const name = (q && q.name) || pair[1];
    if (q && q.ts) lastTs = q.ts;
    if (!q || !isFinite(q.price)) {
      html += '<div class="stat"><div class="label">' + name + '</div><div class="value" style="color:#555">--</div><div class="label">--</div></div>';
      return;
    }
    const up = q.change >= 0;
    const cls = up ? 'red' : 'green';
    const sign = q.change >= 0 ? '+' : '';
    html += '<div class="stat">' +
      '<div class="label">' + name + '</div>' +
      '<div class="value ' + cls + '">' + q.price.toFixed(2) + '</div>' +
      '<div class="label ' + cls + '">' + sign + q.pct.toFixed(2) + '%</div>' +
      '</div>';
  });
  grid.innerHTML = html;
  if (timeEl && lastTs) timeEl.textContent = '更新 ' + lastTs.slice(0, 16);
}

function renderWatch(data) {
  const body = document.getElementById('mag7Body');
  const timeEl = document.getElementById('mag7Time');
  if (!body) return;
  let html = '';
  let lastTs = '';
  WATCH.forEach(function (g) {
    html += '<tr><th colspan="4">' + g.title + '</th></tr>';
    g.codes.forEach(function (pair) {
      const q = data['v_' + pair[0]];
      const name = (q && q.name) || pair[1];
      if (q && q.ts) lastTs = q.ts;
      if (!q || !isFinite(q.price)) {
        html += '<tr><td>' + name + '</td><td colspan="3" style="color:#555">—</td></tr>';
        return;
      }
      const up = q.change >= 0;
      const cls = up ? 'red' : 'green';
      const sign = q.change >= 0 ? '+' : '';
      html += '<tr>' +
        '<td>' + name + '</td>' +
        '<td class="' + cls + '">' + q.price.toFixed(2) + '</td>' +
        '<td class="' + cls + '">' + sign + q.change.toFixed(2) + '</td>' +
        '<td class="' + cls + '">' + sign + q.pct.toFixed(2) + '%</td>' +
        '</tr>';
    });
  });
  body.innerHTML = html;
  if (timeEl && lastTs) timeEl.textContent = '更新 ' + lastTs.slice(0, 16);
}

function schedule() {
  clearTimeout(quoteTimer);
  quoteTimer = setTimeout(function () {
    fetchQuotes();
    schedule();
  }, 60000);
}

fetchQuotes();
schedule();
