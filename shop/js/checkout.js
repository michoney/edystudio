/* =============================================================
   独立站 · 结算页
   -------------------------------------------------------------
   纯前端下单：填收货信息 → 生成订单号 → 复制订单文本发给卖家。
   想让它真正「收到订单」，在 data/products.js 里填 shop.orderApi，
   本文件会把你填的收货信息 POST 过去（格式见 README）。
   ============================================================= */

(function () {
  'use strict';

  const S = window.SHOP;
  const esc = S.esc;
  const root = document.getElementById('checkoutRoot');
  const LAST_KEY = 'edy.shop.lastOrder.v1';

  document.addEventListener('DOMContentLoaded', function () {
    S.mountCart();
    render();
  });

  /* ── 购物车为空 ──────────────────────────────────────── */

  function renderEmpty() {
    root.innerHTML =
      '<div class="card-box" style="grid-column:1/-1;text-align:center;padding:60px 20px">' +
        '<h2>购物车是空的</h2>' +
        '<p style="color:#6f7883">先去挑一件吧</p>' +
        '<a class="btn btn-gold" href="index.html">回到商品列表</a>' +
      '</div>';
  }

  /* ── 结算表单 ────────────────────────────────────────── */

  function linesHTML() {
    return S.cartLines().map(function (l) {
      return '<div class="order-line">' +
        '<div>' + esc(l.product.name) +
          (l.variantText ? '<div class="qty-t">' + esc(l.variantText) + '</div>' : '') +
        '</div>' +
        '<div style="text-align:right;white-space:nowrap">' + S.money(l.price) + ' × ' + l.qty +
          '<div class="qty-t" style="color:#d9b46a">' + S.money(l.sum) + '</div></div>' +
      '</div>';
    }).join('');
  }

  function render() {
    const lines = S.cartLines();
    if (!lines.length) { renderEmpty(); return; }

    const c = S.data.shop.contact;

    root.innerHTML =
      '<section class="card-box">' +
        '<h2>收货信息</h2>' +
        '<div class="field">' +
          '<label for="fName">收货人</label>' +
          '<input id="fName" placeholder="怎么称呼" autocomplete="name">' +
        '</div>' +
        '<div class="field">' +
          '<label for="fPhone">手机号</label>' +
          '<input id="fPhone" placeholder="11 位手机号" inputmode="numeric" autocomplete="tel">' +
        '</div>' +
        '<div class="field">' +
          '<label for="fAddr">收货地址</label>' +
          '<textarea id="fAddr" placeholder="省 / 市 / 区 + 详细地址"></textarea>' +
        '</div>' +
        '<div class="field">' +
          '<label for="fNote">备注（选填）</label>' +
          '<input id="fNote" placeholder="例如：发票、发货时间要求">' +
        '</div>' +
        '<button class="btn btn-gold btn-block" id="btnSubmit" style="margin-top:8px">生成订单</button>' +
        '<p style="font-size:12px;color:#6f7883;margin:14px 0 0;line-height:1.7">' +
          '点「生成订单」不会扣款，也不会自动付款。订单号发到微信 ' + esc(c.wechat) +
          '，确认无误后转账即可。</p>' +
      '</section>' +

      '<aside class="card-box">' +
        '<h2>订单明细</h2>' +
        linesHTML() +
        '<div class="order-total"><span>合计</span><b>' + S.money(S.cartTotal()) + '</b></div>' +
        '<a class="btn btn-ghost btn-block" href="index.html" style="margin-top:18px">再逛逛</a>' +
      '</aside>';

    document.getElementById('btnSubmit').addEventListener('click', submit);
  }

  /* ── 生成订单 ────────────────────────────────────────── */

  function submit() {
    const name = document.getElementById('fName').value.trim();
    const phone = document.getElementById('fPhone').value.trim();
    const address = document.getElementById('fAddr').value.trim();

    if (!name) return S.toast('请填收货人');
    if (!/^1\d{10}$/.test(phone)) return S.toast('手机号填一下，11 位数字');
    if (address.length < 6) return S.toast('地址再详细一点，方便发货');

    const order = S.buildOrder({
      name: name, phone: phone, address: address,
      note: document.getElementById('fNote').value.trim()
    });

    /* 本地留档，方便回头查 */
    try {
      const list = JSON.parse(localStorage.getItem('edy.shop.orders.v1') || '[]');
      list.unshift(order);
      localStorage.setItem('edy.shop.orders.v1', JSON.stringify(list.slice(0, 30)));
      localStorage.setItem(LAST_KEY, JSON.stringify(order));
    } catch (e) { /* 隐私模式忽略 */ }

    /* 填了 orderApi 就真的发出去 */
    const api = S.data.shop.orderApi;
    if (api) {
      fetch(api, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order)
      }).catch(function (e) { console.warn('[shop] 订单接口没调通', e); });
    }

    S.clearCart();
    renderDone(order);
  }

  /* ── 订单生成成功 ────────────────────────────────────── */

  function renderDone(order) {
    const text = S.orderText(order);
    const c = S.data.shop.contact;

    root.innerHTML =
      '<section class="card-box done-card" style="grid-column:1/-1">' +
        '<div class="done-mark">✓</div>' +
        '<h2 style="font-size:22px">订单已生成</h2>' +
        '<p style="color:#a7b0bb;margin:6px 0 0">把这串单号发给卖家，就能开始走流程了</p>' +
        '<div class="order-no">' + esc(order.no) + '</div>' +
        '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">' +
          '<button class="btn btn-gold" id="btnCopy">复制订单，粘贴给卖家</button>' +
          '<button class="btn btn-ghost" id="btnDown">下载订单文本</button>' +
        '</div>' +
      '</section>' +

      '<section class="card-box" style="grid-column:1/-1">' +
        '<h2>订单内容</h2>' +
        '<pre class="order-preview" id="orderText">' + esc(text) + '</pre>' +
      '</section>' +

      '<section class="card-box" style="grid-column:1/-1">' +
        '<h2>下一步</h2>' +
        '<div class="service-grid">' +
          '<div class="service"><h5>① 发单号</h5><p>把上面这段文字发给卖家微信 ' + esc(c.wechat) + '。</p></div>' +
          '<div class="service"><h5>② 确认货品</h5><p>卖家会发实拍图确认款式和成色。</p></div>' +
          '<div class="service"><h5>③ 转账</h5><p>确认无误再转账，' + esc(c.note) + '</p></div>' +
          '<div class="service"><h5>④ 发货</h5><p>卖家发货后把快递单号发回给你。</p></div>' +
        '</div>' +
        '<a class="btn btn-ghost btn-block" href="index.html" style="margin-top:20px">再看看别的</a>' +
      '</section>';

    document.getElementById('btnCopy').addEventListener('click', function () {
      S.copyText(text)
        .then(function () { S.toast('订单已复制，去微信粘贴给卖家'); })
        .catch(function () { S.toast('复制失败，长按上面的订单文字手动复制'); });
    });

    document.getElementById('btnDown').addEventListener('click', function () {
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = '订单-' + order.no + '.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    });
  }

})();