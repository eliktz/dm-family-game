// King Roland's kingdom: rolling terrain, a stone castle (CC0 Poly Haven textures, merged per
// material), lake, instanced trees + flowers, puffy 3D clouds, the sun, and the sky stars.
// Swap point: models.json "castle" GLB replaces `castleGroup` contents.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { glowSprite, blobShadow } from './tex.js';

const ss = THREE.MathUtils.smoothstep;
export const PLATEAU = 3;
export function heightAt(x, z) {
  const d = Math.hypot(x, z);
  let h = 1.2 * Math.sin(x * 0.045) * Math.cos(z * 0.038) * 3 + 2.2 * Math.sin(x * 0.09 + 1.3) * Math.sin(z * 0.075 + 0.4) + 1.0 * Math.sin(x * 0.21 + z * 0.17);
  h *= ss(d, 26, 70);
  h += PLATEAU * (1 - ss(d, 24, 55)) + 1.5 * ss(d, 24, 55) * 0;
  h -= 7 * Math.exp(-((x - 70) ** 2 + (z - 45) ** 2) / 1100);
  h += ss(d, 150, 300) * (30 + 18 * Math.sin(Math.atan2(z, x) * 5) + 10 * Math.sin(Math.atan2(z, x) * 13));
  return h;
}
const pathX = z => 7 * Math.sin(z * 0.045);

function texLoad(url, rep, srgb = true) {
  const t = new THREE.TextureLoader().load(url); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t;
}
// world-scaled UVs for boxes / cylinders so the stone texture keeps a constant size (1 tile = 3 m)
function boxUV(g, w, h, d, tile = 3) {
  const uv = g.attributes.uv; const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) { const i = f * 4 + v; uv.setXY(i, uv.getX(i) * dims[f][0] / tile, uv.getY(i) * dims[f][1] / tile); }
  return g;
}
function cylUV(g, r, h, tile = 3) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.PI * 2 * r / tile, uv.getY(i) * h / tile); return g; }
const box = (w, h, d, x, y, z, ry = 0) => boxUV(new THREE.BoxGeometry(w, h, d), w, h, d).rotateY(ry).translate(x, y, z);

