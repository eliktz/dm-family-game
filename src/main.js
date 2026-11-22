// מאסטרים של דרקונים — Chapter 1 "אבן הדרקון". A short, story-driven chapter:
// title → cave (meet Worm, Dragon Stone, feed + pet, gate riddle) → first flight (8 stars) → celebration → "to be continued".
import * as THREE from 'three';
import { Engine } from './engine.js';
import { createWorm } from './worm.js';
import { makeDrake, makeGriffith, makeKing } from './people.js';
import { buildOutdoor, buildStars, heightAt, PLATEAU } from './outdoor.js';
import { buildCave, GATE_POS } from './cave.js';
import { FX } from './fx.js';
import { ui, say, toast, hideToast, actions, clearActions, showJoy, input, joy, riddle, card, hideOverlays, fade } from './ui.js';
import { sfx, unlock, settings, save, music } from './audio.js';
import { glowSprite } from './tex.js';
import { loadModels } from './assets.js';

const $ = s => document.querySelector(s);
const params = new URLSearchParams(location.search);
const engine = new Engine($('#c'));
const cam = engine.camera;
const fx = new FX();
const timer = new THREE.Timer();
let time = 0, mode = 'loading', phase = 'loading';

// ---------------------------------------------------------------- scenes
const outdoor = new THREE.Scene(), caveScene = new THREE.Scene();
const world = buildOutdoor(); outdoor.add(world.group);
const stars = buildStars(8); outdoor.add(stars.group);
outdoor.fog = new THREE.Fog(0xcfdcea, 140, 560);
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
// cave marker (bouncing gold arrow over Worm while the kid should walk to him)
const marker = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.9, 20).rotateX(Math.PI), new THREE.MeshStandardMaterial({ color: 0xffd34a, emissive: 0xffa41a, emissiveIntensity: 1.5, metalness: 0.4, roughness: 0.3 }));
caveScene.add(marker); marker.visible = false;
// next-star guide arrow in flight
const guide = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.6, 16).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xffe07a, emissive: 0xffb21a, emissiveIntensity: 1.2 }));
guide.visible = false; // replaced by the HUD arrow (#arrow)
// floating apple for feeding
const apple = new THREE.Group();
apple.add(new THREE.Mesh(new THREE.SphereGeometry(0.28, 24, 16), new THREE.MeshPhysicalMaterial({ color: 0xe0282e, roughness: 0.25, clearcoat: 1 })));
const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6).scale(1.6, 0.3, 0.8), new THREE.MeshStandardMaterial({ color: 0x4caf3a })); leaf.position.set(0.08, 0.3, 0); apple.add(leaf);
apple.visible = false; caveScene.add(apple);
// mind-power aura sprite (green) around Worm in flight
const aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowSprite('rgba(120,255,170,0.6)', 'rgba(80,255,140,0)'), blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
aura.scale.setScalar(9);

let envOutdoor = null, swapped = {};
async function loadEnv() {
  try {
    const { background, env } = await engine.loadHDR('assets/hdri/kloofendal_day_1k.hdr');
    outdoor.background = background; outdoor.environment = env; envOutdoor = env;
  } catch (e) { outdoor.background = new THREE.Color(0x9fd0ff); }
  outdoor.backgroundIntensity = 0.85; outdoor.environmentIntensity = 0.55;
  caveScene.environment = engine.roomEnv(); caveScene.environmentIntensity = 0.22;
}
function useScene(s) {
  engine.setScene(s); fx.attach(s);
  for (const o of [worm.root, drake.root, aura]) s.add(o);
}

// ---------------------------------------------------------------- story runner (cancellable)
let token = 0; const CANCEL = Symbol('cancel');
const wait = ms => new Promise(r => setTimeout(r, ui.fast ? Math.min(ms, 60) : ms));
function runner() { const my = ++token; return async p => { const r = await p; if (my !== token) throw CANCEL; return r; }; }
const guard = fn => fn().catch(e => { if (e !== CANCEL) console.error(e); });
let until = null; // { test: () => bool, resolve }
const waitFor = test => new Promise(res => { until = { test, resolve: res }; });

