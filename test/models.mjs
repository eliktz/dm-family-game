// GLB swap-in test (WebKit iPad). Never writes to assets/models/: the manifest and model requests are
// intercepted. Checks that a missing / empty / broken manifest and a failing GLB leave the procedural
// characters in place without page errors, and that a good GLB is swapped in and driven.
// Usage: node models.mjs [--chromium]
import { webkit, chromium, devices } from 'playwright';
import { startServer } from './serve.mjs';
import { fileURLToPath } from 'node:url'; import { dirname, join } from 'node:path';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { server, port } = await startServer(root);
const browser = process.argv.includes('--chromium') ? await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }) : await webkit.launch();
// a minimal glTF (one triangle, one material named "eye", no animations), served for the fake model URL
const buf = Buffer.alloc(36); [0, 0, 0, 1, 0, 0, 0, 1, 0].forEach((v, i) => buf.writeFloatLE(v, i * 4));
const gltf = JSON.stringify({ asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0, name: 'tri' }],
  meshes: [{ primitives: [{ attributes: { POSITION: 0 }, material: 0 }] }], materials: [{ name: 'eye', emissiveFactor: [0, 1, 0] }],
  buffers: [{ byteLength: 36, uri: 'data:application/octet-stream;base64,' + buf.toString('base64') }],
  bufferViews: [{ buffer: 0, byteLength: 36 }], accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: 'VEC3', min: [0, 0, 0], max: [1, 1, 0] }] });
const ALL = { worm: 'procedural', drake: 'procedural', griffith: 'procedural', king: 'procedural', castle: 'procedural' };
const cases = [
  { name: 'manifest missing (404)', manifest: { status: 404, body: 'nf' }, expect: ALL, allow404: true },
  { name: 'manifest empty file', manifest: { status: 200, body: '' }, expect: ALL },
  { name: 'manifest invalid JSON', manifest: { status: 200, body: '{ oops' }, expect: ALL },
  { name: 'manifest with only _doc', manifest: { status: 200, body: '{"_doc":"x"}' }, expect: ALL },
  { name: 'good worm GLB + failing drake GLB', manifest: { status: 200, body: JSON.stringify({ worm: { url: 'assets/models/__t_worm.glb', height: 2, ground: true }, drake: '__t_missing.glb', king: { scale: 2 } }) },
    expect: { ...ALL, worm: 'glb' }, allow404: true, wantWarn: /drake/, play: true },
];
let fails = 0;
for (const c of cases) {
  const ctx = await browser.newContext({ ...devices['iPad Pro 11 landscape'], viewport: { width: 1180, height: 820 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage(); const errs = [], warns = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'warning') warns.push(m.text()); if (m.type() === 'error' && !(c.allow404 && /404|Failed to load resource/.test(m.text()))) errs.push('console: ' + m.text()); });
  await page.route('**/assets/models/models.json', r => r.fulfill({ status: c.manifest.status, contentType: 'application/json', body: c.manifest.body }));
  await page.route('**/assets/models/__t_worm.glb', r => r.fulfill({ status: 200, contentType: 'model/gltf+json', body: gltf }));
  await page.route('**/assets/models/__t_missing.glb', r => r.fulfill({ status: 404, body: 'nf' }));
  let msg = '';
  try {
    await page.goto(`http://127.0.0.1:${port}/index.html?tier=high`); await page.waitForFunction(() => window.__dm?.ready, null, { timeout: 90000 });
    const got = (await page.evaluate(() => __dm.stats())).models;
    if (JSON.stringify(got) !== JSON.stringify(c.expect)) msg = 'models = ' + JSON.stringify(got);
    if (c.wantWarn && !warns.some(w => c.wantWarn.test(w))) msg ||= 'expected a console.warn matching ' + c.wantWarn;
    if (c.play) { // exercise the driver: wiggle / chomp / glow / flight without clips
      await page.evaluate(() => { __dm.fast = true; __dm.worm.wiggle(2); __dm.worm.chomp(); __dm.worm.setGlow(true); }); await page.waitForTimeout(600);
      await page.evaluate(() => __dm.go('flight')); await page.waitForTimeout(1500); await page.evaluate(() => __dm.collectNext()); await page.waitForTimeout(800);
    }
    if (errs.length) msg ||= errs.join(' | ');
  } catch (e) { msg = e.message; }
  console.log(`${msg ? 'FAIL' : 'ok  '} ${c.name}${msg ? ': ' + msg : ''}`); if (msg) fails++;
  await ctx.close();
}
await browser.close(); server.close();
console.log(fails ? 'MODELS FAIL' : 'MODELS PASS'); process.exit(fails ? 1 : 0);
