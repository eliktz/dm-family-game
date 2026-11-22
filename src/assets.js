// Optional GLB swap-in (Blender pipeline: /workspace/dmgame-assets → assets/models/).
// The game is fully playable with zero models: models.json is consulted first, so nothing 404s.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export async function loadModels(targets) {
  let manifest = {};
  try { manifest = await (await fetch('assets/models/models.json')).json(); } catch { return {}; }
  const loader = new GLTFLoader(), out = {};
  await Promise.all(Object.entries(targets).map(async ([key, t]) => {
    const e = manifest[key]; if (!e || !e.url) return;
    try {
      const gltf = await loader.loadAsync(e.url);
      const obj = gltf.scene; obj.scale.setScalar(e.scale ?? 1); obj.position.y = e.y ?? 0; obj.rotation.y = e.rotY ?? 0;
      obj.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      // hide the procedural visual, keep its root (so all game logic / positions stay the same)
      for (const c of t.root.children) c.visible = false;
      t.root.add(obj);
      const mixer = gltf.animations.length ? new THREE.AnimationMixer(obj) : null;
      const clips = Object.fromEntries(gltf.animations.map(a => [a.name.toLowerCase(), a]));
      out[key] = { obj, mixer, clips, play(name) { const c = clips[name]; if (!mixer || !c) return; mixer.stopAllAction(); mixer.clipAction(c).play(); } };
      out[key].play('idle');
    } catch (err) { console.warn('model swap skipped for', key, err?.message); }
  }));
  return out;
}
