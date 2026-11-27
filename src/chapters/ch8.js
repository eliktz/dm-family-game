// Chapter 8 "קשת של חברים" (the finale, see STORY.md): Worm's biggest moment.
//   lawn: the Grumble Cloud hangs over the castle, crying a tiny drizzle → Worm's mind-lift (one big button; it always
//   works) carries Drake and the dragons up to the cloud → Drake invites the cloud to play; it laughs for the first time
//   and turns into a huge rainbow over King Roland's castle → Worm's big quiz (the player picks easy / medium / hard; one
//   riddle from the adaptive engine) → the festival flight: a rail-guided spiral round the castle through 8 colour rings
//   (and 8 sparkle stars between them); every colour collected lights its band of the big rainbow. The friends' power
//   button carries the next thing to Worm. Then King Roland's medal, the last hug, the credits card and the ending.
// Nothing can fail and nothing is scary: the cloud is sad, then happy. Everything is built once at start-up (hidden); no
// lights or materials are created at runtime.
import { glowSprite } from '../tex.js';

export function chapter8(G) {
  const { THREE, cam, fx, worm, drake, outdoor, caveScene, world, heightAt, sun, say, toast, hideToast, card, fade, sfx, runner, wait, tween, fl, actions, clearActions } = G;
  const V = (x, y, z) => new THREE.Vector3(x, y, z), $ = s => document.querySelector(s);
  const ground = (x, z, up = 0) => V(x, heightAt(x, z) + up, z);
  const ease = k => k * k * (3 - 2 * k);
  const cloud = G.grumble;                                     // the shared Grumble Cloud (built in chapter 3)

  // ---------------------------------------------------------------- the lawn in front of the castle
  const WORM_AT = ground(6.6, 24.2), DRAKE_AT = ground(-6.4, 31.4), KEPRI_AT = ground(-10.8, 25.5), VULCAN_AT = ground(11.6, 27.5);   // both inside the frame of the wide lawn shot
  const LIFT = 5.2;                                            // how high Worm's mind-lift carries everyone
  const CLOUD_UP = ground(0.5, 19.5, G.engine.viewShift ? 7.3 : 6.7);   // over the gate, below the speech bubble (as in chapters 3 and 6)
  const CAM_WIDE = G.engine.viewShift ? { pos: ground(0, 43.5, 6.6), look: ground(0, 27.4, 1.3) } : { pos: ground(0, 49.5, 8.4), look: ground(0, 27, 1.7) };
  const CAM_WORM = { pos: ground(2.4, 34.5, 2.8), look: ground(5.6, 25, 1.9) };
  const CAM_UP = G.engine.viewShift ? { pos: ground(0, 44.5, 8.2), look: ground(1.5, 23.5, 5.4) } : { pos: ground(0, 50, 10), look: ground(1.5, 23.5, 5.6) };   // the cloud and the lifted team together
  const CAM_SKY = G.engine.viewShift ? { pos: ground(0, 62, 9), look: V(0, G.PLATEAU + 17, 8) } : { pos: ground(0, 70, 11), look: V(0, G.PLATEAU + 19, 8) };       // the whole rainbow over the castle

  // ---------------------------------------------------------------- the big rainbow over the castle: 8 bands, pale until their colour is collected
  const COLOURS = [0xff5f6e, 0xff9a3c, 0xf2cf3a, 0x4fc46a, 0x34c3c8, 0x3fa0f0, 0x9a6ff0, 0xff7fc8];   // red, orange, yellow, green, turquoise, blue, purple, pink
  const rainbow = new THREE.Group(); rainbow.position.set(0, G.PLATEAU - 3, 8); rainbow.visible = false; outdoor.add(rainbow);
  const bands = COLOURS.map((c, i) => { const m = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.22, fog: false, depthWrite: false });
    const arc = new THREE.Mesh(new THREE.TorusGeometry(52 - i * 2.3, 1.15, 5, 40, Math.PI), m); rainbow.add(arc); return m; });

  // ---------------------------------------------------------------- the festival rail: 16 things on a spiral round the castle
  // (even places: a sparkle star; odd places: one of the 8 colour rings)
  const spiral = (a, R, y) => V(Math.cos(a) * R, G.PLATEAU + y, Math.sin(a) * R);
  const starG = new THREE.OctahedronGeometry(0.9, 0), starM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.85, 0.35) });
  const ringG = new THREE.TorusGeometry(5.2, 0.5, 8, 26), ringM = COLOURS.map(c => new THREE.MeshBasicMaterial({ color: c, fog: false }));
  const glow = glowSprite('rgba(255,255,255,1)', 'rgba(255,255,255,0)');
  const festival = new THREE.Group(); festival.visible = false; outdoor.add(festival);
  const STEP = 0.58, pt = i => spiral(0.9 + i * STEP, 37 + i * 1.4, 11.5 + 3 * Math.sin(i * 1.1) + i * 0.25);
  const items = Array.from({ length: 16 }, (_, i) => {
    const g = new THREE.Group(); g.position.copy(pt(i)); g.position.y = Math.max(g.position.y, heightAt(g.position.x, g.position.z) + 8); festival.add(g);
    if (i % 2 === 0) { const m = new THREE.Mesh(starG, starM); g.add(m); const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xffe27a, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.5 })); sp.scale.setScalar(5); g.add(sp);
      return { g, m, sp, base: g.position.clone(), got: false, pop: 0, col: 0xffe27a }; }
    const c = (i - 1) / 2; g.lookAt(pt(i + 0.1)); const m = new THREE.Mesh(ringG, ringM[c]); g.add(m);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: COLOURS[c], blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.5 })); sp.scale.setScalar(13); g.add(sp);
    return { g, m, sp, base: g.position.clone(), got: false, pop: 0, col: COLOURS[c], colour: c };
  });
  // the keepsake: the rainbow medal (a little disc with a coloured rim)
  const medal = new THREE.Group(); { const d = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.08, 20).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xe8b93a, metalness: 0.7, roughness: 0.3, emissive: 0x6a4a10, emissiveIntensity: 0.4 }));
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.07, 6, 20), ringM[6]); medal.add(d, rim); } medal.visible = false; outdoor.add(medal);

  // ---- friends: Kepri and Vulcan are on the lawn and are lifted with Worm; in the festival all four take turns, two at a time
  const FRIENDS = [{ key: 'kepri', col: 0xffe27a }, { key: 'vulcan', col: 0xff9a3a }, { key: 'shu', col: 0x9fdcff, cave: true }, { key: 'gem', col: 0xff9be0, cave: true }].map(f => ({ ...f, actor: G.team[f.key] }));
  const SLOTS = [{ ox: -5.6, oy: 2.2, oz: 1.2 }, { ox: 5.6, oy: 2.8, oz: 1.8 }];
  let camGoal = CAM_WIDE, camSnap = true, flying = false, lifted = 0, colours = 0, stars = 0, active = [], powerAt = 0, powering = false, turn = 0, dance = false, drizzle = false;
  const camLook = V(0, 0, 0), _w = V(0, 0, 0);
  function showFriend(f) { outdoor.add(f.actor.root); f.actor.root.visible = true; f.actor.state.blend = 1; /* each dragon keeps the scale its own chapter gave it */ f.actor.lookAt(null); if (f.key === 'gem') f.actor.state.shy = false; }
  function hideFriend(f) { f.actor.root.visible = false; f.actor.setPose('rest'); f.actor.setGlow(false); if (f.cave) caveScene.add(f.actor.root); }
  const setBands = n => bands.forEach((m, i) => { m.opacity = i < n ? 0.95 : 0.22; });

  function tick(dt, time) {
    if (G.mode === 'flight' && flying) return flightTick(dt, time);
    if (G.mode !== 'finale') return;
    // the lawn: Worm (with Drake on his back once lifted) and the two friends hover at the lifted height
    const up = LIFT * ease(lifted), bob = lifted > 0 ? Math.sin(time * 1.6) * 0.18 * lifted : 0;
    worm.root.position.set(WORM_AT.x, WORM_AT.y + up + bob, WORM_AT.z);
    if (lifted > 0.02) { drake.root.position.copy(worm.seatWorld(0.16, _w)); drake.root.quaternion.copy(worm.root.quaternion); }
    [[FRIENDS[0], KEPRI_AT], [FRIENDS[1], VULCAN_AT]].forEach(([f, at], k) => { if (!f.actor.root.visible) return; f.actor.root.position.set(at.x, at.y + up * 0.9 + Math.sin(time * 1.5 + k * 2) * 0.2 * lifted, at.z); f.actor.update(dt, time); if (dance && Math.sin(time * 2.2 + k * 1.7) > 0.985) f.actor.wiggle(1.4); });
    if (lifted > 0.05 && lifted < 1 && Math.random() < 0.7) fx.trail(V(WORM_AT.x + (Math.random() - 0.5) * 22, WORM_AT.y + up * Math.random(), WORM_AT.z + (Math.random() - 0.5) * 8), 0x7dffb0, 0.4);
    if (drizzle && cloud.root.visible && Math.random() < 0.5) fx.trail(cloud.root.position.clone().add(V((Math.random() - 0.5) * 3.2, -1.2 - Math.random() * 1.5, (Math.random() - 0.5) * 1.2)), 0x9fdcff, 0.22); // a tiny drizzle
    if (cloud.root.visible) cloud.root.position.y += Math.sin(time * 0.9) * 0.004;
    if (dance && Math.sin(time * 2.2) > 0.985) worm.wiggle(1.4);
    if (medal.visible) medal.rotation.y = time * 1.8;
    if (camSnap) { cam.position.copy(camGoal.pos); camLook.copy(camGoal.look); camSnap = false; }
    cam.position.lerp(camGoal.pos, Math.min(1, dt * 2)); camLook.lerp(camGoal.look, Math.min(1, dt * 2.5)); cam.lookAt(camLook);
    sun.position.copy(WORM_AT).addScaledVector(world.sunDir, 120); sun.target.position.copy(WORM_AT);
  }
  function flightTick(dt, time) {
    const yaw = worm.root.rotation.y, c = Math.cos(yaw), s = Math.sin(yaw);
    active.forEach((f, k) => { const o = SLOTS[k]; f.actor.root.position.set(worm.root.position.x + o.ox * c + o.oz * s, worm.root.position.y + o.oy + Math.sin(time * 1.8 + k * 2) * 0.35, worm.root.position.z - o.ox * s + o.oz * c); f.actor.root.rotation.set(0, yaw, 0); f.actor.update(dt, time); });
    const ni = G.nextItem();
    items.forEach((it, i) => {
      if (it.got) { it.pop += dt; const k = Math.max(0, 1 - it.pop * 2.5); it.g.scale.setScalar(k * (1 + it.pop * 2.5)); it.g.visible = k > 0; }
      else { if (!powering || i !== ni) it.g.position.y = it.base.y + Math.sin(time * 1.6 + i) * 0.4; if (it.colour === undefined) it.m.rotation.y = time * 1.6 + i; it.sp.material.opacity = i === ni ? 0.8 : 0.45; }
    });
  }
  function onCollect(i, it) {
    worm.wiggle(0.7);
    if (it.colour === undefined) { stars++; sfx.star((stars - 1) % 8); fx.burst(fl.pos.clone(), it.col, 26, 5, 0.5, 1.0, -1); return; }
    colours++; setBands(colours); sfx.chime(); fx.burst(fl.pos.clone(), it.col, 44, 7, 0.6, 1.2, 0); for (const f of active) f.actor.wiggle(1.2);
    G.setCounter(`${colours} / 8`, '🌈');
    const line = { 1: 'צבע ראשון! הקשת מתחילה לזהור 🌈', 4: 'חצי קשת! כל החברים איתנו', 7: 'רק עוד צבע אחד!' }[colours]; if (line) toast('worm', line, 2000);
    if (colours === 4) { // half way: the other two friends take over, so every dragon flies in the festival
      const next = [FRIENDS[2], FRIENDS[3]]; active.forEach(hideFriend); active = next; active.forEach(f => { showFriend(f); f.actor.setPose('fly'); }); fx.burst(fl.pos.clone(), 0xffffff, 30, 6, 0.5, 1.0, 0); }
  }
  // The friends' power button: the friend whose turn it is carries the next thing straight to Worm. Always works; 2.5 s rest.
  function friendsPower() {
    const i = G.nextItem(), it = items[i], now = performance.now(); if (!flying || !it || powering || now - powerAt < 2500 || fl.done) return;
    powering = true; powerAt = now; const f = active[turn++ % active.length], from = it.g.position.clone(), head = f.actor.headWorld(); f.actor.setGlow(true); f.actor.wiggle(1.2); sfx.magic();
    for (let k = 0; k <= 5; k++) fx.burst(head.clone().lerp(from, k / 5), f.col, 8, 2, 0.4, 0.7, 0);
    tween(0.5, k => { it.g.position.lerpVectors(from, fl.pos, k * k); fx.trail(it.g.position.clone(), it.col, 0.45); }).then(() => { powering = false; f.actor.setGlow(false); if (flying && !it.got && G.nextItem() === i) G.collectNext(); });
  }
  function showAll(v) { rainbow.visible = v; festival.visible = v; medal.visible = false; } // start-up shader warm-up and hiding
  function endFlight() { flying = false; powering = false; festival.visible = false; clearActions(); for (const f of active) hideFriend(f); active = []; }
  function cleanup() {
    endFlight(); for (const f of FRIENDS) hideFriend(f); rainbow.visible = false; medal.visible = false; lifted = 0; dance = false; drizzle = false; worm.setGlow(false);
    cloud.root.visible = false; cloud.root.scale.setScalar(1); cloud.state.mood = null; $('#counter').hidden = true;
  }
  const begin = () => { G.tick = tick; G.onLeave = cleanup; G.tap = null; };

  // stage the lawn. part: 'start' (sad cloud, everyone on the ground) | 'rainbow' (the cloud has become the rainbow, team still lifted) | 'party' (after the festival: on the ground, full rainbow)
  function lawn(part) {
    G.useScene(outdoor); G.mode = 'finale'; endFlight(); world.group.visible = true; G.stars.group.visible = false; medal.visible = false; dance = false;
    $('#title').hidden = true; $('#hud').hidden = false; $('#counter').hidden = true; $('#arrow').hidden = true; G.showJoy(false); G.aura.material.opacity = 0;
    lifted = part === 'rainbow' ? 1 : 0;
    worm.root.rotation.set(0, -1.2, 0); worm.setPose(lifted ? 'fly' : 'rest'); worm.state.blend = 1; worm.setGlow(false); worm.lookAt(lifted ? null : DRAKE_AT.clone().setY(DRAKE_AT.y + 1.4)); worm.root.position.copy(WORM_AT);
    drake.setWalk(0); drake.root.scale.setScalar(1); drake.setSit(lifted ? 1 : 0); if (!lifted) { drake.root.position.copy(DRAKE_AT); drake.root.rotation.set(0, Math.PI - 0.5, 0); drake.root.quaternion.setFromEuler(drake.root.rotation); }
    for (const [f, at, ry] of [[FRIENDS[0], KEPRI_AT, 1.1], [FRIENDS[1], VULCAN_AT, -1.3]]) { showFriend(f); f.actor.setPose(lifted ? 'fly' : 'rest'); f.actor.root.position.copy(at); f.actor.root.rotation.set(0, ry, 0); }
    hideFriend(FRIENDS[2]); hideFriend(FRIENDS[3]);
    G.king.root.position.set(0, G.PLATEAU + 7.0, 15.6); G.king.root.scale.setScalar(1.7);
    const sad = part === 'start'; cloud.root.visible = sad; cloud.root.position.copy(CLOUD_UP); cloud.root.rotation.set(0, 0, 0); cloud.root.scale.setScalar(1); cloud.state.mood = sad ? 'sad' : null; drizzle = sad;
    rainbow.visible = !sad; rainbow.scale.setScalar(1); setBands(part === 'party' ? 8 : 0);
    G.playerTurn = false; camGoal = sad ? CAM_WIDE : CAM_SKY; camSnap = true;
  }

  // ---------------------------------------------------------------- the story
  async function story(from = 'intro') {
    const step = runner(); begin();
    if (from === 'end') return ending(step, true);
    await step(fade(true));
    if (from === 'intro') {
      lawn('start');
      await step(card({ kicker: 'פרק 8', title: 'קשת של חברים' })); await step(fade(false));
      G.phase = 'c8-intro'; G.checkpoint(8, 'intro'); worm.wiggle(0.8);
      await step(say('drake', 'הענן הרטנן בוכה טפטוף קטן. בואו נעלה אליו!'));
      camGoal = CAM_WORM; worm.wiggle(1.2); sfx.purr();
      await step(say('worm', 'אני ארים את כולנו אליו, בכוח המחשבה שלי!'));
      // ---- Worm's biggest moment: one big button, and everyone rises
      G.phase = 'c8-lift-ready'; camGoal = CAM_WIDE;
      await step(new Promise(res => actions([{ id: 'btn-lift-all', label: '💚 כוח המחשבה של וורם!', cls: 'green pulse', onClick: () => res() }])));
      clearActions(); G.phase = 'c8-lift'; worm.setGlow(true); sfx.magic(); camGoal = CAM_UP; worm.setPose('fly'); drake.setSit(1); for (const f of [FRIENDS[0], FRIENDS[1]]) { f.actor.setPose('fly'); f.actor.wiggle(1.2); }
      fx.burst(WORM_AT.clone().add(V(0, 1.5, 0)), 0x7dffb0, 90, 9, 0.7, 1.6, 0.5);
      toast('worm', 'כולם מרחפים! אל תדאגו, אני מחזיק אתכם 💚', 3200);
      await step(tween(3.6, k => { lifted = Math.max(0.03, k); }));
      lifted = 1; worm.setGlow(false); sfx.happy();
      // ---- Drake invites the cloud to play; it laughs for the first time
      G.phase = 'c8-cloud'; hideToast();
      await step(say('drake', 'ענן, רוצה לשחק איתנו? יש מקום לעוד חבר!'));
      cloud.state.mood = 'happy'; drizzle = false; sfx.happy(); fx.hearts3(cloud.root.position.clone().add(V(0, 1.2, 1.5)), 6);
      await step(say('cloud', 'באמת? אף אחד לא הזמין אותי אף פעם! חה חה חה!'));
      // ---- the cloud turns into a huge rainbow over the castle
      G.phase = 'c8-rainbow'; camGoal = CAM_SKY; sfx.fanfare(); rainbow.visible = true; setBands(0); const c0 = cloud.root.position.clone(), c1 = V(0, G.PLATEAU + 30, 8);
      for (let i = 0; i < 3; i++) setTimeout(() => { if (G.tick === tick) fx.confetti(ground(0, 24, 9), 60); }, i * 500);
      await step(tween(3.0, k => { const e = ease(k); cloud.root.position.lerpVectors(c0, c1, e); cloud.root.scale.setScalar(Math.max(0.02, 1 - e)); rainbow.scale.setScalar(0.05 + 0.95 * e); }));
      cloud.root.visible = false; cloud.root.scale.setScalar(1); cloud.state.mood = null; rainbow.scale.setScalar(1);
      toast('worm', 'הענן הפך לקשת ענקית! בואו נאסוף לה את כל הצבעים 🌈', 3200);
      await step(tween(2.2, () => { }));
      // ---- Worm's big quiz: the player picks how hard
      G.phase = 'c8-quiz';
      const pick = await step(card({ kicker: '🐉 החידון הגדול של וורם', title: 'איזו חידה תרצה?', buttons: [{ label: '🙂 קלה', value: 'easy', cls: 'green' }, { label: '😀 בינונית', value: 'med' }, { label: '🤩 קשה', value: 'hard' }] }));
      const L = G.math.level, lvl = pick === 'easy' ? Math.max(1, L - 1) : pick === 'hard' ? Math.min(5, Math.max(L, Math.min(G.math.ceiling, L + 1))) : L;
      const kinds = ['add', 'sub', 'mul', 'missing'], kind = kinds[Math.floor(Math.random() * kinds.length)];
      G.phase = 'c8-math';
      const react = { right: () => { worm.wiggle(1.4); sfx.happy(); }, wrong: w => toast('worm', w >= 3 ? 'אני איתך, דרייק! 💚' : 'אתה יכול! אני מאמין בך 💚', 2500) };
      await step(G.math.ask({ kind, title: '🐉 החידון הגדול של וורם', fixed: G.makeRiddle(lvl, kind), ...react }));
      G.phase = 'c8-fly-ready'; camGoal = CAM_SKY;
      await step(new Promise(res => actions([{ id: 'btn-festival-fly', label: '🌈 טסים בפסטיבל הקשת!', cls: 'pulse', onClick: () => res() }])));
      clearActions(); sfx.magic(); await step(wait(400)); await step(fade(true));
    }
    await flight(step);
    // ---- back on the lawn: King Roland's medal, the last hug, the dragons dance
    lawn('party'); camGoal = CAM_WIDE; camSnap = true; dance = true; await step(fade(false));
    G.phase = 'c8-medal'; G.king.wave(3);
    await step(say('king', 'אתם מאסטרי דרקונים אמיתיים! קבלו את מדליית הקשת.'));
    const m0 = G.king.root.position.clone().add(V(0, 2.4, 0)), m1 = worm.headWorld().add(V(-1.6, 1.3, 1.6)); medal.visible = true;
    await step(tween(1.8, k => { const e = ease(k); medal.position.lerpVectors(m0, m1, e); medal.position.y += Math.sin(e * Math.PI) * 2.2; }));
    camGoal = CAM_WORM; worm.wiggle(2); sfx.happy(); fx.burst(m1.clone(), 0xffe27a, 40, 5, 0.5, 1.2, 0.5);
    await step(say('worm', 'דרייק, אתה החבר הכי טוב שלי. בוא לחיבוק!'));
    fx.hearts3(worm.headWorld().add(V(-0.6, 0.8, 0.8)), 10); worm.wiggle(2.4); drake.wave(2.5); sfx.purr();
    G.phase = 'c8-celebrate'; camGoal = CAM_WIDE; sfx.fanfare();
    for (let i = 0; i < 3; i++) setTimeout(() => { if (G.tick === tick) fx.confetti(ground(0, 28, 5), 60); }, i * 500);
    await step(tween(2.4, () => { }));                       // the last hug and the dancing dragons (⏭ skips it)
    const v = await step(card({ kicker: '🏅 🌈 🏅', title: 'מאסטר דרקונים אמיתי!', text: 'הענן הרטנן הפך לקשת של חברים, ואספתם את כל 8 הצבעים! וורם קיבל מזכרת: מדליית הקשת 🏅',
      buttons: [{ label: '🔁 עוד פעם?', value: 'again' }, { label: 'סיום ההרפתקה ◀', value: 'end', cls: 'green' }] }));
    if (v === 'again') { await step(fade(true)); cleanup(); return story('flight'); }
    return ending(step, false);
  }
  async function flight(step) {
    colours = 0; stars = 0; powering = false; powerAt = 0; turn = 0; lifted = 0; dance = false; drizzle = false; cloud.root.visible = false; medal.visible = false;
    for (const it of items) { it.got = false; it.pop = 0; it.g.visible = true; it.g.scale.setScalar(1); it.g.position.copy(it.base); }
    for (const f of FRIENDS) hideFriend(f);
    G.startFlight({ items, lead: [spiral(0.0, 37, 11), spiral(0.45, 37, 11.5)], exit: [pt(15.4), pt(15.7), pt(16.0)], speed: 8.5, camSide: -1, lookDown: 3, onCollect });
    world.group.visible = true; G.stars.group.visible = false; festival.visible = true; rainbow.visible = true; rainbow.scale.setScalar(1); setBands(0); fl.kingSaid = true;
    active = [FRIENDS[0], FRIENDS[1]]; active.forEach(f => { showFriend(f); f.actor.setPose('fly'); });
    flying = true; G.tick = tick; G.phase = 'c8-flight'; G.checkpoint(8, 'flight'); G.setCounter('0 / 8', '🌈');
    await step(fade(false)); G.showJoy(true); worm.wiggle(1);
    toast('worm', 'פסטיבל הקשת! עוברים דרך 8 טבעות צבע סביב הטירה 🌈', 3800);
    await step(wait(3900));
    actions([{ id: 'btn-friends-power', label: '✨ כוח החברים!', onClick: friendsPower }]);
    await step(G.waitFor(() => fl.got >= items.length));
    G.phase = 'c8-flight-done'; fl.done = true; G.showJoy(false); clearActions(); sfx.fanfare(); worm.wiggle(2); for (const f of active) f.actor.wiggle(2);
    toast('worm', 'כל 8 הצבעים! הקשת של החברים שלמה 🌈', 2800);
    await step(wait(2800)); await step(fade(true));
  }
  async function ending(step, direct) {
    if (direct) { await step(fade(true)); lawn('party'); dance = true; await step(fade(false)); }
    G.phase = 'c8-end'; $('#counter').hidden = true; G.markDone(8);
    const v = await step(card({ kicker: 'סוף פרק 8 – קשת של חברים', title: 'סוף ההרפתקה… או רק ההתחלה?', text: 'נבנה באהבה בשביל מאסטר דרקונים צעיר אחד 💚 אפשר לטוס עם וורם בכל זמן, בטיסה חופשית! 🐉',
      buttons: [{ label: '🔁 עוד פעם?', value: 'again' }, { label: '🏠 לתפריט', value: 'home', cls: 'green' }] }));
    await step(fade(true));
    if (v === 'again') { cleanup(); return story('intro'); }
    G.enterTitle(); await fade(false);
  }

  return {
    start: story, showAll,
    debug: () => ({ tweens: G.tweenCount(), flying, colours, stars, lifted: +lifted.toFixed(2), bands: bands.filter(m => m.opacity > 0.5).length, active: active.map(f => f.key), items: items.length, isTick: G.tick === tick }),
  };
}