export function buildOutdoor() {
  const group = new THREE.Group();
  // ---- terrain
  const SIZE = 640, SEG = 150;
  const tg = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG).rotateX(-Math.PI / 2);
  const p = tg.attributes.position, cols = new Float32Array(p.count * 3), c = new THREE.Color();
  const g1 = new THREE.Color(0x6fae3f), g2 = new THREE.Color(0x9cc94e), g3 = new THREE.Color(0x4f8a34), dirt = new THREE.Color(0xc9a46a), rock = new THREE.Color(0x8d8a7a);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), h = heightAt(x, z); p.setY(i, h);
    const n = 0.5 + 0.5 * Math.sin(x * 0.13 + Math.sin(z * 0.11) * 2) * Math.cos(z * 0.09);
    c.copy(g1).lerp(g2, n * 0.7).lerp(g3, ss(-h, -1, 4) * 0.6);
    if (z > 12 && z < 140 && Math.abs(x - pathX(z)) < 2.6) c.lerp(dirt, 0.85 * (1 - ss(Math.abs(x - pathX(z)), 1.6, 2.6)));
    c.lerp(rock, ss(h, 18, 40));
    cols.set([c.r, c.g, c.b], i * 3);
  }
  tg.setAttribute('color', new THREE.BufferAttribute(cols, 3)); tg.computeVertexNormals();
  const grassTex = texLoad('assets/textures/grass_1k.jpg', 60);
  const terrain = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ vertexColors: true, map: grassTex, roughness: 0.95, color: 0xd8e8c0 }));
  terrain.receiveShadow = true; group.add(terrain);
  // lake
  const water = new THREE.Mesh(new THREE.CircleGeometry(44, 64).rotateX(-Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: 0x2f7fb8, roughness: 0.06, metalness: 0.1, clearcoat: 1, transparent: true, opacity: 0.88 }));
  water.position.set(70, -2.2, 45); group.add(water);

  // ---- castle (merged per material)
  const castle = new THREE.Group(); castle.name = 'castleGroup'; castle.position.y = PLATEAU; group.add(castle);
  const stone = [], roofsRed = [], roofsBlue = [], wood = [], dark = [], gold = [];
  const H = 7, S = 15, T = 1.8;
  for (const [x, z, w, d] of [[0, -S, 2 * S, T], [-S, 0, T, 2 * S], [S, 0, T, 2 * S]]) stone.push(box(w, H, d, x, H / 2, z));
  stone.push(box(S - 3.2, H, T, -(S + 3.2) / 2, H / 2, S), box(S - 3.2, H, T, (S + 3.2) / 2, H / 2, S)); // front wall split by the gate
  stone.push(box(6.4, 2.4, T, 0, H - 1.2, S));
  // crenellations
  const cren = (x0, z0, x1, z1, y) => { const L = Math.hypot(x1 - x0, z1 - z0), n = Math.floor(L / 1.6); for (let i = 0; i <= n; i++) { const k = i / n; stone.push(box(0.8, 0.9, T + 0.1, x0 + (x1 - x0) * k, y, z0 + (z1 - z0) * k, Math.atan2(x1 - x0, z1 - z0) + Math.PI / 2)); } };
  cren(-S, -S, S, -S, H + 0.45); cren(-S, -S, -S, S, H + 0.45); cren(S, -S, S, S, H + 0.45); cren(-S, S, S, S, H + 0.45);
  const tower = (x, z, r, h, roofArr, roofH) => {
    stone.push(cylUV(new THREE.CylinderGeometry(r, r * 1.08, h, 28), r, h).translate(x, h / 2, z));
    stone.push(cylUV(new THREE.CylinderGeometry(r * 1.18, r * 1.05, 1.0, 28), r, 1).translate(x, h + 0.2, z));
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; stone.push(box(0.7, 0.8, 0.6, x + Math.sin(a) * r * 1.12, h + 1.0, z + Math.cos(a) * r * 1.12, a)); }
    roofArr.push(new THREE.ConeGeometry(r * 1.3, roofH, 28).translate(x, h + 0.8 + roofH / 2, z));
    gold.push(new THREE.SphereGeometry(0.28, 12, 8).translate(x, h + 0.8 + roofH + 0.1, z));
    for (let i = 0; i < 3; i++) { const a = i * 2.1 + 0.4, yy = h * (0.35 + i * 0.22); dark.push(new THREE.BoxGeometry(0.55, 1.1, 0.3).rotateY(a).translate(x + Math.sin(a) * r * 1.02, yy, z + Math.cos(a) * r * 1.02)); }
    return h + 0.8 + roofH;
  };
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) tower(sx * S, sz * S, 2.8, 12, roofsRed, 6.5);
  tower(-4.6, S + 0.4, 2.0, 10, roofsBlue, 4.5); tower(4.6, S + 0.4, 2.0, 10, roofsBlue, 4.5);
  // keep + great spire
  stone.push(box(14, 12, 10, 0, 6, -5));
  cren(-7, -10, 7, -10, 12.45); cren(-7, 0, 7, 0, 12.45); cren(-7, -10, -7, 0, 12.45); cren(7, -10, 7, 0, 12.45);
  const spireTop = tower(0, -5, 3.2, 21, roofsBlue, 9);
  tower(6.5, -8, 1.8, 16, roofsRed, 5);
  for (let i = 0; i < 4; i++) dark.push(new THREE.BoxGeometry(1.1, 2.0, 0.3).translate(-4.5 + i * 3, 7.5, 0.05));
  dark.push(new THREE.BoxGeometry(1.6, 2.6, 0.3).translate(0, 7.5, 0.06));
  // gate doors
  wood.push(box(4.4, 4.6, 0.5, 0, 2.3, S + 0.2));
  dark.push(new THREE.BoxGeometry(4.8, 0.3, 0.55).translate(0, 4.75, S + 0.25));
  const stoneTex = texLoad('assets/textures/castle_wall_1k.jpg', 1), roofTex = texLoad('assets/textures/slate_roof_1k.jpg', 1), woodTex = texLoad('assets/textures/wood_1k.jpg', 1);
  const mk = (geos, mat) => { const m = new THREE.Mesh(mergeGeometries(geos.map(g => g.index ? g.toNonIndexed() : g)), mat); m.castShadow = true; m.receiveShadow = true; castle.add(m); return m; };
  for (const g of roofsRed.concat(roofsBlue)) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 4, uv.getY(i) * 2.5); }
  mk(stone, new THREE.MeshStandardMaterial({ map: stoneTex, color: 0xf3e7d4, roughness: 0.9 }));
  mk(roofsRed, new THREE.MeshStandardMaterial({ bumpMap: roofTex, bumpScale: 2, color: 0xd2443a, roughness: 0.5 }));
  mk(roofsBlue, new THREE.MeshStandardMaterial({ bumpMap: roofTex, bumpScale: 2, color: 0x3f74d0, roughness: 0.5 }));
  mk(wood, new THREE.MeshStandardMaterial({ map: woodTex, color: 0xb98a5a, roughness: 0.8 }));
  mk(dark, new THREE.MeshStandardMaterial({ color: 0x2c2a3a, roughness: 0.5 }));
  mk(gold, new THREE.MeshStandardMaterial({ color: 0xffcf4a, metalness: 1, roughness: 0.25 }));
  // flags
  const flags = [];
  const flagMat = new THREE.MeshStandardMaterial({ color: 0xffc83a, side: THREE.DoubleSide, roughness: 0.7 });
  for (const [x, y, z] of [[0, spireTop + 0.3, -5], [-S, 12 + 7.6, -S], [S, 12 + 7.6, -S], [-S, 12 + 7.6, S], [S, 12 + 7.6, S]]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3, 6), new THREE.MeshStandardMaterial({ color: 0x5a4a3a })); pole.position.set(x, y + 1.5, z); castle.add(pole);
    const fg = new THREE.PlaneGeometry(2.4, 1.3, 12, 2).translate(1.2, 0, 0);
    const f = new THREE.Mesh(fg, flagMat); f.position.set(x, y + 2.4, z); f.castShadow = true; castle.add(f); flags.push(f); f.userData.base = fg.attributes.position.array.slice();
  }
  // ---- trees, bushes, flowers (instanced)
  const R = (() => { let s = 99; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); })();
  const foliageG = mergeGeometries([new THREE.IcosahedronGeometry(1.6, 1).translate(0, 3.2, 0), new THREE.IcosahedronGeometry(1.25, 1).translate(0.6, 4.3, 0.3), new THREE.IcosahedronGeometry(1.1, 1).translate(-0.6, 4.0, -0.4)]);
  const trunkG = new THREE.CylinderGeometry(0.25, 0.38, 2.8, 8).translate(0, 1.4, 0);
  const NT = 240, trees = [];
  for (let i = 0; i < 3000 && trees.length < NT; i++) {
    const a = R() * Math.PI * 2, d = 34 + Math.pow(R(), 0.8) * 190, x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (Math.hypot(x - 70, z - 45) < 50) continue; if (z > 10 && Math.abs(x - pathX(z)) < 5) continue;
    trees.push([x, heightAt(x, z) - 0.2, z, 0.8 + R() * 0.8, R()]);
  }
  const foliage = new THREE.InstancedMesh(foliageG, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 }), trees.length);
  const trunks = new THREE.InstancedMesh(trunkG, new THREE.MeshStandardMaterial({ color: 0x7a5233, roughness: 0.9 }), trees.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  trees.forEach(([x, y, z, s, k], i) => {
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), k * 6); m4.compose(v.set(x, y, z), q, sc.setScalar(s)); foliage.setMatrixAt(i, m4); trunks.setMatrixAt(i, m4);
    foliage.setColorAt(i, new THREE.Color().setHSL(0.24 + k * 0.08, 0.55, 0.28 + k * 0.12));
  });
  for (const m of [foliage, trunks]) { m.castShadow = true; m.receiveShadow = true; group.add(m); }
  const NF = 260, flowers = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.12, 1).scale(1, 0.5, 1), new THREE.MeshStandardMaterial({ roughness: 0.6 }), NF);
  const fc = [0xff7aa8, 0xffe14a, 0xffffff, 0xb38cff, 0xff9a3c];
  for (let i = 0; i < NF; i++) { const a = R() * Math.PI * 2, d = 19 + R() * 30, x = Math.cos(a) * d, z = Math.sin(a) * d;
    m4.compose(v.set(x, heightAt(x, z) + 0.12, z), q.identity(), sc.setScalar(0.7 + R() * 0.8)); flowers.setMatrixAt(i, m4); flowers.setColorAt(i, new THREE.Color(fc[i % fc.length])); }
  group.add(flowers);
  // ---- clouds (merged puffs)
  const puffs = [];
  for (let i = 0; i < 18; i++) {
    const a = i / 18 * Math.PI * 2 + R(), d = 60 + R() * 120, cx = Math.cos(a) * d, cz = Math.sin(a) * d, cy = 42 + R() * 25;
    const n = 6 + Math.floor(R() * 5);
    for (let j = 0; j < n; j++) { const r = 3 + R() * 4; puffs.push(new THREE.IcosahedronGeometry(r, 2).scale(1, 0.72, 1).translate(cx + (j - n / 2) * 3.6 + R() * 2, cy + R() * 2.5 + (j % 2) * 1.5, cz + (R() - .5) * 5)); }
  }
  const clouds = new THREE.Mesh(mergeGeometries(puffs), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, emissive: 0xb8c8e8, emissiveIntensity: 0.35 }));
  group.add(clouds);
  // ---- sun
  const sunDir = new THREE.Vector3(0.55, 0.62, -0.56).normalize();
  const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowSprite('rgba(255,247,215,1)', 'rgba(255,220,150,0)'), blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  sunSprite.position.copy(sunDir).multiplyScalar(500); sunSprite.scale.setScalar(150); group.add(sunSprite);
  // blob shadow (used under flying Worm)
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: blobShadow(), transparent: true, depthWrite: false }));
  blob.scale.set(9, 1, 14); group.add(blob);

  function update(dt, time) {
    clouds.rotation.y = time * 0.004;
    for (const f of flags) { const a = f.geometry.attributes.position, b = f.userData.base;
      for (let i = 0; i < a.count; i++) { const x = b[i * 3]; a.setZ(i, Math.sin(x * 2.2 - time * 5) * 0.18 * x / 2.4); } a.needsUpdate = true; }
  }
  return { group, castle, terrain, sunDir, blob, update, spireTop };
}

