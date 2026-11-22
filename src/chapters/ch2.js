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
    say, toast, hideToast, actions, clearActions, showJoy, riddleMissing, card, fade, sfx, runner, wait, waitFor, fl } = G;
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
  const crack = new THREE.Mesh(new THREE.TorusGeometry(eggPt(CUT).x + 0.004, 0.018, 6, 40).rotateX(Math.PI / 2).translate(0, eggPt(CUT).y, 0), new THREE.MeshStandardMaterial({ color: 0x143a5c, roughness: 0.8 }));
  const eggGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowSprite('rgba(140,205,255,1)', 'rgba(60,140,255,0)'), blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.4 }));
  eggGlow.scale.setScalar(4.2);
  eggTop.castShadow = eggBottom.castShadow = true; egg.add(eggBottom, eggTop, crack, eggGlow); caveScene.add(egg);
  // warm stones
  const stoneG = new THREE.DodecahedronGeometry(0.36, 1).scale(1, 0.68, 0.9);
  const stoneM = new THREE.MeshStandardMaterial({ color: 0x8a4a2a, roughness: 0.75, emissive: 0xff5a14, emissiveIntensity: 0.4 });
  const stones = Array.from({ length: 5 }, (_, i) => { const m = new THREE.Mesh(stoneG, stoneM); m.rotation.y = i * 1.3; m.castShadow = true; caveScene.add(m); return { m, placed: false, moving: false }; });
  // the baby, Bo and Shu
  const baby = createWorm({ name: 'babyDragon', colors: BABY, length: 6.2, headScale: 1.55, finScale: 1.5, horns: false, dorsal: 'fin', lod: 0.5, light: false, shadow: false, simple: true });
  baby.root.scale.setScalar(0.24);
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
  const actors = [egg, baby.root, shu.root, bo.root, cloud, ...stones.map(s => s.m)];
  function showAll(v) { for (const a of actors) a.visible = v; bubbles.group.visible = v; if (!v) { eggTop.visible = true; crack.visible = false; } }
  showAll(false);

  // ---------------------------------------------------------------- tiny tweens (driven by the frame tick, so they pause with the tab)
  let tweens = [];
  const tween = (dur, fn) => new Promise(res => { fn(0); tweens.push({ t: 0, dur: ui.fast ? 0.05 : dur, fn, res }); });
  const ease = k => k * k * (3 - 2 * k);
  let placed = 0, placing = false, warm = 0, eggShake = 0, mist = false, bg0 = null;

  function tick(dt, time) {
    for (const tw of tweens) { tw.t += dt; const k = Math.min(1, tw.t / tw.dur); tw.fn(k); if (k >= 1) { tw.done = true; tw.res(); } }
    tweens = tweens.filter(tw => !tw.done);
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
    tweens = []; placing = false; mist = false; warm = 0; eggShake = 0; showAll(false); stars.group.visible = false;
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
    egg.rotation.set(0, 0, 0); eggTop.position.set(0, 0, 0); eggTop.rotation.set(0, 0, 0); eggTop.scale.setScalar(1); eggTop.visible = true; crack.visible = false;
    if (stage === 'intro') { worm.setPose('rest'); worm.state.blend = 1; worm.lookAt(drake.root.position.clone().setY(1.4)); }
    else {
      worm.setPose('curl'); worm.state.blend = 1; worm.lookAt(NEAR_EGG); egg.visible = true; egg.position.copy(EGG);
      const n = stage === 'hatch' ? 5 : 2; placed = n; warm = n / 5;
      stones.forEach((s, i) => { s.m.visible = true; s.placed = i < n; s.moving = false; s.m.position.copy(i < n ? SLOTS[i] : LOOSE[i - 2]); });
    }
  }
  const camEgg = () => ({ pos: V(-1.6, 5.8, 8.6), look: V(-1.1, 1.0, -1.9) });

  // ---------------------------------------------------------------- the story
  async function story(from = 'intro') {
    const step = runner(); begin();
    if (from === 'intro') {
      await step(fade(true)); stageCave('intro');
      await step(card({ kicker: 'פרק 2', title: 'הביצה המסתורית' })); await step(fade(false));
      G.phase = 'c2-intro';
      G.camGoal = { pos: V(0.5, 4.6, 9), look: V(1, 1.6, -4) };
      worm.wiggle(1); sfx.purr();
      await step(say('worm', 'בוקר טוב, דרייק! איזה כיף שבאת.'));
      await step(say('griffith', 'ששש… שומעים? משהו מתגלגל אל המערה!'));
      // ---- the egg rolls in from the gate and stops at Worm's nose
      G.phase = 'c2-egg';
      G.camGoal = { pos: V(-1.5, 6.2, 9.5), look: V(2, 1, -5) };
      egg.visible = true; sfx.whoosh();
      const path = new THREE.CatmullRomCurve3([V(GATE_POS.x - 0.3, EGG.y, GATE_POS.z + 1.6), V(5.6, EGG.y, -8), V(3.9, EGG.y, -1.6), V(0.8, EGG.y, -1.3), EGG.clone()]);
      await step(tween(3.4, k => { const e = ease(k); path.getPointAt(e, egg.position); egg.rotation.set(e * 14, 0, Math.sin(e * 9) * 0.25 * (1 - e)); if (Math.random() < 0.3) fx.trail(egg.position, 0x8fd0ff, 0.3); }));
      egg.rotation.set(0, 0, 0); fx.burst(EGG, 0x9fd8ff, 30, 2.5, 0.4, 1.2, 0.3); sfx.chime();
      await step(say('drake', 'וואו! ביצה כחולה! והיא זוהרת!'));
      worm.setPose('curl'); worm.lookAt(EGG); worm.wiggle(0.8); sfx.purr();
      G.camGoal = { pos: V(-2.6, 3.8, 6.4), look: V(-1.4, 1.0, -3.2) };
      await step(wait(900));
      await step(say('worm', 'אל תדאגי, ביצה קטנה. אני שומר עלייך.'));
      await step(say('griffith', 'זאת ביצה של דרקון מים! זה סימן: מאסטר דרקונים חדש בדרך אלינו.'));
      await step(say('griffith', 'ביצת מים אוהבת טיפות מהנהר. טוסו לאסוף לה בועות מים!'));
      worm.lookAt(drake.root.position.clone().setY(1.4)); worm.wiggle(1.2);
      await step(say('worm', 'עלה על הגב שלי, דרייק. נרחף נמוך מעל הנהר!'));
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
    G.startFlight({ items: bubbles.list, pos: V(-100, RIVER_Y + 4.4, riverZ(-100)), yaw: Math.PI / 2, speed: 10, minClear: 4.6, bound: 190, onCollect: onPair });
    G.phase = 'c2-glide'; G.setCounter('0', '💧');
    await step(fade(false)); showJoy(true);
    worm.wiggle(1); G.glance(1.4);
    toast('worm', 'הנה הנהר! הטיפות באות בזוגות – נספור בקפיצות של 2!', 3800);
    await step(wait(3900));
    toast(null, 'הזז את הג׳ויסטיק כדי לאסוף את הבועות 💧', 3600);
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
    stageCave('warm'); G.camGoal = camEgg(); G.phase = 'c2-warm';
    if (!direct) { await step(fade(false)); fx.burst(EGG, 0x9fdcff, 50, 3, 0.4, 1.4, 0.5); sfx.chime(); }
    await step(say('griffith', 'הביצה שתתה את כל הטיפות! עכשיו היא צריכה חום.'));
    await step(say('griffith', 'צריך 5 אבנים חמות מסביב לביצה.'));
    worm.setGlow(true); worm.wiggle(0.8);
    await step(say('worm', 'כבר הנחתי 2 אבנים בכוח המחשבה שלי!'));
    worm.setGlow(false);
    G.phase = 'c2-math';
    await step(riddleMissing(2, 5, { right: () => { worm.wiggle(1.4); sfx.happy(); }, wrong: () => toast('worm', 'אתה יכול! אני מאמין בך 💚', 2500) }));
    G.phase = 'c2-place'; placing = true;
    $('#counter').hidden = false; G.setCounter('2 / 5', '🔥');
    toast(null, 'גע באבנים החמות, ווורם יניח אותן ליד הביצה 👆', 5000);
    await step(waitFor(() => placed >= 5));
    placing = false; marker.visible = false; hideToast();
    await step(wait(500));
  }

  // ---- hatch + Bo arrives
  async function hatch(step, direct) {
    if (direct) { stageCave('hatch'); }
    G.camGoal = { pos: V(-2.3, 3.6, 5.6), look: V(-1.8, 0.9, -3.0) }; G.phase = 'c2-hatch'; $('#counter').hidden = true;
    worm.lookAt(NEAR_EGG); worm.wiggle(1);
    await step(say('worm', 'חם ונעים… תראה, דרייק! הביצה זזה!'));
    crack.visible = true; sfx.munch();
    await step(tween(1.8, k => { eggShake = k; }));
    eggShake = 0; sfx.chime(); sfx.happy();
    fx.burst(EGG.clone().add(V(0, 0.5, 0)), 0x9fdcff, 70, 5, 0.5, 1.5, -1); fx.confetti(EGG.clone().add(V(0, 0.6, 0)), 30);
    // the baby sits coiled inside the lower shell (coil centre = egg centre)
    baby.root.visible = true; baby.root.position.set(EGG.x + 2.9 * 0.24, 0.25, EGG.z); baby.root.rotation.set(0, 0, 0); baby.setPose('coil'); baby.state.blend = 1;
    baby.lookAt(cam.position); baby.wiggle(2);
    tween(0.9, k => { const e = ease(k); eggTop.position.set(-1.2 * e, 1.6 * Math.sin(e * Math.PI) + 0.1 * e, -0.8 * e); eggTop.rotation.z = e * 2.4; eggTop.scale.setScalar(1 - 0.999 * ss(e, 0.7, 1)); }).then(() => { eggTop.visible = false; });
    worm.wiggle(1.8); fx.hearts3(worm.headWorld().add(V(0, 0.5, 0)).lerp(cam.position, 0.15), 6);
    await step(wait(900));
    await step(say('baby', 'פיפ! פיפ! הי הי הי!'));
    await step(say('drake', 'וואו! דרקונית מים קטנטונת!'));
    baby.lookAt(worm.headWorld()); baby.wiggle(1.5); worm.wiggle(1.2); sfx.purr();
    await step(say('worm', 'שלום, קטנטונת! אני וורם. אל תפחדי, אני כאן.'));
    await step(say('drake', 'היא מבעבעת כמו בועה… נקרא לה בועה!'));
    // ---- Bo and Shu come in through the gate
    G.phase = 'c2-bo';
    G.camGoal = { pos: V(-5.2, 4.2, 7.6), look: V(2.2, 1.1, -3.2) };
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
    await step(say('bo', 'שלום! אני בו, וזאת שו, דרקונית המים שלי.'));
    shu.wiggle(1.5); baby.lookAt(shu.headWorld()); baby.wiggle(2); sfx.happy();
    await step(say('bo', 'חיפשנו את הביצה הזאת לאורך כל הנהר!'));
    await step(say('griffith', 'ברוך הבא, בו! אתה מאסטר דרקונים חדש בטירה.'));
    bo.wave(2);
    await step(say('bo', 'תודה ששמרתם עליה, דרייק ווורם!'));
    // the baby hops over to her new friend
    const b0 = baby.root.position.clone(), b1 = V(0.3, 0, -1.7);
    baby.lookAt(worm.headWorld()); worm.lookAt(b1.clone().setY(0.4));
    await step(tween(1.2, k => { const e = ease(k); baby.root.position.lerpVectors(b0, b1, e); baby.root.position.y += Math.sin(e * Math.PI) * 1.2; }));
    baby.wiggle(2.5); worm.wiggle(2); sfx.purr(); fx.hearts3(b1.clone().setY(1.2), 8);
    await step(say('worm', 'בועה ואני כבר חברים טובים!'));
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
  };
}
