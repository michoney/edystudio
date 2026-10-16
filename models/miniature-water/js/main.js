/* =========================================================================
   main.js — 微缩水世界

   管线：
     1) 波场模拟（波动方程 ping-pong，每帧被指针驱动）
     2) 阴影贴图
     3) 水下场景 → FBO（水面折射的来源）
     4) 主通道：影棚背景 → 接地影 → 水下实体 → 切面 → 水面 → 水上实体
     5) ACES + 暗角 + 颗粒
   ========================================================================= */
(function () {
  'use strict';

  const canvas = document.getElementById('c');
  const gl = canvas.getContext('webgl2', {
    antialias: true, alpha: false, depth: true,
    powerPreference: 'high-performance', preserveDrawingBuffer: true,
  });
  if (!gl) { document.getElementById('fatal').style.display = 'flex'; return; }
  const extCBF = gl.getExtension('EXT_color_buffer_float');
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  const GPU = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'unknown';
  const S = SHD;

  /* ================================================================ 场景 */
  const scene = {
    meshes: {}, data: {}, placements: [], instances: {}, dynamic: [],
    mesh(n, d) { if (this.meshes[n]) return; this.data[n] = d; this.meshes[n] = GLU.uploadMesh(gl, d); },
    meshInstanced(n, d, max) { this.mesh(n, d); GLU.makeInstanced(gl, this.meshes[n], max); },
    place(n, pos, rotY, scale) { this.placements.push({ name: n, pos, rotY: rotY || 0, scale: scale || 1, tint: [1, 1, 1] }); },
    draw(n, mat, tint) { (this.immediate || (this.immediate = [])).push({ name: n, mat, tint: tint || [1, 1, 1] }); },
    clear() { this.immediate = []; },
  };

  /* ============================================================ 着色器程序 */
  const progBack = GLU.program(gl, S.QUAD_VS, S.BACKDROP_FS, {}, 'back');
  const progSolid = GLU.program(gl, S.solidVS(false), S.SOLID_FS, {}, 'solid');
  const progSolidI = GLU.program(gl, S.solidVS(true), S.SOLID_FS, {}, 'solidI');
  const progShadow = GLU.program(gl, S.SHADOW_VS, S.SHADOW_FS, {}, 'shadow');
  const progShadowI = GLU.program(gl, S.SHADOW_VS, S.SHADOW_FS, { INSTANCED: 1 }, 'shadowI');
  const progWater = GLU.program(gl, S.WATER_VS, S.WATER_FS, {}, 'water');
  const progWall = GLU.program(gl, S.WALL_VS, S.WALL_FS, {}, 'wall');
  const progContact = GLU.program(gl, S.QUAD_VS, S.SHADOWQUAD_FS, {}, 'contact');
  const progPost = GLU.program(gl, S.QUAD_VS, S.POST_FS, {}, 'post');

  /* ============================================================== 光照 */
  const SUN_DIR = V3.norm([-0.46, 0.72, 0.52]);
  const SUN_COL = [1.02, 0.98, 0.90];
  const SKY_AMB = [0.32, 0.35, 0.37];
  const GND_AMB = [0.24, 0.22, 0.19];
  const BACK_TOP = [0.86, 0.79, 0.67];
  const BACK_BOT = [0.86, 0.79, 0.67];
  const SHALLOW = [0.055, 0.43, 0.39];
  const DEEP = [0.18, 0.075, 0.035];      // 每米吸收：红光吃得最快
  const SKY_TOP = [0.82, 0.90, 0.97];
  const SKY_BOT = [0.20, 0.34, 0.43];

  /* ============================================================ 帧缓冲 */
  let fboMain = null, fboUnder = null, shadowFbo = null;
  let W = 1, H = 1, DPR = 1;

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.max(2, Math.floor(canvas.clientWidth * DPR));
    const h = Math.max(2, Math.floor(canvas.clientHeight * DPR));
    if (w === W && h === H) return;
    W = w; H = h;
    canvas.width = W; canvas.height = H;
    const del = (f) => {
      if (!f) return;
      if (f.color && f.color.tagName !== undefined) gl.deleteTexture(f.color);
      else if (f.color) gl.deleteTexture(f.color);
      if (f.depth) gl.deleteRenderbuffer(f.depth);
      gl.deleteFramebuffer(f.fbo);
    };
    del(fboMain); del(fboUnder);
    const hdr = extCBF ? { internal: gl.RGBA16F, format: gl.RGBA, type: gl.HALF_FLOAT }
      : { internal: gl.RGBA8, format: gl.RGBA, type: gl.UNSIGNED_BYTE };
    fboMain = GLU.fbo(gl, W, H, Object.assign({ depth: true }, hdr));
    fboUnder = GLU.fbo(gl, W, H, Object.assign({ depth: true }, hdr));
  }

  /* ================================== 地表高度贴图（海底 + 拱 + 矮崖）
     水面着色器靠它判水深、判岸线、决定哪里不该画水。 */
  function makeBedTexture(size) {
    const N = size || 256;
    const data = new Float32Array(N * N);
    const half = MINI.ISL.EXTENT / 2;
    for (let j = 0; j < N; j++) {
      const z = (j / (N - 1) - 0.5) * 2 * half;
      for (let i = 0; i < N; i++) {
        const x = (i / (N - 1) - 0.5) * 2 * half;
        const h = clamp(MINI.surfaceHeight(x, z), -20, 40);
        data[j * N + i] = h;
      }
    }
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, N, N, 0, gl.RED, gl.FLOAT, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }

  /* ========================================================== 水面网格 */
  let waterVAO = null, waterCount = 0;
  function buildWater(n) {
    const half = MINI.ISL.EXTENT / 2;
    const pos = [], idx = [];
    for (let j = 0; j <= n; j++) {
      const z = (j / n - 0.5) * 2 * half;
      for (let i = 0; i <= n; i++) pos.push((i / n - 0.5) * 2 * half, z);
    }
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const a = j * (n + 1) + i;
        idx.push(a, a + (n + 1), a + (n + 1) + 1);
        idx.push(a, a + (n + 1) + 1, a + 1);
      }
    }
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const vb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pos), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const ib = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(idx), gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    waterVAO = vao; waterCount = idx.length;
  }

  /* ============================================================== 相机 */
  const cam = {
    yaw: 0.62, pitch: 0.64, dist: 300, target: [0, 1, 0],
    pos: [0, 60, 100], roll:0, fov: 0.55,
  };
  const mtx = {
    vp: M4.create(), proj: M4.create(), view: M4.create(), invVP: M4.create(),
    lightVP: M4.create(), lproj: M4.create(), lview: M4.create(),
    model: M4.create(), nrm: new Float32Array(9), tmp: M4.create(),
  };

  function updateCamera() {
    const cp = Math.cos(cam.pitch);
    const fittedDist = cam.dist * Math.max(1, (W/H<.8?1.0:1.48) / (W / H));
    cam.pos = [
      cam.target[0] - Math.sin(cam.yaw) * cp * fittedDist,
      cam.target[1] + Math.sin(cam.pitch) * fittedDist,
      cam.target[2] - Math.cos(cam.yaw) * cp * fittedDist,
    ];
    M4.perspective(mtx.proj, cam.fov, W / H, 0.5, 2400);
    M4.lookAt(mtx.view, cam.pos, cam.target, [Math.sin(cam.roll), Math.cos(cam.roll), 0]);
    M4.mul(mtx.vp, mtx.proj, mtx.view);
    M4.invert(mtx.invVP, mtx.vp);
    // 阴影盒跟着整块立方体
    const eye = [cam.target[0] + SUN_DIR[0] * 110, SUN_DIR[1] * 110, cam.target[2] + SUN_DIR[2] * 110];
    M4.lookAt(mtx.lview, eye, [0, -6, 0], [0, 1, 0]);
    M4.ortho(mtx.lproj, -78, 78, -78, 78, 1, 260);
    M4.mul(mtx.lightVP, mtx.lproj, mtx.lview);
  }

  /* ============================================================ 交互 */
  const keys = { down: false, lastX: 0, lastY: 0, moved: 0 };
  let pointerNDC = [0, 0], hoverWorld = null;
  const slosh={x:0,z:0,vx:0,vz:0,energy:0};

  /** 屏幕射线打到水面 (y = 0) 上 */
  function pickWater(ndc) {
    const a = M4.transformPoint(mtx.invVP, [ndc[0], ndc[1], -1]);
    const b = M4.transformPoint(mtx.invVP, [ndc[0], ndc[1], 1]);
    const dir = V3.norm(V3.sub(b, a));
    if (Math.abs(dir[1]) < 1e-4) return null;
    const t = (0 - a[1]) / dir[1];
    if (t <= 0) return null;
    return [a[0] + dir[0] * t, a[2] + dir[2] * t];
  }

  canvas.addEventListener('pointerdown', (e) => {
    keys.down = true; keys.lastX = e.clientX; keys.lastY = e.clientY;
    keys.moved = 0;
    canvas.setPointerCapture(e.pointerId);
  });
  window.addEventListener('pointerup', () => { keys.down = false; });
  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
    const ny = -(((e.clientY - r.top) / r.height) * 2 - 1);
    if (keys.down) {
      const dx = e.clientX - keys.lastX, dy = e.clientY - keys.lastY;
      keys.moved += Math.abs(dx) + Math.abs(dy);
      cam.yaw -= dx * 0.006;
      // Camera rotation is coupled to an inertial water tank, with a damped
      // spring restoring the free surface when the pointer is released.
      if(wave && Math.hypot(dx,dy)>2){
        const a=cam.yaw+Math.PI*.5;
        wave.splash(Math.sin(a)*30,Math.cos(a)*30,clamp(dx*.012,-.3,.3),.10);
      }
      UI.calm=false;
      cam.pitch = clamp(cam.pitch + dy * 0.005, 0.06, 1.32);
    }
    keys.lastX = e.clientX; keys.lastY = e.clientY;
    pointerNDC = [nx, ny];
    // 没在拖视角的时候，鼠标就是在水面上划过 → 起波
    if (!keys.down) hoverWorld = pickWater([nx, ny]);
    else hoverWorld = null;
  });
  canvas.addEventListener('pointercancel', () => { keys.down=false;hoverWorld=null; });
  canvas.addEventListener('pointerleave', () => { hoverWorld = null; });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    cam.dist = clamp(cam.dist * (1 + Math.sign(e.deltaY) * 0.09), 110, 460);
  }, { passive: false });

  /* ============================================================ 初始化 */
  let quad, wave, bedTexRef, shipPose=M4.create();
  const stageErr = {};
  let t = 0, last = 0, frames = 0, fps = 60, fpsT = 0, fpsN = 0;
  let lastDt = 1 / 60;
  const ONLYWALL = /onlywall=1/.test(location.search);
  const NOWATER = /nowater=1/.test(location.search);
  let lastSplash = [0, 0], idleTimer = 0;

  function boot() {
    resize();
    quad = GLU.quad(gl);
    shadowFbo = GLU.shadowFbo(gl, 2048);
    buildWater(200);
    bedTexRef = makeBedTexture(320);
    wave = WAVE.create(gl, GLU, quad, bedTexRef);

    MINI.WORLD.init(scene);
    SHIP.init(scene);
    pebbleGroups = [[], [], []];
    for (const p of MINI.WORLD.pebbles) {
      const i = p.mesh === 'pebble0' ? 0 : (p.mesh === 'pebble1' ? 1 : 2);
      pebbleGroups[i].push(p);
    }
    mossGroups = [MINI.WORLD.moss.filter((x) => x.mesh === 'moss0'),
                  MINI.WORLD.moss.filter((x) => x.mesh === 'moss1')];
    // 卵石 + 苔藓走实例化
    scene.meshInstanced('pebble0', scene.data.pebble0, 320);
    scene.meshInstanced('pebble1', scene.data.pebble1, 320);
    scene.meshInstanced('pebble2', scene.data.pebble2, 320);
    scene.meshInstanced('moss0', scene.data.moss0, 1400);
    scene.meshInstanced('moss1', scene.data.moss1, 1400);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    document.getElementById('load').classList.add('gone');
    UI.init({ gpu: GPU, fps: () => fps });
    requestAnimationFrame(frame);
    window.__mini = {
      gl, scene, cam, wave, slosh, ship:SHIP, paused:false,
      fps: () => fps, frames: () => frames, glErr: () => gl.getError(),
      stageErr: () => Object.assign({}, stageErr),
      camPos: () => cam.pos.slice(),
      wallProbe: () => {
        const out = {};
        const T = (k, fn) => { while (gl.getError() !== 0) {} fn(); out[k] = gl.getError(); };
        GLU.bindTarget(gl, fboMain);
        T('clear', () => gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT));
        T('use', () => progWall.use());
        T('set', () => progWall.set({
          uVP: mtx.vp, uModel: M4.identity(M4.create()),
          uSlosh: [slosh.x,slosh.z], uExtent: WAVE.EXTENT, uWaveScale: UI.strength === undefined ? 1 : UI.strength, uSeaLevel: 0,
          uBottomY: -MINI.ISL.DEPTH, uShallow: SHALLOW, uDeep: DEEP,
          uSunColor: SUN_COL, uSkyAmb: SKY_AMB, uTime: 0,
        }));
        T('tex', () => progWall.tex('uWave', wave.normalTex, 0));
        MINI.WORLD.walls.forEach((w, i) => T('draw' + i, () => GLU.drawMesh(gl, scene.meshes[w])));
        out.hasTex = !!wave.normalTex;
        out.hasMesh = !!scene.meshes.wall0;
        return out;
      },
      vpDump: () => {
        gl.useProgram(progSolid.prog);
        const loc = gl.getUniformLocation(progSolid.prog, 'uVP');
        const gpu = loc ? Array.from(gl.getUniform(progSolid.prog, loc)) : null;
        let diff = 0;
        if (gpu) for (let i = 0; i < 16; i++) diff = Math.max(diff, Math.abs(gpu[i] - mtx.vp[i]));
        return { gpu: gpu ? gpu.map((v) => +v.toFixed(4)) : null, js: Array.from(mtx.vp).map((v) => +v.toFixed(4)), diff };
      },
      shaderSrc: () => {
        const sh = progSolid.prog;
        const n = gl.getProgramParameter(sh, gl.ATTACHED_SHADOW_TEXTS);
        const out = [];
        for (let i = 0; i < n; i++) {
          const s = gl.getAttachedShaders(sh)[i];
          out.push(gl.getShaderSource(s));
        }
        return out.join('\n===== SHADER =====\n');
      },
      project: (p) => {
        const q = M4.transformPoint(mtx.vp, p);
        return [+((q[0] * 0.5 + 0.5) * 100).toFixed(1), +((1 - (q[1] * 0.5 + 0.5)) * 100).toFixed(1)];
      },
      splash: (x, z, a) => wave.splash(x, z, a === undefined ? 0.25 : a),
      camTo: (y, p, d) => { cam.yaw = y; cam.pitch = p; cam.dist = d; cam.roll=0; slosh.x=slosh.z=slosh.vx=slosh.vz=slosh.energy=0; },
      ready: true,
    };
  }

  /* ============================================================ 绘制 */
  function drawSolid(prog, name, mat, tint) {
    const gm = scene.meshes[name];
    if (!gm) return;
    M4.normalMat(mtx.nrm, mat);
    prog.set({ uModel: mat, uNrmMat: mtx.nrm, uTint: tint });
    GLU.drawMesh(gl, gm);
  }

  function uploadInstances(list) {
    const arr = new Float32Array(list.length * 19);
    list.forEach((it, i) => {
      const m = M4.compose(M4.create(), [it.x, it.y, it.z], [0, it.rot, 0], (typeof it.s === "number" ? [it.s,it.s,it.s] : it.s));
      arr.set(m, i * 19);
      arr[i * 19 + 16] = 1; arr[i * 19 + 17] = 1; arr[i * 19 + 18] = 1;
    });
    return arr;
  }

  function fillInstances(gm, list) {
    gm.instData.set(uploadInstances(list).subarray(0, list.length * 19));
    GLU.uploadInstances(gl, gm, list.length);
  }

  let pebbleGroups = [[], [], []];
  let mossGroups = [[], []];

  const solidUniforms = {
    uSunDir: SUN_DIR, uSunColor: SUN_COL, uSkyAmb: SKY_AMB, uGroundAmb: GND_AMB,
    uFogDensity: 0.00015, uShadowTexel: 1 / 2048, uAlpha: 1, uSeaLevel: 0,
    uShallowTint: [0.36, 0.82, 0.80], uLightVP: mtx.lightVP,
  };

  function chk(tag) {
    const e = gl.getError();
    if (e && stageErr[tag] === undefined) stageErr[tag] = e;
  }

  function renderFrame(dt) {
    if(window.__mini?.paused)return;
    // ---- 1. 波浪 ----
    // Tank orientation changes effective gravity; the fluid solver determines
    // both the new surface and its inertia. No plane is added by the renderer.
    const gx=Math.tan(cam.roll)*Math.cos(cam.yaw)-Math.sin(cam.pitch-.64)*Math.sin(cam.yaw)*.12;
    const gz=Math.tan(cam.roll)*Math.sin(cam.yaw)+Math.sin(cam.pitch-.64)*Math.cos(cam.yaw)*.12;
    slosh.x=gx;slosh.z=gz;
    wave.setSlope(gx,gz);
    if (UI.spin && !keys.down) cam.yaw += dt * 0.12;
    if (hoverWorld && frames % 2 === 0) {
      const dx = hoverWorld[0] - lastSplash[0], dz = hoverWorld[1] - lastSplash[1];
      const speed = Math.hypot(dx, dz);
      if (speed > 0.25) {
        UI.calm=false;
        wave.splash(hoverWorld[0], hoverWorld[1], clamp((-0.12 - speed * 0.035)*(UI.strength||1), -.45, .45),
          clamp(0.030 + speed * 0.008, 0.026, 0.055));
        lastSplash = hoverWorld.slice();
      }
    }
    wave.step(dt);          // 波动方程必须每帧推，否则水面永远是平的

    shipPose=SHIP.update(dt,t,wave);
    updateCamera();
    chk('camera');

    // ---- 2. 阴影 ----
    gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFbo.fbo);
    gl.viewport(0, 0, shadowFbo.w, shadowFbo.h);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.BLEND);
    gl.disable(gl.CULL_FACE);
    progShadow.use().set({ uLightVP: mtx.lightVP });
    for (const p of scene.placements) {
      if (p.name === 'bottom' || p.name.indexOf('wall') === 0 || p.name === 'seabed') continue;
      progShadow.set({ uModel: M4.compose(mtx.model, p.pos, [0, p.rotY, 0], [p.scale, p.scale, p.scale]) });
      GLU.drawMesh(gl, scene.meshes[p.name]);
    }
    progShadow.set({uModel:shipPose});GLU.drawMesh(gl,scene.meshes.pirateShip);
    progShadowI.use().set({ uLightVP: mtx.lightVP });
    for (let i = 0; i < 3; i++) {
      if (!pebbleGroups[i].length) continue;
      fillInstances(scene.meshes['pebble' + i], pebbleGroups[i]);
      GLU.drawMesh(gl, scene.meshes['pebble' + i], pebbleGroups[i].length);
    }
    gl.enable(gl.CULL_FACE);
    chk('shadow');

    // ---- 3. 水下场景（给水面折射用）----
    gl.bindFramebuffer(gl.FRAMEBUFFER, fboUnder.fbo);
    gl.viewport(0, 0, W, H);
    gl.clearColor(0.09, 0.30, 0.31, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);
    progSolid.use();
    progSolid.set(Object.assign({}, solidUniforms, { uVP: mtx.vp, uCamPos: cam.pos, uTime: t }));
    progSolid.tex('uShadowMap', shadowFbo.tex, 0);
    for (const p of scene.placements) {
      if (p.name === 'bottom' || p.name.indexOf('wall') === 0) continue;
      drawSolid(progSolid, p.name, M4.compose(mtx.model, p.pos, [0, p.rotY, 0], [p.scale, p.scale, p.scale]), p.tint);
    }
    drawSolid(progSolid,'pirateShip',shipPose,[1,1,1]);
    progSolidI.use();
    progSolidI.set(Object.assign({}, solidUniforms, { uVP: mtx.vp, uCamPos: cam.pos, uTime: t }));
    progSolidI.tex('uShadowMap', shadowFbo.tex, 0);
    for (let i = 0; i < 3; i++) {
      const gm = scene.meshes['pebble' + i];
      if (!pebbleGroups[i].length) continue;
      fillInstances(gm, pebbleGroups[i]);
      GLU.drawMesh(gl, gm, pebbleGroups[i].length);
    }

    chk('underwater');

    // ---- 4. 主通道 ----
    GLU.bindTarget(gl, fboMain);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // 影棚背景（接地投影就在这里一起画掉，投影位置是底面四角投到屏幕算的）
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);
    const halfE = MINI.ISL.EXTENT / 2, yBase = -MINI.ISL.DEPTH;
    let u0 = 9, v0 = 9, u1 = -9, v1 = -9;
    for (const c of [[-halfE, yBase, -halfE], [halfE, yBase, -halfE], [halfE, yBase, halfE], [-halfE, yBase, halfE]]) {
      const p = M4.transformPoint(mtx.vp, c);
      const uu = p[0] * 0.5 + 0.5, vv = p[1] * 0.5 + 0.5;
      u0 = Math.min(u0, uu); u1 = Math.max(u1, uu);
      v0 = Math.min(v0, vv); v1 = Math.max(v1, vv);
    }
    progBack.use().set({
      uRes: [W, H], uTop: BACK_TOP, uBottom: BACK_BOT, uTime: t,
      uContact: [(u0 + u1) / 2, (v0 + v1) / 2, (u1 - u0) * 0.62, (v1 - v0) * 0.78],
      uContactA: 0.30,
    });
    quad.draw();

    // 水下实体（上面那套已经在 FBO 里画过了，主通道再画一次保证重叠正确）
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);
    progSolid.use();
    progSolid.set(Object.assign({}, solidUniforms, { uVP: mtx.vp, uCamPos: cam.pos, uTime: t }));
    progSolid.tex('uShadowMap', shadowFbo.tex, 0);
    for (const p of scene.placements) {
      if (p.name === 'bottom' || p.name.indexOf('wall') === 0) continue;
      drawSolid(progSolid, p.name, M4.compose(mtx.model, p.pos, [0, p.rotY, 0], [p.scale, p.scale, p.scale]), p.tint);
    }
    drawSolid(progSolid,'pirateShip',shipPose,[1,1,1]);
    progSolidI.use();
    progSolidI.set(Object.assign({}, solidUniforms, { uVP: mtx.vp, uCamPos: cam.pos, uTime: t }));
    progSolidI.tex('uShadowMap', shadowFbo.tex, 0);
    for (let i = 0; i < 3; i++) {
      const gm = scene.meshes['pebble' + i];
      if (!pebbleGroups[i].length) continue;
      fillInstances(gm, pebbleGroups[i]);
      GLU.drawMesh(gl, gm, pebbleGroups[i].length);
    }

    chk('main-solid');

    if (ONLYWALL) {
      // 只画墙：洋红、不透明、关掉深度 —— 用来判断墙体到底有没有被光栅化
      gl.disable(gl.DEPTH_TEST);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
      gl.enable(gl.CULL_FACE);
      gl.clearColor(0.92, 0.91, 0.89, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      progWall.use().set({
        uVP: mtx.vp, uModel: M4.identity(M4.create()),
        uSlosh: [slosh.x,slosh.z], uExtent: WAVE.EXTENT, uWaveScale: UI.strength === undefined ? 1 : UI.strength, uSeaLevel: 0,
        uBottomY: -MINI.ISL.DEPTH,
        uShallow: SHALLOW, uDeep: DEEP, uSunColor: SUN_COL, uSkyAmb: SKY_AMB, uTime: t,
      });
      progWall.tex('uWave', wave.normalTex, 0);
      for (const w of MINI.WORLD.walls) GLU.drawMesh(gl, scene.meshes[w]);
      // 照常走一遍后期，否则画布停在黑屏
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, W, H);
      progPost.use().set({
        uExposure: UI.exposure || 1.0, uVignette: 0.26, uGrain: 0.0, uTime: t,
        uGain: [1.02, 1.0, 0.975],
      });
      progPost.tex('uScene', fboMain.color, 0);
      quad.draw();
      gl.enable(gl.DEPTH_TEST);
      return;
    }

    // 水体切面：画在水面之后（它是立方体被切开的剖面，本就该压在最上层）
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    gl.disable(gl.CULL_FACE);          // 切面是单层片，正反面都要
    progWall.use().set({
      uVP: mtx.vp, uModel: M4.identity(M4.create()),
      uSlosh: [slosh.x,slosh.z], uExtent: WAVE.EXTENT, uWaveScale: UI.strength === undefined ? 1 : UI.strength, uSeaLevel: 0,
      uBottomY: -MINI.ISL.DEPTH,
      uShallow: SHALLOW, uDeep: DEEP, uSunColor: SUN_COL, uSkyAmb: SKY_AMB, uTime: t,
    });
    progWall.tex('uWave', wave.normalTex, 0);   // 纹理只能用 tex() 绑；塞进 set() 会报 1282 且采样到垃圾
    for (const w of MINI.WORLD.walls) GLU.drawMesh(gl, scene.meshes[w]);
    gl.enable(gl.CULL_FACE);

    chk('walls');

    // 水面
    progWater.use().set({
      uVP: mtx.vp, uCamPos: cam.pos, uSunDir: SUN_DIR, uSunColor: SUN_COL,
      uSkyTop: SKY_TOP, uSkyBot: SKY_BOT, uSkyAmb: SKY_AMB,
      uSlosh: [slosh.x,slosh.z], uExtent: WAVE.EXTENT, uWaveScale: UI.strength === undefined ? 1 : UI.strength, uSeaLevel: 0,
      uRes: [W, H], uShallow: SHALLOW, uDeep: DEEP, uCaustic: 1.0, uTime: t,
      uWaveDbg: /wave=1/.test(location.search) ? 1 : 0,
      uFlat: /flat=1/.test(location.search) ? 1 : 0,
    });
    progWater.tex('uWave', wave.normalTex, 0);
    progWater.tex('uUnder', fboUnder.color, 1);
    progWater.tex('uDepthTex', bedTexRef, 2);
    gl.disable(gl.CULL_FACE);
    gl.bindVertexArray(waterVAO);
    gl.drawElements(gl.TRIANGLES, waterCount, gl.UNSIGNED_INT, 0);
    gl.bindVertexArray(null);
    gl.enable(gl.CULL_FACE);
    gl.depthMask(true);
    gl.disable(gl.BLEND);

    chk('water');

    // 水上苔藓
    progSolidI.use();
    progSolidI.set(Object.assign({}, solidUniforms, { uVP: mtx.vp, uCamPos: cam.pos, uTime: t }));
    progSolidI.tex('uShadowMap', shadowFbo.tex, 0);
    for (let i = 0; i < 2; i++) {
      const gm = scene.meshes['moss' + i];
      if (!mossGroups[i].length) continue;
      fillInstances(gm, mossGroups[i]);
      GLU.drawMesh(gl, gm, mossGroups[i].length);
    }

    chk('moss');

    // ---- 5. 后期 ----
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    gl.disable(gl.DEPTH_TEST);
    progPost.use().set({
      uExposure: UI.exposure || 1.0, uVignette: 0.10, uGrain: 0.002, uTime: t,
      uGain: [1.02, 1.0, 0.975],
    });
    progPost.tex('uScene', fboMain.color, 0);
    quad.draw();
    gl.enable(gl.DEPTH_TEST);
  }

  /* ============================================================== 主循环 */
  function frame(now) {
    now *= 0.001;
    if (!last) last = now;
    const dt = Math.min(0.05, now - last);
    last = now;
    t += dt;
    frames++;
    resize();
    fpsT += dt; fpsN++;
    if (fpsT > 0.5) { fps = fpsN / fpsT; fpsT = 0; fpsN = 0; }
    renderFrame(dt);
    requestAnimationFrame(frame);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
