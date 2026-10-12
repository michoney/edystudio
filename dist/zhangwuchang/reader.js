/* zhangwuchang 文章页 · 文本朗读
 * 引擎策略(魏总拍板):
 *   手机(iOS/安卓)  -> speechSynthesis(苹果自家系统朗读/安卓系统)
 *   电脑(Mac)        -> 优先本地 MOSS-TTS-Nano(127.0.0.1:8788),服务不在线则回退系统语音
 * 交互: 点任意段落 = 从该段开始朗读; 底部控制条 播放/暂停/停止/切引擎; 当前段高亮+滚动跟随
 */
(function () {
  if (window.__zwReader) return; window.__zwReader = true;

  var body = document.querySelector('.article-body');
  if (!body) return;
  var paras = Array.prototype.slice.call(body.querySelectorAll('p'));
  if (!paras.length) return;

  var MOBILE = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  var MOSS = 'http://127.0.0.1:8788';
  var zhVoice = null;

  /* ---------- 文本清洗:去掉网址与噪声符号,免得被念出来 ---------- */
  function cleanText(t) {
    return t
      .replace(/https?:\/\/\S+/g, '')
      .replace(/-->\s*/g, '')
      .replace(/\s+/g, ' ')
      .replace(/^\s+|\s+$/g, '');
  }
  var texts = paras.map(function (p) { return cleanText(p.textContent); });

  /* ---------- 样式 ---------- */
  var style = document.createElement('style');
  style.textContent =
    '.zw-cur{background:#ffe58a!important;box-shadow:0 0 0 3px #ffe58a;border-radius:6px;transition:background .2s}' +
    '.zw-bar{position:fixed;left:0;right:0;bottom:0;z-index:9999;display:flex;align-items:center;gap:10px;' +
    'padding:10px 14px calc(10px + env(safe-area-inset-bottom,0));background:rgba(13,17,23,.92);' +
    'backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-top:1px solid rgba(255,255,255,.12);' +
    'font-family:-apple-system,"PingFang SC",sans-serif;color:#fff;font-size:15px;box-shadow:0 -6px 24px rgba(0,0,0,.25)}' +
    '.zw-bar .zw-btn{min-width:46px;height:44px;padding:0 12px;border:1px solid rgba(255,255,255,.28);border-radius:10px;' +
    'background:rgba(255,255,255,.10);color:#fff;font-size:17px;cursor:pointer;display:flex;align-items:center;justify-content:center}' +
    '.zw-bar .zw-btn:active{background:rgba(255,255,255,.25)}' +
    '.zw-bar .zw-info{flex:1;min-width:0;font-size:14px;line-height:1.3}' +
    '.zw-bar .zw-info b{font-size:15px}' +
    '.zw-bar .zw-st{display:block;color:rgba(255,255,255,.65);font-size:12px;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.zw-bar .zw-eng{border:1px solid rgba(103,217,241,.5);background:rgba(103,217,241,.12);color:#67d9f1;' +
    'font-size:13px;padding:0 11px;height:40px;border-radius:999px;cursor:pointer;white-space:nowrap}' +
    '.zw-bar .zw-eng.off{border-color:rgba(255,255,255,.3);color:rgba(255,255,255,.7);background:rgba(255,255,255,.06)}' +
    '@media(max-width:520px){.zw-bar .zw-st{font-size:11px}.zw-bar .zw-btn{min-width:42px;height:42px}.zw-bar .zw-eng{font-size:12px;padding:0 9px}}';
  document.head.appendChild(style);

  /* ---------- 底部控制条 ---------- */
  var bar = document.createElement('div');
  bar.className = 'zw-bar';
  bar.innerHTML =
    '<button class="zw-btn" id="zwPlay" title="播放/暂停">▶</button>' +
    '<button class="zw-btn" id="zwStop" title="停止">⏹</button>' +
    '<div class="zw-info"><b id="zwTit">文本朗读</b><span class="zw-st" id="zwSt">点任意段落,从那段开始朗读</span></div>' +
    '<button class="zw-eng" id="zwEng">…</button>';
  document.body.appendChild(bar);
  var $ = function (id) { return document.getElementById(id); };
  var playBtn = $('zwPlay'), stopBtn = $('zwStop'), tit = $('zwTit'), st = $('zwSt'), engBtn = $('zwEng');
  // 文章底部留白,别被控制条挡最后一节
  body.style.paddingBottom = '90px';

  /* ---------- 引擎探测/选择 ---------- */
  var engine = 'sys';       // sys | moss
  var mossOK = false;
  var ENG_LABEL = { sys: MOBILE ? '系统语音' : '系统语音', moss: 'MOSS AI' };

  function setEng(e) {
    engine = e;
    stop();
    engBtn.textContent = ENG_LABEL[e] + (e === 'moss' ? ' 🔊' : '');
    engBtn.classList.toggle('off', e !== 'moss');
    setHint();
  }
  if (MOBILE) {
    engBtn.style.display = 'none';       // 手机固定用系统(苹果自家)
  } else {
    // 桌面:探测本地 MOSS 服务(1.8s 超时)
    fetch(MOSS + '/health', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        mossOK = !!(d && d.ok);
        engBtn.style.display = '';
        if (mossOK) { setEng('moss'); engBtn.textContent = 'MOSS AI 🔊'; }
        else { setEng('sys'); engBtn.textContent = '系统语音(本地AI未启动)'; }
      })
      .catch(function () {
        mossOK = false;
        engBtn.style.display = '';
        setEng('sys');
        engBtn.textContent = '系统语音';
      });
    engBtn.addEventListener('click', function () {
      if (mossOK) setEng(engine === 'moss' ? 'sys' : 'moss');
    });
  }

  /* ---------- 系统语音(speechSynthesis):手机=苹果自家,桌面=系统默认 ---------- */
  function pickZhVoice() {
    if (!window.speechSynthesis) return null;
    var vs = speechSynthesis.getVoices();
    if (!vs.length) return null;
    var zh = vs.filter(function (v) { return /^zh[-_]/i.test(v.lang) || /Chinese|Ting|婷婷|Mei|Li|Huihui/i.test(v.name); });
    return zh[0] || null;
  }
  if (window.speechSynthesis) {
    pickZhVoice();
    speechSynthesis.onvoiceschanged = function () { pickZhVoice(); };
  }

  /* ---------- 状态 ---------- */
  var S = { idx: -1, playing: false, paused: false, mossAudio: null, ac: null, sysOnEnd: null, keep: null };

  function paraText(i) { return texts[i] || ''; }
  function speakable(i) { return paraText(i).length > 0; }

  function setCur(i) {
    paras.forEach(function (p, k) { p.classList.toggle('zw-cur', k === i && i >= 0); });
    if (i >= 0) {
      tit.textContent = '第 ' + (i + 1) + ' / ' + paras.length + ' 段';
      var r = paras[i].getBoundingClientRect();
      var vh = window.innerHeight;
      if (r.top < 70 || r.bottom > vh - 100) {
        paras[i].scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }
  }
  function setHint(t) { if (t !== undefined) st.textContent = t; }
  function setPlayingUI(p) {
    playBtn.textContent = p ? '⏸' : '▶';
    S.playing = p;
  }

  /* ================= MOSS 引擎 ================= */
  var nextCache = { idx: -1, url: null };   // 预取的下一段
  function clearNext() {
    if (nextCache.url) { try { URL.revokeObjectURL(nextCache.url); } catch (e) {} }
    nextCache = { idx: -1, url: null };
  }
  function fetchTts(i, ac) {
    return fetch(MOSS + '/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: paraText(i), voice: 'Junhao' }),
      signal: ac.signal,
    }).then(function (r) { return r.ok ? r.blob() : Promise.reject(new Error('tts ' + r.status)); });
  }
  function mossSpeak(i) {
    if (i >= paras.length) { finish(); return; }
    if (!speakable(i)) { setCur(-1); S.idx = i + 1; mossSpeak(S.idx); return; }
    setCur(i); S.idx = i;
    var ac = new AbortController(); S.ac = ac;
    // 命中预取缓存则直接用(URL 责任移交 Audio,由 onended revoke),否则现合成
    var useCache = nextCache.idx === i && nextCache.url;
    var cachedUrl = useCache ? nextCache.url : null;
    nextCache = { idx: -1, url: null };   // 只清引用,不 revoke(避免杀掉正在用的 URL)
    var urlPromise = useCache
      ? Promise.resolve(cachedUrl)
      : fetchTts(i, ac).then(function (b) { return URL.createObjectURL(b); });
    if (!useCache) setHint('AI 合成中…');
    urlPromise.then(function (url) {
      if (ac.signal.aborted) return;
      var au = new Audio();
      S.mossAudio = au;
      au.src = url;
      setHint('正在朗读 ' + (i + 1) + ' / ' + paras.length + ' 段…');
      au.onended = function () {
        URL.revokeObjectURL(url);
        if (ac.signal.aborted) return;
        S.mossAudio = null;
        setCur(-1);
        S.idx = i + 1;
        mossSpeak(S.idx);            // 播下一段;播放期间已预取好
      };
      au.play().catch(function () {
        setHint('播放失败,改用系统语音');
        mossOK = false; engine = 'sys'; engBtn.textContent = '系统语音';
        sysStart(S.idx >= 0 ? S.idx : i);
      });
      // 播放当前段的同时,后台合成下一段(消除段间等待)
      if (i + 1 < paras.length && speakable(i + 1)) {
        fetchTts(i + 1, ac).then(function (b) {
          if (ac.signal.aborted) return;
          nextCache = { idx: i + 1, url: URL.createObjectURL(b) };
        }).catch(function () {});
      }
    }).catch(function (e) {
      if (ac.signal.aborted) return;
      setHint('MOSS 合成失败,已切换系统语音');
      mossOK = false; engine = 'sys';
      engBtn.textContent = '系统语音';
      sysStart(S.idx >= 0 ? S.idx : i);
    });
  }
  function mossPause() { if (S.mossAudio) { S.mossAudio.pause(); S.paused = true; setHint('已暂停'); } }
  function mossResume() { if (S.mossAudio && S.paused) { S.mossAudio.play(); S.paused = false; setHint('继续朗读…'); } }
  function mossStop() {
    if (S.ac) { S.ac.abort(); S.ac = null; }
    if (S.mossAudio) { try { S.mossAudio.pause(); S.mossAudio.src = ''; } catch (e) {} S.mossAudio = null; }
    clearNext();
  }

  /* ================= 系统语音引擎 ================= */
  function sysStart(i) {
    if (!window.speechSynthesis) { setHint('此浏览器不支持语音朗读'); return; }
    speechSynthesis.cancel();
    S.paused = false; S.idx = i;
    sysSpeak(i);
  }
  function sysSpeak(i) {
    if (i >= paras.length) { finish(); return; }
    if (!speakable(i)) { sysSpeak(i + 1); return; }
    setCur(i); S.idx = i;
    var u = new SpeechSynthesisUtterance(paraText(i));
    if (zhVoice) u.voice = zhVoice;
    u.lang = 'zh-CN';
    u.rate = 1.0;
    u.onend = function () { if (!S.playing || S.paused) return; sysSpeak(i + 1); };
    u.onerror = function (e) { if (e.error === 'interrupted' || e.error === 'canceled') return; if (!S.playing || S.paused) return; sysSpeak(i + 1); };
    S.sysOnEnd = u;
    speechSynthesis.speak(u);
    setHint('正在朗读 ' + (i + 1) + ' / ' + paras.length + ' 段…');
    keepAlive();
  }
  function keepAlive() {   // iOS 长朗读偶发自动暂停,定时保活
    if (S.keep) clearInterval(S.keep);
    S.keep = setInterval(function () {
      if (S.playing && !S.paused && window.speechSynthesis) {
        if (speechSynthesis.paused) speechSynthesis.resume();
        if (speechSynthesis.speaking === false && S.idx >= 0 && S.idx < paras.length && S.playing) {
          sysSpeak(S.idx);   // 兜底:队列意外断掉就从当前段续
        }
      } else if (!S.playing) { clearInterval(S.keep); S.keep = null; }
    }, 12000);
  }

  /* ---------- 控制 ---------- */
  function startFrom(i) {
    if (i >= paras.length) return;
    stopAll(true);
    if (engine === 'moss' && mossOK) { setPlayingUI(true); S.paused = false; setCur(i); mossSpeak(i); }
    else { setPlayingUI(true); sysStart(i); }
  }
  function togglePlay() {
    if (!S.playing) {
      if (S.idx >= 0 && S.idx < paras.length) { S.paused = false; setPlayingUI(true); resume(); }
      else startFrom(firstSpeakable());
    } else {
      if (S.paused) { S.paused = false; setPlayingUI(true); resume(); }
      else { S.paused = true; setPlayingUI(false); pause(); setHint('已暂停'); }
    }
  }
  function pause() { if (engine === 'moss' && mossOK) mossPause(); else if (window.speechSynthesis) speechSynthesis.pause(); }
  function resume() { if (engine === 'moss' && mossOK) mossResume(); else if (window.speechSynthesis) speechSynthesis.resume(); }
  function stopAll(hard) {
    setCur(-1); S.paused = false; setPlayingUI(false);
    mossStop();
    if (window.speechSynthesis) { try { speechSynthesis.cancel(); } catch (e) {} }
    if (S.keep) { clearInterval(S.keep); S.keep = null; }
    if (!hard) setHint('已停止');
  }
  function finish() { stopAll(false); tit.textContent = '文本朗读'; setHint('朗读完成 ✓'); }
  function firstSpeakable() {
    for (var i = 0; i < paras.length; i++) if (speakable(i)) return i;
    return 0;
  }

  /* ---------- 事件:点段落=从该段开始 ---------- */
  paras.forEach(function (p, i) {
    p.style.cursor = 'pointer';
    p.title = '▶ 从这段开始朗读';
    p.addEventListener('click', function (e) {
      if (e.target.closest('a,button')) return;
      if (S.playing && S.idx === i && !S.paused) { togglePlay(); return; }  // 再点当前段=暂停
      startFrom(i);
    });
  });
  playBtn.addEventListener('click', togglePlay);
  stopBtn.addEventListener('click', function () { stopAll(false); });

  /* ---------- 初始 ---------- */
  setCur(-1);
  var v = null;
  try { v = sessionStorage.getItem('zwnext'); } catch (e) {}
  if (v) { try { URL.revokeObjectURL(v.split('|')[1]); sessionStorage.removeItem('zwnext'); } catch (e) {} }
})();
