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
import { ui, say, toast, hideToast, actions, clearActions, showJoy, input, askRiddle, currentRiddle, card, hideOverlays, fade } from './ui.js';
import { makeRiddle, newAdaptive, recordResult, clampLevel, EXAMPLES } from './math.js';
import { sfx, unlock, settings, save, music } from './audio.js';
import { glowSprite } from './tex.js';
import { loadModels, modelStatus } from './assets.js';
import { chapter1 } from './chapters/ch1.js';
import { chapter2 } from './chapters/ch2.js';
import { chapter3 } from './chapters/ch3.js';
import { chapter4 } from './chapters/ch4.js';
import { chapter5 } from './chapters/ch5.js';
import { chapter6 } from './chapters/ch6.js';
import { chapter7 } from './chapters/ch7.js';
import { freeFlight } from './chapters/free.js';

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
const MODEL_KEYS = ['worm', 'drake', 'griffith', 'king', 'castle', 'bo', 'waterDragon', 'babyDragon', 'ana', 'sunDragon', 'rori', 'fireDragon', 'petra', 'crystalDragon', 'grumbleCloud'];
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
// step(p) also resolves if the story watchdog nudges it (see below), so a scripted beat can never hang the story for good
let nudgeStep = null;
function runner() { const my = ++token; return async p => { const r = await Promise.race([p, new Promise(res => { nudgeStep = res; })]); if (my !== token) throw CANCEL; return r; }; }
const guard = fn => fn().catch(e => { if (e !== CANCEL) console.error(e); });
let until = null; // { test: () => bool, resolve }
const waitFor = test => new Promise(res => { until = { test, resolve: res }; });
// Story animations ("tweens"). They run on the wall clock, not on a per-frame step: at 2 frames per second a 3 s
// move still takes 3 s (it used to take as many frames as at 60 fps, i.e. minutes, which stalled the story on a
// starved browser). Each one also has a deadline timer, so its promise resolves even if no frame arrives at all.
let tweens = [];
function finishTween(tw) { if (tw.done) return; tw.done = true; clearTimeout(tw.deadline); try { tw.fn(1); } catch (e) { console.warn(e); } tw.res(); }
function tween(dur, fn) {
  return new Promise(res => { fn(0); const tw = { t0: performance.now(), dur: (ui.fast ? 0.05 : dur) * 1000, fn, res, done: false };
    tw.deadline = setTimeout(() => finishTween(tw), tw.dur + 1500); tweens.push(tw); });
}
function updateTweens() { const now = performance.now(); for (const tw of tweens) { if (tw.done) continue; const k = Math.min(1, (now - tw.t0) / tw.dur); if (k >= 1) finishTween(tw); else tw.fn(k); } tweens = tweens.filter(tw => !tw.done); }
// Tap-to-skip (⏭ in the top bar): shown whenever the story is talking or playing a scripted move, i.e. a bubble is open or a
// tween of 1.2 s or longer runs, and it is not the player's turn. One tap fast-forwards to the next thing the player DOES
// (an activity, a riddle, a button, a card): open bubbles close, tweens finish, and the lines in between flash by.
// It stops by itself after 6 s at the latest. It is hidden while the counter shows, so the top bar never reaches the bubble.
const skipEl = $('#btn-skip'), dialogEl = $('#dialog'), counterEl = $('#counter'); let skipping = false, skipT0 = 0, fastWas = false;
const shown = sel => { const e = $(sel); return !!e && !e.hidden; };
const playerCanAct = () => G.playerTurn || G.mode === 'title' || G.mode === 'flight' || shown('#math') || shown('#card') || shown('#joy') || $('#actions').childElementCount > 0;
function stopSkip() { if (!skipping) return; skipping = false; ui.fast = fastWas; }
function updateSkip() {
  if (skipping) { if (playerCanAct() || performance.now() - skipT0 > 6000) stopSkip(); else { if (!dialogEl.hidden && ui.finishSay) ui.finishSay(); finishTweens(); } }
  const on = !skipping && !ui.fast && !playerCanAct() && counterEl.hidden && (!dialogEl.hidden || tweens.some(tw => !tw.done && tw.dur >= 1200));
  if (skipEl.hidden === on) skipEl.hidden = !on;
}
skipEl.addEventListener('pointerup', e => { e.stopPropagation(); if (skipping) return; sfx.tap(); skipping = true; skipT0 = performance.now(); fastWas = ui.fast; ui.fast = true; skipEl.hidden = true; if (ui.finishSay) ui.finishSay(); finishTweens(); });
function finishTweens() { for (const tw of [...tweens]) finishTween(tw); tweens = []; }
function clearTweens() { for (const tw of tweens) { tw.done = true; clearTimeout(tw.deadline); } tweens = []; }
const checkUntil = () => { if (until && until.test()) { const u = until; until = null; u.resolve(); } };

