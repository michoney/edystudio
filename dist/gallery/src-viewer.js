/* Edy Studio — 源码查看器
   用法：效果页 <script src="../src-viewer.js"></script>
   自动扫描页面引用的本地 .js 文件（排除 CDN），按钮点击弹窗查看
*/
(function () {
  if (window.__srcViewerLoaded) return;
  window.__srcViewerLoaded = true;

  var LOCAL_CDN = ['cdnjs.cloudflare.com', 'cdn.jsdelivr.net', 'unpkg.com', 'p5.js'];

  // ── 按钮 ──────────────────────────────
  var btn = document.createElement('button');
  btn.id = 'srcViewerBtn';
  btn.textContent = '⌘ 源码';
  btn.setAttribute('aria-label', '查看源码');
  document.body.appendChild(btn);

  var css = document.createElement('style');
  css.textContent = [
    '#srcViewerBtn{position:fixed;top:12px;right:12px;z-index:99999;',
    'background:rgba(10,12,18,0.55);color:#e6dde8;border:1px solid rgba(234,221,229,0.18);',
    'backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);',
    'padding:8px 16px;border-radius:10px;font-size:14px;cursor:pointer;',
    'font-family:ui-monospace,Menlo,monospace;letter-spacing:0.5px;',
    'box-shadow:0 4px 16px rgba(0,0,0,0.35);transition:all .15s ease;}',
    '#srcViewerBtn:hover{background:rgba(40,45,60,0.75);border-color:rgba(234,221,229,0.4);',
    'transform:scale(1.05);}',
    '#srcViewerOverlay{position:fixed;inset:0;z-index:100000;display:none;',
    'background:rgba(4,5,9,0.82);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);}',
    '#srcViewerOverlay.open{display:flex;flex-direction:column;}',
    '#srcViewerHeader{display:flex;align-items:center;gap:10px;padding:12px 18px;',
    'border-bottom:1px solid rgba(234,221,229,0.12);}',
    '#srcViewerTabs{display:flex;gap:8px;flex-wrap:wrap;flex:1;}',
    '#srcViewerTabs button{background:rgba(255,255,255,0.06);color:#b8aebe;border:1px solid rgba(234,221,229,0.12);',
    'padding:6px 12px;border-radius:8px;font-size:13px;cursor:pointer;font-family:ui-monospace,Menlo,monospace;}',
    '#srcViewerTabs button.active{background:rgba(234,221,229,0.15);color:#fff;border-color:rgba(234,221,229,0.35);}',
    '#srcViewerClose{background:rgba(255,80,80,0.15);color:#ff9d9d;border:1px solid rgba(255,120,120,0.3);',
    'padding:6px 14px;border-radius:8px;font-size:14px;cursor:pointer;}',
    '#srcViewerBody{flex:1;overflow:auto;padding:16px 18px;}',
    '#srcViewerBody pre{margin:0;color:#d8d2e0;font-size:13px;line-height:1.55;',
    'font-family:ui-monospace,Menlo,Consolas,monospace;white-space:pre-wrap;word-break:break-all;}',
    '#srcViewerLoading{color:#8a8294;font-size:14px;padding:20px;font-family:ui-monospace,Menlo,monospace;}',
    '@media(max-width:700px){#srcViewerBtn{font-size:12px;padding:6px 12px;}}'
  ].join('');
  document.head.appendChild(css);

  // ── 收集本地 js 文件 ──────────────────
  function collectLocalJs() {
    var files = [];
    var seen = {};
    function addFile(url) {
      if (!url) return;
      if (/src-viewer\.js$/.test(url)) return; // 排除自身
      if (LOCAL_CDN.some(function (d) { return url.indexOf(d) !== -1; })) return;
      if (/^https?:\/\//.test(url) && !url.startsWith(location.origin)) return;
      var name = url.split('/').pop();
      if (seen[name]) return;
      seen[name] = 1;
      files.push({ name: name, url: url });
    }
    var scripts = document.querySelectorAll('script[src]');
    scripts.forEach(function (s) { addFile(s.getAttribute('src') || ''); });
    // 扫描内联 module 脚本里的 import "./xxx.js" 本地引用
    var inline = document.querySelectorAll('script:not([src])');
    var hasLocalImport = false;
    inline.forEach(function (s) {
      var m = (s.textContent || '').match(/import[^"']*["']([^"']+\.js)["']/g);
      if (!m) return;
      hasLocalImport = true;
      m.forEach(function (im) {
        var mm = im.match(/["']([^"']+\.js)["']/);
        if (mm && mm[1] && mm[1].indexOf('http') !== 0 && mm[1].indexOf('//') !== 0) {
          addFile(mm[1].replace(/^\.\//, ''));
        }
      });
    });
    // 有本地 import 的内联脚本项目：index.html 里也有主代码，一并列出
    if (hasLocalImport && !seen['index.html']) {
      files.push({ name: 'index.html', url: './index.html' });
    }
    return files;
  }

  // ── 弹窗 ──────────────────────────────
  var overlay = document.createElement('div');
  overlay.id = 'srcViewerOverlay';
  overlay.innerHTML =
    '<div id="srcViewerHeader">' +
    '<div id="srcViewerTabs"></div>' +
    '<button id="srcViewerClose">✕ 关闭</button>' +
    '</div>' +
    '<div id="srcViewerBody"><div id="srcViewerLoading">加载中…</div></div>';
  document.body.appendChild(overlay);

  var tabsEl = overlay.querySelector('#srcViewerTabs');
  var bodyEl = overlay.querySelector('#srcViewerBody');
  var closeBtn = overlay.querySelector('#srcViewerClose');

  var files = [];
  var activeName = null;

  function showFile(name) {
    activeName = name;
    Array.prototype.forEach.call(tabsEl.children, function (t) {
      t.classList.toggle('active', t.textContent === name);
    });
    bodyEl.innerHTML = '<div id="srcViewerLoading">加载 ' + name + ' …</div>';
    var file = files.find(function (f) { return f.name === name; });
    if (!file) return;
    fetch(file.url, { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      })
      .then(function (code) {
        var pre = document.createElement('pre');
        pre.textContent = '// ' + file.url + '\n\n' + code;
        bodyEl.innerHTML = '';
        bodyEl.appendChild(pre);
        bodyEl.scrollTop = 0;
      })
      .catch(function (e) {
        bodyEl.innerHTML = '<div id="srcViewerLoading">加载失败: ' + e.message + '</div>';
      });
  }

  function open() {
    files = collectLocalJs();
    if (!files.length) {
      // 内联脚本项目（如 penderecki-garden）：展示 index.html 本身
      files.push({ name: 'index.html', url: './index.html' });
    }
    tabsEl.innerHTML = '';
    files.forEach(function (f) {
      var t = document.createElement('button');
      t.textContent = f.name;
      t.addEventListener('click', function () { showFile(f.name); });
      tabsEl.appendChild(t);
    });
    overlay.classList.add('open');
    showFile(files[0].name);
  }

  function close() {
    overlay.classList.remove('open');
    bodyEl.innerHTML = '';
  }

  btn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) close();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overlay.classList.contains('open')) close();
  });
})();
