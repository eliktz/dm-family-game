// Tiny static server for tests (no deps).
import http from 'node:http'; import { readFile } from 'node:fs/promises'; import { extname, join, normalize } from 'node:path';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.hdr': 'application/octet-stream', '.glb': 'model/gltf-binary', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain' };
export function startServer(root, port = 0) {
  return new Promise(res => {
    const server = http.createServer(async (req, rsp) => {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
      const f = normalize(join(root, p)); if (!f.startsWith(root)) { rsp.writeHead(403); return rsp.end(); }
      try { const b = await readFile(f); rsp.writeHead(200, { 'content-type': TYPES[extname(f)] || 'application/octet-stream' }); rsp.end(b); }
      catch { rsp.writeHead(404); rsp.end('nf'); }
    });
    server.listen(port, '127.0.0.1', () => res({ server, port: server.address().port }));
  });
}
