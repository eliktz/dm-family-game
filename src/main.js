// מאסטרים של דרקונים — the shared core: scenes, actors, the cancellable story runner, the cave and
// flight engines, the title screen with chapter progress, and the render loop.
// The chapter scripts live in src/chapters/chN.js and get everything they need through `G`.
import * as THREE from 'three';
import { Engine } from './engine.js';
import { createWorm } from './worm.js';
import { makeDrake, makeGriffith, makeKing } from './people.js';
import { buildOutdoor, buildStars, heightAt, PLATEAU } from './outdoor.js';
import { buildCave, GATE_POS } from './cave.js';
import { FX } from './fx.js';
import { ui, say, toast, hideToast, actions, clearActions, showJoy, input, riddle, riddleMissing, card, hideOverlays, fade } from './ui.js';
import { sfx, unlock, settings, save, music } from './audio.js';
import { glowSprite } from './tex.js';
import { loadModels, modelStatus } from './assets.js';
import { chapter1 } from './chapters/ch1.js';
import { chapter2 } from './chapters/ch2.js';

const $ = s => document.querySelector(s);
const params = new URLSearchParams(location.search);
const engine = new Engine($('#c'));
const cam = engine.camera;
const fx = new FX();
const timer = new THREE.Timer();
let time = 0;

// ---------------------------------------------------------------- scenes + shared actors
const outdoor = new THREE.Scene(), caveScene = new THREE.Scene();
const world = buildOutdoor(); outdoor.add(world.group);
const stars = buildStars(8); outdoor.add(stars.group);
const FOG = { color: 0xcfdcea, near: 140, far: 560 };
outdoor.fog = new THREE.Fog(FOG.color, FOG.near, FOG.far);
const sun = new THREE.DirectionalLight(0xfff0d2, 3.0); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 260 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
outdoor.add(sun, sun.target);
outdoor.add(new THREE.HemisphereLight(0xcfe6ff, 0x5a7a3a, 0.7));
const cave = buildCave(); caveScene.add(cave.group);
caveScene.background = new THREE.Color(0x2b1a10); caveScene.fog = new THREE.Fog(0x2b1a10, 30, 60);

const worm = createWorm();
const drake = makeDrake(), griffith = makeGriffith(), king = makeKing();
caveScene.add(griffith.root); outdoor.add(king.root);
king.root.position.set(0, PLATEAU + 7.0, 15.6); king.root.scale.setScalar(1.7);
// cave marker (bouncing gold arrow over whatever the kid should go to / tap next)
const marker = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.9, 20).rotateX(Math.PI), new THREE.MeshStandardMaterial({ color: 0xffd34a, emissive: 0xffa41a, emissiveIntensity: 1.5, metalness: 0.4, roughness: 0.3 }));
caveScene.add(marker); marker.visible = false;
// floating apple for feeding
const apple = new THREE.Group();
apple.add(new THREE.Mesh(new THREE.SphereGeometry(0.28, 24, 16), new THREE.MeshPhysicalMaterial({ color: 0xe0282e, roughness: 0.25, clearcoat: 1 })));
const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6).scale(1.6, 0.3, 0.8), new THREE.MeshStandardMaterial({ color: 0x4caf3a })); leaf.position.set(0.08, 0.3, 0); apple.add(leaf);
apple.visible = false; caveScene.add(apple);
// mind-power aura sprite (green) around Worm in flight
const aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowSprite('rgba(120,255,170,0.6)', 'rgba(80,255,140,0)'), blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
aura.scale.setScalar(9);

let swapped = {};
const MODEL_KEYS = ['worm', 'drake', 'griffith', 'king', 'castle', 'bo', 'waterDragon', 'babyDragon'];
async function loadEnv() {
  try {
    const { background, env } = await engine.loadHDR('assets/hdri/kloofendal_day_1k.hdr');
    outdoor.background = background; outdoor.environment = env;
  } catch (e) { outdoor.background = new THREE.Color(0x9fd0ff); }
  outdoor.backgroundIntensity = 0.85; outdoor.environmentIntensity = 0.55;
  caveScene.environment = engine.roomEnv(); caveScene.environmentIntensity = 0.22;
}
function useScene(s) {
  engine.setScene(s); fx.attach(s);
  for (const o of [worm.root, drake.root, aura]) s.add(o);
}
function resetOutdoorLook() { outdoor.fog.color.set(FOG.color); outdoor.fog.near = FOG.near; outdoor.fog.far = FOG.far; outdoor.backgroundIntensity = 0.85; }

