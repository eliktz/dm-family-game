// Procedural chibi characters: דרייק, גריפית', המלך רולנד.
// Origin at the feet, facing +z. Swap point: a GLB with the same name can replace `root`'s
// children (see README); the walk/sit/wave API stays the same.
import * as THREE from 'three';

const std = (color, o = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.8, sheen: 0.35, sheenColor: new THREE.Color(0xffffff), sheenRoughness: 0.8, ...o });
const sph = (r, w = 28, h = 18) => new THREE.SphereGeometry(r, w, h);
const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 6, 16);

export function makeChibi(o) {
  const root = new THREE.Group(); const body = new THREE.Group(); root.add(body);
  const mesh = (g, m, p, parent = body, s) => { const x = new THREE.Mesh(g, m); x.position.set(...p); if (s) x.scale.set(...s); x.castShadow = true; parent.add(x); return x; };
  const skin = std(o.skin ?? 0xf1c39b, { roughness: 0.6, sheen: 0.2 });
  const parts = {};
  // legs (pivots at the hip)
  parts.legs = [-1, 1].map(sx => {
    const p = new THREE.Group(); p.position.set(sx * 0.12, 0.58, 0); body.add(p);
    mesh(cap(0.105, 0.3), std(o.pants ?? 0x6b4a2b), [0, -0.24, 0], p);
    mesh(sph(0.13), std(o.shoes ?? 0x4a2c17, { roughness: 0.6 }), [0, -0.52, 0.05], p, [1, 0.65, 1.45]);
    return p;
  });
  const torsoY = 0.88;
  if (o.robe) mesh(new THREE.CylinderGeometry(0.27, 0.48, 1.05, 24), std(o.robe), [0, 0.55, 0]);
  mesh(cap(0.25, 0.28), std(o.tunic ?? 0x6c9a3c), [0, torsoY, 0], body, [1, 1, 0.85]);
  if (o.trim) mesh(new THREE.TorusGeometry(0.235, 0.035, 8, 24), std(o.trim, { metalness: 0.6, roughness: 0.35 }), [0, 1.08, 0], body, [1, 0.85, 1]).rotation.x = Math.PI / 2;
  mesh(new THREE.TorusGeometry(0.245, 0.04, 8, 28), std(o.belt ?? 0x7a5230), [0, 0.74, 0], body, [1, 0.85, 1]).rotation.x = Math.PI / 2;
  // arms (pivots at the shoulder)
  parts.arms = [-1, 1].map(sx => {
    const p = new THREE.Group(); p.position.set(sx * 0.3, 1.06, 0); body.add(p);
    mesh(cap(0.08, 0.3), std(o.sleeve ?? o.tunic ?? 0x6c9a3c), [sx * 0.03, -0.2, 0], p);
    mesh(sph(0.085), skin, [sx * 0.04, -0.42, 0.02], p);
    p.rotation.z = sx * 0.12; return p;
  });
  // head
  const head = parts.head = new THREE.Group(); head.position.set(0, 1.45, 0); body.add(head);
  mesh(sph(0.36, 36, 24), skin, [0, 0, 0], head);
  for (const sx of [-1, 1]) {
    mesh(sph(0.075), skin, [sx * 0.35, -0.02, 0], head, [0.6, 1, 0.8]);
    const eye = mesh(sph(0.058, 16, 12), new THREE.MeshPhysicalMaterial({ color: o.eye ?? 0x2b1a0e, roughness: 0.1, clearcoat: 1 }), [sx * 0.13, 0.03, 0.32], head, [1, 1.25, 0.6]);
    mesh(sph(0.018, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), [sx * 0.13 + 0.018, 0.06, 0.355], head);
    mesh(sph(0.06, 12, 8), new THREE.MeshBasicMaterial({ color: 0xff9a8a, transparent: true, opacity: 0.35, depthWrite: false }), [sx * 0.21, -0.1, 0.29], head, [1, 0.6, 0.4]);
    mesh(new THREE.BoxGeometry(0.11, 0.022, 0.02), std(o.brow ?? o.hair ?? 0x5a3416), [sx * 0.13, 0.15, 0.335], head).rotation.z = sx * -0.12;
  }
  mesh(sph(0.045, 12, 8), skin, [0, -0.04, 0.36], head);
  const smile = mesh(new THREE.TorusGeometry(0.07, 0.012, 6, 16, Math.PI), new THREE.MeshStandardMaterial({ color: 0x8a3a2a }), [0, -0.14, 0.33], head);
  smile.rotation.z = Math.PI;
  const hairM = std(o.hair ?? 0x5a3416, { roughness: 0.65, sheen: 0.25, sheenColor: new THREE.Color(0xffc890) });
  if (o.hairStyle === 'tousled') {
    mesh(new THREE.SphereGeometry(0.385, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.55), hairM, [0, 0.02, -0.02], head).rotation.x = -0.45;
    for (let i = 0; i < 7; i++) { const a = -0.9 + i * 0.3; mesh(sph(0.1, 12, 8), hairM, [Math.sin(a) * 0.26, 0.24 + Math.cos(i * 2) * 0.03, Math.cos(a) * 0.22], head, [1, 0.8, 1]); }
  } else if (o.hairStyle === 'wizard') {
    mesh(new THREE.SphereGeometry(0.375, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.6), hairM, [0, 0, -0.03], head).rotation.x = -0.7;
  }
  if (o.beard) {
    const bm = std(o.beard, { roughness: 0.9, sheen: 0.8 });
    mesh(new THREE.ConeGeometry(0.26, o.beardLen ?? 0.7, 20), bm, [0, -0.38 - (o.beardLen ?? 0.7) / 2 + 0.25, 0.17], head).rotation.x = Math.PI + 0.12;
    mesh(sph(0.24, 20, 14), bm, [0, -0.2, 0.18], head, [1.1, 0.75, 0.8]);
    mesh(new THREE.CapsuleGeometry(0.04, 0.16, 4, 8), bm, [0.09, -0.11, 0.35], head).rotation.z = 1.2;
    mesh(new THREE.CapsuleGeometry(0.04, 0.16, 4, 8), bm, [-0.09, -0.11, 0.35], head).rotation.z = -1.2;
  }
  if (o.hat) {
    mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.04, 32), std(o.hat), [0, 0.26, 0], head);
    const tip = mesh(new THREE.ConeGeometry(0.3, 0.8, 28), std(o.hat), [0, 0.66, -0.05], head); tip.rotation.x = -0.18;
    mesh(new THREE.TorusGeometry(0.3, 0.035, 8, 28), std(o.trim ?? 0xe0b24a, { metalness: 0.7, roughness: 0.3 }), [0, 0.3, 0], head).rotation.x = Math.PI / 2;
  }
  if (o.crown) {
    const gold = new THREE.MeshPhysicalMaterial({ color: 0xffc83a, metalness: 1, roughness: 0.25 });
    mesh(new THREE.CylinderGeometry(0.27, 0.29, 0.14, 24, 1, true), gold, [0, 0.33, 0], head);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; mesh(new THREE.ConeGeometry(0.06, 0.14, 8), gold, [Math.sin(a) * 0.27, 0.46, Math.cos(a) * 0.27], head); }
    mesh(sph(0.04, 10, 8), new THREE.MeshPhysicalMaterial({ color: 0xe02a3a, roughness: 0.1, clearcoat: 1 }), [0, 0.34, 0.29], head);
  }
  if (o.cape) { const c = mesh(new THREE.CylinderGeometry(0.3, 0.55, 1.1, 24, 1, true, Math.PI * 0.6, Math.PI * 0.8), std(o.cape, { side: THREE.DoubleSide }), [0, 0.6, -0.02], body); c.rotation.y = Math.PI; }
  if (o.staff) {
    const sp = new THREE.Group(); parts.arms[1].add(sp); sp.position.set(0.05, -0.42, 0.05);
    mesh(new THREE.CylinderGeometry(0.03, 0.035, 1.8, 10), std(0x6b4425, { roughness: 0.6 }), [0, 0.25, 0], sp);
    parts.orb = mesh(sph(0.1, 18, 12), new THREE.MeshPhysicalMaterial({ color: 0x9dffc0, emissive: 0x3dff88, emissiveIntensity: 1.6, roughness: 0.1, clearcoat: 1 }), [0, 1.2, 0], sp);
  }
  if (o.pendant) {
    mesh(new THREE.TorusGeometry(0.17, 0.012, 6, 24), std(0x5a3b22), [0, 1.08, 0.08], body, [1, 1.2, 1]).rotation.x = 1.2;
    parts.stone = mesh(new THREE.OctahedronGeometry(0.075, 0), new THREE.MeshPhysicalMaterial({ color: 0x3fd46a, emissive: 0x22ff66, emissiveIntensity: 0.3, roughness: 0.05, clearcoat: 1, flatShading: true }), [0, 0.96, 0.24], body, [0.8, 1.15, 0.6]);
  }
  root.scale.setScalar(o.scale ?? 1);
  let phase = 0, walk = 0, wave = 0, sit = 0;
  return {
    root, parts,
    setWalk(v) { walk = v; }, setSit(v) { sit = v; }, wave(v = 2.5) { wave = v; },
    setStoneGlow(v) { if (parts.stone) parts.stone.material.emissiveIntensity = 0.3 + v * 5; },
    update(dt, time) {
      phase += dt * (4 + walk * 7) * (walk > 0.05 ? 1 : 0);
      const sw = Math.sin(phase) * 0.7 * Math.min(1, walk);
      parts.legs[0].rotation.x = sw * (1 - sit) - sit * 1.45; parts.legs[1].rotation.x = -sw * (1 - sit) - sit * 1.45;
      parts.legs[0].rotation.z = -sit * 0.35; parts.legs[1].rotation.z = sit * 0.35;
      parts.arms[0].rotation.x = -sw * 0.8 - sit * 0.9; parts.arms[1].rotation.x = sw * 0.8 - sit * 0.9;
      body.position.y = Math.abs(Math.sin(phase)) * 0.05 * Math.min(1, walk) + Math.sin(time * 2) * 0.008 - sit * 0.45;
      wave = Math.max(0, wave - dt);
      if (wave > 0) { parts.arms[0].rotation.x = -2.6; parts.arms[0].rotation.z = -0.4 + Math.sin(time * 12) * 0.35; }
      else parts.arms[0].rotation.z = -0.12;
      parts.head.rotation.z = Math.sin(time * 1.3) * 0.03;
      if (parts.orb) parts.orb.material.emissiveIntensity = 1.4 + Math.sin(time * 3) * 0.4;
    },
  };
}

export const makeDrake = () => makeChibi({ hairStyle: 'tousled', hair: 0x5a2f10, tunic: 0x6f9a3d, sleeve: 0x8fb35a, pants: 0x7b5634, belt: 0x5e3d20, pendant: true });
export const makeGriffith = () => makeChibi({ hairStyle: 'wizard', hair: 0xf2f2f2, brow: 0xe8e8e8, robe: 0x4a3c8f, tunic: 0x4a3c8f, sleeve: 0x5a4aa5, trim: 0xe3b54a, belt: 0xe3b54a, beard: 0xf5f5f5, beardLen: 0.8, hat: 0x3b2f78, staff: true, skin: 0xf0c4a2, scale: 1.12 });
export const makeKing = () => makeChibi({ hairStyle: 'wizard', hair: 0x8a5a2a, robe: 0xb3262e, tunic: 0xb3262e, sleeve: 0xc4383f, trim: 0xffc83a, belt: 0xffc83a, beard: 0x8a5a2a, beardLen: 0.35, crown: true, cape: 0x7a1a3a, scale: 1.05 });