// ---------------------------------------------------------------- TITLE
const TITLE_POS = new THREE.Vector3(-6, 0, 44);
function enterTitle() {
  token++; hideOverlays(); mode = 'title'; phase = 'title';
  useScene(outdoor); stars.group.visible = false;
  TITLE_POS.y = heightAt(TITLE_POS.x, TITLE_POS.z);
  worm.root.position.copy(TITLE_POS); worm.root.rotation.set(0, 0.25, 0); worm.setPose('coil'); worm.state.blend = 1; worm.setGlow(false);
  drake.root.position.set(TITLE_POS.x + 2.6, heightAt(TITLE_POS.x + 2.6, TITLE_POS.z + 2.2), TITLE_POS.z + 2.2); drake.root.rotation.set(0, -0.35, 0); drake.setSit(0); drake.setWalk(0);
  drake.root.scale.setScalar(1);
  $('#title').hidden = false; $('#hud').hidden = true; arrowEl.hidden = true; showJoy(false); $('#counter').hidden = true; aura.material.opacity = 0;
}

// ---------------------------------------------------------------- CAVE
const DRAKE_START = new THREE.Vector3(2.5, 0, 8.5), WORM_CAVE = new THREE.Vector3(-4, 0, -5.2);
let walkTarget = null, caveFree = false;
function setupCave() {
  useScene(caveScene); mode = 'cave'; cave.closeGate();
  worm.root.position.copy(WORM_CAVE); worm.root.rotation.set(0, Math.atan2(DRAKE_START.x - WORM_CAVE.x, DRAKE_START.z - WORM_CAVE.z), 0);
  worm.setPose('rest'); worm.state.blend = 1; worm.setGlow(false);
  drake.root.position.copy(DRAKE_START); drake.root.rotation.set(0, Math.PI + 0.4, 0); drake.setSit(0); drake.root.scale.setScalar(1); drake.setStoneGlow(0);
  griffith.root.position.set(7.2, 0, -3.5); griffith.root.rotation.set(0, -0.9, 0);
  camGoal = null; $('#title').hidden = true; $('#hud').hidden = false; $('#counter').hidden = true; aura.material.opacity = 0;
}
let camGoal = null; // { pos, look } cinematic override
async function storyCave(from = 'intro') {
  const step = runner();
  setupCave();
  if (from === 'intro') {
    await step(fade(true)); await step(card({ kicker: 'פרק 1', title: 'אבן הדרקון' })); await step(fade(false));
    phase = 'cave-intro';
    camGoal = { pos: new THREE.Vector3(-1, 4.5, 9), look: new THREE.Vector3(-3, 2, -4) };
    worm.lookAt(drake.root.position.clone().setY(1.5));
    await step(say('griffith', 'שלום, דרייק! ברוך הבא למערת הדרקונים, עמוק מתחת לטירה של המלך רולנד.'));
    await step(say('griffith', "אני גריפית', הקוסם של הטירה. מישהו גדול וחמוד מחכה לך כאן..."));
    worm.wiggle(1); sfx.purr();
    await step(say('drake', 'וואו! זה... דרקון?!'));
    await step(say('griffith', 'זה וורם, דרקון אדמה. לך אליו – הוא עדין מאוד!'));
    camGoal = null; phase = 'cave-walk'; caveFree = true; showJoy(true); marker.visible = true;
    toast(null, 'הזז את הג׳ויסטיק או גע בוורם כדי ללכת אליו 👆', 6000);
    await step(waitFor(() => drake.root.position.distanceTo(worm.headWorld().setY(0)) < 3.6));
    caveFree = false; walkTarget = null; showJoy(false); marker.visible = false; hideToast();
    // ---- Dragon Stone moment
    phase = 'stone';
    faceEachOther();
    camGoal = { pos: drake.root.position.clone().lerp(worm.headWorld(), 0.5).add(new THREE.Vector3(3.5, 1.2, 4.2)), look: drake.root.position.clone().lerp(worm.headWorld(), 0.5).setY(1.6) };
    await step(wait(500));
    stoneGlow = 1; worm.setGlow(true); sfx.magic(); fx.burst(drake.root.position.clone().setY(1.1), 0x7dffa0, 50, 3, 0.4, 1.6, 0.5);
    await step(say('griffith', 'תראה! אבן הדרקון שעל הצוואר שלך זוהרת!'));
    await step(say('griffith', 'דרייק, אתה מאסטר דרקונים!'));
    worm.wiggle(1.2); sfx.happy();
    await step(say('worm', 'שלום, דרייק. אני וורם. אנחנו יכולים לדבר בלי מילים!'));
    await step(say('drake', 'אני שומע אותך בתוך הראש! איזה כיף!'));
    stoneGlow = 0.25; worm.setGlow(false);
    await step(say('griffith', 'וורם קצת רעב. בוא תאכיל אותו ותלטף אותו.'));
  }
  if (from === 'intro' || from === 'bond') {
    if (from === 'bond') { drake.root.position.copy(worm.headWorld().setY(0)).add(new THREE.Vector3(2.4, 0, 1.6)); faceEachOther(); }
    phase = 'bond';
    camGoal = { pos: drake.root.position.clone().add(new THREE.Vector3(3.2, 2.6, 5.2)), look: drake.root.position.clone().lerp(worm.headWorld(), 0.6).setY(1.4) };
    const done = { feed: false, pet: false };
    await step(new Promise(res => {
      const check = () => { if (done.feed && done.pet) res(); };
      actions([
        { id: 'btn-feed', label: '🍎 להאכיל', onClick: b => { if (busy) return; feed().then(() => { done.feed = true; b.classList.add('done'); check(); }); } },
        { id: 'btn-pet', label: '✋ ללטף', cls: 'green', onClick: b => { if (busy) return; pet().then(() => { done.pet = true; b.classList.add('done'); check(); }); } },
      ]);
    }));
    clearActions(); await step(wait(400));
    await step(say('worm', 'דרייק, אני כל כך שמח שאתה המאסטר שלי!'));
    await step(say('griffith', 'יפה מאוד! עכשיו נפתח את שער המערה. הוא נפתח רק למי שפותר חידה קסומה.'));
  }
  // ---- riddle at the gate
  phase = 'math';
  camGoal = { pos: new THREE.Vector3(-1.5, 4.5, 5), look: GATE_POS.clone().setY(2.5) };
  const [a, b] = params.has('a') ? [+params.get('a'), +params.get('b')] : [3, 2];
  await step(riddle(a, b, { right: () => { worm.wiggle(1.4); sfx.happy(); }, wrong: () => toast('worm', 'אתה יכול! אני מאמין בך 💚', 2500) }));
  phase = 'gate'; cave.openGate(); sfx.whoosh(); fx.burst(GATE_POS.clone().setY(3), 0xfff2b0, 60, 5, 0.5, 1.6, -0.5);
  await step(wait(1200));
  await step(say('griffith', 'השער פתוח! כל הכבוד, דרייק!'));
  camGoal = { pos: new THREE.Vector3(9, 5.5, 7), look: worm.headWorld().lerp(GATE_POS, 0.45).setY(2.2) };
  worm.wiggle(1.5);
  await step(say('worm', 'עלה על הגב שלי, דרייק. אני אראה לך את הממלכה!'));
  await step(say('worm', 'אין לי כנפיים – אבל אני טס בכוח המחשבה שלי! ✨'));
  phase = 'ready-fly';
  await step(new Promise(res => actions([{ id: 'btn-fly', label: '🐉 בוא נטוס!', cls: 'pulse', onClick: () => res() }])));
  clearActions();
  worm.setGlow(true); sfx.magic(); fx.burst(worm.headWorld(), 0x7dffb0, 80, 6, 0.5, 1.5, 0);
  await step(wait(700)); await step(fade(true));
  return storyFlight(step);
}
let busy = false, stoneGlow = 0;
function faceEachOther() {
  const hw = worm.headWorld(); drake.root.rotation.y = Math.atan2(hw.x - drake.root.position.x, hw.z - drake.root.position.z);
  worm.lookAt(drake.root.position.clone().setY(1.4));
}
async function feed() {
  busy = true; const from = drake.root.position.clone().add(new THREE.Vector3(0, 1.1, 0)), to = worm.mouthWorld();
  apple.visible = true; worm.openMouth(1); drake.wave(0.6);
  const T = ui.fast ? 0.1 : 0.9, t0 = performance.now();
  await new Promise(r => { const tick = () => { const k = Math.min(1, (performance.now() - t0) / 1000 / T); apple.position.lerpVectors(from, to, k).y += Math.sin(k * Math.PI) * 1.6; apple.rotation.y += 0.2; if (k < 1) requestAnimationFrame(tick); else r(); }; tick(); });
  apple.visible = false; worm.openMouth(0); worm.chomp(); sfx.munch(); fx.burst(to, 0xffe07a, 18, 2, 0.3, 0.8);
  await wait(700); worm.wiggle(1.4); sfx.happy(); fx.hearts3(worm.headWorld().add(new THREE.Vector3(0, 0.5, 0)).lerp(cam.position, 0.15), 5);
  toast('worm', 'מממ! תפוח מתוק! תודה, דרייק!', 2600); await wait(1600); busy = false;
}
async function pet() {
  busy = true; drake.wave(1.5); worm.wiggle(1.8); sfx.purr(); fx.hearts3(worm.headWorld().add(new THREE.Vector3(0, 0.5, 0)).lerp(cam.position, 0.15), 8);
  toast('worm', 'הי הי, זה מדגדג! אני אוהב את זה!', 2600); await wait(1800); busy = false;
}
const WORM_TAP_LINES = ['היי! 😊', 'אני אוהב אותך, דרייק!', 'עוד ליטוף? 💚', 'הי הי! זה מדגדג!', 'אתה החבר הכי טוב שלי!'];
let tapLine = 0;
function wormTapped() {
  worm.wiggle(1.3); sfx.purr(); fx.hearts3(worm.headWorld().add(new THREE.Vector3(0, 0.5, 0)).lerp(cam.position, 0.15), 4);
  if (mode !== 'title') toast('worm', WORM_TAP_LINES[tapLine++ % WORM_TAP_LINES.length], 2000);
}

