/* =========================================================================
   wave.js — 水面波动模拟（2D 波动方程 ping-pong）

   屏幕上那张水面贴图不是动画，是每帧真解一次波动方程：
       h' = 2h − h_prev + c²·∇²h − damp·(h − h_prev)
   指针在水面上划过时，按世界坐标打一个高斯冲量进去，
   涟漪就以真实波速扩散，多个涟漪会自然干涉叠加。

   两张 256² 的 RGBA16F 纹理交替读写：
       R = 本帧高度  G = 上一帧高度  B = 速度
   ========================================================================= */
(function (global) {
  'use strict';

  const N = 256;                 // 模拟分辨率
  const EXTENT = 100;            // 覆盖的世界边长（米）

  const SIM_FS = /* glsl */`
precision highp float;
in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uState;      // R=h, G=hPrev, B=vel
uniform vec2  uTexel;
uniform float uC2;              // 波速平方（格子单位）
uniform float uDamp;
uniform vec2  uPointer;         // 冲量中心（uv）
uniform float uPointerAmt;      // 冲量强度（可正可负）
uniform float uPointerRadius;

void main(){
  vec2 uv = vUv;
  vec4 s = texture(uState, uv);
  float h = s.r, hp = s.g, v = s.b;

  float l = texture(uState, uv - vec2(uTexel.x, 0.0)).r;
  float r = texture(uState, uv + vec2(uTexel.x, 0.0)).r;
  float d = texture(uState, uv - vec2(0.0, uTexel.y)).r;
  float u = texture(uState, uv + vec2(0.0, uTexel.y)).r;

  // 五点拉普拉斯
  float lap = (l + r + d + u) - 4.0 * h;

  float nv = v + (uC2 * lap - uDamp * v);
  float nh = h + nv;

  // 指针冲量：高斯权重
  vec2 dp = (uv - uPointer) * vec2(1.0, 1.0);
  float dist = length(dp) / max(uPointerRadius, 1e-4);
  float w = exp(-dist * dist * 2.2);
  nh += w * uPointerAmt;
  nv += w * uPointerAmt * 0.35;

  // 边界吸收：靠近边缘时额外阻尼，避免反射回来形成驻波
  float edge = min(min(uv.x, uv.y), min(1.0 - uv.x, 1.0 - uv.y));
  float edgeFade = smoothstep(0.0, 0.06, edge);
  nh *= mix(0.86, 1.0, edgeFade);

  fragColor = vec4(clamp(nh, -2.0, 2.0), clamp(h, -2.0, 2.0), clamp(nv, -2.0, 2.0), 1.0);
}`;

  const Splash_FS = /* glsl */`
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uState;
uniform float uTexel;
uniform float uScale;
void main(){
  vec2 uv = vUv;
  float h = texture(uState, uv).r;
  vec2 o = vec2(uTexel * 2.5);
  float l = texture(uState, uv - vec2(o.x, 0.0)).r;
  float r = texture(uState, uv + vec2(o.x, 0.0)).r;
  float d = texture(uState, uv - vec2(0.0, o.y)).r;
  float u = texture(uState, uv + vec2(0.0, o.y)).r;
  vec3 n = normalize(vec3((l - r) * uScale, 1.0, (d - u) * uScale));
  // alpha 存高度的 0..1 编码（±2m ↔ 0..1），水面顶点再解回来
  fragColor = vec4(n * 0.5 + 0.5, clamp(h * 0.25 + 0.5, 0.0, 1.0));
}`;

  function create(gl, GLU, quad) {
    const fmt = gl.getExtension('EXT_color_buffer_float')
      ? { internal: gl.RGBA16F, format: gl.RGBA, type: gl.HALF_FLOAT }
      : { internal: gl.RGBA8, format: gl.RGBA, type: gl.UNSIGNED_BYTE };
    let fbo = [GLU.fbo(gl, N, N, fmt), GLU.fbo(gl, N, N, fmt)];
    let idx = 0;
    const progSim = GLU.program(gl, QUAD_VS_SRC, SIM_FS, {}, 'wavesim');
    const progSplash = GLU.program(gl, QUAD_VS_SRC, Splash_FS, {}, 'splash');
    const normalFbo = GLU.fbo(gl, N, N, fmt);

    // 清零
    for (const f of fbo.concat([normalFbo])) {
      GLU.bindTarget(gl, f);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    GLU.bindTarget(gl, null);

    let pending = null;      // 攒到下一步的冲量

    const W = {
      tex: fbo[0].color,
      normalTex: normalFbo.color,
      texFb: fbo[0].fbo,      // 给测试读回用
      res: N,
      extent: EXTENT,
      /** 攒一个冲量：世界坐标处，amt 正=压下去 负=顶起来 */
      splash: function (x, z, amt, radius) {
        pending = pending || [];
        if (pending.length < 12) pending.push([x, z, amt, radius === undefined ? 0.030 : radius]);
      },
      /** 每帧都要调用，把波动方程往前推一步 */
      step: function (dt) {
        const next = 1 - idx;
        GLU.bindTarget(gl, fbo[next]);
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.BLEND);
        gl.disable(gl.CULL_FACE);
        // 合并这一帧所有冲量：坐标取质心、强度取总和
        // （早先这里是坐标直接相加，16 个冲量一叠作用点就跑到贴图外，
        //   高斯权重恒为 0，水面怎么划都不起波 —— 波峰探针读出来一直是 0）
        let n = 0, ax = 0, az = 0, a = 0, r = 0.03;
        if (pending) {
          for (const p of pending) { ax += p[0]; az += p[1]; a += p[2]; r = Math.max(r, p[3]); n++; }
          if (n > 0) { ax /= n; az /= n; }
        }
        pending = null;
        a = clamp(a, -0.42, 0.42);          // 一帧的合力别把波场打爆
        progSim.use().set({
          uTexel: [1 / N, 1 / N],
          uC2: 0.44, uDamp: 0.006,
          uPointer: [(ax + EXTENT / 2) / EXTENT, (az + EXTENT / 2) / EXTENT],
          uPointerAmt: pending0(a),
          uPointerRadius: r,
          uDt: dt,
        });
        progSim.tex('uState', fbo[idx].color, 0);
        quad.draw();
        idx = next;

        // 法线图（水面片元直接采，不用在片元里差分四次）
        GLU.bindTarget(gl, normalFbo);
        progSplash.use().set({ uTexel: 1 / N, uScale: 7.0 });
        progSplash.tex('uState', fbo[idx].color, 0);
        quad.draw();
        W.tex = fbo[idx].color;
        W.texFb = fbo[idx].fbo;
        GLU.bindTarget(gl, null);
      },
      pendingCount: () => (pending ? pending.length : 0),
      reset: function () {
        pending = null;
        for (const f of fbo.concat([normalFbo])) {
          GLU.bindTarget(gl, f);
          gl.clearColor(0, 0, 0, 1);
          gl.clear(gl.COLOR_BUFFER_BIT);
        }
        GLU.bindTarget(gl, null);
      },
    };
    return W;
  }

  function pending0(a) { return isFinite(a) ? a : 0; }

  /* 全屏三角形顶点着色器（GLU.quad 自带的那个，抄一份给程序编译用） */
  const QUAD_VS_SRC = `
layout(location = 0) in vec2 aPos;
out vec2 vUv;
void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

  global.WAVE = { create, N, EXTENT };
})(window);