// ---------------------------------------------------------------- story runner (cancellable)
let token = 0; const CANCEL = Symbol('cancel');
const wait = ms => new Promise(r => setTimeout(r, ui.fast ? Math.min(ms, 60) : ms));
function runner() { const my = ++token; return async p => { const r = await p; if (my !== token) throw CANCEL; return r; }; }
const guard = fn => fn().catch(e => { if (e !== CANCEL) console.error(e); });
let until = null; // { test: () => bool, resolve }
const waitFor = test => new Promise(res => { until = { test, resolve: res }; });
const checkUntil = () => { if (until && until.test()) { const u = until; until = null; u.resolve(); } };

// ---------------------------------------------------------------- progress (localStorage 'dm.progress' = {"done":[1,2]})
const CHAPTERS = [1, 2];
const progress = { done: new Set() };
try { for (const n of JSON.parse(localStorage.getItem('dm.progress') || '{}').done || []) if (CHAPTERS.includes(n)) progress.done.add(n); } catch { /* fresh start */ }
const unlockAll = params.get('all') === '1';
const isUnlocked = n => n === 1 || unlockAll || progress.done.has(n - 1);
function markDone(n) {
  progress.done.add(n);
  try { localStorage.setItem('dm.progress', JSON.stringify({ done: [...progress.done].sort() })); } catch { /* private mode: progress just isn't kept */ }
  refreshTitle();
}
const TITLE_HINT = 'גע בוורם כדי להגיד לו שלום 👋';
function refreshTitle() {
  for (const n of CHAPTERS) {
    const b = $(n === 1 ? '#btn-start' : `#btn-ch${n}`), open = isUnlocked(n), done = progress.done.has(n);
    b.classList.toggle('locked', !open); b.classList.toggle('done', done);
    b.querySelector('.lead').textContent = open ? '▶' : '🔒';
    b.querySelector('.ks').hidden = !done;
  }
  const next = CHAPTERS.find(n => isUnlocked(n) && !progress.done.has(n)) ?? 1;
  for (const n of CHAPTERS) $(n === 1 ? '#btn-start' : `#btn-ch${n}`).classList.toggle('pulse', n === next);
  $('#title .hint').textContent = TITLE_HINT;
}

// ---------------------------------------------------------------- shared game state handed to the chapters
const G = {
  THREE, engine, cam, fx, params, outdoor, caveScene, world, stars, cave, GATE_POS, heightAt, PLATEAU,
  worm, drake, griffith, king, marker, apple, aura, sun,
  say, toast, hideToast, actions, clearActions, showJoy, riddle, riddleMissing, card, fade, hideOverlays, sfx, ui,
  runner, wait, waitFor, guard,
  mode: 'loading', phase: 'loading',
  camGoal: null,      // { pos, look } cinematic override in the cave
  caveFree: false,    // the kid walks Drake around the cave
  walkTarget: null, busy: false, stoneGlow: 0,
  tap: null,          // chapter hook: (ray, hitWorm) => true when it handled the tap
  tick: null,         // chapter hook: (dt, time) every frame
  onLeave: null,      // chapter hook: called once when the chapter is left (home button, another chapter)
  get time() { return time; },
  useScene, setupCave, faceEachOther, wormTapped, startFlight, glance, setCounter, markDone, enterTitle, resetOutdoorLook,
};
const fl = G.fl = { pos: new THREE.Vector3(), yaw: 0, vy: 0, yawRate: 0, idle: 0, got: 0, done: false, kingSaid: false, speed: 11, minClear: 5, bound: 110,
  items: stars.list, onCollect: null, glanceT: 0, glanceAmt: 1, cam: { v: 0, vel: 0 } };

function leaveChapter() { token++; until = null; const f = G.onLeave; G.onLeave = G.tap = G.tick = null; if (f) f(); G.busy = false; G.caveFree = false; G.walkTarget = null; G.camGoal = null; marker.visible = false; apple.visible = false; resetOutdoorLook(); }

