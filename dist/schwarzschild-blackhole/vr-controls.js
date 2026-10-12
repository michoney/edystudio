/* vr-controls.js — EdyStudio 通用 WebXR 手柄移动模块
 * 类似 Google Earth VR 的三种移动方式：
 *   1) 抓取移动：按住扳机(select)拖动世界，像抓住空气把场景拉向自己
 *   2) 飞行移动：按住握把(squeeze)，沿手柄指向方向飞行
 *   3) 摇杆移动：左摇杆平移，右摇杆转向（支持 Quest/PC VR 手柄）
 *
 * 使用方式（在页面 module 里）：
 *   import { initVRLocomotion } from '<相对路径>/assets/vr-controls.js';
 *   const vr = initVRLocomotion({ renderer, camera, scene, controls });
 *   在动画循环中调用 vr.update();
 *
 * 兼容 three r128 与 r160。页面需要自行:
 *   renderer.xr.enabled = true;
 *   createVRButton(renderer) 创建进入 VR 按钮。
 *
 * Xbox/标准手柄（Gamepad API，mapping=standard）也可用：
 *   VR 中：左摇杆移动、右摇杆转向/升降、扳机飞行
 *   2D 中：左摇杆平移、右摇杆旋转视角
 */
import * as THREE from 'three';

const DEFAULTS = {
  moveSpeed: 1.8,       // 左摇杆平滑移动速度 m/s
  turnSpeed: 1.6,       // 右摇杆转向速度 rad/s
  flySpeed: 4.5,        // 握把飞行速度 m/s
  grabScale: 1.0,       // 抓取移动灵敏度
  grab: true,          // 是否允许扳机抓取移动（页面需要扳机做其他事时可关掉）
  deadzone: 0.18,       // 摇杆死区
  rayLength: 6,         // 手柄射线长度
};

function deadzone(v, dz) {
  return Math.abs(v) < dz ? 0 : (Math.abs(v) - dz) / (1 - dz) * Math.sign(v);
}

/* —— 进入 VR 按钮（自定义样式，兼容 r128/r160，无需引入 three 的 VRButton）—— */
export function createVRButton(renderer, { label = "进入 VR", activeLabel = "退出 VR", unsupportedLabel = "VR 不可用" } = {}) {
  const btn = document.createElement("button");
  btn.id = "VRButton";
  btn.textContent = label;
  btn.setAttribute("aria-label", label);
  btn.style.cssText = [
    "position:fixed", "top:16px", "right:16px", "z-index:9999",
    "padding:12px 22px", "border:1px solid rgba(120,220,255,.6)",
    "border-radius:10px", "background:rgba(8,16,30,.82)",
    "color:#dff4ff", "font:600 14px system-ui,sans-serif",
    "letter-spacing:.06em", "cursor:pointer", "pointer-events:auto",
    "backdrop-filter:blur(8px)", "-webkit-backdrop-filter:blur(8px)",
    "box-shadow:0 6px 24px rgba(0,0,0,.45)",
  ].join(";") + ";";
  document.body.appendChild(btn);

  function setText(text, disabled) {
    btn.textContent = text;
    btn.disabled = !!disabled;
    btn.style.opacity = disabled ? "0.55" : "1";
  }

  if (!("xr" in navigator)) {
    setText(unsupportedLabel, true);
    return btn;
  }

  navigator.xr
    .isSessionSupported("immersive-vr")
    .then((ok) => {
      if (!ok) {
        setText(unsupportedLabel, true);
        return;
      }
      btn.addEventListener("click", async () => {
        try {
          if (renderer.xr.isPresenting) {
            const s = renderer.xr.getSession();
            if (s) await s.end();
            return;
          }
          const session = await navigator.xr.requestSession("immersive-vr", {
            optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking"],
          });
          await renderer.xr.setSession(session);
        } catch (err) {
          console.error("[vr-controls] 进入 VR 失败:", err);
          setText("VR 启动失败", true);
        }
      });
    })
    .catch(() => setText(unsupportedLabel, true));

  if (renderer.xr && renderer.xr.addEventListener) {
    renderer.xr.addEventListener("sessionstart", () => setText(activeLabel, false));
    renderer.xr.addEventListener("sessionend", () => setText(label, false));
  }
  return btn;
}

