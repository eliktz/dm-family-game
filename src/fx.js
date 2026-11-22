// Particle FX in two draw calls (hearts = normal blend, sparkles = additive).
import * as THREE from 'three';
import { heartSprite, sparkleSprite } from './tex.js';

class Pool {
  constructor(tex, max, additive) {
    this.max = max; this.n = 0; this.items = [];
    const g = this.geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(max * 3); this.size = new Float32Array(max); this.col = new Float32Array(max * 4);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('size', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('rgba', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: tex }, scale: { value: 600 } }, transparent: true, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      vertexShader: `attribute float size; attribute vec4 rgba; varying vec4 vC; uniform float scale;
        void main(){ vC = rgba; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = min(400.0, size * scale / -mv.z); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform sampler2D map; varying vec4 vC;
        void main(){ vec4 t = texture2D(map, vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y)); gl_FragColor = vec4(t.rgb * vC.rgb, t.a * vC.a); if (gl_FragColor.a < 0.01) discard; }`,
    });
    this.points = new THREE.Points(g, this.mat); this.points.frustumCulled = false; this.points.renderOrder = 10;
  }
  emit(p) { if (this.items.length >= this.max) this.items.shift(); this.items.push(p); }
  update(dt) {
    let i = 0;
    this.items = this.items.filter(p => (p.life -= dt) > 0);
    for (const p of this.items) {
      p.vel.y += (p.grav ?? 0) * dt; p.vel.multiplyScalar(1 - (p.drag ?? 0.5) * dt); p.pos.addScaledVector(p.vel, dt);
      const k = p.life / p.max, fade = Math.min(1, k * 3) * Math.min(1, (1 - k) * 8);
      this.pos.set([p.pos.x, p.pos.y + (p.wob ? Math.sin(p.life * 6) * 0.05 : 0), p.pos.z], i * 3);
      this.size[i] = p.size * (p.grow ? (1.4 - k * 0.6) : 1) * (p.twinkle ? 0.7 + 0.3 * Math.sin(p.life * 20 + i) : 1);
      this.col.set([p.color.r, p.color.g, p.color.b, fade], i * 4); i++;
    }
    this.n = i; this.geo.setDrawRange(0, i);
    for (const a of ['position', 'size', 'rgba']) this.geo.attributes[a].needsUpdate = true;
  }
}

export class FX {
  constructor() {
    this.group = new THREE.Group();
    this.hearts = new Pool(heartSprite(), 80, false);
    this.sparks = new Pool(sparkleSprite(), 400, true);
    this.group.add(this.hearts.points, this.sparks.points);
  }
  attach(scene) { scene.add(this.group); }
  setScale(h) { this.hearts.mat.uniforms.scale.value = this.sparks.mat.uniforms.scale.value = h * 0.75; }
  hearts3(at, n = 6) {
    for (let i = 0; i < n; i++) this.hearts.emit({ pos: at.clone().add(new THREE.Vector3((Math.random() - .5) * 1.6, Math.random() * 0.6, (Math.random() - .5) * 1.6)),
      vel: new THREE.Vector3((Math.random() - .5) * 0.8, 1.4 + Math.random(), (Math.random() - .5) * 0.8), life: 1.8 + Math.random() * 0.6, max: 2.4, size: 0.55 + Math.random() * 0.3, color: new THREE.Color(1, 1, 1), drag: 0.6, wob: true, grow: true });
  }
  burst(at, color = 0xfff2a0, n = 30, speed = 4, size = 0.45, life = 1.2, grav = -1) {
    const c = new THREE.Color(color);
    for (let i = 0; i < n; i++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(speed * (0.4 + Math.random() * 0.6));
      this.sparks.emit({ pos: at.clone(), vel: v, life: life * (0.6 + Math.random() * 0.4), max: life, size: size * (0.6 + Math.random() * 0.6), color: c, grav, drag: 1.5, twinkle: true }); }
  }
  confetti(at, n = 80) {
    const cols = [0xff5f8f, 0xffd23f, 0x5fd3ff, 0x7dff8a, 0xc58bff, 0xffa04a];
    for (let i = 0; i < n; i++) { const v = new THREE.Vector3((Math.random() - .5) * 14, 6 + Math.random() * 9, (Math.random() - .5) * 14);
      this.sparks.emit({ pos: at.clone(), vel: v, life: 2.5 + Math.random(), max: 3.5, size: 0.6 + Math.random() * 0.4, color: new THREE.Color(cols[i % cols.length]), grav: -6, drag: 0.8, twinkle: true }); }
  }
  trail(at, color = 0x7dffb0, size = 0.35) {
    this.sparks.emit({ pos: at.clone().add(new THREE.Vector3((Math.random() - .5) * 0.8, (Math.random() - .5) * 0.8, (Math.random() - .5) * 0.8)), vel: new THREE.Vector3(0, 0.3, 0),
      life: 1.0, max: 1.0, size: size * (0.6 + Math.random() * 0.8), color: new THREE.Color(color), drag: 1, twinkle: true });
  }
  update(dt) { this.hearts.update(dt); this.sparks.update(dt); }
}
