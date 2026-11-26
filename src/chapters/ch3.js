// Chapter 3 "השמש של אנה" (see STORY.md): Ana and Kepri, her sun dragon, arrive from the desert. The Grumble Cloud
// covers the sun over the castle gardens and the flowers close. Worm lifts three mirrors with his mind power; the
// player taps each mirror to turn it until Kepri's sunbeam reaches a flower bed. Twice the cloud's little puffs block
// the beams and a subtraction / missing-number riddle clears them. Keepsake: a golden sun disc.
// Everything is created once at start-up (hidden): no lights or materials are added at runtime.
import { createWorm } from '../worm.js';
import { makeChibi } from '../people.js';
import { glowSprite } from '../tex.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const SUN = { back: 0xc9861a, side: 0xe3a52c, belly: 0xfbe9a8, tail: 0xe3a52c, spike: 0xffd75a, head: 0xdc9a24, muzzle: 0xf0bb4a, fin: 0xffcf52, horn: 0xfff0c0, iris: 0x8a4a10, sheen: 0xfff0b0 };

export function chapter3(G) {
  const { THREE, cam, fx, worm, drake, outdoor, heightAt, sun, world, ui, say, toast, hideToast, card, fade, sfx, runner, wait } = G;
  const V = (x, y, z) => new THREE.Vector3(x, y, z), $ = s => document.querySelector(s);
  const ground = (x, z, up = 0) => V(x, heightAt(x, z) + up, z);
  const ease = k => k * k * (3 - 2 * k), lerp = THREE.MathUtils.lerp;

  // ---------------------------------------------------------------- garden layout (in front of the castle gate, camera looks at the castle)
  const WORM_AT = ground(3.5, 23.5), WORM_RY = -1.1;
  const DRAKE_AT = ground(-1.6, 30.8), KEPRI_AT = ground(-9.5, 26.5), ANA_AT = ground(-7.4, 29.8);
  const KEPRI_FROM = ground(-24, 33), ANA_FROM = ground(-21.5, 36);
  const STEP = Math.PI / 4;                                    // a tap turns a mirror by 45°
  const dirOf = s => V(Math.sin(s * STEP), 0, Math.cos(s * STEP));
  const MIRRORS = [{ x: -2.4, z: 25.4, good: 7, start: 4 }, { x: 2, z: 27.2, good: 0, start: 3 }, { x: 6.4, z: 25.4, good: 1, start: 5 }]
    .map(m => { const p = ground(m.x, m.z, 1.75), b = p.clone().addScaledVector(dirOf(m.good), 4.6); return { ...m, pos: p, bed: ground(b.x, b.z) }; });
  // phones have a wider field of view (see engine.js), so tablets stand further back to fit Kepri on the left and the third bed on the right
  const CAM_WIDE = G.engine.viewShift ? { pos: ground(0.4, 42, 6.4), look: ground(0.4, 26.8, 1.2) } : { pos: ground(0.2, 48.5, 8.2), look: ground(0.2, 26.4, 1.6) };
  const CAM_MEET = { pos: ground(-1.5, 41.5, 3.8), look: ground(-7.4, 28, 1.6) };
  const CAM_WORM = { pos: ground(0.5, 33.5, 2.6), look: ground(2.6, 24.4, 1.9) };
  const CLOUD_UP = ground(0.5, 19.5, G.engine.viewShift ? 7.3 : 6.7), /* low enough that the speech bubble never covers his face */ CLOUD_FAR = ground(34, 6, 24);

  // ---------------------------------------------------------------- actors
  const ana = makeChibi({ hairStyle: 'tousled', hair: 0x2a1a12, eye: 0x2a1408, tunic: 0xe8a02c, sleeve: 0xf2c04e, pants: 0x8a5a34, belt: 0xb5462e, shoes: 0x6a4028, skin: 0xd9a070, pendant: true, lod: 0.5 });
  const kepri = createWorm({ name: 'sunDragon', colors: SUN, length: 8.5, finScale: 1.5, dorsal: 'fin', lod: 0.4, light: false, shadow: false, simple: true });
  kepri.root.scale.setScalar(0.9);
  ana.root.traverse(o => { o.castShadow = false; });
  // the Grumble Cloud: puffy, grey, big round eyes, a pouty mouth. Cute, never menacing, no lightning.
  const cloud = new THREE.Group(), puffM = new THREE.MeshStandardMaterial({ color: 0x9aa1ab, roughness: 1 });
  cloud.add(new THREE.Mesh(mergeGeometries([[0, 0, 0, 2.4], [-2.4, -0.3, 0.2, 1.7], [2.5, -0.2, 0.1, 1.8], [-1.1, 1.2, -0.2, 1.6], [1.2, 1.3, -0.1, 1.7], [-3.8, -0.5, 0, 1.1], [3.9, -0.4, 0, 1.2]]
    .map(([x, y, z, r]) => new THREE.IcosahedronGeometry(r, 1).scale(1, 0.8, 1).translate(x, y, z))), puffM));
  const eyeW = new THREE.MeshStandardMaterial({ color: 0xd9d9d6, roughness: 0.3 }), eyeB = new THREE.MeshStandardMaterial({ color: 0x20242c, roughness: 0.2 });
  for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.46, 14, 10), eyeW); e.position.set(sx * 0.8, 0.25, 2.1); cloud.add(e);
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), eyeB); p.position.set(sx * 0.8, 0.18, 2.5); cloud.add(p); }
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.07, 6, 14, Math.PI), eyeB); mouth.position.set(0, -0.75, 2.25); cloud.add(mouth); // an upside-down smile = a pout
  // silly, not scary: rosy cheeks, two tiny raised brows and a wobbly tuft on top; he bounces and puffs up when he grumbles
  const cheekM = new THREE.MeshStandardMaterial({ color: 0xe7a0aa, roughness: 0.9 });
  for (const sx of [-1, 1]) { const c = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), cheekM); c.scale.set(1, 0.6, 0.4); c.position.set(sx * 1.5, -0.35, 2.05); cloud.add(c);
    const br = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.4, 3, 6), eyeB); br.position.set(sx * 0.8, 0.95, 2.2); br.rotation.z = Math.PI / 2 + sx * 0.35; cloud.add(br); }
  const cloudState = { mood: null };   // read by the GLB driver (assets.js): 'sad' / 'happy' expression loops
  const tuft = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 1), puffM); tuft.position.set(0.3, 2.9, 0); cloud.add(tuft);
  // three little puffs that drift into the sunbeams
  const puffs = [0, 1, 2].map(() => new THREE.Mesh(new THREE.IcosahedronGeometry(0.9, 1).scale(1.3, 0.75, 1), puffM));
  // mirrors: a round glass in a gold frame, floating in Worm's green mind-power glow
  const frameM = new THREE.MeshStandardMaterial({ color: 0xe0b040, metalness: 1, roughness: 0.3 }), glassM = new THREE.MeshStandardMaterial({ color: 0xbfe6f5, metalness: 1, roughness: 0.06 });
  const auraTex = glowSprite('rgba(120,255,170,0.9)', 'rgba(80,255,140,0)');
  const beamM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.25, 0.45), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending });
  const beamG = new THREE.CylinderGeometry(0.13, 0.13, 1, 8, 1, true).rotateX(Math.PI / 2).translate(0, 0, 0.5); // unit beam along +z
  const mkBeam = () => { const b = new THREE.Mesh(beamG, beamM); b.visible = false; b.renderOrder = 3; return b; };
  const flowerCols = [0xff6f9c, 0xffd23f, 0xb07cff];
  const mirrors = MIRRORS.map((m, i) => {
    const g = new THREE.Group();
    const fr = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.12, 8, 28), frameM), gl = new THREE.Mesh(new THREE.CircleGeometry(0.9, 28), glassM), back = new THREE.Mesh(new THREE.CircleGeometry(0.9, 28).rotateY(Math.PI), frameM);
    const aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: auraTex, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.5 })); aura.scale.setScalar(4.2);
    g.add(fr, gl, back, aura);
    // flower bed: a ring of soil and a clump of flowers that open and colour up when the light arrives
    const soil = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.2, 0.25, 20), new THREE.MeshStandardMaterial({ color: 0x6b4a2c, roughness: 1 })); soil.position.copy(m.bed).y += 0.05; soil.receiveShadow = true;
    const parts = []; const col = new THREE.Color(flowerCols[i]), green = new THREE.Color(0x3f9a35), yel = new THREE.Color(0xffe680);
    const paint = (geo, c) => { geo = geo.index ? geo.toNonIndexed() : geo; const n = geo.attributes.position.count, a = new Float32Array(n * 3); for (let k = 0; k < n; k++) a.set([c.r, c.g, c.b], k * 3); geo.setAttribute('color', new THREE.BufferAttribute(a, 3)); geo.deleteAttribute('uv'); return geo; };
    for (let k = 0; k < 9; k++) { const a = k / 8 * Math.PI * 2, r = k === 8 ? 0 : 1.05, x = Math.cos(a) * r, z = Math.sin(a) * r, h = 0.75 + (k % 3) * 0.14;
      parts.push(paint(new THREE.CylinderGeometry(0.035, 0.045, h, 5).translate(x, h / 2, z), green));
      parts.push(paint(new THREE.SphereGeometry(0.3, 8, 5).scale(1, 0.45, 1).translate(x, h, z), col));
      parts.push(paint(new THREE.SphereGeometry(0.11, 6, 4).translate(x, h + 0.1, z), yel)); }
    const fm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, color: 0x4a4a4a });
    const flowers = new THREE.Mesh(mergeGeometries(parts).scale(1.35, 1.35, 1.35), fm); flowers.position.copy(m.bed).y += 0.15;
    return { ...m, g, aura, soil, flowers, fm, inBeam: mkBeam(), outBeam: mkBeam(), step: m.start, yaw: m.start * STEP, lit: false, bloom: 0, up: 0 };
  });
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.85, 16).rotateX(Math.PI), new THREE.MeshStandardMaterial({ color: 0xffd34a, emissive: 0xffa41a, emissiveIntensity: 1.5, metalness: 0.4, roughness: 0.3 }));
  const actors = [ana.root, kepri.root, cloud, arrow, ...puffs, ...mirrors.flatMap(m => [m.g, m.soil, m.flowers, m.inBeam, m.outBeam])];
  for (const a of actors) outdoor.add(a);
  function showAll(v) { for (const a of actors) a.visible = v; if (!v) return; arrow.visible = false; for (const m of mirrors) m.inBeam.visible = m.outBeam.visible = false; }
  showAll(false);

  // ---------------------------------------------------------------- state + helpers
  let camGoal = CAM_WIDE, camSnap = true, active = -1, tapWait = null, taps = 0, dim = 0, dimTo = 0, blocked = false, sunBase = null, bgBase = null;
  const camLook = V(0, 0, 0);
  const tween = G.tween; // wall-clock story animations with a deadline (see main.js)
  const setBeam = (b, from, to) => { b.position.copy(from); b.lookAt(to); b.scale.set(1, 1, from.distanceTo(to)); };
  const _a = V(0, 0, 0), _b = V(0, 0, 0);

  function tick(dt, time) {
    if (G.mode !== 'garden') return;
    kepri.update(dt, time); ana.update(dt, time);
    // the cloud over the sun dims the garden (animating intensities only: nothing is added or removed)
    dim += (dimTo - dim) * Math.min(1, dt * 1.2);
    sun.intensity = sunBase * (1 - 0.5 * dim); outdoor.backgroundIntensity = bgBase * (1 - 0.35 * dim);
    cloud.position.y += Math.sin(time * 0.9) * 0.004; cloud.rotation.y = Math.sin(time * 0.5) * 0.18;
    const huff = !$('#dialog').hidden && $('#dialog').dataset.who === 'cloud' ? 1 : 0; // puffs up and bounces while he grumbles
    if (G.hdCloud) cloud.scale.setScalar(1); else /* the HD cloud's clips bounce and puff by themselves: no double bounce */ cloud.scale.set(1 + 0.05 * Math.sin(time * 3) + 0.1 * huff * Math.abs(Math.sin(time * 9)), 1 - 0.05 * Math.sin(time * 3) + 0.08 * huff * Math.abs(Math.sin(time * 9)), 1);
    tuft.position.x = 0.3 + Math.sin(time * 5) * 0.18; tuft.rotation.z = Math.sin(time * 5) * 0.4;
    const src = kepri.mouthWorld(_a);
    mirrors.forEach((m, i) => {
      m.yaw += (m.step * STEP - m.yaw) * Math.min(1, dt * 9);
      m.g.position.copy(m.pos).y += -1.9 * (1 - ease(m.up)) + Math.sin(time * 1.6 + i) * 0.08 * m.up;
      m.g.visible = m.up > 0.02; m.g.scale.setScalar(1.3); m.g.rotation.y = m.yaw; m.aura.material.opacity = (0.3 + 0.12 * Math.sin(time * 4 + i)) * m.up;
      const on = m.up > 0.95 && (m.lit || i === active) && !blocked;
      m.inBeam.visible = m.outBeam.visible = on;
      if (on) { setBeam(m.inBeam, src, m.g.position); _b.copy(m.g.position).addScaledVector(V(Math.sin(m.yaw), -0.36 * (m.lit ? 1 : 0.45), Math.cos(m.yaw)), m.lit ? 4.9 : 3.4); setBeam(m.outBeam, m.g.position, _b); }
      m.bloom += ((m.lit && !blocked ? 1 : m.lit ? 0.75 : 0) - m.bloom) * Math.min(1, dt * 2);
      m.fm.color.setScalar(lerp(0.29, 1, m.bloom)); m.flowers.scale.set(lerp(0.75, 1, m.bloom), lerp(0.45, 1, m.bloom), lerp(0.75, 1, m.bloom));
    });
    beamM.opacity = 0.5 + 0.1 * Math.sin(time * 6);
    arrow.visible = active >= 0;
    if (active >= 0) { arrow.position.copy(mirrors[active].g.position).y += 1.75 + Math.sin(time * 4) * 0.2; arrow.rotation.y = time * 2; }
    if (camSnap) { cam.position.copy(camGoal.pos); camLook.copy(camGoal.look); camSnap = false; }
    cam.position.lerp(camGoal.pos, Math.min(1, dt * 2)); camLook.lerp(camGoal.look, Math.min(1, dt * 2.5)); cam.lookAt(camLook);
    sun.position.copy(WORM_AT).addScaledVector(world.sunDir, 120); sun.target.position.copy(WORM_AT);
  }
  function cleanup() {
    active = -1; tapWait = null; blocked = false; dim = dimTo = 0; cloudState.mood = null; showAll(false);
    if (sunBase != null) { sun.intensity = sunBase; outdoor.backgroundIntensity = bgBase; }
  }
  const begin = () => { G.tick = tick; G.onLeave = cleanup; G.tap = onTap; };

  // a tap near the glowing mirror turns it one step (generous target: the whole mirror and its glow)
  function onTap(ray) {
    if (active < 0) return false; const m = mirrors[active];
    if (ray.ray.distanceSqToPoint(m.g.position) > 2.4 * 2.4) return false;
    m.step++; taps++; sfx.tap();
    const good = ((m.step - m.good) % 8 + 8) % 8 === 0;
    if (!good && taps >= 9) { m.step += ((m.good - m.step) % 8 + 8) % 8; toast('worm', 'אני אעזור לך לסובב! ✨', 2000); worm.setGlow(true); setTimeout(() => worm.setGlow(false), 900); } // never stuck: Worm finishes the turn
    if (((m.step - m.good) % 8 + 8) % 8 === 0 && tapWait) { const r = tapWait; tapWait = null; setTimeout(r, ui.fast ? 0 : 450); }
    return true;
  }
  async function lightMirror(step, i, line) {
    G.phase = 'c3-mirror' + (i + 1); active = i; taps = 0; G.playerTurn = true; camGoal = CAM_WIDE;
    toast(null, 'גע במראה הזוהרת כדי לסובב אותה, עד שהקרן תגיע אל הפרחים 👆', 5000);
    await step(new Promise(res => { tapWait = res; }));
    G.playerTurn = false; active = -1; hideToast(); const m = mirrors[i]; m.lit = true;
    sfx.chime(); sfx.happy(); fx.burst(m.bed.clone().setY(m.bed.y + 1), flowerCols[i], 50, 4, 0.5, 1.4, 0.5); worm.wiggle(1.4); kepri.wiggle(1.2);
    toast('worm', line, 2200); await step(wait(1500));
  }
  async function cloudRiddle(step, n, kind, lines) {
    G.phase = 'c3-math' + n; blocked = true; sfx.whoosh(); camGoal = CAM_WIDE;
    const from = cloud.position.clone();
    await step(tween(1.3, k => { const e = ease(k); puffs.forEach((p, j) => { p.visible = true; p.position.lerpVectors(from, kepri.mouthWorld(V(0, 0, 0)).lerp(mirrors[j].pos, 0.5), e); p.scale.setScalar(0.4 + 1.5 * e); }); }));
    for (const [who, text] of lines) await step(say(who, text));
    const react = { right: () => { worm.wiggle(1.4); kepri.wiggle(1.4); sfx.happy(); }, wrong: w => toast('worm', w >= 3 ? 'אני איתך, דרייק! 💚' : 'אתה יכול! אני מאמין בך 💚', 2500) };
    await step(G.math.ask({ kind, title: '☁️ חידת קרני השמש', ...react }));
    kepri.setGlow(true); sfx.magic(); fx.burst(kepri.headWorld(), 0xffe27a, 50, 5, 0.5, 1.2, 0); const puffY = puffs.map(p => p.position.y);
    await step(tween(0.9, k => { const e = ease(k); puffs.forEach((p, j) => { p.position.y = puffY[j] + 4 * e; p.scale.setScalar(1.9 * (1 - e) + 0.01); }); }));
    puffs.forEach(p => { p.visible = false; }); blocked = false; kepri.setGlow(false);
  }

  function stage(placeGuests) {
    G.useScene(outdoor); G.mode = 'garden'; showAll(true); puffs.forEach(p => { p.visible = false; }); G.stars.group.visible = false;
    if (sunBase == null) { sunBase = sun.intensity; bgBase = outdoor.backgroundIntensity; }
    $('#title').hidden = true; $('#hud').hidden = false; $('#counter').hidden = true; $('#arrow').hidden = true; G.showJoy(false); G.aura.material.opacity = 0;
    worm.root.position.copy(WORM_AT); worm.root.rotation.set(0, WORM_RY, 0); worm.setPose('rest'); worm.state.blend = 1; worm.setGlow(false); worm.lookAt(DRAKE_AT.clone().setY(DRAKE_AT.y + 1.4));
    drake.setSit(0); drake.setWalk(0); drake.root.scale.setScalar(1); drake.root.position.copy(DRAKE_AT); drake.root.rotation.set(0, Math.PI, 0);
    kepri.setPose('rest'); kepri.state.blend = 1; kepri.setGlow(false);
    const here = placeGuests; kepri.root.position.copy(here ? KEPRI_AT : KEPRI_FROM); kepri.root.rotation.set(0, 1.25, 0); ana.root.position.copy(here ? ANA_AT : ANA_FROM); ana.root.rotation.set(0, 1.9, 0); ana.setWalk(0);
    kepri.lookAt(here ? mirrors[1].pos : null);
    cloud.position.copy(here ? CLOUD_UP : CLOUD_FAR); dim = dimTo = here ? 1 : 0;
    for (const m of mirrors) { m.step = m.start; m.yaw = m.start * STEP; m.lit = false; m.bloom = 0; m.up = here ? 1 : 0; }
    active = -1; tapWait = null; blocked = false; G.playerTurn = false; camGoal = here ? CAM_WIDE : CAM_MEET; camSnap = true;
    G.king.root.position.set(0, G.PLATEAU + 7.0, 15.6); G.king.root.scale.setScalar(1.7); // back on the gate, normal size (the title makes him big)
  }

  // ---------------------------------------------------------------- the story
  async function story(from = 'intro') {
    const step = runner(); begin();
    if (from === 'end') return ending(step, true);
    await step(fade(true)); stage(from !== 'intro');
    if (from === 'intro') {
      await step(card({ kicker: 'פרק 3', title: 'השמש של אנה' })); await step(fade(false));
      G.phase = 'c3-intro'; G.checkpoint(3, 'intro');
      camGoal = CAM_WORM; worm.wiggle(1); sfx.purr();
      await step(say('drake', 'איזה בוקר יפה בגני הטירה, וורם!'));
      
      // Ana and Kepri walk in from the desert road
      camGoal = CAM_MEET; ana.setWalk(1); sfx.whoosh();
      await step(tween(3.2, k => { const e = ease(k); kepri.root.position.lerpVectors(KEPRI_FROM, KEPRI_AT, e); ana.root.position.lerpVectors(ANA_FROM, ANA_AT, e); }));
      ana.setWalk(0); ana.wave(2.2); kepri.lookAt(DRAKE_AT.clone().setY(DRAKE_AT.y + 1.2)); worm.lookAt(ANA_AT.clone().setY(ANA_AT.y + 1.3)); drake.root.rotation.y = -2.2;
      await step(say('ana', 'שלום! אני אנה, וזאת קפרי, דרקונית השמש שלי.'));
      kepri.wiggle(1.6); sfx.happy();
      
      worm.wiggle(1.4);
      
      // ---- the Grumble Cloud drifts over the sun
      G.phase = 'c3-cloud'; camGoal = CAM_WIDE; dimTo = 1; drake.root.rotation.y = Math.PI;
      await step(tween(3.0, k => { cloud.position.lerpVectors(CLOUD_FAR, CLOUD_UP, ease(k)); }));
      await step(say('cloud', 'הממפ. גם אני רוצה להיות כאן.'));
      
      ana.wave(1.5); kepri.lookAt(mirrors[1].pos);
      await step(say('ana', 'קפרי תשלח קרן שמש. וורם, הרם את המראות!'));
      camGoal = CAM_WORM; worm.setGlow(true); sfx.magic(); worm.lookAt(mirrors[1].pos);
      
      camGoal = CAM_WIDE;
      await step(tween(2.0, k => { mirrors.forEach((m, i) => { m.up = Math.max(0, Math.min(1, k * 1.6 - i * 0.3)); }); }));
      worm.setGlow(false); mirrors.forEach(m => { m.up = 1; });
      
    }
    else await step(fade(false)); // starting at the mirrors (saved checkpoint, or "עוד פעם?"): fade back in too
    G.checkpoint(3, 'mirrors');
    await lightMirror(step, 0, 'יש! הערוגה הראשונה פורחת!');
    await cloudRiddle(step, 1, 'sub', [['cloud', 'הממפ! העננים הקטנים שלי חוסמים את הקרניים.']]);
    
    await lightMirror(step, 1, 'עוד ערוגה פורחת! אתה מכוון מצוין, דרייק!');
    await cloudRiddle(step, 2, 'missing', []);
    await lightMirror(step, 2, 'כל הגן מלא צבעים!');
    // ---- the garden blooms, the cloud floats off (a little less grumpy)
    G.phase = 'c3-bloom'; dimTo = 0; sfx.fanfare(); worm.wiggle(2.5); kepri.wiggle(2.5); ana.wave(3); drake.wave(3);
    for (let i = 0; i < 3; i++) setTimeout(() => { if (G.tick === tick) fx.confetti(ground(0.5, 28, 4), 60); }, i * 500);
    cloudState.mood = 'happy';
    await step(say('cloud', 'הממפ… בעצם, זה די יפה.'));
    cloudState.mood = null;
    await step(tween(3.0, k => { cloud.position.lerpVectors(CLOUD_UP, CLOUD_FAR, ease(k)); }));
    camGoal = CAM_WORM; worm.lookAt(DRAKE_AT.clone().setY(DRAKE_AT.y + 1.4));
    
    await step(say('worm', 'אולי גם הוא רוצה חברים.'));
    camGoal = CAM_WIDE; toast('king', 'הגנים שלי פורחים שוב! תודה, מאסטרי הדרקונים! 👑', 3200);
    await step(tween(2.8, () => { }));                       // a moment to enjoy the garden (⏭ skips it)
    
    G.phase = 'c3-celebrate';
    const v = await step(card({ kicker: '☀️ ☀️ ☀️', title: 'כל הכבוד!', text: 'האור חזר לגנים, ופגשת את אנה ואת קפרי! וורם קיבל מזכרת: דיסקית שמש זהובה ☀️',
      buttons: [{ label: '🔁 עוד פעם?', value: 'again' }, { label: 'סיום הפרק ◀', value: 'end', cls: 'green' }] }));
    if (v === 'again') { cleanup(); return story('mirrors'); }
    return ending(step, false);
  }
  async function ending(step, direct) {
    if (direct) { await step(fade(true)); stage(true); mirrors.forEach(m => { m.lit = true; m.step = m.good; }); cloud.position.copy(CLOUD_FAR); dim = dimTo = 0; await step(fade(false)); }
    G.phase = 'c3-end'; G.markDone(3);
    const v = await step(card({ kicker: 'סוף פרק 3 – השמש של אנה', title: 'המשך יבוא…', text: 'בפרק הבא: לדרקון האש של רורי יש שיהוקים… של אש! 🔥',
      buttons: [{ label: '🔁 עוד פעם?', value: 'again' }, { label: '🏠 לתפריט', value: 'home', cls: 'green' }] }));
    await step(fade(true));
    if (v === 'again') { cleanup(); return story('intro'); }
    G.enterTitle(); await fade(false);
  }

  return {
    start: story, showAll,
    nextMirrorPos() { return active >= 0 ? mirrors[active].g.position.clone() : null; },
    debug: () => ({ tweens: G.tweenCount(), active, taps, lit: mirrors.map(m => m.lit), blocked }),
    modelTargets: { ana, sunDragon: kepri, grumbleCloud: { root: cloud, state: cloudState } },
    cloudActor: { root: cloud, state: cloudState },
  };
}
