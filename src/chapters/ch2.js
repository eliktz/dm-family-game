// Chapter 2 "הביצה המסתורית" (see STORY.md): a glowing blue egg rolls into the cave and Worm curls
// around it → river glide (water-drop bubbles in pairs: 2, 4, 6, 8, 10) → warm the egg (missing
// addend 2 + ? = 5, then tap the warm stones into place) → the egg hatches into a tiny water dragon →
// Bo arrives with Shu, his water dragon → celebration → misty teaser. Keepsake: a blue water drop.
// All actors are created once at start-up (hidden) so nothing is compiled or lit at runtime.
import { createWorm } from '../worm.js';
import { makeBo } from '../people.js';
import { buildBubbles, riverZ, RIVER_Y } from '../outdoor.js';
import { glowSprite, noiseTexture } from '../tex.js';

const WATER = { back: 0x1d6f9c, side: 0x2c94b8, belly: 0xbfe6ea, tail: 0x2c94b8, spike: 0x7fdcd2, head: 0x2686ab, muzzle: 0x4bb0c6, fin: 0x6fd2cc, horn: 0xcfeef0, iris: 0x1a5f86, sheen: 0xbff4ff };
const BABY = { back: 0x3fa9cf, side: 0x5cc3dc, belly: 0xd6eef0, tail: 0x5cc3dc, spike: 0xa5ece0, head: 0x4fb6d6, muzzle: 0x7fd0e0, fin: 0x9fe6dc, horn: 0xd6eef0, iris: 0x1f6f96, sheen: 0xd0f8ff };

