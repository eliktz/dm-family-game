// Chapter 6 "הענן הרטנן" (see STORY.md): the Grumble Cloud has taken the colours from King Roland's flower beds and
// hidden them inside little grey puffs in the sky.
//   A. team flight (rail-guided like chapters 1 and 2, so it can never stall): Worm flies with Kepri and Vulcan in
//      formation right round the castle; six pairs of grey puffs pop into colour sparks, counted in equal groups
//      (2, 2 × 2 = 4 … 6 × 2 = 12). Kepri's sunbeam and Vulcan's fireball take turns popping them. This is the longest part.
//   B. paint pots: back on the lawn, tap each pot to pour 5 sparks into it, counting by fives (5, 10, 15, 20); every
//      pot gives a flower bed its colour back. Two riddles from the adaptive engine on the way.
// Then Drake notices the cloud looks sad, and Worm wonders whether he simply wants a friend. Keepsake: a paintbrush
// feather. No fail state anywhere: the flight collects by itself, and after a quiet while Worm pours a pot himself.
// Everything is created once at start-up (hidden); animations use the shared wall-clock tweens.
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { glowSprite } from '../tex.js';

const COLS = [0xff5fa0, 0xffd23f, 0x9a6cff, 0x3fa9ff];

export function chapter6(G) {
  const { THREE, cam, fx, worm, drake, outdoor, heightAt, PLATEAU, sun, world, ui, say, toast, hideToast, card, fade, sfx, runner, wait, tween, fl, actions, clearActions } = G;
  const V = (x, y, z) => new THREE.Vector3(x, y, z), $ = s => document.querySelector(s);
  const ground = (x, z, up = 0) => V(x, heightAt(x, z) + up, z);
  const ease = k => k * k * (3 - 2 * k);
  const cloud = G.grumble, team = [G.team.kepri, G.team.vulcan];           // shared actors owned by chapters 3 and 4

  // ---------------------------------------------------------------- layout: the castle lawn
  const WORM_AT = ground(6.6, 24.2), DRAKE_AT = ground(-6.4, 31.4);
  const BEDS = [-4.8, -1.6, 1.6, 4.8].map(x => ground(x, 26.4)), POTS = [-4.8, -1.6, 1.6, 4.8].map(x => ground(x, 30.6));
  const CLOUD_UP = ground(0.5, 19.5, 8.4), CLOUD_FAR = ground(34, 6, 24), CLOUD_PEEK = ground(-7.5, 21.5, 7.2);
  const CAM_WIDE = G.engine.viewShift ? { pos: ground(0, 43.5, 6.6), look: ground(0, 27.4, 1.3) } : { pos: ground(0, 49.5, 8.4), look: ground(0, 27, 1.7) };
  const CAM_WORM = { pos: ground(2.4, 34.5, 2.8), look: ground(5.6, 25, 1.9) };
  const CAM_CLOUD = { pos: ground(-1.5, 38, 4.2), look: CLOUD_PEEK.clone() };

  // ---------------------------------------------------------------- actors
  // flower beds: a grey version and a coloured version of each (both compiled up front; only visibility changes)
  const greyM = new THREE.MeshStandardMaterial({ color: 0x8d8d8d, roughness: 0.8 }), soilM = new THREE.MeshStandardMaterial({ color: 0x6b4a2c, roughness: 1 });
  const bedGeo = () => { const parts = []; for (let k = 0; k < 7; k++) { const a = k / 6 * Math.PI * 2, r = k === 6 ? 0 : 0.85, x = Math.cos(a) * r, z = Math.sin(a) * r, h = 0.8 + (k % 3) * 0.14;
    parts.push(new THREE.CylinderGeometry(0.04, 0.05, h, 5).translate(x, h / 2, z), new THREE.SphereGeometry(0.32, 8, 5).scale(1, 0.45, 1).translate(x, h, z)); } return mergeGeometries(parts.map(g => g.toNonIndexed())); };
  const flowerG = bedGeo(), soilG = new THREE.CylinderGeometry(1.35, 1.5, 0.25, 16), potG = new THREE.CylinderGeometry(0.62, 0.48, 0.95, 14, 1, true), paintG = new THREE.CircleGeometry(0.58, 14).rotateX(-Math.PI / 2);
  const potM = new THREE.MeshStandardMaterial({ color: 0xb9794a, roughness: 0.85, side: THREE.DoubleSide });
  const beds = BEDS.map((p, i) => { const soil = new THREE.Mesh(soilG, soilM); soil.position.copy(p).y += 0.05;
    const grey = new THREE.Mesh(flowerG, greyM), col = new THREE.Mesh(flowerG, new THREE.MeshStandardMaterial({ color: COLS[i], roughness: 0.6 })); grey.position.copy(p).y += 0.15; col.position.copy(grey.position);
    const pot = new THREE.Mesh(potG, potM); pot.position.copy(POTS[i]).y += 0.5; const paint = new THREE.Mesh(paintG, new THREE.MeshStandardMaterial({ color: COLS[i], emissive: COLS[i], emissiveIntensity: 0.35, roughness: 0.3 })); paint.position.copy(POTS[i]).y += 0.86;
    return { soil, grey, col, pot, paint, full: false, pop: 0 }; });
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.85, 16).rotateX(Math.PI), new THREE.MeshStandardMaterial({ color: 0xffd34a, emissive: 0xffa41a, emissiveIntensity: 1.5, metalness: 0.4, roughness: 0.3 }));
  // grey puffs in the sky: three pairs (each pair is one flight item)
  const puffM = new THREE.MeshStandardMaterial({ color: 0x9aa1ab, roughness: 1 }), puffG = new THREE.IcosahedronGeometry(1.25, 1).scale(1.25, 0.8, 1);
  const glowTex = glowSprite('rgba(255,255,255,1)', 'rgba(255,255,255,0)');
  const items = [0.7, 1.5, 2.3, 3.1, 3.9, 4.7].map((a, i) => { const g = new THREE.Group(), R = 41, base = V(Math.cos(a) * R, PLATEAU + 12 + (i % 3) * 2.2, Math.sin(a) * R); g.position.copy(base);
    for (const s of [-1, 1]) { const m = new THREE.Mesh(puffG, puffM); m.position.set(0, 0, s * 1.5); g.add(m); }
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffffff, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.25 })); sp.scale.setScalar(8); g.add(sp);
    g.lookAt(0, base.y, 0); return { g, base, got: false, pop: 0 }; });
  // the keepsake: a paintbrush feather (a slim quill with a coloured tip)
  const feather = new THREE.Group();
  feather.add(new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.1, 8).scale(1, 1, 0.35), new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.6 })));
  { const tip = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), new THREE.MeshStandardMaterial({ color: 0xff5fa0, emissive: 0xff5fa0, emissiveIntensity: 0.5 })); tip.position.y = -0.6; feather.add(tip); feather.rotation.z = 0.5; }
  const actors = [arrow, feather, ...beds.flatMap(b => [b.soil, b.grey, b.col, b.pot, b.paint]), ...items.map(it => it.g)];
  for (const a of actors) outdoor.add(a);
  function showAll(v) { for (const a of actors) a.visible = v; if (!v) return; arrow.visible = feather.visible = false; }
  showAll(false);

  // ---------------------------------------------------------------- state
  let sparks = 0, camGoal = CAM_WIDE, camSnap = true, pouring = false, target = 0, filled = 0, potsDone = null, lastAct = 0, helped = false, busy = false;
  const camLook = V(0, 0, 0), sums = n => n === 1 ? '5' : `${5 * (n - 1)} + 5 = ${5 * n}`;
  function pour(i) { // five colour sparks fly from Worm into the pot; the bed behind it gets its colour back
    busy = true; const b = beds[i]; lastAct = performance.now(); worm.setGlow(true); sfx.magic();
    const from = worm.headWorld().add(V(0, 1.2, 0)), to = b.paint.position.clone();
    for (let k = 0; k < 5; k++) setTimeout(() => { if (G.tick === tick) { fx.burst(from.clone().lerp(to, 0.25 + k * 0.18), COLS[i], 10, 2, 0.4, 0.7, 0.3); sfx.star(k); } }, 130 * k);
    tween(0.9, () => { }).then(() => { if (G.tick !== tick) return;
      b.full = true; b.pop = performance.now(); b.paint.visible = true; b.col.visible = true; b.grey.visible = false; filled++; busy = false; worm.setGlow(false); worm.wiggle(0.8);
      fx.burst(b.col.position.clone().setY(b.col.position.y + 1), COLS[i], 40, 4, 0.5, 1.2, 0.5); G.setCounter(sums(filled), '🎨');
      if (filled >= target && potsDone) { const r = potsDone; potsDone = null; pouring = false; setTimeout(r, ui.fast ? 0 : 700); } });
  }
  function tick(dt, time) {
    const now = performance.now();
    if (G.mode === 'flight') { // the team keeps formation behind Worm; puffs bob and pop
      const yaw = worm.root.rotation.y, c = Math.cos(yaw), s = Math.sin(yaw);
      team.forEach((d, i) => { const ox = (i ? 5.6 : -5.6), oz = -0.8, /* beside Worm, not behind him: a teammate must never fly between the camera and Worm */ oy = 0.6 + Math.sin(time * 1.8 + i * 2) * 0.35;
        d.root.position.set(worm.root.position.x + ox * c + oz * s, worm.root.position.y + oy, worm.root.position.z - ox * s + oz * c); d.root.rotation.set(0, yaw, 0); d.update(dt, time); });
      if (sparks && Math.random() < 0.5) fx.trail(worm.seatWorld(0.4 + Math.random() * 0.5), COLS[Math.floor(Math.random() * 4)], 0.3); // the freed colours trail behind the team
      items.forEach((it, i) => { if (it.got) { it.pop += dt; const k = Math.max(0, 1 - it.pop * 2.5); it.g.scale.setScalar(k * (1 + it.pop * 3)); it.g.visible = k > 0; } else it.g.position.y = it.base.y + Math.sin(time * 1.4 + i) * 0.35; });
      return;
    }
    if (G.mode !== 'paint') return;
    if (pouring && !busy && now - lastAct > 10000) { if (!helped) { helped = true; toast('worm', 'אני אמלא אחד בשבילך! ✨', 2000); } pour(filled); }   // never stuck
    beds.forEach(b => { const k = Math.max(0, 1 - (now - b.pop) / 500); b.col.scale.setScalar(1 + 0.3 * k); });
    arrow.visible = pouring && !busy; if (arrow.visible) { arrow.position.copy(beds[filled].pot.position).y += 1.5 + Math.sin(time * 4) * 0.2; arrow.rotation.y = time * 2; }
    if (feather.visible) feather.rotation.y = time * 1.6;
    cloud.root.position.y += Math.sin(time * 0.9) * 0.004;
    if (camSnap) { cam.position.copy(camGoal.pos); camLook.copy(camGoal.look); camSnap = false; }
    cam.position.lerp(camGoal.pos, Math.min(1, dt * 2)); camLook.lerp(camGoal.look, Math.min(1, dt * 2.5)); cam.lookAt(camLook);
    sun.position.copy(WORM_AT).addScaledVector(world.sunDir, 120); sun.target.position.copy(WORM_AT);
  }
  function cleanup() { pouring = false; potsDone = null; busy = false; showAll(false); cloud.root.visible = false; cloud.state.mood = null; for (const d of team) { d.root.visible = false; d.setPose('rest'); } $('#counter').hidden = true; }
  const begin = () => { G.tick = tick; G.onLeave = cleanup; G.tap = onTap; };
  function onTap(ray) { // a tap near the next pot pours into it (generous target)
    if (!pouring || busy) return false;
    if (ray.ray.distanceSqToPoint(beds[filled].pot.position) > 1.7 * 1.7) return false;
    pour(filled); return true;
  }

  function lawn(nFull) {
    G.useScene(outdoor); G.mode = 'paint'; showAll(true); G.stars.group.visible = false; for (const it of items) it.g.visible = false; for (const d of team) d.root.visible = false;
    $('#title').hidden = true; $('#hud').hidden = false; $('#counter').hidden = true; $('#arrow').hidden = true; G.showJoy(false); G.aura.material.opacity = 0;
    worm.root.position.copy(WORM_AT); worm.root.rotation.set(0, -1.2, 0); worm.setPose('rest'); worm.state.blend = 1; worm.setGlow(false); worm.lookAt(DRAKE_AT.clone().setY(DRAKE_AT.y + 1.4));
    drake.setSit(0); drake.setWalk(0); drake.root.scale.setScalar(1); drake.root.position.copy(DRAKE_AT); drake.root.rotation.set(0, Math.PI - 0.5, 0); drake.root.quaternion.setFromEuler(drake.root.rotation);
    G.king.root.position.set(0, PLATEAU + 7.0, 15.6); G.king.root.scale.setScalar(1.7);
    beds.forEach((b, i) => { b.full = i < nFull; b.paint.visible = b.col.visible = b.full; b.grey.visible = !b.full; });
    filled = nFull; pouring = false; potsDone = null; busy = false; helped = false; G.playerTurn = false; camGoal = CAM_WIDE; camSnap = true;
    cloud.root.visible = true; cloud.root.position.copy(CLOUD_FAR); cloud.root.rotation.set(0, 0, 0); cloud.root.scale.setScalar(1); cloud.state.mood = null;
  }
  async function pots(step, n, upTo) {
    G.phase = 'c6-pots' + n; target = upTo; pouring = true; helped = false; G.playerTurn = true; camGoal = CAM_WIDE; lastAct = performance.now();
    $('#counter').hidden = false; G.setCounter(filled ? sums(filled) : '0', '🎨');
    toast(null, 'גע בסיר הצבע, ווורם ימלא אותו ב-5 ניצוצות 🎨', 4500);
    await step(new Promise(res => { potsDone = res; }));
    G.playerTurn = false; hideToast(); worm.wiggle(1.4); sfx.happy();
  }
  async function riddle(step, n, kind, lines) {
    G.phase = 'c6-math' + n; camGoal = CAM_WORM;
    for (const [who, text] of lines) await step(say(who, text));
    const react = { right: () => { worm.wiggle(1.4); sfx.happy(); }, wrong: w => toast('worm', w >= 3 ? 'אני איתך, דרייק! 💚' : 'אתה יכול! אני מאמין בך 💚', 2500) };
    await step(G.math.ask({ kind, title: '🎨 חידת הצבעים', ...react }));
  }

  // ---------------------------------------------------------------- the story
  async function story(from = 'intro') {
    const step = runner(); begin();
    if (from === 'end') return ending(step, true);
    await step(fade(true));
    if (from === 'intro') {
      lawn(0); cloud.root.position.copy(CLOUD_UP);
      await step(card({ kicker: 'פרק 6', title: 'הענן הרטנן' })); await step(fade(false));
      G.phase = 'c6-intro'; G.checkpoint(6, 'intro');
      worm.wiggle(0.6);
      await step(say('drake', 'הפרחים של המלך רולנד… אפורים!'));
      await step(say('cloud', 'הממפ! הצבעים שלי עכשיו!'));
      await step(tween(2.0, k => { cloud.root.position.lerpVectors(CLOUD_UP, CLOUD_FAR, ease(k)); }));
      camGoal = CAM_WORM; worm.lookAt(CLOUD_FAR);
      await step(say('worm', 'הוא החביא אותם בעננים אפורים בשמיים. קפרי! וולקן! טסים!'));
      G.phase = 'c6-fly-ready';
      await step(new Promise(res => actions([{ id: 'btn-team', label: '🐉 טסים יחד!', cls: 'pulse', onClick: () => res() }])));
      clearActions(); worm.setGlow(true); sfx.magic(); await step(wait(500)); await step(fade(true));
    }
    if (from === 'intro' || from === 'flight') await flight(step);
    if (from !== 'pots') await step(fade(true));
    // ---- the paint pots
    lawn(0); G.checkpoint(6, 'pots'); await step(fade(false));
    await step(say('worm', 'עכשיו ממלאים את סירי הצבע: 5 ניצוצות בכל סיר!'));
    await pots(step, 1, 2);
    await riddle(step, 1, 'mul', []);
    await pots(step, 2, 4);
    await riddle(step, 2, 'add', []);
    // ---- the cloud peeks back, and looks sad
    G.phase = 'c6-sad'; $('#counter').hidden = true; camGoal = CAM_WIDE; sfx.fanfare(); worm.wiggle(2); drake.wave(2.6);
    toast('king', 'הפרחים שלי צבעוניים שוב! תודה! 👑', 3000);
    await step(tween(3.0, k => { cloud.root.position.lerpVectors(CLOUD_FAR, CLOUD_PEEK, ease(k)); }));
    camGoal = CAM_CLOUD; cloud.state.mood = 'sad';
    await step(say('cloud', 'הממפ… עכשיו שוב אין לי כלום.'));
    await step(say('drake', 'וורם, תסתכל עליו. הוא לא כועס. הוא נראה… עצוב.'));
    camGoal = CAM_WORM; worm.lookAt(CLOUD_PEEK); sfx.purr();
    await step(say('worm', 'אולי הוא פשוט רוצה חבר?'));
    camGoal = CAM_CLOUD;
    await step(tween(2.6, k => { cloud.root.position.lerpVectors(CLOUD_PEEK, CLOUD_FAR, ease(k)); }));
    // ---- the keepsake from King Roland
    camGoal = CAM_WIDE; const f0 = G.king.root.position.clone().add(V(0, 2, 0)), f1 = worm.headWorld().add(V(-1.8, 1.0, 1.6)); feather.visible = true;
    await step(tween(1.8, k => { const e = ease(k); feather.position.lerpVectors(f0, f1, e); feather.position.y += Math.sin(e * Math.PI) * 2; }));
    worm.wiggle(1.6); worm.lookAt(feather.position);
    toast('king', 'וורם, קבל נוצת מכחול בכל צבעי הקשת! 🪶', 2600); await step(wait(1600));
    G.phase = 'c6-celebrate'; for (let i = 0; i < 3; i++) setTimeout(() => { if (G.tick === tick) fx.confetti(ground(0, 28, 4), 60); }, i * 500);
    await step(wait(1500));
    const v = await step(card({ kicker: '🎨 🎨 🎨', title: 'כל הכבוד!', text: 'החזרתם את הצבעים לפרחים, וספרתם בחמישיות עד 20! וורם קיבל מזכרת: נוצת מכחול 🪶',
      buttons: [{ label: '🔁 עוד פעם?', value: 'again' }, { label: 'סיום הפרק ◀', value: 'end', cls: 'green' }] }));
    if (v === 'again') { cleanup(); return story('flight'); }
    return ending(step, false);
  }
  // ---- Activity A: the team flight (rail-guided: passing a pair on the rail always pops it)
  const LINES = ['שני ניצוצות! 🎨', 'קפרי, קרן שמש! ☀️', 'וולקן, כדור אש! 🔥', 'חצי דרך! 🎉', 'עוד זוג אחד!', ''];
  function onPuff(i, s) {
    const n = fl.got; sfx.star(n - 1); for (const c of [COLS[i % 4], COLS[(i + 1) % 4]]) fx.burst(s.g.position.clone(), c, 30, 6, 0.6, 1.2, -1.5); worm.wiggle(0.8); if (n % 2) G.glance(1.0, 0.8);
    // power move: a teammate pops this pair (sunbeam sparks or a little fireball flash from the teammate to the puffs)
    const mate = team[i % 2], from = mate.headWorld(), col = i % 2 ? 0xff8a2a : 0xffe27a; mate.wiggle(1); if (i % 2) sfx.hic(); else sfx.magic();
    for (let k = 1; k <= 5; k++) fx.burst(from.clone().lerp(s.g.position, k / 5), col, 6, 1.5, 0.45, 0.6, 0);
    sparks = n * 2; G.setCounter(n === 1 ? '2' : `${n} × 2 = ${2 * n}`, '🎨');
    if (LINES[n - 1]) toast('worm', LINES[n - 1], 1900);
  }
  async function flight(step) {
    showAll(false); cloud.root.visible = false; G.stars.group.visible = false;
    sparks = 0; for (const it of items) { it.got = false; it.pop = 0; it.g.visible = true; it.g.scale.setScalar(1); it.g.position.copy(it.base); }
    for (const d of team) { outdoor.add(d.root); d.root.visible = true; d.setPose('fly'); d.state.blend = 1; d.lookAt(null); }
    const P = (a, y) => V(Math.cos(a) * 41, PLATEAU + y, Math.sin(a) * 41);
    G.startFlight({ items, lead: [P(-0.2, 11), P(0.25, 12)], exit: [P(5.2, 13), P(5.7, 13), P(6.1, 12)], speed: 9, camSide: -1, onCollect: onPuff });
    G.phase = 'c6-flight'; G.checkpoint(6, 'flight'); G.setCounter('0', '🎨');
    await step(fade(false)); G.showJoy(true); worm.wiggle(1); G.glance(1.4);
    toast('worm', 'בכל זוג עננים מסתתרים 2 ניצוצות צבע. טסים סביב כל הטירה!', 3600);
    await step(G.waitFor(() => fl.got >= items.length));
    G.phase = 'c6-flight-done'; fl.done = true; G.showJoy(false); sfx.fanfare(); worm.wiggle(2); G.glance(1.8);
    toast('worm', '6 זוגות של 2: שנים־עשר ניצוצות! תודה, צוות!', 2800);
    await step(wait(2800));
  }
  async function ending(step, direct) {
    if (direct) { await step(fade(true)); lawn(4); await step(fade(false)); }
    G.phase = 'c6-end'; $('#counter').hidden = true; G.markDone(6);
    const v = await step(card({ kicker: 'סוף פרק 6 – הענן הרטנן', title: 'המשך יבוא…', text: 'בפרק הבא: כל הצוות יוצא למסע אל הר הקשת, הבית של הענן הרטנן! 🌈',
      buttons: [{ label: '🔁 עוד פעם?', value: 'again' }, { label: '🏠 לתפריט', value: 'home', cls: 'green' }] }));
    await step(fade(true));
    if (v === 'again') { cleanup(); return story('intro'); }
    G.enterTitle(); await fade(false);
  }

  return {
    start: story, showAll,
    nextPotPos() { return pouring && !busy ? beds[filled].pot.position.clone() : null; },
    debug: () => ({ tweens: G.tweenCount(), pouring, filled, target, busy, got: fl.got }),
  };
}