// ---------------------------------------------------------------- progress + chapter map
// localStorage 'dm.progress' = { done: [1, 2], last: { ch: 2, beat: 'warm' }, all: false, math: { level, auto, ceiling } }
// (older saves only had `done`, or no `math`: both load fine)
const CHAPTERS = [
  { n: 1, name: 'אבן הדרקון', badge: '💚' }, { n: 2, name: 'הביצה המסתורית', badge: '💧' }, { n: 3, name: 'השמש של אנה', badge: '☀️' }, { n: 4, name: 'הלהבה של רורי', badge: '🔥' },
  { n: 5, name: 'מערת הקריסטלים של פטרה', badge: '💎' }, { n: 6, name: 'הענן הרטנן', badge: '🖌️' }, { n: 7, name: 'המסע אל הר הקשת', badge: '🗺️' }, { n: 8, name: 'קשת של חברים', badge: '🏅' },
];
const mods = {};                                    // built chapters: n → { start(beat) }
const progress = { done: new Set(), last: null, all: false, free: 0 }; // free: best count in free flight ("שיא")
let mathState = newAdaptive({}), lastRiddleKey = null;   // riddle difficulty: starts at level 2 and can climb to the ceiling (default 5)
try {
  const p = JSON.parse(localStorage.getItem('dm.progress') || '{}') || {};
  for (const n of p.done || []) if (CHAPTERS.some(c => c.n === n)) progress.done.add(n);
  if (p.last && Number.isInteger(p.last.ch) && typeof p.last.beat === 'string') progress.last = { ch: p.last.ch, beat: p.last.beat };
  progress.all = p.all === true; if (Number.isFinite(p.free) && p.free > 0) progress.free = Math.floor(p.free);
  if (p.math && typeof p.math === 'object') mathState = newAdaptive({ level: p.math.level, ceiling: p.math.ceiling, auto: p.math.auto }); // no saved ceiling → 5
} catch { /* fresh start */ }
const isUnlocked = n => n === 1 || params.get('all') === '1' || progress.all || progress.done.has(n - 1);
function saveProgress() {
  try { localStorage.setItem('dm.progress', JSON.stringify({ done: [...progress.done].sort(), last: progress.last, all: progress.all, free: progress.free, math: { level: mathState.level, auto: mathState.auto, ceiling: mathState.ceiling } })); } catch { /* private mode: progress just isn't kept */ }
}
if (params.has('lvl')) { const l = clampLevel(params.get('lvl')); mathState.level = l; mathState.ceiling = Math.max(mathState.ceiling, l); } // debugging, not saved until a riddle is answered
// G.math.ask({ kind, title, fixed?, right?, wrong? }): one riddle at the current level; adapts the level afterwards
const mathApi = {
  get level() { return mathState.level; },
  async ask({ kind, title, fixed = null, wordOps = null, right = null, wrong = null } = {}) {
    const r = fixed || makeRiddle(mathState.level, kind, Math.random, { avoid: lastRiddleKey, wordOps }); lastRiddleKey = r.key;
    const res = await askRiddle(r, { title, cb: { right, wrong } });
    recordResult(mathState, res.wrong); saveProgress(); return res;
  },
};
function checkpoint(ch, beat) { progress.last = { ch, beat }; saveProgress(); }
function markDone(n) { progress.done.add(n); progress.last = { ch: mods[n + 1] ? n + 1 : n, beat: 'intro' }; saveProgress(); refreshTitle(); }
const resumePoint = () => { const l = progress.last; return l && mods[l.ch] && isUnlocked(l.ch) ? l : null; };
let titleToastT = null;
function titleToast(text, ms = 2600) { const t = $('#title-toast'); t.textContent = text; t.hidden = false; clearTimeout(titleToastT); titleToastT = setTimeout(() => (t.hidden = true), ms); }
function startChapter(n, beat = 'intro') { unlock(); if (settings.sound) music(true); guard(() => mods[n].start(beat)); }
function buildChapterMap() {
  const box = $('#chapters');
  for (const c of CHAPTERS) {
    const b = document.createElement('button'); b.className = 'chap'; b.dataset.ch = c.n; b.id = `ch-${c.n}`;
    b.innerHTML = '<span class="top"><span class="num" dir="ltr"></span> <span class="ic"></span></span><span class="nm"></span><span class="soon" hidden>בקרוב</span>';
    b.querySelector('.num').textContent = c.n; b.querySelector('.nm').textContent = c.name;
    b.addEventListener('pointerup', () => {
      unlock(); sfx.tap();
      if (!mods[c.n]) { titleToast('הפרק הזה עוד בדרך… בקרוב! ✨'); worm.wiggle(0.8); return; }               // friendly nudges, never a fail
      if (!isUnlocked(c.n)) { titleToast(`קודם מסיימים את פרק ${c.n - 1} עם וורם 💚`); worm.wiggle(1); return; }
      startChapter(c.n);
    });
    box.appendChild(b);
  }
}
$('#btn-free').addEventListener('pointerup', () => { unlock(); sfx.tap(); if (!isUnlocked(2)) { titleToast('קודם מסיימים את פרק 1 עם וורם 💚'); worm.wiggle(1); return; } if (settings.sound) music(true); guard(() => free.start()); });
function refreshTitle() {
  for (const c of CHAPTERS) {
    const b = $(`#ch-${c.n}`), built = !!mods[c.n], open = isUnlocked(c.n), done = progress.done.has(c.n);
    b.classList.toggle('locked', !built || !open); b.classList.toggle('done', done);
    b.querySelector('.ic').textContent = done ? c.badge : open && built ? '▶' : open ? '✨' : '🔒';
    b.querySelector('.soon').hidden = built;
    b.setAttribute('aria-label', `פרק ${c.n}: ${c.name}`);
  }
  { const fb = $('#btn-free'), open = isUnlocked(2); fb.classList.toggle('locked', !open); fb.querySelector('.f-ic').textContent = open ? '🐉' : '🔒';   // free flight opens when chapter 1 is finished (or with "unlock all")
    const best = $('#free-best'); best.hidden = !(open && progress.free > 0); best.querySelector('bdi').textContent = progress.free; }
  const r = resumePoint();
  $('#btn-continue').textContent = r ? `▶ המשך: פרק ${r.ch}` : '▶ מתחילים: פרק 1';
}
// ---------------------------------------------------------------- shared game state handed to the chapters
const G = {
  THREE, engine, cam, fx, params, outdoor, caveScene, world, stars, cave, GATE_POS, heightAt, PLATEAU,
  worm, drake, griffith, king, marker, apple, aura, sun,
  say, toast, hideToast, actions, clearActions, showJoy, card, fade, hideOverlays, sfx, ui,
  runner, wait, waitFor, guard, tween, tweenCount: () => tweens.length,
  mode: 'loading', phase: 'loading',
  camGoal: null,      // { pos, look } cinematic override in the cave
  caveFree: false,    // the kid walks Drake around the cave
  walkTarget: null, busy: false, stoneGlow: 0,
  tap: null,          // chapter hook: (ray, hitWorm) => true when it handled the tap
  tick: null,         // chapter hook: (dt, time) every frame
  onLeave: null,      // chapter hook: called once when the chapter is left (home button, another chapter)
  get time() { return time; },
  get hd() { return !!swapped.worm; },
  get hdCloud() { return !!swapped.grumbleCloud; },
  get hdBaby() { return !!swapped.babyDragon; }, // the HD baby water dragon is in use (much smaller than the code-built one) // the HD Worm model is in use (more compact than the procedural one: some shots are framed differently)
  math: mathApi, makeRiddle,
  chapterDone: n => progress.done.has(n) || progress.all || params.get('all') === '1',   // free flight: which friends have joined
  get freeBest() { return progress.free; }, saveFree(n) { if (n > progress.free) { progress.free = n; saveProgress(); } },
  useScene, setupCave, faceEachOther, wormTapped, startFlight, collectNext: () => { const i = nextItem(); if (i >= 0) collect(i); return i; }, nextItem: () => nextItem(), glance, setCounter, markDone, checkpoint, enterTitle, resetOutdoorLook,
};
const fl = G.fl = { pos: new THREE.Vector3(), yaw: 0, vy: 0, yawRate: 0, got: 0, done: false, kingSaid: false, speed: 8.5, minClear: 3,
  items: stars.list, onCollect: null, glanceT: 0, glanceAmt: 1, cam: { v: 0, vel: 0 },
  path: null, len: 1, u: 0, itemU: [], ox: 0, oy: 0, since: 0, helped: false, corridor: [5, 3.5] };

