/* =========================================================================
   geom.js — procedural mesh builders
   -------------------------------------------------------------------------
   Mesh format (plain JS objects until upload):
     { pos:[x,y,z,...], nrm:[...], col:[r,g,b,...], mat:[rough,metal,emis,rim,...],
       idx:[i,j,k,...] }

   Style (passed to every builder):
     { color: [r,g,b] | (p,n)=>[r,g,b],   // per-vertex tint
       rough: 0..1, metal: 0..1, emis: 0..n, rim: 0..1 }
   All colors are linear-space 0..1 (use hexLin() to convert sRGB hex).
   ========================================================================= */
(function (global) {
  'use strict';

  const G = {};
  const DEF_STYLE = { rough: 0.72, metal: 0.0, emis: 0, rim: 0.0 };

  function empty() {
    return { pos: [], nrm: [], col: [], mat: [], idx: [] };
  }
  G.empty = empty;

  function applyStyle(m, style) {
    const st = style || {};
    const c = st.color === undefined ? [0.8, 0.8, 0.8] : st.color;
    const rough = st.rough === undefined ? DEF_STYLE.rough : st.rough;
    const metal = st.metal === undefined ? DEF_STYLE.metal : st.metal;
    const emis = st.emis === undefined ? DEF_STYLE.emis : st.emis;
    const rim = st.rim === undefined ? DEF_STYLE.rim : st.rim;
    const n = m.pos.length / 3;
    for (let i = 0; i < n; i++) {
      let cc = c;
      if (typeof c === 'function') {
        cc = c([m.pos[i * 3], m.pos[i * 3 + 1], m.pos[i * 3 + 2]],
          [m.nrm[i * 3], m.nrm[i * 3 + 1], m.nrm[i * 3 + 2]]);
      }
      m.col[i * 3] = cc[0]; m.col[i * 3 + 1] = cc[1]; m.col[i * 3 + 2] = cc[2];
      const r = typeof rough === 'function' ? rough(i, m.pos[i * 3], m.pos[i * 3 + 1], m.pos[i * 3 + 2]) : rough;
      m.mat[i * 4] = r; m.mat[i * 4 + 1] = metal; m.mat[i * 4 + 2] = emis; m.mat[i * 4 + 3] = rim;
    }
    return m;
  }
  G.style = applyStyle;

  function vert(m, x, y, z, nx, ny, nz) {
    m.pos.push(x, y, z); m.nrm.push(nx, ny, nz);
    return (m.pos.length / 3) - 1;
  }
  G.vert = vert;

  function tri(m, a, b, c) { m.idx.push(a, b, c); }
  G.tri = tri;

  function quad(m, a, b, c, d) { m.idx.push(a, b, c, a, c, d); }
  G.quad = quad;

  /* ------------------------------------------------------------------ box */
  G.box = function (w, h, d, style) {
    const m = empty();
    const x = w / 2, y = h / 2, z = d / 2;
    const faces = [
      // nx,ny,nz  (4 corners CCW seen from outside)
      [[1, 0, 0], [[x, -y, z], [x, -y, -z], [x, y, -z], [x, y, z]]],
      [[-1, 0, 0], [[-x, -y, -z], [-x, -y, z], [-x, y, z], [-x, y, -z]]],
      [[0, 1, 0], [[-x, y, z], [x, y, z], [x, y, -z], [-x, y, -z]]],
      [[0, -1, 0], [[-x, -y, -z], [x, -y, -z], [x, -y, z], [-x, -y, z]]],
      [[0, 0, 1], [[-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]]],
      [[0, 0, -1], [[x, -y, -z], [-x, -y, -z], [-x, y, -z], [x, y, -z]]],
    ];
    for (const [n, corners] of faces) {
      const ids = corners.map((c) => vert(m, c[0], c[1], c[2], n[0], n[1], n[2]));
      quad(m, ids[0], ids[1], ids[2], ids[3]);
    }
    return applyStyle(m, style);
  };

  /* ------------------------------------------------------- rounded box */
  G.rbox = function (w, h, d, r, seg, style) {
    const m = empty();
    const n = seg || 4;
    const half = [w / 2, h / 2, d / 2];
    r = Math.min(r, Math.min(w, Math.min(h, d)) / 2 - 1e-4);
    const inner = [half[0] - r, half[1] - r, half[2] - r];
    const axes = [0, 1, 2];
    for (let ax = 0; ax < 3; ax++) {
      const a1 = axes[(ax + 1) % 3], a2 = axes[(ax + 2) % 3];
      for (let side = 0; side < 2; side++) {
        const sgn = side === 0 ? 1 : -1;
        const base = [];
        for (let i = 0; i <= n; i++) {
          const row = [];
          for (let j = 0; j <= n; j++) {
            const u = (i / n) * 2 - 1, v = (j / n) * 2 - 1;
            const p = [0, 0, 0];
            p[ax] = sgn * half[ax];
            p[a1] = u * half[a1];
            p[a2] = v * half[a2];
            const ip = [
              Math.max(-inner[0], Math.min(inner[0], p[0])),
              Math.max(-inner[1], Math.min(inner[1], p[1])),
              Math.max(-inner[2], Math.min(inner[2], p[2])),
            ];
            let dx = p[0] - ip[0], dy = p[1] - ip[1], dz = p[2] - ip[2];
            const l = Math.hypot(dx, dy, dz) || 1;
            dx /= l; dy /= l; dz /= l;
            row.push(vert(m, ip[0] + dx * r, ip[1] + dy * r, ip[2] + dz * r, dx, dy, dz));
          }
          base.push(row);
        }
        for (let i = 0; i < n; i++) {
          for (let j = 0; j < n; j++) {
            const q = base[i][j], q2 = base[i + 1][j], q3 = base[i + 1][j + 1], q4 = base[i][j + 1];
            if (sgn > 0) quad(m, q, q2, q3, q4); else quad(m, q, q4, q3, q2);
          }
        }
      }
    }
    return applyStyle(m, style);
  };

  /* -------------------------------------------------------------- sphere */
  G.sphere = function (r, segU, segV, style, deform) {
    const m = empty();
    const su = segU || 24, sv = segV || 16;
    const rows = [];
    for (let j = 0; j <= sv; j++) {
      const v = j / sv, phi = v * Math.PI;
      const row = [];
      for (let i = 0; i <= su; i++) {
        const u = i / su, theta = u * Math.PI * 2;
        let nx = Math.sin(phi) * Math.cos(theta);
        let ny = Math.cos(phi);
        let nz = Math.sin(phi) * Math.sin(theta);
        let p = [nx * r, ny * r, nz * r];
        let nn = [nx, ny, nz];
        if (deform) {
          const res = deform(p, nn, u, v);
          p = res.p || p; nn = res.n || nn;
        }
        row.push(vert(m, p[0], p[1], p[2], nn[0], nn[1], nn[2]));
      }
      rows.push(row);
    }
    for (let j = 0; j < sv; j++) {
      for (let i = 0; i < su; i++) {
        const a = rows[j][i], b = rows[j][i + 1], c = rows[j + 1][i + 1], d = rows[j + 1][i];
        if (j !== 0) quad(m, a, b, c, d);
        if (j !== sv - 1) quad(m, a, d, c, b);
      }
    }
    return applyStyle(m, style);
  };

  /** sphere with independent radii (ellipsoid) + optional deform */
  G.ellipsoid = function (rx, ry, rz, segU, segV, style, deform) {
    return G.sphere(1, segU, segV, style, deform
      ? (p, n, u, v) => {
        const P = [p[0] * rx, p[1] * ry, p[2] * rz];
        const N = V3.norm([n[0] / rx, n[1] / ry, n[2] / rz]);
        const res = deform(P, N, u, v);
        return res;
      }
      : (p, n, u, v) => ({
        p: [p[0] * rx, p[1] * ry, p[2] * rz],
        n: V3.norm([n[0] / rx, n[1] / ry, n[2] / rz]),
      }));
  };

  /* ------------------------------------------------------------ cylinder */
  /** axis = Y, centered at origin. r0 = bottom radius, r1 = top radius */
  G.cylinder = function (r0, r1, h, seg, opts, style) {
    const o = opts || {};
    const m = empty();
    const s = seg || 20, hh = h / 2;
    const slope = Math.atan2(r0 - r1, h);
    const cs = Math.cos(slope), sn = Math.sin(slope);
    const ringA = [], ringB = [];
    for (let i = 0; i <= s; i++) {
      const a = (i / s) * Math.PI * 2;
      const cx = Math.cos(a), cz = Math.sin(a);
      ringA.push(vert(m, cx * r0, -hh, cz * r0, cx * cs, sn, cz * cs));
      ringB.push(vert(m, cx * r1, hh, cz * r1, cx * cs, sn, cz * cs));
    }
    for (let i = 0; i < s; i++) quad(m, ringA[i], ringA[i + 1], ringB[i + 1], ringB[i]);
    if (o.capBottom !== false && r0 > 1e-6) {
      const c = vert(m, 0, -hh, 0, 0, -1, 0);
      const rr = [];
      for (let i = 0; i <= s; i++) { const a = (i / s) * Math.PI * 2; rr.push(vert(m, Math.cos(a) * r0, -hh, Math.sin(a) * r0, 0, -1, 0)); }
      for (let i = 0; i < s; i++) tri(m, c, rr[i + 1], rr[i]);
    }
    if (o.capTop !== false && r1 > 1e-6) {
      const c = vert(m, 0, hh, 0, 0, 1, 0);
      const rr = [];
      for (let i = 0; i <= s; i++) { const a = (i / s) * Math.PI * 2; rr.push(vert(m, Math.cos(a) * r1, hh, Math.sin(a) * r1, 0, 1, 0)); }
      for (let i = 0; i < s; i++) tri(m, c, rr[i], rr[i + 1]);
    }
    return applyStyle(m, style);
  };

  G.cone = function (r, h, seg, style) { return G.cylinder(0, r, h, seg, {}, style); };
  G.capsule = function (r, len, seg, style) {
    const a = G.cylinder(r, r, len, seg, { capBottom: false, capTop: false }, style);
    const b = G.sphere(r, seg, Math.max(6, seg / 2), style);
    const top = G.transform(b, M4.compose(M4.create(), [0, len / 2, 0], [0, 0, 0], null));
    const bot = G.transform(b, M4.compose(M4.create(), [0, -len / 2, 0], [Math.PI, 0, 0], null));
    return G.merge([a, top, bot]);
  };

  /* --------------------------------------------------------------- torus */
  /** lies in XY plane, tube axis = Z */
  G.torus = function (R, r, segU, segV, style, arc) {
    const m = empty();
    const su = segU || 32, sv = segV || 12;
    const a0 = arc ? arc[0] : 0, a1 = arc ? arc[1] : Math.PI * 2;
    const rows = [];
    for (let i = 0; i <= su; i++) {
      const u = a0 + (a1 - a0) * (i / su);
      const cu = Math.cos(u), su_ = Math.sin(u);
      const row = [];
      for (let j = 0; j <= sv; j++) {
        const v = (j / sv) * Math.PI * 2;
        const cv = Math.cos(v), sv_ = Math.sin(v);
        const nx = cu * cv, ny = su_ * cv, nz = sv_;
        row.push(vert(m, (R + r * cv) * cu, (R + r * cv) * su_, r * sv_, nx, ny, nz));
      }
      rows.push(row);
    }
    for (let i = 0; i < su; i++) {
      for (let j = 0; j < sv; j++) {
        quad(m, rows[i][j], rows[i + 1][j], rows[i + 1][j + 1], rows[i][j + 1]);
      }
    }
    return applyStyle(m, style);
  };

  /* --------------------------------------------------------------- plane */
  /** XZ plane centered at origin; heightFn(x,z) may displace Y */
  G.plane = function (w, d, nx, nz, style, heightFn) {
    const m = empty();
    const rows = [];
    for (let j = 0; j <= nz; j++) {
      const row = [];
      for (let i = 0; i <= nx; i++) {
        const x = (i / nx - 0.5) * w, z = (j / nz - 0.5) * d;
        const y = heightFn ? heightFn(x, z) : 0;
        row.push(vert(m, x, y, z, 0, 1, 0));
      }
      rows.push(row);
    }
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      quad(m, rows[j][i], rows[j][i + 1], rows[j + 1][i + 1], rows[j + 1][i]);
    }
    if (heightFn) G.computeNormals(m);
    return applyStyle(m, style);
  };

  /* --------------------------------------------------------------- lathe */
  /** profile: [[radius, y], ...] revolved around Y */
  G.lathe = function (profile, seg, style, opts) {
    const o = opts || {};
    const m = empty();
    const s = seg || 24, P = profile;
    const rows = [];
    for (let k = 0; k < P.length; k++) {
      const prev = P[Math.max(0, k - 1)], next = P[Math.min(P.length - 1, k + 1)];
      let tr = next[0] - prev[0], ty = next[1] - prev[1];
      const tl = Math.hypot(tr, ty) || 1; tr /= tl; ty /= tl;
      const nr = ty, ny = -tr; // rotate tangent -90° => outward
      const row = [];
      for (let i = 0; i <= s; i++) {
        const a = (i / s) * Math.PI * 2;
        const c = Math.cos(a), sn = Math.sin(a);
        row.push(vert(m, P[k][0] * c, P[k][1], P[k][0] * sn,
          nr * c, ny, nr * sn));
      }
      rows.push(row);
    }
    for (let k = 0; k < P.length - 1; k++) {
      for (let i = 0; i < s; i++) quad(m, rows[k][i], rows[k][i + 1], rows[k + 1][i + 1], rows[k + 1][i]);
    }
    if (o.closeBottom) {
      const y = P[0][1], r = P[0][0];
      const c = vert(m, 0, y, 0, 0, -1, 0);
      const rr = [];
      for (let i = 0; i <= s; i++) { const a = (i / s) * Math.PI * 2; rr.push(vert(m, Math.cos(a) * r, y, Math.sin(a) * r, 0, -1, 0)); }
      for (let i = 0; i < s; i++) tri(m, c, rr[i + 1], rr[i]);
    }
    if (o.closeTop) {
      const k = P.length - 1, y = P[k][1], r = P[k][0];
      const c = vert(m, 0, y, 0, 0, 1, 0);
      const rr = [];
      for (let i = 0; i <= s; i++) { const a = (i / s) * Math.PI * 2; rr.push(vert(m, Math.cos(a) * r, y, Math.sin(a) * r, 0, 1, 0)); }
      for (let i = 0; i < s; i++) tri(m, c, rr[i], rr[i + 1]);
    }
    return applyStyle(m, style);
  };

  /* ---------------------------------------------------------------- tube */
  /**
   * tube(path, opts, style)
   *  path: [ [x,y,z], ... ] control points (Catmull-Rom smoothed unless opts.raw)
   *  opts: { samples, seg, radius:number|fn(t), scale: [su,sv]|fn(t),
   *          profile: fn(theta,t)->number (cross-section multiplier),
   *          caps: [bool,bool], up:[x,y,z], twist: fn(t) }
   */
  G.tube = function (path, opts, style) {
    const o = opts || {};
    const m = empty();
    let pts = path;
    if (!o.raw) {
      const n = o.samples || Math.max(12, path.length * 6);
      pts = sampleCurve(path, n);
    }
    const seg = o.seg || 14;
    const N = pts.length;
    const rf = typeof o.radius === 'function' ? o.radius : () => (o.radius === undefined ? 0.1 : o.radius);
    const sf = typeof o.scale === 'function' ? o.scale
      : (o.scale ? () => o.scale : () => [1, 1]);
    const pf = o.profile || null;
    const twistF = o.twist || (() => 0);

    // tangents & parallel-transported frames
    const T = [], Nn = [], Bb = [];
    for (let i = 0; i < N; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N - 1, i + 1)];
      T.push(V3.norm(V3.sub(b, a)));
    }
    let up = o.up || [0, 1, 0];
    if (Math.abs(V3.dot(up, T[0])) > 0.95) up = [1, 0, 0];
    let nrm = V3.norm(V3.cross(up, T[0]));
    for (let i = 0; i < N; i++) {
      if (i > 0) {
        // project previous normal onto the plane perpendicular to T
        const t = T[i];
        let d = V3.dot(nrm, t);
        nrm = V3.norm(V3.sub(nrm, V3.scale(t, d)));
        if (!isFinite(nrm[0]) || V3.len(nrm) < 1e-5) nrm = V3.norm(V3.cross(up, t));
      }
      Nn.push(nrm);
      Bb.push(V3.cross(T[i], nrm));
    }

    const rows = [];
    for (let i = 0; i < N; i++) {
      const t = N === 1 ? 0 : i / (N - 1);
      const r = rf(t), sc = sf(t), tw = twistF(t);
      const P = pts[i], nv = Nn[i], bv = Bb[i];
      const ct = Math.cos(tw), st = Math.sin(tw);
      const nx2 = [nv[0] * ct + bv[0] * st, nv[1] * ct + bv[1] * st, nv[2] * ct + bv[2] * st];
      const bx2 = [bv[0] * ct - nv[0] * st, bv[1] * ct - nv[1] * st, bv[2] * ct - nv[2] * st];
      const row = [];
      for (let j = 0; j <= seg; j++) {
        const th = (j / seg) * Math.PI * 2;
        const c = Math.cos(th), s = Math.sin(th);
        const pm = pf ? pf(th, t) : 1;
        const rr = r * pm;
        const ox = nx2[0] * c * sc[0] + bx2[0] * s * sc[1];
        const oy = nx2[1] * c * sc[0] + bx2[1] * s * sc[1];
        const oz = nx2[2] * c * sc[0] + bx2[2] * s * sc[1];
        let n3 = V3.norm([nx2[0] * c / (sc[0] * sc[0]) + bx2[0] * s / (sc[1] * sc[1]),
        nx2[1] * c / (sc[0] * sc[0]) + bx2[1] * s / (sc[1] * sc[1]),
        nx2[2] * c / (sc[0] * sc[0]) + bx2[2] * s / (sc[1] * sc[1])]);
        if (o.flipNormal) n3 = V3.neg(n3);
        row.push(vert(m, P[0] + ox * rr, P[1] + oy * rr, P[2] + oz * rr, n3[0], n3[1], n3[2]));
      }
      rows.push(row);
    }
    for (let i = 0; i < N - 1; i++) {
      for (let j = 0; j < seg; j++) {
        if (o.flip) quad(m, rows[i][j], rows[i + 1][j], rows[i + 1][j + 1], rows[i][j + 1]);
        else quad(m, rows[i][j], rows[i][j + 1], rows[i + 1][j + 1], rows[i + 1][j]);
      }
    }
    const caps = o.caps || [true, true];
    if (caps[0] && pts.length > 1) {
      const t = 0, r = rf(t), sc = sf(t), tw = twistF(t);
      const nv = Nn[0], bv = Bb[0];
      const ct = Math.cos(tw), st = Math.sin(tw);
      const nx2 = [nv[0] * ct + bv[0] * st, nv[1] * ct + bv[1] * st, nv[2] * ct + bv[2] * st];
      const bx2 = [bv[0] * ct - nv[0] * st, bv[1] * ct - nv[1] * st, bv[2] * ct - nv[2] * st];
      const P = pts[0], tn = V3.scale(T[0], -1);
      const c0 = vert(m, P[0], P[1], P[2], tn[0], tn[1], tn[2]);
      const rr = [];
      for (let j = 0; j <= seg; j++) {
        const th = (j / seg) * Math.PI * 2, c = Math.cos(th), s = Math.sin(th);
        const pm = pf ? pf(th, t) : 1;
        rr.push(vert(m, P[0] + (nx2[0] * c * sc[0] + bx2[0] * s * sc[1]) * r * pm,
          P[1] + (nx2[1] * c * sc[0] + bx2[1] * s * sc[1]) * r * pm,
          P[2] + (nx2[2] * c * sc[0] + bx2[2] * s * sc[1]) * r * pm,
          tn[0], tn[1], tn[2]));
      }
      for (let j = 0; j < seg; j++) tri(m, c0, rr[j + 1], rr[j]);
    }
    if (caps[1] && pts.length > 1) {
      const i2 = N - 1, t = 1, r = rf(t), sc = sf(t), tw = twistF(t);
      const nv = Nn[i2], bv = Bb[i2];
      const ct = Math.cos(tw), st = Math.sin(tw);
      const nx2 = [nv[0] * ct + bv[0] * st, nv[1] * ct + bv[1] * st, nv[2] * ct + bv[2] * st];
      const bx2 = [bv[0] * ct - nv[0] * st, bv[1] * ct - nv[1] * st, bv[2] * ct - nv[2] * st];
      const P = pts[i2], tn = T[i2];
      const c0 = vert(m, P[0], P[1], P[2], tn[0], tn[1], tn[2]);
      const rr = [];
      for (let j = 0; j <= seg; j++) {
        const th = (j / seg) * Math.PI * 2, c = Math.cos(th), s = Math.sin(th);
        const pm = pf ? pf(th, t) : 1;
        rr.push(vert(m, P[0] + (nx2[0] * c * sc[0] + bx2[0] * s * sc[1]) * r * pm,
          P[1] + (nx2[1] * c * sc[0] + bx2[1] * s * sc[1]) * r * pm,
          P[2] + (nx2[2] * c * sc[0] + bx2[2] * s * sc[1]) * r * pm,
          tn[0], tn[1], tn[2]));
      }
      for (let j = 0; j < seg; j++) tri(m, c0, rr[j], rr[j + 1]);
    }
    return applyStyle(m, style);
  };

  /* -------------------------------------------------------------- ribbon */
  /** flat strip along a path — scarf, feathers, leaves, fins.
   *  opts: { samples, width|fn(t), up, thickness, twist } */
  G.ribbon = function (path, opts, style) {
    const o = opts || {};
    const m = empty();
    const n = o.samples || 40;
    const pts = o.raw ? path : sampleCurve(path, n);
    const N = pts.length;
    const wf = typeof o.width === 'function' ? o.width : () => (o.width || 0.1);
    const up = o.up || [0, 1, 0];
    const th = o.thickness === undefined ? 0.0 : o.thickness;
    const rows = [];
    for (let i = 0; i < N; i++) {
      const t = N === 1 ? 0 : i / (N - 1);
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N - 1, i + 1)];
      const tg = V3.norm(V3.sub(b, a));
      let sd = V3.cross(tg, up);
      if (V3.len(sd) < 1e-5) sd = V3.cross(tg, [1, 0, 0]);
      sd = V3.norm(sd);
      const nd = V3.norm(V3.cross(sd, tg));
      const tw = o.twist ? o.twist(t) : 0;
      const wv = wf(t);
      const dir = V3.add(V3.scale(sd, Math.cos(tw)), V3.scale(nd, Math.sin(tw)));
      const nn = V3.norm(V3.cross(V3.scale(dir, -1), tg));
      const P = pts[i];
      const l = vert(m, P[0] - dir[0] * wv, P[1] - dir[1] * wv, P[2] - dir[2] * wv, nn[0], nn[1], nn[2]);
      const r = vert(m, P[0] + dir[0] * wv, P[1] + dir[1] * wv, P[2] + dir[2] * wv, nn[0], nn[1], nn[2]);
      rows.push([l, r]);
    }
    for (let i = 0; i < N - 1; i++) quad(m, rows[i][0], rows[i][1], rows[i + 1][1], rows[i + 1][0]);
    if (th > 0) {
      const back = [];
      for (let i = 0; i < N; i++) {
        const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N - 1, i + 1)];
        const tg = V3.norm(V3.sub(b, a));
        let sd = V3.cross(tg, up);
        if (V3.len(sd) < 1e-5) sd = V3.cross(tg, [1, 0, 0]);
        sd = V3.norm(sd);
        const nd = V3.norm(V3.cross(sd, tg));
        const t = N === 1 ? 0 : i / (N - 1);
        const tw = o.twist ? o.twist(t) : 0;
        const dir = V3.add(V3.scale(sd, Math.cos(tw)), V3.scale(nd, Math.sin(tw)));
        const nn = V3.norm(V3.cross(V3.scale(dir, -1), tg));
        const P = pts[i], wv = wf(t);
        back.push([
          vert(m, P[0] - dir[0] * wv - nn[0] * th, P[1] - dir[1] * wv - nn[1] * th, P[2] - dir[2] * wv - nn[2] * th, -nn[0], -nn[1], -nn[2]),
          vert(m, P[0] + dir[0] * wv - nn[0] * th, P[1] + dir[1] * wv - nn[1] * th, P[2] + dir[2] * wv - nn[2] * th, -nn[0], -nn[1], -nn[2]),
        ]);
      }
      for (let i = 0; i < N - 1; i++) {
        quad(m, rows[i][0], back[i][0], back[i + 1][0], rows[i + 1][0]);
        quad(m, rows[i][1], rows[i + 1][1], back[i + 1][1], back[i][1]);
        quad(m, back[i][0], rows[i][0], rows[i][1], back[i][1]);
      }
    }
    return applyStyle(m, style);
  };

  /* ------------------------------------------------------------- extrude */
  /** poly: [[x,y],...] CCW; extruded along Z, centered, flat caps (fan) */
  G.extrude = function (poly, h, style, opts) {
    const o = opts || {};
    const m = empty();
    const hh = h / 2;
    let cx = 0, cy = 0;
    for (const p of poly) { cx += p[0]; cy += p[1]; }
    cx /= poly.length; cy /= poly.length;
    const front = [], back = [];
    for (const p of poly) {
      front.push(vert(m, p[0], p[1], hh, 0, 0, 1));
      back.push(vert(m, p[0], p[1], -hh, 0, 0, -1));
    }
    const cf = vert(m, cx, cy, hh, 0, 0, 1);
    const cb = vert(m, cx, cy, -hh, 0, 0, -1);
    const n = poly.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      tri(m, cf, front[i], front[j]);
      tri(m, cb, back[j], back[i]);
      quad(m, front[i], back[i], back[j], front[j]);
    }
    return applyStyle(m, style);
  };

  /* ------------------------------------------------------- misc utilities */
  G.transform = function (mesh, mat, style) {
    const m = empty();
    const n = mesh.pos.length / 3;
    // normalMat returns a row-major 3x3 in a flat 9-array
    const nm = M4.normalMat(new Float32Array(9), mat);
    for (let i = 0; i < n; i++) {
      const x = mesh.pos[i * 3], y = mesh.pos[i * 3 + 1], z = mesh.pos[i * 3 + 2];
      const p = M4.transformPoint(mat, [x, y, z]);
      const ax = mesh.nrm[i * 3], ay = mesh.nrm[i * 3 + 1], az = mesh.nrm[i * 3 + 2];
      const nv = [
        nm[0] * ax + nm[3] * ay + nm[6] * az,
        nm[1] * ax + nm[4] * ay + nm[7] * az,
        nm[2] * ax + nm[5] * ay + nm[8] * az,
      ];
      const l = Math.hypot(nv[0], nv[1], nv[2]) || 1;
      vert(m, p[0], p[1], p[2], nv[0] / l, nv[1] / l, nv[2] / l);
    }
    for (const i of mesh.idx) m.idx.push(i);
    const st = style || {};
    const use = st.color !== undefined || st.rough !== undefined || st.metal !== undefined
      || st.emis !== undefined || st.rim !== undefined;
    if (use) {
      for (let i = 0; i < n; i++) {
        const cc = st.color !== undefined
          ? (typeof st.color === 'function'
            ? st.color([m.pos[i * 3], m.pos[i * 3 + 1], m.pos[i * 3 + 2]],
              [m.nrm[i * 3], m.nrm[i * 3 + 1], m.nrm[i * 3 + 2]])
            : st.color)
          : [mesh.col[i * 3], mesh.col[i * 3 + 1], mesh.col[i * 3 + 2]];
        m.col[i * 3] = cc[0]; m.col[i * 3 + 1] = cc[1]; m.col[i * 3 + 2] = cc[2];
        m.mat[i * 4] = st.rough !== undefined ? st.rough : mesh.mat[i * 4];
        m.mat[i * 4 + 1] = st.metal !== undefined ? st.metal : mesh.mat[i * 4 + 1];
        m.mat[i * 4 + 2] = st.emis !== undefined ? st.emis : mesh.mat[i * 4 + 2];
        m.mat[i * 4 + 3] = st.rim !== undefined ? st.rim : mesh.mat[i * 4 + 3];
      }
    } else {
      m.col = mesh.col.slice();
      m.mat = mesh.mat.slice();
    }
    return m;
  };

  /** translate / rotate / scale convenience */
  G.at = function (mesh, pos, rot, scl, style) {
    return G.transform(mesh, M4.compose(M4.create(), pos, rot, scl), style);
  };

  G.merge = function (meshes) {
    const out = empty();
    for (const mesh of meshes) {
      if (!mesh) continue;
      const base = out.pos.length / 3;
      for (let i = 0; i < mesh.pos.length; i++) out.pos.push(mesh.pos[i]);
      for (let i = 0; i < mesh.nrm.length; i++) out.nrm.push(mesh.nrm[i]);
      for (let i = 0; i < mesh.col.length; i++) out.col.push(mesh.col[i]);
      for (let i = 0; i < mesh.mat.length; i++) out.mat.push(mesh.mat[i]);
      for (const i of mesh.idx) out.idx.push(i + base);
    }
    return out;
  };

  G.computeNormals = function (mesh) {
    const n = mesh.pos.length / 3;
    const nrm = new Float64Array(n * 3);
    for (let i = 0; i < mesh.idx.length; i += 3) {
      const a = mesh.idx[i], b = mesh.idx[i + 1], c = mesh.idx[i + 2];
      const ax = mesh.pos[a * 3], ay = mesh.pos[a * 3 + 1], az = mesh.pos[a * 3 + 2];
      const bx = mesh.pos[b * 3], by = mesh.pos[b * 3 + 1], bz = mesh.pos[b * 3 + 2];
      const cx = mesh.pos[c * 3], cy = mesh.pos[c * 3 + 1], cz = mesh.pos[c * 3 + 2];
      const e1x = bx - ax, e1y = by - ay, e1z = bz - az;
      const e2x = cx - ax, e2y = cy - ay, e2z = cz - az;
      const nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
      nrm[a * 3] += nx; nrm[a * 3 + 1] += ny; nrm[a * 3 + 2] += nz;
      nrm[b * 3] += nx; nrm[b * 3 + 1] += ny; nrm[b * 3 + 2] += nz;
      nrm[c * 3] += nx; nrm[c * 3 + 1] += ny; nrm[c * 3 + 2] += nz;
    }
    for (let i = 0; i < n; i++) {
      let l = Math.hypot(nrm[i * 3], nrm[i * 3 + 1], nrm[i * 3 + 2]);
      if (!(l > 1e-8)) {
        // degenerate or unreferenced vertex (poles, pinched caps): keep the
        // authored normal rather than emitting a zero/NaN one
        const ol = Math.hypot(mesh.nrm[i * 3], mesh.nrm[i * 3 + 1], mesh.nrm[i * 3 + 2]);
        if (ol > 1e-8) {
          mesh.nrm[i * 3] /= ol; mesh.nrm[i * 3 + 1] /= ol; mesh.nrm[i * 3 + 2] /= ol;
        } else {
          mesh.nrm[i * 3] = 0; mesh.nrm[i * 3 + 1] = 1; mesh.nrm[i * 3 + 2] = 0;
        }
        continue;
      }
      mesh.nrm[i * 3] = nrm[i * 3] / l;
      mesh.nrm[i * 3 + 1] = nrm[i * 3 + 1] / l;
      mesh.nrm[i * 3 + 2] = nrm[i * 3 + 2] / l;
    }
    return mesh;
  };

  G.bounds = function (mesh) {
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < mesh.pos.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        if (mesh.pos[i + k] < min[k]) min[k] = mesh.pos[i + k];
        if (mesh.pos[i + k] > max[k]) max[k] = mesh.pos[i + k];
      }
    }
    return { min, max, center: [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2] };
  };

  /** jitter every vertex slightly — turns CG-clean shapes into hand-made ones */
  G.jitter = function (mesh, amount, seed) {
    const rnd = mulberry32(seed || 7);
    const n = mesh.pos.length / 3;
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < 3; k++) {
        mesh.pos[i * 3 + k] += (rnd() - 0.5) * amount;
      }
    }
    G.computeNormals(mesh);
    return mesh;
  };

  /** convenience: a rod between two points (frames, spokes, arch ribs) */
  G.rod = function (a, b, r, seg, style, opts) {
    const mid = V3.scale(V3.add(a, b), 0.5);
    const dir = V3.sub(b, a);
    const len = V3.len(dir);
    const cyl = G.cylinder(r, r, len, seg, opts, style);
    const axis = V3.norm(dir);
    let ref = Math.abs(axis[1]) > 0.95 ? [1, 0, 0] : [0, 1, 0];
    const xa = V3.norm(V3.cross(ref, axis));
    const za = V3.cross(axis, xa);
    const mm = new Float32Array([
      xa[0], xa[1], xa[2], 0,
      axis[0], axis[1], axis[2], 0,
      za[0], za[1], za[2], 0,
      mid[0], mid[1], mid[2], 1,
    ]);
    return G.transform(cyl, mm);
  };

  global.G = G;
})(window);
