// Smoke test: iPad landscape (WebKit = Safari's engine; falls back to Chromium iPad emulation).
// Plays chapter 1 start→end through the real UI (buttons, dialogs, riddle), using window.__dm
// only to skip walking/steering. Fails on any console error / page error. Saves screenshots.
// Usage: node smoke.mjs [baseURL] [--chromium] [--no-shots] [--dsf=1]
import { webkit, chromium, devices } from 'playwright';
import { startServer } from './serve.mjs';
import { fileURLToPath } from 'node:url'; import { dirname, join } from 'node:path'; import { mkdir } from 'node:fs/promises';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2); const urlArg = args.find(a => /^https?:/.test(a));
const useChromium = args.includes('--chromium'); const shots = !args.includes('--no-shots');
const dsf = +(args.find(a => a.startsWith('--dsf='))?.split('=')[1] || 1);
let server, base = urlArg;
if (!base) { const s = await startServer(root); server = s.server; base = `http://127.0.0.1:${s.port}/`; }
const shotDir = join(root, urlArg ? 'shots/live' : 'shots'); await mkdir(shotDir, { recursive: true });
const ipad = devices['iPad Pro 11 landscape'];
let browser, engineName;
try { if (useChromium) throw new Error('chromium requested'); browser = await webkit.launch(); engineName = 'webkit'; }
catch { browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }); engineName = 'chromium'; }
const ctx = await browser.newContext({ ...ipad, viewport: { width: 1180, height: 820 }, deviceScaleFactor: dsf, ...(engineName === 'chromium' ? {} : {}) });
const page = await ctx.newPage();
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('requestfailed', r => errors.push('requestfailed: ' + r.url()));
page.on('response', r => { if (r.status() >= 400) errors.push(`http ${r.status()}: ${r.url()}`); });
const log = (...a) => console.log(`[${engineName}]`, ...a);
const phase = () => page.evaluate(() => window.__dm?.phase);
const shot = async name => { if (shots) await page.screenshot({ path: join(shotDir, name + '.png') }); log('shot', name); };
const tap = sel => page.locator(sel).first().dispatchEvent('pointerup');
async function advanceTo(target, timeout = 60000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const p = await phase(); if (p === target) return;
    if (await page.locator('#dialog:not([hidden])').count()) await tap('#dialog');
    await page.waitForTimeout(250);
  }
  throw new Error(`timeout waiting for phase ${target} (at ${await phase()})`);
}
const check = (cond, msg) => { if (!cond) throw new Error('CHECK FAILED: ' + msg); log('ok', msg); };
let ok = false;
try {
  await page.goto(base + 'index.html' + (args.includes('--auto-tier') ? '' : '?tier=high'), { waitUntil: 'load' });
  await page.waitForFunction(() => window.__dm && window.__dm.ready, null, { timeout: 90000 });
  await page.waitForTimeout(1500);
  check(await page.evaluate(() => document.documentElement.dir === 'rtl' && document.documentElement.lang === 'he'), 'html is lang=he dir=rtl');
  check(await page.locator('#title h1').isVisible(), 'title visible');
  check((await page.locator('#title h1').innerText()).includes('דרקונים'), 'title text Hebrew');
  check(await page.evaluate(() => getComputedStyle(document.querySelector('#title h1')).direction === 'rtl'), 'title direction rtl');
  await shot('01-title');
  // tap Worm on the title (should wiggle, no error)
  await page.mouse.click(250, 450);
  await tap('#btn-start');
  await advanceTo('cave-intro'); await page.waitForTimeout(1600);
  check(await page.locator('#dialog').isVisible(), 'Griffith dialogue visible');
  check((await page.locator('#dialog .name').innerText()).includes("גריפית'"), 'speaker is גריפית\'');
  await shot('02-cave-griffith');
  await advanceTo('cave-walk'); await page.waitForTimeout(1200);
  check(await page.locator('#joy').isVisible(), 'joystick visible in cave');
  await shot('03-cave-walk');
  await page.evaluate(() => __dm.walkToWorm());
  await advanceTo('stone'); await page.waitForTimeout(2200); await shot('04-dragon-stone');
  await advanceTo('bond'); await page.waitForTimeout(1200);
  await tap('#btn-feed'); await page.waitForTimeout(2600); await shot('05-feed-worm');
  await page.locator('#btn-feed.done').waitFor({ timeout: 30000 });
  await tap('#btn-pet'); await page.waitForTimeout(900); await shot('06-pet-worm');
  await advanceTo('math'); await page.waitForTimeout(800);
  check(await page.locator('#math .eq').isVisible(), 'riddle visible');
  const eq = await page.locator('#math .eq').innerText(); const [a, b] = eq.split('+').map(s => +s.trim());
  const wrong = page.locator(`#math .m-answers button:not([data-v="${a + b}"])`).first();
  await wrong.dispatchEvent('pointerup'); await page.waitForTimeout(700);
  check((await page.locator('#math .m-hint').innerText()).includes('כמעט'), 'wrong answer gives a friendly hint');
  check(await page.evaluate(() => __dm.phase === 'math'), 'wrong answer does not punish/advance');
  await shot('07-riddle');
  await tap(`#math .m-answers button[data-v="${a + b}"]`);
  await advanceTo('ready-fly'); await page.waitForTimeout(800); await shot('08-gate-open');
  await tap('#btn-fly');
  await advanceTo('fly'); await page.waitForTimeout(4500);
  check(await page.locator('#counter').isVisible(), 'star counter visible');
  await shot('09-flight');
  for (let i = 0; i < 3; i++) await page.evaluate(() => __dm.collectNext());
  await page.waitForTimeout(2500);
  const cnt = (await page.locator('#count').innerText()).trim(); check(/^[3-7] \/ 8$/.test(cnt), `counter counts up (${cnt})`);
  await shot('10-flight-stars');
  await page.evaluate(() => __dm.collectAll());
  await advanceTo('celebrate'); await page.waitForTimeout(1200); await shot('11-celebrate-sky');
  await page.locator('#card:not([hidden])').waitFor({ timeout: 15000 });
  check((await page.locator('#card').innerText()).includes('עוד פעם'), "celebration shows 'עוד פעם?'");
  await shot('12-celebrate-card');
  await tap('#card button[data-v="end"]');
  await page.waitForFunction(() => window.__dm.phase === 'end'); await page.waitForTimeout(600); await shot('13-to-be-continued');
  await tap('#card button[data-v="home"]');
  await page.waitForFunction(() => window.__dm.mode === 'title', null, { timeout: 15000 });
  const stats = await page.evaluate(() => __dm.stats()); log('stats', JSON.stringify(stats));
  check(errors.length === 0, 'no console/page/network errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  ok = true;
} catch (e) {
  console.error(`[${engineName}] FAIL`, e.message); if (errors.length) console.error(errors.join('\n'));
  try { await page.screenshot({ path: join(shotDir, 'fail.png') }); } catch { }
}
await browser.close(); server && server.close();
console.log(ok ? `SMOKE PASS (${engineName})` : `SMOKE FAIL (${engineName})`); process.exit(ok ? 0 : 1);