function leaveChapter() { stopSkip(); clearTweens(); G.keepShot = false; G.playerTurn = false; nudgeStep = null; griffShot = griffPrev = null; token++; until = null; const f = G.onLeave; G.onLeave = G.tap = G.tick = null; if (f) f(); G.busy = false; G.caveFree = false; G.walkTarget = null; G.camGoal = null; marker.visible = false; apple.visible = false; resetOutdoorLook(); }

// ---------------------------------------------------------------- TITLE
const TITLE_POS = new THREE.Vector3(-6, 0, 44);
function enterTitle() {
  leaveChapter(); hideOverlays(); G.mode = 'title'; G.phase = 'title';
  useScene(outdoor); stars.group.visible = false;
  TITLE_POS.y = heightAt(TITLE_POS.x, TITLE_POS.z);
  worm.root.position.copy(TITLE_POS); worm.root.rotation.set(0, 0.25, 0); worm.setPose('coil'); worm.state.blend = 1; worm.setGlow(false);
  drake.root.position.set(TITLE_POS.x + 1.3, heightAt(TITLE_POS.x + 1.3, TITLE_POS.z + 3.4), TITLE_POS.z + 3.4); drake.root.rotation.set(0, -0.1, 0); // left of the title card drake.setSit(0); drake.setWalk(0);
  if (swapped.worm) { const ph = !!engine.viewShift, dx = TITLE_POS.x + (ph ? 2.5 : 1.9), dz = TITLE_POS.z + (ph ? 0.4 : 1.2); drake.root.position.set(dx, heightAt(dx, dz), dz); drake.root.rotation.set(0, -0.2, 0); }
  drake.root.scale.setScalar(1);
  // King Roland stands big on the front wall next to the gate, where the title camera can read him, and waves
  king.root.position.set(engine.viewShift ? -9.5 : -6.5, PLATEAU + 7.0, 16.2); king.root.scale.setScalar((swapped.king ? 3.4 : 3.0) * (engine.viewShift ? 1 : 0.72));
  refreshTitle();
  $('#title').hidden = false; $('#hud').hidden = true; arrowEl.hidden = true; showJoy(false); $('#joy').classList.remove('flight'); $('#counter').hidden = true; aura.material.opacity = 0;
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
  $('#title').hidden = true; $('#hud').hidden = false; $('#counter').hidden = true; arrowEl.hidden = true; showJoy(false); $('#joy').classList.remove('flight'); aura.material.opacity = 0;
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
// the next item: the first one not collected yet; with nextAhead (free flight: items respawn) the nearest one ahead on the rail
const nextItem = () => { if (!fl.nextAhead) return fl.items.findIndex(s => !s.got); let best = -1, bd = 2; fl.items.forEach((s, i) => { if (s.got) return; const du = ((fl.itemU[i] - fl.u) % 1 + 1) % 1; if (du < bd) { bd = du; best = i; } }); return best; };
// "look at me!" moment: Worm turns his head back to Drake with a happy wiggle while the camera eases
// around to a 3/4 side view of his face, then drifts back to the chase view (smooth-damped, no cuts).
function glance(hold = 1.1, amount = 1) { fl.glanceT = hold; fl.glanceAmt = amount; worm.glanceBack(hold + 0.15, fl.camSide); }
function smoothDamp(o, target, smoothTime, dt) {
  const om = 2 / smoothTime, x = om * dt, e = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x), ch = o.v - target, tmp = (o.vel + om * ch) * dt;
  o.vel = (o.vel - om * tmp) * e; o.v = target + (ch + tmp) * e;
}
// Rail-guided flight (kid-proof): Worm always glides forward along a smooth path through every item, so he can never
// get lost, stuck, turned around or blocked. The joystick only nudges him left/right/up/down inside a soft corridor
// around the path (it springs back), and near each item a magnet pulls him onto it, so with no input at all he still
// collects everything. (Before, free steering let a held joystick turn him in a ~7 m circle around an item that needs
// 4.5 m to collect, forever: the autopilot only helped once the stick was released.)
// camSide: which side the chase / glance camera sits on (1 = left of the flight direction, -1 = right).
// cfg: { items (list of {g, base, got, pop}), loop (closed path, keeps cruising when done), lead / exit (extra path points
//        before / after the items), pathPts? (explicit rail points), startU, speed?, corridor? [side, up], lookDown? (iPhone only), onCollect(i, item) }
function startFlight(cfg) {
  useScene(outdoor); G.mode = 'flight';
  king.root.position.set(0, PLATEAU + 7.0, 15.6); king.root.scale.setScalar(1.7);
  const pts = cfg.pathPts ? cfg.pathPts.map(p => p.clone()) : [...(cfg.lead || []), ...cfg.items.map(it => it.base.clone()), ...(cfg.exit || [])]; // pathPts: a rail that does not run through every item's own point (the chapter 1 rings sit ON the star loop)
  const path = new THREE.CatmullRomCurve3(pts, !!cfg.loop, 'centripetal'); path.arcLengthDivisions = 400; path.updateArcLengths();
  // arc-length position of every item on the path
  const N = 800, itemU = cfg.items.map(() => 0), best = cfg.items.map(() => Infinity), q = new THREE.Vector3();
  for (let k = 0; k <= N; k++) { path.getPointAt(k / N, q); cfg.items.forEach((it, i) => { const d = q.distanceToSquared(it.base); if (d < best[i]) { best[i] = d; itemU[i] = k / N; } }); }
  Object.assign(fl, { got: 0, done: false, kingSaid: false, vy: 0, yawRate: 0, glanceT: 0, items: cfg.items, onCollect: cfg.onCollect || null,
    speed: cfg.speed ?? 8.5, corridor: cfg.corridor ?? [5, 3.5], path, len: path.getLength(), loop: !!cfg.loop, itemU, u: cfg.startU ?? 0, ox: 0, oy: 0, since: 0, helped: false, yaw: null, camSide: cfg.camSide ?? 1, lookDown: cfg.lookDown ?? 0, nextAhead: !!cfg.nextAhead });
  fl.cam.v = fl.cam.vel = 0; path.getPointAt(((fl.u % 1) + 1) % 1, fl.pos);
  worm.setPose('fly'); worm.state.blend = 1; worm.setGlow(false); worm.lookAt(null);
  drake.setSit(1); drake.setWalk(0); drake.root.scale.setScalar(1);
  $('#title').hidden = true; $('#hud').hidden = false; $('#counter').hidden = false; arrowEl.hidden = true; $('#joy').classList.add('flight');
  camSnap = true; aura.material.opacity = 0.08;
}
function setCounter(text, icon = '⭐') {
  $('#count').textContent = text; $('#counter .star').textContent = icon;
  const c = $('#counter'); c.classList.remove('bump'); c.offsetWidth; c.classList.add('bump');
}
function collect(i) {
  const s = fl.items[i]; if (!s || s.got) return; s.got = true; s.pop = 0; fl.got++; fl.since = 0; fl.helped = false;
  fl.onCollect && fl.onCollect(i, s);
}
const arrowEl = document.getElementById('arrow'); // (unused in rail flight: the next item is always ahead on screen)
function wrapAng(a) { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; }
const HELP_LINES = ['בוא, אני אקח אותך אל הבא! ✨', 'תחזיק חזק, אני מרחף לשם! 💚'];
const _P = new THREE.Vector3(), _T = new THREE.Vector3(), _R = new THREE.Vector3(), _prev = new THREE.Vector3(), Y_UP = new THREE.Vector3(0, 1, 0);
function updateFlight(dt) {
  const inp = input(), ni = nextItem(), going = ni >= 0 && !fl.done;
  // never punish: if somehow 6 s pass without a catch, Worm glides straight to the next one by himself
  fl.since += going ? dt : 0;
  if (going && fl.since > 6 && !fl.helped) { fl.helped = true; toast('worm', HELP_LINES[fl.got % HELP_LINES.length], 2200); }
  const help = fl.helped && going;
  // forward along the rail (a touch faster while the kid is steering, so playing feels rewarding)
  const active = Math.abs(inp.x) + Math.abs(inp.y) > 0.08;
  fl.u += fl.speed * (help ? 1.5 : active ? 1.12 : 1) * dt / fl.len;
  if (fl.loop) fl.u = ((fl.u % 1) + 1) % 1; else fl.u = Math.min(fl.u, 1);
  fl.path.getPointAt(fl.u, _P); fl.path.getTangentAt(fl.u, _T);
  _R.crossVectors(_T, Y_UP).setY(0); if (_R.lengthSq() < 1e-6) _R.set(1, 0, 0); _R.normalize(); // screen-right for the chase camera
  // soft corridor: the stick nudges, the spring brings him back; the magnet near the next item squeezes the corridor shut
  let squeeze = help ? 0 : 1;
  if (going) { const du = ((fl.itemU[ni] - fl.u) % 1 + 1) % 1, ahead = Math.min(du, 1 - du) * fl.len; squeeze *= THREE.MathUtils.smoothstep(ahead, 3, 13); }
  const spring = Math.min(1, dt * 3);
  fl.ox += (inp.x * fl.corridor[0] * squeeze - fl.ox) * spring; fl.oy += (-inp.y * fl.corridor[1] * squeeze - fl.oy) * spring;
  _prev.copy(fl.pos);
  fl.pos.copy(_P).addScaledVector(_R, fl.ox); fl.pos.y += fl.oy;
  fl.pos.y = Math.max(fl.pos.y, heightAt(fl.pos.x, fl.pos.z) + fl.minClear);   // the ground can only ever lift him, never block him
  // collect: touching the item, or simply passing it on the rail (guaranteed)
  fl.items.forEach((s, i) => {
    if (s.got) return; const du = ((fl.u - fl.itemU[i]) % 1 + 1) % 1;
    if (s.g.position.distanceTo(fl.pos) < 5 || (i === ni && du < 0.5 && du * fl.len < 6)) collect(i);
  });
  const yaw = Math.atan2(_T.x, _T.z); if (fl.yaw === null) { fl.yaw = yaw; _prev.copy(fl.pos); }
  const sm = Math.min(1, dt * 4), inv = dt > 0 ? 1 / dt : 0;
  fl.yawRate += ((wrapAng(yaw - fl.yaw) * inv - (fl.pos.clone().sub(_prev).dot(_R) - 0) * inv * 0.06) - fl.yawRate) * sm; // path turn + sideways nudge → banking
  fl.vy += ((fl.pos.y - _prev.y) * inv - fl.vy) * sm;
  fl.yaw = yaw;
  const fwd = new THREE.Vector3(Math.sin(fl.yaw), 0, Math.cos(fl.yaw));
  worm.root.position.copy(fl.pos);
  worm.root.rotation.set(-fl.vy * 0.04, fl.yaw, THREE.MathUtils.clamp(-fl.yawRate * 0.35, -0.5, 0.5), 'YXZ');
  worm.state.bank = THREE.MathUtils.clamp(fl.yawRate * 1.2, -1.5, 1.5); worm.state.climb = THREE.MathUtils.clamp(fl.vy * 0.05, -0.5, 0.5);
  // rider
  drake.root.position.copy(worm.seatWorld(0.16)); drake.root.quaternion.copy(worm.root.quaternion);
  aura.position.copy(worm.seatWorld(0.3));
  if (Math.random() < 0.35) fx.trail(worm.seatWorld(0.3 + Math.random() * 0.6), 0x7dffb0, 0.25);
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
  const camPos = fl.pos.clone().addScaledVector(fwd, -Math.cos(ang) * rad).addScaledVector(side, Math.sin(ang) * rad * fl.camSide).add(new THREE.Vector3(0, lerp(6.5, 3.2, k), 0));
  const look = fl.pos.clone().addScaledVector(fwd, lerp(10, 1.0, k)).add(new THREE.Vector3(0, lerp(0.5, 0.8, k) - (engine.viewShift ? fl.lookDown : 0), 0)); // lookDown: aim lower on the short iPhone screen so Worm sits higher in the frame
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
  if (swapped.worm && engine.viewShift) { // phone: the title card covers the right 60%, so Worm and Drake are framed in the clear area on the left
    cam.position.set(TITLE_POS.x + 3.2 + sway * 0.3, TITLE_POS.y + 2.0, TITLE_POS.z + 10.5);
    cam.lookAt(TITLE_POS.x + 5.6 + sway * 0.15, TITLE_POS.y + 2.2, TITLE_POS.z - 2);
  } else if (swapped.worm) { // the HD Worm stands lower and is more compact than the procedural one: come closer
    cam.position.set(TITLE_POS.x + 0.2 + sway * 0.4, TITLE_POS.y + 2.1, TITLE_POS.z + 7.6);
    cam.lookAt(TITLE_POS.x + 3.3 + sway * 0.2, TITLE_POS.y + 1.9, TITLE_POS.z - 2);
  } else {
    cam.position.set(TITLE_POS.x - 1.0 + sway * 0.5, TITLE_POS.y + 2.8, TITLE_POS.z + 10.5);
    cam.lookAt(TITLE_POS.x + 3.4 + sway * 0.2, TITLE_POS.y + 3.0, TITLE_POS.z - 2);
  }
  worm.lookAt(cam.position);
  if (Math.sin(time * 0.6) > 0.995) drake.wave(1.5);
  if (Math.sin(time * 0.45 + 1) > 0.99) king.wave(2.6); king.root.lookAt(cam.position.x, king.root.position.y, cam.position.z);
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
const ch1 = mods[1] = chapter1(G), ch2 = mods[2] = chapter2(G), ch3 = mods[3] = chapter3(G), ch4 = mods[4] = chapter4(G), ch5 = mods[5] = chapter5(G);
G.grumble = ch3.cloudActor; G.team = { kepri: ch3.modelTargets.sunDragon, vulcan: ch4.modelTargets.fireDragon, shu: ch2.modelTargets.waterDragon, gem: ch5.modelTargets.crystalDragon }; // shared with chapter 6 and free flight
const ch6 = mods[6] = chapter6(G);
const ch7 = mods[7] = chapter7(G);
const free = freeFlight(G);
// while Griffith speaks in the cave the camera turns to a shot of him (with Drake's side of the cave), then goes back;
// a chapter can set G.keepShot for a beat that must stay on Worm (the Dragon Stone moment)
let griffShot = null, griffPrev = null;
ui.onSay = who => {
  swapped[{ baby: 'babyDragon', kepri: 'sunDragon', vulcan: 'fireDragon', gem: 'crystalDragon', cloud: 'grumbleCloud' }[who] || who]?.once('talk'); // GLB characters with a Talk clip gesture while they speak
  if (who !== 'griffith' || G.mode !== 'cave' || G.keepShot) return;
  const g = griffith.root.position, d = drake.root.position.clone().sub(g).setY(0); if (d.lengthSq() < 0.01) d.set(0, 0, 1); d.normalize();
  const side = new THREE.Vector3(-d.z, 0, d.x); if (side.dot(worm.headWorld().sub(g)) > 0) side.negate(); // the side away from Worm, so his body never fills the foreground
  griffPrev = G.camGoal; griffShot = G.camGoal = { pos: g.clone().addScaledVector(d, 3.4).addScaledVector(side, 2.8).setY(2.0), look: g.clone().addScaledVector(d, 0.6).setY(1.35) };
};
ui.onSayEnd = () => { if (griffShot && G.camGoal === griffShot) G.camGoal = griffPrev; griffShot = griffPrev = null; };
buildChapterMap();
$('#btn-continue').addEventListener('pointerup', () => { sfx.tap(); const r = resumePoint(); startChapter(r ? r.ch : 1, r ? r.beat : 'intro'); });
$('#btn-home').addEventListener('pointerup', () => { sfx.tap(); guard(async () => { token++; await fade(true); enterTitle(); await fade(false); }); });
const syncToggles = () => { $('#btn-sound').classList.toggle('off', !settings.sound); };
$('#btn-sound').addEventListener('pointerup', () => { settings.sound = !settings.sound; save(); syncToggles(); music(settings.sound); });
syncToggles();
// hidden parent unlock: hold the title text for 3 seconds
{ const h1 = $('#title-h1'); let t = null; const stop = () => { clearTimeout(t); t = null; };
  h1.addEventListener('pointerdown', () => { stop(); t = setTimeout(() => { progress.all = true; saveProgress(); refreshTitle(); sfx.chime(); titleToast('🔓 כל הפרקים נפתחו (מצב הורים)'); openParent(); }, 3000); });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) h1.addEventListener(ev, stop); }
