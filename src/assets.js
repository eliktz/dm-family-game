// Optional GLB swap-in (asset pipeline: /workspace/dmgame-assets → assets/models/).
// The game is fully playable with zero models. `assets/models/models.json` is consulted first; a
// character listed there gets its GLB, every other one keeps its procedural rig.
//
// Robustness: a missing / empty / invalid manifest means "all procedural" (no errors); a GLB that
// fails to load or times out only warns and that character stays procedural.
//
// Accepted manifest shapes (keys, case-insensitive: worm, drake, griffith, king, castle, bo, waterDragon, babyDragon;
// keys starting with "_" are ignored):
//   { "worm": "worm.glb" }                                   bare file name → assets/models/worm.glb
//   { "worm": { "url": "assets/models/worm.glb", "scale": 1, "y": 0, "rotY": 0 } }
//   { "models": { ... } }   or   [ { "name": "worm", "url": "…" }, … ]
// Entry options: url|file|path|src, scale (number or [x,y,z]), height (auto-scale to this height in
// metres), ground (true → feet on y = 0), y or position [x,y,z], rotY (radians) or rotYDeg or
// rotation [x,y,z], clips { wiggle: "ExactClipName", … } to map clip names explicitly.
// Convention (same as the procedural rigs): origin at the feet / belly, facing +z, 1 unit = 1 m.
//
// The procedural rig keeps running invisibly under a GLB, so game logic (seat, mouth and head
// positions, look-at targets) is unchanged. Each swapped model gets a small driver that maps game
// state to clips (idle / fly|glide / coil / wiggle|happy|cheer / chomp / walk / sit / wave / talk; names match
// case-insensitively and crossfade) and falls back to bobbing and scaling the model when a clip is missing.
// With a rigged dragon the head look-at, jaw, eye glow, seat and tap target are driven from its bones.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { glowSprite } from './tex.js';

const MANIFEST = 'assets/models/models.json', DIR = 'assets/models/', TIMEOUT_MS = 30000;
const ALIASES = {
  idle: ['idle', 'rest', 'breath', 'stand'], wiggle: ['wiggle', 'happy', 'cheer', 'joy', 'dance', 'jump'], chomp: ['chomp', 'eat', 'bite', 'hiccup'], shy: ['shy'], happy: ['happy', 'cheer'], cheer: ['cheer', 'happy'], talk: ['talk'], pet: ['pet'],
  fly: ['fly', 'glide', 'float', 'hover'], coil: ['coil', 'curl', 'sleep'], walk: ['walk', 'run'], sit: ['sit', 'ride'], wave: ['wave', 'greet', 'hello'],
};
const ss = THREE.MathUtils.smoothstep, clamp = THREE.MathUtils.clamp;
// Code-side fit for the delivered HD models (HANDOFF.md: facing +Z, feet at the origin, Worm ~3.2 m long, Drake 1.35 m).
// The game world was built around a much bigger procedural Worm and ~1.85 m chibi people, so the models are scaled up here
// (the manifest belongs to the asset pipeline and stays untouched; its own `scale` multiplies these).
// The water dragons' rig roots are themselves scaled by the chapter (Shu 0.8, the baby 0.48), so their fit compensates:
// Shu ends up about 9.5 m long (Worm's size), the baby about 1.25 m long and 0.65 m tall (tiny next to Bo, big enough to read on a phone).
// `coil`: offset (rig units) while the rig is in its coiled pose, whose centre is 2.9 units beside the head (the baby inside her shell).
const FIT = { worm: { scale: 2.8 }, drake: { scale: 1.3 }, griffith: { scale: 1.3 }, king: { scale: 1.3 }, bo: { scale: 1.3 }, waterDragon: { scale: 3.1 }, babyDragon: { scale: 2.7, coil: [-2.9, 0, 0.5] },
  ana: { scale: 1.3 }, sunDragon: { scale: 3.1, glow: 0xffc850 },
  rori: { scale: 1.3 }, fireDragon: { scale: 3.1 }, petra: { scale: 1.3 },
  crystalDragon: { scale: 3.5 } };   // about 4.5 m long on his 0.62-scaled rig: clearly smaller and shyer than Worm (about 9 m)   // Kepri: about 8.5 m long on her 0.9-scaled rig; her glow is sun-gold, not Worm's green