// ---------------------------------------------------------------- TITLE
const TITLE_POS = new THREE.Vector3(-6, 0, 44);
function enterTitle() {
  leaveChapter(); hideOverlays(); G.mode = 'title'; G.phase = 'title';
  useScene(outdoor); stars.group.visible = false;
  TITLE_POS.y = heightAt(TITLE_POS.x, TITLE_POS.z);
  worm.root.position.copy(TITLE_POS); worm.root.rotation.set(0, 0.25, 0); worm.setPose('coil'); worm.state.blend = 1; worm.setGlow(false);
  drake.root.position.set(TITLE_POS.x + 2.6, heightAt(TITLE_POS.x + 2.6, TITLE_POS.z + 2.2), TITLE_POS.z + 2.2); drake.root.rotation.set(0, -0.35, 0); drake.setSit(0); drake.setWalk(0);
  drake.root.scale.setScalar(1);
  refreshTitle();
  $('#title').hidden = false; $('#hud').hidden = true; arrowEl.hidden = true; showJoy(false); $('#counter').hidden = true; aura.material.opacity = 0;
}

// ---------------------------------------------------------------- CAVE
const DRAKE_START = new THREE.Vector3(2.5, 0, 8.5), WORM_CAVE = new THREE.Vector3(-4, 0, -5.2);
G.DRAKE_START = DRAKE_START; G.WORM_CAVE = WORM_CAVE;
function setupCave() {
  useScene(caveScene); G.mode = 'cave'; cave.closeGate();
  worm.root.position.copy(WORM_CAVE); worm.root.rotation.set(0, Math.atan2(DRAKE_START.x - WORM_CAVE.x, DRAKE_START.z - WORM_CAVE.z), 0);
  worm.setPose('rest'); worm.state.blend = 1; worm.setGlow(false); worm.lookAt(null);
  drake.root.position.copy(DRAKE_START); drake.root.rotation.set(0, Math.PI + 0.4, 0); drake.setSit(0); drake.root.scale.setScalar(1); drake.setStoneGlow(0);
  griffith.root.position.set(7.2, 0, -3.5); griffith.root.rotation.set(0, -0.9, 0);
  G.camGoal = null; G.caveFree = false; G.walkTarget = null; G.stoneGlow = 0; marker.visible = false; camSnap = true;
  $('#title').hidden = true; $('#hud').hidden = false; $('#counter').hidden = true; arrowEl.hidden = true; showJoy(false); aura.material.opacity = 0;
}
function faceEachOther() {
  const hw = worm.headWorld(); drake.root.rotation.y = Math.atan2(hw.x - drake.root.position.x, hw.z - drake.root.position.z);
  worm.lookAt(drake.root.position.clone().setY(1.4));
}
const WORM_TAP_LINES = ['היי! 😊', 'אני אוהב אותך, דרייק!', 'עוד ליטוף? 💚', 'הי הי! זה מדגדג!', 'אתה החבר הכי טוב שלי!'];
let tapLine = 0;
function wormTapped() {
  worm.wiggle(1.3); sfx.purr(); fx.hearts3(worm.headWorld().add(new THREE.Vector3(0, 0.5, 0)).lerp(cam.position, 0.15), 4);
  if (G.mode !== 'title') toast('worm', WORM_TAP_LINES[tapLine++ % WORM_TAP_LINES.length], 2000);
}