export function chapter2(G) {
  const { THREE, cam, fx, worm, drake, griffith, cave, stars, marker, outdoor, caveScene, GATE_POS, heightAt, sun, world, ui,
    say, toast, hideToast, actions, clearActions, showJoy, card, fade, sfx, runner, wait, waitFor, fl } = G;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const $ = s => document.querySelector(s);
  const ss = THREE.MathUtils.smoothstep;

  // ---------------------------------------------------------------- stage layout (cave, world space)
  const WORM_POS = V(1.5, 0, -3.5);                 // Worm's head; his 'curl' pose wraps around EGG
  const EGG = V(-2.1, 0.86, -3.5);
  const DRAKE_POS = V(1.9, 0, 0.6), GRIFF_POS = V(-6.4, 0, -3.4);
  const SLOTS = [-110, -65, -20, 25, 70].map(d => { const a = d * Math.PI / 180; return V(EGG.x + Math.sin(a) * 1.5, 0.22, EGG.z + Math.cos(a) * 1.5); });
  const LOOSE = [V(-3.9, 0.22, 1.5), V(-2.2, 0.22, 2.0), V(-0.5, 0.22, 1.6)];
  const BO_POS = V(4.3, 0, -0.4), SHU_POS = V(6.4, 0, -2.6);
  const NEAR_EGG = V(-0.9, 0.7, -1.2);              // where Worm looks to watch the egg without turning his face from the kid

  // ---------------------------------------------------------------- actors (hidden until the chapter runs)
  const bubbles = buildBubbles(5); bubbles.group.visible = false; outdoor.add(bubbles.group);
  // egg: two shell halves so it can open
  const eggPt = th => new THREE.Vector2(Math.max(0.001, 0.64 * Math.sin(th) * (1 - 0.17 * Math.cos(th))), 0.86 * Math.cos(th));
  const half = (a, b) => { const pts = []; for (let i = 0; i <= 14; i++) pts.push(eggPt(b + (a - b) * i / 14)); return new THREE.LatheGeometry(pts, 28); };
  const CUT = Math.PI * 0.46;
  const eggTex = noiseTexture(256, [96, 168, 232], 70, 9, 260); eggTex.colorSpace = THREE.SRGBColorSpace; eggTex.repeat.set(2, 1);
  const eggM = new THREE.MeshPhysicalMaterial({ map: eggTex, color: 0xd6d6d6, emissive: 0x1e6fd0, emissiveIntensity: 0.45, roughness: 0.25, clearcoat: 1, side: THREE.DoubleSide });
  const egg = new THREE.Group(), eggTop = new THREE.Mesh(half(0, CUT), eggM), eggBottom = new THREE.Mesh(half(CUT, Math.PI), eggM);
  // jagged break line: the crack drawn on the whole egg and the rims of the shell pieces share it, so they fit
  const TEETH = 9, rim = phi => CUT + 0.14 * (Math.abs((((phi * TEETH / (Math.PI * 2)) % 1) + 1) % 1 - 0.5) * 4 - 1);
  function shellGeo(p0, p1, thA, thB, nP, nT = 8) { // a patch of the egg surface between two longitudes and two (per-longitude) latitudes
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= nP; i++) { const phi = p0 + (p1 - p0) * i / nP, a = thA(phi), b = thB(phi);
      for (let j = 0; j <= nT; j++) { const th = a + (b - a) * j / nT, p = eggPt(th); pos.push(p.x * Math.sin(phi), p.y, p.x * Math.cos(phi)); uv.push(phi / (Math.PI * 2), 1 - th / Math.PI); } }
    for (let i = 0; i < nP; i++) for (let j = 0; j < nT; j++) { const a = i * (nT + 1) + j, b = a + nT + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
  }
  const crack = new THREE.Mesh(shellGeo(0, Math.PI * 2, p => rim(p) - 0.022, p => rim(p) + 0.022, TEETH * 4, 1).scale(1.012, 1.012, 1.012), new THREE.MeshStandardMaterial({ color: 0x143a5c, roughness: 0.8, side: THREE.DoubleSide }));
  // the broken shell: two jagged half-bowls that tip outward and a cap that lands upside down; all stay on the floor
  const shells = new THREE.Group(), innerM = new THREE.MeshStandardMaterial({ color: 0xd4dcdf, roughness: 0.7, side: THREE.DoubleSide });
  const shard = (geo, pivotY) => { const g = new THREE.Group(), piv = new THREE.Group(), hold = new THREE.Group(); piv.position.y = pivotY; hold.position.y = -pivotY;
    const outer = new THREE.Mesh(geo, eggM), inner = new THREE.Mesh(geo, innerM); inner.scale.setScalar(0.965); outer.castShadow = true; hold.add(outer, inner); piv.add(hold); g.add(piv); shells.add(g); return { g, piv }; };
  const shR = shard(shellGeo(0, Math.PI, rim, () => Math.PI - 0.001, TEETH * 2), -0.86), shL = shard(shellGeo(Math.PI, Math.PI * 2, rim, () => Math.PI - 0.001, TEETH * 2), -0.86);
  const shCap = shard(shellGeo(0, Math.PI * 2, () => 0.001, rim, TEETH * 4, 6), 0);
  const Z_AXIS = new THREE.Vector3(0, 0, 1);
  function setShells(e) { // 0 = closed egg … 1 = lying open on the floor
    shR.piv.quaternion.setFromAxisAngle(Z_AXIS, -1.32 * e); shR.g.position.set(1.05 * e, 0, -0.25 * e);
    shL.piv.quaternion.setFromAxisAngle(Z_AXIS, 1.32 * e); shL.g.position.set(-1.05 * e, 0, -0.25 * e);
    shCap.g.position.set(-0.5 * e, Math.sin(e * Math.PI) * 1.7, -1.7 * e); shCap.piv.rotation.set(Math.PI * e, 0, 0.5 * e);
  }
  shells.visible = false; caveScene.add(shells);
  const eggGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowSprite('rgba(140,205,255,1)', 'rgba(60,140,255,0)'), blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.4 }));
  eggGlow.scale.setScalar(4.2);
  eggTop.castShadow = eggBottom.castShadow = true; egg.add(eggBottom, eggTop, crack, eggGlow); caveScene.add(egg);
  // warm stones
  const stoneG = new THREE.DodecahedronGeometry(0.36, 1).scale(1, 0.68, 0.9);
  const stoneM = new THREE.MeshStandardMaterial({ color: 0x8a4a2a, roughness: 0.75, emissive: 0xff5a14, emissiveIntensity: 0.4 });
  const stones = Array.from({ length: 5 }, (_, i) => { const m = new THREE.Mesh(stoneG, stoneM); m.rotation.y = i * 1.3; m.castShadow = true; caveScene.add(m); return { m, placed: false, moving: false }; });
  // the baby, Bo and Shu
  const baby = createWorm({ name: 'babyDragon', colors: BABY, length: 6.2, headScale: 1.55, finScale: 1.5, horns: false, dorsal: 'fin', lod: 0.5, light: false, shadow: false, simple: true });
  const BABY_S = 0.48, BABY_FRONT = V(0.2, 0, -0.6); // she ends up in front of her shells, facing the kid
  baby.root.scale.setScalar(BABY_S);
  const shu = createWorm({ name: 'waterDragon', colors: WATER, finScale: 1.7, horns: false, dorsal: 'fin', lod: 0.6, light: false, shadow: 'body', simple: true });
  shu.root.scale.setScalar(0.8);
  const bo = makeBo();
  caveScene.add(baby.root, shu.root, bo.root);
  // a first peek at the Grumble Cloud for the teaser: a small grey puff with big round eyes (cute, never menacing)
  const cloud = new THREE.Group(), puffM = new THREE.MeshStandardMaterial({ color: 0x9aa1ab, roughness: 1 });
  for (const [x, y, z, r] of [[0, 0, 0, 2.2], [-2.2, -0.3, 0.2, 1.6], [2.3, -0.2, 0.1, 1.7], [-1, 1.1, -0.2, 1.5], [1.1, 1.2, -0.1, 1.6]]) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 2), puffM); m.position.set(x, y, z); m.scale.y = 0.8; cloud.add(m); }
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), new THREE.MeshStandardMaterial({ color: 0xd9d9d6, roughness: 0.3 })); eye.position.set(sx * 0.75, 0.25, 1.95); cloud.add(eye);
    const pup = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), new THREE.MeshStandardMaterial({ color: 0x20242c, roughness: 0.2 })); pup.position.set(sx * 0.75, 0.2, 2.3); cloud.add(pup);
  }
  cloud.visible = false; outdoor.add(cloud);
  const actors = [egg, shells, baby.root, shu.root, bo.root, cloud, ...stones.map(s => s.m)];
  function showAll(v) { for (const a of actors) a.visible = v; bubbles.group.visible = v; if (!v) crack.visible = false; }
  // shadows only from the main characters and the egg (iPad/iPhone budget)
  for (const o of [bo.root, shu.root, shells, ...stones.map(s => s.m)]) o.traverse(m => { m.castShadow = false; });
  showAll(false);

  const tween = G.tween; // wall-clock story animations with a deadline (see main.js)
  const ease = k => k * k * (3 - 2 * k);
  let placed = 0, placing = false, warm = 0, eggShake = 0, mist = false, bg0 = null;

  function tick(dt, time) {
    if (G.mode === 'cave') {
      if (baby.root.visible) baby.update(dt, time);
      if (shu.root.visible) shu.update(dt, time);
      if (bo.root.visible) bo.update(dt, time);
      eggM.emissiveIntensity = 0.45 + warm * 0.5 + 0.12 * Math.sin(time * 3); eggGlow.material.opacity = 0.35 + warm * 0.3 + 0.08 * Math.sin(time * 3);
      egg.rotation.z = eggShake * Math.sin(time * 26) * 0.09; egg.position.y = EGG.y + eggShake * Math.abs(Math.sin(time * 13)) * 0.06;
      stoneM.emissiveIntensity = 0.38 + 0.16 * Math.sin(time * 4);
      const next = placing ? stones.find(s => !s.placed && !s.moving) : null;
      marker.visible = !!next;
      if (next) { marker.position.copy(next.m.position).add(V(0, 0.95 + Math.sin(time * 4) * 0.15, 0)); marker.scale.setScalar(0.6); marker.rotation.y = time * 2; }
    } else if (mist) {
      const x = 5 + Math.sin(time * 0.12) * 2.5, z = riverZ(0) + 30;
      cam.position.set(x, heightAt(x, z) + 5.2, z); cam.lookAt(0, 3.2, riverZ(0) - 4);
      cloud.position.set(1 + Math.sin(time * 0.5) * 2, 11.6 + Math.sin(time * 0.9) * 0.4, riverZ(0) - 3); cloud.rotation.y = Math.sin(time * 0.6) * 0.25;
      sun.position.copy(worm.root.position).addScaledVector(world.sunDir, 120); sun.target.position.copy(worm.root.position);
    }
  }
  function cleanup() {  // leaving the chapter (home, another chapter): put the shared world back
    placing = false; mist = false; warm = 0; eggShake = 0; showAll(false); stars.group.visible = false;
    if (bg0) { outdoor.background = bg0; bg0 = null; }
    griffith.root.position.set(7.2, 0, -3.5);
  }
  const begin = () => { G.tick = tick; G.onLeave = cleanup; G.tap = onTap; };

  // ---------------------------------------------------------------- cave staging
  function stageCave(stage) { // 'intro' | 'warm' | 'hatch'
    G.setupCave(); showAll(false); bubbles.group.visible = false;
    worm.root.position.copy(WORM_POS); worm.root.rotation.set(0, 0, 0);
    drake.root.position.copy(DRAKE_POS); drake.root.rotation.y = Math.atan2(EGG.x - DRAKE_POS.x, EGG.z - DRAKE_POS.z);
    griffith.root.position.copy(GRIFF_POS);
    cave.openGate(); placed = 0; placing = false; warm = 0; eggShake = 0;
    egg.rotation.set(0, 0, 0); eggTop.visible = eggBottom.visible = eggGlow.visible = true; crack.visible = false; shells.visible = false; shells.position.copy(EGG); setShells(0); baby.root.scale.setScalar(BABY_S);
    if (stage === 'intro') { worm.setPose('rest'); worm.state.blend = 1; worm.lookAt(drake.root.position.clone().setY(1.4)); }
    else {
      worm.setPose('curl'); worm.state.blend = 1; worm.lookAt(NEAR_EGG); egg.visible = true; egg.position.copy(EGG);
      const n = stage === 'hatch' ? 5 : 2; placed = n; warm = n / 5;
      stones.forEach((s, i) => { s.m.visible = true; s.placed = i < n; s.moving = false; s.m.position.copy(i < n ? SLOTS[i] : LOOSE[i - 2]); });
    }
  }
  const camEgg = () => G.hd ? { pos: V(-1.4, 6.8, 8.2), look: V(-1.2, 0.5, -1.4) } : { pos: V(-1.6, 5.8, 8.6), look: V(-1.1, 1.0, -1.9) };

  // ---------------------------------------------------------------- the story
  async function story(from = 'intro') {
    const step = runner(); begin();
    if (from === 'intro') {
      await step(fade(true)); stageCave('intro');
      await step(card({ kicker: 'פרק 2', title: 'הביצה המסתורית' })); await step(fade(false));
      G.phase = 'c2-intro'; G.checkpoint(2, 'intro');
      G.camGoal = { pos: V(0.5, 4.6, 9), look: V(1, 1.6, -4) };
      worm.wiggle(1); sfx.purr();
      await step(say('worm', 'בוקר טוב, דרייק! שומע? משהו מתגלגל למערה!'));
      
      // ---- the egg rolls in from the gate and stops at Worm's nose
      G.phase = 'c2-egg';
      G.camGoal = { pos: V(-1.5, 6.2, 9.5), look: V(2, 1, -5) };
      egg.visible = true; sfx.whoosh();
      const path = new THREE.CatmullRomCurve3([V(GATE_POS.x - 0.3, EGG.y, GATE_POS.z + 1.6), V(5.6, EGG.y, -8), V(3.9, EGG.y, -1.6), V(0.8, EGG.y, -1.3), EGG.clone()]);
      await step(tween(3.4, k => { const e = ease(k); path.getPointAt(e, egg.position); egg.rotation.set(e * 14, 0, Math.sin(e * 9) * 0.25 * (1 - e)); if (Math.random() < 0.3) fx.trail(egg.position, 0x8fd0ff, 0.3); }));
      egg.rotation.set(0, 0, 0); fx.burst(EGG, 0x9fd8ff, 30, 2.5, 0.4, 1.2, 0.3); sfx.chime();
      
      worm.setPose('curl'); worm.lookAt(EGG); worm.wiggle(0.8); sfx.purr();
      G.camGoal = G.engine.viewShift ? { pos: V(-2.6, 3.8, 6.4), look: V(-1.4, 1.0, -3.2) } : { pos: V(-1.9, 4.2, 7.6), look: V(-0.5, 1.0, -3.0) }; // wider on tablets so Drake is fully in frame
      await step(wait(900));
      
      await step(say('griffith', 'ביצה של דרקון מים! היא אוהבת טיפות מהנהר. טוסו!'));
      
      worm.lookAt(drake.root.position.clone().setY(1.4)); worm.wiggle(1.2);
      
      G.phase = 'c2-ready';
      await step(new Promise(res => actions([{ id: 'btn-river', label: '💧 אל הנהר!', cls: 'pulse', onClick: () => res() }])));
      clearActions(); worm.setGlow(true); sfx.magic(); fx.burst(worm.headWorld(), 0x7dffb0, 60, 5, 0.5, 1.4, 0);
      await step(wait(600)); await step(fade(true));
    }
    if (from === 'intro' || from === 'glide') await glide(step);
    if (from !== 'hatch' && from !== 'end') await warmEgg(step, from === 'warm');
    if (from !== 'end') await hatch(step, from === 'hatch');
    return ending(step);
  }

  // ---- Activity A: river glide, bubbles in pairs
  const PAIR_LINES = ['שתי טיפות! 💧💧', 'ועוד שתיים – ארבע!', 'שש טיפות! אתה מעולה!', 'שמונה! רק עוד זוג אחד!', ''];
  const N = bubbles.list.length;
  function onPair(i, s) {
    const n = fl.got; sfx.star(n - 1); fx.burst(s.g.position.clone(), 0x9fdcff, 46, 6, 0.6, 1.2, -1.5); worm.wiggle(0.8); G.glance(1.0, 0.8);
    G.setCounter(n === 1 ? '2' : `${2 * (n - 1)} + 2 = ${2 * n}`, '💧');
    if (n < N && PAIR_LINES[n - 1]) toast('worm', PAIR_LINES[n - 1], 1900);
  }
  async function glide(step) {
    showAll(false); stars.group.visible = false; bubbles.group.visible = true; bubbles.reset();
    const rp = x => V(x, RIVER_Y + 4.1, riverZ(x)); // low along the river: a lead-in, the 5 pairs, then on downstream
    G.startFlight({ items: bubbles.list, lead: [rp(-96), rp(-80)], exit: [rp(92), rp(120), rp(150)], speed: 8, corridor: [5, 2.5], onCollect: onPair });
    G.phase = 'c2-glide'; G.checkpoint(2, 'glide'); G.setCounter('0', '💧');
    await step(fade(false)); showJoy(true);
    worm.wiggle(1); G.glance(1.4);
    toast('worm', 'הנה הנהר! הטיפות באות בזוגות – נספור בקפיצות של 2!', 3800);
    await step(wait(3900));
    toast(null, 'וורם מרחף לבד! הג׳ויסטיק מזיז אותו קצת לצדדים 💧', 3600);
    await step(waitFor(() => fl.got >= N));
    G.phase = 'c2-glide-done'; fl.done = true; showJoy(false);
    sfx.fanfare(); worm.wiggle(2); G.glance(1.8);
    toast('worm', 'עשר טיפות! כל הכבוד, דרייק!', 2600);
    await step(wait(2600)); await step(fade(true));
    bubbles.group.visible = false;
  }

  // ---- Activity B: warm the egg (missing addend, then tap the stones into place)
  function onTap(ray) {
    if (!placing) return false;
    const s = stones.filter(x => !x.placed && !x.moving).map(x => ({ x, d: ray.ray.distanceSqToPoint(x.m.position) })).sort((a, b) => a.d - b.d)[0];
    if (!s || s.d > 1.0) return false;
    placeStone(s.x); return true;
  }
  function placeStone(s) {
    s.moving = true; const from = s.m.position.clone(), to = SLOTS[placed + stones.filter(x => x.moving).length - 1];
    worm.setGlow(true); sfx.magic(); // Worm lifts it with his mind power
    tween(1.1, k => { const e = ease(k); s.m.position.lerpVectors(from, to, e); s.m.position.y += Math.sin(e * Math.PI) * 2.0; s.m.rotation.y += 0.12; if (Math.random() < 0.5) fx.trail(s.m.position, 0x7dffb0, 0.3); })
      .then(() => {
        if (G.tick !== tick) return;
        s.moving = false; s.placed = true; placed++; warm = placed / 5; sfx.star(placed); fx.burst(to.clone().setY(0.5), 0xffb060, 20, 2.2, 0.35, 0.9, 0.5);
        G.setCounter(`${placed} / 5`, '🔥'); worm.wiggle(0.7);
        if (!stones.some(x => x.moving)) worm.setGlow(false);
        if (placed < 5) toast('worm', placed === 3 ? 'שלוש אבנים! עוד קצת!' : 'ארבע! רק עוד אחת!', 1700);
      });
  }
  async function warmEgg(step, direct) {
    stageCave('warm'); G.camGoal = camEgg(); G.phase = 'c2-warm'; G.checkpoint(2, 'warm');
    if (!direct) { await step(fade(false)); fx.burst(EGG, 0x9fdcff, 50, 3, 0.4, 1.4, 0.5); sfx.chime(); }
    await step(say('griffith', 'עכשיו הביצה צריכה חום: 5 אבנים חמות. וורם כבר הניח 2!'));
    
    worm.setGlow(true); worm.wiggle(0.8);
    
    worm.setGlow(false);
    G.phase = 'c2-math';
    // two warm-stone riddles: a missing number, then a subtraction or a multiplication (sizes follow the riddle level)
    const react = { right: () => { worm.wiggle(1.4); sfx.happy(); }, wrong: n => toast('worm', n >= 3 ? 'אני איתך, דרייק! 💚' : 'אתה יכול! אני מאמין בך 💚', 2500) };
    await step(G.math.ask({ kind: 'missing', title: '🔥 חידת האבנים החמות', ...react }));
    await step(wait(300));
    await step(G.math.ask({ kind: Math.random() < 0.5 ? 'sub' : 'mul', title: '🔥 ועוד חידה חמה!', ...react }));
    G.phase = 'c2-place'; placing = true; G.playerTurn = true;
    $('#counter').hidden = false; G.setCounter('2 / 5', '🔥');
    toast(null, 'גע באבנים החמות, ווורם יניח אותן ליד הביצה 👆', 5000);
    await step(waitFor(() => placed >= 5));
    placing = false; G.playerTurn = false; marker.visible = false; hideToast();
    await step(wait(500));
  }

  // ---- hatch + Bo arrives
  async function hatch(step, direct) {
    if (direct) { stageCave('hatch'); }
    G.camGoal = { pos: V(-2.3, 3.6, 5.6), look: V(-1.8, 0.9, -3.0) }; G.phase = 'c2-hatch'; G.checkpoint(2, 'hatch'); $('#counter').hidden = true;
    worm.lookAt(NEAR_EGG); worm.wiggle(1);
    
    crack.visible = true; sfx.munch();
    await step(tween(1.8, k => { eggShake = k; }));
    eggShake = 0; sfx.chime(); sfx.happy();
    fx.burst(EGG.clone().add(V(0, 0.5, 0)), 0x9fdcff, 70, 5, 0.5, 1.5, -1); fx.confetti(EGG.clone().add(V(0, 0.6, 0)), 30);
    // the shell breaks into jagged pieces that tip outward; the baby uncurls between them (coil centre = egg centre)
    eggTop.visible = eggBottom.visible = crack.visible = eggGlow.visible = false; shells.visible = true;
    baby.root.visible = true; baby.root.rotation.set(0, 0, 0); baby.setPose('coil'); baby.state.blend = 1; baby.lookAt(cam.position);
    worm.wiggle(1.8); worm.lookAt(BABY_FRONT.clone().setY(0.9));
    await step(tween(0.9, k => { const e = ease(k), sc = BABY_S * (0.35 + 0.65 * e); setShells(e); baby.root.scale.setScalar(sc); baby.root.position.set(EGG.x + 2.9 * sc, 0.05, EGG.z); }));
    // she hops out in front of her shells and the camera comes close so the kid sees her face
    const h0 = baby.root.position.clone();
    const front = G.hdBaby ? V(0.5, 0, 0.5) : BABY_FRONT;
    if (G.hdBaby) G.camGoal = { pos: V(-0.5, 1.0, 3.3), look: V(0.45, 0.45, 0.4) }; // the HD baby is tiny: she hops further out and the camera gets down to her level
    else G.camGoal = { pos: V(0.9, 2.0, 4.4), look: V(-0.1, 1.0, -0.8) };
    await step(tween(0.8, k => { const e = ease(k); baby.root.position.lerpVectors(h0, front, e); baby.root.position.y += Math.sin(e * Math.PI) * 1.0; }));
    G.phase = 'c2-baby';
    baby.wiggle(1.6); baby.state.blink = 1; sfx.squeak(); fx.hearts3(baby.headWorld().add(V(0, G.hdBaby ? 0.35 : 0.7, 0)), 5);
    await step(wait(900)); baby.state.blink = 1; sfx.squeak();
    await step(say('baby', 'פיפ! פיפ! הי הי הי!'));
    G.camGoal = G.hdBaby ? { pos: V(0.9, 2.2, 4.9), look: V(-0.2, 0.8, -0.9) } : { pos: V(-1.0, 3.2, 5.8), look: V(-1.0, 1.0, -2.0) };
    
    baby.lookAt(worm.headWorld()); baby.wiggle(1.5); worm.wiggle(1.2); sfx.purr();
    
    await step(say('drake', 'היא מבעבעת כמו בועה… נקרא לה בועה!'));
    // ---- Bo and Shu come in through the gate
    G.phase = 'c2-bo';
    G.camGoal = G.hdBaby ? { pos: V(2.4, 2.9, 7.0), look: V(3.1, 1.2, -1.6) } : { pos: V(-5.2, 4.2, 7.6), look: V(2.2, 1.1, -3.2) };
    const gate = V(GATE_POS.x - 0.4, 0, GATE_POS.z + 1.2);
    bo.root.visible = shu.root.visible = true; shu.setPose('rest'); shu.state.blend = 1; bo.setWalk(1);
    const faceTo = (o, p, t) => { o.rotation.y = Math.atan2(t.x - p.x, t.z - p.z); };
    const boPath = new THREE.CatmullRomCurve3([gate.clone().add(V(-0.8, 0, 2)), V(5.4, 0, -7), BO_POS.clone()]);
    const shuPath = new THREE.CatmullRomCurve3([gate.clone(), V(6.6, 0, -9.5), SHU_POS.clone()]);
    sfx.whoosh();
    await step(tween(3.0, k => {
      const e = ease(k), p = boPath.getPointAt(e), q = shuPath.getPointAt(Math.max(0, e - 0.06) / 0.94);
      faceTo(bo.root, bo.root.position, p); bo.root.position.copy(p);
      faceTo(shu.root, shu.root.position, q); shu.root.position.copy(q);
    }));
    bo.setWalk(0); faceTo(bo.root, BO_POS, EGG); faceTo(shu.root, SHU_POS, EGG); shu.lookAt(EGG.clone().setY(0.6)); bo.wave(2);
    worm.lookAt(BO_POS.clone().setY(1.4));
    await step(say('bo', 'שלום! אני בו, וזאת שו. חיפשנו את הביצה בכל הנהר!'));
    shu.wiggle(1.5); baby.lookAt(shu.headWorld()); baby.wiggle(2); sfx.happy();
    
    await step(say('griffith', 'ברוך הבא, בו! אתה מאסטר דרקונים חדש בטירה.'));
    bo.wave(2);
    
    // the baby hops over to her new friend
    const b0 = baby.root.position.clone(), b1 = V(0.9, 0, -1.7);
    baby.lookAt(worm.headWorld()); worm.lookAt(b1.clone().setY(0.4));
    await step(tween(1.2, k => { const e = ease(k); baby.root.position.lerpVectors(b0, b1, e); baby.root.position.y += Math.sin(e * Math.PI) * 1.2; }));
    baby.wiggle(2.5); worm.wiggle(2); sfx.purr(); fx.hearts3(b1.clone().setY(1.2), 8);
    toast('worm', 'בועה ואני כבר חברים טובים! 💚', 2400); await step(tween(2.2, () => { }));
    
    // ---- celebration
    G.phase = 'c2-celebrate';
    sfx.fanfare(); worm.wiggle(2.5); shu.wiggle(2.5); baby.wiggle(2.5); bo.wave(3); drake.wave(3);
    for (let i = 0; i < 3; i++) setTimeout(() => { if (G.tick === tick) fx.confetti(V(0, 3.2, -2), 60); }, i * 500);
    await step(wait(2200));
    const v = await step(card({ kicker: '💧 💧 💧 💧 💧', title: 'כל הכבוד!', text: 'עזרת לביצה לבקוע, ופגשת את בו, את שו ואת בועה! וורם קיבל מזכרת: טיפת מים כחולה 💧',
      buttons: [{ label: '🔁 עוד פעם?', value: 'again' }, { label: 'סיום הפרק ◀', value: 'end', cls: 'green' }] }));
    if (v === 'again') { await step(fade(true)); return story('glide'); }
  }

  // ---- teaser: grey mist over the river
  async function ending(step) {
    await step(fade(true));
    G.markDone(2);
    showAll(false); G.useScene(outdoor); G.mode = 'mist'; G.phase = 'c2-end'; mist = true; G.camGoal = null;
    $('#counter').hidden = true; showJoy(false); $('#arrow').hidden = true; G.aura.material.opacity = 0;
    const z = riverZ(0) + 16; worm.root.position.set(-1, heightAt(-1, z), z); worm.root.rotation.set(0, Math.PI - 0.5, 0); worm.setPose('coil'); worm.state.blend = 1; worm.setGlow(false); worm.lookAt(V(-3, 8, riverZ(0) - 3));
    drake.setSit(0); drake.root.scale.setScalar(1); drake.root.position.set(4.2, heightAt(4.2, z + 1), z + 1); drake.root.rotation.set(0, Math.PI + 0.2, 0);
    cloud.visible = true;
    bg0 = outdoor.background; outdoor.background = new THREE.Color(0x9aa3ad);
    outdoor.fog.color.set(0xa3abb5); outdoor.fog.near = 14; outdoor.fog.far = 95;
    await step(fade(false));
    const v = await step(card({ cls: 'mist', kicker: 'סוף פרק 2 – הביצה המסתורית', title: 'המשך יבוא…', text: 'פתאום הנהר מתמלא ערפל אפור… מישהו קטן ורטנן מסתתר בענן… ☁️',
      buttons: [{ label: '🔁 עוד פעם?', value: 'again' }, { label: '🏠 לתפריט', value: 'home', cls: 'green' }] }));
    await step(fade(true));
    if (v === 'again') { cleanup(); G.resetOutdoorLook(); return story('intro'); }
    G.enterTitle(); await fade(false);
  }

  return {
    start: story, bubbles, showAll,
    update(dt, time, nextIdx) { if (bubbles.group.visible) bubbles.update(dt, time, nextIdx); },
    nextStonePos() { const s = placing && stones.find(x => !x.placed && !x.moving); return s ? s.m.position.clone() : null; },
    modelTargets: { bo, waterDragon: shu, babyDragon: baby },
    debug: () => ({ tweens: G.tweenCount(), placed, placing, isTick: G.tick === tick }), // test diagnostics only
  };
}
