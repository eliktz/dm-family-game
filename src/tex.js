// Procedural canvas textures (no downloads): scales, rock, sprites.
import * as THREE from 'three';

function canvas(w, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// Overlapping rounded scales (grey bump map + subtle colour variation map)
export function scaleTextures() {
  const S = 512; const [c, g] = canvas(S); const [cc, gc] = canvas(S);
  g.fillStyle = '#808080'; g.fillRect(0, 0, S, S);
  gc.fillStyle = '#ffffff'; gc.fillRect(0, 0, S, S);
  const rows = 16, cols = 16, w = S / cols, h = S / rows; const R = rng(7);
  for (let y = -1; y <= rows; y++) for (let x = -1; x <= cols; x++) {
    const ox = (y % 2) * w / 2; const cx = x * w + ox + w / 2, cy = y * h;
    const gr = g.createRadialGradient(cx, cy - h * .2, 1, cx, cy, w * .62);
    gr.addColorStop(0, '#c8c8c8'); gr.addColorStop(.75, '#8a8a8a'); gr.addColorStop(1, '#3a3a3a');
    g.fillStyle = gr; g.beginPath(); g.ellipse(cx, cy, w * .58, h * .78, 0, 0, Math.PI); g.fill();
    const v = 225 + Math.floor(R() * 30); gc.fillStyle = `rgb(${v},${v - 4},${v - 10})`;
    gc.beginPath(); gc.ellipse(cx, cy, w * .55, h * .74, 0, 0, Math.PI); gc.fill();
  }
  const bump = new THREE.CanvasTexture(c); const col = new THREE.CanvasTexture(cc);
  col.colorSpace = THREE.SRGBColorSpace;
  for (const t of [bump, col]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; }
  return { bump, col };
}

export function noiseTexture(size = 256, base = [128, 128, 128], amp = 60, seed = 3, blobs = 900) {
  const [c, g] = canvas(size); const R = rng(seed);
  g.fillStyle = `rgb(${base})`; g.fillRect(0, 0, size, size);
  for (let i = 0; i < blobs; i++) {
    const x = R() * size, y = R() * size, r = 2 + R() * size * 0.06, d = (R() - .5) * amp;
    g.fillStyle = `rgba(${base.map(v => Math.max(0, Math.min(255, v + d))).join(',')},0.35)`;
    for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) { g.beginPath(); g.arc(x + dx, y + dy, r, 0, 7); g.fill(); }
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

export function glowSprite(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  const [c, g] = canvas(128); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, inner); gr.addColorStop(0.25, inner.replace(/[\d.]+\)$/, '0.55)')); gr.addColorStop(1, outer);
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function heartSprite() {
  const [c, g] = canvas(128); g.translate(64, 70); g.scale(1.9, 1.9);
  const path = () => { g.beginPath(); g.moveTo(0, 22); g.bezierCurveTo(-34, 0, -24, -28, 0, -12); g.bezierCurveTo(24, -28, 34, 0, 0, 22); };
  g.shadowColor = 'rgba(255,80,120,.8)'; g.shadowBlur = 8; path(); g.fillStyle = '#ff5f8f'; g.fill();
  g.shadowBlur = 0; g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.ellipse(-10, -8, 5, 3, -0.6, 0, 7); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function sparkleSprite() {
  const [c, g] = canvas(128); g.translate(64, 64);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, 60); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.2, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(-64, -64, 128, 128);
  g.fillStyle = '#fff';
  for (let i = 0; i < 4; i++) { g.rotate(Math.PI / 2); g.beginPath(); g.moveTo(-5, 0); g.lineTo(0, -60); g.lineTo(5, 0); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// Soft round blob shadow
export function blobShadow() {
  const [c, g] = canvas(128); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

// vertical gradient for a sky dome fallback
export function gradientTexture(stops) {
  const [c, g] = canvas(4, 256); const gr = g.createLinearGradient(0, 0, 0, 256);
  stops.forEach(([p, col]) => gr.addColorStop(p, col)); g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
