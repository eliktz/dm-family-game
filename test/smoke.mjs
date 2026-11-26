// Smoke test at two sizes: iPad landscape and iPhone landscape (WebKit = Safari's engine).
// Plays chapters 1 and 2 start→end through the real UI (buttons, dialogs, riddles, stone taps), using
// window.__dm only to skip walking/steering. Also covers: web-app manifest + icons, the home-screen hint,
// save/continue after a reload, the hidden parent unlock, "UI never covers Drake/Worm", and no read-aloud.
// Fails on any console error / page error / failed request. Saves screenshots as shots/<device>-*.png.
// Usage: node smoke.mjs [baseURL] [--device=ipad|iphone] [--chromium] [--no-shots] [--dsf=1]
// --dsf=1 renders the iPhone at 1x instead of 3x (for a loaded test machine; the layout checks are in CSS px, so they stay valid).
import { webkit, chromium, devices } from 'playwright';
import { startServer } from './serve.mjs';
import { fileURLToPath } from 'node:url'; import { dirname, join } from 'node:path'; import { mkdir } from 'node:fs/promises';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2); const urlArg = args.find(a => /^https?:/.test(a));
const useChromium = args.includes('--chromium'); const shots = !args.includes('--no-shots');
const only = args.find(a => a.startsWith('--device='))?.split('=')[1];
const dsfArg = +(args.find(a => a.startsWith('--dsf='))?.split('=')[1] || 0);
let server, base = urlArg;
if (!base) { const s = await startServer(root); server = s.server; base = `http://127.0.0.1:${s.port}/`; }
if (!base.endsWith('/')) base += '/';
const shotDir = join(root, urlArg ? 'shots/live' : 'shots'); await mkdir(shotDir, { recursive: true });
const DEVICES = [
  { name: 'ipad', ctx: { ...devices['iPad Pro 11 landscape'], viewport: { width: 1180, height: 820 }, deviceScaleFactor: 1 } },
  { name: 'iphone', ctx: { ...devices['iPhone 13 landscape'], viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: dsfArg || 3 } },
].filter(d => !only || d.name === only);
let browser, engineName;
try { if (useChromium) throw new Error('chromium requested'); browser = await webkit.launch(); engineName = 'webkit'; }
catch { browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }); engineName = 'chromium'; }

