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
// state to clips (idle / fly / coil / wiggle|happy / chomp / walk / sit / wave) and falls back to
// bobbing and scaling the model when a clip is missing.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { glowSprite } from './tex.js';

const MANIFEST = 'assets/models/models.json', DIR = 'assets/models/', TIMEOUT_MS = 30000;
const ALIASES = {
  idle: ['idle', 'rest', 'breath', 'stand'], wiggle: ['wiggle', 'happy', 'joy', 'dance', 'jump'], chomp: ['chomp', 'eat', 'bite'],
  fly: ['fly', 'glide', 'float', 'hover'], coil: ['coil', 'curl', 'sleep'], walk: ['walk', 'run'], sit: ['sit', 'ride'], wave: ['wave', 'greet', 'hello'],
};
const ss = THREE.MathUtils.smoothstep;

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

function place(obj, e) {
  if (Array.isArray(e.scale)) obj.scale.set(...e.scale); else obj.scale.setScalar(+e.scale || 1);
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
    const act = mixer.clipAction(find(name)); act.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.25).play();
    if (loopAct) loopAct.fadeOut(0.25); loopAct = act; loopName = name;
  }
  function once(name) { // one-shot on top of the base loop; false when the model has no such clip
    if (!has(name)) return false;
    if (shotAct) shotAct.fadeOut(0.15);
    shotAct = mixer.clipAction(find(name)); shotAct.reset().setLoop(THREE.LoopOnce, 1); shotAct.clampWhenFinished = true; shotAct.fadeIn(0.15).play();
    return true;
  }
  if (mixer) mixer.addEventListener('finished', ev => { if (ev.action === shotAct) { shotAct.fadeOut(0.25); shotAct = null; } });

  const base = { pos: obj.position.clone(), scale: obj.scale.clone(), rz: obj.rotation.z };
  const prev = {}; const rose = (k, v, d = 0.2) => { const r = v > (prev[k] ?? 0) + d; prev[k] = v; return r; };
  // fallback Dragon-Stone glow for a GLB Worm: green halo at the head + emissive on eye-named materials
  let halo = null; const eyeMats = [];
  const isDragon = !!(t.state && 'pose' in t.state); // Worm and every dragon built on his rig
  if (isDragon) {
    halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowSprite('rgba(120,255,160,1)', 'rgba(60,255,120,0)'), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 }));
    halo.scale.setScalar(3.2); halo.visible = false; t.root.add(halo);
    obj.traverse(o => { for (const m of [].concat(o.material || [])) if (/eye|iris/i.test(m.name || '') && m.emissive && !eyeMats.includes(m)) { m.userData.baseEmissive = m.emissiveIntensity; eyeMats.push(m); } });
  }
  function update(dt, time) {
    const s = t.state || {}; let bob = 0, sway = 0, squash = 0, drop = 0;
    if (isDragon) {
      loop(s.pose === 'fly' ? ['fly', 'idle'] : s.pose === 'coil' ? ['coil', 'idle'] : ['idle']);
      const w = ss(s.wiggle || 0, 0, 0.5);
      if (rose('wiggle', s.wiggle || 0)) once('wiggle');
      if (rose('chomp', s.chomp || 0)) once('chomp');
      if (!has('wiggle')) { bob = Math.abs(Math.sin(time * 7.5)) * 0.25 * w; sway = Math.sin(time * 10) * 0.1 * w; squash = Math.sin(time * 15) * 0.05 * w; }
      if (!has('idle')) squash += Math.sin(time * 1.7) * 0.012; // breathing
      const g = s.glow || 0; halo.visible = g > 0.01; halo.material.opacity = g * 0.6; if (t.head) halo.position.copy(t.head.position);
      for (const m of eyeMats) m.emissiveIntensity = (m.userData.baseEmissive || 0) + g * 2;
    } else if (key !== 'castle') {
      const walk = Math.min(1, s.walk || 0), sit = s.sit || 0, wave = s.wave || 0;
      loop(sit > 0.5 ? ['sit', 'idle'] : walk > 0.1 ? ['walk', 'idle'] : ['idle']);
      if (rose('wave', wave)) once('wave');
      if (!has('walk')) bob = Math.abs(Math.sin(time * 9)) * 0.05 * walk;
      if (!has('wave') && wave > 0) sway = Math.sin(time * 12) * 0.08;
      if (!has('sit')) drop = sit * 0.45;
    }
    obj.position.y = base.pos.y + bob - drop; obj.rotation.z = base.rz + sway;
    obj.scale.set(base.scale.x * (1 - squash * 0.5), base.scale.y * (1 + squash), base.scale.z * (1 - squash * 0.5));
    mixer?.update(dt);
  }
  loop(['idle']);
  return { obj, mixer, clips: Object.fromEntries(byName), has, loop, once, play: once, update };
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
      const obj = gltf.scene; place(obj, e);
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
