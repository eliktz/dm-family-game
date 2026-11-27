// Flight stall test (brief 07: "the flight must never get stuck"). At iPad and iPhone landscape it flies the
// chapter 1 star flight and the chapter 2 river glide several ways and fails if no item is collected for > 8 s:
//   none        no input at all
//   kid         joystick pushed fully toward where the next item is on screen (bang-bang, like a 7-year-old)
//   hold-right  joystick held fully right the whole time      hold-up / hold-down-left likewise
// Stall time is measured in game time (the game clamps dt, so a slow software-rendered test machine runs it in slow motion).
// Usage: node flight.mjs [baseURL] [--device=ipad|iphone] [--modes=none,kid] [--shots]
import { webkit, devices } from 'playwright';
import { startServer } from './serve.mjs';
import { fileURLToPath } from 'node:url'; import { dirname, join } from 'node:path';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2); const urlArg = args.find(a => /^https?:/.test(a));
const only = args.find(a => a.startsWith('--device='))?.split('=')[1];
const MODES = (args.find(a => a.startsWith('--modes='))?.split('=')[1] || 'none,kid,hold-right,hold-up,hold-down-left').split(',');
const chapterArg = args.find(a => a.startsWith('--chapter='))?.split('=')[1]; // e.g. --chapter=ch1
const shots = args.includes('--shots'), STALL_MS = 8000;
let server, base = urlArg; if (!base) { const s = await startServer(root); server = s.server; base = `http://127.0.0.1:${s.port}/`; }
const DEVICES = [
  { name: 'ipad', ctx: { ...devices['iPad Pro 11 landscape'], viewport: { width: 1180, height: 820 }, deviceScaleFactor: 1 } },
  { name: 'iphone', ctx: { ...devices['iPhone 13 landscape'], viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 } },
].filter(d => !only || d.name === only);
const HOLD = { 'hold-right': [1, 0], 'hold-up': [0, -1], 'hold-down-left': [-0.7, 0.7] };
const browser = await webkit.launch(); let fails = 0, freeSession = 0;
for (const dev of DEVICES) {
  const ctx = await browser.newContext(dev.ctx); const page = await ctx.newPage(); const errors = []; freeSession = 0;
  page.on('pageerror', e => errors.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(0, 4).join(' < ').replace(/http:\/\/[^/]+\//g, ''))); page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  await page.goto(base + 'index.html?tier=low&all=1'); await page.waitForFunction(() => window.__dm?.ready, null, { timeout: 90000 });
  for (const [chapter, go] of [['ch1 stars', 'flight'], ['ch2 river', 'ch2-glide'], ['ch3 sunbeams', 'ch3-flight'], ['ch4 fireballs', 'ch4-flight'], ['ch5 tunnel', 'ch5-flight'], ['ch6 puffs', 'ch6-flight'], ['free flight', 'free']].filter(c => !chapterArg || c[0].startsWith(chapterArg))) for (const mode of MODES) {
    await page.evaluate(g => __dm.go(g), go);
    await page.locator('#joy').waitFor({ state: 'visible', timeout: 15000 });
    const jb = await page.locator('#joy').boundingBox(), jc = [jb.x + jb.width / 2, jb.y + jb.height / 2], R = jb.width / 2 * 0.95;
    const stick = async (x, y) => { await page.mouse.move(jc[0] + x * R, jc[1] + y * R, { steps: 2 }); };
    if (mode !== 'none') { await page.mouse.move(jc[0], jc[1]); await page.mouse.down(); }
    if (HOLD[mode]) await stick(...HOLD[mode]);
    if (go === 'free') { // endless: fly for FREE_S seconds of real time; the counter must keep rising, things must respawn, no errors
      // wait for THIS run's flight: a new session with its counter back at 0 (the previous mode's run leaves its own count behind until the restart lands)
      await page.waitForFunction(s => { const d = __dm.free.debug(); return d.session > s && d.flying && d.count < 3; }, freeSession, { timeout: 60000 }); freeSession = await page.evaluate(() => __dm.free.debug().session);
      const FREE_S = 70, w0 = Date.now(); let last = Date.now(), n = 0, maxGap = 0, msg = '', d = null, k = 0;
      while (Date.now() - w0 < FREE_S * 1000) {
        d = await page.evaluate(() => ({ ...__dm.free.debug(), mode: __dm.mode, phase: __dm.phase, dialog: !document.querySelector('#dialog').hidden }));
        if (d.count > n) { maxGap = Math.max(maxGap, Date.now() - last); n = d.count; last = Date.now(); }
        if (Date.now() - last > 20000) { msg = `STALLED: nothing collected for 20 s at ${n} (mode ${d.mode}, phase ${d.phase}, ${d.ungot} of ${d.items} things waiting)`; break; }
        if (d.dialog) { msg = 'a speech bubble appeared in free flight'; break; }
        if (mode === 'kid') await stick(Math.sin(k * 0.9), Math.cos(k * 1.3) * 0.8); k++;
        await page.waitForTimeout(400);
      }
      if (!msg && (n < 20 || !d.flying)) msg = `only ${n} collected in ${FREE_S} s (flying ${d && d.flying})`;
      if (mode !== 'none') await page.mouse.up();
      if (errors.length) msg = (msg ? msg + '; ' : '') + 'errors: ' + errors.join(' | ');
      console.log(`${msg ? 'FAIL' : 'ok  '} ${dev.name.padEnd(6)} ${chapter} ${mode.padEnd(14)} ${msg || `${n} collected in ${FREE_S}s real, ${d.bursts} bursts, longest gap ${(maxGap / 1000).toFixed(1)}s, friends ${d.active.join('+')}`}`);
      if (msg) fails++; errors.length = 0; continue;
    }
    const state = () => page.evaluate(() => {
      const G = __dm.G, fl = G.fl, i = fl.items.findIndex(s => !s.got); let dir = null, dist = null;
      if (i >= 0) { const p = fl.items[i].g.position, v = p.clone().project(G.cam), behind = v.z > 1; dir = [behind ? -v.x : v.x, behind ? -v.y : v.y, behind]; dist = +p.distanceTo(fl.pos).toFixed(1); }
      return { t: G.time * 1000, got: fl.got, total: fl.items.length, dir, dist, pos: fl.pos.toArray().map(n => +n.toFixed(1)) };
    });
    let st = await state(), last = st.t, lastGot = 0, msg = '', maxGap = 0, shotDone = false; const t0 = st.t, w0 = Date.now(); // game time: slow test machines drop frames
    const f0 = await page.evaluate(() => __dm.frameStats.raf + __dm.frameStats.fallback); let polls = 0;
    while (true) {
      st = await state(); const now = st.t; polls++;
      if (Date.now() - w0 > 240000) { const d = await page.evaluate(async () => { const G = __dm.G, t0 = G.time, u0 = G.fl.u; let raf = 0; const f = () => { raf++; requestAnimationFrame(f); }; requestAnimationFrame(f); await new Promise(r => setTimeout(r, 3000)); return `game clock +${(G.time - t0).toFixed(2)}s and ${raf} animation frames in 3 s, rail u ${u0.toFixed(3)} -> ${G.fl.u.toFixed(3)} in those 3 s, mode ${G.mode}, phase ${G.phase}, hidden ${document.hidden}`; }); const f1 = await page.evaluate(() => __dm.frameStats.raf + __dm.frameStats.fallback);
        msg = `test timeout (240 s wall clock) at ${st.got}/${st.total}: ${d}; over the whole case the page ran ${f1 - f0} frames and answered ${polls} polls (a healthy 240 s is 2000+ frames: far fewer means the page or the box was frozen, not the rail)`; break; }
      if (st.got > lastGot) { maxGap = Math.max(maxGap, now - last); lastGot = st.got; last = now; }
      if (st.got >= st.total) break;
      if (now - last > STALL_MS) { msg = `STALLED at ${st.got}/${st.total} for ${STALL_MS / 1000}s (next item ${st.dist} m away, worm at ${st.pos})`; break; }
      if (mode === 'kid' && st.dir) { const [x, y, behind] = st.dir; await stick(behind || Math.abs(x) > 0.15 ? Math.sign(x || 1) : 0, Math.abs(y) > 0.2 ? -Math.sign(y) : 0); }
      if (shots && !shotDone && st.got === 3) { shotDone = true; await page.screenshot({ path: join(root, 'shots', `${dev.name}-flight-${go}-${mode}.png`) }); }
      await page.waitForTimeout(150);
    }
    if (mode !== 'none') await page.mouse.up();
    if (errors.length) msg = (msg ? msg + '; ' : '') + 'errors: ' + errors.join(' | ');
    console.log(`${msg ? 'FAIL' : 'ok  '} ${dev.name.padEnd(6)} ${chapter} ${mode.padEnd(14)} ${msg || `${st.total}/${st.total} in ${((st.t - t0) / 1000).toFixed(0)}s game time (${((Date.now() - w0) / 1000).toFixed(0)}s real), longest gap ${(maxGap / 1000).toFixed(1)}s`}`);
    if (msg) fails++; errors.length = 0;
  }
  await ctx.close();
}
await browser.close(); server && server.close();
console.log(fails ? 'FLIGHT FAIL' : 'FLIGHT PASS'); process.exit(fails ? 1 : 0);