// ---------------------------------------------------------------- FLIGHT (shared by ch1 stars and ch2 river bubbles)
const nextItem = () => fl.items.findIndex(s => !s.got);
// "look at me!" moment: Worm turns his head back to Drake with a happy wiggle while the camera eases
// around to a 3/4 side view of his face, then drifts back to the chase view (smooth-damped, no cuts).
function glance(hold = 1.1, amount = 1) { fl.glanceT = hold; fl.glanceAmt = amount; worm.glanceBack(hold + 0.15); }
function smoothDamp(o, target, smoothTime, dt) {
  const om = 2 / smoothTime, x = om * dt, e = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x), ch = o.v - target, tmp = (o.vel + om * ch) * dt;
  o.vel = (o.vel - om * tmp) * e; o.v = target + (ch + tmp) * e;
}
// cfg: { items (list of {g, got, pop}), pos, yaw, speed?, minClear?, bound?, onCollect(i, item) }
function startFlight(cfg) {
  useScene(outdoor); G.mode = 'flight';
  Object.assign(fl, { got: 0, done: false, kingSaid: false, idle: 0, vy: 0, yawRate: 0, glanceT: 0, items: cfg.items, onCollect: cfg.onCollect || null,
    speed: cfg.speed ?? 11, minClear: cfg.minClear ?? 5, bound: cfg.bound ?? 110, yaw: cfg.yaw });
  fl.cam.v = fl.cam.vel = 0; fl.pos.copy(cfg.pos);
  worm.setPose('fly'); worm.state.blend = 1; worm.setGlow(false); worm.lookAt(null);
  drake.setSit(1); drake.setWalk(0); drake.root.scale.setScalar(1);
  $('#title').hidden = true; $('#hud').hidden = false; $('#counter').hidden = false;
  camSnap = true; aura.material.opacity = 0.08;
}
function setCounter(text, icon = '⭐') {
  $('#count').textContent = text; $('#counter .star').textContent = icon;
  const c = $('#counter'); c.classList.remove('bump'); c.offsetWidth; c.classList.add('bump');
}
function collect(i) {
  const s = fl.items[i]; if (!s || s.got) return; s.got = true; s.pop = 0; fl.got++;
  fl.onCollect && fl.onCollect(i, s);
}
const arrowEl = document.getElementById('arrow');
function pointArrow(target) {
  if (!target) { arrowEl.hidden = true; return; }
  const v = target.clone().project(cam); const behind = v.z > 1;
  if (!behind && Math.abs(v.x) < 0.8 && Math.abs(v.y) < 0.75) { arrowEl.hidden = true; return; }
  let x = v.x, y = v.y; if (behind) { x = -x; y = -y; }
  const ang = Math.atan2(y, x); arrowEl.hidden = false;
  const cx = innerWidth / 2 + Math.cos(ang) * innerWidth * 0.36, cy = innerHeight / 2 - Math.sin(ang) * innerHeight * 0.32;
  arrowEl.style.transform = `translate(${cx - 40}px, ${cy - 40}px) rotate(${-ang}rad)`;
}
function wrapAng(a) { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; }
function updateFlight(dt) {
  const inp = input(), active = Math.abs(inp.x) + Math.abs(inp.y) > 0.08;
  fl.idle = active ? 0 : fl.idle + dt;
  let yawRate = -inp.x * 1.5, vy = -inp.y * 8;
  const ni = nextItem();
  if ((!active && fl.idle > 1.2) || fl.done) {
    // gentle autopilot: toward the next item, or a lazy circle around the castle when done
    const tgt = ni >= 0 && !fl.done ? fl.items[ni].g.position : new THREE.Vector3(Math.cos(time * 0.25) * 40, PLATEAU + 18, Math.sin(time * 0.25) * 40);
    const d = tgt.clone().sub(fl.pos); const want = Math.atan2(d.x, d.z);
    yawRate = THREE.MathUtils.clamp(wrapAng(want - fl.yaw) * 1.3, -0.75, 0.75); vy = THREE.MathUtils.clamp(d.y * 0.8, -4, 4);
  }
  // keep inside the kingdom
  const hd = Math.hypot(fl.pos.x, fl.pos.z);
  if (hd > fl.bound) { const want = Math.atan2(-fl.pos.x, -fl.pos.z); yawRate = THREE.MathUtils.clamp(wrapAng(want - fl.yaw) * 2, -1.2, 1.2); }
  fl.yawRate += (yawRate - fl.yawRate) * Math.min(1, dt * 4); fl.vy += (vy - fl.vy) * Math.min(1, dt * 3);
  fl.yaw += fl.yawRate * dt;
  const fwd = new THREE.Vector3(Math.sin(fl.yaw), 0, Math.cos(fl.yaw));
  fl.pos.addScaledVector(fwd, fl.speed * dt); fl.pos.y += fl.vy * dt;
  const floorY = Math.max(heightAt(fl.pos.x, fl.pos.z), hd < 22 ? PLATEAU + 26 : 0) + fl.minClear;
  fl.pos.y = THREE.MathUtils.clamp(fl.pos.y, Math.max(floorY, 3), 70);
  // magnet + collect
  fl.items.forEach((s, i) => { if (s.got) return; const d = s.g.position.distanceTo(fl.pos); if (d < 10) fl.pos.lerp(s.g.position, Math.min(1, dt * 1.4)); if (d < 4.5) collect(i); });
  worm.root.position.copy(fl.pos);
  worm.root.rotation.set(-fl.vy * 0.04, fl.yaw, -fl.yawRate * 0.35, 'YXZ');
  worm.state.bank = fl.yawRate * 1.2; worm.state.climb = fl.vy * 0.05;
  // rider
  drake.root.position.copy(worm.seatWorld(0.16)); drake.root.quaternion.copy(worm.root.quaternion);
  aura.position.copy(worm.seatWorld(0.3));
  if (Math.random() < 0.35) fx.trail(worm.seatWorld(0.3 + Math.random() * 0.6), 0x7dffb0, 0.25);
  // guide arrow toward the next item
  pointArrow(ni >= 0 && !fl.done ? fl.items[ni].g.position : null);
  // King Roland waves when we pass the castle gate
  king.root.lookAt(fl.pos.x, king.root.position.y, fl.pos.z);
  if (fl.pos.distanceTo(king.root.position) < 34) { king.wave(0.5); if (!fl.kingSaid) { fl.kingSaid = true; toast('king', 'שלום, מאסטר הדרקונים הצעיר! 👋', 3000); } }
  // shadow + blob follow
  sun.position.copy(fl.pos).addScaledVector(world.sunDir, 120); sun.target.position.copy(fl.pos);
  world.blob.position.set(fl.pos.x, heightAt(fl.pos.x, fl.pos.z) + 0.15, fl.pos.z); world.blob.rotation.y = fl.yaw;
  // camera
  const side = new THREE.Vector3(-fwd.z, 0, fwd.x);
  fl.glanceT = Math.max(0, fl.glanceT - dt);
  smoothDamp(fl.cam, fl.glanceT > 0 ? fl.glanceAmt : 0, 0.42, dt);
  const k = fl.cam.v, lerp = THREE.MathUtils.lerp;
  const ang = lerp(0.21, 1.85, k), rad = lerp(15.3, 11, k); // orbit from behind (chase) round to his face side
  const camPos = fl.pos.clone().addScaledVector(fwd, -Math.cos(ang) * rad).addScaledVector(side, Math.sin(ang) * rad).add(new THREE.Vector3(0, lerp(6.5, 3.2, k), 0));
  const look = fl.pos.clone().addScaledVector(fwd, lerp(10, 1.0, k)).add(new THREE.Vector3(0, lerp(0.5, 0.8, k), 0));
  camPos.y = Math.max(camPos.y, heightAt(camPos.x, camPos.z) + 1.5);
  if (camSnap) { cam.position.copy(camPos); camLook.copy(look); camSnap = false; }
  cam.position.lerp(camPos, Math.min(1, dt * 3)); camLook.lerp(look, Math.min(1, dt * 4)); cam.lookAt(camLook);
  checkUntil();
}
let camSnap = true; const camLook = new THREE.Vector3();

