// Renderer core: WebGL2 + ACES tone mapping, soft shadows, HDRI/PMREM environment,
// bloom post-processing (NaN-safe), DPR cap and auto quality tiers (downgrade only).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export class Engine {
  constructor(canvas) {
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 0.9;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
    this.tier = 'high'; r.info.autoReset = false;
    this.maxDpr = 2;
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 900);
    this.scene = null;
    this.pmrem = new THREE.PMREMGenerator(r);
    const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(r, rt);
    this.renderPass = new RenderPass(new THREE.Scene(), this.camera);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.3, 0.5, 0.95);
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.stats = { fps: 60, frames: 0 };
    this._fpsAcc = 0; this._fpsN = 0; this._warm = 0;
    this.resize();
    addEventListener('resize', () => this.resize());
  }
  roomEnv(intensityScene) {
    const env = this.pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    return env;
  }
  async loadHDR(url) {
    const tex = await new HDRLoader().loadAsync(url);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    const env = this.pmrem.fromEquirectangular(tex).texture;
    return { background: tex, env };
  }
  setScene(scene) { this.scene = scene; this.renderPass.scene = scene; }
  resize() {
    const w = innerWidth, h = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, this.maxDpr);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.composer.setPixelRatio(dpr);
    this.composer.setSize(w, h);
    // keep a comfortable horizontal field of view on narrow (portrait / phone) screens
    const fov = w / h < 1.2 ? 62 : 50;
    // short landscape screens (phones): the dialog and HUD take a big slice of the top, so the picture is framed lower.
    // We render the upper part of a taller virtual frame: the scene centre moves down by shift/2 of the screen height.
    const short = h < 520 && w > h, s = this.viewShift = short ? 0.3 : 0;
    if (s) {
      this.camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(fov + (short ? 6 : 0)) / 2) * (1 + s)));
      this.camera.aspect = w / (h * (1 + s)); this.camera.setViewOffset(w, h * (1 + s), 0, 0, w, h);
    } else { this.camera.clearViewOffset(); this.camera.fov = fov; this.camera.aspect = w / h; }
    this.camera.updateProjectionMatrix();
  }
  setTier(t) {
    if (t === this.tier) return;
    this.tier = t;
    this.maxDpr = t === 'high' ? 2 : t === 'medium' ? 1.5 : 1;
    this.renderer.shadowMap.enabled = t !== 'low';
    this.bloom.enabled = t !== 'low';
    this.scene && this.scene.traverse(o => { if (o.material) o.material.needsUpdate = true; });
    this.resize();
  }
  render(dt) {
    // FPS sampling after warm-up; only ever downgrade (iPad thermals)
    this._warm += dt;
    if (this._warm > 3 && !this.noAuto) {
      this._fpsAcc += dt; this._fpsN++;
      if (this._fpsAcc > 2) {
        const fps = this._fpsN / this._fpsAcc; this.stats.fps = Math.round(fps);
        this._fpsAcc = 0; this._fpsN = 0;
        if (fps < 40 && this.tier === 'high') this.setTier('medium');
        else if (fps < 30 && this.tier === 'medium') this.setTier('low');
      }
    }
    this.stats.frames++; this.renderer.info.reset();
    if (this.bloom.enabled) this.composer.render(dt);
    else this.renderer.render(this.scene, this.camera);
  }
  info() {
    const i = this.renderer.info;
    return { fps: this.stats.fps, tier: this.tier, drawCalls: i.render.calls, triangles: i.render.triangles,
      geometries: i.memory.geometries, textures: i.memory.textures };
  }
}
