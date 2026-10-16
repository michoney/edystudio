/* =========================================================================
   math.js — minimal column-major mat4 / vec3 math, splines, noise
   ========================================================================= */
(function (global) {
  'use strict';

  const TAU = Math.PI * 2;
  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smoothstep = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
  const mix = lerp;

  /* ---------- vec3 (plain arrays) ---------- */
  const V3 = {
    add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
    sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
    mul: (a, b) => [a[0] * b[0], a[1] * b[1], a[2] * b[2]],
    scale: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
    dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    cross: (a, b) => [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0],
    ],
    len: (a) => Math.hypot(a[0], a[1], a[2]),
    dist: (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]),
    norm: (a) => {
      const l = Math.hypot(a[0], a[1], a[2]) || 1;
      return [a[0] / l, a[1] / l, a[2] / l];
    },
    lerp: (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)],
    neg: (a) => [-a[0], -a[1], -a[2]],
  };

  /* ---------- mat4, column-major (m[col*4+row]) ---------- */
  const M4 = {
    create() {
      const m = new Float32Array(16);
      m[0] = m[5] = m[10] = m[15] = 1;
      return m;
    },
    identity(o) {
      o.fill(0); o[0] = o[5] = o[10] = o[15] = 1; return o;
    },
    copy(o, a) { o.set(a); return o; },

    mul(o, a, b) {
      const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
      const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
      const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
      const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
      for (let i = 0; i < 4; i++) {
        const b0 = b[i * 4], b1 = b[i * 4 + 1], b2 = b[i * 4 + 2], b3 = b[i * 4 + 3];
        o[i * 4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        o[i * 4 + 1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        o[i * 4 + 2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        o[i * 4 + 3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
      }
      return o;
    },

    fromTranslation(o, t) {
      M4.identity(o); o[12] = t[0]; o[13] = t[1]; o[14] = t[2]; return o;
    },
    fromScale(o, s) {
      M4.identity(o);
      o[0] = s[0]; o[5] = s[1]; o[10] = s[2];
      return o;
    },
    fromRotationX(o, r) {
      const c = Math.cos(r), s = Math.sin(r);
      M4.identity(o); o[5] = c; o[6] = s; o[9] = -s; o[10] = c; return o;
    },
    fromRotationY(o, r) {
      const c = Math.cos(r), s = Math.sin(r);
      M4.identity(o); o[0] = c; o[2] = -s; o[8] = s; o[10] = c; return o;
    },
    fromRotationZ(o, r) {
      const c = Math.cos(r), s = Math.sin(r);
      M4.identity(o); o[0] = c; o[1] = s; o[4] = -s; o[5] = c; return o;
    },
    fromAxisAngle(o, axis, r) {
      const l = Math.hypot(axis[0], axis[1], axis[2]) || 1;
      const x = axis[0] / l, y = axis[1] / l, z = axis[2] / l;
      const c = Math.cos(r), s = Math.sin(r), t = 1 - c;
      o[0] = x * x * t + c; o[1] = y * x * t + z * s; o[2] = z * x * t - y * s; o[3] = 0;
      o[4] = x * y * t - z * s; o[5] = y * y * t + c; o[6] = z * y * t + x * s; o[7] = 0;
      o[8] = x * z * t + y * s; o[9] = y * z * t - x * s; o[10] = z * z * t + c; o[11] = 0;
      o[12] = 0; o[13] = 0; o[14] = 0; o[15] = 1;
      return o;
    },
    /** compose translation * rot(euler XYZ, radians) * scale */
    compose(o, t, rot, s) {
      const [rx, ry, rz] = rot || [0, 0, 0];
      const cx = Math.cos(rx), sx = Math.sin(rx);
      const cy = Math.cos(ry), sy = Math.sin(ry);
      const cz = Math.cos(rz), sz = Math.sin(rz);
      // R = Rz * Ry * Rx
      const m00 = cz * cy, m01 = cz * sy * sx - sz * cx, m02 = cz * sy * cx + sz * sx;
      const m10 = sz * cy, m11 = sz * sy * sx + cz * cx, m12 = sz * sy * cx - cz * sx;
      const m20 = -sy, m21 = cy * sx, m22 = cy * cx;
      const sx0 = s ? s[0] : 1, sy0 = s ? s[1] : 1, sz0 = s ? s[2] : 1;
      o[0] = m00 * sx0; o[1] = m10 * sx0; o[2] = m20 * sx0; o[3] = 0;
      o[4] = m01 * sy0; o[5] = m11 * sy0; o[6] = m21 * sy0; o[7] = 0;
      o[8] = m02 * sz0; o[9] = m12 * sz0; o[10] = m22 * sz0; o[11] = 0;
      o[12] = t ? t[0] : 0; o[13] = t ? t[1] : 0; o[14] = t ? t[2] : 0; o[15] = 1;
      return o;
    },

    perspective(o, fovy, aspect, near, far) {
      const f = 1 / Math.tan(fovy / 2);
      o.fill(0);
      o[0] = f / aspect; o[5] = f; o[11] = -1;
      o[10] = (far + near) / (near - far);
      o[14] = (2 * far * near) / (near - far);
      return o;
    },
    ortho(o, l, r, b, t, n, f) {
      o.fill(0);
      o[0] = 2 / (r - l); o[5] = 2 / (t - b); o[10] = -2 / (f - n);
      o[12] = -(r + l) / (r - l); o[13] = -(t + b) / (t - b); o[14] = -(f + n) / (f - n); o[15] = 1;
      return o;
    },
    lookAt(o, eye, center, up) {
      let z = V3.norm(V3.sub(eye, center));
      if (V3.len(z) < 1e-6) z = [0, 0, 1];
      let x = V3.cross(up, z);
      if (V3.len(x) < 1e-6) { x = V3.cross([0, 0, 1], z); }
      x = V3.norm(x);
      const y = V3.cross(z, x);
      o[0] = x[0]; o[1] = y[0]; o[2] = z[0]; o[3] = 0;
      o[4] = x[1]; o[5] = y[1]; o[6] = z[1]; o[7] = 0;
      o[8] = x[2]; o[9] = y[2]; o[10] = z[2]; o[11] = 0;
      o[12] = -V3.dot(x, eye); o[13] = -V3.dot(y, eye); o[14] = -V3.dot(z, eye); o[15] = 1;
      return o;
    },
    invert(o, a) {
      const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
      const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
      const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
      const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
      const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10;
      const b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11;
      const b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12;
      const b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30;
      const b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31;
      const b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
      let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
      if (!det) return M4.identity(o);
      det = 1 / det;
      o[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
      o[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
      o[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
      o[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
      o[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
      o[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
      o[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
      o[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
      o[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
      o[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
      o[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
      o[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
      o[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
      o[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
      o[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
      o[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
      return o;
    },
    /** upper-left 3x3 inverse-transpose, written into a 9-float array */
    normalMat(o3, m) {
      const a00 = m[0], a01 = m[1], a02 = m[2];
      const a10 = m[4], a11 = m[5], a12 = m[6];
      const a20 = m[8], a21 = m[9], a22 = m[10];
      const b01 = a22 * a11 - a12 * a21;
      const b11 = -a22 * a10 + a12 * a20;
      const b21 = a21 * a10 - a11 * a20;
      let det = a00 * b01 + a01 * b11 + a02 * b21;
      if (!det) { o3[0] = 1; o3[1] = 0; o3[2] = 0; o3[3] = 0; o3[4] = 1; o3[5] = 0; o3[6] = 0; o3[7] = 0; o3[8] = 1; return o3; }
      det = 1 / det;
      o3[0] = b01 * det;
      o3[1] = (-a22 * a01 + a02 * a21) * det;
      o3[2] = (a12 * a01 - a02 * a11) * det;
      o3[3] = b11 * det;
      o3[4] = (a22 * a00 - a02 * a20) * det;
      o3[5] = (-a12 * a00 + a02 * a10) * det;
      o3[6] = b21 * det;
      o3[7] = (-a21 * a00 + a01 * a20) * det;
      o3[8] = (a11 * a00 - a01 * a10) * det;
      return o3;
    },
    transformPoint(m, p) {
      const x = p[0], y = p[1], z = p[2];
      const w = m[3] * x + m[7] * y + m[11] * z + m[15] || 1;
      return [
        (m[0] * x + m[4] * y + m[8] * z + m[12]) / w,
        (m[1] * x + m[5] * y + m[9] * z + m[13]) / w,
        (m[2] * x + m[6] * y + m[10] * z + m[14]) / w,
      ];
    },
    /** rotation whose local +Y axis points along `dir` */
    alignY(o, dir, hint) {
      const y = V3.norm(dir);
      let h = hint || (Math.abs(y[1]) > 0.9 ? [0, 0, 1] : [0, 1, 0]);
      let x = V3.cross(h, y);
      if (V3.len(x) < 1e-6) x = V3.cross([1, 0, 0], y);
      x = V3.norm(x);
      const z = V3.cross(x, y);
      o[0] = x[0]; o[1] = x[1]; o[2] = x[2]; o[3] = 0;
      o[4] = y[0]; o[5] = y[1]; o[6] = y[2]; o[7] = 0;
      o[8] = z[0]; o[9] = z[1]; o[10] = z[2]; o[11] = 0;
      o[12] = 0; o[13] = 0; o[14] = 0; o[15] = 1;
      return o;
    },
    /** translate(origin) * alignY(target - origin) */
    orientTo(o, origin, target, hint) {
      const d = V3.sub(target, origin);
      if (V3.len(d) < 1e-9) d[0] = 1e-6;
      M4.alignY(o, d, hint);
      o[12] = origin[0]; o[13] = origin[1]; o[14] = origin[2];
      return o;
    },
    transformDir(m, p) {
      const x = p[0], y = p[1], z = p[2];
      return [
        m[0] * x + m[4] * y + m[8] * z,
        m[1] * x + m[5] * y + m[9] * z,
        m[2] * x + m[6] * y + m[10] * z,
      ];
    },
  };

  /* ---------- curves ---------- */
  /** Catmull-Rom through points; t in [0,1] over the whole path */
  function catmullRom(pts, t) {
    const n = pts.length;
    const f = clamp(t, 0, 1) * (n - 1);
    let i = Math.floor(f);
    if (i > n - 2) i = n - 2;
    const u = f - i;
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(n - 1, i + 2)];
    const u2 = u * u, u3 = u2 * u;
    const out = [0, 0, 0];
    for (let k = 0; k < 3; k++) {
      out[k] = 0.5 * (
        2 * p1[k] +
        (-p0[k] + p2[k]) * u +
        (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * u2 +
        (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * u3
      );
    }
    return out;
  }
  function catmullRomScalar(pts, t) {
    const n = pts.length;
    const f = clamp(t, 0, 1) * (n - 1);
    let i = Math.floor(f);
    if (i > n - 2) i = n - 2;
    const u = f - i;
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
    const u2 = u * u, u3 = u2 * u;
    return 0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * u3);
  }
  function sampleCurve(pts, count) {
    const out = [];
    for (let i = 0; i < count; i++) out.push(catmullRom(pts, i / (count - 1)));
    return out;
  }

  /* ---------- deterministic randomness & noise ---------- */
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash2(x, y) {
    let h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
    return h - Math.floor(h);
  }
  function valueNoise2(x, y) {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    const a = hash2(ix, iy), b = hash2(ix + 1, iy);
    const c = hash2(ix, iy + 1), d = hash2(ix + 1, iy + 1);
    return lerp(lerp(a, b, ux), lerp(c, d, ux), uy);
  }
  function fbm2(x, y, oct = 4) {
    let v = 0, amp = 0.5, f = 1;
    for (let i = 0; i < oct; i++) { v += amp * valueNoise2(x * f, y * f); f *= 2; amp *= 0.5; }
    return v;
  }

  /* ---------- color ---------- */
  /** hex string or [r,g,b] 0..1 -> [r,g,b] 0..1 (linear-ish, kept as-is) */
  function col(c) {
    if (Array.isArray(c)) return c.length === 4 ? [c[0], c[1], c[2]] : c.slice();
    if (typeof c === 'string') {
      const h = c.replace('#', '');
      const n = parseInt(h.length === 3 ? h.split('').map((s) => s + s).join('') : h, 16);
      return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
    }
    return [1, 1, 1];
  }
  /** srgb -> approximate linear */
  function srgbToLinear(c) {
    return c.map((v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  }
  function hexLin(hex) { return srgbToLinear(col(hex)); }

  global.TAU = TAU;
  global.clamp = clamp;
  global.lerp = lerp;
  global.smoothstep = smoothstep;
  global.V3 = V3;
  global.M4 = M4;
  global.catmullRom = catmullRom;
  global.catmullRomScalar = catmullRomScalar;
  global.sampleCurve = sampleCurve;
  global.mulberry32 = mulberry32;
  global.hash2 = hash2;
  global.valueNoise2 = valueNoise2;
  global.fbm2 = fbm2;
  global.col = col;
  global.hexLin = hexLin;
  global.srgbToLinear = srgbToLinear;
})(window);
