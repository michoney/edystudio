/* =========================================================================
   ui.js — 底部控制条 + 状态
   ========================================================================= */
(function (global) {
  'use strict';

  const UI = { calm:false, strength:1, exposure:1, spin: false, spinDir: 1, ui: {} };

  UI.init = function (opts) {
    UI.opts = opts || {};
    const $ = (id) => document.getElementById(id);

    // 打一下水面
    $('bDrop').onclick = () => {
      UI.calm=false;
      const a = Math.random() * 6.28, r = Math.random() * 38;
      if (global.__mini) __mini.splash(Math.cos(a) * r, Math.sin(a) * r, 0.40, 0.032);
    };
    // 一阵雨
    $('bRain').onclick = () => {
      UI.calm=false;
      if (!global.__mini) return;
      for (let i = 0; i < 90; i++) {
        const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * 46;
        setTimeout(() => __mini.splash(Math.cos(a) * r, Math.sin(a) * r,
          0.14 + Math.random() * 0.10, 0.030), i * 16);
      }
    };
    // 平静
    $('bCalm').onclick = () => { UI.calm=true; if (global.__mini) {__mini.wave.reset();const s=__mini.slosh;s.x=s.z=s.vx=s.vz=s.energy=0;} };
    // 自转
    $('bSpin').onclick = () => {
      UI.spin = !UI.spin;
      $('bSpin').classList.toggle('on', UI.spin);
      $('bSpin').setAttribute('aria-pressed', String(UI.spin));
      $('bSpin').style.background = UI.spin ? 'rgba(32,36,42,.09)' : '';
    };
    // 全屏
    $('bFull').onclick = () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen();
    };

    $('bReset').onclick=()=>{ UI.spin=false;UI.calm=false;UI.strength=1;UI.exposure=1;
      $('bSpin').setAttribute('aria-pressed','false');$('bSpin').style.background='';
      $('waveStrength').value='1';$('lightLevel').value='1';
      __mini.camTo(.62,.64,300);__mini.wave.reset();
    };
    $('bTune').onclick=()=>{const panel=$('tuning'); panel.hidden=!panel.hidden;$('bTune').setAttribute('aria-expanded',String(!panel.hidden));};
    $('waveStrength').oninput=e=>{UI.strength=Number(e.target.value);UI.calm=false;};
    $('lightLevel').oninput=e=>{UI.exposure=Number(e.target.value);};
    $('aboutLink').onclick=e=>{e.preventDefault();$('aboutWorld').showModal();};
    $('closeAbout').onclick=()=>$('aboutWorld').close();
    document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('tuning').hidden=true;$('bTune').setAttribute('aria-expanded','false');}});
    if (opts.gpu) {
      const g = (opts.gpu || '').replace(/^ANGLE \(|\)$/g, '');
      $('stat').textContent = '实时水世界';
      $('stat').title=g;
    }

    setInterval(() => {
      if (opts.fps) $('fps').textContent = Math.round(opts.fps()) + ' fps';
    }, 500);
  };

  UI.setCoords = function (txt) {
    const el = document.getElementById('coords');
    if (el) el.textContent = txt;
  };

  global.UI = UI;
})(window);
