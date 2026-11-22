// Dev helper: screenshot any page path. node peek.mjs "dev-worm.html?pose=coil" out.png
import { chromium } from 'playwright'; import { startServer } from './serve.mjs'; import { fileURLToPath } from 'node:url'; import { dirname, join } from 'node:path';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { server, port } = await startServer(root);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1180, height: 820 } });
p.on('console', m => { if (m.type() === 'error' || m.type()==='warning') console.log('[console]', m.type(), m.text()); }); p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto(`http://127.0.0.1:${port}/${process.argv[2]}`);
await p.waitForFunction(() => (window.__t || 0) > 30 || (window.__dm && window.__dm.ready), null, { timeout: 60000 });
if (process.argv[4]) await p.evaluate(process.argv[4]);
await p.waitForTimeout(+(process.argv[5] || 800));
await p.screenshot({ path: process.argv[3] }); await b.close(); server.close();