// parent panel (only reachable through the 3-second hold above): riddle level, auto-adapt, unlock all, reset
function drawParent() {
  // two separate choices: the level he plays at now (start), and the highest level auto-adapt may reach (ceiling)
  const row = (sel, cur, pick) => { const box = $(sel); box.innerHTML = '';
    for (let l = 1; l <= 5; l++) { const b = document.createElement('button'); b.textContent = l; b.dataset.l = l; b.classList.toggle('on', l === cur);
      b.addEventListener('pointerup', () => { sfx.tap(); pick(l); saveProgress(); drawParent(); }); box.appendChild(b); } };
  row('#p-levels', mathState.level, l => { mathState = newAdaptive({ level: l, ceiling: Math.max(l, mathState.ceiling), auto: mathState.auto }); });
  row('#p-ceil', mathState.ceiling, l => { mathState = newAdaptive({ level: Math.min(l, mathState.level), ceiling: l, auto: mathState.auto }); });
  const ex = l => `<bdi dir="ltr">${l}</bdi>: <bdi dir="ltr" class="eq">${EXAMPLES[l]}</bdi>`;
  $('#p-example').innerHTML = mathState.level === mathState.ceiling ? `רמה ${ex(mathState.level)}` : `מתחילים ברמה ${ex(mathState.level)} · עד רמה ${ex(mathState.ceiling)}`;
  $('#p-auto').textContent = `התאמה אוטומטית: ${mathState.auto ? 'פועלת' : 'כבויה'}`; $('#p-auto').classList.toggle('on', mathState.auto);
  $('#p-all').textContent = `כל הפרקים פתוחים: ${progress.all ? 'כן' : 'לא'}`; $('#p-all').classList.toggle('on', progress.all);
  $('#p-reset').textContent = '🗑 איפוס התקדמות'; $('#p-reset').classList.remove('armed'); resetArmed = false;
}
let resetArmed = false, resetT = null;
function openParent() { drawParent(); $('#parent').hidden = false; }
$('#p-auto').addEventListener('pointerup', () => { sfx.tap(); mathState.auto = !mathState.auto; saveProgress(); drawParent(); });
$('#p-all').addEventListener('pointerup', () => { sfx.tap(); progress.all = !progress.all; saveProgress(); refreshTitle(); drawParent(); });
$('#p-close').addEventListener('pointerup', () => { sfx.tap(); $('#parent').hidden = true; });
// reset needs two deliberate steps: a tap to arm it, then a 2-second hold
$('#p-reset').addEventListener('pointerdown', () => { clearTimeout(resetT); if (!resetArmed) return;
  resetT = setTimeout(() => { window.__dm.resetProgress(); drawParent(); titleToast('ההתקדמות אופסה'); }, 2000); });