// ---------------------------------------------------------------- per-mode updates
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function updateTitle(dt) {
  const sway = Math.sin(time * 0.15) * 1.2;
  cam.position.set(TITLE_POS.x - 1.0 + sway * 0.5, TITLE_POS.y + 2.8, TITLE_POS.z + 10.5);
  cam.lookAt(TITLE_POS.x + 3.4 + sway * 0.2, TITLE_POS.y + 3.0, TITLE_POS.z - 2);
  worm.lookAt(cam.position);
  if (Math.sin(time * 0.6) > 0.995) drake.wave(1.5);
  sun.position.copy(TITLE_POS).addScaledVector(world.sunDir, 120); sun.target.position.copy(TITLE_POS);
}
function updateCave(dt) {
  if (G.caveFree) {
    const inp = input(); let mv = new THREE.Vector3(inp.x, 0, inp.y);
    if (mv.lengthSq() > 0.01) G.walkTarget = null;
    else if (G.walkTarget) { mv = G.walkTarget.clone().sub(drake.root.position).setY(0); if (mv.length() < 0.3) { G.walkTarget = null; mv.set(0, 0, 0); } else mv.normalize(); }
    const sp = Math.min(1, mv.length());
    if (sp > 0.01) {
      drake.root.position.addScaledVector(mv.normalize(), 4.2 * sp * dt);
      const want = Math.atan2(mv.x, mv.z); drake.root.rotation.y += wrapAng(want - drake.root.rotation.y) * Math.min(1, dt * 10);
    }
    drake.setWalk(sp);
    // keep out of Worm's body + inside the cave
    for (let u = 0.08; u < 1; u += 0.08) { const f = worm.frameAt(u); const wp = worm.root.localToWorld(f.p.clone()).setY(0); const d = drake.root.position.clone().setY(0).sub(wp); const min = f.r + 0.55; if (d.length() < min) drake.root.position.addScaledVector(d.normalize(), min - d.length()); }
    const hw = worm.headWorld().setY(0), dh = drake.root.position.clone().sub(hw); if (dh.length() < 2.0) drake.root.position.copy(hw).addScaledVector(dh.normalize(), 2.0);
    const r = Math.hypot(drake.root.position.x, drake.root.position.z); if (r > 14.5) drake.root.position.multiplyScalar(14.5 / r);
    worm.lookAt(drake.root.position.clone().setY(1.4));
    marker.position.copy(worm.headWorld()).add(new THREE.Vector3(0, 1.7 + Math.sin(time * 4) * 0.25, 0)); marker.scale.setScalar(1.3); marker.rotation.y = time * 2;
  } else if (!G.tick) drake.setWalk(0);
  drake.setStoneGlow(G.stoneGlow * (0.8 + 0.2 * Math.sin(time * 6)));
  if (G.stoneGlow > 0.5 && Math.random() < 0.5) fx.trail(drake.root.position.clone().setY(1.0), 0x7dffa0, 0.25);
  griffith.root.lookAt(drake.root.position.x, 0, drake.root.position.z);
  // camera
  let pos, look;
  if (G.camGoal) { pos = G.camGoal.pos; look = G.camGoal.look; }
  else { const d = drake.root.position; pos = d.clone().add(new THREE.Vector3(0, 6.2, 9.8)); look = d.clone().lerp(worm.headWorld(), 0.3).setY(0.9);
    const rr = Math.hypot(pos.x, pos.z); if (rr > 16) { pos.x *= 16 / rr; pos.z *= 16 / rr; } }
  if (camSnap) { cam.position.copy(pos); camLook.copy(look); camSnap = false; }
  cam.position.lerp(pos, Math.min(1, dt * 2.5)); camLook.lerp(look, Math.min(1, dt * 3)); cam.lookAt(camLook);
  checkUntil();
}

