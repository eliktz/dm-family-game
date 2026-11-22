// מערת הדרקונים — a warm, cosy cave under the castle (never scary): rock dome, sandy floor,
// a straw bed for Worm, glowing crystals + mushrooms, torches, a sunbeam from a ceiling crack,
// and the wooden cave gate (opens after the riddle). Lights are created once, never added later.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { noiseTexture, glowSprite } from './tex.js';

export const GATE_POS = new THREE.Vector3(6.5, 0, -15.2);
export function buildCave() {
  const group = new THREE.Group();
  const R = (() => { let s = 5; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); })();
  const n3 = (x, y, z) => Math.sin(x * 0.7 + Math.sin(z * 0.5)) * Math.cos(y * 0.9 + x * 0.3) + 0.5 * Math.sin(z * 1.7 + y * 1.3);
  // dome
  const dg = new THREE.SphereGeometry(19, 72, 36, 0, Math.PI * 2, 0, Math.PI / 2);
  const p = dg.attributes.position;
  for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(p, i); const k = 1 + 0.07 * n3(v.x * 0.4, v.y * 0.4, v.z * 0.4) + 0.03 * n3(v.x * 1.3, v.y, v.z * 1.3); v.multiplyScalar(k); v.y *= 0.62; p.setXYZ(i, v.x, v.y, v.z); }
  dg.computeVertexNormals();
  const rockCol = noiseTexture(512, [150, 116, 88], 70, 11, 2600); rockCol.colorSpace = THREE.SRGBColorSpace; rockCol.repeat.set(6, 3);
  const rockBump = noiseTexture(256, [128, 128, 128], 120, 4, 1800); rockBump.repeat.set(10, 5);
  const dome = new THREE.Mesh(dg, new THREE.MeshStandardMaterial({ map: rockCol, bumpMap: rockBump, bumpScale: 3, roughness: 0.92, side: THREE.BackSide, color: 0xd9b48e }));
  dome.receiveShadow = true; group.add(dome);
  // floor
  const fg = new THREE.CircleGeometry(19.5, 96).rotateX(-Math.PI / 2);
  const fp = fg.attributes.position; for (let i = 0; i < fp.count; i++) { const x = fp.getX(i), z = fp.getZ(i); fp.setY(i, 0.06 * n3(x, 0, z) + 0.6 * THREE.MathUtils.smoothstep(Math.hypot(x, z), 15, 19.5)); }
  fg.computeVertexNormals();
  const sandCol = noiseTexture(512, [196, 160, 118], 40, 21, 3000); sandCol.colorSpace = THREE.SRGBColorSpace; sandCol.repeat.set(5, 5);
  const floor = new THREE.Mesh(fg, new THREE.MeshStandardMaterial({ map: sandCol, bumpMap: rockBump, bumpScale: 1, roughness: 0.95, color: 0xb59474 }));
  floor.receiveShadow = true; floor.name = 'floor'; group.add(floor);
  // straw bed for Worm
  const straws = [];
  for (let i = 0; i < 700; i++) { const a = R() * Math.PI * 2, d = Math.sqrt(R()) * 1; const cx = -6.2 + Math.cos(a) * d * 4.6, cz = -10 + Math.sin(a) * d * 5.2;
    straws.push(new THREE.CylinderGeometry(0.022, 0.022, 0.5 + R() * 0.4, 4).rotateZ(Math.PI / 2 - 0.15 + R() * 0.3).rotateY(R() * Math.PI).translate(cx, 0.05 + R() * 0.12, cz)); }
  const straw = new THREE.Mesh(mergeGeometries(straws), new THREE.MeshStandardMaterial({ color: 0xc9a24e, roughness: 0.8 })); straw.receiveShadow = true; group.add(straw);
  // rocks around the edge
  const rocks = [];
  for (let i = 0; i < 46; i++) { const a = R() * Math.PI * 2, d = 15 + R() * 3.5, s = 0.6 + R() * 1.8;
    const g = new THREE.DodecahedronGeometry(s, 1); const rp = g.attributes.position; for (let j = 0; j < rp.count; j++) rp.setXYZ(j, rp.getX(j) * (1 + 0.15 * Math.sin(j)), rp.getY(j) * 0.7, rp.getZ(j));
    g.computeVertexNormals(); rocks.push(g.translate(Math.cos(a) * d, s * 0.3, Math.sin(a) * d)); }
  // stalactites
  for (let i = 0; i < 30; i++) { const a = R() * Math.PI * 2, d = 4 + R() * 11, h = 0.8 + R() * 1.8; const y = Math.sqrt(Math.max(0, 1 - (d / 19) ** 2)) * 19 * 0.62;
    rocks.push(new THREE.ConeGeometry(0.25 + R() * 0.35, h, 7).toNonIndexed().rotateX(Math.PI).translate(Math.cos(a) * d, y - h / 2 + 0.3, Math.sin(a) * d)); }
  const rockMesh = new THREE.Mesh(mergeGeometries(rocks.map(g => g.index ? g.toNonIndexed() : g)), new THREE.MeshStandardMaterial({ map: rockCol, roughness: 0.9, color: 0xc9a07a }));
  rockMesh.castShadow = true; rockMesh.receiveShadow = true; group.add(rockMesh);
  // crystals (emissive, bloom)
  const crys = [];
  const cSpots = [[-13, -8], [12, 6], [-9, 11], [14, -6], [-15, 3], [3, -16.5]];
  for (const [x, z] of cSpots) for (let j = 0; j < 6; j++) { const h = 0.8 + R() * 1.6;
    crys.push(new THREE.OctahedronGeometry(0.28 + R() * 0.2, 0).scale(1, h * 2, 1).rotateZ((R() - .5) * 0.9).rotateX((R() - .5) * 0.6).translate(x + (R() - .5) * 1.4, h * 0.4, z + (R() - .5) * 1.4)); }
  const crystals = new THREE.Mesh(mergeGeometries(crys), new THREE.MeshPhysicalMaterial({ color: 0x7dfcd8, emissive: 0x2ee6b5, emissiveIntensity: 1.2, roughness: 0.08, clearcoat: 1, transparent: true, opacity: 0.92, flatShading: true }));
  group.add(crystals);
  // glowing mushrooms
  const caps = [], stems = [];
  for (let i = 0; i < 34; i++) { const a = R() * Math.PI * 2, d = 13 + R() * 3, x = Math.cos(a) * d, z = Math.sin(a) * d, h = 0.3 + R() * 0.5, r = 0.2 + R() * 0.25;
    stems.push(new THREE.CylinderGeometry(r * 0.3, r * 0.4, h, 8).toNonIndexed().translate(x, h / 2, z));
    caps.push(new THREE.SphereGeometry(r, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2).toNonIndexed().translate(x, h, z)); }
  group.add(new THREE.Mesh(mergeGeometries(stems), new THREE.MeshStandardMaterial({ color: 0xf2e6d0, roughness: 0.8 })));
  group.add(new THREE.Mesh(mergeGeometries(caps), new THREE.MeshStandardMaterial({ color: 0x8fb4ff, emissive: 0x6f8cff, emissiveIntensity: 1.1, roughness: 0.4 })));
  // torches
  const flames = [], torchSpots = [[-11, 0, -10.5], [11.5, 0, -9.5], [-14, 0, 6], [14.5, 0, 4]];
  const flameTex = glowSprite('rgba(255,190,90,1)', 'rgba(255,120,30,0)');
  const woodM = new THREE.MeshStandardMaterial({ color: 0x6b4425, roughness: 0.8 });
  for (const [x, , z] of torchSpots) {
    const t = new THREE.Group(); t.position.set(x, 0, z); group.add(t);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 2.4, 8), woodM); post.position.y = 1.2; post.castShadow = true; t.add(post);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.18, 0.3, 12), new THREE.MeshStandardMaterial({ color: 0x3b3430, metalness: 0.6, roughness: 0.4 })); bowl.position.y = 2.5; t.add(bowl);
    const core = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.6, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.6, 0.5) })); core.position.y = 2.9; t.add(core);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex, blending: THREE.AdditiveBlending, depthWrite: false })); halo.position.y = 2.95; halo.scale.setScalar(2.2); t.add(halo);
    flames.push({ core, halo });
  }
  // lights (created once)
  const hemi = new THREE.HemisphereLight(0xffe2c0, 0x5a3a28, 0.75); group.add(hemi);
  const warmA = new THREE.PointLight(0xffa860, 30, 22, 1.6); warmA.position.set(-11, 3.2, -10); group.add(warmA);
  const warmB = new THREE.PointLight(0xffa860, 30, 22, 1.6); warmB.position.set(13, 3.2, 5); group.add(warmB);
  const teal = new THREE.PointLight(0x5fffd0, 10, 16, 1.6); teal.position.set(-12, 2, -6); group.add(teal);
  const beam = new THREE.SpotLight(0xfff0d0, 55, 30, 0.42, 0.8, 1.0); beam.position.set(-1, 13, -1); beam.target.position.set(-2, 0, -3);
  beam.castShadow = true; beam.shadow.mapSize.set(1024, 1024); beam.shadow.bias = -0.0005; beam.shadow.camera.near = 4; beam.shadow.camera.far = 30;
  group.add(beam, beam.target);
  // visible sunbeam + dust
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 3.6, 12, 32, 1, true), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { time: { value: 0 } },
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV; uniform float time; void main(){ float edge = pow(abs(dot(vN, vV)), 1.5); float a = edge * smoothstep(0.0, 0.5, vUv.y) * (0.07 + 0.02*sin(vUv.x*40. + time)); gl_FragColor = vec4(1.0, 0.93, 0.75, a); }`,
  }));
  shaft.position.set(-1.6, 6.4, -2.4); shaft.rotation.z = 0.06; group.add(shaft);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(1.3, 24).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.5, 2.4, 2.1) })); hole.position.set(-1.2, 11.75, -2.0); group.add(hole);

  // gate (arch + two wooden doors + daylight behind)
  const gate = new THREE.Group(); gate.position.copy(GATE_POS); gate.lookAt(0, 0, 0); group.add(gate);
  const arch = [];
  for (let i = 0; i <= 12; i++) { const a = Math.PI - i / 12 * Math.PI; arch.push(new THREE.BoxGeometry(0.9, 0.9, 1.2).rotateZ(a).translate(Math.cos(a) * 2.9, 3.4 + Math.sin(a) * 2.6, 0).toNonIndexed()); }
  for (const sx of [-1, 1]) for (let j = 0; j < 4; j++) arch.push(new THREE.BoxGeometry(1.0, 0.85, 1.2).translate(sx * 2.95, 0.42 + j * 0.86, 0).toNonIndexed());
  const archM = new THREE.Mesh(mergeGeometries(arch), new THREE.MeshStandardMaterial({ map: rockCol, color: 0xd8c4a8, roughness: 0.85 })); archM.castShadow = true; gate.add(archM);
  const daylight = new THREE.Mesh(new THREE.CircleGeometry(3.0, 32, 0, Math.PI).translate(0, 3.4, -0.4), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.6, 3.0) }));
  const dayRect = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 3.4).translate(0, 1.7, -0.4), daylight.material);
  gate.add(daylight, dayRect);
  const wtex = new THREE.TextureLoader().load('assets/textures/wood_1k.jpg'); wtex.colorSpace = THREE.SRGBColorSpace;
  const doorM = new THREE.MeshStandardMaterial({ map: wtex, color: 0xc08a58, roughness: 0.75, side: THREE.DoubleSide });
  const ironM = new THREE.MeshStandardMaterial({ color: 0x3a3634, metalness: 0.7, roughness: 0.4 });
  const doors = [-1, 1].map(sx => {
    const hinge = new THREE.Group(); hinge.position.set(sx * 2.5, 0, 0); gate.add(hinge);
    const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.lineTo(2.5, 0); shape.lineTo(2.5, 5.9);
    shape.absarc(2.5, 3.4, 2.5, Math.PI / 2, Math.PI, false); shape.lineTo(0, 0);
    const dg2 = new THREE.ExtrudeGeometry(shape, { depth: 0.25, bevelEnabled: false }); dg2.translate(0, 0, -0.12);
    if (sx > 0) dg2.scale(-1, 1, 1);
    const uv = dg2.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.3, uv.getY(i) * 0.3);
    const d = new THREE.Mesh(dg2, doorM); d.castShadow = true; d.position.x = 0; hinge.add(d);
    for (const y of [0.9, 2.6]) { const b = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.18, 0.32), ironM); b.position.set(-sx * 1.25, y, 0); hinge.add(b); }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.04, 8, 16), ironM); ring.position.set(-sx * 2.15, 1.8, 0.2); hinge.add(ring);
    return hinge;
  });
  let gateOpen = 0, gateTarget = 0;

  function update(dt, time) {
    flames.forEach((f, i) => { const k = 1 + 0.12 * Math.sin(time * 13 + i * 2) + 0.08 * Math.sin(time * 7.3 + i); f.core.scale.set(1, k, 1); f.halo.scale.setScalar(2.2 * k); });
    warmA.intensity = 30 * (1 + 0.08 * Math.sin(time * 11)); warmB.intensity = 30 * (1 + 0.08 * Math.sin(time * 9 + 1));
    shaft.material.uniforms.time.value = time;
    gateOpen += (gateTarget - gateOpen) * Math.min(1, dt * 1.4);
    doors[0].rotation.y = gateOpen * 1.7; doors[1].rotation.y = -gateOpen * 1.7;
  }
  return { group, floor, update, openGate() { gateTarget = 1; }, closeGate() { gateTarget = 0; gateOpen = 0; }, gate, get gateOpen() { return gateOpen; } };
}
