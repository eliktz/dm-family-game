// וורם — the star. A procedural, fully animated Earth Dragon.
// Body: one deforming tube along a live spline (smooth, no segment seams), scaled skin
// (procedural bump + tint), ridge spikes (instanced), a big expressive head with
// blinking lids, glossy eyes, a moving jaw, horns, ear-fins and blush.
// Behaviours: idle breathing, body wave + tail swish, blinking, look-at, happy wiggle,
// eating (chomp), Dragon-Stone eye glow, and a floating "mind-power" flight pose.
// Swap point: if assets/models/models.json lists a rigged "worm" GLB, main.js can attach
// it to `worm.root` and drive it from the same API (see README → "Swapping in Blender assets").
import * as THREE from 'three';
import { scaleTextures, glowSprite } from './tex.js';

const N_CTRL = 14, RINGS = 84, RAD = 30, L = 10.5;
const ss = THREE.MathUtils.smoothstep, lerp = THREE.MathUtils.lerp, clamp = THREE.MathUtils.clamp;
const UP = new THREE.Vector3(0, 1, 0);

export function radiusAt(t) { return lerp(0.6, 1.0, ss(t, 0, 0.18)) * (1 - ss(t, 0.33, 1.0) * 0.93); }

export function createWorm() {
  const root = new THREE.Group(); root.name = 'worm';
  const { bump, col } = scaleTextures();
  const bodyBump = bump.clone(); bodyBump.repeat.set(5, 15); bodyBump.needsUpdate = true;
  const bodyCol = col.clone(); bodyCol.repeat.set(5, 15); bodyCol.needsUpdate = true;
  const headBump = bump.clone(); headBump.repeat.set(4, 3); headBump.needsUpdate = true;

  const skin = (color, extra = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.58, sheen: 0.25, sheenColor: new THREE.Color(0xffcf9a), sheenRoughness: 0.6, bumpMap: headBump, bumpScale: 0.6, ...extra });

  // ---- body tube -------------------------------------------------------------------
  const vCount = RINGS * (RAD + 1);
  const pos = new Float32Array(vCount * 3), colr = new Float32Array(vCount * 3), uv = new Float32Array(vCount * 2);
  const idx = [];
  const cBack = new THREE.Color(0x6a3f1d), cSide = new THREE.Color(0x8f5a2f), cBelly = new THREE.Color(0xd9b27a), tmpC = new THREE.Color();
  for (let j = 0; j < RINGS; j++) for (let k = 0; k <= RAD; k++) {
    const i = j * (RAD + 1) + k; const a = -Math.PI / 2 + k / RAD * Math.PI * 2; const s = Math.sin(a);
    const t = j / (RINGS - 1);
    tmpC.copy(cSide).lerp(cBack, ss(s, 0.2, 0.95));
    const belly = ss(-s, 0.25, 0.7);
    const band = 0.88 + 0.12 * Math.cos(t * Math.PI * 2 * 30);
    tmpC.lerp(cBelly.clone().multiplyScalar(band), belly);
    colr.set([tmpC.r, tmpC.g, tmpC.b], i * 3); uv.set([k / RAD, t], i * 2);
    if (j < RINGS - 1 && k < RAD) { const a0 = i, a1 = i + 1, b0 = i + RAD + 1, b1 = b0 + 1; idx.push(a0, a1, b0, a1, b1, b0); }
  }
  const tubeGeo = new THREE.BufferGeometry();
  tubeGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  tubeGeo.setAttribute('color', new THREE.BufferAttribute(colr, 3));
  tubeGeo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  tubeGeo.setIndex(idx);
  const bodyMat = new THREE.MeshPhysicalMaterial({ vertexColors: true, map: bodyCol, bumpMap: bodyBump, bumpScale: 0.9, roughness: 0.62, sheen: 0.25, sheenColor: new THREE.Color(0xffc890), sheenRoughness: 0.5 });
  const body = new THREE.Mesh(tubeGeo, bodyMat); body.castShadow = true; body.receiveShadow = true; body.frustumCulled = false;
  root.add(body);
  const tailTip = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), skin(0x7d4f27)); root.add(tailTip);

  // ridge spikes along the back
  const SPK = 17;
  const spikes = new THREE.InstancedMesh(new THREE.ConeGeometry(0.17, 0.5, 10).translate(0, 0.22, 0),
    new THREE.MeshPhysicalMaterial({ color: 0xd99a55, roughness: 0.45, clearcoat: 0.3 }), SPK);
  spikes.castShadow = true; spikes.frustumCulled = false; root.add(spikes);

  // ---- head ------------------------------------------------------------------------
  const head = new THREE.Group(); root.add(head);
  const headInner = new THREE.Group(); head.add(headInner); headInner.scale.setScalar(1.18);
  const brown = skin(0x7a4a24), muzzleM = skin(0xa06a3a), bellyM = skin(0xd9b27a, { bumpScale: 0.4 });
  const sph = (r = 1, w = 36, h = 24) => new THREE.SphereGeometry(r, w, h);
  const add = (geo, mat, p, s, parent = headInner, shadow = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(...p); if (s) m.scale.set(...s); m.castShadow = shadow; parent.add(m); return m; };
  const cranium = add(sph(), brown, [0, 0.15, 0], [0.95, 0.82, 1.0]);
  const muzzle = add(sph(), muzzleM, [0, -0.2, 0.7], [0.66, 0.46, 0.62]);
  const jawPivot = new THREE.Group(); jawPivot.position.set(0, -0.3, 0.15); headInner.add(jawPivot);
  add(sph(), bellyM, [0, -0.1, 0.55], [0.7, 0.3, 0.75], jawPivot);
  add(sph(0.5, 20, 12), new THREE.MeshStandardMaterial({ color: 0x6e2232, roughness: 0.6 }), [0, -0.16, 0.65], [0.95, 0.35, 1], headInner, false);
  const tongue = add(sph(0.22, 16, 10), new THREE.MeshStandardMaterial({ color: 0xe46d7f, roughness: 0.5 }), [0, -0.05, 0.75], [1, 0.35, 1.2], jawPivot, false);
  const nostrilM = new THREE.MeshStandardMaterial({ color: 0x3a1f0e, roughness: 0.8 });
  for (const sx of [-1, 1]) add(sph(0.065, 12, 8), nostrilM, [sx * 0.16, -0.04, 1.27], [1.2, 0.7, 0.6], headInner, false);
  // smile
  const smile = add(new THREE.TorusGeometry(0.3, 0.022, 8, 28, Math.PI * 0.8), new THREE.MeshStandardMaterial({ color: 0x4a2a14, roughness: 0.7 }), [0, -0.36, 1.24], null, headInner, false);
  smile.scale.setScalar(0.75); smile.rotation.set(-0.35, 0, Math.PI + Math.PI * 0.1);
  // horns + ear fins
  const hornM = new THREE.MeshPhysicalMaterial({ color: 0xf3e4c4, roughness: 0.35, clearcoat: 0.6 });
  const fins = [], cheeks = [];
  for (const sx of [-1, 1]) {
    const h = add(new THREE.ConeGeometry(0.13, 0.6, 16), hornM, [sx * 0.36, 0.82, -0.28]); h.rotation.set(-0.7, 0, sx * -0.3);
    const fin = new THREE.Group(); fin.position.set(sx * 0.84, 0.32, -0.18); headInner.add(fin);
    const f = add(new THREE.ConeGeometry(0.24, 0.7, 16), skin(0xc58a4f), [0, 0.3, 0], [1, 1, 0.35], fin); fin.rotation.set(0, sx * 0.3, sx * -1.1); fins.push(fin);
    cheeks.push(add(sph(0.2, 16, 10), new THREE.MeshBasicMaterial({ color: 0xff8f95, transparent: true, opacity: 0.4, depthWrite: false }), [sx * 0.6, -0.12, 0.98], [1, 0.6, 0.35], headInner, false));
  }
  // eyes
  const irisM = new THREE.MeshPhysicalMaterial({ color: 0x6b441a, roughness: 0.2, clearcoat: 1, emissive: new THREE.Color(0x3dff7a), emissiveIntensity: 0 });
  const scleraM = new THREE.MeshPhysicalMaterial({ color: 0xd9d6cf, roughness: 0.12, clearcoat: 1 });
  const pupilM = new THREE.MeshPhysicalMaterial({ color: 0x0d0704, roughness: 0.1, clearcoat: 1 });
  const shineM = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const glowTex = glowSprite('rgba(120,255,160,1)', 'rgba(60,255,120,0)');
  const lids = [], lowLids = [], eyeGlows = [], eyes = [];
  for (const sx of [-1, 1]) {
    const eye = new THREE.Group(); eye.position.set(sx * 0.4, 0.26, 0.66); eye.rotation.y = sx * 0.28; eye.scale.setScalar(1.22); headInner.add(eye); eyes.push(eye);
    add(sph(0.3), scleraM, [0, 0, 0], null, eye, false);
    add(sph(0.19), irisM, [0, 0.01, 0.2], [1, 1, 0.55], eye, false);
    add(sph(0.11), pupilM, [0, 0.01, 0.27], [1, 1.1, 0.45], eye, false);
    add(sph(0.05, 10, 8), shineM, [0.07, 0.09, 0.3], null, eye, false);
    add(sph(0.025, 8, 6), shineM, [-0.06, -0.05, 0.3], null, eye, false);
    const lid = new THREE.Mesh(new THREE.SphereGeometry(0.325, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), brown); eye.add(lid); lids.push(lid);
    // "smiling eyes": a round cheek puff that rises under the eye, so its top edge cuts the eye in a ^ arc
    const low = add(sph(0.27, 24, 16), muzzleM, [0, -0.5, 0.05], null, eye, false); low.visible = false; lowLids.push(low);
    const g = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 }));
    g.position.set(0, 0, 0.35); g.scale.setScalar(1.3); eye.add(g); eyeGlows.push(g);
  }
  const glowLight = new THREE.PointLight(0x66ff99, 0, 7, 2); glowLight.position.set(0, 0.6, 2.4); headInner.add(glowLight);

  // ---- state -----------------------------------------------------------------------
  const st = { pose: 'rest', prevPose: 'rest', blend: 1, wiggle: 0, glow: 0, glowTarget: 0, mouth: 0, chomp: 0, blinkT: 2, blink: 0,
    look: null, bank: 0, climb: 0, happy: 0, squint: 0, smile: 0, glance: 0, time: 0 };
  const ctrl = Array.from({ length: N_CTRL }, () => new THREE.Vector3());
  const ctrlB = Array.from({ length: N_CTRL }, () => new THREE.Vector3());
  const curve = new THREE.CatmullRomCurve3(ctrl, false, 'centripetal');
  const frames = Array.from({ length: RINGS }, () => ({ p: new THREE.Vector3(), T: new THREE.Vector3(), S: new THREE.Vector3(), N: new THREE.Vector3(), r: 1 }));

  function poseInto(pose, out, time) {
    for (let i = 0; i < N_CTRL; i++) {
      const t = i / (N_CTRL - 1), s = t * L, v = out[i], r = radiusAt(t);
      if (pose === 'coil') {
        const th = t * 4.1, rho = 2.9 - 0.9 * t;
        v.set(-2.9 + rho * Math.cos(th), r * 0.85 + 1.9 * Math.pow(Math.max(0, 1 - t / 0.28), 1.6), -rho * Math.sin(th));
      } else if (pose === 'fly') {
        v.set(0.3 * Math.sin(time * 2 - s * 0.6) * ss(s, 0, 2) + st.bank * s * s * 0.035,
          0.45 * Math.sin(time * 2.5 - s * 0.62) * ss(s, 0, 2.5) - st.climb * s * 0.06, -s * 0.97);
      } else { // rest: lying in a soft S, head up
        v.set(1.7 * Math.sin(s * 0.42) * ss(s, 0, 3), r * 0.85 + 1.7 * Math.pow(Math.max(0, 1 - t / 0.3), 1.5), -s * 0.88);
      }
    }
  }

  function update(dt, time) {
    st.time = time;
    st.blend = Math.min(1, st.blend + dt * 1.2);
    st.wiggle = Math.max(0, st.wiggle - dt * 0.55);
    st.glow += (st.glowTarget - st.glow) * Math.min(1, dt * 2.5);
    st.happy = Math.max(0, st.happy - dt * 0.4);
    const w = ss(st.wiggle, 0, 0.5);
    poseInto(st.pose, ctrl, time);
    if (st.blend < 1) { poseInto(st.prevPose, ctrlB, time); const b = ss(st.blend, 0, 1); for (let i = 0; i < N_CTRL; i++) ctrl[i].lerpVectors(ctrlB[i], ctrl[i], b); }
    const breath = Math.sin(time * 1.7);
    for (let i = 0; i < N_CTRL; i++) {
      const t = i / (N_CTRL - 1), s = t * L, v = ctrl[i];
      if (st.pose !== 'fly') v.x += Math.sin(time * 1.3 - s * 0.7) * 0.1 * (0.2 + t);
      v.x += ss(t, 0.72, 1) * Math.sin(time * 2.1) * 0.55;
      v.y += ss(t, 0.8, 1) * (0.3 + 0.15 * Math.sin(time * 1.6));
      v.y += 0.06 * breath * (1 - t);
      // happy wiggle: fast travelling wave + bouncing head
      v.x += Math.sin(time * 10 - s * 1.1) * 0.55 * w * (0.1 + t);
      v.y += Math.abs(Math.sin(time * 7.5)) * 0.45 * w * Math.pow(1 - t, 2);
    }
    curve.updateArcLengths();
    // rings
    const P = tubeGeo.attributes.position.array; let prevS = null;
    for (let j = 0; j < RINGS; j++) {
      const u = j / (RINGS - 1), f = frames[j];
      curve.getPointAt(u, f.p); curve.getTangentAt(u, f.T);
      f.S.crossVectors(UP, f.T); if (f.S.lengthSq() < 1e-4) f.S.copy(prevS || new THREE.Vector3(1, 0, 0)); f.S.normalize(); prevS = f.S;
      f.N.crossVectors(f.T, f.S).normalize();
      const bellyBreath = 1 + 0.045 * breath * Math.sin(Math.PI * ss(u, 0.05, 0.75));
      const r = f.r = radiusAt(u) * bellyBreath;
      for (let k = 0; k <= RAD; k++) {
        const a = -Math.PI / 2 + k / RAD * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
        const rx = r * 1.06, ry = r * (s < 0 ? 0.8 : 0.95), o = (j * (RAD + 1) + k) * 3;
        P[o] = f.p.x + f.S.x * c * rx + f.N.x * s * ry;
        P[o + 1] = f.p.y + f.S.y * c * rx + f.N.y * s * ry;
        P[o + 2] = f.p.z + f.S.z * c * rx + f.N.z * s * ry;
      }
    }
    tubeGeo.attributes.position.needsUpdate = true; tubeGeo.computeVertexNormals();
    const last = frames[RINGS - 1]; tailTip.position.copy(last.p);
    // spikes
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), dir = new THREE.Vector3(), sc = new THREE.Vector3();
    for (let i = 0; i < SPK; i++) {
      const u = 0.07 + i / (SPK - 1) * 0.78, j = Math.round(u * (RINGS - 1)), f = frames[j];
      dir.copy(f.N).addScaledVector(f.T, 0.55).normalize(); q.setFromUnitVectors(UP, dir);
      const r = f.r; sc.setScalar(0.45 + r * 0.75);
      m.compose(f.p.clone().addScaledVector(f.N, r * 0.88), q, sc); spikes.setMatrixAt(i, m);
    }
    spikes.instanceMatrix.needsUpdate = true;
    // head placement + look-at
    const f0 = frames[0]; const fwd = f0.T.clone().negate();
    head.position.copy(f0.p).addScaledVector(fwd, 0.3).addScaledVector(f0.N, 0.25);
    let lookDir = fwd.clone(); lookDir.y *= 0.3; lookDir.normalize();
    if (st.look) {
      const local = root.worldToLocal(st.look.clone()).sub(head.position).normalize();
      if (local.dot(fwd) > -0.2) { lookDir.lerp(local, 0.75); lookDir.y = Math.max(-0.5, Math.min(0.4, lookDir.y)); lookDir.normalize(); }
    }
    // glance back over his shoulder at the rider (flight): overrides look-at for a moment
    st.glance = Math.max(0, st.glance - dt);
    if (st.glance > 0) { lookDir.copy(fwd).applyAxisAngle(UP, -1.92); lookDir.y = 0.14; lookDir.normalize(); }
    if (!head.userData.dir) head.userData.dir = lookDir.clone();
    head.userData.dir.lerp(lookDir, Math.min(1, dt * (st.glance > 0 ? 5 : 3))).normalize();
    root.updateMatrixWorld(); head.lookAt(root.localToWorld(head.position.clone().add(head.userData.dir)));
    head.rotateX(0.14 - 0.1 * st.climb);
    head.rotateZ(Math.sin(time * 6) * 0.22 * w + Math.sin(time * 0.9) * 0.05 + st.bank * -0.2);
    // blink / squint / mouth / fins
    st.blinkT -= dt; if (st.blinkT < 0) { st.blink = 1; st.blinkT = 2.5 + Math.random() * 3; }
    st.blink = Math.max(0, st.blink - dt * 7);
    const squint = 0;
    const close = Math.max(Math.sin(st.blink * Math.PI), squint);
    for (const lid of lids) lid.rotation.x = lerp(-1.05, Math.PI / 2, close);
    st.chomp = Math.max(0, st.chomp - dt);
    const chompOpen = st.chomp > 0 ? Math.abs(Math.sin(st.chomp * 9)) * 0.6 : 0;
    // happy face: lower lids rise into ^^ smiling eyes, cheeks puff up, wider open smile (upper lids stay open: never sleepy)
    st.smile += (Math.max(w, ss(st.happy, 0, 0.45)) - st.smile) * Math.min(1, dt * 9);
    const hs = st.smile;
    for (const low of lowLids) { low.visible = hs > 0.02; low.position.set(0, lerp(-0.5, -0.285, hs), lerp(0.05, 0.16, hs)); low.scale.setScalar(lerp(0.6, 1, hs)); }
    cheeks.forEach((c, i) => { const sx = i ? 1 : -1; c.position.set(sx * (0.6 + 0.09 * hs), -0.12 + 0.08 * hs, 0.98 + 0.1 * hs); c.scale.set(1 + 0.35 * hs, 0.6 + 0.3 * hs, 0.35 + 0.12 * hs); c.material.opacity = 0.4 + 0.25 * hs; });
    smile.scale.setScalar(0.75 + 0.2 * hs);
    const mouth = Math.max(st.mouth, chompOpen, w * 0.2 + hs * 0.28);
    jawPivot.rotation.x = mouth * 0.5; tongue.visible = mouth > 0.05;
    fins.forEach((fn, i) => { const sx = i ? 1 : -1; fn.rotation.z = sx * (-1.1 + Math.sin(time * 2.2 + i) * 0.08 + w * Math.sin(time * 14) * 0.3); });
    // glow
    irisM.emissiveIntensity = st.glow * 2.5; glowLight.intensity = st.glow * 4;
    eyeGlows.forEach(g => { g.material.opacity = st.glow * 0.7; g.scale.setScalar(0.8 + 0.15 * Math.sin(time * 5)); });
  }

  const api = {
    root, head, hitMeshes: [body, cranium, muzzle], state: st,
    setPose(p) { if (p === st.pose) return; st.prevPose = st.pose; st.pose = p; st.blend = 0; },
    wiggle(amount = 1.6) { st.wiggle = Math.max(st.wiggle, amount); st.happy = 1; },
    chomp() { st.chomp = 1.4; st.happy = 1; },
    openMouth(v) { st.mouth = v; },
    setGlow(on) { st.glowTarget = on ? 1 : 0; },
    lookAt(v) { st.look = v ? v.clone() : null; },
    glanceBack(sec = 1) { st.glance = sec; },
    // local-space frame at body fraction u (for riders / effects)
    frameAt(u) { return frames[Math.round(clamp(u, 0, 1) * (RINGS - 1))]; },
    seatWorld(u, out = new THREE.Vector3()) { const f = frames[Math.round(u * (RINGS - 1))]; return root.localToWorld(out.copy(f.p).addScaledVector(f.N, f.r * 0.9)); },
    mouthWorld(out = new THREE.Vector3()) { return headInner.localToWorld(out.set(0, -0.2, 1.3)); },
    headWorld(out = new THREE.Vector3()) { return head.getWorldPosition(out); },
    update,
  };
  update(0, 0);
  return api;
}