// taps on the 3D view: chapter hook first; then Worm → wiggle (or walk to him); floor → walk there
$('#c').addEventListener('pointerdown', e => {
  unlock();
  ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ndc, cam);
  const hitWorm = ray.intersectObjects(worm.hitMeshes, false).length > 0;
  if (G.mode === 'title') { if (hitWorm) wormTapped(); return; }
  if (G.tap && G.tap(ray, hitWorm)) return;
  if (G.mode === 'cave') {
    if (G.caveFree) {
      if (hitWorm) G.walkTarget = worm.headWorld().setY(0);
      else { const h = ray.intersectObject(cave.floor, false)[0]; if (h) G.walkTarget = h.point.setY(0); }
    } else if (hitWorm && !G.busy) wormTapped();
  } else if (G.mode === 'flight' && hitWorm) wormTapped();
});

// ---------------------------------------------------------------- chapters + buttons
const ch1 = chapter1(G), ch2 = chapter2(G);
const startMusic = () => { unlock(); sfx.tap(); if (settings.sound) music(true); };
$('#btn-start').addEventListener('pointerup', () => { startMusic(); guard(() => ch1.start('intro')); });
$('#btn-ch2').addEventListener('pointerup', () => {
  unlock(); sfx.tap();
  if (!isUnlocked(2)) { $('#title .hint').textContent = 'קודם מסיימים את פרק 1 עם וורם 💚'; worm.wiggle(1); return; } // friendly nudge, never a fail
  if (settings.sound) music(true); guard(() => ch2.start('intro'));
});
$('#btn-home').addEventListener('pointerup', () => { sfx.tap(); guard(async () => { token++; await fade(true); enterTitle(); await fade(false); }); });
const syncToggles = () => { $('#btn-sound').classList.toggle('off', !settings.sound); $('#btn-voice').classList.toggle('off', !settings.voice); };
$('#btn-sound').addEventListener('pointerup', () => { settings.sound = !settings.sound; save(); syncToggles(); music(settings.sound); });
$('#btn-voice').addEventListener('pointerup', () => { settings.voice = !settings.voice; save(); syncToggles(); if (!settings.voice) speechSynthesis?.cancel(); });
syncToggles();
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('dblclick', e => e.preventDefault());