const CURL_SPINE = 0.28, CURL_TAIL = 0.2; // radians per joint: about 210° in all, a C that stays open toward the camera
const CURL_AT = new THREE.Vector3(-3.6, 0, 0), CURL_HEAD_ANG = 0.3; // rig-local: what he curls around, and where his head sits on that circle
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
const _q = new THREE.Quaternion(), _pq = new THREE.Quaternion(), _rq = new THREE.Quaternion(), _v = new THREE.Vector3();
// rotate a bone by `ang` around an axis given in the model root's space, whatever the bone's own axes are
function turnBone(bone, rootObj, axis, ang) {
  if (!bone || !ang) return;
  rootObj.getWorldQuaternion(_rq); _q.setFromAxisAngle(axis, ang); _q.premultiply(_rq).multiply(_rq.invert()); // world-space delta
  bone.parent.getWorldQuaternion(_pq); bone.quaternion.premultiply(_q.premultiply(_pq.clone().invert()).multiply(_pq)); bone.updateMatrixWorld(true);
}

function entriesOf(manifest) {
  let m = manifest; if (!m || typeof m !== 'object') return {};
  if (m.models && typeof m.models === 'object') m = m.models;
  const out = {};
  const put = (k, v) => { if (typeof v === 'string') v = { url: v }; if (k && v && typeof v === 'object') out[String(k).toLowerCase()] = v; };
  if (Array.isArray(m)) for (const e of m) put(e && (e.key ?? e.name ?? e.id), e);
  else for (const [k, v] of Object.entries(m)) if (!k.startsWith('_')) put(k, v);
  return out;
}
function urlOf(e) {
  const u = e.url ?? e.file ?? e.path ?? e.src ?? e.glb; if (!u || typeof u !== 'string') return null;
  return /^(https?:)?\/\//.test(u) || u.includes('/') ? u : DIR + u;
}
async function readManifest() {
  try {
    const res = await fetch(MANIFEST, { cache: 'no-cache' }); if (!res.ok) return {};
    const txt = (await res.text()).trim(); if (!txt) return {};
    return entriesOf(JSON.parse(txt));
  } catch { return {}; }
}
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

function place(obj, e, fit = 1) {
  if (Array.isArray(e.scale)) obj.scale.set(...e.scale); else obj.scale.setScalar(+e.scale || 1);
  obj.scale.multiplyScalar(fit);
  if (Array.isArray(e.rotation)) obj.rotation.set(...e.rotation); else obj.rotation.y = e.rotYDeg != null ? THREE.MathUtils.degToRad(+e.rotYDeg) : +e.rotY || 0;
  if (e.height || e.ground) {
    obj.updateMatrixWorld(true); const box = new THREE.Box3().setFromObject(obj), h = box.max.y - box.min.y;
    if (e.height && h > 1e-4) obj.scale.multiplyScalar(+e.height / h);
    if (e.ground) { obj.updateMatrixWorld(true); obj.position.y = -new THREE.Box3().setFromObject(obj).min.y; }
  }
  if (Array.isArray(e.position)) obj.position.add(new THREE.Vector3(...e.position)); else obj.position.y += +e.y || 0;
}