// ---------------------------------------------------------------- FLIGHT
const fl = { pos: new THREE.Vector3(), yaw: 0, vy: 0, yawRate: 0, idle: 0, got: 0, done: false, kingSaid: false, speed: 11, glanceT: 0, glanceAmt: 1, cam: { v: 0, vel: 0 } };
// "look at me!" moment: Worm turns his head back to Drake with a happy wiggle while the camera eases
// around to a 3/4 side view of his face, then drifts back to the chase view (smooth-damped, no cuts).
function glance(hold = 1.1, amount = 1) { fl.glanceT = hold; fl.glanceAmt = amount; worm.glanceBack(hold + 0.15); }
function smoothDamp(o, target, smoothTime, dt) {
  const om = 2 / smoothTime, x = om * dt, e = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x), ch = o.v - target, tmp = (o.vel + om * ch) * dt;
  o.vel = (o.vel - om * tmp) * e; o.v = target + (ch + tmp) * e;
}
const nextStar = () => stars.list.findIndex(s => !s.got);
async function storyFlight(step) {
  step = step || runner();
  useScene(outdoor); mode = 'flight'; phase = 'fly'; stars.group.visible = true; stars.reset();
  Object.assign(fl, { got: 0, done: false, kingSaid: false, idle: 0, vy: 0, yawRate: 0, glanceT: 0 }); fl.cam.v = fl.cam.vel = 0;
  const a0 = 0.35 - 0.5, R = 37; fl.pos.set(Math.cos(a0) * R, PLATEAU + 14, Math.sin(a0) * R);
  fl.yaw = Math.atan2(-Math.sin(a0), Math.cos(a0));
  worm.setPose('fly'); worm.state.blend = 1; worm.setGlow(false); worm.lookAt(null);
  drake.setSit(1); drake.setWalk(0);
  $('#title').hidden = true; $('#hud').hidden = false; $('#counter').hidden = false; updateCounter();
  camSnap = true; aura.material.opacity = 0.08;
  await step(fade(false));
  showJoy(true);
  worm.wiggle(1); glance(1.5);
  toast('worm', 'תחזיק חזק! בוא נאסוף את כל 8 הכוכבים הזוהרים!', 3500);
  await step(wait(3600));
  toast(null, 'הזז את הג׳ויסטיק כדי לכוון את וורם ⭐', 4000);
  await step(waitFor(() => fl.got >= stars.list.length));
  phase = 'celebrate'; fl.done = true; showJoy(false); arrowEl.hidden = true;
  sfx.fanfare(); worm.wiggle(2.5); glance(2.2);
  for (let i = 0; i < 3; i++) setTimeout(() => fx.confetti(fl.pos.clone().add(new THREE.Vector3(0, 3, 0)), 70), i * 500);
  toast('worm', 'זאת הייתה הטיסה הכי כיפית שלי!', 3000);
  await step(wait(2600));
  const v = await step(card({ kicker: '⭐ ⭐ ⭐ ⭐ ⭐ ⭐ ⭐ ⭐', title: 'כל הכבוד!', text: 'אספת את כל 8 הכוכבים יחד עם וורם!', buttons: [{ label: '🔁 עוד פעם?', value: 'again' }, { label: 'סיום הפרק ◀', value: 'end', cls: 'green' }] }));
  if (v === 'again') { await step(fade(true)); return storyFlight(step); }
  return storyEnd(step);
}
async function storyEnd(step) {
  step = step || runner(); phase = 'end'; mode = 'flight'; fl.done = true; showJoy(false); arrowEl.hidden = true;
  const v = await step(card({ kicker: 'סוף פרק 1 – אבן הדרקון', title: 'המשך יבוא…', text: 'בפרק הבא: ביצה מסתורית מתגלגלת אל מערת הדרקונים… מה יש בתוכה? 🥚', buttons: [{ label: '🔁 עוד פעם?', value: 'again' }, { label: '🏠 לתפריט', value: 'home', cls: 'green' }] }));
  if (v === 'again') { await step(fade(true)); return storyFlight(step); }
  await step(fade(true)); enterTitle(); await fade(false);
}
function updateCounter() { $('#count').textContent = `${fl.got} / ${stars.list.length}`; const c = $('#counter'); c.classList.remove('bump'); c.offsetWidth; c.classList.add('bump'); }
const STAR_LINES = ['יש! ⭐', 'עוד אחד!', 'וואו, אתה מעולה!', 'חצי דרך! 🎉', 'כל הכבוד!', 'אנחנו צוות מנצח!', 'רק עוד אחד!', ''];
function collect(i) {
  const s = stars.list[i]; if (s.got) return; s.got = true; s.pop = 0; fl.got++;
  sfx.star(fl.got - 1); fx.burst(s.g.position.clone(), 0xffe27a, 40, 7, 0.6, 1.2, -2); worm.wiggle(0.8); glance(1.0, 0.8); updateCounter();
  if (fl.got < stars.list.length && STAR_LINES[fl.got - 1]) toast('worm', STAR_LINES[fl.got - 1], 1800);
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
  const ni = nextStar();
  if ((!active && fl.idle > 1.2) || fl.done) {
    // gentle autopilot: toward the next star, or a lazy circle around the castle when done
    const tgt = ni >= 0 && !fl.done ? stars.list[ni].g.position : new THREE.Vector3(Math.cos(time * 0.25) * 40, PLATEAU + 18, Math.sin(time * 0.25) * 40);
    const d = tgt.clone().sub(fl.pos); const want = Math.atan2(d.x, d.z);
    yawRate = THREE.MathUtils.clamp(wrapAng(want - fl.yaw) * 1.3, -0.75, 0.75); vy = THREE.MathUtils.clamp(d.y * 0.8, -4, 4);
  }
  // keep inside the kingdom
  const hd = Math.hypot(fl.pos.x, fl.pos.z);
  if (hd > 110) { const want = Math.atan2(-fl.pos.x, -fl.pos.z); yawRate = THREE.MathUtils.clamp(wrapAng(want - fl.yaw) * 2, -1.2, 1.2); }
  fl.yawRate += (yawRate - fl.yawRate) * Math.min(1, dt * 4); fl.vy += (vy - fl.vy) * Math.min(1, dt * 3);
  fl.yaw += fl.yawRate * dt;
  const fwd = new THREE.Vector3(Math.sin(fl.yaw), 0, Math.cos(fl.yaw));
  fl.pos.addScaledVector(fwd, fl.speed * dt); fl.pos.y += fl.vy * dt;
  const floorY = Math.max(heightAt(fl.pos.x, fl.pos.z), hd < 22 ? PLATEAU + 26 : 0) + 5;
  fl.pos.y = THREE.MathUtils.clamp(fl.pos.y, Math.max(floorY, 4), 70);
  // magnet + collect
  stars.list.forEach((s, i) => { if (s.got) return; const d = s.g.position.distanceTo(fl.pos); if (d < 10) fl.pos.lerp(s.g.position, Math.min(1, dt * 1.4)); if (d < 4.5) collect(i); });
  worm.root.position.copy(fl.pos);
  worm.root.rotation.set(-fl.vy * 0.04, fl.yaw, -fl.yawRate * 0.35, 'YXZ');
  worm.state.bank = fl.yawRate * 1.2; worm.state.climb = fl.vy * 0.05;
  // rider
  drake.root.position.copy(worm.seatWorld(0.16)); drake.root.quaternion.copy(worm.root.quaternion);
  aura.position.copy(worm.seatWorld(0.3));
  if (Math.random() < 0.35) fx.trail(worm.seatWorld(0.3 + Math.random() * 0.6), 0x7dffb0, 0.25);
  // guide arrow toward next star
  pointArrow(ni >= 0 && !fl.done ? stars.list[ni].g.position : null);
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
  if (camSnap) { cam.position.copy(camPos); camLook.copy(look); camSnap = false; }
  cam.position.lerp(camPos, Math.min(1, dt * 3)); camLook.lerp(look, Math.min(1, dt * 4)); cam.lookAt(camLook);
  if (until && until.test()) { const u = until; until = null; u.resolve(); }
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
  if (caveFree) {
    const inp = input(); let mv = new THREE.Vector3(inp.x, 0, inp.y);
    if (mv.lengthSq() > 0.01) walkTarget = null;
    else if (walkTarget) { mv = walkTarget.clone().sub(drake.root.position).setY(0); if (mv.length() < 0.3) { walkTarget = null; mv.set(0, 0, 0); } else mv.normalize(); }
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
  } else drake.setWalk(0);
  drake.setStoneGlow(stoneGlow * (0.8 + 0.2 * Math.sin(time * 6)));
  if (stoneGlow > 0.5 && Math.random() < 0.5) fx.trail(drake.root.position.clone().setY(1.0), 0x7dffa0, 0.25);
  griffith.root.lookAt(drake.root.position.x, 0, drake.root.position.z);
  // camera
  let pos, look;
  if (camGoal) { pos = camGoal.pos; look = camGoal.look; }
  else { const d = drake.root.position; pos = d.clone().add(new THREE.Vector3(0, 6.2, 9.8)); look = d.clone().lerp(worm.headWorld(), 0.3).setY(0.9);
    const rr = Math.hypot(pos.x, pos.z); if (rr > 16) { pos.x *= 16 / rr; pos.z *= 16 / rr; } }
  if (camSnap) { cam.position.copy(pos); camLook.copy(look); camSnap = false; }
  cam.position.lerp(pos, Math.min(1, dt * 2.5)); camLook.lerp(look, Math.min(1, dt * 3)); cam.lookAt(camLook);
  if (until && until.test()) { const u = until; until = null; u.resolve(); }
}

