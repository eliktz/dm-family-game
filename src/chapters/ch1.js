// Chapter 1 "אבן הדרקון": cave (meet Worm, Dragon Stone, feed + pet, gate riddle) → first flight
// (8 stars around the castle) → celebration → "to be continued". Keepsake: the green Dragon Stone.
export function chapter1(G) {
  const { THREE, cam, fx, worm, drake, cave, stars, marker, apple, GATE_POS, PLATEAU, params, ui,
    say, toast, hideToast, actions, clearActions, showJoy, riddle, card, fade, sfx, runner, wait, waitFor, fl } = G;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  async function storyCave(from = 'intro') {
    const step = runner();
    G.setupCave(); G.checkpoint(1, from);
    if (from === 'intro') {
      await step(fade(true)); await step(card({ kicker: 'פרק 1', title: 'אבן הדרקון' })); await step(fade(false));
      G.phase = 'cave-intro';
      G.camGoal = { pos: V(-1, 4.5, 9), look: V(-3, 2, -4) };
      worm.lookAt(drake.root.position.clone().setY(1.5));
      await step(say('griffith', 'שלום, דרייק! ברוך הבא למערת הדרקונים, עמוק מתחת לטירה של המלך רולנד.'));
      await step(say('griffith', "אני גריפית', הקוסם של הטירה. מישהו גדול וחמוד מחכה לך כאן..."));
      worm.wiggle(1); sfx.purr();
      await step(say('drake', 'וואו! זה... דרקון?!'));
      await step(say('griffith', 'זה וורם, דרקון אדמה. לך אליו – הוא עדין מאוד!'));
      G.camGoal = null; G.phase = 'cave-walk'; G.caveFree = true; showJoy(true); marker.visible = true;
      toast(null, 'הזז את הג׳ויסטיק או גע בוורם כדי ללכת אליו 👆', 6000);
      await step(waitFor(() => drake.root.position.distanceTo(worm.headWorld().setY(0)) < 3.6));
      G.caveFree = false; G.walkTarget = null; showJoy(false); marker.visible = false; hideToast();
      // ---- Dragon Stone moment
      G.phase = 'stone';
      G.faceEachOther();
      G.camGoal = { pos: drake.root.position.clone().lerp(worm.headWorld(), 0.5).add(V(3.5, 1.2, 4.2)), look: drake.root.position.clone().lerp(worm.headWorld(), 0.5).setY(1.6) };
      await step(wait(500));
      G.stoneGlow = 1; worm.setGlow(true); sfx.magic(); fx.burst(drake.root.position.clone().setY(1.1), 0x7dffa0, 50, 3, 0.4, 1.6, 0.5);
      await step(say('griffith', 'תראה! אבן הדרקון שעל הצוואר שלך זוהרת!'));
      await step(say('griffith', 'דרייק, אתה מאסטר דרקונים!'));
      worm.wiggle(1.2); sfx.happy();
      await step(say('worm', 'שלום, דרייק. אני וורם. אנחנו יכולים לדבר בלי מילים!'));
      await step(say('drake', 'אני שומע אותך בתוך הראש! איזה כיף!'));
      G.stoneGlow = 0.25; worm.setGlow(false);
      await step(say('griffith', 'וורם קצת רעב. בוא תאכיל אותו ותלטף אותו.'));
    }
    if (from === 'intro' || from === 'bond') {
      if (from === 'bond') { drake.root.position.copy(worm.headWorld().setY(0)).add(V(2.4, 0, 1.6)); G.faceEachOther(); }
      G.phase = 'bond'; G.checkpoint(1, 'bond');
      G.camGoal = { pos: drake.root.position.clone().add(V(3.2, 2.6, 5.2)), look: drake.root.position.clone().lerp(worm.headWorld(), 0.6).setY(1.4) };
      const done = { feed: false, pet: false };
      await step(new Promise(res => {
        const check = () => { if (done.feed && done.pet) res(); };
        actions([
          { id: 'btn-feed', label: '🍎 להאכיל', onClick: b => { if (G.busy) return; feed().then(() => { done.feed = true; b.classList.add('done'); check(); }); } },
          { id: 'btn-pet', label: '✋ ללטף', cls: 'green', onClick: b => { if (G.busy) return; pet().then(() => { done.pet = true; b.classList.add('done'); check(); }); } },
        ]);
      }));
      clearActions(); await step(wait(400));
      await step(say('worm', 'דרייק, אני כל כך שמח שאתה המאסטר שלי!'));
      await step(say('griffith', 'יפה מאוד! עכשיו נפתח את שער המערה. הוא נפתח רק למי שפותר חידה קסומה.'));
    }
    // ---- riddle at the gate
    G.phase = 'math'; G.checkpoint(1, 'math');
    G.camGoal = { pos: V(-1.5, 4.5, 5), look: GATE_POS.clone().setY(2.5) };
    const [a, b] = params.has('a') ? [+params.get('a'), +params.get('b')] : [3, 2];
    await step(riddle(a, b, { right: () => { worm.wiggle(1.4); sfx.happy(); }, wrong: () => toast('worm', 'אתה יכול! אני מאמין בך 💚', 2500) }));
    G.phase = 'gate'; cave.openGate(); sfx.whoosh(); fx.burst(GATE_POS.clone().setY(3), 0xfff2b0, 60, 5, 0.5, 1.6, -0.5);
    await step(wait(1200));
    await step(say('griffith', 'השער פתוח! כל הכבוד, דרייק!'));
    G.camGoal = { pos: V(9, 5.5, 7), look: worm.headWorld().lerp(GATE_POS, 0.45).setY(2.2) };
    worm.wiggle(1.5);
    await step(say('worm', 'עלה על הגב שלי, דרייק. אני אראה לך את הממלכה!'));
    await step(say('worm', 'אין לי כנפיים – אבל אני טס בכוח המחשבה שלי! ✨'));
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
    const T = ui.fast ? 0.1 : 0.9, t0 = performance.now();
    await new Promise(r => { const tick = () => { const k = Math.min(1, (performance.now() - t0) / 1000 / T); apple.position.lerpVectors(from, to, k).y += Math.sin(k * Math.PI) * 1.6; apple.rotation.y += 0.2; if (k < 1) requestAnimationFrame(tick); else r(); }; tick(); });
    apple.visible = false; worm.openMouth(0); worm.chomp(); sfx.munch(); fx.burst(to, 0xffe07a, 18, 2, 0.3, 0.8);
    await wait(700); worm.wiggle(1.4); sfx.happy(); fx.hearts3(worm.headWorld().add(V(0, 0.5, 0)).lerp(cam.position, 0.15), 5);
    toast('worm', 'מממ! תפוח מתוק! תודה, דרייק!', 2600); await wait(1600); G.busy = false;
  }
  async function pet() {
    G.busy = true; drake.wave(1.5); worm.wiggle(1.8); sfx.purr(); fx.hearts3(worm.headWorld().add(V(0, 0.5, 0)).lerp(cam.position, 0.15), 8);
    toast('worm', 'הי הי, זה מדגדג! אני אוהב את זה!', 2600); await wait(1800); G.busy = false;
  }

  // ---- first flight: 8 stars around the castle
  const STAR_LINES = ['יש! ⭐', 'עוד אחד!', 'וואו, אתה מעולה!', 'חצי דרך! 🎉', 'כל הכבוד!', 'אנחנו צוות מנצח!', 'רק עוד אחד!', ''];
  const n = stars.list.length;
  function onStar(i, s) {
    sfx.star(fl.got - 1); fx.burst(s.g.position.clone(), 0xffe27a, 40, 7, 0.6, 1.2, -2); worm.wiggle(0.8); G.glance(1.0, 0.8); G.setCounter(`${fl.got} / ${n}`);
    if (fl.got < n && STAR_LINES[fl.got - 1]) toast('worm', STAR_LINES[fl.got - 1], 1800);
  }
  async function storyFlight(step) {
    step = step || runner();
    stars.group.visible = true; stars.reset();
    // a closed loop around the castle through all 8 stars; Worm starts a little before the first one and keeps circling when done
    G.startFlight({ items: stars.list, loop: true, startU: 1 - 0.085, camSide: -1, onCollect: onStar }); // camera on the outside of the loop: the castle stays behind Worm and no tower can get in the way
    G.phase = 'fly'; G.checkpoint(1, 'flight'); G.setCounter(`0 / ${n}`);
    await step(fade(false));
    showJoy(true);
    worm.wiggle(1); G.glance(1.5);
    toast('worm', 'תחזיק חזק! בוא נאסוף את כל 8 הכוכבים הזוהרים!', 3500);
    await step(wait(3600));
    toast(null, 'וורם טס לבד! הג׳ויסטיק מזיז אותו קצת לצדדים ⭐', 4000);
    await step(waitFor(() => fl.got >= n));
    G.phase = 'celebrate'; fl.done = true; showJoy(false);
    sfx.fanfare(); worm.wiggle(2.5); G.glance(2.2);
    for (let i = 0; i < 3; i++) setTimeout(() => fx.confetti(fl.pos.clone().add(V(0, 3, 0)), 70), i * 500);
    toast('worm', 'זאת הייתה הטיסה הכי כיפית שלי!', 3000);
    await step(wait(2600));
    const v = await step(card({ kicker: '⭐ ⭐ ⭐ ⭐ ⭐ ⭐ ⭐ ⭐', title: 'כל הכבוד!', text: 'אספת את כל 8 הכוכבים יחד עם וורם!', buttons: [{ label: '🔁 עוד פעם?', value: 'again' }, { label: 'סיום הפרק ◀', value: 'end', cls: 'green' }] }));
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
