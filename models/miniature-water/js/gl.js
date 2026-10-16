/* =========================================================================
   gl.js — WebGL2 helpers: programs, meshes, framebuffers, fullscreen quad
   ========================================================================= */
(function (global) {
  'use strict';

  const GLU = {};

  /* ---------------------------------------------------------------- shader */
  function compile(gl, type, src, name) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(sh);
      const lines = src.split('\n').map((l, i) => String(i + 1).padStart(4) + '| ' + l).join('\n');
      throw new Error(`[${name}] shader compile failed:\n${log}\n${lines}`);
    }
    return sh;
  }

  /**
   * program(vs, fs, defines) -> { prog, uniforms:{}, use(), set(obj) }
   * Uniform names are introspected once, then dispatched by GL type.
   */
  GLU.program = function (gl, vsSrc, fsSrc, defines = {}, name = 'prog') {
    const head = '#version 300 es\n' + Object.entries(defines)
      .map(([k, v]) => `#define ${k} ${v}\n`).join('');
    const vs = compile(gl, gl.VERTEX_SHADER, head + vsSrc, name + '.vs');
    const fs = compile(gl, gl.FRAGMENT_SHADER, head + fsSrc, name + '.fs');
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error(`[${name}] link failed: ` + gl.getProgramInfoLog(prog));
    }
    gl.deleteShader(vs); gl.deleteShader(fs);

    const uniforms = {};
    const n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const info = gl.getActiveUniform(prog, i);
      const base = info.name.replace(/\[0\]$/, '');
      uniforms[base] = { loc: gl.getUniformLocation(prog, info.name), type: info.type, size: info.size };
    }

    const api = {
      prog,
      uniforms,
      name,
      use() { gl.useProgram(prog); return api; },
      set(obj) {
        for (const key in obj) {
          const u = uniforms[key];
          if (!u) continue;
          const v = obj[key];
          switch (u.type) {
            case gl.FLOAT: u.size > 1 ? gl.uniform1fv(u.loc, v) : gl.uniform1f(u.loc, v); break;
            case gl.FLOAT_VEC2: gl.uniform2fv(u.loc, v); break;
            case gl.FLOAT_VEC3: gl.uniform3fv(u.loc, v); break;
            case gl.FLOAT_VEC4: gl.uniform4fv(u.loc, v); break;
            case gl.INT: case gl.BOOL: u.size > 1 ? gl.uniform1iv(u.loc, v) : gl.uniform1i(u.loc, v); break;
            case gl.FLOAT_MAT3: gl.uniformMatrix3fv(u.loc, false, v); break;
            case gl.FLOAT_MAT4: gl.uniformMatrix4fv(u.loc, false, v); break;
            case gl.SAMPLER_2D: case gl.SAMPLER_2D_SHADOW: case gl.SAMPLER_CUBE:
              u.size > 1 ? gl.uniform1iv(u.loc, v) : gl.uniform1i(u.loc, v); break;
            default: break;
          }
        }
        return api;
      },
      tex(key, texture, unit) {
        const u = uniforms[key];
        if (!u) return api;
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(u.loc, unit);
        return api;
      },
    };
    return api;
  };

  /* ------------------------------------------------------------------ mesh */
  // attribute layout (fixed, shared by every solid shader):
  //  0 aPos vec3 | 1 aNrm vec3 | 2 aCol vec3 | 3 aMat vec4 (rough, metal, emissive, rim)
  //  4..7 aModel mat4 | 8 aTint vec3   (instanced only)
  GLU.STRIDE = (3 + 3 + 3 + 4) * 4; // 52 bytes

  GLU.uploadMesh = function (gl, mesh) {
    const n = mesh.pos.length / 3;
    const data = new Float32Array(n * 13);
    for (let i = 0; i < n; i++) {
      const o = i * 13;
      data[o] = mesh.pos[i * 3]; data[o + 1] = mesh.pos[i * 3 + 1]; data[o + 2] = mesh.pos[i * 3 + 2];
      data[o + 3] = mesh.nrm[i * 3]; data[o + 4] = mesh.nrm[i * 3 + 1]; data[o + 5] = mesh.nrm[i * 3 + 2];
      data[o + 6] = mesh.col[i * 3]; data[o + 7] = mesh.col[i * 3 + 1]; data[o + 8] = mesh.col[i * 3 + 2];
      data[o + 9] = mesh.mat ? mesh.mat[i * 4] : 0.7;
      data[o + 10] = mesh.mat ? mesh.mat[i * 4 + 1] : 0;
      data[o + 11] = mesh.mat ? mesh.mat[i * 4 + 2] : 0;
      data[o + 12] = mesh.mat ? mesh.mat[i * 4 + 3] : 0;
    }
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    const S = GLU.STRIDE;
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, S, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, S, 12);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 3, gl.FLOAT, false, S, 24);
    gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 4, gl.FLOAT, false, S, 36);

    const ibo = gl.createBuffer();
    const idx = n > 65535 ? new Uint32Array(mesh.idx) : new Uint16Array(mesh.idx);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);

    gl.bindVertexArray(null);
    return {
      vao, vbo, ibo, count: mesh.idx.length,
      type: n > 65535 ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT,
      tris: mesh.idx.length / 3, verts: n,
    };
  };

  /** Attach a per-instance mat4 + tint to an existing mesh vao. */
  GLU.makeInstanced = function (gl, gm, maxInstances) {
    const vao = gm.vao;
    gl.bindVertexArray(vao);
    const ibuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, ibuf);
    gl.bufferData(gl.ARRAY_BUFFER, maxInstances * 19 * 4, gl.DYNAMIC_DRAW);
    const S = 19 * 4;
    for (let i = 0; i < 4; i++) {
      const loc = 4 + i;
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, S, i * 16);
      gl.vertexAttribDivisor(loc, 1);
    }
    gl.enableVertexAttribArray(8);
    gl.vertexAttribPointer(8, 3, gl.FLOAT, false, S, 64);
    gl.vertexAttribDivisor(8, 1);
    gl.bindVertexArray(null);
    gm.instBuf = ibuf;
    gm.instData = new Float32Array(maxInstances * 19);
    gm.max = maxInstances;
    return gm;
  };
  GLU.uploadInstances = function (gl, gm, count) {
    gl.bindBuffer(gl.ARRAY_BUFFER, gm.instBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, gm.instData, 0, count * 19);
  };

  /* ------------------------------------------------------------ framebuffer */
  function makeTex(gl, w, h, internal, format, type, filter, wrap) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, format, type, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
    return t;
  }

  GLU.fbo = function (gl, w, h, opts = {}) {
    const f = {
      w, h,
      color: makeTex(gl, w, h, opts.internal || gl.RGBA8, opts.format || gl.RGBA,
        opts.type || gl.UNSIGNED_BYTE, opts.filter || gl.LINEAR, opts.wrap || gl.CLAMP_TO_EDGE),
      fbo: gl.createFramebuffer(),
    };
    gl.bindFramebuffer(gl.FRAMEBUFFER, f.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, f.color, 0);
    if (opts.depth) {
      f.depth = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, f.depth);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, f.depth);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return f;
  };

  GLU.fboFromTex = function (gl, tex, w, h, depth) {
    const f = { w, h, color: tex, fbo: gl.createFramebuffer() };
    gl.bindFramebuffer(gl.FRAMEBUFFER, f.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, f.color, 0);
    if (depth) {
      f.depth = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, f.depth);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, f.depth);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return f;
  };

  /** Multisampled color+depth render target that can be resolved with blit. */
  GLU.msaaFbo = function (gl, w, h, internal, samples) {
    const f = { w, h, fbo: gl.createFramebuffer(), samples };
    f.color = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, f.color);
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, internal, w, h);
    f.depth = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, f.depth);
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.DEPTH_COMPONENT24, w, h);
    gl.bindFramebuffer(gl.FRAMEBUFFER, f.fbo);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, f.color);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, f.depth);
    const st = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (st !== gl.FRAMEBUFFER_COMPLETE) { f.ok = false; return f; }
    f.ok = true;
    return f;
  };

  GLU.shadowFbo = function (gl, size) {
    const f = { w: size, h: size, fbo: gl.createFramebuffer() };
    f.tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, f.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, size, size, 0,
      gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
    gl.bindFramebuffer(gl.FRAMEBUFFER, f.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, f.tex, 0);
    gl.drawBuffers([gl.NONE]);
    gl.readBuffer(gl.NONE);
    const st = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    f.ok = st === gl.FRAMEBUFFER_COMPLETE;
    return f;
  };

  GLU.bindTarget = function (gl, f) {
    if (!f) { gl.bindFramebuffer(gl.FRAMEBUFFER, null); return; }
    gl.bindFramebuffer(gl.FRAMEBUFFER, f.fbo);
    gl.viewport(0, 0, f.w, f.h);
  };

  /* ----------------------------------------------------------- fullscreen tri */
  GLU.quad = function (gl) {
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    return {
      vao,
      draw() { gl.bindVertexArray(vao); gl.drawArrays(gl.TRIANGLES, 0, 3); },
    };
  };

  GLU.drawMesh = function (gl, gm, instances) {
    gl.bindVertexArray(gm.vao);
    if (instances !== undefined) {
      gl.drawElementsInstanced(gl.TRIANGLES, gm.count, gm.type, 0, instances);
    } else {
      gl.drawElements(gl.TRIANGLES, gm.count, gm.type, 0);
    }
  };

  global.GLU = GLU;
})(window);
