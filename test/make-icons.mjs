// Renders the app icons (assets/icons/) from our own procedural Worm. Usage: node make-icons.mjs
import { chromium } from 'playwright'; import { startServer } from './serve.mjs';
import { fileURLToPath } from 'node:url'; import { dirname, join } from 'node:path'; import { readFile } from 'node:fs/promises';
const root = join(dirname(fileURLToPath(import.meta.url)), '..'); const out = join(root, 'assets/icons');
const { server, port } = await startServer(root);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: 2 });
p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto(`http://127.0.0.1:${port}/test/icon.html`); await p.waitForFunction(() => window.__t > 30, null, { timeout: 120000 });
await p.screenshot({ path: join(out, 'icon-1024.png') });
const src = 'data:image/png;base64,' + (await readFile(join(out, 'icon-1024.png'))).toString('base64');
for (const [name, size] of [['icon-512.png', 512], ['icon-192.png', 192], ['apple-touch-icon.png', 180]]) {
  const q = await b.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await q.setContent(`<style>html,body{margin:0}img{width:${size}px;height:${size}px;display:block}</style><img src="${src}">`); await q.waitForFunction(() => document.images[0].complete);
  await q.screenshot({ path: join(out, name) }); await q.close(); console.log('wrote', name);
}
await b.close(); server.close();