// ---- sky stars to collect --------------------------------------------------------------
export function buildStars(n = 8) {
  const group = new THREE.Group(); const list = [];
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + Math.PI / 2, r = i % 2 ? 0.55 : 1.3; i ? shape.lineTo(Math.cos(a) * r, Math.sin(a) * r) : shape.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  const starG = new THREE.ExtrudeGeometry(shape, { depth: 0.35, bevelEnabled: true, bevelThickness: 0.18, bevelSize: 0.16, bevelSegments: 3 }).center();
  const starM = new THREE.MeshPhysicalMaterial({ color: 0xffd34a, metalness: 0.65, roughness: 0.2, emissive: 0xffa21a, emissiveIntensity: 0.55, clearcoat: 1 });
  const ringG = new THREE.TorusGeometry(2.3, 0.1, 10, 48);
  const ringM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.15, 1.0, 0.55), transparent: true, opacity: 0.8 });
  const glow = glowSprite('rgba(255,230,140,1)', 'rgba(255,200,80,0)');
  for (let i = 0; i < n; i++) {
    const a = 0.35 + i * (5.2 / (n - 1)), R = 36 + Math.sin(i * 1.7) * 5, y = PLATEAU + 13 + Math.sin(i * 1.3) * 5 + (i % 3) * 1.5;
    const g = new THREE.Group(); g.position.set(Math.cos(a) * R, y, Math.sin(a) * R);
    const s = new THREE.Mesh(starG, starM); s.castShadow = false; g.add(s);
    const ring = new THREE.Mesh(ringG, ringM); g.add(ring);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.45 })); sp.scale.setScalar(7); g.add(sp);
    g.lookAt(0, y, 0);
    group.add(g); list.push({ g, star: s, ring, sp, got: false, base: g.position.clone(), pop: 0 });
  }
  function update(dt, time, nextIdx) {
    list.forEach((it, i) => {
      if (it.got) { it.pop += dt; const k = Math.max(0, 1 - it.pop * 2.5); it.g.scale.setScalar(k * (1 + it.pop * 3)); it.g.visible = k > 0; return; }
      it.star.rotation.y = time * 1.6 + i; it.g.position.y = it.base.y + Math.sin(time * 1.5 + i) * 0.5;
      const hi = i === nextIdx ? 1 : 0; const pulse = 1 + hi * 0.18 * Math.sin(time * 5);
      it.ring.scale.setScalar(pulse); it.sp.material.opacity = 0.3 + hi * 0.3;
    });
  }
  function reset() { list.forEach(it => { it.got = false; it.pop = 0; it.g.visible = true; it.g.scale.setScalar(1); }); }
  return { group, list, update, reset };
}
