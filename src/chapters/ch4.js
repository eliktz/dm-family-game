// Chapter 4 "הלהבה של רורי" (see STORY.md): Rori arrives with Vulcan, her fire dragon, who has fiery hiccups. Every
// hiccup pops out a small, harmless fireball. Worm's idea: there is a feast at the castle tonight, so each hiccup
// becomes a warm loaf of bread. The player taps the floating fireballs and Worm bakes them with his mind power, ten
// loaves in two rounds of five (a ten-frame on the table), with two riddles from the adaptive engine in between.
// Then Worm teaches Vulcan to breathe slowly and the hiccups stop. Keepsake: a warm ember that glows but does not burn.
// Nothing can be lost: an untapped fireball just pops into steam and another comes; after a quiet while Worm bakes one
// himself. Everything is created once at start-up (hidden); animations use the shared wall-clock tweens.
import { createWorm } from '../worm.js';
import { makeChibi } from '../people.js';
import { glowSprite } from '../tex.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const FIRE = { back: 0xa8261c, side: 0xd2402a, belly: 0xffc978, tail: 0xd2402a, spike: 0xff9a2e, head: 0xc4331f, muzzle: 0xe2603a, fin: 0xff8a2a, horn: 0xffe2b0, iris: 0x7a2a10, sheen: 0xffc0a0 };

