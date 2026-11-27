// Diagnostic soak test for the chapter 2 cave (no gameplay changes): plays the cave beats in a loop the way the smoke
// test does and, when nothing changes for STALL_S seconds, records what the page is doing.
// Usage: node soak.mjs [baseURL] [--loops=10] [--device=iphone|ipad] [--stall=40] [--chapter=2|3|4|5|6]
// --chapter=3 plays the garden and presses 🏠 mid-dialog in every loop (a bubble must never be stranded).
import { webkit, devices } from 'playwright'; import { startServer } from './serve.mjs';
import { fileURLToPath } from 'node:url'; import { dirname, join } from 'node:path';
const root = join(dirname(fileURLToPath(import.meta.url)), '..'); const args = process.argv.slice(2);
const opt = (k, d) => args.find(a => a.startsWith(`--${k}=`))?.split('=')[1] ?? d;
const LOOPS = +opt('loops', 10), STALL_S = +opt('stall', 40), dev = opt('device', 'iphone'); let base = args.find(a => /^https?:/.test(a)), server;
if (!base) { const s = await startServer(root); server = s.server; base = `http://127.0.0.1:${s.port}/`; }
const ctxo = dev === 'ipad' ? { ...devices['iPad Pro 11 landscape'], viewport: { width: 1180, height: 820 }, deviceScaleFactor: 1 } : { ...devices['iPhone 13 landscape'], viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 };
const b = await webkit.launch(); const ctx = await b.newContext(ctxo);
await ctx.addInitScript(() => { // instrumentation only: count timers, frames and pointer events
  const T = window.__soak = { timers: new Map(), raf: 0, ptr: [], fired: 0 };
  const st = window.setTimeout, ct = window.clearTimeout, raf = window.requestAnimationFrame;
  window.setTimeout = (fn, ms = 0, ...a) => { const id = st(() => { T.timers.delete(id); T.fired++; typeof fn === 'function' && fn(...a); }, ms); T.timers.set(id, { ms, at: performance.now() }); return id; };
  window.clearTimeout = id => { T.timers.delete(id); return ct(id); };
  window.requestAnimationFrame = cb => raf(t => { T.raf++; cb(t); });
  addEventListener('pointerup', e => { T.ptr.push([e.target.id || e.target.className || e.target.tagName, e.isTrusted, Math.round(performance.now())]); if (T.ptr.length > 30) T.ptr.shift(); }, true);
});
const page = await ctx.newPage(); const errors = [];
const T0 = Date.now(), stamp = () => `+${((Date.now() - T0) / 1000).toFixed(0)}s`;
page.on('crash', () => console.log(`  !! PAGE CRASHED (web process died) at ${stamp()}`)); page.on('close', () => console.log(`  !! page closed at ${stamp()}`)); b.on('disconnected', () => console.log(`  !! BROWSER DISCONNECTED at ${stamp()}`));
page.on('pageerror', e => errors.push('pageerror: ' + e.message + ' @ ' + (e.stack || '').split('\n').slice(0, 4).join(' < ').replace(/https?:\/\/[^/]+\//g, '')));
page.on('console', m => m.type() === 'error' && errors.push('console: ' + m.text()));
await page.goto(base + 'index.html?tier=high&all=1'); await page.waitForFunction(() => window.__dm?.ready, null, { timeout: 120000 });
if (opt('chapter', '') === 'free') { // free flight: fly, leave with 🏠, again; GPU counters must stay flat and the counter must keep rising
  let bad = 0, first = null;
  for (let i = 1; i <= LOOPS; i++) {
    const t0 = Date.now(); await page.evaluate(() => __dm.go('free')); await page.waitForFunction(() => __dm.phase === 'free' && __dm.free.debug().flying, null, { timeout: 120000 });
    let n = 0, last = Date.now(), stalled = false; while (Date.now() - t0 < 60000) { const c = await page.evaluate(() => __dm.free.debug().count); if (c > n) { n = c; last = Date.now(); } if (Date.now() - last > STALL_S * 1000) { stalled = true; break; } await page.waitForTimeout(500); }
    await page.locator('#btn-home').dispatchEvent('pointerup'); const home = await page.waitForFunction(() => __dm.mode === 'title', null, { timeout: 60000 }).then(() => true, () => false);
    const mem = await page.evaluate(() => { const r = __dm.engine.renderer.info; return { geo: r.memory.geometries, tex: r.memory.textures, prog: r.programs.length, tweens: __dm.G.tweenCount(), best: __dm.free.debug().best }; });
    if (i === 2) first = mem; const grew = first && i > 2 && (mem.geo > first.geo || mem.tex > first.tex || mem.prog > first.prog);
    const ok = !stalled && home && n >= 10 && !grew && !errors.length; if (!ok) bad++;
    console.log(`loop ${i}: ${ok ? 'ok' : 'FAIL'} collected ${n} in 60 s, home ${home}, geometries ${mem.geo} textures ${mem.tex} programs ${mem.prog} tweens ${mem.tweens} best ${mem.best}${grew ? ' GPU counters grew' : ''}${errors.length ? ' errors: ' + errors.splice(0).join(' | ') : ''}`);
  }
  console.log(`SOAK DONE: ${LOOPS} loops, ${bad} stalls, ${((Date.now() - T0) / 60000).toFixed(1)} min`); await b.close(); server && server.close(); process.exit(bad ? 1 : 0);
}
const sig = () => page.evaluate(() => { const d = document.querySelector('#dialog'), c = __dm.math.current(); return [__dm.phase, d.hidden ? '' : d.querySelector('.text').textContent, c ? c.key : '', document.querySelector('#count').textContent, document.querySelector('#card').hidden ? '' : 'card', document.querySelector('#actions').children.length].join('|'); });
async function diagnose(label) {
  const d = await page.evaluate(async () => {
    const T = window.__soak, G = __dm.G, t0 = G.time, r0 = T.raf, f0 = T.fired, now = performance.now(); let tick = 0; const iv = setInterval(() => tick++, 100);
    await new Promise(r => setTimeout(r, 2000)); clearInterval(iv);
    const dlg = document.querySelector('#dialog');
    return { phase: __dm.phase, mode: G.mode, hidden: document.hidden, vis: document.visibilityState, focus: document.hasFocus(),
      gameClock2s: +(G.time - t0).toFixed(2), raf2s: T.raf - r0, timersFired2s: T.fired - f0, interval2s: tick,
      pendingTimers: [...T.timers.values()].map(x => `${x.ms}ms@+${Math.round(now - x.at)}`).slice(0, 12), overdue: [...T.timers.values()].filter(x => now - x.at > x.ms + 1500).length,
      dialog: dlg.hidden ? null : { who: dlg.dataset.who, text: dlg.querySelector('.text').textContent }, math: __dm.math.current(), count: document.querySelector('#count').textContent,
      card: !document.querySelector('#card').hidden, actions: [...document.querySelector('#actions').children].map(x => x.id), fade: document.querySelector('#fade').classList.contains('on'),
      ch2: __dm.ch2.debug(), ch3: __dm.ch3.debug(), ch4: __dm.ch4.debug(), ch5: __dm.ch5.debug(), ch6: __dm.ch6.debug(), ch2later: await new Promise(r => setTimeout(() => r(__dm.ch2.debug().tweens), 1000)), tickCalls1s: await new Promise(r => { const o = G.tick; let n = 0; if (!o) return r(-1); const w = (...a) => { n++; return o(...a); }; G.tick = w; setTimeout(() => { if (G.tick === w) G.tick = o; r(n); }, 1000); }),
      tick: !!G.tick, tap: !!G.tap, camGoal: !!G.camGoal, busy: G.busy, stone: __dm.stoneScreen(), lastPointer: T.ptr.slice(-4) };
  });
  console.log(`  STALL at ${label}: ` + JSON.stringify(d));
  if (d.dialog) { // is a tap on the dialog received, and does it advance?
    const before = await sig(); await page.locator('#dialog').dispatchEvent('pointerup'); await page.waitForTimeout(800); const a1 = await sig();
    let a2 = a1; if (a1 === before) { const bb = await page.locator('#dialog .next').boundingBox(); if (bb) { await page.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); await page.waitForTimeout(800); a2 = await sig(); } }
    console.log(`  recovery: synthetic pointerup ${a1 !== before ? 'ADVANCED' : 'did nothing'}; real touch tap ${a1 !== before ? 'n/a' : a2 !== before ? 'ADVANCED' : 'did nothing'}; pointer log ${JSON.stringify(await page.evaluate(() => window.__soak.ptr.slice(-4)))}`);
  }
  return d;
}
let stalls = 0;
// drive like the smoke test: tap any open dialog every 250 ms; `act` handles riddles, stones and buttons; stop at `until`
async function drive(label, until, act = async () => { }) {
  let last = await sig(), lastChange = Date.now();
  for (;;) {
    const ph = await page.evaluate(() => __dm.phase); if (until(ph)) return true;
    if (await page.locator('#dialog:not([hidden])').count()) await page.locator('#dialog').dispatchEvent('pointerup');
    await act(ph); await page.waitForTimeout(250);
    const s = await sig(); if (s !== last) { last = s; lastChange = Date.now(); }
    if (Date.now() - lastChange > STALL_S * 1000) { stalls++; await diagnose(`${label} (${ph})`); return false; }
  }
}
const t00 = Date.now(), CH = +opt('chapter', 2);
// chapter 3: every loop presses 🏠 in the middle of a line, continues, taps at once, then plays the garden through
if (CH >= 3) for (let i = 1; i <= LOOPS; i++) { try {
  const t0 = Date.now(); let ok = true, taps = 0, lastTap = 0, note = '';
  await page.evaluate(c => __dm.go('ch' + c), CH);
  ok = await drive(`loop ${i} ch${CH} intro`, p => p === (CH === 3 && i % 2 ? 'c3-cloud' : `c${CH}-intro`));
  if (ok) { await page.waitForFunction(() => !document.querySelector('#dialog').hidden, null, { timeout: 60000 }).catch(() => { note += ' (no bubble before home)'; });
    await page.locator('#btn-home').dispatchEvent('pointerup'); await page.waitForFunction(() => __dm.mode === 'title', null, { timeout: 60000 });
    await page.locator('#btn-continue').dispatchEvent('pointerup');
    await page.waitForFunction(() => !document.querySelector('#dialog').hidden && __dm.mode !== 'title', null, { timeout: 60000 });
    await page.locator('#dialog').dispatchEvent('pointerup'); await page.waitForTimeout(700);                 // the early tap that used to hide the new bubble
    if (!(await page.locator('#dialog:not([hidden])').count())) { note += ' BUBBLE HIDDEN AFTER HOME+CONTINUE'; stalls++; }
    ok = await drive(`loop ${i} ch${CH} play`, p => p === `c${CH}-celebrate`, async ph => {
      if (/^c6-pots/.test(ph) && Date.now() - lastTap > 700) { const xy = await page.evaluate(() => __dm.potScreen()); if (xy) { await page.mouse.click(xy[0], xy[1]); taps++; lastTap = Date.now(); } }
      if (ph === 'c6-fly-ready') await page.locator('#btn-team').dispatchEvent('pointerup').catch(() => { });
      if (ph === 'c3-fly-ready') await page.locator('#btn-sun-fly').dispatchEvent('pointerup').catch(() => { });
      if (ph === 'c4-fly-ready') await page.locator('#btn-fire-fly').dispatchEvent('pointerup').catch(() => { });
      if (ph === 'c5-fly-ready') await page.locator('#btn-tunnel-fly').dispatchEvent('pointerup').catch(() => { });
      if (ph === 'c7-fly-ready') await page.locator('#btn-trail-fly').dispatchEvent('pointerup').catch(() => { });
      if (/^c5-pattern/.test(ph) && Date.now() - lastTap > 600) { const xy = await page.evaluate(() => __dm.crystalScreen()); if (xy) { await page.mouse.click(xy[0], xy[1]); taps++; lastTap = Date.now(); } }
      if (/^c4-catch/.test(ph) && Date.now() - lastTap > 450) { const xy = await page.evaluate(() => __dm.fireballScreen()); if (xy) { await page.mouse.click(xy[0], xy[1]); taps++; lastTap = Date.now(); } }
      if (/^c\d-math/.test(ph)) { const c = await page.evaluate(() => __dm.math.current()); if (c) { await page.waitForTimeout(300); await page.locator(`#math .m-answers button[data-v="${c.answer}"]`).dispatchEvent('pointerup').catch(() => { }); await page.waitForTimeout(400); } }
      if (/^c3-mirror/.test(ph) && Date.now() - lastTap > 700) { const xy = await page.evaluate(() => __dm.mirrorScreen()); if (xy) { await page.mouse.click(xy[0], xy[1]); taps++; lastTap = Date.now(); } }
    }); }
  const fr = await page.evaluate(() => JSON.stringify({ ...__dm.frameStats, watchdog: __dm.watchdog })).catch(() => '');
  console.log(`loop ${i}: ${ok ? 'ok' : 'STALLED'}${note} frames ${fr} in ${((Date.now() - t0) / 1000).toFixed(0)}s, taps ${taps}${errors.length ? ', errors: ' + errors.splice(0).join(' | ') : ''}`);
} catch (e) { console.log(`loop ${i}: EXCEPTION at ${stamp()}: ${e.message.split('\n')[0]}`); break; } }
else for (let i = 1; i <= LOOPS; i++) { try {
  const t0 = Date.now(); let ok = true, taps = 0, lastTap = 0;
  await page.evaluate(() => __dm.go('ch2'));
  ok = await drive(`loop ${i} intro`, p => p === 'c2-ready');
  if (ok) { await page.evaluate(() => __dm.go('ch2-warm'));
    ok = await drive(`loop ${i} warm→celebrate`, p => p === 'c2-celebrate', async ph => {
      if (ph === 'c2-math') { const c = await page.evaluate(() => __dm.math.current()); if (c) { await page.waitForTimeout(300); await page.locator(`#math .m-answers button[data-v="${c.answer}"]`).dispatchEvent('pointerup').catch(() => { }); await page.waitForTimeout(400); } }
      if (ph === 'c2-place' && Date.now() - lastTap > 1500) { const xy = await page.evaluate(() => __dm.stoneScreen()); if (xy) { await page.mouse.click(xy[0], xy[1]); taps++; lastTap = Date.now(); } }
    }); }
  const mem = await page.evaluate(() => { const i = __dm.engine.renderer.info; return `geometries ${i.memory.geometries} textures ${i.memory.textures} programs ${i.programs.length} timers ${window.__soak.timers.size} dom ${document.getElementsByTagName('*').length}`; }).catch(e => 'n/a: ' + e.message.split('\n')[0]);
  const fr = await page.evaluate(() => JSON.stringify({ ...__dm.frameStats, watchdog: __dm.watchdog })).catch(() => '');
  console.log(`loop ${i}: ${ok ? 'ok' : 'STALLED'} [${mem}] frames ${fr} in ${((Date.now() - t0) / 1000).toFixed(0)}s, stone taps ${taps}${taps > 3 ? ' (MORE THAN 3 NEEDED)' : ''}${errors.length ? ', errors: ' + errors.splice(0).join(' | ') : ''}`);
} catch (e) { console.log(`loop ${i}: EXCEPTION at ${stamp()}: ${e.message.split('\n')[0]}`); break; } }
console.log(`SOAK DONE: ${LOOPS} loops, ${stalls} stalls, ${((Date.now() - t00) / 60000).toFixed(1)} min`); await b.close(); server && server.close();