for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) $('#p-reset').addEventListener(ev, () => { clearTimeout(resetT); if (ev === 'pointerup' && !resetArmed) { resetArmed = true; $('#p-reset').classList.add('armed'); $('#p-reset').textContent = 'בטוחים? החזיקו לחוץ 2 שניות לאישור'; } });
// full screen: where the browser has an API (iPad, Android), ask on the first tap; iPhone Safari has none, so there the
// home-screen web app (manifest.json) is the way and a one-time, dismissable hint explains it
const standalone = () => navigator.standalone === true || matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches;
addEventListener('pointerup', () => {
  try {
    if (standalone() || document.fullscreenElement || document.webkitFullscreenElement) return;
    const el = document.documentElement, f = el.requestFullscreen || el.webkitRequestFullscreen; if (!f) return;
    const p = f.call(el, { navigationUI: 'hide' }); if (p && p.catch) p.catch(() => { });
  } catch { /* full screen is a nice-to-have */ }
}, { once: true });
{ const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let seen = false; try { seen = localStorage.getItem('dm.a2hs') === '1'; } catch { }
  if (((isIOS && !standalone()) || params.get('a2hs') === '1') && !seen) $('#a2hs').hidden = false;
  $('#a2hs-close').addEventListener('pointerup', e => { e.stopPropagation(); $('#a2hs').hidden = true; try { localStorage.setItem('dm.a2hs', '1'); } catch { } }); }
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('dblclick', e => e.preventDefault());

