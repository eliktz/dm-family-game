// Chapter 1 "אבן הדרקון": cave (meet Worm, Dragon Stone, feed + pet, gate riddle) → first flight
// (two laps round the castle: 8 stars, then 8 golden rings with Worm's mind-lift button) → celebration → "to be continued".
// Keepsake: the green Dragon Stone.
export function chapter1(G) {
  const { THREE, cam, fx, worm, drake, cave, stars, marker, apple, GATE_POS, PLATEAU, params, ui,
    say, toast, hideToast, actions, clearActions, showJoy, card, fade, sfx, runner, wait, waitFor, fl, tween } = G;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  // HD models: a two-shot from the side of the Drake→Worm line (whichever side the camera is already on), so Drake never hides Worm's face
  function sideCam(dist, h, lookY) {
    const a = drake.root.position.clone().setY(0), b = worm.headWorld().setY(0), mid = a.clone().lerp(b, 0.5), d = b.clone().sub(a).normalize();
    const perp = V(-d.z, 0, d.x); if (perp.dot(cam.position.clone().sub(mid)) < 0) perp.negate();
    return { pos: mid.clone().addScaledVector(perp, dist).addScaledVector(d, -dist * 0.25).setY(h), look: mid.setY(lookY) };
  }

  async function storyCave(from = 'intro') {
    const step = runner();
    G.setupCave(); G.checkpoint(1, from);
    if (from === 'intro') {
      await step(fade(true)); await step(card({ kicker: 'פרק 1', title: 'אבן הדרקון' })); await step(fade(false));
      G.phase = 'cave-intro';
      if (G.hd) { // HD models: Drake waits closer, and the opening shot is a tighter two-shot so Worm is big and Drake stands next to him
        drake.root.position.set(-0.6, 0, -0.4); drake.root.rotation.y = Math.atan2(-4 + 0.6, -5.2 + 0.4);
        G.camGoal = { pos: V(4.0, 2.7, 0.2), look: V(-2.6, 0.8, -3.3) };
      } else G.camGoal = { pos: V(-1, 4.5, 9), look: V(-3, 2, -4) };
      worm.lookAt(drake.root.position.clone().setY(1.5));
      await step(say('griffith', 'שלום, דרייק! ברוך הבא למערת הדרקונים.'));
      await step(say('griffith', "אני גריפית' הקוסם. מישהו גדול וחמוד מחכה לך…"));
      worm.wiggle(1); sfx.purr();
      await step(say('drake', 'וואו! דרקון אמיתי!'));
      
      G.camGoal = null; G.phase = 'cave-walk'; G.caveFree = true; showJoy(true); marker.visible = true;
      toast(null, 'זה וורם! הזז את הג׳ויסטיק או גע בו כדי ללכת אליו 👆', 6000);
      await step(waitFor(() => drake.root.position.distanceTo(worm.headWorld().setY(0)) < 3.6));
      G.caveFree = false; G.walkTarget = null; showJoy(false); marker.visible = false; hideToast();
      // ---- Dragon Stone moment
      G.phase = 'stone'; G.keepShot = true;   // stay on Worm and Drake while the stone glows
      G.faceEachOther();
      G.camGoal = G.hd ? sideCam(5.6, 2.3, 1.3) : { pos: drake.root.position.clone().lerp(worm.headWorld(), 0.5).add(V(3.5, 1.2, 4.2)), look: drake.root.position.clone().lerp(worm.headWorld(), 0.5).setY(1.6) };
      await step(wait(500));
      G.stoneGlow = 1; worm.setGlow(true); sfx.magic(); fx.burst(drake.root.position.clone().setY(1.1), 0x7dffa0, 50, 3, 0.4, 1.6, 0.5);
      await step(say('griffith', 'אבן הדרקון שלך זוהרת! אתה מאסטר דרקונים!'));
      
      worm.wiggle(1.2); sfx.happy();
      await step(say('worm', 'שלום, דרייק. אני וורם. אנחנו מדברים בלי מילים!'));
      
      G.stoneGlow = 0.25; worm.setGlow(false);
      G.keepShot = false;
      toast('griffith', 'וורם קצת רעב. האכל אותו ולטף אותו!', 4000);
    }
    if (from === 'intro' || from === 'bond') {
      if (from === 'bond') { drake.root.position.copy(worm.headWorld().setY(0)).add(V(2.4, 0, 1.6)); G.faceEachOther(); }
      G.phase = 'bond'; G.checkpoint(1, 'bond');
      G.camGoal = G.hd ? sideCam(5.4, 2.1, 1.2)
        : { pos: drake.root.position.clone().add(V(3.2, 2.6, 5.2)), look: drake.root.position.clone().lerp(worm.headWorld(), 0.6).setY(1.4) };
      const done = { feed: false, pet: false };
      await step(new Promise(res => {
        const check = () => { if (done.feed && done.pet) res(); };
        actions([
          { id: 'btn-feed', label: '🍎 להאכיל', onClick: b => { if (G.busy) return; feed().then(() => { done.feed = true; b.classList.add('done'); check(); }); } },
          { id: 'btn-pet', label: '✋ ללטף', cls: 'green', onClick: b => { if (G.busy) return; pet().then(() => { done.pet = true; b.classList.add('done'); check(); }); } },
        ]);
      }));
      clearActions(); await step(wait(400));
      
      toast('worm', 'אני שמח שאתה המאסטר שלי! 💚', 2200); await step(wait(1400));
    }
    // ---- riddle at the gate
    G.phase = 'math'; G.checkpoint(1, 'math');
    G.camGoal = { pos: V(-1.5, 4.5, 5), look: GATE_POS.clone().setY(2.5) };
    // two riddles open the gate: an addition, then a missing number (sizes follow the riddle level; ?a=&b= fixes the first one)
    const react = { right: () => { worm.wiggle(1.4); sfx.happy(); }, wrong: n => toast('worm', n >= 3 ? 'אני איתך, דרייק! 💚' : 'אתה יכול! אני מאמין בך 💚', 2500) };
    const fixed = params.has('a') ? (() => { const a = +params.get('a'), b = +params.get('b'), r = G.makeRiddle(1, 'add'); const eq = `${a} + ${b}`;
      return { ...r, a, b, answer: a + b, eq, key: 'add:' + eq, steps: [`${eq} = ${a + b}`], options: [a + b, a + b + 1, Math.max(1, a + b - 1)], visual: { type: 'groups', parts: [a, b], sym: '+' }, qHTML: `כמה זה <bdi dir="ltr" class="eq">${eq}</bdi>?` }; })() : null;
    await step(G.math.ask({ kind: 'add', title: '🔮 חידת השער', fixed, ...react }));
    await step(wait(300));
    await step(G.math.ask({ kind: 'missing', title: '🔮 חידת השער – ועוד אחת!', ...react }));
    G.phase = 'gate'; cave.openGate(); sfx.whoosh(); fx.burst(GATE_POS.clone().setY(3), 0xfff2b0, 60, 5, 0.5, 1.6, -0.5);
    await step(wait(1200));
    
    G.camGoal = G.hd ? { pos: worm.headWorld().setY(0).add(V(4.2, 2.6, 5.6)), look: worm.headWorld().lerp(GATE_POS, 0.25).setY(1.5) } : { pos: V(9, 5.5, 7), look: worm.headWorld().lerp(GATE_POS, 0.45).setY(2.2) };
    worm.wiggle(1.5);
    await step(say('worm', 'עלה על הגב שלי! אני טס בכוח המחשבה ✨'));
    
    G.phase = 'ready-fly';
    await step(new Promise(res => actions([{ id: 'btn-fly', label: '🐉 בוא נטוס!', cls: 'pulse', onClick: () => res() }])));
    clearActions();
    worm.setGlow(true); sfx.magic(); fx.burst(worm.headWorld(), 0x7dffb0, 80, 6, 0.5, 1.5, 0);
    await step(wait(700)); await step(fade(true));
    return storyFlight(step);
  }
  async function feed() {
    G.busy = true; const from = drake.root.position.clone().add(V(0, 1.1, 0)), to = worm.mouthWorld();
    apple.visible = true; worm.openMouth(1); drake.wave(0.6);
    await G.tween(0.9, k => { apple.position.lerpVectors(from, to, k).y += Math.sin(k * Math.PI) * 1.6; apple.rotation.y = k * 9; });
    apple.visible = false; worm.openMouth(0); worm.chomp(); sfx.munch(); fx.burst(to, 0xffe07a, 18, 2, 0.3, 0.8);
    await wait(700); worm.wiggle(1.4); sfx.happy(); fx.hearts3(worm.headWorld().add(V(0, 0.5, 0)).lerp(cam.position, 0.15), 5);
    toast('worm', 'מממ! תפוח מתוק! תודה, דרייק!', 2600); await wait(1600); G.busy = false;
  }
  async function pet() {
    G.busy = true; drake.wave(1.5); worm.wiggle(1.8); sfx.purr(); fx.hearts3(worm.headWorld().add(V(0, 0.5, 0)).lerp(cam.position, 0.15), 8);
    toast('worm', 'הי הי, זה מדגדג! אני אוהב את זה!', 2600); await wait(1800); G.busy = false;
  }

  // ---- first flight: two laps on one closed rail round the castle. Lap 1: the 8 stars. Lap 2: 8 golden rings that sit on
  // the same rail between the stars, so Worm always flies through them (rail-guided, nothing can be missed). The rings
  // are in the item list from the start but marked collected and hidden until the last star is caught.
  const ringG = new THREE.TorusGeometry(3.4, 0.24, 10, 40), ringM = new THREE.MeshStandardMaterial({ color: 0xd9a520, metalness: 0.8, roughness: 0.25, emissive: 0xffb81f, emissiveIntensity: 0.9 });
  const starLoop = new THREE.CatmullRomCurve3(stars.list.map(s => s.base.clone()), true, 'centripetal'); starLoop.arcLengthDivisions = 400; starLoop.updateArcLengths();
  const starU = (() => { const N = 800, u = stars.list.map(() => 0), best = stars.list.map(() => Infinity), q = V(0, 0, 0); for (let k = 0; k <= N; k++) { starLoop.getPointAt(k / N, q); stars.list.forEach((s, i) => { const d = q.distanceToSquared(s.base); if (d < best[i]) { best[i] = d; u[i] = k / N; } }); } return u; })();
  const n = stars.list.length, rings = [];
  for (let i = 0; i < n; i++) { // ring 0 is in the gap after the last star, so lap 2 begins right away; then one between each pair of stars
    const a = starU[(i + n - 1) % n], b = starU[i] + (i === 0 ? 1 : 0), u = ((a + b) / 2) % 1;
    const g = new THREE.Mesh(ringG, ringM); starLoop.getPointAt(u, g.position); g.lookAt(g.position.clone().add(starLoop.getTangentAt(u))); g.visible = false; stars.group.add(g);
    rings.push({ g, base: g.position.clone(), got: true, pop: 0, gold: true });
  }
  const flightItems = [...stars.list, ...rings]; let lap2 = false, liftAt = 0, lifting = false;
  function resetRings() { lap2 = false; lifting = false; for (const r of rings) { r.got = true; r.pop = 0; r.g.visible = false; r.g.scale.setScalar(1); r.g.position.copy(r.base); } }
  function ringTick(dt, time) { for (const r of rings) { if (r.got && lap2) { r.pop += dt; const k = Math.max(0, 1 - r.pop * 2.5); r.g.scale.setScalar(k * (1 + r.pop * 2)); r.g.visible = k > 0; } else if (!r.got && !lifting) r.g.rotation.z = time * 0.8; } ringM.emissiveIntensity = 0.9 + 0.35 * Math.sin(time * 4); }
  // Worm's mind-lift: the power button pulls the next ring straight to him (always works; a short rest between uses)
  function mindLift() {
    const i = G.nextItem(), r = flightItems[i], now = performance.now(); if (!lap2 || !r || !r.gold || lifting || now - liftAt < 1500 || fl.done) return;
    lifting = true; liftAt = now; worm.setGlow(true); worm.wiggle(1); sfx.magic(); const from = r.g.position.clone(); fx.burst(from.clone(), 0x7dffb0, 40, 5, 0.5, 1.0, 0);
    tween(0.45, k => { r.g.position.lerpVectors(from, fl.pos, k * k); fx.trail(r.g.position.clone(), 0x7dffb0, 0.4); }).then(() => { lifting = false; worm.setGlow(false); if (G.tick === ringTick && !r.got && G.nextItem() === i) G.collectNext(); });
  }
  const STAR_LINES = ['יש! ⭐', 'עוד אחד!', 'וואו, אתה מעולה!', 'חצי דרך! 🎉', 'כל הכבוד!', 'אנחנו צוות מנצח!', 'רק עוד אחד!', ''];
  function onStar(i, s) {
    if (s.gold) { const k = fl.got - n; sfx.star(k - 1); sfx.chime && sfx.chime(); fx.burst(fl.pos.clone(), 0xffd34a, 50, 8, 0.6, 1.2, -1); worm.wiggle(0.8); if (k % 3 === 0) G.glance(1.0, 0.8); G.setCounter(`${k} / ${n}`, '💫'); return; }
    sfx.star(fl.got - 1); fx.burst(s.g.position.clone(), 0xffe27a, 40, 7, 0.6, 1.2, -2); worm.wiggle(0.8); G.glance(1.0, 0.8); G.setCounter(`${fl.got} / ${n}`);
    if (fl.got < n && STAR_LINES[fl.got - 1]) toast('worm', STAR_LINES[fl.got - 1], 1800);
    if (fl.got === n) { // lap 2: the golden rings light up along the same rail
      lap2 = true; for (const r of rings) { r.got = false; r.pop = 0; r.g.visible = true; r.g.scale.setScalar(1); } sfx.magic(); G.setCounter(`0 / ${n}`, '💫');
      toast('worm', 'סיבוב שני! טסים דרך טבעות הזהב! 💫', 3200);
      actions([{ id: 'btn-lift', label: '✨ כוח המחשבה', cls: 'green', onClick: mindLift }]);
    }
  }
  async function storyFlight(step) {
    step = step || runner();
    stars.group.visible = true; stars.reset(); resetRings(); clearActions(); G.tick = ringTick; G.onLeave = () => { resetRings(); clearActions(); };
    // a closed loop around the castle through all 8 stars; Worm starts a little before the first one and keeps circling when done
    G.startFlight({ items: flightItems, pathPts: stars.list.map(s => s.base), loop: true, startU: 1 - 0.085, camSide: -1, onCollect: onStar }); // camera on the outside of the loop: the castle stays behind Worm and no tower can get in the way
    G.phase = 'fly'; G.checkpoint(1, 'flight'); G.setCounter(`0 / ${n}`);
    await step(fade(false));
    showJoy(true);
    worm.wiggle(1); G.glance(1.5);
    toast('worm', 'תחזיק חזק! בוא נאסוף את כל 8 הכוכבים הזוהרים!', 3500);
    await step(wait(3600));
    toast(null, 'וורם טס לבד! הג׳ויסטיק מזיז אותו קצת לצדדים ⭐', 4000);
    await step(waitFor(() => fl.got >= 2 * n));
    G.phase = 'celebrate'; fl.done = true; showJoy(false); clearActions();
    sfx.fanfare(); worm.wiggle(2.5); G.glance(2.2);
    for (let i = 0; i < 3; i++) setTimeout(() => fx.confetti(fl.pos.clone().add(V(0, 3, 0)), 70), i * 500);
    toast('worm', 'זאת הייתה הטיסה הכי כיפית שלי!', 3000);
    await step(wait(2600));
    const v = await step(card({ kicker: '⭐ ⭐ ⭐ ⭐ ⭐ ⭐ ⭐ ⭐', title: 'כל הכבוד!', text: 'אספת 8 כוכבים וטסת דרך 8 טבעות זהב יחד עם וורם!', buttons: [{ label: '🔁 עוד פעם?', value: 'again' }, { label: 'סיום הפרק ◀', value: 'end', cls: 'green' }] }));
    if (v === 'again') { await step(fade(true)); return storyFlight(step); }
    return storyEnd(step);
  }
  async function storyEnd(step) {
    step = step || runner(); G.phase = 'end'; G.mode = 'flight'; fl.done = true; showJoy(false);
    G.markDone(1);
    const v = await step(card({ kicker: 'סוף פרק 1 – אבן הדרקון', title: 'המשך יבוא…', text: 'בפרק הבא: ביצה מסתורית מתגלגלת אל מערת הדרקונים… מה יש בתוכה? 🥚', buttons: [{ label: '🔁 עוד פעם?', value: 'again' }, { label: '🏠 לתפריט', value: 'home', cls: 'green' }] }));
    if (v === 'again') { await step(fade(true)); return storyFlight(step); }
    await step(fade(true)); G.enterTitle(); await fade(false);
  }

  return { start: (from = 'intro') => from === 'flight' ? storyFlight() : storyCave(from) };
}
