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
  page.on('requestfailed', r => errors.push('requestfailed: ' + r.url()));
  page.on('response', r => { if (r.status() >= 400) errors.push(`http ${r.status()}: ${r.url()}`); });
  const log = (...a) => console.log(`[${engineName} ${dev.name}]`, ...a);
  const phase = () => page.evaluate(() => window.__dm?.phase);
  const shot = async name => { if (shots) await page.screenshot({ path: join(shotDir, `${dev.name}-${name}.png`), scale: 'css' }); log('shot', name); };
  const tap = sel => page.locator(sel).first().dispatchEvent('pointerup');
  async function advanceTo(target, timeout = 240000) { // generous: a loaded software-rendering test machine runs the game in slow motion
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      const p = await phase(); if (p === target) return;
      if (await page.locator('#dialog:not([hidden])').count()) await tap('#dialog');
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
      if (!c || c.key === lastKey) { await page.waitForTimeout(250); continue; }
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
    check(await page.locator('#ch-3 .soon').isVisible(), 'unbuilt chapters say בקרוב');
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
    check(JSON.stringify(await page.evaluate(() => __dm.math.state())) === '{"level":2,"ceiling":2,"auto":true}', 'default riddle level is 2 with auto-adapt on');
    await page.locator('#p-levels button[data-l="4"]').dispatchEvent('pointerup'); await page.waitForTimeout(200);
    await shot('00-parent-panel');
    await tap('#p-close'); check(!(await page.locator('#parent').isVisible()), 'parent panel closes');
    await load();
    check(JSON.stringify(await page.evaluate(() => JSON.parse(localStorage.getItem('dm.progress')).math)) === '{"level":4,"auto":true,"ceiling":4}', 'level 4 survives a reload in dm.progress');
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
    check((await page.locator('#btn-continue').innerText()).includes('פרק 1'), 'continue button starts chapter 1 on a fresh save');
    await tap('#btn-continue');
    await advanceTo('cave-intro'); await page.waitForTimeout(1600);
    check(await page.locator('#dialog').isVisible(), 'Griffith dialogue visible');
    check((await page.locator('#dialog .name').innerText()).includes("גריפית'"), 'speaker is גריפית\'');
    await clearOfActors('cave dialog');
    await shot('02-cave-dialog');
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
    await page.evaluate(() => __dm.collectAll());
    await advanceTo('celebrate'); await page.waitForTimeout(1200); await shot('11-celebrate-sky');
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
    await advanceTo('c2-celebrate'); await page.waitForTimeout(1300); await shot('ch2-12-celebrate');
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
    // ---- no read-aloud anywhere
    check(await page.evaluate(() => window.__speech === 0), 'no speechSynthesis use');
    for (const f of ['src/audio.js', 'src/ui.js', 'src/main.js']) check(!/speechSynthesis|SpeechSynthesisUtterance/.test(await (await page.request.get(base + f)).text()), `${f} has no speech code`);
    check(errors.length === 0, 'no console/page/network errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
    ok = true;
  } catch (e) {
    console.error(`[${engineName} ${dev.name}] FAIL`, e.message); if (errors.length) console.error(errors.join('\n'));
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