async function run(dev) {
  const ctx = await browser.newContext(dev.ctx);
  await ctx.addInitScript(() => { // count any use of the speech engine: there must be none
    window.__speech = 0; const wrap = o => { if (!o) return; for (const k of ['speak', 'cancel', 'getVoices', 'pause', 'resume']) { const f = o[k]; if (typeof f === 'function') try { o[k] = function (...a) { window.__speech++; return f.apply(this, a); }; } catch { } } };
    try { wrap(window.SpeechSynthesis && window.SpeechSynthesis.prototype); wrap(window.speechSynthesis); } catch { }
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('crash', () => console.error(`[${engineName} ${dev.name}] !! the page CRASHED (web process died) at ${new Date().toISOString()}`));
  page.on('close', () => console.error(`[${engineName} ${dev.name}] page closed at ${new Date().toISOString()}`)); browser.on('disconnected', () => console.error(`[${engineName}] browser disconnected at ${new Date().toISOString()}`));
  page.on('requestfailed', r => errors.push('requestfailed: ' + r.url()));
  page.on('response', r => { if (r.status() >= 400) errors.push(`http ${r.status()}: ${r.url()}`); });
  const log = (...a) => console.log(`[${engineName} ${dev.name}]`, ...a);
  const phase = () => page.evaluate(() => window.__dm?.phase);
  // at most ONE speech bubble or banner may be on screen at any moment (checked at every poll and every screenshot)
  let bubbleChecks = 0;
  // brief-18: at most 7 blocking speech bubbles per chapter, none longer than 60 characters (lines repeated after 🏠 count once)
  const bubbleCap = async ch => { const b = await page.evaluate(() => __dm.bubbles()); check(b.n >= 1 && b.n <= 7 && b.longest <= 60, `${ch}: ${b.n} speech bubbles (cap 7), longest ${b.longest} characters (cap 60)`); };
  const oneBubble = async where => { const v = await page.evaluate(() => ['#dialog', '#toast', '#title-toast'].filter(s => { const e = document.querySelector(s); return e && !e.hidden && e.offsetParent !== null; })); bubbleChecks++;
    if (v.length > 1) throw new Error(`CHECK FAILED: two bubbles/banners at once (${v.join(' + ')}) at ${where}: "${await page.locator('#dialog .text').innerText()}" + "${await page.locator('#toast .text').innerText()}"`); };
  const shot = async name => { await oneBubble('shot ' + name); if (shots) await page.screenshot({ path: join(shotDir, `${dev.name}-${name}.png`), scale: 'css' }); log('shot', name); };
  const tap = sel => page.locator(sel).first().dispatchEvent('pointerup');
  async function advanceTo(target, timeout = 240000) { // generous: a loaded software-rendering test machine runs the game in slow motion
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      const p = await phase(); await oneBubble(p); if (p === target) return;
      // tap an open bubble only if the phase is still not the target (checked in the same page call: on a slow machine the
      // target's first bubble could otherwise open between the two calls and be skipped)
      if (await page.evaluate(t => { const d = document.querySelector('#dialog'); if (window.__dm.phase === t) return true; if (!d.hidden) d.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); return false; }, target)) return;
      await page.waitForTimeout(250);
    }
    throw new Error(`timeout waiting for phase ${target} (at ${await phase()})`);
  }
  const check = (cond, msg) => { if (!cond) throw new Error('CHECK FAILED: ' + msg); log('ok', msg); };
  const load = async () => {
    await page.goto(base + 'index.html' + (args.includes('--auto-tier') ? '' : '?tier=high'), { waitUntil: 'load' });
    await page.waitForFunction(() => window.__dm && window.__dm.ready, null, { timeout: 90000 }); await page.waitForTimeout(1200);
  };
  // no HUD element may overlap the on-screen boxes of Drake or Worm's head
  async function clearOfActors(label) {
    const r = await page.evaluate(() => {
      const boxes = __dm.actorBoxes(), hits = [], W = innerWidth, H = innerHeight;
      for (const s of ['#dialog', '#dialog .next', '#toast', '#actions button', '#joy', '#topbar > *'])
        for (const el of document.querySelectorAll(s)) {
          const b = el.getBoundingClientRect(); if (!b.width || !b.height) continue;
          for (const [name, a] of Object.entries(boxes)) {
            if (!a || a[2] < 0 || a[0] > W || a[3] < 0 || a[1] > H) continue;
            if (a[0] < b.right && a[2] > b.left && a[1] < b.bottom && a[3] > b.top) hits.push(`${s} covers ${name} (ui ${[b.left, b.top, b.right, b.bottom].map(Math.round)} vs ${a})`);
          }
        }
      return { hits, boxes };
    });
    check(r.hits.length === 0, `${label}: UI does not cover Drake/Worm` + (r.hits.length ? ' → ' + r.hits.join(' | ') : ''));
  }
  // ---- riddle helpers (answers come from the __dm.math test hook, never from parsing the text)
  const cur = () => page.evaluate(() => __dm.math.current());
  const tapAns = v => page.locator(`#math .m-answers button[data-v="${v}"]`).dispatchEvent('pointerup');
  const panelFits = async label => check(await page.evaluate(() => { const r = document.querySelector('#math .panel').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth; }), `${label}: riddle panel fits the screen`);
  // every .eq is an isolated LTR run whose first character is drawn left of its last one
  const eqLTR = async label => check(await page.evaluate(() => [...document.querySelectorAll('#math .eq')].filter(e => e.offsetParent).every(e => {
    const cs = getComputedStyle(e); if (cs.direction !== 'ltr' || cs.unicodeBidi !== 'isolate') return false;
    const w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT), ns = []; while (w.nextNode()) if (w.currentNode.data.trim()) ns.push(w.currentNode);
    const box = (n, i) => { const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + 1); return r.getBoundingClientRect(); };
    const first = ns[0], last = ns[ns.length - 1]; return box(first, first.data.search(/\S/)).left < box(last, last.data.trimEnd().length - 1).left;
  })), `${label}: equations are LTR isolates`);
  // answer the riddles of a story beat correctly until the phase moves on; returns how many were asked
  async function solveBeat(ph, { firstWrong = false, shotName = null } = {}) {
    let n = 0, lastKey = null;
    for (const t0 = Date.now(); Date.now() - t0 < 240000;) {
      if (await phase() !== ph) return n; const c = await cur();
      if (!c || c.key === lastKey) { if (!c && await page.locator('#dialog:not([hidden])').count()) await tap('#dialog'); await page.waitForTimeout(250); continue; } // lines spoken inside a riddle beat
      lastKey = c.key; n++; await page.waitForTimeout(600); await panelFits(`${ph} riddle ${n} (${c.kind}, level ${c.level})`); await eqLTR(`${ph} riddle ${n}`);
      if (firstWrong && n === 1) {
        await tapAns(c.options.find(o => o !== c.answer)); await page.waitForTimeout(700);
        check((await page.locator('#math .m-hint').innerText()).includes('כמעט'), 'wrong answer gives a friendly hint');
        check(await phase() === ph && (await cur())?.key === c.key, 'wrong answer does not punish/advance');
        if (shotName) await shot(shotName);
      }
      await tapAns(c.answer);
    }
    throw new Error('timeout solving riddles at ' + ph);
  }
  let ok = false;
  try {
    await load();
    check(await page.evaluate(() => document.documentElement.dir === 'rtl' && document.documentElement.lang === 'he'), 'html is lang=he dir=rtl');
    check(await page.locator('#title h1').isVisible(), 'title visible');
    check((await page.locator('#title h1').innerText()).includes('דרקונים'), 'title text Hebrew');
    check(await page.evaluate(() => getComputedStyle(document.querySelector('#title h1')).direction === 'rtl'), 'title direction rtl');
    check(await page.locator('#btn-voice').count() === 0, 'no read-aloud button');
    // ---- web app: manifest + icons, home-screen hint
    const man = await page.request.get(base + 'manifest.json'); check(man.status() === 200, 'manifest.json returns 200');
    const mj = await man.json(); check(mj.display === 'fullscreen' && mj.orientation === 'landscape' && mj.start_url === './' && mj.scope === './', 'manifest: fullscreen, landscape, relative start_url/scope');
    for (const src of [...mj.icons.map(i => i.src), await page.locator('link[rel="apple-touch-icon"]').getAttribute('href')]) {
      check(!/^\//.test(src) && (await page.request.get(base + src)).status() === 200, `icon ${src} returns 200 (relative path)`);
    }
    check(await page.locator('#a2hs').isVisible(), 'home-screen hint shown on iOS Safari');
    await shot('00-a2hs-hint');
    await tap('#a2hs-close'); check(!(await page.locator('#a2hs').isVisible()), 'home-screen hint can be dismissed');
    // ---- chapter map, locked chapters, hidden parent unlock
    check(await page.locator('#chapters .chap').count() === 8, 'chapter map shows 8 chapters');
    check(await page.locator('#ch-2.locked').count() === 1, 'chapter 2 is locked on a fresh start');
    check(await page.locator('#ch-7 .soon').isVisible(), 'unbuilt chapters say בקרוב');
    await shot('01-title-map');
    await tap('#ch-2'); await tap('#ch-5'); await page.waitForTimeout(300);
    check(await page.evaluate(() => __dm.mode === 'title'), 'tapping a locked / unbuilt chapter only gives a friendly nudge');
    await page.locator('#title-h1').dispatchEvent('pointerdown'); await page.waitForTimeout(1500);
    check(await page.locator('#ch-2.locked').count() === 1 && !(await page.locator('#parent').isVisible()), 'a short press on the title does nothing');
    await page.waitForFunction(() => !document.querySelector('#parent').hidden, null, { timeout: 15000 }); await page.locator('#title-h1').dispatchEvent('pointerup');
    log('ok', 'a 3 s hold on the title opens the parent panel');
    check(await page.locator('#ch-2.locked').count() === 0, 'the hold also unlocks all chapters');
    check(await page.evaluate(() => JSON.parse(localStorage.getItem('dm.progress')).all === true), 'unlock is saved');
    check(await page.evaluate(() => { const r = document.querySelector('#parent .panel').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }), 'parent panel fits the screen');
    check(JSON.stringify(await page.evaluate(() => __dm.math.state())) === '{"level":2,"ceiling":5,"auto":true}', 'default riddle level is 2, ceiling 5, auto-adapt on');
    await page.locator('#p-levels button[data-l="4"]').dispatchEvent('pointerup'); await page.waitForTimeout(200);
    await page.locator('#p-ceil button[data-l="3"]').dispatchEvent('pointerup'); await page.waitForTimeout(150);
    check(JSON.stringify(await page.evaluate(() => __dm.math.state())) === '{"level":3,"ceiling":3,"auto":true}', 'a lower ceiling pulls the start level down with it');
    await page.locator('#p-ceil button[data-l="5"]').dispatchEvent('pointerup'); await page.locator('#p-levels button[data-l="4"]').dispatchEvent('pointerup'); await page.waitForTimeout(150);
    check(await page.evaluate(() => { const r = document.querySelector('#parent .panel').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }), 'parent panel with both rows fits the screen');
    await shot('00-parent-panel');
    await tap('#p-close'); check(!(await page.locator('#parent').isVisible()), 'parent panel closes');
    await load();
    check(JSON.stringify(await page.evaluate(() => JSON.parse(localStorage.getItem('dm.progress')).math)) === '{"level":4,"auto":true,"ceiling":5}', 'start level 4 (ceiling 5) survives a reload in dm.progress');
    await page.evaluate(() => __dm.go('math')); await page.waitForFunction(() => __dm.math.current(), null, { timeout: 60000 });
    { const c = await cur(); check(c.level === 4 && c.kind === 'add' && c.answer >= 27 && c.answer <= 100, `gate riddle is level-4 sized after the reload (answer ${c.answer})`); }
    // ---- every level: fits, hints escalate, the third miss guides to the answer, nothing ever blocks
    await page.evaluate(() => { __dm.go('title'); __dm.fast = true; });
    const KIND = { 1: 'sub', 2: 'mul', 3: 'missing', 4: 'word', 5: 'twoStep' };
    for (let L = 1; L <= 5; L++) {
      await page.evaluate(([l, k]) => { __dm.math.setLevel(l); __dm.math.open(k); }, [L, KIND[L]]); await page.waitForFunction(() => __dm.math.current());
      const c = await cur(); check(c.level === L && c.options.length === (L <= 2 ? 3 : 4), `level ${L}: ${c.kind} riddle with ${c.options.length} answers`);
      await panelFits(`level ${L}`); await eqLTR(`level ${L} ${c.kind}`);
      const wrongs = c.options.filter(o => o !== c.answer);
      await tapAns(wrongs[0]); await page.waitForTimeout(150);
      check((await page.locator('#math .m-hint').innerText()).includes('כמעט') && await page.locator('#math .m-visual').isVisible() && (await cur())?.key === c.key, `level ${L}: first miss shows the picture, riddle stays open`);
      await page.evaluate(() => { const b = [...document.querySelectorAll('#math .m-answers button:not(.wrong)')].find(x => +x.dataset.v !== __dm.math.current().answer); b && b.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); });
      await page.waitForTimeout(250); check(await page.locator('#math .m-steps .step').count() >= 1, `level ${L}: second miss shows the worked steps`);
      await panelFits(`level ${L} with steps`); await eqLTR(`level ${L} steps`);
      if (L >= 2) await shot(`math-L${L}-${c.kind}`);
      const left = await page.evaluate(() => [...document.querySelectorAll('#math .m-answers button:not(.wrong)')].map(b => +b.dataset.v));
      if (left.length > 1) { await tapAns(left.find(o => o !== c.answer)); await page.waitForTimeout(150); }
      else await page.evaluate(() => 0);
      check(left.length === 1 || await page.locator(`#math .m-answers button.glow[data-v="${c.answer}"]`).count() === 1, `level ${L}: third miss makes the right button glow`);
      await tapAns(c.answer); await page.waitForFunction(() => document.querySelector('#math').hidden, null, { timeout: 15000 }); log('ok', `level ${L}: tapping the answer closes the riddle`);
    }
    // ---- adaptive: three clean answers raise the level (up to the parent's ceiling)
    await page.evaluate(() => __dm.math.setLevel(1));
    for (let i = 0; i < 3; i++) { await page.evaluate(() => { __dm.math.open('add'); }); await page.waitForFunction(() => __dm.math.current()); await tapAns((await cur()).answer); await page.waitForFunction(() => document.querySelector('#math').hidden); }
    check((await page.evaluate(() => __dm.math.state())).level === 2, 'three clean answers raise the level from 1 to 2');
    await page.evaluate(() => { __dm.fast = false; __dm.resetProgress(); });
    check(await page.locator('#ch-2.locked').count() === 1 && (await page.evaluate(() => __dm.math.state())).level === 2, 'progress reset locks chapter 2 again and resets the riddle level');
    // tap Worm on the title (should wiggle, no error)
    const wb = (await page.evaluate(() => __dm.actorBoxes())).worm; if (wb) await page.mouse.click(Math.max(10, (wb[0] + wb[2]) / 2), (wb[1] + wb[3]) / 2);
    // ---------------- chapter 1: אבן הדרקון
    // regression: leaving a chapter while a bubble is open must not leave a stale tap handler that hides the next bubble
    await page.evaluate(() => __dm.go('cave')); await page.waitForFunction(() => !document.querySelector('#dialog').hidden && __dm.phase === 'cave-intro', null, { timeout: 60000 }); await page.waitForTimeout(600);
    await page.evaluate(() => __dm.go('cave')); await page.waitForFunction(() => !document.querySelector('#dialog').hidden && __dm.phase === 'cave-intro', null, { timeout: 60000 });
    await page.evaluate(() => document.querySelector('#dialog').dispatchEvent(new PointerEvent('pointerup', { bubbles: true }))); await page.waitForTimeout(900);
    check(await page.locator('#dialog').isVisible(), 'an early tap after restarting a chapter does not hide the new bubble');
    await tap('#dialog'); await page.waitForTimeout(700);
    check((await page.locator('#dialog .text').innerText()).includes("אני גריפית'"), 'and the next tap advances it normally');
    await page.evaluate(() => __dm.go('title'));
    check((await page.locator('#btn-continue').innerText()).includes('פרק 1'), 'continue button starts chapter 1 on a fresh save');
    await tap('#btn-continue');
    await advanceTo('cave-intro'); await page.waitForTimeout(1600);
    check(await page.locator('#dialog').isVisible(), 'Griffith dialogue visible');
    check((await page.locator('#dialog .name').innerText()).includes("גריפית'"), 'speaker is גריפית\'');
    await clearOfActors('cave dialog');
    await shot('02-cave-dialog');
    // a tap anywhere on the bubble advances it; pointerup + click from the same tap count once
    await page.evaluate(() => { const d = document.querySelector('#dialog .text'); d.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); d.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    await page.waitForTimeout(700);
    check((await page.locator('#dialog .text').innerText()).includes("אני גריפית'"), 'a tap on the bubble text advances exactly one line (pointerup + click de-duped)');
    await page.evaluate(() => document.querySelector('#dialog').dispatchEvent(new MouseEvent('click', { bubbles: true }))); await page.waitForTimeout(700);
    check((await page.locator('#dialog .name').innerText()).includes('דרייק'), 'a click alone also advances the bubble');
    await advanceTo('cave-walk'); await page.waitForTimeout(1200);
    check(await page.locator('#joy').isVisible(), 'joystick visible in cave');
    await shot('03-cave-walk');
    await page.evaluate(() => __dm.walkToWorm());
    await advanceTo('stone'); await page.waitForTimeout(2200); await shot('04-dragon-stone');
    await advanceTo('bond'); await page.waitForTimeout(1500);
    await clearOfActors('feed/pet actions');
    // ---- save + continue: reload in the middle of the chapter and resume from the checkpoint
    check(await page.evaluate(() => window.__speech === 0), 'no speechSynthesis use (before reload)');
    await load();
    check(!(await page.locator('#a2hs').isVisible()), 'dismissed home-screen hint stays dismissed');
    const cont = await page.locator('#btn-continue').innerText(); check(cont.includes('המשך') && cont.includes('פרק 1'), `continue button offers the saved chapter (${cont.trim()})`);
    await tap('#btn-continue');
    await page.waitForFunction(() => window.__dm.phase === 'bond', null, { timeout: 8000 }); log('ok', 'continue resumes at the saved checkpoint (bond)');
    await page.waitForTimeout(1500);
    await clearOfActors('feed/pet actions after continue');
    await tap('#btn-feed'); await page.waitForTimeout(2600); await shot('05-feed-actions');
    await page.locator('#btn-feed.done').waitFor({ timeout: 30000 });
    await tap('#btn-pet'); await page.waitForTimeout(900); await shot('06-pet-worm');
    await advanceTo('math'); await page.waitForTimeout(800);
    check(await page.locator('#math .eq').isVisible(), 'riddle visible');
    check(await solveBeat('math', { firstWrong: true, shotName: '07-riddle' }) === 2, 'the gate asks two riddles');
    await advanceTo('ready-fly'); await page.waitForTimeout(800); await shot('08-gate-open');
    await tap('#btn-fly');
    await advanceTo('fly'); await page.waitForTimeout(4500);
    check(await page.locator('#counter').isVisible(), 'star counter visible');
    check(!(await page.locator('#arrow').isVisible()), 'no arrow indicator in rail flight');
    await clearOfActors('flight HUD');
    await shot('09-flight');
    for (let i = 0; i < 3; i++) await page.evaluate(() => __dm.collectNext());
    await page.waitForTimeout(2500);
    const cnt = (await page.locator('#count').innerText()).trim(); check(/^[3-7] \/ 8$/.test(cnt), `counter counts up (${cnt})`);
    await shot('10-flight-stars');
    await page.evaluate(() => { for (let k = 0; k < 8 && !document.querySelector('#btn-lift'); k++) __dm.collectNext(); }); // the rest of the stars (collectAll would take the rings too)
    // lap 2: golden rings on the same rail, with Worm's mind-lift button
    // read the counter in the same page call that first sees the button: the rail keeps flying, so a ring or two may already be in a moment later
    { const lap = await (await page.waitForFunction(() => { const b = document.querySelector('#btn-lift'); return b && b.offsetParent !== null ? { count: document.querySelector('#count').textContent.trim(), icon: document.querySelector('#counter .star').textContent, phase: __dm.phase, rings: __dm.G.fl.items.filter(s => s.gold && s.g.visible).length, got: __dm.G.fl.got } : null; }, null, { timeout: 20000 })).jsonValue();
      check(lap.icon === '💫' && /^[0-2] \/ 8$/.test(lap.count) && lap.phase === 'fly' && lap.got >= 8 && lap.got <= 10 && lap.rings >= 6, `after the 8 stars a second lap begins: golden rings on the rail, ring counter restarts (${lap.count} ${lap.icon}, ${lap.rings} rings ahead)`); }
    await page.waitForTimeout(1200);
    { const b = await page.locator('#btn-lift').boundingBox(); check(b.height >= (dev.name === 'ipad' ? 72 : 44), `mind-lift button is a big touch target (${Math.round(b.width)}×${Math.round(b.height)})`); }
    await clearOfActors('flight lap 2 HUD'); await shot('10b-flight-rings');
    // prove it is the button and not the rail: press it while the next ring is still far ahead; the ring must be in well before Worm could fly there
    { const far = await (await page.waitForFunction(() => { const fl = __dm.G.fl, i = fl.items.findIndex(s => !s.got), r = fl.items[i]; if (!r || !r.gold) return null; const d = r.base.distanceTo(fl.pos); if (d < 18) return null;
        document.querySelector('#btn-lift').dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); return { i, d: Math.round(d), t: __dm.G.time }; }, null, { timeout: 30000 })).jsonValue();
      const dt = await (await page.waitForFunction(f => __dm.G.fl.items[f.i].got ? __dm.G.time - f.t : null, far, { timeout: 20000 })).jsonValue();
      check(dt < far.d / 8.5 * 0.7, `mind-lift pulled a ring ${far.d} m ahead to Worm in ${dt.toFixed(1)} s of game time (flying there takes ${(far.d / 8.5).toFixed(1)} s)`); }
    log('ok', 'the mind-lift button pulls the next ring to Worm (' + (await page.locator('#count').innerText()).trim() + ')'); await page.waitForTimeout(600); await shot('10c-mind-lift');
    await page.evaluate(() => __dm.collectAll());
    await advanceTo('celebrate'); await page.waitForTimeout(1200); await bubbleCap('ch1'); await shot('11-celebrate-sky');
    await page.locator('#card:not([hidden])').waitFor({ timeout: 15000 });
    check((await page.locator('#card').innerText()).includes('עוד פעם'), "celebration shows 'עוד פעם?'");
    check(await page.evaluate(() => { const r = document.querySelector('#card .panel').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }), 'card fits the screen');
    await shot('12-celebrate-card');
    await tap('#card button[data-v="end"]');
    await page.waitForFunction(() => window.__dm.phase === 'end'); await page.waitForTimeout(600); await shot('13-to-be-continued');
    await tap('#card button[data-v="home"]');
    await page.waitForFunction(() => window.__dm.mode === 'title', null, { timeout: 15000 });
    log('stats', JSON.stringify(await page.evaluate(() => __dm.stats())));

    // ---------------- chapter 2: הביצה המסתורית
    await page.waitForTimeout(1200);
    check(await page.evaluate(() => JSON.parse(localStorage.getItem('dm.progress')).done.includes(1)), 'progress saved in dm.progress');
    check(await page.locator('#ch-2.locked').count() === 0, 'chapter 2 unlocked after chapter 1');
    check(await page.locator('#ch-1.done').count() === 1 && (await page.locator('#ch-1 .ic').innerText()).includes('💚'), 'chapter 1 keepsake badge shown');
    check((await page.locator('#btn-continue').innerText()).includes('פרק 2'), 'continue now points at chapter 2');
    check(await page.evaluate(() => { const r = document.querySelector('.title-card').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth; }), 'title card fits the screen');
    await shot('ch2-01-title-unlocked');
    await tap('#ch-2');
    await advanceTo('c2-intro'); await page.waitForTimeout(1500);
    check((await page.locator('#dialog .name').innerText()).includes('וורם'), 'ch2 opens with Worm');
    await clearOfActors('ch2 cave dialog');
    await shot('ch2-02-cave');
    await advanceTo('c2-egg'); await page.waitForTimeout(4600); await shot('ch2-03-egg-rolls-in');
    await advanceTo('c2-ready'); await page.waitForTimeout(900); await shot('ch2-04-worm-curls');
    await tap('#btn-river');
    await advanceTo('c2-glide'); await page.waitForTimeout(5200);
    check(await page.locator('#counter').isVisible(), 'drop counter visible');
    await shot('ch2-05-river-glide');
    for (let i = 0; i < 2; i++) { await page.evaluate(() => __dm.collectNext()); await page.waitForTimeout(400); }
    await page.waitForTimeout(2300);
    const sum = (await page.locator('#count').innerText()).trim(); check(/^\d+ \+ 2 = \d+$/.test(sum), `pairs counter shows a sum (${sum})`);
    check(await page.evaluate(() => getComputedStyle(document.querySelector('#count')).direction === 'ltr'), 'sum is laid out ltr');
    await shot('ch2-06-river-pairs');
    // the long glide: ten pairs on the rail, a blue dragon (Shu) swimming below, and her splash button
    { const g = await page.evaluate(() => { const fl = __dm.G.fl, b = document.querySelector('#btn-splash'), r = b && b.getBoundingClientRect(); return { pairs: fl.items.length, len: Math.round(fl.len), speed: fl.speed, btn: !!b && b.offsetParent !== null, h: r ? Math.round(r.height) : 0, w: r ? Math.round(r.width) : 0, shu: __dm.ch2.debug().swim }; });
      check(g.pairs === 10 && g.len / g.speed >= 45 && g.len / g.speed <= 60, `river glide: ${g.pairs} pairs on a ${g.len} m rail, about ${Math.round(g.len / g.speed)} s of flying`);
      check(g.btn && g.h >= (dev.name === 'ipad' ? 72 : 44) && g.shu, `Shu swims below and her splash button is a big touch target (${g.w}×${g.h})`); await clearOfActors('river glide HUD with the splash button'); }
    // prove it is the button and not the rail: press while the next pair is still far ahead; it must be in well before Worm could fly there
    { const far = await (await page.waitForFunction(() => { const fl = __dm.G.fl, i = fl.items.findIndex(s => !s.got), r = fl.items[i]; if (!r) return null; const d = r.base.distanceTo(fl.pos); if (d < 18) return null;
        document.querySelector('#btn-splash').dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); return { i, d: Math.round(d), t: __dm.G.time }; }, null, { timeout: 30000 })).jsonValue();
      await page.waitForTimeout(250); await shot('ch2-06b-shu-splash');
      const dt = await (await page.waitForFunction(f => __dm.G.fl.items[f.i].got ? __dm.G.time - f.t : null, far, { timeout: 20000 })).jsonValue();
      check(dt < far.d / 8 * 0.7, `Shu's splash lifted a pair ${far.d} m ahead to Worm in ${dt.toFixed(1)} s of game time (flying there takes ${(far.d / 8).toFixed(1)} s)`); }
    await page.evaluate(() => __dm.collectAll());
    await advanceTo('c2-warm'); await page.waitForTimeout(1500); await shot('ch2-07-warm-egg');
    await advanceTo('c2-math'); await page.waitForTimeout(800);
    check(await solveBeat('c2-math', { firstWrong: true, shotName: 'ch2-08-riddle' }) === 2, 'the warm stones ask two riddles');
    await advanceTo('c2-place'); await page.waitForTimeout(1300); await shot('ch2-09-stones');
    for (let i = 0; i < 3; i++) { // real taps on the 3D stones
      const xy = await page.evaluate(() => __dm.stoneScreen()); check(!!xy, `stone ${i + 1} is on screen`);
      await page.mouse.click(xy[0], xy[1]); await page.waitForTimeout(1500);
    }
    await advanceTo('c2-hatch'); await page.waitForTimeout(1200);
    check((await page.locator('#count').innerText()).trim() === '5 / 5', 'all 5 stones placed by tapping');
    await advanceTo('c2-baby'); await page.waitForTimeout(1500);
    check((await page.locator('#dialog .name').innerText()).trim() === 'בועה', 'the baby dragon squeaks hello');
    await shot('ch2-10-hatched');
    await advanceTo('c2-bo');
    await page.waitForFunction(() => !document.querySelector('#dialog').hidden && document.querySelector('#dialog .name').textContent.trim() === 'בו', null, { timeout: 240000 });
    log('ok', 'Bo speaks'); await page.waitForTimeout(500);
    log('stats ch2 cave', JSON.stringify(await page.evaluate(() => __dm.stats())));
    await shot('ch2-11-bo-arrives');
    await advanceTo('c2-celebrate'); await page.waitForTimeout(1300); await bubbleCap('ch2'); await shot('ch2-12-celebrate');
    await page.locator('#card:not([hidden])').waitFor({ timeout: 15000 });
    check((await page.locator('#card').innerText()).includes('עוד פעם'), "ch2 celebration shows 'עוד פעם?'");
    check(await page.evaluate(() => { const r = document.querySelector('#card .panel').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }), 'ch2 card fits the screen');
    await shot('ch2-13-celebrate-card');
    await tap('#card button[data-v="end"]');
    await page.waitForFunction(() => window.__dm.phase === 'c2-end'); await page.waitForTimeout(1600);
    check((await page.locator('#card').innerText()).includes('המשך יבוא'), 'ch2 teaser card');
    await shot('ch2-14-mist-teaser');
    await tap('#card button[data-v="home"]');
    await page.waitForFunction(() => window.__dm.mode === 'title', null, { timeout: 15000 }); await page.waitForTimeout(1200);
    check((await page.locator('#ch-2 .ic').innerText()).includes('💧'), 'chapter 2 keepsake badge shown');
    check(JSON.stringify(await page.evaluate(() => __dm.progress)) === '[1,2]', 'progress is [1,2]');
    await shot('ch2-15-title-badges');

    // ---------------- chapter 3: השמש של אנה
    check(await page.locator('#ch-3.locked').count() === 0 && (await page.locator('#btn-continue').innerText()).includes('פרק 3'), 'chapter 3 unlocked after chapter 2, continue points at it');
    await tap('#btn-continue');
    await advanceTo('c3-intro'); await page.waitForTimeout(1500);
    check((await page.locator('#dialog .name').innerText()).includes('דרייק'), 'ch3 opens in the garden');
    await clearOfActors('ch3 garden dialog');
    await shot('ch3-01-garden');
    // 🏠 in the middle of a line must never strand the story: go home, continue, tap at once
    await tap('#btn-home'); await page.waitForFunction(() => window.__dm.mode === 'title', null, { timeout: 30000 }); await page.waitForTimeout(800);
    await tap('#btn-continue'); await page.waitForFunction(() => __dm.phase === 'c3-intro' && !document.querySelector('#dialog').hidden, null, { timeout: 60000 });
    await tap('#dialog'); await page.waitForTimeout(900);
    check(await page.locator('#dialog').isVisible(), 'after 🏠 mid-dialog and continue, the bubble is still there');
    for (const t0 = Date.now(); Date.now() - t0 < 240000;) { if ((await page.locator('#dialog .name').innerText().catch(() => '')).trim() === 'אנה') break; if (await page.locator('#dialog:not([hidden])').count()) await tap('#dialog'); await page.waitForTimeout(300); }
    await page.waitForTimeout(900); await shot('ch3-02-ana-arrives');
    await advanceTo('c3-cloud'); await page.waitForTimeout(5200); await shot('ch3-03-grumble-cloud');
    for (let i = 1; i <= 3; i++) {
      await advanceTo('c3-mirror' + i); await page.waitForTimeout(1500);
      if (i === 1) await shot('ch3-04-mirrors');
      let n = 0; while (await phase() === 'c3-mirror' + i && n < 12) { const xy = await page.evaluate(() => __dm.mirrorScreen()); if (!xy) break; await page.mouse.click(xy[0], xy[1]); n++; await page.waitForTimeout(700); if ((await page.evaluate(() => __dm.ch3.debug())).active < 0) break; }
      check(n >= 1 && n <= 8, `mirror ${i} turned into place with ${n} taps`);
      if (i === 1) { await page.waitForTimeout(1500); await shot('ch3-05-first-bed-blooms'); }
      if (i < 3) { await advanceTo('c3-math' + i); for (const t0 = Date.now(); Date.now() - t0 < 240000 && !(await cur());) { if (await page.locator('#dialog:not([hidden])').count()) await tap('#dialog'); await page.waitForTimeout(300); } // the cloud and Ana speak before the riddle opens
        check(await solveBeat('c3-math' + i, { firstWrong: i === 1, shotName: i === 1 ? 'ch3-06-cloud-riddle' : null }) === 1, `cloud riddle ${i} asked once`); }
    }
    // ---- the sunbeam flight with Kepri: a long rail flight through 12 light orbs, with her power button
    await advanceTo('c3-fly-ready'); await page.locator('#btn-sun-fly').waitFor({ state: 'visible', timeout: 20000 }); await page.waitForTimeout(600); await clearOfActors('ch3 fly button'); await tap('#btn-sun-fly');
    await page.waitForFunction(() => __dm.phase === 'c3-flight' && !!document.querySelector('#btn-sunbeam'), null, { timeout: 120000 }); await page.waitForTimeout(1200);
    { const g = await page.evaluate(() => { const fl = __dm.G.fl, r = document.querySelector('#btn-sunbeam').getBoundingClientRect(); return { orbs: fl.items.length, len: Math.round(fl.len), speed: fl.speed, w: Math.round(r.width), h: Math.round(r.height), flying: __dm.ch3.debug().flying, count: document.querySelector('#count').textContent.replace(/\s+/g, ' ').trim() }; });
      check(g.orbs === 12 && g.flying && g.len / g.speed >= 45 && g.len / g.speed <= 60, `sunbeam flight: ${g.orbs} light orbs on a ${g.len} m rail, about ${Math.round(g.len / g.speed)} s of flying with Kepri`);
      check(/^12( − \d+ = \d+)?$/.test(g.count), `the orb counter counts down as a subtraction (${g.count})`);
      check(g.h >= (dev.name === 'ipad' ? 72 : 44), `Kepri's sunbeam button is a big touch target (${g.w}×${g.h})`); await clearOfActors('sunbeam flight HUD'); await shot('ch3-06b-sunbeam-flight'); }
    { const far = await (await page.waitForFunction(() => { const fl = __dm.G.fl, i = fl.items.findIndex(s => !s.got), r = fl.items[i]; if (!r) return null; const d = r.base.distanceTo(fl.pos); if (d < 18) return null;
        document.querySelector('#btn-sunbeam').dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); return { i, d: Math.round(d), t: __dm.G.time }; }, null, { timeout: 30000 })).jsonValue();
      await page.waitForTimeout(250); await shot('ch3-06c-kepri-sunbeam');
      const dt = await (await page.waitForFunction(f => __dm.G.fl.items[f.i].got ? __dm.G.time - f.t : null, far, { timeout: 20000 })).jsonValue();
      check(dt < far.d / 8.5 * 0.7, `Kepri's sunbeam carried an orb ${far.d} m ahead to Worm in ${dt.toFixed(1)} s of game time (flying there takes ${(far.d / 8.5).toFixed(1)} s)`);
      const c = (await page.locator('#count').innerText()).replace(/\s+/g, ' ').trim(); check(/^12 − \d+ = \d+$/.test(c) && await page.evaluate(() => getComputedStyle(document.querySelector('#count')).direction === 'ltr'), `orb counter shows a subtraction, laid out ltr (${c})`); }
    await page.evaluate(() => __dm.collectAll());
    await advanceTo('c3-bloom', 300000); await page.waitForTimeout(1500); await shot('ch3-07-garden-blooms');
    await advanceTo('c3-celebrate'); await bubbleCap('ch3'); await page.locator('#card:not([hidden])').waitFor({ timeout: 30000 });
    check((await page.locator('#card').innerText()).includes('☀️'), 'ch3 celebration card with the sun keepsake');
    await shot('ch3-08-celebrate-card');
    log('stats ch3', JSON.stringify(await page.evaluate(() => __dm.stats())));
    await tap('#card button[data-v="end"]');
    await page.waitForFunction(() => window.__dm.phase === 'c3-end'); await page.waitForTimeout(800);
    check((await page.locator('#card').innerText()).includes('המשך יבוא'), 'ch3 teaser card');
    await shot('ch3-09-teaser');
    await tap('#card button[data-v="home"]');
    await page.waitForFunction(() => window.__dm.mode === 'title', null, { timeout: 15000 }); await page.waitForTimeout(1200);
    check((await page.locator('#ch-3 .ic').innerText()).includes('☀️') && JSON.stringify(await page.evaluate(() => __dm.progress)) === '[1,2,3]', 'chapter 3 keepsake badge shown, progress is [1,2,3]');
    await shot('ch3-10-title-badges');

    // ---------------- chapter 4: הלהבה של רורי
    check(await page.locator('#ch-4.locked').count() === 0 && (await page.locator('#btn-continue').innerText()).includes('פרק 4'), 'chapter 4 unlocked after chapter 3, continue points at it');
    await tap('#btn-continue');
    await advanceTo('c4-intro'); await page.waitForTimeout(1500);
    await clearOfActors('ch4 dialog'); await shot('ch4-01-lawn');
    // 🏠 in the middle of a line, then continue and tap at once
    await tap('#btn-home'); await page.waitForFunction(() => window.__dm.mode === 'title', null, { timeout: 30000 }); await page.waitForTimeout(800);
    await tap('#btn-continue'); await page.waitForFunction(() => __dm.phase === 'c4-intro' && !document.querySelector('#dialog').hidden, null, { timeout: 60000 });
    await tap('#dialog'); await page.waitForTimeout(900);
    check(await page.locator('#dialog').isVisible(), 'ch4: after 🏠 mid-dialog and continue, the bubble is still there');
    for (const t0 = Date.now(); Date.now() - t0 < 240000;) { if ((await page.locator('#dialog .name').innerText().catch(() => '')).trim() === 'וולקן') break; if (await page.locator('#dialog:not([hidden])').count()) await tap('#dialog'); await page.waitForTimeout(300); }
    await page.waitForTimeout(900); await shot('ch4-02-vulcan-hiccups');
    for (let r = 1; r <= 2; r++) {
      await advanceTo('c4-catch' + r); await page.waitForTimeout(2500);
      if (r === 1) { check(await page.locator('#counter').isVisible(), 'loaf counter visible'); await shot('ch4-03-fireballs'); }
      let n = 0; for (const t0 = Date.now(); Date.now() - t0 < 240000 && await phase() === 'c4-catch' + r;) { const xy = await page.evaluate(() => __dm.fireballScreen()); if (xy) { await page.mouse.click(xy[0], xy[1]); n++; } await page.waitForTimeout(450); }
      check(n >= 1, `round ${r}: fireballs baked by tapping (${n} taps)`);
      if (r === 1) await shot('ch4-04-first-row');
      await advanceTo('c4-math' + r); for (const t0 = Date.now(); Date.now() - t0 < 240000 && !(await cur());) { if (await page.locator('#dialog:not([hidden])').count()) await tap('#dialog'); await page.waitForTimeout(300); }
      check(await solveBeat('c4-math' + r, { firstWrong: r === 1, shotName: r === 1 ? 'ch4-05-loaf-riddle' : null }) === 1, `loaf riddle ${r} asked once`);
    }
    check((await page.locator('#count').innerText()).trim() === '10 / 10', 'ten loaves on the table');
    await advanceTo('c4-breathe'); await page.waitForTimeout(2500); await shot('ch4-06-breathing');
    await advanceTo('c4-feast'); await page.waitForTimeout(1200); await shot('ch4-07-feast');
    await advanceTo('c4-celebrate'); await bubbleCap('ch4'); await page.locator('#card:not([hidden])').waitFor({ timeout: 30000 });
    check((await page.locator('#card').innerText()).includes('גחלת'), 'ch4 celebration card with the ember keepsake');
    await shot('ch4-08-celebrate-card');
    log('stats ch4', JSON.stringify(await page.evaluate(() => __dm.stats())));
    await tap('#card button[data-v="end"]');
    await page.waitForFunction(() => window.__dm.phase === 'c4-end'); await page.waitForTimeout(800);
    check((await page.locator('#card').innerText()).includes('קריסטלים'), 'ch4 teaser about the crystal caves');
    await shot('ch4-09-teaser');
    await tap('#card button[data-v="home"]');
    await page.waitForFunction(() => window.__dm.mode === 'title', null, { timeout: 15000 }); await page.waitForTimeout(1200);
    check((await page.locator('#ch-4 .ic').innerText()).includes('🔥') && JSON.stringify(await page.evaluate(() => __dm.progress)) === '[1,2,3,4]', 'chapter 4 keepsake badge shown, progress is [1,2,3,4]');
    await shot('ch4-10-title-badges');

    // ---------------- chapter 5: מערת הקריסטלים של פטרה
    check(await page.locator('#ch-5.locked').count() === 0 && (await page.locator('#btn-continue').innerText()).includes('פרק 5'), 'chapter 5 unlocked after chapter 4, continue points at it');
    await tap('#btn-continue');
    await advanceTo('c5-intro'); await page.waitForTimeout(1500);
    await clearOfActors('ch5 dialog'); await shot('ch5-01-echo');
    await tap('#btn-home'); await page.waitForFunction(() => window.__dm.mode === 'title', null, { timeout: 30000 }); await page.waitForTimeout(800);
    await tap('#btn-continue'); await page.waitForFunction(() => __dm.phase === 'c5-intro' && !document.querySelector('#dialog').hidden, null, { timeout: 60000 });
    await tap('#dialog'); await page.waitForTimeout(900);
    check(await page.locator('#dialog').isVisible(), 'ch5: after 🏠 mid-dialog and continue, the bubble is still there');
    for (const t0 = Date.now(); Date.now() - t0 < 240000;) { if ((await page.locator('#dialog .name').innerText().catch(() => '')).trim() === 'פטרה') break; if (await page.locator('#dialog:not([hidden])').count()) await tap('#dialog'); await page.waitForTimeout(300); }
    await page.waitForTimeout(900); await shot('ch5-02-petra');
    for (let n = 1; n <= 3; n++) {
      await advanceTo('c5-pattern' + n); await page.waitForFunction(() => __dm.ch5.debug().active, null, { timeout: 240000 }); await page.waitForTimeout(600);
      await shot('ch5-0' + (n + 2) + '-pattern' + n);
      if (n === 1) { // a wrong crystal only wobbles and brings a hint
        const w = await page.evaluate(() => __dm.crystalScreen(true)); await page.mouse.click(w[0], w[1]); await page.waitForTimeout(500);
        check(await page.evaluate(() => { const d = __dm.ch5.debug(); return d.active && d.misses === 1 && d.next === 4; }) && await phase() === 'c5-pattern1', 'a wrong crystal does not punish or advance');
      }
      let taps = 0; for (const t0 = Date.now(); Date.now() - t0 < 240000 && await phase() === 'c5-pattern' + n;) { const xy = await page.evaluate(() => __dm.crystalScreen()); if (xy) { await page.mouse.click(xy[0], xy[1]); taps++; } await page.waitForTimeout(600); }
      check(taps >= 2, `pattern ${n} completed by tapping crystals (${taps} taps)`);
      if (n < 3) { await advanceTo('c5-math' + n); for (const t0 = Date.now(); Date.now() - t0 < 240000 && !(await cur());) { if (await page.locator('#dialog:not([hidden])').count()) await tap('#dialog'); await page.waitForTimeout(300); }
        check(await solveBeat('c5-math' + n, { firstWrong: n === 1, shotName: n === 1 ? 'ch5-06-crystal-riddle' : null }) === 1, `crystal riddle ${n} asked once`); }
    }
    await advanceTo('c5-friend'); await page.waitForTimeout(2500); await shot('ch5-07-shy-dragon');
    await advanceTo('c5-celebrate'); await bubbleCap('ch5'); await page.locator('#card:not([hidden])').waitFor({ timeout: 60000 });
    check((await page.locator('#card').innerText()).includes('קריסטל קשת'), 'ch5 celebration card with the rainbow crystal keepsake');
    await shot('ch5-08-celebrate-card');
    log('stats ch5', JSON.stringify(await page.evaluate(() => __dm.stats())));
    await tap('#card button[data-v="end"]');
    await page.waitForFunction(() => window.__dm.phase === 'c5-end'); await page.waitForTimeout(800);
    check((await page.locator('#card').innerText()).includes('הצבעים נעלמים'), 'ch5 teaser about the vanishing colours');
    await shot('ch5-09-teaser');
    await tap('#card button[data-v="home"]');
    await page.waitForFunction(() => window.__dm.mode === 'title', null, { timeout: 15000 }); await page.waitForTimeout(1200);
    check((await page.locator('#ch-5 .ic').innerText()).includes('💎') && JSON.stringify(await page.evaluate(() => __dm.progress)) === '[1,2,3,4,5]', 'chapter 5 keepsake badge shown, progress is [1,2,3,4,5]');
    await shot('ch5-10-title-badges');

    // ---------------- chapter 6: הענן הרטנן
    check(await page.locator('#ch-6.locked').count() === 0 && (await page.locator('#btn-continue').innerText()).includes('פרק 6'), 'chapter 6 unlocked after chapter 5, continue points at it');
    await tap('#btn-continue');
    await advanceTo('c6-intro'); await page.waitForTimeout(1500);
    await clearOfActors('ch6 dialog'); await shot('ch6-01-grey-flowers');
    await tap('#btn-home'); await page.waitForFunction(() => window.__dm.mode === 'title', null, { timeout: 30000 }); await page.waitForTimeout(800);
    await tap('#btn-continue'); await page.waitForFunction(() => __dm.phase === 'c6-intro' && !document.querySelector('#dialog').hidden, null, { timeout: 60000 });
    await tap('#dialog'); await page.waitForTimeout(900);
    check(await page.locator('#dialog').isVisible(), 'ch6: after 🏠 mid-dialog and continue, the bubble is still there');
    await advanceTo('c6-fly-ready'); await page.locator('#btn-team').waitFor({ timeout: 60000 }); await tap('#btn-team');
    await advanceTo('c6-flight'); await page.waitForTimeout(4500);
    check(await page.locator('#counter').isVisible() && !(await page.locator('#arrow').isVisible()), 'ch6 team flight: counter, no arrow');
    await shot('ch6-02-team-flight');
    await page.waitForFunction(() => __dm.G.fl.got >= 2, null, { timeout: 240000 }); await page.waitForTimeout(900);
    check(/^\d × 2 = \d+$/.test((await page.locator('#count').innerText()).replace(/\s+/g, ' ').trim()), 'puff pairs are counted in equal groups (n × 2)');
    await shot('ch6-03-puff-pairs');
    await advanceTo('c6-flight-done', 300000); check((await page.locator('#count').innerText()).replace(/\s+/g, ' ').trim() === '6 × 2 = 12', 'six pairs: 6 × 2 = 12 (rail flight collected all without input)');
    for (let n = 1; n <= 2; n++) {
      await advanceTo('c6-pots' + n); await page.waitForFunction(() => __dm.potScreen(), null, { timeout: 240000 }); await page.waitForTimeout(700);
      if (n === 1) await shot('ch6-04-paint-pots');
      let taps = 0; for (const t0 = Date.now(); Date.now() - t0 < 240000 && await phase() === 'c6-pots' + n;) { const xy = await page.evaluate(() => __dm.potScreen()); if (xy) { await page.mouse.click(xy[0], xy[1]); taps++; } await page.waitForTimeout(700); }
      check(taps >= 2, `pots round ${n} filled by tapping (${taps} taps)`);
      if (n === 1) check((await page.locator('#count').innerText()).trim() === '5 + 5 = 10', 'pots count by fives');
      await advanceTo('c6-math' + n); for (const t0 = Date.now(); Date.now() - t0 < 240000 && !(await cur());) { if (await page.locator('#dialog:not([hidden])').count()) await tap('#dialog'); await page.waitForTimeout(300); }
      check(await solveBeat('c6-math' + n, { firstWrong: n === 1, shotName: n === 1 ? 'ch6-05-colour-riddle' : null }) === 1, `colour riddle ${n} asked once`);
    }
    await advanceTo('c6-sad'); await page.waitForFunction(() => !document.querySelector('#dialog').hidden && document.querySelector('#dialog').dataset.who === 'cloud', null, { timeout: 240000 }); await page.waitForTimeout(1800);
    await shot('ch6-06-sad-cloud');
    await advanceTo('c6-celebrate'); await bubbleCap('ch6'); await page.locator('#card:not([hidden])').waitFor({ timeout: 60000 });
    check((await page.locator('#card').innerText()).includes('נוצת מכחול'), 'ch6 celebration card with the paintbrush feather keepsake');
    await shot('ch6-07-celebrate-card');
    log('stats ch6', JSON.stringify(await page.evaluate(() => __dm.stats())));
    await tap('#card button[data-v="end"]');
    await page.waitForFunction(() => window.__dm.phase === 'c6-end'); await page.waitForTimeout(800);
    check((await page.locator('#card').innerText()).includes('הר הקשת'), 'ch6 teaser about Rainbow Mountain');
    await shot('ch6-08-teaser');
    await tap('#card button[data-v="home"]');
    await page.waitForFunction(() => window.__dm.mode === 'title', null, { timeout: 15000 }); await page.waitForTimeout(1200);
    check((await page.locator('#ch-6 .ic').innerText()).includes('🖌️') && JSON.stringify(await page.evaluate(() => __dm.progress)) === '[1,2,3,4,5,6]', 'chapter 6 keepsake badge shown, progress is [1,2,3,4,5,6]');
    await shot('ch6-09-title-badges');
    // ---- tap-to-skip: a tap closes a title card; ⏭ shows during dialogs and scripted moves and jumps to the next thing the player does
    await page.evaluate(() => __dm.go('ch6')); await page.locator('#card:not([hidden])').waitFor({ timeout: 60000 });
    await page.evaluate(() => document.querySelector('#card').dispatchEvent(new PointerEvent('pointerup', { bubbles: true })));
    check(await page.evaluate(() => document.querySelector('#card').hidden), 'a tap skips the chapter title card');
    await page.waitForFunction(() => __dm.phase === 'c6-intro' && !document.querySelector('#dialog').hidden && !document.querySelector('#btn-skip').hidden, null, { timeout: 60000 }); await page.waitForTimeout(700);
    { const r = await page.evaluate(() => { const b = document.querySelector('#btn-skip').getBoundingClientRect(), d = document.querySelector('#dialog').getBoundingClientRect(); return { size: Math.min(b.width, b.height), overlap: !(b.right <= d.left || b.left >= d.right || b.bottom <= d.top || b.top >= d.bottom) }; });
      check(r.size >= 44 && !r.overlap, `⏭ is visible during a dialog and does not touch the bubble (${Math.round(r.size)} px)`); await clearOfActors('skip button during a dialog'); await shot('skip-button'); }
    await page.evaluate(() => document.querySelector('#btn-skip').dispatchEvent(new PointerEvent('pointerup', { bubbles: true })));
    await page.waitForFunction(() => __dm.phase === 'c6-fly-ready' && !!document.querySelector('#btn-team'), null, { timeout: 20000 });
    // normal speed returns on the next frame after the button appears, so wait for it rather than sampling the same instant
    check(await page.waitForFunction(() => document.querySelector('#dialog').hidden && document.querySelector('#btn-skip').hidden && !__dm.fast, null, { timeout: 10000 }).then(() => true, () => false), '⏭ jumps past the talking to the "fly together" button, then hides and normal speed returns');
    await page.evaluate(() => __dm.go('title')); await page.waitForFunction(() => window.__dm.mode === 'title', null, { timeout: 15000 }); await page.evaluate(() => __dm.bubbles());
    // ---- no read-aloud anywhere
    check(await page.evaluate(() => window.__speech === 0), 'no speechSynthesis use');
    for (const f of ['src/audio.js', 'src/ui.js', 'src/main.js']) check(!/speechSynthesis|SpeechSynthesisUtterance/.test(await (await page.request.get(base + f)).text()), `${f} has no speech code`);
    check(bubbleChecks > 60, `never more than one bubble or banner on screen (${bubbleChecks} checks across chapters 1-6)`);
    { const f = await page.evaluate(() => ({ ...__dm.frameStats, watchdog: __dm.watchdog })); log('frames', JSON.stringify(f)); check(f.watchdog === 0, 'the story watchdog never had to nudge'); }
    check(errors.length === 0, 'no console/page/network errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
    ok = true;
  } catch (e) {
    console.error(`[${engineName} ${dev.name}] FAIL`, e.message); if (errors.length) console.error(errors.join('\n'));
    // what the page was doing when it failed (to tell a starved browser from a real hang)
    try { console.error(`[${engineName} ${dev.name}] state`, JSON.stringify(await page.evaluate(async () => { const G = __dm.G, t0 = G.time, f0 = { ...__dm.frameStats }; let iv = 0; const h = setInterval(() => iv++, 100); await new Promise(r => setTimeout(r, 3000)); clearInterval(h);
      const d = document.querySelector('#dialog'); return { phase: __dm.phase, mode: G.mode, gameClock3s: +(G.time - t0).toFixed(2), raf3s: __dm.frameStats.raf - f0.raf, fallback3s: __dm.frameStats.fallback - f0.fallback, timers3s: iv, frames: __dm.frameStats, watchdog: __dm.watchdog,
        dialog: d.hidden ? null : d.querySelector('.text').textContent, playerTurn: !!G.playerTurn, ch2: __dm.ch2.debug(), ch3: __dm.ch3.debug(), hidden: document.hidden }; }))); } catch (e2) { console.error('state unavailable:', e2.message.split('\n')[0]); }
    try { await page.screenshot({ path: join(shotDir, `fail-${dev.name}.png`) }); } catch { }
  }
  await ctx.close();
  console.log(ok ? `SMOKE PASS (${engineName} ${dev.name})` : `SMOKE FAIL (${engineName} ${dev.name})`);
  return ok;
}
let all = true;
for (const dev of DEVICES) all = (await run(dev)) && all;
await browser.close(); server && server.close();
console.log(all ? `SMOKE PASS (${engineName})` : `SMOKE FAIL (${engineName})`); process.exit(all ? 0 : 1);
