/* =============================================================
   独立站 · 3D 查看器
   -------------------------------------------------------------
   · 影棚级打光：程序化环境贴图（PMREM）+ 三点光 + 接触阴影
   · 自写轨道控制器：拖拽旋转 / 滚轮缩放 / 双指捏合 / 阻尼
   · 不在视口内自动暂停，不占后台 CPU
   · 同一套代码同时供：首页主推轮播、商品卡缩略图、商品详情大图
   ============================================================= */

(function (global) {
  'use strict';

  const T = global.THREE;
  if (!T) { console.warn('[shop] three.js 未加载'); return; }

  const clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };

  /* ── 程序化影棚环境贴图（金属反射的来源） ──────────────── */

  /* 环境整体压暗，只留几块小而亮的柔光箱 —— 金属才有清晰的高光条，
     而不是整片泛白（珠宝棚拍的路子） */
  function makeStudioTexture() {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 256;
    const ctx = c.getContext('2d');

    const sky = ctx.createLinearGradient(0, 0, 0, 256);
    sky.addColorStop(0.00, '#050609');
    sky.addColorStop(0.32, '#14181f');
    sky.addColorStop(0.47, '#31363e');
    sky.addColorStop(0.51, '#3d434c');
    sky.addColorStop(0.60, '#15181d');
    sky.addColorStop(1.00, '#040507');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 512, 256);

    const box = function (x, y, rx, ry, a) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(rx / ry, 1);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, ry);
      g.addColorStop(0, 'rgba(255,252,244,' + a + ')');
      g.addColorStop(0.5, 'rgba(255,248,236,' + (a * 0.35) + ')');
      g.addColorStop(1, 'rgba(255,248,236,0)');
      ctx.fillStyle = g;
      ctx.fillRect(-ry, -ry, ry * 2, ry * 2);
      ctx.restore();
    };
    box(88, 48, 26, 46, 1.0);     /* 主光 */
    box(196, 34, 18, 34, 0.85);   /* 辅光 */
    box(352, 62, 22, 40, 0.9);    /* 侧光 */
    box(452, 30, 14, 30, 0.7);    /* 轮廓光 */
    box(300, 190, 90, 26, 0.10);  /* 台面反弹 */

    const tex = new T.CanvasTexture(c);
    tex.mapping = T.EquirectangularReflectionMapping;
    tex.encoding = T.sRGBEncoding;
    tex.needsUpdate = true;
    return tex;
  }

  function makeShadowTexture() {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(128, 128, 6, 128, 128, 124);
    g.addColorStop(0, 'rgba(0,0,0,0.55)');
    g.addColorStop(0.45, 'rgba(0,0,0,0.26)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    const tex = new T.CanvasTexture(c);
    tex.encoding = T.sRGBEncoding;
    return tex;
  }

  /* 台面：圆形 + 径向淡出，避免出现地平线硬边 */
  function makeFloorAlpha() {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(128, 128, 10, 128, 128, 126);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.34, '#cfcfcf');
    g.addColorStop(0.68, '#3c3c3c');
    g.addColorStop(1, '#000000');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    return new T.CanvasTexture(c);
  }

  /* ── 检查器皿：反射里能看出网格，像放在摄影棚台面上 ───── */

  function makeFloorTexture() {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#0f1114';
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = 'rgba(190,205,225,0.09)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 128; i += 32) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 128); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(128, i); ctx.stroke();
    }
    const tex = new T.CanvasTexture(c);
    tex.wrapS = tex.wrapT = T.RepeatWrapping;
    tex.repeat.set(3, 3);
    tex.encoding = T.sRGBEncoding;
    return tex;
  }

  /* ── 查看器 ───────────────────────────────────────────── */

  function Viewer(el, opts) {
    opts = opts || {};
    this.el = el;
    this.opts = opts;
    this.autoRotate = opts.autoRotate !== false;
    this.interactive = opts.interactive !== false;
    this.running = false;
    this.visible = true;
    this.disposed = false;

    const self = this;

    /* 渲染器 */
    let renderer;
    try {
      renderer = new T.WebGLRenderer({
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: !!opts.preserveDrawingBuffer,
        powerPreference: 'high-performance'
      });
    } catch (e) {
      this.error = '这台设备的浏览器没有开启 WebGL';
      return;
    }
    renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, opts.maxDpr || 2));
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = opts.exposure || 1.05;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    el.appendChild(renderer.domElement);
    this.renderer = renderer;

    /* 场景 */
    const scene = new T.Scene();
    this.scene = scene;

    const camera = new T.PerspectiveCamera(opts.fov || 32, 1, 0.1, 100);
    camera.position.set(0, 0.4, 3);
    this.camera = camera;

    /* 环境反射 */
    this.pmrem = new T.PMREMGenerator(renderer);
    this.envRT = this.pmrem.fromEquirectangular(makeStudioTexture());
    scene.environment = this.envRT.texture;

    /* 三点光 */
    const key = new T.DirectionalLight(0xfff3e2, 1.55);
    key.position.set(2.2, 3.2, 3.0);
    const fill = new T.DirectionalLight(0xd9e6ff, 0.5);
    fill.position.set(-3.0, 1.2, 2.0);
    const rim = new T.DirectionalLight(0xffffff, 1.25);
    rim.position.set(-1.6, 2.2, -3.2);
    scene.add(key, fill, rim, new T.AmbientLight(0xffffff, 0.16));

    /* 台面 + 接触阴影 */
    this.floor = new T.Mesh(
      new T.CircleGeometry(1, 72),
      new T.MeshStandardMaterial({
        color: 0x0c0e12, map: makeFloorTexture(),
        alphaMap: makeFloorAlpha(), transparent: true, depthWrite: false,
        metalness: 0.15, roughness: 0.5, envMapIntensity: 0.22
      })
    );
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.y = 0;
    this.floor.visible = opts.floor !== false;
    scene.add(this.floor);

    this.shadow = new T.Mesh(
      new T.PlaneGeometry(1, 1),
      new T.MeshBasicMaterial({
        map: makeShadowTexture(), transparent: true, opacity: 0.85,
        depthWrite: false
      })
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.002;
    scene.add(this.shadow);

    /* 轨道状态 */
    this.theta = opts.theta != null ? opts.theta : 0.5;
    this.phi = opts.phi != null ? opts.phi : 1.15;
    this.dist = 3.2;
    this.tTheta = this.theta;
    this.tPhi = this.phi;
    this.target = new T.Vector3(0, 0, 0);
    this.minDist = 1;
    this.maxDist = 8;

    /* 模型 */
    this.model = null;
    this.setModel(opts.model || 'necklace', opts.variant);

    /* 尺寸 */
    this.resize();
    this._ro = global.ResizeObserver ? new ResizeObserver(function () { self.resize(); }) : null;
    if (this._ro) this._ro.observe(el);
    else global.addEventListener('resize', function () { self.resize(); });

    /* 离开视口就停 */
    if (global.IntersectionObserver) {
      this._io = new IntersectionObserver(function (es) {
        self.visible = es[0].isIntersecting;
      }, { threshold: 0.02 });
      this._io.observe(el);
    }
    this._onVis = function () {
      if (!document.hidden && self.visible && !self.disposed) self.start();
    };
    this._onHid = function () { self.stop(); };
    document.addEventListener('visibilitychange', this._onVis);

    /* 交互 */
    if (this.interactive) this._bindControls();
  }

  /* 换 / 装模型 */
  Viewer.prototype.setModel = function (kind, variant) {
    if (!this.scene) return;
    if (this.model) {
      this.scene.remove(this.model.group);
      disposeGroup(this.model.group);
    }
    const tables = global.SHOP_MATERIALS || {};
    this.model = global.SHOP_MODELS.create(kind, variant, tables);
    this.scene.add(this.model.group);
    this.frame();
    return this.model;
  };

  /* 把模型摆正并取景 */
  Viewer.prototype.frame = function () {
    if (!this.model) return;
    const g = this.model.group;
    const box = new T.Box3().setFromObject(g);
    const size = new T.Vector3(), center = new T.Vector3();
    box.getSize(size); box.getCenter(center);
    g.position.sub(center);
    if (this.model.tilt) g.rotation.x += this.model.tilt;

    /* 用包围球取景：竖屏、横屏都不会把商品切掉 */
    this._sphereR = box.getBoundingSphere(new T.Sphere()).radius || 1;
    this._fit();
    this.target.set(0, 0, 0);

    /* 模型移到原点后，底面在 -半高，台面和阴影都要跟着落下去 */
    const ground = -size.y / 2;
    this.floor.position.y = ground;
    this.floor.scale.setScalar(Math.max(size.x, size.z) * 1.45 + 0.5);
    this.shadow.position.y = ground + 0.004;

    /* 阴影大小跟着模型走 */
    const w = Math.max(size.x, size.z) * 1.7;
    this.shadow.scale.set(w, w, 1);
    this.modelRadius = this._sphereR;
  };

  /* 按当前画幅重算相机距离（窄屏时以水平视角为准） */
  Viewer.prototype._fit = function () {
    if (!this._sphereR) return;
    const vFov = this.camera.fov * Math.PI / 180;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * Math.max(this.camera.aspect, 0.1));
    const fovMin = Math.min(vFov, hFov);
    this.dist = (this._sphereR / Math.sin(fovMin / 2)) * (this.opts.padding || 1.18);
    this.minDist = this.dist * 0.55;
    this.maxDist = this.dist * 2.1;
  };

  Viewer.prototype.resize = function () {
    if (!this.renderer || !this.el) return;
    const w = this.el.clientWidth || this.el.offsetWidth || 1;
    const h = this.el.clientHeight || this.el.offsetHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this._fit();   /* 画幅变了要重新取景，手机横竖屏切换才不切边 */
  };

  /* 交互：拖拽 / 滚轮 / 双指 */
  Viewer.prototype._bindControls = function () {
    const self = this;
    const dom = this.renderer.domElement;
    let dragging = false, lastX = 0, lastY = 0, pinch = 0;

    dom.style.touchAction = 'none';
    dom.style.cursor = 'grab';

    dom.addEventListener('pointerdown', function (e) {
      dragging = true; lastX = e.clientX; lastY = e.clientY;
      self.autoRotate = false;
      dom.setPointerCapture(e.pointerId);
      dom.style.cursor = 'grabbing';
    });
    dom.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      self.tTheta -= dx * 0.008;
      self.tPhi = clamp(self.tPhi - dy * 0.008, 0.28, Math.PI - 0.28);
    });
    const up = function (e) {
      if (!dragging) return;
      dragging = false;
      try { dom.releasePointerCapture(e.pointerId); } catch (err) { /* 忽略 */ }
      dom.style.cursor = 'grab';
    };
    dom.addEventListener('pointerup', up);
    dom.addEventListener('pointercancel', up);
    dom.addEventListener('pointerleave', up);

    dom.addEventListener('wheel', function (e) {
      e.preventDefault();
      self.dist = clamp(self.dist * (1 + Math.sign(e.deltaY) * 0.1), self.minDist, self.maxDist);
    }, { passive: false });

    dom.addEventListener('touchstart', function (e) {
      if (e.touches.length === 2) {
        pinch = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    }, { passive: true });
    dom.addEventListener('touchmove', function (e) {
      if (e.touches.length === 2 && pinch) {
        const d = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        self.dist = clamp(self.dist * (pinch / d), self.minDist, self.maxDist);
        pinch = d;
      }
    }, { passive: true });
    dom.addEventListener('touchend', function () { pinch = 0; }, { passive: true });
  };

  /* 换配色（详情页点色块时调） */
  Viewer.prototype.setVariant = function (variant) {
    if (!this.model) return;
    global.SHOP_MODELS.applyVariant(this.model, variant);
  };

  Viewer.prototype.setSpin = function (on) {
    this.autoRotate = !!on;
  };

  /* 导出当前画面 PNG（详情页「保存图片」） */
  Viewer.prototype.snapshot = function () {
    if (!this.renderer) return null;
    this.renderer.render(this.scene, this.camera);
    try { return this.renderer.domElement.toDataURL('image/png'); }
    catch (e) { return null; }
  };

  Viewer.prototype._tick = function () {
    if (this.disposed || !this.renderer) return;
    const m = this.model;
    if (m) {
      if (this.autoRotate) this.tTheta += m.spin;
      this.theta += (this.tTheta - this.theta) * 0.12;
      this.phi += (this.tPhi - this.phi) * 0.12;
      m.group.rotation.y = this.theta;
    }
    const sp = Math.sin(this.phi);
    this.camera.position.set(
      this.target.x + this.dist * sp * Math.sin(this.theta),
      this.target.y + this.dist * Math.cos(this.phi),
      this.target.z + this.dist * sp * Math.cos(this.theta)
    );
    this.camera.lookAt(this.target);
    this.renderer.render(this.scene, this.camera);
  };

  Viewer.prototype.start = function () {
    if (this.running || this.disposed || this.error) return;
    this.running = true;
    const self = this;
    const loop = function () {
      if (!self.running) return;
      self._tick();
      self._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  };

  Viewer.prototype.stop = function () {
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
  };

  Viewer.prototype.dispose = function () {
    this.disposed = true;
    this.stop();
    if (this._io) this._io.disconnect();
    if (this._ro) this._ro.disconnect();
    document.removeEventListener('visibilitychange', this._onVis);
    if (this.model) disposeGroup(this.model.group);
    if (this.floor) {
      this.floor.geometry.dispose();
      if (this.floor.material.map) this.floor.material.map.dispose();
      if (this.floor.material.alphaMap) this.floor.material.alphaMap.dispose();
      this.floor.material.dispose();
    }
    if (this.shadow) { this.shadow.geometry.dispose(); this.shadow.material.map.dispose(); this.shadow.material.dispose(); }
    if (this.envRT) this.envRT.dispose();
    if (this.pmrem) this.pmrem.dispose();
    if (this.renderer) { this.renderer.dispose(); this.renderer.domElement.remove(); }
  };

  function disposeGroup(group) {
    group.traverse(function (o) {
      if (o.geometry) o.geometry.dispose();
      if (o.isInstancedMesh) o.dispose();
    });
  }

  /* ── 离屏缩略图：商品卡上的图也是真 3D 渲染出来的 ──────── */

  function renderThumbnails(list, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      const size = opts.size || 640;
      let renderer;
      try {
        renderer = new T.WebGLRenderer({
          antialias: true, alpha: true, preserveDrawingBuffer: true
        });
      } catch (e) { resolve({}); return; }

      renderer.setPixelRatio(1);
      renderer.setSize(size, size, false);
      renderer.outputEncoding = T.sRGBEncoding;
      renderer.toneMapping = T.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      renderer.setClearColor(0x000000, 0);

      const scene = new T.Scene();
      const pmrem = new T.PMREMGenerator(renderer);
      const env = pmrem.fromEquirectangular(makeStudioTexture());
      scene.environment = env.texture;

      const camera = new T.PerspectiveCamera(32, 1, 0.1, 100);
      scene.add(new T.DirectionalLight(0xfff3e2, 1.55).translateX(2.2).translateY(3.2).translateZ(3));
      scene.add(new T.DirectionalLight(0xd9e6ff, 0.5).translateX(-3).translateY(1.2).translateZ(2));
      scene.add(new T.DirectionalLight(0xffffff, 1.25).translateX(-1.6).translateY(2.2).translateZ(-3.2));
      scene.add(new T.AmbientLight(0xffffff, 0.16));

      const shadow = new T.Mesh(
        new T.PlaneGeometry(1, 1),
        new T.MeshBasicMaterial({ map: makeShadowTexture(), transparent: true, depthWrite: false })
      );
      shadow.rotation.x = -Math.PI / 2;
      scene.add(shadow);

      const tables = global.SHOP_MATERIALS || {};
      const out = {};

      const step = function (i) {
        if (i >= list.length) {
          pmrem.dispose(); env.dispose(); renderer.dispose();
          resolve(out);
          return;
        }
        const item = list[i];
        const model = global.SHOP_MODELS.create(item.model, item.variant, tables);
        scene.add(model.group);
        model.group.rotation.y = opts.theta != null ? opts.theta : 0.62;

        const box = new T.Box3().setFromObject(model.group);
        const size3 = new T.Vector3(), center = new T.Vector3();
        box.getSize(size3); box.getCenter(center);
        model.group.position.sub(center);
        if (model.tilt) model.group.rotation.x += model.tilt;

        const r = Math.max(size3.x, size3.y, size3.z) * 0.5 || 1;
        camera.position.set(0, r * 0.2, (r / Math.tan(camera.fov * Math.PI / 360)) * 1.45);
        camera.lookAt(0, 0, 0);
        const w = Math.max(size3.x, size3.z) * 1.7;
        shadow.scale.set(w, w, 1);
        shadow.position.y = -size3.y / 2 + 0.004;

        renderer.render(scene, camera);
        try { out[item.id] = renderer.domElement.toDataURL('image/png'); } catch (e) { /* 忽略 */ }

        scene.remove(model.group);
        disposeGroup(model.group);
        setTimeout(function () { step(i + 1); }, 0);
      };
      step(0);
    });
  }

  global.SHOP_VIEWER = {
    Viewer: Viewer,
    renderThumbnails: renderThumbnails
  };

})(window);