// ---------------------------------------------------------------- loop
let lastMode = '';
// The loop must never die: one bad frame (an exception anywhere below) used to stop requestAnimationFrame for good,
// which froze the game. Now the next frame is always scheduled first and an error is only logged (once per message).
// Animation frames are not guaranteed: a browser may stop delivering them for a while even though the page is visible
// (seen in headless WebKit as multi-second gaps). Tweens, cameras and the story all advance in the frame, so a timer
// takes over whenever no frame has run for 400 ms.
const frameErrors = new Set(), frameStats = { raf: 0, fallback: 0 };
let lastFrameAt = 0;
function frame() { requestAnimationFrame(frame); frameStats.raf++; runFrame(); }
setInterval(() => { if (lastFrameAt && !document.hidden && performance.now() - lastFrameAt > 400) { frameStats.fallback++; runFrame(); } }, 130);
function runFrame() {
  lastFrameAt = performance.now();
  try { frameBody(); } catch (e) { const m = String(e && e.message); if (!frameErrors.has(m)) { frameErrors.add(m); console.error('frame error:', (e && e.stack) || e); } }
}
function frameBody() {
  timer.update(); const rawDt = Math.min(0.5, timer.getDelta()), dt = Math.min(0.05, rawDt); time += dt;
  if (G.mode !== lastMode) { camSnap = true; lastMode = G.mode; }
  if (G.mode === 'title') updateTitle(dt); else if (G.mode === 'cave') updateCave(dt); else if (G.mode === 'flight') { updateFlight(dt); for (let t = rawDt - dt; t > 1e-3; t -= 0.05) updateFlight(Math.min(0.05, t)); } // the rail keeps wall-clock pace when frames are slow (sub-steps of 50 ms, at most 0.5 s per frame)
  updateTweens(); updateSkip();
  if (G.tick) G.tick(dt, time);
  worm.update(dt, time); drake.update(dt, time); griffith.update(dt, time); king.update(dt, time);
  world.update(dt, time); cave.update(dt, time);
  stars.update(dt, time, fl.items[0] === stars.list[0] ? nextItem() : -1);
  ch2.update(dt, time, fl.items === ch2.bubbles.list ? nextItem() : -1);
  for (const k in swapped) swapped[k].update(dt, time);
  fx.setScale(innerHeight * Math.min(devicePixelRatio, engine.maxDpr)); fx.update(dt);
  if (engine.scene) engine.render(dt);
}

