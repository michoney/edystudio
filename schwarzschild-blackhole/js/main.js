(function () {
  'use strict';

  var canvas = document.getElementById('view');
  var fallback = document.getElementById('fallback');
  var fpsEl = document.getElementById('fps');
  var panel = document.getElementById('panel');

  var gl = canvas.getContext('webgl2', {
    antialias: false, alpha: false, depth: false, stencil: false,
    powerPreference: 'high-performance'
  });

  if (!gl || !window.VERT_SRC || !window.FRAG_SRC) {
    fallback.classList.remove('hidden');
    return;
  }

  function compile(type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(sh));
      throw new Error('Shader compile failed');
    }
    return sh;
  }

  var prog = gl.createProgram();
  try {
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT_SRC));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG_SRC));
    gl.linkProgram(prog);
  } catch (e) {
    fallback.textContent = '着色器编译失败，请更换浏览器再试。';
    fallback.classList.remove('hidden');
    return;
  }
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(prog));
    fallback.classList.remove('hidden');
    return;
  }
  gl.useProgram(prog);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  var U = {};
  ['uRes', 'uTime', 'uCamPos', 'uCamRight', 'uCamUp', 'uCamFwd', 'uFovTan',
   'uMaxSteps', 'uExposure', 'uDiskGain', 'uDiskInner', 'uDiskOuter', 'uStarBright'
  ].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });

  var DEFAULTS = {
    yaw: 0.55, pitch: 0.16, dist: 16,
    exposure: 1.15, diskGain: 1.0, star: 1.0,
    inner: 3.0, outer: 11.0, steps: 220, auto: true
  };
  var state = Object.assign({}, DEFAULTS);

  var SCALES = [0.45, 0.6, 0.75, 1.0];
  var scaleIdx = 2;

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var s = dpr * SCALES[scaleIdx];
    var w = Math.max(2, Math.round(canvas.clientWidth * s));
    var h = Math.max(2, Math.round(canvas.clientHeight * s));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);

  // ---------- input ----------
  var pointers = new Map();
  var lastPinch = 0;

  canvas.addEventListener('pointerdown', function (e) {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    lastPinch = 0;
  });

  canvas.addEventListener('pointermove', function (e) {
    var pt = pointers.get(e.pointerId);
    if (!pt) return;
    if (pointers.size === 1) {
      state.yaw -= (e.clientX - pt.x) * 0.005;
      state.pitch += (e.clientY - pt.y) * 0.005;
      state.pitch = Math.max(-1.45, Math.min(1.45, state.pitch));
    }
    pt.x = e.clientX;
    pt.y = e.clientY;
    if (pointers.size === 2) {
      var arr = Array.from(pointers.values());
      var dx = arr[0].x - arr[1].x;
      var dy = arr[0].y - arr[1].y;
      var d = Math.hypot(dx, dy);
      if (lastPinch > 0 && d > 0) {
        state.dist *= lastPinch / d;
        state.dist = Math.max(4, Math.min(45, state.dist));
      }
      lastPinch = d;
    }
  });

  function endPointer(e) { pointers.delete(e.pointerId); lastPinch = 0; }
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);

  canvas.addEventListener('wheel', function (e) {
    e.preventDefault();
    state.dist *= Math.exp(e.deltaY * 0.0011);
    state.dist = Math.max(4, Math.min(45, state.dist));
  }, { passive: false });


  // ---------- Xbox 手柄（Gamepad API）----------
  function pollGamepad() {
    if (!navigator.getGamepads) return;
    var pads = navigator.getGamepads();
    for (var i = 0; i < pads.length; i++) {
      var p = pads[i];
      if (!p || !p.connected || !p.axes || p.axes.length < 4) continue;
      if (p.mapping !== 'standard') continue;
      var dz = 0.15;
      var ax = Math.abs(p.axes[0]) < dz ? 0 : p.axes[0];
      var ay = Math.abs(p.axes[1]) < dz ? 0 : p.axes[1];
      var ry = Math.abs(p.axes[3]) < dz ? 0 : p.axes[3];
      state.yaw -= ax * 0.0045;
      state.pitch += ay * 0.0045;
      state.pitch = Math.max(-1.45, Math.min(1.45, state.pitch));
      if (ry !== 0) {
        state.dist *= Math.exp(ry * 0.02);
        state.dist = Math.max(4, Math.min(45, state.dist));
      }
      return;
    }
  }

  canvas.addEventListener('dblclick', function () {
    var doc = document;
    var el = doc.documentElement;
    if (doc.fullscreenElement || doc.webkitFullscreenElement) {
      if (doc.exitFullscreen) doc.exitFullscreen();
      else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
    } else if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  });

  // ---------- ui ----------
  function bindRange(id, apply) {
    var el = document.getElementById(id);
    el.addEventListener('input', function () { apply(parseFloat(el.value)); });
    return el;
  }
  var elEx = bindRange('ex', function (v) { state.exposure = v; });
  var elDg = bindRange('dg', function (v) { state.diskGain = v; });
  var elSt = bindRange('star', function (v) { state.star = v; });
  var elIn = bindRange('incl', function (v) { state.pitch = v * Math.PI / 180; });
  var elDi = bindRange('distR', function (v) { state.dist = v; });

  var elQ = document.getElementById('quality');
  elQ.addEventListener('change', function () {
    state.steps = parseInt(elQ.value, 10);
    scaleIdx = 2;
    resize();
  });

  var elAuto = document.getElementById('autoChk');
  elAuto.addEventListener('change', function () { state.auto = elAuto.checked; });

  document.getElementById('reset').addEventListener('click', function () {
    Object.assign(state, DEFAULTS);
    elEx.value = state.exposure;
    elDg.value = state.diskGain;
    elSt.value = state.star;
    elIn.value = Math.round(state.pitch * 180 / Math.PI);
    elDi.value = state.dist;
    elQ.value = String(state.steps);
    elAuto.checked = state.auto;
    scaleIdx = 2;
    resize();
  });

  document.getElementById('gear').addEventListener('click', function () {
    panel.classList.toggle('hidden');
  });
  document.getElementById('hide').addEventListener('click', function () {
    panel.classList.add('hidden');
  });

  function syncUi() {
    var ae = document.activeElement;
    if (ae !== elEx) elEx.value = state.exposure;
    if (ae !== elDg) elDg.value = state.diskGain;
    if (ae !== elSt) elSt.value = state.star;
    if (ae !== elIn) elIn.value = Math.round(state.pitch * 180 / Math.PI);
    if (ae !== elDi) elDi.value = Math.round(state.dist * 2) / 2;
  }

  // ---------- loop ----------
  var running = true;
  var ctxLoss = false;
  var prev = 0;
  var frames = 0;
  var ema = 16;
  var fCnt = 0;
  var fTime = 0;

  document.addEventListener('visibilitychange', function () {
    running = !document.hidden;
    if (running) { prev = 0; requestAnimationFrame(frame); }
  });

  canvas.addEventListener('webglcontextlost', function (e) {
    e.preventDefault();
    ctxLoss = true;
  });

  function render(timeMs, dtSec) {
    if (state.auto) state.yaw += dtSec * 0.06;

    var cy = Math.cos(state.yaw), sy = Math.sin(state.yaw);
    var cp = Math.cos(state.pitch), sp = Math.sin(state.pitch);
    var px = state.dist * cp * sy;
    var py = state.dist * sp;
    var pz = state.dist * cp * cy;
    var fl = Math.hypot(px, py, pz);
    var fx = -px / fl, fy = -py / fl, fz = -pz / fl;

    var rlen = Math.hypot(fx, fz);
    var rx = rlen > 1e-6 ? -fz / rlen : 1;
    var ry = 0;
    var rz = rlen > 1e-6 ? fx / rlen : 0;

    var ux = ry * fz - rz * fy;
    var uy = rz * fx - rx * fz;
    var uz = rx * fy - ry * fx;

    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform1f(U.uTime, timeMs / 1000);
    gl.uniform3f(U.uCamPos, px, py, pz);
    gl.uniform3f(U.uCamFwd, fx, fy, fz);
    gl.uniform3f(U.uCamRight, rx, ry, rz);
    gl.uniform3f(U.uCamUp, ux, uy, uz);
    gl.uniform1f(U.uFovTan, 0.6009);
    gl.uniform1i(U.uMaxSteps, state.steps);
    gl.uniform1f(U.uExposure, state.exposure);
    gl.uniform1f(U.uDiskGain, state.diskGain);
    gl.uniform1f(U.uDiskInner, state.inner);
    gl.uniform1f(U.uDiskOuter, state.outer);
    gl.uniform1f(U.uStarBright, state.star);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function frame(t) {
    if (!running || ctxLoss) return;
    pollGamepad();
    var ivRaw = prev ? t - prev : 16.7;
    var iv = Math.min(Math.max(ivRaw, 1), 250);
    prev = t;

    render(t, Math.min(iv / 1000, 0.05));

    frames++;
    ema = ema * 0.92 + iv * 0.08;
    if (frames > 20 && frames % 50 === 0) {
      if (ema > 36 && scaleIdx > 0) { scaleIdx--; resize(); }
      else if (ema < 17.5 && scaleIdx < SCALES.length - 1) { scaleIdx++; resize(); }
    }

    fCnt++;
    fTime += ivRaw;
    if (fTime > 500) {
      fpsEl.textContent = Math.round(1000 * fCnt / Math.max(fTime, 1)) + ' fps';
      fTime = 0;
      fCnt = 0;
    }

    syncUi();
    requestAnimationFrame(frame);
  }

  resize();
  requestAnimationFrame(frame);
})();