// ---------------------------------------------------------------- loop
let lastMode = '';
function frame() {
  timer.update(); const dt = Math.min(0.05, timer.getDelta()); time += dt;
  if (G.mode !== lastMode) { camSnap = true; lastMode = G.mode; }
  if (G.mode === 'title') updateTitle(dt); else if (G.mode === 'cave') updateCave(dt); else if (G.mode === 'flight') updateFlight(dt);
  if (G.tick) G.tick(dt, time);
  worm.update(dt, time); drake.update(dt, time); griffith.update(dt, time); king.update(dt, time);
  world.update(dt, time); cave.update(dt, time);
  stars.update(dt, time, fl.items === stars.list ? nextItem() : -1);
  ch2.update(dt, time, fl.items === ch2.bubbles.list ? nextItem() : -1);
  for (const k in swapped) swapped[k].update(dt, time);
  fx.setScale(innerHeight * Math.min(devicePixelRatio, engine.maxDpr)); fx.update(dt);
  if (engine.scene) engine.render(dt);
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------- test / debug hook
const GO = {
  title: () => enterTitle(),
  cave: () => guard(() => ch1.start('intro')), bond: () => guard(() => ch1.start('bond')), math: () => guard(() => ch1.start('math')), flight: () => guard(() => ch1.start('flight')),
  ch1: () => guard(() => ch1.start('intro')),
  ch2: () => guard(() => ch2.start('intro')), 'ch2-glide': () => guard(() => ch2.start('glide')), 'ch2-warm': () => guard(() => ch2.start('warm')),
  'ch2-hatch': () => guard(() => ch2.start('hatch')), 'ch2-end': () => guard(() => ch2.start('end')),
};
window.__dm = {
  ready: false,
  get mode() { return G.mode; }, get phase() { return G.phase; },
  set fast(v) { ui.fast = !!v; }, get fast() { return ui.fast; },
  go(name) { hideOverlays(); $('#fade').classList.remove('on'); leaveChapter(); GO[name] && GO[name](); return name; },
  walkToWorm() { drake.root.position.copy(worm.headWorld().setY(0)).add(new THREE.Vector3(2.2, 0, 2.2)); },
  collectNext() { const i = nextItem(); if (i >= 0) collect(i); },
  collectAll() { fl.items.forEach((s, i) => collect(i)); },
  // screen position (CSS px) of the next warm stone to tap in ch2, or null
  stoneScreen() { const p = ch2.nextStonePos(); if (!p) return null; const v = p.project(cam); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; },
  get progress() { return [...progress.done].sort(); },
  resetProgress() { progress.done.clear(); try { localStorage.removeItem('dm.progress'); } catch { } refreshTitle(); },
  stats: () => ({ ...engine.info(), mode: G.mode, phase: G.phase, stars: fl.got, models: modelStatus(MODEL_KEYS, swapped) }),
  setTier: t => { engine.noAuto = true; engine.setTier(t); },
  worm, engine, G,
};

(async () => {
  await loadEnv();
  swapped = await loadModels({ worm, drake, griffith, king, castle: { root: world.castle }, ...ch2.modelTargets });
  enterTitle();
  if (params.has('tier')) window.__dm.setTier(params.get('tier'));
  // compile shaders for both scenes up-front (avoids hitches on iPad when the cave opens or chapter 2 actors appear)
  try { ch2.showAll(true); engine.renderer.compile(caveScene, cam); engine.renderer.compile(outdoor, cam); } catch { }
  ch2.showAll(false);
  frame();
  setTimeout(() => { $('#loading').classList.add('done'); window.__dm.ready = true; }, 300);
})();