// ---------------------------------------------------------------- story watchdog
// If the story sits in one phase for 45 s while it is NOT the player's turn (no bubble, button, riddle, card, joystick
// or tap task on screen), something scripted has hung: log it, let the chapter finish its animations, and resolve the
// pending step so the story moves on. It never skips anything the player is meant to read or do.
const dog = { sig: '', since: performance.now(), nudges: 0 };
const playersTurn = () => G.mode === 'title' || G.mode === 'loading' || G.playerTurn || !$('#dialog').hidden || !$('#math').hidden || !$('#card').hidden || !$('#parent').hidden || $('#actions').children.length > 0 || !$('#joy').hidden;
setInterval(() => {
  const sig = `${G.mode}|${G.phase}|${token}`, now = performance.now();
  if (sig !== dog.sig || playersTurn() || document.hidden) { dog.sig = sig; dog.since = now; return; }
  if (now - dog.since < 45000) return;
  dog.since = now; dog.nudges++; console.warn(`story watchdog: no progress in "${G.phase}" for 45 s, nudging`);
  finishTweens();
  const r = nudgeStep; nudgeStep = null; if (r) setTimeout(r, 300);
}, 1000);

// ---------------------------------------------------------------- test / debug hook
const GO = {
  title: () => enterTitle(),
  cave: () => guard(() => ch1.start('intro')), bond: () => guard(() => ch1.start('bond')), math: () => guard(() => ch1.start('math')), flight: () => guard(() => ch1.start('flight')),
  ch1: () => guard(() => ch1.start('intro')),
  ch2: () => guard(() => ch2.start('intro')), 'ch2-glide': () => guard(() => ch2.start('glide')), 'ch2-warm': () => guard(() => ch2.start('warm')),
  'ch2-hatch': () => guard(() => ch2.start('hatch')), 'ch2-end': () => guard(() => ch2.start('end')),
  free: () => guard(() => free.start()),
  ch7: () => guard(() => ch7.start('intro')), 'ch7-flight': () => guard(() => ch7.start('flight')), 'ch7-end': () => guard(() => ch7.start('end')),
  ch6: () => guard(() => ch6.start('intro')), 'ch6-flight': () => guard(() => ch6.start('flight')), 'ch6-pots': () => guard(() => ch6.start('pots')), 'ch6-end': () => guard(() => ch6.start('end')),
  ch5: () => guard(() => ch5.start('intro')), 'ch5-patterns': () => guard(() => ch5.start('patterns')), 'ch5-flight': () => guard(() => ch5.start('flight')), 'ch5-end': () => guard(() => ch5.start('end')),
  ch4: () => guard(() => ch4.start('intro')), 'ch4-catch': () => guard(() => ch4.start('catch')), 'ch4-flight': () => guard(() => ch4.start('flight')), 'ch4-end': () => guard(() => ch4.start('end')),
  ch3: () => guard(() => ch3.start('intro')), 'ch3-mirrors': () => guard(() => ch3.start('mirrors')), 'ch3-flight': () => guard(() => ch3.start('flight')), 'ch3-end': () => guard(() => ch3.start('end')),
};
window.__dm = {
  ready: false,
  get mode() { return G.mode; }, get phase() { return G.phase; },
  bubbles() { const s = [...new Set(ui.said)]; ui.said.length = 0; return { n: s.length, longest: Math.max(0, ...s.map(t => t.length)) }; }, // blocking bubbles since the last call (repeats after 🏠 count once)
  set fast(v) { ui.fast = !!v; }, get fast() { return ui.fast; },
  go(name) { hideOverlays(); $('#fade').classList.remove('on'); leaveChapter(); GO[name] && GO[name](); return name; },
  walkToWorm() { drake.root.position.copy(worm.headWorld().setY(0)).add(new THREE.Vector3(2.2, 0, 2.2)); },
  math: {
    current: () => currentRiddle ? { answer: currentRiddle.answer, kind: currentRiddle.kind, level: currentRiddle.level, key: currentRiddle.key, options: currentRiddle.options } : null,
    state: () => ({ level: mathState.level, ceiling: mathState.ceiling, auto: mathState.auto }),
    setLevel(n) { mathState.level = clampLevel(n); mathState.ceiling = Math.max(mathState.ceiling, mathState.level); mathState.streak = mathState.misses = 0; saveProgress(); return mathState.level; },
    open(kind) { hideOverlays(); return mathApi.ask({ kind }); },
  },
  // test hook: a scripted step that never resolves, to prove the watchdog rescues the story
  hang() { hideOverlays(); leaveChapter(); guard(async () => { const step = runner(); G.mode = 'test'; G.phase = 'test-hang'; await step(new Promise(() => { })); G.phase = 'test-recovered'; }); },
  clips: () => Object.fromEntries(Object.entries(swapped).map(([k, v]) => [k, v.current])),
  collectNext() { const i = nextItem(); if (i >= 0) collect(i); },
  collectAll() { fl.items.forEach((s, i) => collect(i)); },
  // screen position (CSS px) of the next warm stone to tap in ch2, or null
  stoneScreen() { const p = ch2.nextStonePos(); if (!p) return null; const v = p.project(cam); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; },
  // screen position (CSS px) of the mirror to tap in ch3, or null
  mirrorScreen() { const p = ch3.nextMirrorPos(); if (!p) return null; const v = p.project(cam); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; },
  // screen position (CSS px) of a fireball to tap in ch4, or null
  fireballScreen() { const p = ch4.nextBallPos(); if (!p) return null; const v = p.project(cam); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; },
  // screen position (CSS px) of the crystal to tap in ch5 (or of a wrong one, for tests), or null
  crystalScreen(wrong) { const p = ch5.nextCrystalPos(wrong); if (!p) return null; const v = p.project(cam); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; },
  // screen position (CSS px) of the paint pot to tap in ch6, or null
  potScreen() { const p = ch6.nextPotPos(); if (!p) return null; const v = p.project(cam); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; },
  get progress() { return [...progress.done].sort(); }, get last() { return progress.last; },
  resetProgress() { progress.done.clear(); progress.last = null; progress.all = false; progress.free = 0; mathState = newAdaptive({}); try { localStorage.removeItem('dm.progress'); } catch { } refreshTitle(); },
  // screen-space boxes [x0, y0, x1, y1] (CSS px) of Drake and of Worm's head, for layout checks
  actorBoxes() {
    let behind = false; const px = v => { v.project(cam); if (v.z > 1) behind = true; return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; };
    const box = pts => { const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)].map(Math.round); };
    const corners = (obj, x, y0, y1, z) => { const out = []; for (const a of [-x, x]) for (const b of [y0, y1]) for (const c of [-z, z]) out.push(px(obj.localToWorld(new THREE.Vector3(a, b, c)))); return out; };
    drake.root.updateMatrixWorld(true); worm.root.updateMatrixWorld(true);
    // null when any part of the actor is behind the camera (it is then not a meaningful on-screen box)
    const actor = (o, ...dims) => { behind = false; const b = box(corners(o, ...dims)); return behind ? null : b; };
    return { drake: actor(drake.root, 0.4, 0, 1.85, 0.3), worm: actor(worm.head, 1.15, -0.75, 1.2, 1.45) };
  },
  stats: () => ({ ...engine.info(), mode: G.mode, phase: G.phase, stars: fl.got, models: modelStatus(MODEL_KEYS, swapped) }),
  setTier: t => { engine.noAuto = true; engine.setTier(t); },
  worm, engine, G, ch2, ch3, ch4, ch5, ch6, ch7, free, frameStats, get watchdog() { return dog.nudges; },
};

(async () => {
  await loadEnv();
  swapped = await loadModels({ worm, drake, griffith, king, castle: { root: world.castle }, ...ch2.modelTargets, ...ch3.modelTargets, ...ch4.modelTargets, ...ch5.modelTargets });
  enterTitle();
  if (params.has('tier')) window.__dm.setTier(params.get('tier'));
  // compile shaders for both scenes up-front (avoids hitches on iPad when the cave opens or chapter 2 actors appear)
  try { ch2.showAll(true); ch3.showAll(true); ch4.showAll(true); ch5.showAll(true); ch6.showAll(true); ch7.showAll(true); engine.renderer.compile(caveScene, cam); engine.renderer.compile(outdoor, cam); } catch { }
  ch2.showAll(false); ch3.showAll(false); ch4.showAll(false); ch5.showAll(false); ch6.showAll(false); ch7.showAll(false);
  frame();
  setTimeout(() => { $('#loading').classList.add('done'); window.__dm.ready = true; }, 300);
})();