// taps on the 3D view: Worm → wiggle (or walk to him); floor → walk there
$('#c').addEventListener('pointerdown', e => {
  unlock();
  ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ndc, cam);
  const hitWorm = ray.intersectObjects(worm.hitMeshes, false).length > 0;
  if (mode === 'title') { if (hitWorm) wormTapped(); return; }
  if (mode === 'cave') {
    if (caveFree) {
      if (hitWorm) walkTarget = worm.headWorld().setY(0);
      else { const h = ray.intersectObject(cave.floor, false)[0]; if (h) walkTarget = h.point.setY(0); }
    } else if (hitWorm && !busy) wormTapped();
  } else if (mode === 'flight' && hitWorm) wormTapped();
});

// ---------------------------------------------------------------- buttons
$('#btn-start').addEventListener('pointerup', () => { unlock(); sfx.tap(); if (settings.sound) music(true); guard(() => storyCave('intro')); });
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
  if (mode !== lastMode) { camSnap = true; lastMode = mode; }
  if (mode === 'title') updateTitle(dt); else if (mode === 'cave') updateCave(dt); else if (mode === 'flight') updateFlight(dt);
  worm.update(dt, time); drake.update(dt, time); griffith.update(dt, time); king.update(dt, time);
  world.update(dt, time); cave.update(dt, time);
  stars.update(dt, time, nextStar());
  for (const k in swapped) swapped[k].mixer?.update(dt);
  fx.setScale(innerHeight * Math.min(devicePixelRatio, engine.maxDpr)); fx.update(dt);
  if (engine.scene) engine.render(dt);
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------- test / debug hook
window.__dm = {
  ready: false,
  get mode() { return mode; }, get phase() { return phase; },
  set fast(v) { ui.fast = !!v; }, get fast() { return ui.fast; },
  go(name) { hideOverlays(); $('#fade').classList.remove('on');
    if (name === 'title') enterTitle();
    else if (['cave', 'bond', 'math'].includes(name)) guard(() => storyCave(name === 'cave' ? 'intro' : name));
    else if (name === 'flight') guard(() => storyFlight());
    return name;
  },
  walkToWorm() { drake.root.position.copy(worm.headWorld().setY(0)).add(new THREE.Vector3(2.2, 0, 2.2)); },
  collectNext() { const i = nextStar(); if (i >= 0) collect(i); },
  collectAll() { stars.list.forEach((s, i) => collect(i)); },
  stats: () => ({ ...engine.info(), mode, phase, stars: fl.got }),
  setTier: t => { engine.noAuto = true; engine.setTier(t); },
  worm, engine,
};

(async () => {
  await loadEnv();
  swapped = await loadModels({ worm: worm, drake, griffith, king, castle: { root: world.castle } });
  enterTitle();
  if (params.has('tier')) window.__dm.setTier(params.get('tier'));
  // compile shaders for both scenes up-front (avoids hitches on iPad when the cave opens)
  try { engine.renderer.compile(caveScene, cam); engine.renderer.compile(outdoor, cam); } catch { }
  frame();
  setTimeout(() => { $('#loading').classList.add('done'); window.__dm.ready = true; }, 300);
})();