function makeSwap(key, t, gltf, e) {
  const obj = gltf.scene, mixer = gltf.animations.length ? new THREE.AnimationMixer(obj) : null;
  const byName = new Map(gltf.animations.map(a => [a.name.toLowerCase(), a]));
  const explicit = e.clips && typeof e.clips === 'object' ? e.clips : {};
  const find = name => {
    if (explicit[name] && byName.has(String(explicit[name]).toLowerCase())) return byName.get(String(explicit[name]).toLowerCase());
    const names = ALIASES[name] ?? [name];
    for (const n of names) if (byName.has(n)) return byName.get(n);
    for (const n of names) for (const [k, c] of byName) if (k.includes(n)) return c; // e.g. "Armature|Idle"
    return null;
  };
  let loopName = null, loopAct = null, shotAct = null;
  const has = name => !!(mixer && find(name));
  function loop(names) { // first available of `names` becomes the looping base clip
    if (!mixer) return; const name = names.find(has); if (!name || name === loopName) return;
    const act = mixer.clipAction(find(name)); act.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.35).play();
    if (loopAct) loopAct.fadeOut(0.35); loopAct = act; loopName = name;
  }
  function once(name) { // one-shot on top of the base loop; false when the model has no such clip
    if (!has(name)) return false;
    if (shotAct) shotAct.fadeOut(0.15);
    shotAct = mixer.clipAction(find(name)); shotAct.reset().setLoop(THREE.LoopOnce, 1); shotAct.clampWhenFinished = true; shotAct.fadeIn(0.15).play();
    return true;
  }
  if (mixer) mixer.addEventListener('finished', ev => { if (ev.action === shotAct) { shotAct.fadeOut(0.25); shotAct = null; } });

  const prev = {}; const rose = (k, v, d = 0.2) => { const r = v > (prev[k] ?? 0) + d; prev[k] = v; return r; };
  const bones = {}; obj.traverse(o => { if (o.isBone) bones[o.name.toLowerCase()] = o; });
  const B = (...names) => { for (const n of names) if (bones[n]) return bones[n]; return null; };
  const rest = new Map(); const posed = (...bs) => { for (const b of bs) if (b) rest.set(b, b.quaternion.clone()); return bs; };
  const meshes = []; obj.traverse(o => { if (o.isMesh) meshes.push(o); });
  const emi = re => { const out = []; obj.traverse(o => { for (const m of [].concat(o.material || [])) if (re.test(m.name || '') && m.emissive && !out.includes(m)) { m.userData.base = m.emissiveIntensity; out.push(m); } }); return out; };
  const isDragon = !!(t.state && 'pose' in t.state); // Worm and every dragon built on his rig
  const S = obj.scale.y;
  let halo = null, eyeMats = [], stoneMats = [], headB = null, jawB = null, neck = [], seatB = null, procHead = null, legs = null, yawOff = 0, flyDrop = 0, curlK = 0, coilK = 0, spineB = [], tailB = [];
  const coilAt = FIT[key]?.coil || null;
  if (isDragon) {
    // the invisible procedural rig keeps running for game logic; its head sits at the rig origin, so the model's head goes there too
    headB = B('head'); jawB = B('jaw'); neck = posed(B('neck1', 'neck_01', 'neck'), B('neck2', 'neck_02'), headB).filter(Boolean); posed(jawB); seatB = B('spine4', 'chest', 'spine3', 'spine_03');
    // spine and tail joints, for the code-side 'curl' pose (a C around the egg) on top of the Idle clip
    spineB = posed(...['spine1', 'spine2', 'spine3', 'spine4', 'chest', 'neck1'].map(n => B(n))).filter(Boolean);
    tailB = posed(...Array.from({ length: 10 }, (_, i) => B('tail' + (i + 2)))).filter(Boolean);
    obj.updateMatrixWorld(true);
    if (headB) { const hz = (jawB || headB).getWorldPosition(_v).z; obj.position.z -= hz; }
    // Dragon-Stone glow: the model's own emissive eye material when it has one, plus a soft green halo
    const glowCol = FIT[key]?.glow ?? 0x3dff7a;
    eyeMats = emi(/^emi_.*eye/i); if (!eyeMats.length) eyeMats = emi(/eye|iris/i); if (!eyeMats.length && FIT[key]?.glow) eyeMats = emi(/gloss/i); // no glow material: light the glossy eyes
    for (const m of eyeMats) if (m.emissive.getHex() === 0) { m.emissive.set(glowCol); m.userData.base = m.emissiveIntensity = 0; }
    halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowSprite('rgba(120,255,160,1)', 'rgba(60,255,120,0)'), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 }));
    halo.scale.setScalar(eyeMats.length ? 2.2 : 3.2); halo.visible = false; t.root.add(halo); if (FIT[key]?.glow) halo.material.color.set(glowCol);
    if (headB) {
      // game-facing anchors now come from the model: head / mouth / seat positions, the tap target and the layout box
      procHead = t.head; const proxy = new THREE.Group(); proxy.scale.setScalar(0.3 * S); t.root.add(proxy); t.head = proxy;
      t.headWorld = (out = new THREE.Vector3()) => headB.getWorldPosition(out).add(_v.set(0, 0.12 * S, 0));
      t.mouthWorld = (out = new THREE.Vector3()) => (jawB || headB).getWorldPosition(out).add(_v.set(0, -0.02 * S, 0.14 * S).applyQuaternion(t.root.getWorldQuaternion(_rq)));
      if (seatB) t.seatWorld = (u, out = new THREE.Vector3()) => u < 0.25 ? seatB.getWorldPosition(out).add(_v.set(0, 0.2 * S, -0.08 * S).applyQuaternion(t.root.getWorldQuaternion(_rq)))
        : t.root.localToWorld(out.set(0, obj.position.y + 0.4 * S, obj.position.z + (1.2 - u * 3.0) * S));
      if (t.hitMeshes) t.hitMeshes.splice(0, t.hitMeshes.length, ...meshes);
      if (t.state) t.state.proxy = true; // the procedural tube no longer needs to deform
    }
  } else if (key !== 'castle') {
    stoneMats = emi(/^emi_/i);
    // no "sit" clip: riding pose from the leg bones
    const L = { thighL: B('thigh_l'), thighR: B('thigh_r'), calfL: B('calf_l'), calfR: B('calf_r') };
    if (L.thighL && L.thighR) { legs = L; posed(L.thighL, L.thighR, L.calfL, L.calfR); }
  }
  const base = { pos: obj.position.clone(), scale: obj.scale.clone(), rz: obj.rotation.z, ry: obj.rotation.y };
  let sitK = 0;
  function update(dt, time) {
    const s = t.state || {}; let bob = 0, sway = 0, squash = 0, drop = 0;
    for (const [b, q] of rest) b.quaternion.copy(q); // bones we pose by hand start from rest; clips then overwrite the ones they animate
    if (isDragon) {
      loop(s.shy ? ['shy', 'idle'] : s.pose === 'fly' ? ['fly', 'idle'] : s.pose === 'coil' ? ['coil', 'idle'] : ['idle']); // shy: a held, tucked pose (crystal dragon)
      const w = ss(s.wiggle || 0, 0, 0.5);
      if (rose('wiggle', s.wiggle || 0)) once('wiggle');
      if (rose('chomp', s.chomp || 0)) once('chomp') || once('happy');
      if (!has('wiggle')) { bob = Math.abs(Math.sin(time * 7.5)) * 0.25 * w; sway = Math.sin(time * 10) * 0.1 * w; squash = Math.sin(time * 15) * 0.05 * w; }
      if (!has('idle')) squash += Math.sin(time * 1.7) * 0.012; // breathing
      // pose offsets: curled beside the egg he lies at an angle; in flight the rig origin is his body centre, not his feet
      const k = Math.min(1, dt * 3);
      curlK += ((s.pose === 'curl' && spineB.length ? 1 : 0) - curlK) * Math.min(1, dt * 1.6); yawOff = 0; flyDrop += ((s.pose === 'fly' && seatB ? 0.34 * S : 0) - flyDrop) * k; drop = flyDrop;
    } else if (key !== 'castle') {
      const walk = Math.min(1, s.walk || 0), sit = s.sit || 0, wave = s.wave || 0;
      loop(sit > 0.5 ? ['sit', 'idle'] : walk > 0.1 ? ['walk', 'idle'] : ['idle']);
      if (rose('wave', wave)) (wave >= 2.8 && once('cheer')) || once('wave');
      if (!has('walk')) bob = Math.abs(Math.sin(time * 9)) * 0.05 * walk;
      if (!has('wave') && wave > 0) sway = Math.sin(time * 12) * 0.08;
      sitK += ((sit > 0.5 ? 1 : 0) - sitK) * Math.min(1, dt * 6);
      if (!has('sit')) drop = legs ? sitK * 0.52 * S : sit * 0.45;
      for (const m of stoneMats) m.emissiveIntensity = (m.userData.base ?? 1) * (1 + (s.stone || 0) * 3) * (m.name.toLowerCase().includes('gem') ? 1 + 0.25 * Math.sin(time * 3) : 1);
    }
    obj.position.x = base.pos.x; obj.position.z = base.pos.z;
    if (coilAt) { coilK += ((s.pose === 'coil' ? 1 : 0) - coilK) * Math.min(1, dt * 4); obj.position.x += coilAt[0] * coilK; obj.position.z += coilAt[2] * coilK; }
    obj.position.y = base.pos.y + bob - drop; obj.rotation.z = base.rz + sway; obj.rotation.y = base.ry + yawOff;
    obj.scale.set(base.scale.x * (1 - squash * 0.5), base.scale.y * (1 + squash), base.scale.z * (1 - squash * 0.5));
    mixer?.update(dt);
    if (isDragon && headB) {
      obj.updateMatrixWorld(true);
      if (curlK > 0.002) { // bend spine and tail into a C, then put the head back at the rig origin (it faces the same way as before)
        for (const b of spineB) turnBone(b, obj, Y, -CURL_SPINE * curlK);
        for (const b of tailB) turnBone(b, obj, Y, CURL_TAIL * curlK);
        // put the circle through head, hips and tail tip around CURL_AT, head on the near side, tail wrapping the far side
        const tip = tailB[tailB.length - 1], hips = spineB[0].parent, loc = b => t.root.worldToLocal(b.getWorldPosition(new THREE.Vector3()));
        const centre = () => { t.root.updateMatrixWorld(true); obj.updateMatrixWorld(true); const A = loc(jawB || headB), Bp = loc(hips), C = loc(tip);
          const d = 2 * (A.x * (Bp.z - C.z) + Bp.x * (C.z - A.z) + C.x * (A.z - Bp.z)) || 1e-6, a2 = A.x * A.x + A.z * A.z, b2 = Bp.x * Bp.x + Bp.z * Bp.z, c2 = C.x * C.x + C.z * C.z;
          return { c: new THREE.Vector3((a2 * (Bp.z - C.z) + b2 * (C.z - A.z) + c2 * (A.z - Bp.z)) / d, 0, (a2 * (C.x - Bp.x) + b2 * (A.x - C.x) + c2 * (Bp.x - A.x)) / d), A }; };
        let f = centre(); const ang = Math.atan2(f.A.z - f.c.z, f.A.x - f.c.x) - CURL_HEAD_ANG;
        obj.rotation.y += ang * curlK; f = centre();
        obj.position.x += (CURL_AT.x - f.c.x) * curlK; obj.position.z += (CURL_AT.z - f.c.z) * curlK; obj.updateMatrixWorld(true);
        if (curlK < 0.999) { t.root.worldToLocal((jawB || headB).getWorldPosition(_v)); obj.position.x -= _v.x * (1 - curlK); obj.position.z -= _v.z * (1 - curlK); obj.updateMatrixWorld(true); }
      }
      // look-at: follow the procedural rig's smoothed look direction (rig-local), spread over the neck bones
      const d = procHead?.userData.dir;
      const hd = t.root.worldToLocal((jawB || headB).getWorldPosition(new THREE.Vector3())).sub(t.root.worldToLocal(neck[0].getWorldPosition(_v))), headYaw = Math.atan2(hd.x, hd.z); // which way the head points now
      if (d && neck.length) { const yaw = clamp(wrap(Math.atan2(d.x, d.z) - headYaw), -1.3, 1.3), pitch = clamp(Math.asin(clamp(d.y, -1, 1)), -0.5, 0.5);
        for (const b of neck) { turnBone(b, obj, Y, yaw / neck.length); turnBone(b, obj, X, -pitch / neck.length); } }
      if (jawB && !has('chomp')) turnBone(jawB, obj, X, (s.jaw || 0) * 0.45);
      const g = s.glow || 0; halo.visible = g > 0.01; halo.material.opacity = g * (eyeMats.length ? 0.35 : 0.6);
      t.root.worldToLocal(headB.getWorldPosition(t.head.position)); halo.position.copy(t.head.position);
      for (const m of eyeMats) m.emissiveIntensity = (m.userData.base || 0) + g * 3;
    } else if (isDragon) { const g = s.glow || 0; halo.visible = g > 0.01; halo.material.opacity = g * 0.6; if (t.head) halo.position.copy(t.head.position); for (const m of eyeMats) m.emissiveIntensity = (m.userData.base || 0) + g * 2; }
    if (legs && sitK > 0.01) { // seated astride: thighs forward and apart, shins down
      obj.updateMatrixWorld(true);
      for (const [th, ca, sx] of [[legs.thighL, legs.calfL, 1], [legs.thighR, legs.calfR, -1]]) { turnBone(th, obj, X, -1.25 * sitK); turnBone(th, obj, Y, sx * 0.55 * sitK); turnBone(ca, obj, X, 1.3 * sitK); }
    }
  }
  loop(['idle']);
  return { obj, mixer, clips: Object.fromEntries(byName), has, loop, once, play: once, update, get current() { return loopName; } };
}

export async function loadModels(targets) {
  const manifest = await readManifest(), out = {};
  const jobs = Object.entries(targets).filter(([key]) => manifest[key.toLowerCase()] && urlOf(manifest[key.toLowerCase()]));
  if (!jobs.length) return out;
  const loader = new GLTFLoader();
  await Promise.all(jobs.map(async ([key, t]) => {
    const e = manifest[key.toLowerCase()], url = urlOf(e);
    try {
      const gltf = await withTimeout(loader.loadAsync(url), TIMEOUT_MS);
      const obj = gltf.scene; place(obj, e, FIT[key]?.scale ?? 1);
      obj.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; if (o.isSkinnedMesh) o.frustumCulled = false; } });
      const swap = makeSwap(key, t, gltf, e);
      // only now hide the procedural visual; its root (and invisible rig) keeps driving positions and game logic
      for (const c of t.root.children) c.visible = false;
      t.root.add(obj); out[key] = swap;
    } catch (err) { console.warn(`[models] ${key}: could not load ${url} (${err?.message || err}); keeping the procedural model`); }
  }));
  return out;
}
export const modelStatus = (keys, swapped) => Object.fromEntries(keys.map(k => [k, swapped[k] ? 'glb' : 'procedural']));
