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
  const { THREE, cam, fx, worm, drake, griffith, cave, caveScene, ui, say, toast, hideToast, card, fade, sfx, runner, wait, tween } = G;
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

  function tick(dt, time) {
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
  function cleanup() { active = false; done = null; pat = null; showAll(false); cave.closeGate(); griffith.root.position.set(7.2, 0, -3.5); }
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
    } else await step(fade(false));
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
    debug: () => ({ tweens: G.tweenCount(), active, next, misses, hint, pattern: pat ? PATTERNS.indexOf(pat) + 1 : 0 }),
    modelTargets: { petra, crystalDragon: gem },
  };
}
