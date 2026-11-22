// Indicative perf probe (headless WebKit, software GL: numbers are NOT device numbers). Reports main-pass draw calls and
// triangles (tier low = no shadow or bloom passes) and frame intervals (median / p95 ms, tier high) per scene.
// Usage: node perf.mjs [--dsf=1|3]
import { webkit, devices } from 'playwright'; import { startServer } from './serve.mjs';
import { fileURLToPath } from 'node:url'; import { dirname, join } from 'node:path';
const root = join(dirname(fileURLToPath(import.meta.url)), '..'); const dsf = +(process.argv.find(a => a.startsWith('--dsf='))?.split('=')[1] || 1);
const { server, port } = await startServer(root); const b = await webkit.launch();
const SCENES = [['title', 'title'], ['cave (feed)', 'bond'], ['flight', 'flight'], ['ch2 river', 'ch2-glide'], ['ch2 cave + Bo', 'ch2-hatch']];
for (const tier of ['low', 'high']) {
  const ctx = await b.newContext({ ...devices['iPhone 13 landscape'], viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: dsf });
  const p = await ctx.newPage(); await p.goto(`http://127.0.0.1:${port}/index.html?tier=${tier}&all=1`); await p.waitForFunction(() => window.__dm?.ready, null, { timeout: 120000 });
  for (const [label, go] of SCENES) {
    await p.evaluate(g => { __dm.fast = g === 'ch2-hatch'; __dm.go(g); }, go); await p.waitForTimeout(go === 'ch2-hatch' ? 9000 : 3500);
    const r = await p.evaluate(() => new Promise(res => { const ts = []; let last = performance.now(); const f = now => { ts.push(now - last); last = now; ts.length < 120 ? requestAnimationFrame(f) : res({ ts, s: __dm.stats() }); }; requestAnimationFrame(f); }));
    const t = r.ts.slice(5).sort((a, c) => a - c), q = k => t[Math.floor(t.length * k)].toFixed(1);
    console.log(tier === 'low' ? `main pass  ${label.padEnd(14)} draw calls ${String(r.s.drawCalls).padStart(4)}  triangles ${r.s.triangles}` : `frame time ${label.padEnd(14)} dsf ${dsf}  median ${q(0.5)} ms  p95 ${q(0.95)} ms  (tier ${r.s.tier})`);
  }
  await ctx.close();
}
await b.close(); server.close();
