// Memory probe: visits every chapter twice in ONE page session and prints, at each chapter boundary, the WebKit
// web-process RSS plus three.js GPU counters. Growth on the first pass that is flat on the second pass is lazy upload
// (each scene's resources are created once); growth on the second pass is a leak.
// Usage: node mem.mjs [--device=iphone|ipad] [--dsf=1|2] [--passes=2]
import { webkit, devices } from 'playwright'; import { startServer } from './serve.mjs'; import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url'; import { dirname, join } from 'node:path';
const root = join(dirname(fileURLToPath(import.meta.url)), '..'); const args = process.argv.slice(2);
const opt = (k, d) => args.find(a => a.startsWith(`--${k}=`))?.split('=')[1] ?? d;
const dev = opt('device', 'iphone'), dsf = +opt('dsf', 1), PASSES = +opt('passes', 2);
const s = await startServer(root), base = `http://127.0.0.1:${s.port}/`;
const ctxo = dev === 'ipad' ? { ...devices['iPad Pro 11 landscape'], viewport: { width: 1180, height: 820 }, deviceScaleFactor: dsf } : { ...devices['iPhone 13 landscape'], viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: dsf };
const b = await webkit.launch(); const page = await (await b.newContext(ctxo)).newPage(); let dead = false; page.on('crash', () => { dead = true; console.log('!! page crashed'); }); page.on('close', () => { dead = true; });
const rss = () => { try { return +execSync("ps -eo rss,comm | awk '/WPEWebProcess/{s+=$1} END{print int(s/1024)}'").toString().trim(); } catch { return -1; } };
await page.goto(base + 'index.html?all=1'); await page.waitForFunction(() => window.__dm?.ready, null, { timeout: 120000 });
const probe = async label => { if (dead) return; const m = await page.evaluate(() => { const i = __dm.engine.renderer.info; return { geo: i.memory.geometries, tex: i.memory.textures, prog: i.programs.length, tweens: __dm.G.tweenCount(), nodes: document.querySelectorAll('*').length, canv: document.querySelectorAll('canvas').length }; });
  console.log(`${label.padEnd(22)} rss ${String(rss()).padStart(5)} MB  geometries ${m.geo}  textures ${m.tex}  programs ${m.prog}  tweens ${m.tweens}  dom ${m.nodes}  canvases ${m.canv}`); return m; };
await probe('title');
const STOPS = ['cave', 'flight', 'ch2', 'ch2-glide', 'ch2-end', 'ch3', 'ch3-end', 'ch4', 'ch4-end', 'ch5', 'ch5-end', 'ch6', 'ch6-flight', 'ch6-pots', 'ch6-end', 'title'];
let first, last;
for (let p = 1; p <= PASSES && !dead; p++) for (const g of STOPS) {
  if (dead) break; await page.evaluate(g => { __dm.fast = true; __dm.go(g); }, g).catch(() => { }); await page.waitForTimeout(6000);
  const m = await probe(`pass ${p} ${g}`); if (g === 'title') { if (p === 1) first = { ...m, rss: rss() }; last = { ...m, rss: rss() }; }
}
// the sad-cloud beat on its own: sample while the mood flips 40 times
if (!dead) { await page.evaluate(() => __dm.go('ch6-pots')); await page.waitForTimeout(5000); const a = await probe('before 40 mood flips');
  await page.evaluate(async () => { const c = __dm.G.grumble; for (let i = 0; i < 40; i++) { c.state.mood = i % 2 ? 'sad' : i % 4 ? 'happy' : null; await new Promise(r => setTimeout(r, 250)); } c.state.mood = null; });
  const z = await probe('after 40 mood flips'); if (a && z && (z.geo > a.geo || z.tex > a.tex || z.prog > a.prog)) { console.log('MEM FAIL: mood flips allocate GPU resources'); process.exitCode = 1; } }
const ok = !dead && first && last && last.geo <= first.geo && last.tex <= first.tex && last.prog <= first.prog && last.rss < first.rss * 1.15 + 50;
console.log(ok && !process.exitCode ? `MEM PASS: pass ${PASSES} ends where pass 1 ended (rss ${first.rss} -> ${last.rss} MB)` : `MEM FAIL: ${dead ? 'page died' : JSON.stringify({ first, last })}`);
await b.close().catch(() => { }); s.server.close(); process.exit(ok && !process.exitCode ? 0 : 1);
