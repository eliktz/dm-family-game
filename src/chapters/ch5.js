// Chapter 5 "מערת הקריסטלים של פטרה" (see STORY.md): a strange echo in the cave turns out to be Petra's shy crystal
// dragon, hiding in the dark. Crystals light the way when someone hums the right pattern: Worm hums each crystal with
// his mind power (xylophone chimes) and the player taps the crystal that comes next. Three patterns (AB, AAB, ABC), with
// two riddles from the adaptive engine in between; after each pattern the shy dragon comes a little closer. Worm tells
// him that being quiet is okay, and he gives Worm the keepsake: a rainbow crystal.
// No fail state: a wrong crystal just wobbles and Worm hums the pattern again; after two misses, or a quiet while, the
// right crystal glows. Everything is created once at start-up (hidden); animations use the shared wall-clock tweens.
import { createWorm } from '../worm.js';
import { makeChibi } from '../people.js';
import { glowSprite } from '../tex.js';
import { PETRA_DRAGON_NAME } from '../names.js';

const CRYSTAL = { back: 0x7a5fc0, side: 0x9a7fe0, belly: 0xe6dcff, tail: 0x9a7fe0, spike: 0xc8f4ff, head: 0x8a6fd0, muzzle: 0xb09af0, fin: 0xbfe9ff, horn: 0xe8fbff, iris: 0x3a2a7a, sheen: 0xe0d0ff };
const COLS = [0x3fa9ff, 0xffd23f, 0xff5fa0], NOTES = [523, 659, 784];   // blue, yellow, pink and their chime notes
const PATTERNS = [{ seq: [0, 1, 0, 1, 0, 1], given: 4 }, { seq: [0, 0, 1, 0, 0, 1], given: 4 }, { seq: [0, 1, 2, 0, 1, 2], given: 4 }];