export function chapter4(G) {
  const { THREE, cam, fx, worm, drake, outdoor, heightAt, sun, world, ui, say, toast, hideToast, card, fade, sfx, runner, wait, tween, fl, actions, clearActions } = G;
  const V = (x, y, z) => new THREE.Vector3(x, y, z), $ = s => document.querySelector(s);
  const ground = (x, z, up = 0) => V(x, heightAt(x, z) + up, z);
  const ease = k => k * k * (3 - 2 * k), lerp = THREE.MathUtils.lerp;

  // ---------------------------------------------------------------- layout: the castle lawn, camera looking at the castle
  const WORM_AT = ground(3.5, 23.5), WORM_RY = -1.1;
  const DRAKE_AT = ground(-2.6, 31.2), VULCAN_AT = ground(-9.5, 26.5), RORI_AT = ground(-7.4, 29.8);
  const VULCAN_FROM = ground(-24, 33), RORI_FROM = ground(-21.5, 36);
  const TABLE_AT = ground(3.4, 29.6);
  const SLOTS = Array.from({ length: 10 }, (_, i) => TABLE_AT.clone().add(V(-1.7 + (i % 5) * 0.85, 1.12, (i < 5 ? -0.42 : 0.42))));   // a ten-frame: two rows of five
  const CAM_WIDE = G.engine.viewShift ? { pos: ground(0.4, 42, 6.4), look: ground(0.4, 26.8, 1.6) } : { pos: ground(0.2, 48.5, 8.2), look: ground(0.2, 26.4, 2.0) };
  const CAM_MEET = { pos: ground(-1.5, 41.5, 3.8), look: ground(-7.4, 28, 1.6) };
  const CAM_WORM = { pos: ground(0.5, 33.5, 2.6), look: ground(2.6, 24.4, 1.9) };
  const CAM_TABLE = { pos: ground(3.8, 36.5, 3.6), look: ground(3.2, 28.6, 1.3) };

  // ---------------------------------------------------------------- actors
  const rori = makeChibi({ hairStyle: 'tousled', hair: 0xc2401c, eye: 0x2a1408, tunic: 0xb5302a, sleeve: 0xd0503a, pants: 0x4a3a34, belt: 0xe3b54a, shoes: 0x4a2c20, skin: 0xf0c4a2, pendant: true, lod: 0.5 });
  const vulcan = createWorm({ name: 'fireDragon', colors: FIRE, length: 8.5, finScale: 1.9, dorsal: 'fin', lod: 0.4, light: false, shadow: false, simple: true });
  vulcan.root.scale.setScalar(0.9); rori.root.traverse(o => { o.castShadow = false; });
  // feast table
  const woodM = new THREE.MeshStandardMaterial({ color: 0x8a5a34, roughness: 0.85 });
  const table = new THREE.Mesh(mergeGeometries([new THREE.BoxGeometry(4.9, 0.16, 1.9).translate(0, 1.0, 0), ...[[-2.2, -0.8], [2.2, -0.8], [-2.2, 0.8], [2.2, 0.8]].map(([x, z]) => new THREE.BoxGeometry(0.18, 1.0, 0.18).translate(x, 0.5, z))]), woodM);
  table.position.copy(TABLE_AT); table.receiveShadow = true;
  const cloth = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.03, 1.5).translate(0, 1.1, 0), new THREE.MeshStandardMaterial({ color: 0x6f86a3, roughness: 1 })); cloth.position.copy(TABLE_AT);
  // ten loaves (one shared geometry + material) and four fireballs (pool)
  const loafG = new THREE.SphereGeometry(0.34, 12, 8).scale(1.15, 0.62, 0.8), loafM = new THREE.MeshStandardMaterial({ color: 0xc98a45, roughness: 0.75 });
  const loaves = SLOTS.map(() => { const m = new THREE.Mesh(loafG, loafM); m.visible = false; return m; });
  const ballG = new THREE.SphereGeometry(0.42, 14, 10), ballM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 0.75, 0.2) });
  const fireTex = glowSprite('rgba(255,190,90,1)', 'rgba(255,110,30,0)'), emberTex = glowSprite('rgba(255,170,90,1)', 'rgba(255,90,30,0)');
  const balls = Array.from({ length: 4 }, () => { const g = new THREE.Group(); g.add(new THREE.Mesh(ballG, ballM));
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: fireTex, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8 })); sp.scale.setScalar(2.6); g.add(sp); g.visible = false;
    return { g, on: false, t0: 0, from: V(0, 0, 0), to: V(0, 0, 0) }; });
  // the keepsake: a small warm ember
  const ember = new THREE.Group(); ember.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 0.6, 0.2) })));
  { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: emberTex, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.9 })); sp.scale.setScalar(2.2); ember.add(sp); }
  const actors = [rori.root, vulcan.root, table, cloth, ember, ...loaves, ...balls.map(b => b.g)];
  for (const a of actors) outdoor.add(a);
  function showAll(v) { for (const a of actors) a.visible = v; if (!v) return; ember.visible = false; for (const l of loaves) l.visible = false; for (const b of balls) { b.g.visible = false; b.on = false; } }
  showAll(false);

  // ---------------------------------------------------------------- state
  let camGoal = CAM_WIDE, camSnap = true, catching = false, target = 0, caught = 0, catchDone = null, lastSpawn = 0, lastCatch = 0, helped = false, breathe = 0;
  const camLook = V(0, 0, 0);
  const setCount = () => G.setCounter(`${caught} / 10`, '🍞');
  function hiccup() { vulcan.chomp(); vulcan.wiggle(0.9); sfx.hic ? sfx.hic() : sfx.tap(); }
  function spawn(now) {
    const b = balls.find(x => !x.on); if (!b) return; hiccup(); lastSpawn = now;
    b.on = true; b.t0 = now; b.g.visible = true; b.from.copy(vulcan.mouthWorld(V(0, 0, 0)));
    b.to.copy(ground(-4.5 + Math.random() * 7.5, 25.5 + Math.random() * 3.2, 2.6 + Math.random() * 1.9));
  }
  function bake(b) { // a tapped fireball becomes a warm loaf that floats to its place on the table
    b.on = false; b.g.visible = false; const i = caught; caught++; lastCatch = performance.now(); setCount();
    sfx.star(i); fx.burst(b.g.position.clone(), 0xfff0c8, 26, 3, 0.45, 0.9, 0.6); worm.setGlow(true); setTimeout(() => worm.setGlow(false), 500);
    const loaf = loaves[i], from = b.g.position.clone(), to = SLOTS[i]; loaf.visible = true;
    tween(0.7, k => { const e = ease(k); loaf.position.lerpVectors(from, to, e); loaf.position.y += Math.sin(e * Math.PI) * 0.9; loaf.scale.setScalar(0.5 + 0.5 * e); });
    if (caught >= target && catchDone) { const r = catchDone; catchDone = null; catching = false; setTimeout(r, ui.fast ? 0 : 600); }
  }

  // ---------------------------------------------------------------- the fireball chase (rail-guided, like the other chapters' flights)
  // One giant hiccup sends 12 little fireballs up round the castle. Worm, Drake and Vulcan fly a spiral rail (clockwise,
  // opening out; about 55 s) and every fireball they reach turns into a warm bun. The balls reuse the bakery's geometry,
  // material and glow texture, so the chase adds almost nothing to the budget.
  const CHASE = 12, chaseGroup = new THREE.Group(); chaseGroup.visible = false; outdoor.add(chaseGroup);
  const spiral = (a, R, y) => V(Math.cos(a) * R, G.PLATEAU + y, Math.sin(a) * R);
  const chase = Array.from({ length: CHASE }, (_, i) => {
    const g = new THREE.Group(); g.position.copy(spiral(2.3 - i * 0.72, 38 + i * 1.9, 12 + 3.2 * Math.sin(i * 1.4) + i * 0.25)); g.position.y = Math.max(g.position.y, heightAt(g.position.x, g.position.z) + 8); // never inside a hill
    const m = new THREE.Mesh(ballG, ballM); m.scale.setScalar(2); g.add(m);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: fireTex, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8 })); sp.scale.setScalar(6.5); g.add(sp); chaseGroup.add(g);
    return { g, sp, base: g.position.clone(), got: false, pop: 0 };
  });
  let chasing = false, puffAt = 0, puffing = false;
  function flightTick(dt, time) { // Vulcan keeps formation on the inside of the turn; the fireballs bob and flicker
    const yaw = worm.root.rotation.y, c = Math.cos(yaw), s = Math.sin(yaw), ox = 5.6, oz = -0.8;
    vulcan.root.position.set(worm.root.position.x + ox * c + oz * s, worm.root.position.y + 0.6 + Math.sin(time * 1.8) * 0.35, worm.root.position.z - ox * s + oz * c); vulcan.root.rotation.set(0, yaw, 0); vulcan.update(dt, time);
    const ni = G.nextItem();
    chase.forEach((o, i) => { if (o.got) { o.pop += dt; const k = Math.max(0, 1 - o.pop * 2.5); o.g.scale.setScalar(k * (1 + o.pop * 3)); o.g.visible = k > 0; }
      else { if (!puffing || i !== ni) o.g.position.y = o.base.y + Math.sin(time * 2.2 + i * 1.7) * 0.6; o.sp.material.opacity = (i === ni ? 0.85 : 0.6) + 0.12 * Math.sin(time * 9 + i); } });
  }
  function onBall(i, o) { // caught: a puff of steam and a warm bun for the feast
    const n = fl.got; sfx.star(n - 1); fx.burst(o.g.position.clone(), 0xffb060, 36, 6, 0.6, 1.1, -1); fx.burst(o.g.position.clone(), 0xf2f2f2, 16, 3, 0.5, 0.9, 1.2); fx.burst(fl.pos.clone(), 0xc98a45, 14, 3, 0.5, 0.9, 0.5);
    worm.wiggle(0.8); vulcan.wiggle(1); if (n % 3 === 1) G.glance(1.0, 0.8); if (n % 4 === 0) hiccup();
    G.setCounter(`10 + ${n} = ${10 + n}`, '🍞');
    const line = { 1: 'תפסנו! לחמנייה חמה! 🍞', 6: 'חצי דרך! עוד לחמניות לסעודה', 11: 'רק עוד אחד!' }[n]; if (line) toast('worm', line, 1900);
  }
  // Vulcan's warm puff (power button): his breath carries the next fireball straight to Worm. Always works; a 2.5 s rest
  // between uses keeps the chase the longest part of the chapter.
  function firePuff() {
    const i = G.nextItem(), o = chase[i], now = performance.now(); if (!chasing || !o || puffing || now - puffAt < 2500 || fl.done) return;
    puffing = true; puffAt = now; hiccup(); const from = o.g.position.clone(), mouth = vulcan.mouthWorld(V(0, 0, 0));
    for (let k = 0; k <= 5; k++) fx.burst(mouth.clone().lerp(from, k / 5), 0xff9a3a, 10, 2, 0.45, 0.7, 0);
    tween(0.5, k => { o.g.position.lerpVectors(from, fl.pos, k * k); fx.trail(o.g.position.clone(), 0xffb060, 0.45); }).then(() => { puffing = false; if (chasing && !o.got && G.nextItem() === i) G.collectNext(); });
  }
  const endChase = () => { chasing = false; puffing = false; chaseGroup.visible = false; clearActions(); };
  const setTable = () => { loaves.forEach((l, i) => { l.visible = true; l.position.copy(SLOTS[i]); l.scale.setScalar(1); }); caught = 10; }; // the ten loaves already baked
  async function flight(step) {
    showAll(false); rori.root.visible = table.visible = cloth.visible = true; setTable(); G.stars.group.visible = false;
    chaseGroup.visible = true; for (const o of chase) { o.got = false; o.pop = 0; o.g.visible = true; o.g.scale.setScalar(1); o.g.position.copy(o.base); }
    vulcan.root.visible = true; vulcan.setPose('fly'); vulcan.state.blend = 1; vulcan.lookAt(null); chasing = true; puffing = false;
    G.startFlight({ items: chase, lead: [spiral(3.2, 38, 11.5), spiral(2.75, 38, 12)], exit: [spiral(-6.0, 61, 14), spiral(-6.4, 61, 13), spiral(-6.8, 60, 12)], speed: 8.5, camSide: 1, onCollect: onBall });
    G.tick = tick; G.phase = 'c4-flight'; G.checkpoint(4, 'flight'); G.setCounter('10', '🍞');
    await step(fade(false)); G.showJoy(true); worm.wiggle(1); G.glance(1.4);
    toast('worm', 'כדורי האש עפו לשמיים! תופסים אותם יחד עם וולקן 🔥', 3800);
    await step(wait(3900));
    actions([{ id: 'btn-puff', label: '🔥 נשיפת אש!', onClick: firePuff }]);
    await step(G.waitFor(() => fl.got >= CHASE));
    G.phase = 'c4-flight-done'; fl.done = true; G.showJoy(false); clearActions(); sfx.fanfare(); worm.wiggle(2); vulcan.wiggle(2); G.glance(1.8);
    toast('worm', 'תפסנו את כולם! איזו סעודה תהיה!', 2600);
    await step(wait(2600)); await step(fade(true));
    endChase(); stage(true); setTable(); $('#counter').hidden = true;
    await step(fade(false));
  }

  function tick(dt, time) {
    if (G.mode === 'flight' && chasing) return flightTick(dt, time);
    if (G.mode !== 'bakery') return;
    vulcan.update(dt, time); rori.update(dt, time);
    const now = performance.now();
    if (catching) {
      if (now - lastSpawn > 1500 && balls.filter(b => b.on).length < 3) spawn(now);
      if (now - lastCatch > 9000) { const b = balls.find(x => x.on && now - x.t0 > 900); if (b) { if (!helped) { helped = true; toast('worm', 'אני אופה אחד בשבילך! ✨', 2000); } bake(b); } } // never stuck
    }
    for (const b of balls) {
      if (!b.on) continue; const age = (now - b.t0) / 1000, k = Math.min(1, age / 0.9);
      b.g.position.lerpVectors(b.from, b.to, ease(k)); b.g.position.y += Math.sin(k * Math.PI) * 1.2 + Math.max(0, age - 0.9) * 0.16 + Math.sin(now / 300 + b.t0) * 0.12;
      b.g.scale.setScalar(0.5 + 0.5 * k + 0.08 * Math.sin(now / 90));
      if (age > 8 || !catching) { b.on = false; b.g.visible = false; fx.burst(b.g.position.clone(), 0xf2f2f2, 14, 2, 0.4, 0.8, 0.8); } // pops into harmless steam
    }
    // slow breathing: Worm glows and swells gently, Vulcan follows
    const br = breathe ? 0.5 - 0.5 * Math.cos(now / 1000 * Math.PI * 2 / 3.2) : 0;
    vulcan.root.scale.setScalar(0.9 * (1 + 0.05 * br));
    if (ember.visible) { ember.rotation.y = now / 400; ember.children[1].material.opacity = 0.7 + 0.2 * Math.sin(now / 200); }
    if (camSnap) { cam.position.copy(camGoal.pos); camLook.copy(camGoal.look); camSnap = false; }
    cam.position.lerp(camGoal.pos, Math.min(1, dt * 2)); camLook.lerp(camGoal.look, Math.min(1, dt * 2.5)); cam.lookAt(camLook);
    sun.position.copy(WORM_AT).addScaledVector(world.sunDir, 120); sun.target.position.copy(WORM_AT);
  }
  function cleanup() { catching = false; catchDone = null; breathe = 0; endChase(); vulcan.setPose('rest'); showAll(false); $('#counter').hidden = true; }
  const begin = () => { G.tick = tick; G.onLeave = cleanup; G.tap = onTap; };

  // a tap near a fireball bakes it (generous target: the ball and its glow)
  function onTap(ray) {
    if (!catching) return false;
    const b = balls.filter(x => x.on).map(x => ({ x, d: ray.ray.distanceSqToPoint(x.g.position) })).sort((p, q) => p.d - q.d)[0];
    if (!b || b.d > 1.9 * 1.9) return false;
    bake(b.x); return true;
  }
  async function catchRound(step, n, upTo) {
    G.phase = 'c4-catch' + n; target = upTo; catching = true; helped = false; G.playerTurn = true; camGoal = CAM_WIDE; lastCatch = performance.now(); lastSpawn = 0;
    $('#counter').hidden = false; setCount();
    toast(null, 'גע בכדור אש, ווורם יהפוך אותו לכיכר לחם חמה 🍞', 4500);
    await step(new Promise(res => { catchDone = res; }));
    G.playerTurn = false; hideToast(); worm.wiggle(1.4); sfx.happy();
  }
  async function riddle(step, n, kind, lines) {
    G.phase = 'c4-math' + n; camGoal = CAM_TABLE;
    for (const [who, text] of lines) await step(say(who, text));
    const react = { right: () => { worm.wiggle(1.4); vulcan.wiggle(1.2); sfx.happy(); }, wrong: w => toast('worm', w >= 3 ? 'אני איתך, דרייק! 💚' : 'אתה יכול! אני מאמין בך 💚', 2500) };
    await step(G.math.ask({ kind, title: '🍞 חידת הכיכרות', ...react }));
  }

  function stage(here) {
    G.useScene(outdoor); G.mode = 'bakery'; showAll(true); G.stars.group.visible = false;
    $('#title').hidden = true; $('#hud').hidden = false; $('#counter').hidden = true; $('#arrow').hidden = true; G.showJoy(false); G.aura.material.opacity = 0;
    worm.root.position.copy(WORM_AT); worm.root.rotation.set(0, WORM_RY, 0); worm.setPose('rest'); worm.state.blend = 1; worm.setGlow(false); worm.lookAt(DRAKE_AT.clone().setY(DRAKE_AT.y + 1.4));
    drake.setSit(0); drake.setWalk(0); drake.root.scale.setScalar(1); drake.root.position.copy(DRAKE_AT); drake.root.rotation.set(0, Math.PI, 0);
    vulcan.setPose('rest'); vulcan.state.blend = 1; vulcan.setGlow(false); vulcan.root.position.copy(here ? VULCAN_AT : VULCAN_FROM); vulcan.root.rotation.set(0, 1.25, 0); vulcan.lookAt(here ? TABLE_AT.clone().setY(TABLE_AT.y + 1.5) : null);
    rori.root.position.copy(here ? RORI_AT : RORI_FROM); rori.root.rotation.set(0, 1.9, 0); rori.setWalk(0);
    G.king.root.position.set(0, G.PLATEAU + 7.0, 15.6); G.king.root.scale.setScalar(1.7);
    caught = 0; target = 0; catching = false; catchDone = null; breathe = 0; G.playerTurn = false; camGoal = here ? CAM_WIDE : CAM_WORM; camSnap = true;
  }

  // ---------------------------------------------------------------- the story
  async function story(from = 'intro') {
    const step = runner(); begin();
    if (from === 'end') return ending(step, true);
    await step(fade(true)); stage(from !== 'intro');
    if (from === 'intro') {
      await step(card({ kicker: 'פרק 4', title: 'הלהבה של רורי' })); await step(fade(false));
      G.phase = 'c4-intro'; G.checkpoint(4, 'intro');
      worm.wiggle(1); sfx.purr();
      await step(say('drake', 'וורם, אתה מריח? לחם קלוי? ומי עושה "היק"?'));
      
      camGoal = CAM_MEET; rori.setWalk(1); sfx.whoosh();
      await step(tween(3.2, k => { const e = ease(k); vulcan.root.position.lerpVectors(VULCAN_FROM, VULCAN_AT, e); rori.root.position.lerpVectors(RORI_FROM, RORI_AT, e); }));
      rori.setWalk(0); rori.wave(2.2); vulcan.lookAt(DRAKE_AT.clone().setY(DRAKE_AT.y + 1.2)); worm.lookAt(RORI_AT.clone().setY(RORI_AT.y + 1.3)); drake.root.rotation.y = -2.2;
      await step(say('rori', 'שלום! אני רורי, וזה וולקן. יש לו שיהוקים… של אש!'));
      hiccup(); fx.burst(vulcan.mouthWorld(V(0, 0, 0)), 0xffb060, 30, 3, 0.5, 0.9, 1.2);
      await step(say('vulcan', 'היק! אוי, סליחה! היק!'));
      hiccup(); fx.burst(vulcan.mouthWorld(V(0, 0, 0)), 0xf2f2f2, 20, 2.5, 0.45, 0.9, 1.0);
      
      camGoal = CAM_WORM; worm.wiggle(1.6); worm.lookAt(TABLE_AT.clone().setY(TABLE_AT.y + 1.2));
      await step(say('worm', 'רעיון! נהפוך כל שיהוק לכיכר לחם חמה. גע בכדורי האש!'));
      camGoal = CAM_WIDE; drake.root.rotation.y = Math.PI; vulcan.lookAt(TABLE_AT.clone().setY(TABLE_AT.y + 1.5));
      
    } else if (from !== 'flight') await step(fade(false));
    if (from !== 'flight') {
    G.checkpoint(4, 'catch');
    await catchRound(step, 1, 5);
    await riddle(step, 1, 'add', []);
    camGoal = CAM_WIDE;
    
    await catchRound(step, 2, 10);
    await riddle(step, 2, 'missing', []);
    // ---- the action set piece: one giant hiccup, and a chase round the castle with Vulcan
    G.phase = 'c4-fly-ready'; $('#counter').hidden = true; camGoal = CAM_WIDE; hiccup(); fx.burst(vulcan.mouthWorld(V(0, 0, 0)), 0xffb060, 60, 6, 0.6, 1.4, 2.5);
    toast('vulcan', 'היייק! אופס… הם עפו לשמיים!', 3200);
    await step(new Promise(res => actions([{ id: 'btn-fire-fly', label: '🔥 תופסים בשמיים!', cls: 'pulse', onClick: () => res() }])));
    clearActions(); worm.setGlow(true); sfx.magic(); await step(wait(600)); worm.setGlow(false); await step(fade(true));
    }
    await flight(step);
    // ---- the cure: slow breathing with Worm
    G.phase = 'c4-breathe'; $('#counter').hidden = true; camGoal = CAM_WIDE; // Worm and Vulcan both in frame worm.lookAt(VULCAN_AT.clone().setY(VULCAN_AT.y + 1.4)); vulcan.lookAt(WORM_AT.clone().setY(WORM_AT.y + 1.6));
    await step(say('worm', 'וולקן, נשום איתי לאט. פנימה… והחוצה…'));
    breathe = 1; worm.setGlow(true); sfx.purr();
    await step(tween(6.4, () => { }));                       // two slow breaths together
    breathe = 0; worm.setGlow(false); vulcan.wiggle(1.6); sfx.happy();
    
    // one last tiny hiccup leaves a warm ember
    hiccup(); const e0 = vulcan.mouthWorld(V(0, 0, 0)), e1 = worm.headWorld().add(V(-1.6, 0.9, 1.4)); ember.visible = true;
    await step(tween(1.6, k => { const e = ease(k); ember.position.lerpVectors(e0, e1, e); ember.position.y += Math.sin(e * Math.PI) * 1.5; }));
    camGoal = CAM_WORM; worm.wiggle(1.6); worm.lookAt(ember.position);
    await step(say('vulcan', 'היק! אופס… רק אחד קטן.'));
    await step(say('rori', 'גחלת קטנה וחמה. היא לא שורפת. היא בשבילך, וורם!'));
    
    // ---- the feast
    G.phase = 'c4-feast'; camGoal = CAM_WIDE; sfx.fanfare(); worm.wiggle(2.5); vulcan.wiggle(2.5); rori.wave(3); drake.wave(3);
    for (let i = 0; i < 3; i++) setTimeout(() => { if (G.tick === tick) fx.confetti(ground(2, 28, 4), 60); }, i * 500);
    toast('king', 'איזה לחם חם וטעים! תודה, מאסטרי הדרקונים! 👑', 3200);
    await step(tween(3.0, () => { }));                       // a moment to enjoy the feast (⏭ skips it)
    
    G.phase = 'c4-celebrate';
    const v = await step(card({ kicker: '🍞 🍞 🍞', title: 'כל הכבוד!', text: 'אפיתם 10 כיכרות לסעודה, ועזרתם לוולקן להירגע! וורם קיבל מזכרת: גחלת חמה שזוהרת ולא שורפת 🔥',
      buttons: [{ label: '🔁 עוד פעם?', value: 'again' }, { label: 'סיום הפרק ◀', value: 'end', cls: 'green' }] }));
    if (v === 'again') { cleanup(); return story('catch'); }
    return ending(step, false);
  }
  async function ending(step, direct) {
    if (direct) { await step(fade(true)); stage(true); loaves.forEach((l, i) => { l.visible = true; l.position.copy(SLOTS[i]); l.scale.setScalar(1); }); await step(fade(false)); }
    G.phase = 'c4-end'; $('#counter').hidden = true; G.markDone(4);
    const v = await step(card({ kicker: 'סוף פרק 4 – הלהבה של רורי', title: 'המשך יבוא…', text: 'בפרק הבא: הד מוזר עולה ממערות הקריסטלים… מי שם? 💎',
      buttons: [{ label: '🔁 עוד פעם?', value: 'again' }, { label: '🏠 לתפריט', value: 'home', cls: 'green' }] }));
    await step(fade(true));
    if (v === 'again') { cleanup(); return story('intro'); }
    G.enterTitle(); await fade(false);
  }

  return {
    start: story, showAll,
    nextBallPos() { const b = catching && balls.find(x => x.on && performance.now() - x.t0 > 500); return b ? b.g.position.clone() : null; },
    debug: () => ({ tweens: G.tweenCount(), catching, caught, target, balls: balls.filter(b => b.on).length, chasing }),
    modelTargets: { rori, fireDragon: vulcan },
  };
}