export function initVRLocomotion({ renderer, camera, scene, controls = null, options = {} }) {
  const opts = Object.assign({}, DEFAULTS, options);
  const rig = new THREE.Group();
  rig.name = 'vr-locomotion-rig';

  // 保存 2D 桌面姿态，退出 VR 后恢复
  const desktopPos = camera.position.clone();
  const desktopQuat = camera.quaternion.clone();

  const parent = camera.parent || scene;
  parent.add(rig);
  rig.add(camera);

  const hands = [0, 1].map((i) => {
    const controller = renderer.xr.getController(i);
    const grip = renderer.xr.getControllerGrip(i);
    controller.visible = false;
    grip.visible = false;
    controller.userData.vrHandIndex = i;
    grip.userData.vrHandIndex = i;

    // 射线与握持点视觉
    const rayGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -opts.rayLength),
    ]);
    const ray = new THREE.Line(rayGeo, new THREE.LineBasicMaterial({
      color: 0x66d9ff, transparent: true, opacity: 0.55, depthTest: true,
    }));
    controller.add(ray);
    const tip = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
    );
    tip.position.z = -opts.rayLength;
    controller.add(tip);
    const handDot = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0x8fb8ff }),
    );
    grip.add(handDot);

    rig.add(controller);
    rig.add(grip);
    return {
      index: i,
      controller,
      grip,
      handedness: null,
      grabbing: false,
      grabStartLocal: new THREE.Vector3(),
      grabStartRig: new THREE.Vector3(),
      flying: false,
    };
  });

  const state = {
    presenting: false,
    session: null,
    moveInput: new THREE.Vector2(),
    turnInput: 0,
  };

  const clock = new THREE.Clock();
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  const v3 = new THREE.Vector3();
  const q1 = new THREE.Quaternion();

  function handFor(inputSource) {
    if (inputSource.handedness === 'left') {
      const left = hands.find((h) => h.handedness === 'left');
      if (left) return left;
    }
    if (inputSource.handedness === 'right') {
      const right = hands.find((h) => h.handedness === 'right');
      if (right) return right;
    }
    // 回退：分配还未绑定的手柄
    return hands.find((h) => h.handedness === null) || hands[0];
  }

  function assignHandedness(inputSource) {
    const h = hands.find((x) => x.handedness === inputSource.handedness);
    if (h) return;
    const empty = hands.find((x) => x.handedness === null);
    if (empty) empty.handedness = inputSource.handedness;
  }

  function onSessionStart() {
    state.presenting = true;
    state.session = renderer.xr.getSession();
    if (controls) controls.enabled = false;
    hands.forEach((h) => {
      h.controller.visible = true;
      h.grip.visible = true;
      h.grabbing = false;
      h.flying = false;
    });
    const session = state.session;
    if (!session) return;

    session.addEventListener('inputsourceschange', () => {
      if (session.inputSources) {
        session.inputSources.forEach(assignHandedness);
      }
    });
    if (session.inputSources) session.inputSources.forEach(assignHandedness);

    session.addEventListener('selectstart', (e) => {
      if (!opts.grab) return;
      const h = handFor(e.inputSource);
      assignHandedness(e.inputSource);
      h.handedness = e.inputSource.handedness;
      h.grabbing = true;
      h.controller.updateWorldMatrix(true, false);
      h.grabStartLocal.copy(h.controller.position);
      h.grabStartRig.copy(rig.position);
    });
    session.addEventListener('selectend', (e) => {
      if (!opts.grab) return;
      const h = handFor(e.inputSource);
      h.grabbing = false;
    });
    session.addEventListener('squeezestart', (e) => {
      const h = handFor(e.inputSource);
      assignHandedness(e.inputSource);
      h.handedness = e.inputSource.handedness;
      h.flying = true;
    });
    session.addEventListener('squeezeend', (e) => {
      const h = handFor(e.inputSource);
      h.flying = false;
    });
  }

  function onSessionEnd() {
    state.presenting = false;
    state.session = null;
    hands.forEach((h) => {
      h.controller.visible = false;
      h.grip.visible = false;
      h.grabbing = false;
      h.flying = false;
      h.handedness = null;
    });
    // 恢复桌面视角，避免退出 VR 后镜头错乱
    rig.position.set(0, 0, 0);
    rig.quaternion.identity();
    camera.position.copy(desktopPos);
    camera.quaternion.copy(desktopQuat);
    if (controls) controls.enabled = true;
  }

  if (renderer.xr && renderer.xr.addEventListener) {
    renderer.xr.addEventListener('sessionstart', onSessionStart);
    renderer.xr.addEventListener('sessionend', onSessionEnd);
  }

  function applyGrab() {
    if (!opts.grab) return;
    const h = hands.find((x) => x.grabbing);
    if (!h) return;
    h.controller.updateWorldMatrix(true, false);
    v1.copy(h.controller.position).sub(h.grabStartLocal).multiplyScalar(opts.grabScale);
    // Google Earth 抓取式：手往哪个方向移动，世界往反方向滑动
    rig.position.copy(h.grabStartRig).sub(v1);
  }

  function applyFly(dt) {
    hands.forEach((h) => {
      if (!h.flying) return;
      h.controller.updateWorldMatrix(true, false);
      v2.set(0, 0, -1).applyQuaternion(h.controller.getWorldQuaternion(q1));
      // 飞行时保持水平分量，避免钻地或冲天；也允许轻微垂直跟随
      const vertical = v2.y;
      v2.y *= 0.35;
      rig.position.addScaledVector(v2, opts.flySpeed * dt);
      rig.position.y += vertical * opts.flySpeed * dt * 0.35;
    });
  }

  function applySticks(dt) {
    const session = state.session;
    if (!session || !session.inputSources) return;
    state.moveInput.set(0, 0);
    state.turnInput = 0;
    session.inputSources.forEach((inputSource) => {
      const gp = inputSource.gamepad;
      if (!gp || !gp.axes || gp.axes.length < 2) return;
      const x = deadzone(gp.axes[0], opts.deadzone);
      const y = deadzone(gp.axes[1], opts.deadzone);
      if (inputSource.handedness === 'left') {
        state.moveInput.set(x, y);
      } else if (inputSource.handedness === 'right') {
        state.turnInput = x;
      } else {
        // 未知侧：x 转向，y 前进，作为兜底
        state.moveInput.set(0, y);
        state.turnInput = x;
      }
    });

    if (state.turnInput !== 0) {
      rig.rotation.y -= state.turnInput * opts.turnSpeed * dt;
    }
    if (state.moveInput.x !== 0 || state.moveInput.y !== 0) {
      camera.updateWorldMatrix(true, false);
      camera.getWorldDirection(v3);
      v3.y = 0;
      if (v3.lengthSq() < 1e-6) v3.set(0, 0, -1);
      v3.normalize();
      // 右向量：forward=(0,0,-1) -> right=(1,0,0)
      v1.set(-v3.z, 0, v3.x);
      v2.copy(v3).multiplyScalar(state.moveInput.y).addScaledVector(v1, state.moveInput.x);
      rig.position.addScaledVector(v2, opts.moveSpeed * dt);
    }
  }

  function applyGamepad(dt) {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let pad = null;
    for (const p of pads) {
      if (p && p.connected && p.axes && p.axes.length >= 4 && p.mapping === 'standard') {
        pad = p;
        break;
      }
    }
    if (!pad) return;
    const dz = opts.deadzone;
    const lx = deadzone(pad.axes[0], dz),
      ly = deadzone(pad.axes[1], dz),
      rx = deadzone(pad.axes[2], dz),
      ry = deadzone(pad.axes[3], dz);
    const lt = pad.buttons && pad.buttons[6] ? pad.buttons[6].value || 0 : 0;
    const rt = pad.buttons && pad.buttons[7] ? pad.buttons[7].value || 0 : 0;

    if (state.presenting) {
      // VR：左摇杆移动，右摇杆转向/升降，扳机飞行
      if (lx !== 0 || ly !== 0) {
        camera.updateWorldMatrix(true, false);
        camera.getWorldDirection(v3);
        v3.y = 0;
        if (v3.lengthSq() < 1e-6) v3.set(0, 0, -1);
        v3.normalize();
        v1.set(-v3.z, 0, v3.x);
        v2.copy(v3).multiplyScalar(-ly).addScaledVector(v1, lx);
        rig.position.addScaledVector(v2, opts.moveSpeed * dt);
      }
      if (rx !== 0) rig.rotation.y -= rx * opts.turnSpeed * dt;
      if (ry !== 0) rig.position.y += ry * opts.moveSpeed * dt;
      const fly = rt - lt;
      if (Math.abs(fly) > 0.05) {
        camera.updateWorldMatrix(true, false);
        camera.getWorldDirection(v3);
        v3.y *= 0.35;
        rig.position.addScaledVector(v3, fly * opts.flySpeed * dt);
      }
    } else if (controls && controls.enabled) {
      // 2D：右摇杆旋转视角，左摇杆平移
      if (rx !== 0) controls.rotateLeft(-rx * 2.4 * dt);
      if (ry !== 0) controls.rotateUp(-ry * 2.4 * dt);
      if (lx !== 0 || ly !== 0) {
        camera.updateWorldMatrix(true, false);
        camera.getWorldDirection(v3);
        v3.y = 0;
        if (v3.lengthSq() < 1e-6) v3.set(0, 0, -1);
        v3.normalize();
        v1.set(-v3.z, 0, v3.x);
        v2.copy(v3).multiplyScalar(-ly).addScaledVector(v1, lx).multiplyScalar(opts.moveSpeed * dt);
        controls.target.add(v2);
        camera.position.add(v2);
      }
    }
  }

  function update() {
    const dt = Math.min(clock.getDelta(), 0.1);
    applyGamepad(dt);
    if (!state.presenting) return;
    applyGrab();
    applyFly(dt);
    applySticks(dt);
  }

  return {
    rig,
    hands,
    update,
    isPresenting: () => state.presenting,
    dispose() {
      if (renderer.xr && renderer.xr.removeEventListener) {
        renderer.xr.removeEventListener('sessionstart', onSessionStart);
        renderer.xr.removeEventListener('sessionend', onSessionEnd);
      }
      parent.remove(rig);
    },
  };
}
