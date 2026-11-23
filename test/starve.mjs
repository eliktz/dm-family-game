// Regression test: the story must keep moving when the browser stops delivering animation frames, and a scripted
// step that never resolves must be rescued by the watchdog. iPhone landscape, local server (or a base URL).
// Usage: node starve.mjs [baseURL]
import { webkit, devices } from 'playwright'; import { startServer } from './serve.mjs';
import { fileURLToPath } from 'node:url'; import { dirname, join } from 'node:path';
const root = join(dirname(fileURLToPath(import.meta.url)), '..'); let base = process.argv.slice(2).find(a => /^https?:/.test(a)), server;
if (!base) { const s = await startServer(root); server = s.server; base = `http://127.0.0.1:${s.port}/`; }
const b = await webkit.launch(); const ctx = await b.newContext({ ...devices['iPhone 13 landscape'], viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => m.type() === 'error' && errors.push(m.text()));
let fails = 0; const check = (ok, msg) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`); if (!ok) fails++; };
await page.goto(base + 'index.html?tier=high&all=1'); await page.waitForFunction(() => window.__dm?.ready, null, { timeout: 180000 });
const phase = () => page.evaluate(() => __dm.phase), frames = () => page.evaluate(() => ({ ...__dm.frameStats }));
// drive a chapter the way a player would until `until(phase)`; false on timeout
async function drive(until, ms = 300000) {
  for (const t0 = Date.now(); Date.now() - t0 < ms;) {
    const ph = await phase(); if (until(ph)) return true;
    if (await page.locator('#dialog:not([hidden])').count()) await page.locator('#dialog').dispatchEvent('pointerup');
    if (/^c3-mirror/.test(ph)) { const xy = await page.evaluate(() => __dm.mirrorScreen()); if (xy) await page.mouse.click(xy[0], xy[1]); }
    if (/math/.test(ph)) { const c = await page.evaluate(() => __dm.math.current()); if (c) await page.locator(`#math .m-answers button[data-v="${c.answer}"]`).dispatchEvent('pointerup').catch(() => { }); }
    if (ph === 'c2-place') { const xy = await page.evaluate(() => __dm.stoneScreen()); if (xy) await page.mouse.click(xy[0], xy[1]); }
    await page.waitForTimeout(350);
  }
  return false;
}
// 1. chapter 3 started at the mirrors (saved checkpoint / "עוד פעם?") fades back in
await page.evaluate(() => __dm.go('ch3-mirrors')); await page.waitForFunction(() => __dm.phase === 'c3-mirror1', null, { timeout: 120000 }); await page.waitForTimeout(1500);
check(await page.evaluate(() => !document.querySelector('#fade').classList.contains('on')), 'chapter 3 started at the mirrors fades back in');
// 2. no animation frames at all from the bloom beat on: the timer fallback and the tween deadlines carry the story
check(await drive(p => p === 'c3-bloom'), 'reached the bloom beat');
const f0 = await frames(); await page.evaluate(() => { window.requestAnimationFrame = () => 0; });   // the browser stops delivering frames
const t0 = Date.now(); const done = await drive(p => p === 'c3-celebrate', 120000); const f1 = await frames();
check(done, `with requestAnimationFrame stopped, the story still goes from the bloom to the celebration (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
check(f1.raf - f0.raf <= 2 && f1.fallback > f0.fallback, `frames came from the timer fallback (raf +${f1.raf - f0.raf}, fallback +${f1.fallback - f0.fallback})`);
// 3. chapter 2 with frames stopped from the start: egg rolls in, stones, hatch, Bo arrives (all tween-driven beats)
await page.reload(); await page.waitForFunction(() => window.__dm?.ready, null, { timeout: 180000 });
await page.evaluate(() => { window.requestAnimationFrame = () => 0; __dm.go('ch2'); });
const t1 = Date.now(); check(await drive(p => p === 'c2-ready', 240000), `chapter 2 intro (egg rolls in, Worm curls) without animation frames (${((Date.now() - t1) / 1000).toFixed(0)} s)`);
await page.evaluate(() => __dm.go('ch2-warm'));
const t2 = Date.now(); check(await drive(p => p === 'c2-celebrate', 400000), `chapter 2 stones, hatch and Bo's arrival without animation frames (${((Date.now() - t2) / 1000).toFixed(0)} s)`);
// 4. chapter 1 feeding (was a bare requestAnimationFrame loop) without animation frames
await page.evaluate(() => __dm.go('bond')); await page.locator('#btn-feed').waitFor({ timeout: 120000 }); await page.waitForTimeout(800);
await page.locator('#btn-feed').dispatchEvent('pointerup');
check(await page.locator('#btn-feed.done').waitFor({ timeout: 60000 }).then(() => true, () => false), 'chapter 1 feeding finishes without animation frames');
// 5. a scripted step that never resolves is rescued by the story watchdog
await page.evaluate(() => __dm.hang()); const w0 = await page.evaluate(() => __dm.watchdog);
const rec = await page.waitForFunction(() => __dm.phase === 'test-recovered', null, { timeout: 90000 }).then(() => true, () => false);
check(rec && await page.evaluate(() => __dm.watchdog) > w0, 'a step that never resolves is nudged by the watchdog within 45 s');
check(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
await b.close(); server && server.close();
console.log(fails ? 'STARVE FAIL' : 'STARVE PASS'); process.exit(fails ? 1 : 0);