export function chapter5(G) {
  const { THREE, cam, fx, worm, drake, griffith, cave, caveScene, outdoor, world, ui, say, toast, hideToast, card, fade, sfx, runner, wait, tween, fl, actions, clearActions } = G;
  const V = (x, y, z) => new THREE.Vector3(x, y, z), $ = s => document.querySelector(s);
  const ease = k => k * k * (3 - 2 * k);

  // ---------------------------------------------------------------- layout (the Dragon Cave, deeper side on the right)
  const WORM_AT = V(-3.6, 0, -4.4), DRAKE_AT = V(1.6, 0, 6.2), PETRA_AT = V(6.2, 0, 5.0), PETRA_FROM = V(6.2, 0, -12.5);
  const SLOTS = Array.from({ length: 6 }, (_, i) => V(-1.6 + i * 1.5, 0.75, -2.4));
  const CHOICES = [V(0.2, 1.5, 2.6), V(2.3, 1.5, 2.6), V(4.4, 1.5, 2.6)];
  const HIDE = [V(13.2, 0, -5.6), V(11.4, 0, -4.4), V(9.9, 0, -3.2), V(8.6, 0, -1.6)];      // the shy dragon comes closer after each pattern
  const CAM_WIDE = { pos: V(2.4, 6.4, 13.2), look: V(2.6, 0.9, -1.2) };
  const CAM_WORM = { pos: V(1.6, 2.6, 4.2), look: V(-2.2, 1.4, -3.4) };
  const CAM_SHY = { pos: V(2.6, 2.4, 2.4), look: V(8.4, 1.1, -1.6) };

  // ---------------------------------------------------------------- actors
  const petra = makeChibi({ hairStyle: 'tousled', hair: 0x2a1e2e, eye: 0x2a2440, tunic: 0x7a5fc0, sleeve: 0x9a84dc, pants: 0x4a4460, belt: 0xbfe9ff, shoes: 0x3a3450, skin: 0xf0c8a8, pendant: true, lod: 0.5 });
  const gem = createWorm({ name: 'crystalDragon', colors: CRYSTAL, length: 7.5, finScale: 1.2, lod: 0.4, light: false, shadow: false, simple: true });
  gem.root.scale.setScalar(0.62); petra.root.traverse(o => { o.castShadow = false; });
  const crystalG = new THREE.OctahedronGeometry(0.5, 0).scale(0.8, 1.5, 0.8);
  const darkM = new THREE.MeshStandardMaterial({ color: 0x5a5a6a, roughness: 0.4, flatShading: true });
  const litM = COLS.map(c => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.9, roughness: 0.15, flatShading: true }));
  const glowTex = glowSprite('rgba(255,255,255,1)', 'rgba(255,255,255,0)');
  const mkGlow = (c, s) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: c, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.5 })); sp.scale.setScalar(s); return sp; };
  const path = SLOTS.map(p => { const m = new THREE.Mesh(crystalG, darkM); m.position.copy(p); m.castShadow = false; return { m, col: -1, pop: 0 }; });
  const choices = CHOICES.map((p, i) => { const g = new THREE.Group(); g.position.copy(p); const m = new THREE.Mesh(crystalG, litM[i]); m.scale.setScalar(1.35); g.add(m, mkGlow(COLS[i], 3.2)); return { g, m, wob: 0 }; });
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.6, 14).rotateX(Math.PI), new THREE.MeshStandardMaterial({ color: 0xffd34a, emissive: 0xffa41a, emissiveIntensity: 1.5, metalness: 0.4, roughness: 0.3 }));
  // the keepsake: a rainbow crystal (three small coloured crystals in a cluster)
  const rainbow = new THREE.Group(); litM.forEach((m, i) => { const c = new THREE.Mesh(crystalG, m); c.scale.setScalar(0.45); c.position.set((i - 1) * 0.28, i === 1 ? 0.12 : 0, 0); c.rotation.z = (1 - i) * 0.35; rainbow.add(c); }); rainbow.add(mkGlow(0xffffff, 2.4));
  const actors = [petra.root, gem.root, arrow, rainbow, ...path.map(p => p.m), ...choices.map(c => c.g)];
  for (const a of actors) caveScene.add(a);
  function showAll(v) { for (const a of actors) a.visible = v; if (!v) return; arrow.visible = rainbow.visible = false; }
  showAll(false);

  // ---------------------------------------------------------------- state
  let pat = null, next = 0, misses = 0, hint = false, active = false, done = null, lastAct = 0, humming = false;
  const setSlot = (i, col) => { path[i].col = col; path[i].m.material = col < 0 ? darkM : litM[col]; path[i].pop = performance.now(); };
  const chime = col => { sfx.note ? sfx.note(NOTES[col]) : sfx.tap(); };
  // Worm hums the crystals that are already lit, one by one (wall-clock timers; purely decorative, nothing waits on it)
  function hum() { if (!pat || humming) return; humming = true; worm.setGlow(true); const n = next;
    for (let i = 0; i < n; i++) setTimeout(() => { if (G.tick === tick && pat) { chime(pat.seq[i]); path[i].pop = performance.now(); } }, 380 * i);
    setTimeout(() => { humming = false; if (G.tick === tick) worm.setGlow(false); }, 380 * n + 200); }

  // ---------------------------------------------------------------- the crystal tunnel (rail-guided flight, like chapters 3 and 4)
  // A long glowing tunnel that winds down in a helix (about 485 m: 57 s). It lives in the outdoor scene, high above the
  // castle, so the shared sun and environment light the dragons; the rest of the world is hidden while we are inside.
  // Everything is unlit and tiny: one tube (3,000 triangles), one instanced mesh of wall crystals, 12 gate rings.
  const helix = a => V(Math.cos(a) * 46, G.PLATEAU + 150 - a * 4.8, Math.sin(a) * 46);
  class Helix extends THREE.Curve { getPoint(t, out = new THREE.Vector3()) { return out.copy(helix(-0.5 + t * 11.7)); } }
  const tunnel = new THREE.Group(); tunnel.visible = false; outdoor.add(tunnel);
  { const R = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    const tg = new THREE.TubeGeometry(new Helix(), 150, 13, 10, false).toNonIndexed(), n = tg.attributes.position.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i += 3) { const sh = 0.45 + R() * 0.55; for (let k = 0; k < 3; k++) { col[(i + k) * 3] = 0.11 * sh; col[(i + k) * 3 + 1] = 0.09 * sh; col[(i + k) * 3 + 2] = 0.25 * sh; } }
    tg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const tube = new THREE.Mesh(tg, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false })); tube.castShadow = tube.receiveShadow = false; tunnel.add(tube);
    const N = 210, wall = new THREE.InstancedMesh(crystalG, new THREE.MeshBasicMaterial({ fog: false }), N), m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = V(0, 1, 0), c = new THREE.Color();
    for (let i = 0; i < N; i++) { const a = -0.3 + (i + R()) / N * 11.3, ph = R() * Math.PI * 2, rad = V(Math.cos(a), 0, Math.sin(a)), dir = rad.clone().multiplyScalar(Math.cos(ph)).addScaledVector(up, Math.sin(ph));
      const s = 1.4 + R() * 2.4; m.compose(helix(a).addScaledVector(dir, 12.4), q.setFromUnitVectors(up, dir.clone().negate()), V(s, s, s)); wall.setMatrixAt(i, m); wall.setColorAt(i, c.set(COLS[i % 3]).multiplyScalar(0.75 + R() * 0.5)); }
    wall.castShadow = false; wall.frustumCulled = false; tunnel.add(wall); tunnel.userData.wallM = wall.material; }
  const GATES = 12, gateG = new THREE.TorusGeometry(6.2, 0.42, 8, 28), gateM = COLS.map(c => new THREE.MeshBasicMaterial({ color: c, fog: false }));
  const gates = Array.from({ length: GATES }, (_, i) => { // the colours repeat blue, yellow, pink: the pattern of the chapter
    const a = 0.9 + i * 0.76, g = new THREE.Group(); g.position.copy(helix(a)); g.lookAt(helix(a + 0.05)); const ring = new THREE.Mesh(gateG, gateM[i % 3]); g.add(ring);
    const sp = mkGlow(COLS[i % 3], 17); g.add(sp); tunnel.add(g); return { g, ring, sp, base: g.position.clone(), got: false, pop: 0 };
  });
  let tunneling = false, sparkAt = 0, sparking = false, sparkle = 0, rainbowAt = null;
  function flightTick(dt, time) { // the crystal dragon keeps formation beside Worm; the NEXT gate always glows and pulses
    const yaw = worm.root.rotation.y, c = Math.cos(yaw), s = Math.sin(yaw), ox = -4.6, oz = 1.0;
    gem.root.position.set(worm.root.position.x + ox * c + oz * s, worm.root.position.y + 1.6 + Math.sin(time * 1.8) * 0.3, worm.root.position.z - ox * s + oz * c); gem.root.rotation.set(0, yaw, 0); gem.update(dt, time);
    const ni = G.nextItem(); sparkle = Math.max(0, sparkle - dt * 1.2); tunnel.userData.wallM.color.setScalar(1 + sparkle * 0.9 + 0.08 * Math.sin(time * 3));
    gates.forEach((o, i) => { if (o.got) { o.pop += dt; const k = Math.max(0, 1 - o.pop * 2.5); o.g.scale.setScalar(k * (1 + o.pop * 1.5)); o.g.visible = k > 0; }
      else { const hi = i === ni; o.sp.material.opacity = hi ? 0.75 + 0.2 * Math.sin(time * 6) : 0.18; if (!sparking || !hi) o.g.scale.setScalar(hi ? 1 + 0.06 * Math.sin(time * 6) : 0.92); } });
  }
  function onGate(i, o) { // each gate chimes its colour's note, so the tunnel plays the pattern as a tune
    const n = fl.got; sfx.note(NOTES[i % 3]); fx.burst(fl.pos.clone(), COLS[i % 3], 44, 7, 0.6, 1.2, 0); worm.wiggle(0.8); gem.wiggle(1);
    G.setCounter(`${n} / ${GATES}`, '💎');
    const line = { 1: 'כחול, צהוב, ורוד… הדוגמה ממשיכה! 💎', 6: 'חצי דרך! איזו מנהרה יפה', 11: 'רק עוד שער אחד!' }[n]; if (line) toast('worm', line, 2000);
  }
  // The crystal dragon's sparkle (power button): the whole tunnel lights up and the next gate flies to Worm. Always
  // works; a 2.5 s rest between uses keeps the flight the longest part of the chapter.
  function crystalSparkle() {
    const i = G.nextItem(), o = gates[i], now = performance.now(); if (!tunneling || !o || sparking || now - sparkAt < 2500 || fl.done) return;
    sparking = true; sparkAt = now; sparkle = 1; gem.setGlow(true); gem.wiggle(1.2); sfx.magic(); const from = o.g.position.clone(), head = gem.headWorld();
    for (let k = 0; k <= 5; k++) fx.burst(head.clone().lerp(from, k / 5), COLS[i % 3], 10, 2, 0.45, 0.7, 0);
    tween(0.5, k => { o.g.position.lerpVectors(from, fl.pos, k * k); o.g.scale.setScalar(1 - 0.6 * k); }).then(() => { sparking = false; gem.setGlow(false); if (tunneling && !o.got && G.nextItem() === i) G.collectNext(); });
  }
  const endTunnel = () => { tunneling = false; sparking = false; tunnel.visible = false; world.group.visible = true; clearActions(); caveScene.add(gem.root); gem.setGlow(false); gem.setPose('rest'); };
  async function flight(step) {
    showAll(false); for (const o of gates) { o.got = false; o.pop = 0; o.g.visible = true; o.g.scale.setScalar(1); o.g.position.copy(o.base); }
    G.startFlight({ items: gates, lead: [helix(0), helix(0.45)], exit: [helix(9.8), helix(10.15), helix(10.5)], speed: 8.5, camSide: -1, corridor: [3, 2], lookDown: 2.2, onCollect: onGate });
    world.group.visible = false; G.stars.group.visible = false; tunnel.visible = true;
    outdoor.add(gem.root); gem.root.visible = true; gem.state.shy = false; gem.setPose('fly'); gem.state.blend = 1; gem.lookAt(null); tunneling = true; sparking = false; sparkle = 0;
    G.tick = tick; G.phase = 'c5-flight'; G.checkpoint(5, 'flight'); G.setCounter(`0 / ${GATES}`, '💎');
    await step(fade(false)); G.showJoy(true); worm.wiggle(1);
    toast('worm', 'טסים דרך שערי הקריסטל! השער הבא תמיד זוהר ✨', 3800);
    await step(wait(3900));
    actions([{ id: 'btn-sparkle', label: '✨ נצנוץ קריסטל!', onClick: crystalSparkle }]);
    await step(G.waitFor(() => fl.got >= GATES));
    G.phase = 'c5-flight-done'; fl.done = true; G.showJoy(false); clearActions(); sfx.fanfare(); worm.wiggle(2); gem.wiggle(2);
    toast('worm', `איזו מנהרה! תודה, ${PETRA_DRAGON_NAME}!`, 2600);
    await step(wait(2600)); await step(fade(true));
    endTunnel(); stage(true); document.querySelector('#counter').hidden = true;
    gem.root.visible = true; gem.state.shy = false; gem.root.position.copy(HIDE[3]); if (rainbowAt) { rainbow.visible = true; rainbow.position.copy(rainbowAt); }
    G.camGoal = CAM_WIDE; await step(fade(false));
  }

  function tick(dt, time) {
    if (G.mode === 'flight' && tunneling) return flightTick(dt, time);
    if (G.mode !== 'cave') return;
    gem.update(dt, time); petra.update(dt, time); drake.setWalk(0);
    const now = performance.now();
    path.forEach((p, i) => { const k = Math.max(0, 1 - (now - p.pop) / 450); p.m.scale.setScalar(1 + 0.45 * k); p.m.rotation.y = time * 0.6 + i; p.m.position.y = SLOTS[i].y + (p.col >= 0 ? Math.sin(time * 2 + i) * 0.06 : 0); });
    if (active && !hint && (misses >= 2 || now - lastAct > 10000)) hint = true;                       // never stuck: the right crystal glows
    choices.forEach((c, i) => { c.g.visible = active; c.g.position.y = CHOICES[i].y + Math.sin(time * 2.2 + i * 2) * 0.12; c.m.rotation.y = time * 1.2;
      const w = Math.max(0, 1 - (now - c.wob) / 500), glow = hint && pat && i === pat.seq[next] ? 0.35 + 0.25 * Math.sin(time * 8) : 0;
      c.g.rotation.z = Math.sin(now / 40) * 0.25 * w; c.g.scale.setScalar(1 + glow); });
    arrow.visible = active; if (active) { arrow.position.copy(SLOTS[next]).y += 1.35 + Math.sin(time * 4) * 0.15; arrow.rotation.y = time * 2; }
    if (rainbow.visible) rainbow.rotation.y = time * 1.5;
  }
  function cleanup() { active = false; done = null; pat = null; endTunnel(); showAll(false); cave.closeGate(); griffith.root.position.set(7.2, 0, -3.5); }
  const begin = () => { G.tick = tick; G.onLeave = cleanup; G.tap = onTap; };

  function onTap(ray) {
    if (!active) return false;
    const c = choices.map((x, i) => ({ i, d: ray.ray.distanceSqToPoint(x.g.position) })).sort((a, b) => a.d - b.d)[0];
    if (c.d > 1.5 * 1.5) return false;
    lastAct = performance.now();
    if (c.i === pat.seq[next]) {
      setSlot(next, c.i); chime(c.i); fx.burst(SLOTS[next].clone(), COLS[c.i], 22, 3, 0.4, 0.9, 0.4); next++; misses = 0; hint = false; worm.wiggle(0.6);
      if (next >= pat.seq.length) { active = false; const r = done; done = null; if (r) setTimeout(r, ui.fast ? 0 : 600); }
    } else { misses++; choices[c.i].wob = performance.now(); sfx.oops(); toast('worm', misses >= 2 ? 'הקריסטל הנכון זוהר עכשיו ✨' : 'כמעט! תקשיב שוב לדוגמה 💚', 2200); hum(); }
    return true;
  }
  async function pattern(step, n) {
    G.phase = 'c5-pattern' + n; pat = PATTERNS[n - 1]; next = pat.given; misses = 0; hint = false; G.camGoal = CAM_WIDE;
    path.forEach((_, i) => setSlot(i, i < pat.given ? pat.seq[i] : -1));
    await step(wait(500)); hum(); await step(wait(380 * pat.given + 500));
    active = true; G.playerTurn = true; lastAct = performance.now();
    toast(null, 'איזה קריסטל בא עכשיו? גע בו 👆', 4500);
    await step(new Promise(res => { done = res; }));
    G.playerTurn = false; hideToast(); sfx.chime(); worm.wiggle(1.4);
    // the whole row rings, and the shy dragon comes a little closer
    pat.seq.forEach((c, i) => setTimeout(() => { if (G.tick === tick) { chime(c); path[i].pop = performance.now(); } }, 160 * i));
    gem.root.visible = true; // he stays hidden in the dark until the first pattern is done
    const from = gem.root.position.clone(), to = HIDE[n];
    await step(tween(1.6, k => { gem.root.position.lerpVectors(from, to, ease(k)); }));
  }   // (no happy hop while he is still shy: he just creeps closer)
  async function riddle(step, n, kind, lines) {
    G.phase = 'c5-math' + n; G.camGoal = CAM_WORM;
    for (const [who, text] of lines) await step(say(who, text));
    const react = { right: () => { worm.wiggle(1.4); sfx.happy(); }, wrong: w => toast('worm', w >= 3 ? 'אני איתך, דרייק! 💚' : 'אתה יכול! אני מאמין בך 💚', 2500) };
    await step(G.math.ask({ kind, title: '💎 חידת הקריסטלים', ...react }));
  }

  function stage(here) {
    G.setupCave(); showAll(true); cave.openGate();
    worm.root.position.copy(WORM_AT); worm.root.rotation.set(0, 1.0, 0); worm.setPose('rest'); worm.state.blend = 1; worm.lookAt(DRAKE_AT.clone().setY(1.4));
    drake.root.position.copy(DRAKE_AT); drake.root.rotation.set(0, Math.PI, 0);
    griffith.root.position.set(-8.6, 0, 3.6);
    petra.root.position.copy(here ? PETRA_AT : PETRA_FROM); petra.root.rotation.set(0, here ? Math.PI + 0.5 : 0, 0); petra.setWalk(0);
    gem.root.position.copy(HIDE[0]); gem.root.rotation.set(0, -1.9, 0); gem.setPose('rest'); gem.state.blend = 1; gem.lookAt(null); gem.state.shy = true; // tucked and shy until Worm's gentle words
    gem.root.visible = false; path.forEach((_, i) => setSlot(i, -1)); active = false; done = null; pat = null; humming = false; G.playerTurn = false; G.camGoal = here ? CAM_WIDE : CAM_WORM;
  }

  // ---------------------------------------------------------------- the story
  async function story(from = 'intro') {
    const step = runner(); begin();
    if (from === 'end') return ending(step, true);
    await step(fade(true)); stage(from !== 'intro');
    if (from === 'intro') {
      await step(card({ kicker: 'פרק 5', title: 'מערת הקריסטלים של פטרה' })); await step(fade(false));
      G.phase = 'c5-intro'; G.checkpoint(5, 'intro');
      worm.wiggle(1); sfx.purr();
      await step(say('drake', 'וורם, שמעת? הד מוזר: "הלו… לו… לו…"'));
      
      G.camGoal = CAM_WIDE; petra.setWalk(1); sfx.whoosh();
      await step(tween(3.0, k => { petra.root.position.lerpVectors(PETRA_FROM, PETRA_AT, ease(k)); }));
      petra.setWalk(0); petra.root.rotation.y = Math.PI + 0.5; petra.wave(2.2); worm.lookAt(PETRA_AT.clone().setY(1.3));
      await step(say('petra', `שלום! אני פטרה. ${PETRA_DRAGON_NAME}, דרקון הקריסטל שלי, מתחבא בחושך.`));
      
      G.camGoal = CAM_WORM; worm.setGlow(true); sfx.magic(); worm.lookAt(SLOTS[2]);
      await step(say('worm', 'אני אזמזם לקריסטלים. דרייק, בחר איזה קריסטל בא אחר כך!'));
      worm.setGlow(false);
    } else if (from !== 'flight') await step(fade(false));
    if (from !== 'flight') {
    G.checkpoint(5, 'patterns');
    await pattern(step, 1);
    toast('petra', `תראו, ${PETRA_DRAGON_NAME} מציץ!`, 2000); await step(wait(1400));
    await riddle(step, 1, 'missing', []);
    await pattern(step, 2);
    await riddle(step, 2, 'mul', []);
    await pattern(step, 3);
    // ---- the shy dragon comes out; Worm's gentle moment
    G.phase = 'c5-friend'; G.camGoal = CAM_SHY; gem.lookAt(worm.headWorld()); worm.lookAt(HIDE[3].clone().setY(1.2));
    await step(say('gem', '…שלום.'));
    
    worm.wiggle(0.8); sfx.purr();
    await step(say('worm', `זה בסדר להיות שקט, ${PETRA_DRAGON_NAME}. גם אני אוהב שקט.`));
    gem.state.shy = false; gem.wiggle(1.6); sfx.happy(); fx.hearts3(gem.headWorld().add(V(0, 0.6, 0)), 5);
    await step(say('gem', 'תודה, וורם. הנה, זה בשבילך.'));
    const r0 = gem.headWorld().add(V(0, 0.8, 0)), r1 = worm.headWorld().add(V(1.8, 1.0, 1.6)); rainbow.visible = true;
    await step(tween(1.6, k => { const e = ease(k); rainbow.position.lerpVectors(r0, r1, e); rainbow.position.y += Math.sin(e * Math.PI) * 1.4; }));
    G.camGoal = CAM_WIDE; worm.wiggle(2); worm.lookAt(rainbow.position);
    await step(say('petra', 'קריסטל קשת! הוא נותן אותו רק לחברים אמיתיים.'));
    rainbowAt = rainbow.position.clone();
    // ---- the action set piece: the crystal dragon shows his friends his crystal tunnel
    G.phase = 'c5-fly-ready'; toast('petra', `${PETRA_DRAGON_NAME} רוצה להראות לכם את מנהרת הקריסטלים שלו!`, 3400);
    await step(new Promise(res => actions([{ id: 'btn-tunnel-fly', label: '💎 טסים במנהרה!', cls: 'pulse', onClick: () => res() }])));
    clearActions(); worm.setGlow(true); sfx.magic(); await step(wait(600)); worm.setGlow(false); await step(fade(true));
    }
    await flight(step);
    G.phase = 'c5-celebrate'; sfx.fanfare(); worm.wiggle(2.5); gem.wiggle(2); petra.wave(3); drake.wave(3);
    for (let i = 0; i < 3; i++) setTimeout(() => { if (G.tick === tick) fx.confetti(V(2.5, 3.4, -1), 60); }, i * 500);
    await step(wait(1800));
    const v = await step(card({ kicker: '💎 💎 💎', title: 'כל הכבוד!', text: `השלמת את כל הדוגמאות, ו${PETRA_DRAGON_NAME} מצא חברים! וורם קיבל מזכרת: קריסטל קשת 🌈`,
      buttons: [{ label: '🔁 עוד פעם?', value: 'again' }, { label: 'סיום הפרק ◀', value: 'end', cls: 'green' }] }));
    if (v === 'again') { cleanup(); return story('patterns'); }
    return ending(step, false);
  }
  async function ending(step, direct) {
    if (direct) { await step(fade(true)); stage(true); gem.root.visible = true; gem.state.shy = false; gem.root.position.copy(HIDE[3]); await step(fade(false)); }
    G.phase = 'c5-end'; G.markDone(5);
    const v = await step(card({ kicker: 'סוף פרק 5 – מערת הקריסטלים של פטרה', title: 'המשך יבוא…', text: 'בפרק הבא: כל הצבעים נעלמים מהממלכה! לאן הם הלכו? 🎨',
      buttons: [{ label: '🔁 עוד פעם?', value: 'again' }, { label: '🏠 לתפריט', value: 'home', cls: 'green' }] }));
    await step(fade(true));
    if (v === 'again') { cleanup(); return story('intro'); }
    G.enterTitle(); await fade(false);
  }

  return {
    start: story, showAll,
    nextCrystalPos(wrong = false) { if (!active || !pat) return null; const want = pat.seq[next]; return choices[wrong ? (want + 1) % 3 : want].g.position.clone(); },
    debug: () => ({ tweens: G.tweenCount(), active, next, misses, hint, pattern: pat ? PATTERNS.indexOf(pat) + 1 : 0, tunneling }),
    modelTargets: { petra, crystalDragon: gem },
  };
}
