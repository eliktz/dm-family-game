// Chapter 7 "המסע אל הר הקשת" (see STORY.md): the team journeys up the Rainbow Mountain, where the Grumble Cloud lives.
//   lawn (two short lines, one map riddle) → the long climb: a rail-guided flight that spirals up the mountain with Shu,
//   Kepri and Vulcan in formation. Twelve rainbow gems to collect and three friendly gates on the rail; each gate opens by
//   itself when the team arrives, with one dragon's power, and shows an array: Shu fills a fountain (5 × 2 stepping
//   stones), Kepri lights lanterns (4 × 2), Vulcan warms a frozen bridge (10 × 1 planks). The power button (water → sun →
//   fire, whoever's gate is next) carries the next gem to Worm or opens the next gate from afar. At the top Worm carries
//   everyone across the last gap with his mind power. Keepsake: a mountain map. Nothing can fail; never scary.
// Everything is built once at start-up (hidden) in the OUTDOOR scene, high above the castle, so the shared sun and
// environment light the dragons; the rest of the world is hidden while we are on the mountain. No lights or materials
// are created at runtime.
import { glowSprite } from '../tex.js';

export function chapter7(G) {
  const { THREE, cam, fx, worm, drake, outdoor, caveScene, world, heightAt, sun, say, toast, hideToast, card, fade, sfx, runner, wait, tween, fl, actions, clearActions } = G;
  const V = (x, y, z) => new THREE.Vector3(x, y, z), $ = s => document.querySelector(s);
  const ground = (x, z, up = 0) => V(x, heightAt(x, z) + up, z);
  const ease = k => k * k * (3 - 2 * k);

  // ---------------------------------------------------------------- the lawn (start and end of the chapter)
  const WORM_AT = ground(6.6, 24.2), DRAKE_AT = ground(-6.4, 31.4);
  const CAM_WIDE = G.engine.viewShift ? { pos: ground(0, 43.5, 6.6), look: ground(0, 27.4, 1.3) } : { pos: ground(0, 49.5, 8.4), look: ground(0, 27, 1.7) };
  const CAM_WORM = { pos: ground(2.4, 34.5, 2.8), look: ground(5.6, 25, 1.9) };

  // ---------------------------------------------------------------- the Rainbow Mountain (soft pastel bands, a sea of clouds below)
  const BASE = G.PLATEAU + 150, HT = 110, RB = 70, TURN = 8.0;
  const coneR = h => RB * (1 - h / HT), hOf = a => 6 + (a / TURN) * 72;
  const P = a => { const h = hOf(a), R = coneR(h) + 15; return V(Math.cos(a) * R, BASE + h, Math.sin(a) * R); };   // the rail: a spiral 15 m off the slope
  const mountain = new THREE.Group(); mountain.visible = false; outdoor.add(mountain);
  { const BANDS = [0xff86a0, 0xffa864, 0xf2d455, 0x7fdc82, 0x6fbcf2, 0xb08cf0, 0xd9d6ec], c = new THREE.Color(); // soft, bright bands (unlit, so the shaded side is never muddy)
    const cg = new THREE.ConeGeometry(RB, HT, 26, 9, true).toNonIndexed(), pos = cg.attributes.position, col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i += 3) { const y = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3 + HT / 2, sh = 0.86 + 0.14 * Math.abs(Math.sin(i * 12.9898));
      c.set(BANDS[Math.min(BANDS.length - 1, Math.floor(y / HT * BANDS.length))]).multiplyScalar(sh); for (let k = 0; k < 3; k++) c.toArray(col, (i + k) * 3); }
    cg.setAttribute('color', new THREE.BufferAttribute(col, 3)); cg.computeVertexNormals();
    const cone = new THREE.Mesh(cg, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false })); cone.position.y = BASE + HT / 2; cone.castShadow = cone.receiveShadow = false; mountain.add(cone);
    // Below: a soft blue sea of clouds with paler puffs on it. Everything here is UNLIT and kept under the bloom level: a sunlit white floor
    // floods the picture with glow and washes Worm out. Flowers dot the slopes and a bold rainbow arcs behind the mountain.
    const R = (() => { let s = 11; return () => (s = (s * 16807) % 2147483647) / 2147483647; })(), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), ci = new THREE.Color();
    const sea = new THREE.Mesh(new THREE.CircleGeometry(520, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x86bfe0, fog: false })); sea.position.y = BASE + 2; mountain.add(sea);
    const NP = 150, puffs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshBasicMaterial({ fog: false }), NP);
    for (let i = 0; i < NP; i++) { const a = R() * Math.PI * 2, r = 112 + R() * 230, sc = 9 + R() * 16; /* well outside the rail: the camera never flies through one */
      m4.compose(V(Math.cos(a) * r, BASE + 1 + R() * 3, Math.sin(a) * r), q, V(sc, sc * (0.35 + R() * 0.2), sc)); puffs.setMatrixAt(i, m4); puffs.setColorAt(i, ci.setScalar(0.7 + R() * 0.12).lerp(new THREE.Color(0xbfdcf0), 0.35)); }
    puffs.frustumCulled = false; mountain.add(puffs);
    const NF = 280, flowers = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ fog: false }), NF), FL = [0xff5f7a, 0xff9a3c, 0xf2cf3a, 0x4fc46a, 0x3fa0f0, 0x9a6ff0, 0xff7fc8];
    for (let i = 0; i < NF; i++) { const h = 3 + R() * 88, a = R() * Math.PI * 2, r = coneR(h) + 0.5, sc = 0.7 + R() * 0.9; m4.compose(V(Math.cos(a) * r, BASE + h, Math.sin(a) * r), q, V(sc, sc, sc)); flowers.setMatrixAt(i, m4); flowers.setColorAt(i, ci.set(FL[i % FL.length])); }
    flowers.frustumCulled = false; mountain.add(flowers);
    [0xff5f6e, 0xff9a3c, 0xf2cf3a, 0x4fc46a, 0x3fa0f0, 0x9a6ff0].forEach((col, i) => { const arc = new THREE.Mesh(new THREE.TorusGeometry(152 - i * 4.4, 2.4, 5, 44, Math.PI), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.9, fog: false, depthWrite: false })); arc.position.set(0, BASE + 4, 0); arc.rotation.y = 0.9; mountain.add(arc); }); }

  // ---- things on the rail, in order: 4 gems, the water gate, 4 gems, the sun gate, 4 gems, the fire gate
  const RAINBOW = [0xff7a8a, 0xffa25a, 0xffd84a, 0x6fd38a, 0x5ab8f5, 0xa98bf0];
  const gemG = new THREE.OctahedronGeometry(1.0, 0).scale(0.85, 1.4, 0.85), gemM = RAINBOW.map(c => new THREE.MeshBasicMaterial({ color: c }));
  const glow = glowSprite('rgba(255,255,255,1)', 'rgba(255,255,255,0)');
  const GATES = [
    { key: 'shu', label: '💦 כוח המים!', col: 0x8fd0ff, eq: '5 × 2 = 10', icon: '🪨', line: 'שו מילאה את המזרקה! 💦' },
    { key: 'kepri', label: '☀️ כוח השמש!', col: 0xffe27a, eq: '4 × 2 = 8', icon: '🏮', line: 'קפרי הדליקה את הפנסים! ☀️' },
    { key: 'vulcan', label: '🔥 כוח האש!', col: 0xffa25a, eq: '10 × 1 = 10', icon: '🪵', line: 'וולקן הפשיר את הגשר הקפוא! 🔥' },
  ];
  const ringG = new THREE.TorusGeometry(7.5, 0.7, 8, 26), veilG = new THREE.CircleGeometry(7.2, 26), ledgeG = new THREE.CylinderGeometry(7.2, 6.2, 0.7, 14);
  const rockM = new THREE.MeshStandardMaterial({ color: 0xd9cfe6, roughness: 0.95, flatShading: true });
  const stoneG = new THREE.CylinderGeometry(0.8, 0.9, 0.3, 10), stoneM = new THREE.MeshStandardMaterial({ color: 0xb9c7d6, roughness: 0.8 });
  const waterG = new THREE.CircleGeometry(6.4, 20).rotateX(-Math.PI / 2), waterM = new THREE.MeshBasicMaterial({ color: 0x8fd0ff, transparent: true, opacity: 0.75 });
  const lampG = new THREE.BoxGeometry(0.7, 1.0, 0.7), lampOffM = new THREE.MeshStandardMaterial({ color: 0x8c8496, roughness: 0.8 }), lampOnM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.3, 1.05, 0.5) });
  const plankG = new THREE.BoxGeometry(1.0, 0.25, 3.2), iceM = new THREE.MeshStandardMaterial({ color: 0xcfeaff, roughness: 0.25 }), woodM = new THREE.MeshStandardMaterial({ color: 0xc98a45, roughness: 0.8 });
  // two tiny hidden primers, so the "lit lantern" and "warm wood" materials are compiled with everything else at start-up (no shader compile mid-flight)
  for (const m of [lampOnM, woodM]) { const pr = new THREE.Mesh(lampG, m); pr.scale.setScalar(0.01); pr.position.set(0, BASE - 3, 0); mountain.add(pr); }
  const items = []; let gi = 0;
  for (let i = 0; i < 15; i++) {
    const a = 0.7 + i * 0.46, g = new THREE.Group(); g.position.copy(P(a)); mountain.add(g);
    if (i % 5 !== 4) { // a rainbow gem
      const c = gi++ % 6, m = new THREE.Mesh(gemG, gemM[c]); g.add(m);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: RAINBOW[c], blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.55 })); sp.scale.setScalar(6); g.add(sp);
      items.push({ g, m, sp, base: g.position.clone(), got: false, pop: 0, col: RAINBOW[c] });
    } else { // a gate: a big soft ring across the rail with a veil, and its array on a ledge beside it
      const n = (i - 4) / 5, def = GATES[n]; g.lookAt(P(a + 0.05));
      const ringM = new THREE.MeshStandardMaterial({ color: new THREE.Color(def.col).multiplyScalar(0.8), emissive: def.col, emissiveIntensity: 0.12, roughness: 0.7 }), ring = new THREE.Mesh(ringG, ringM); g.add(ring);
      const veil = new THREE.Mesh(veilG, new THREE.MeshBasicMaterial({ color: def.col, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false })); g.add(veil);
      const led = new THREE.Group(), inward = V(-Math.cos(a), 0, -Math.sin(a)); led.position.copy(g.position).addScaledVector(inward, 10).add(V(0, -5.5, 0)); led.lookAt(led.position.clone().add(inward)); mountain.add(led);
      led.add(new THREE.Mesh(ledgeG, rockM)); const props = [];
      if (n === 0) { const w = new THREE.Mesh(waterG, waterM); w.position.y = 0.4; w.scale.setScalar(0.01); led.add(w); props.push({ water: w });
        for (let r = 0; r < 2; r++) for (let c = 0; c < 5; c++) { const s = new THREE.Mesh(stoneG, stoneM); s.position.set((c - 2) * 2.0, 0.6, (r - 0.5) * 2.4); s.scale.setScalar(0.01); led.add(s); props.push({ m: s }); } }
      if (n === 1) for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) { const l = new THREE.Mesh(lampG, lampOffM); l.position.set((r - 1.5) * 2.4, 0.9, (c - 0.5) * 2.6); led.add(l); props.push({ m: l }); }
      if (n === 2) for (let k = 0; k < 10; k++) { const p = new THREE.Mesh(plankG, iceM); p.position.set((k - 4.5) * 1.25, 0.5, 0); led.add(p); props.push({ m: p }); }
      items.push({ g, ring, ringM, veil, led, props, base: g.position.clone(), got: false, pop: 0, gate: n, col: def.col });
    }
  }
  const gates = items.filter(it => it.gate !== undefined);
  // the keepsake: a little rolled mountain map
  const map = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.06, 0.95), new THREE.MeshStandardMaterial({ color: 0xf2e2b8, roughness: 0.9, emissive: 0x6a5a30, emissiveIntensity: 0.25 })); map.visible = false; outdoor.add(map);

  // ---- the team: Shu, Kepri and Vulcan fly in formation (on the mountain side and the outer side of Worm, never behind him)
  const TEAM = [{ key: 'shu', ox: -5.6, oy: 2.2, oz: 1.2, cave: true }, { key: 'kepri', ox: 5.6, oy: 2.8, oz: 1.8 }, { key: 'vulcan', ox: -9.2, oy: 4.6, oz: 3.6 }].map(t => ({ ...t, actor: G.team[t.key] }));
  const mate = key => TEAM.find(t => t.key === key).actor;
  let camGoal = CAM_WIDE, camSnap = true, flying = false, gems = 0, opened = 0, holdUntil = 0, powerAt = 0, powering = false, lift = 0;
  const camLook = V(0, 0, 0);

  function resetMountain() {
    gems = 0; opened = 0; holdUntil = 0; powering = false; powerAt = 0; lift = 0;
    for (const it of items) { it.got = false; it.pop = 0; it.g.visible = true; it.g.scale.setScalar(1); it.g.position.copy(it.base); }
    for (const gt of gates) { gt.ringM.emissiveIntensity = 0.12; gt.veil.visible = true; gt.veil.scale.setScalar(1);
      gt.props.forEach(p => { if (p.water) p.water.scale.setScalar(0.01); else if (gt.gate === 0) p.m.scale.setScalar(0.01); else p.m.material = gt.gate === 1 ? lampOffM : iceM; }); }
  }
  // a gate opens (always, by itself, when the team arrives; or early with the power button): its dragon's power plays and the array appears one by one
  function openGate(gt) {
    const def = GATES[gt.gate], d = mate(def.key); opened = gt.gate + 1; d.setGlow(true); d.wiggle(1.6); worm.wiggle(1); sfx.chime(); if (gt.gate === 2) sfx.hic(); else sfx.magic();
    const head = d.headWorld(), to = gt.led.position.clone().add(V(0, 1.2, 0)); for (let k = 0; k <= 6; k++) fx.burst(head.clone().lerp(to, k / 6), def.col, 7, 2, 0.4, 0.7, 0);
    fx.burst(gt.base.clone(), def.col, 22, 6, 0.45, 1.0, 0);   // a small sparkle only: a big burst plus a glowing ring floods the picture and washes the dragons out
    const things = gt.props.filter(p => p.m), n = things.length;
    tween(1.4, k => {
      gt.veil.scale.setScalar(Math.max(0.001, 1 - ease(Math.min(1, k * 2.5)))); gt.ringM.emissiveIntensity = 0.12 + 0.28 * ease(k);
      things.forEach((p, j) => { const on = k * n > j; if (gt.gate === 0) p.m.scale.setScalar(on ? 1 : 0.01); else p.m.material = on ? (gt.gate === 1 ? lampOnM : woodM) : (gt.gate === 1 ? lampOffM : iceM); });
      if (gt.gate === 0) gt.props[0].water.scale.setScalar(Math.max(0.01, ease(k)));
    }).then(() => { gt.veil.visible = false; d.setGlow(false); });
    G.setCounter(def.eq, def.icon); holdUntil = performance.now() + 4500; toast('worm', def.line, 2600);
    const b = $('#btn-trail-power'); if (b) b.textContent = GATES[Math.min(2, opened)].label;
  }
  function onCollect(i, it) {
    if (it.gate !== undefined) return openGate(it);
    gems++; sfx.star((gems - 1) % 8); fx.burst(fl.pos.clone(), it.col, 36, 6, 0.6, 1.1, -1); worm.wiggle(0.7);
    if (performance.now() > holdUntil) G.setCounter(`${gems} / 12`, '🌈');
    const line = { 1: 'אבן קשת ראשונה! 🌈', 6: 'חצי דרך אל הפסגה!', 12: 'כל אבני הקשת אצלנו!' }[gems]; if (line && performance.now() > holdUntil) toast('worm', line, 1900);
  }
  // The power button: the dragon whose gate is next (water → sun → fire). It carries the next gem straight to Worm, or
  // opens the next gate from afar. Always works; a 2.5 s rest between uses.
  function teamPower() {
    const i = G.nextItem(), it = items[i], now = performance.now(); if (!flying || !it || powering || now - powerAt < 2500 || fl.done) return;
    powering = true; powerAt = now; const def = GATES[Math.min(2, opened)], d = mate(def.key), from = it.g.position.clone(), head = d.headWorld(); d.setGlow(true); d.wiggle(1.2); sfx.magic();
    for (let k = 0; k <= 5; k++) fx.burst(head.clone().lerp(from, k / 5), def.col, 10, 2, 0.45, 0.7, 0);
    tween(0.5, k => { if (it.gate === undefined) { it.g.position.lerpVectors(from, fl.pos, k * k); fx.trail(it.g.position.clone(), def.col, 0.45); } })
      .then(() => { powering = false; d.setGlow(false); if (flying && !it.got && G.nextItem() === i) G.collectNext(); });
  }
  function flightTick(dt, time) {
    const yaw = worm.root.rotation.y, c = Math.cos(yaw), s = Math.sin(yaw), close = 1 - 0.45 * lift; // the team gathers close while Worm carries everyone
    for (const t of TEAM) { const ox = t.ox * close, oz = t.oz * close; t.actor.root.position.set(worm.root.position.x + ox * c + oz * s, worm.root.position.y + t.oy + Math.sin(time * 1.8 + t.ox) * 0.35 * (1 - lift), worm.root.position.z - ox * s + oz * c); t.actor.root.rotation.set(0, yaw, 0); t.actor.update(dt, time); }
    const ni = G.nextItem();
    items.forEach((it, i) => {
      if (it.gate !== undefined) { it.ring.rotation.z = time * 0.25; return; }                       // gates stay; only their veil goes
      if (it.got) { it.pop += dt; const k = Math.max(0, 1 - it.pop * 2.5); it.g.scale.setScalar(k * (1 + it.pop * 3)); it.g.visible = k > 0; }
      else { if (!powering || i !== ni) it.g.position.y = it.base.y + Math.sin(time * 1.6 + i) * 0.45; it.m.rotation.y = time * 1.4 + i; it.sp.material.opacity = i === ni ? 0.8 : 0.5; }
    });
    if (lift > 0 && Math.random() < 0.6) fx.trail(worm.seatWorld(Math.random()).add(V((Math.random() - 0.5) * 9, 1 + Math.random() * 3, (Math.random() - 0.5) * 9)), 0x7dffb0, 0.4);
  }
  function tick(dt, time) {
    if (G.mode === 'flight' && flying) return flightTick(dt, time);
    if (G.mode !== 'trail') return;
    if (map.visible) map.rotation.y = time * 1.4;
    if (camSnap) { cam.position.copy(camGoal.pos); camLook.copy(camGoal.look); camSnap = false; }
    cam.position.lerp(camGoal.pos, Math.min(1, dt * 2)); camLook.lerp(camGoal.look, Math.min(1, dt * 2.5)); cam.lookAt(camLook);
    sun.position.copy(WORM_AT).addScaledVector(world.sunDir, 120); sun.target.position.copy(WORM_AT);
  }
  function showAll(v) { mountain.visible = v; map.visible = false; for (const t of TEAM) t.actor.root.visible = false; } // start-up shader warm-up and hiding
  function endFlight() {
    flying = false; powering = false; lift = 0; mountain.visible = false; world.group.visible = true; clearActions(); worm.setGlow(false);
    for (const t of TEAM) { t.actor.root.visible = false; t.actor.setPose('rest'); t.actor.setGlow(false); if (t.cave) caveScene.add(t.actor.root); }
  }
  function cleanup() { endFlight(); map.visible = false; $('#counter').hidden = true; }
  const begin = () => { G.tick = tick; G.onLeave = cleanup; G.tap = null; };

  function lawn() {
    G.useScene(outdoor); G.mode = 'trail'; endFlight(); G.stars.group.visible = false; map.visible = false;
    $('#title').hidden = true; $('#hud').hidden = false; $('#counter').hidden = true; $('#arrow').hidden = true; G.showJoy(false); G.aura.material.opacity = 0;
    worm.root.position.copy(WORM_AT); worm.root.rotation.set(0, -1.2, 0); worm.setPose('rest'); worm.state.blend = 1; worm.setGlow(false); worm.lookAt(DRAKE_AT.clone().setY(DRAKE_AT.y + 1.4));
    drake.setSit(0); drake.setWalk(0); drake.root.scale.setScalar(1); drake.root.position.copy(DRAKE_AT); drake.root.rotation.set(0, Math.PI - 0.5, 0); drake.root.quaternion.setFromEuler(drake.root.rotation);
    G.king.root.position.set(0, G.PLATEAU + 7.0, 15.6); G.king.root.scale.setScalar(1.7);
    G.playerTurn = false; camGoal = CAM_WIDE; camSnap = true;
  }

  // ---------------------------------------------------------------- the story
  async function story(from = 'intro') {
    const step = runner(); begin();
    if (from === 'end') return ending(step, true);
    await step(fade(true));
    if (from === 'intro') {
      lawn();
      await step(card({ kicker: 'פרק 7', title: 'המסע אל הר הקשת' })); await step(fade(false));
      G.phase = 'c7-intro'; G.checkpoint(7, 'intro'); camGoal = CAM_WIDE; worm.wiggle(0.8); drake.wave(2);   // wide: Drake and Worm both in view while Drake speaks
      await step(say('drake', 'וורם, תראה במפה: שלושה שערים בדרך אל הר הקשת!'));
      camGoal = CAM_WORM;
      await step(say('worm', 'כל שער נפתח בכוח של דרקון אחר. נצא עם כל הצוות!'));
      // ---- one map riddle on the ground before the climb (multiplication, from the adaptive engine)
      G.phase = 'c7-math';
      const react = { right: () => { worm.wiggle(1.4); sfx.happy(); }, wrong: w => toast('worm', w >= 3 ? 'אני איתך, דרייק! 💚' : 'אתה יכול! אני מאמין בך 💚', 2500) };
      await step(G.math.ask({ kind: 'mul', title: '🗺️ חידת המפה', ...react }));
      G.phase = 'c7-fly-ready'; camGoal = CAM_WIDE;
      await step(new Promise(res => actions([{ id: 'btn-trail-fly', label: '🌈 טסים אל הר הקשת!', cls: 'pulse', onClick: () => res() }])));
      clearActions(); worm.setGlow(true); sfx.magic(); fx.burst(worm.headWorld(), 0x7dffb0, 60, 5, 0.5, 1.4, 0);
      await step(wait(600)); worm.setGlow(false); await step(fade(true));
    }
    await flight(step);
    // ---- the summit: two short lines and the keepsake
    G.phase = 'c7-summit'; $('#counter').hidden = true;   // the wide equation counter would push 🔊 and 🏠 under the speech bubble on iPhone
    await step(say('worm', 'הגענו לפסגה של הר הקשת, כולנו יחד!'));
    const m0 = fl.pos.clone().add(V(0, 7, 0)), m1 = worm.headWorld().add(V(0, 2.2, 0)); map.visible = true; map.rotation.set(0, 0, 0);
    await step(tween(1.6, k => { const e = ease(k); map.position.lerpVectors(m0, m1, e); map.rotation.y = e * 6; }));
    worm.wiggle(1.6); sfx.happy(); fx.burst(m1.clone(), 0xffe27a, 40, 5, 0.5, 1.2, 0.5);
    await step(say('drake', 'מפת ההר שלמה! עכשיו נמצא את הענן.'));
    G.phase = 'c7-celebrate'; sfx.fanfare(); worm.wiggle(2.2); for (const t of TEAM) t.actor.wiggle(2);
    for (let i = 0; i < 3; i++) setTimeout(() => { if (G.tick === tick) fx.confetti(fl.pos.clone().add(V(0, 4, 0)), 60); }, i * 500);
    await step(tween(1.8, () => { }));                       // a moment at the top (⏭ skips it)
    const v = await step(card({ kicker: '🗺️ 🗺️ 🗺️', title: 'כל הכבוד!', text: 'פתחתם שלושה שערים, ווורם נשא את כולם אל הפסגה! וורם קיבל מזכרת: מפת ההר 🗺️',
      buttons: [{ label: '🔁 עוד פעם?', value: 'again' }, { label: 'סיום הפרק ◀', value: 'end', cls: 'green' }] }));
    if (v === 'again') { await step(fade(true)); cleanup(); return story('flight'); }
    return ending(step, false);
  }
  async function flight(step) {
    resetMountain(); map.visible = false;
    G.startFlight({ items, lead: [P(0.2), P(0.45)], exit: [P(7.5), P(7.85), P(8.2)], speed: 8.5, camSide: -1, lookDown: 3, onCollect });
    world.group.visible = false; G.stars.group.visible = false; mountain.visible = true; fl.kingSaid = true;
    for (const t of TEAM) { outdoor.add(t.actor.root); t.actor.root.visible = true; t.actor.setPose('fly'); t.actor.state.blend = 1; t.actor.lookAt(null); }
    flying = true; G.tick = tick; G.phase = 'c7-flight'; G.checkpoint(7, 'flight'); G.setCounter('0 / 12', '🌈');
    await step(fade(false)); G.showJoy(true); worm.wiggle(1);
    toast('worm', 'עולים אל הר הקשת! אוספים אבני קשת ופותחים שלושה שערים 🌈', 3800);
    await step(wait(3900));
    actions([{ id: 'btn-trail-power', label: GATES[Math.min(2, opened)].label, onClick: teamPower }]);
    await step(G.waitFor(() => fl.got >= items.length));
    // ---- the last gap: Worm carries everyone across with his mind power (the rail simply goes on; nothing to do, nothing to miss)
    // first let the last gate be seen: the frozen bridge thaws plank by plank and its array (10 × 1 = 10) stays in the counter
    fl.done = true; G.showJoy(false); clearActions();
    await step(tween(2.6, () => { }));
    G.phase = 'c7-lift'; hideToast(); worm.setGlow(true); sfx.magic();   // the counter keeps the bridge's equation: nothing overwrites the third array
    toast('worm', 'אני נושא את כולם מעל התהום, בכוח המחשבה! 💚', 3000);
    fx.burst(fl.pos.clone(), 0x7dffb0, 90, 9, 0.7, 1.6, 0);
    await step(tween(3.2, k => { lift = Math.sin(Math.min(1, k * 1.15) * Math.PI / 2); }));
    worm.setGlow(false); sfx.fanfare(); await step(tween(0.8, k => { lift = 1 - ease(k); })); lift = 0;
  }
  async function ending(step, direct) {
    if (direct) { await step(fade(true)); lawn(); await step(fade(false)); }
    G.phase = 'c7-end'; $('#counter').hidden = true; G.markDone(7);
    const v = await step(card({ kicker: 'סוף פרק 7 – המסע אל הר הקשת', title: 'המשך יבוא…', text: 'בפרק הבא: הענן הרטנן ממש מעליהם, והוא בוכה טפטוף קטן… 🌧️',
      buttons: [{ label: '🔁 עוד פעם?', value: 'again' }, { label: '🏠 לתפריט', value: 'home', cls: 'green' }] }));
    await step(fade(true));
    if (v === 'again') { cleanup(); return story('intro'); }
    G.enterTitle(); await fade(false);
  }

  return {
    start: story, showAll,
    debug: () => ({ tweens: G.tweenCount(), flying, gems, opened, lift: +lift.toFixed(2), items: items.length, isTick: G.tick === tick }),
  };
}
