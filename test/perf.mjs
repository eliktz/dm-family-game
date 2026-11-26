// Indicative perf probe (headless WebKit, software GL: numbers are NOT device numbers). Reports main-pass draw calls and
// triangles (tier low = no shadow or bloom passes) and frame intervals (median / p95 ms, tier high) per scene.
// Usage: node perf.mjs [--dsf=1|3]
import { webkit, devices } from 'playwright'; import { startServer } from './serve.mjs';
import { fileURLToPath } from 'node:url'; import { dirname, join } from 'node:path';
const root = join(dirname(fileURLToPath(import.meta.url)), '..'); const dsf = +(process.argv.find(a => a.startsWith('--dsf='))?.split('=')[1] || 1);
const { server, port } = await startServer(root); const b = await webkit.launch();
const SCENES = [['title', 'title'], ['cave (feed)', 'bond'], ['flight', 'flight'], ['ch2 river', 'ch2-glide'], ['ch2 cave + Bo', 'ch2-hatch'], ['ch3 garden', 'ch3-mirrors'], ['ch3 flight', 'ch3-flight'], ['ch4 bakery', 'ch4-catch'], ['ch5 crystals', 'ch5-patterns'], ['ch6 flight', 'ch6-flight'], ['ch6 pots', 'ch6-pots']];
for (const tier of ['low', 'high']) {
  const ctx = await b.newContext({ ...devices['iPhone 13 landscape'], viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: dsf });
  const p = await ctx.newPage(); await p.goto(`http://127.0.0.1:${port}/index.html?tier=${tier}&all=1`); await p.waitForFunction(() => window.__dm?.ready, null, { timeout: 120000 });
  for (const [label, go] of SCENES) {
    await p.evaluate(g => { __dm.fast = g === 'ch2-hatch'; __dm.go(g); }, go); await p.waitForTimeout(go === 'ch2-hatch' ? 9000 : 3500);
    // main-pass counts first (cheap), frame times second; a browser that dies under load must not lose the counts
    try {
      const st = await p.evaluate(() => __dm.stats());
      if (tier === 'low') { console.log(`main pass  ${label.padEnd(14)} draw calls ${String(st.drawCalls).padStart(4)}  triangles ${st.triangles}`); continue; }
      const ts = await p.evaluate(() => new Promise(res => { const ts = []; let last = performance.now(); const f = now => { ts.push(now - last); last = now; ts.length < 120 ? requestAnimationFrame(f) : res(ts); }; requestAnimationFrame(f); setTimeout(() => res(ts), 60000); }));
      const t = ts.slice(5).sort((a, c) => a - c), q = k => t.length ? t[Math.floor(t.length * k)].toFixed(1) : 'n/a';
      console.log(`frame time ${label.padEnd(14)} dsf ${dsf}  median ${q(0.5)} ms  p95 ${q(0.95)} ms  (tier ${st.tier}, ${t.length} frames)`);
    } catch (e) { console.log(`${tier === 'low' ? 'main pass ' : 'frame time'} ${label.padEnd(14)} skipped: ${e.message.split('\n')[0]}`); if (/closed/.test(e.message)) break; }
  }
  await ctx.close().catch(() => { });
}
await b.close(); server.close();
