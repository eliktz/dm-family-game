// Free flight "🐉 טיסה חופשית" (title screen, open once chapter 1 is finished): no story, no dialogue, no riddles.
// Worm circles the castle on the chapter 1 rail with a wide soft corridor, so the joystick really moves him but he can
// never get stuck or crash. Sixteen things to collect sit on the rail (the 8 stars plus crystals, bubbles and little
// fireballs) and come back when he is on the far side of the loop, so something is always near. A running counter;
// every 10 is a colour burst, a happy wiggle and a cheer. Friends whose chapters are finished fly along, two at a
// time (they take turns every 20), each with a power button. 🏠 leaves at any time. The best count is kept ("שיא").
import { glowSprite } from '../tex.js';

export function freeFlight(G) {
  const { THREE, fx, worm, stars, outdoor, caveScene, toast, sfx, runner, fade, fl, actions, clearActions, tween } = G;
  const V = (x, y, z) => new THREE.Vector3(x, y, z), $ = s => document.querySelector(s);

  // ---- the extra collectibles: one between each pair of stars, on the same closed rail
  const loop = new THREE.CatmullRomCurve3(stars.list.map(s => s.base.clone()), true, 'centripetal'); loop.arcLengthDivisions = 400; loop.updateArcLengths();
  const n = stars.list.length, starU = (() => { const N = 800, u = stars.list.map(() => 0), best = stars.list.map(() => Infinity), q = V(0, 0, 0); for (let k = 0; k <= N; k++) { loop.getPointAt(k / N, q); stars.list.forEach((s, i) => { const d = q.distanceToSquared(s.base); if (d < best[i]) { best[i] = d; u[i] = k / N; } }); } return u; })();
  const glow = glowSprite('rgba(255,255,255,1)', 'rgba(255,255,255,0)');
  const KINDS = [
    { geo: new THREE.OctahedronGeometry(1.1, 0).scale(0.8, 1.5, 0.8), mat: new THREE.MeshBasicMaterial({ color: 0xff6fb0 }), col: 0xff6fb0 },                              // crystal
    { geo: new THREE.SphereGeometry(1.2, 16, 12), mat: new THREE.MeshBasicMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.6, depthWrite: false }), col: 0x9fdcff }, // bubble
    { geo: new THREE.SphereGeometry(0.9, 14, 10), mat: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 0.75, 0.2) }), col: 0xffa040 },                            // little fireball
  ];
  const group = new THREE.Group(); group.visible = false; outdoor.add(group);
  const extras = Array.from({ length: n }, (_, i) => {
    const a = starU[(i + n - 1) % n], b = starU[i] + (i === 0 ? 1 : 0), u = ((a + b) / 2) % 1, kind = KINDS[i % 3];
    const g = new THREE.Group(); loop.getPointAt(u, g.position); const m = new THREE.Mesh(kind.geo, kind.mat); g.add(m);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: kind.col, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.55 })); sp.scale.setScalar(6); g.add(sp); group.add(g);
    return { g, m, sp, base: g.position.clone(), got: false, pop: 0, col: kind.col, extra: true };
  });
  const items = [...stars.list, ...extras];

  // ---- friends: whoever's chapter is finished; two fly along at a time and take turns
  const FRIENDS = [
    { key: 'shu', ch: 2, label: '💦 שפריץ!', col: 0x9fdcff, cave: true }, { key: 'kepri', ch: 3, label: '☀️ קרן שמש!', col: 0xffe27a },
    { key: 'vulcan', ch: 4, label: '🔥 נשיפת אש!', col: 0xff9a3a }, { key: 'gem', ch: 5, label: '✨ נצנוץ!', col: 0xff9be0, cave: true },
  ].map(f => ({ ...f, actor: G.team[f.key], at: 0 }));
  const SLOTS = [{ ox: -5.6, oy: 2.2, oz: 1.2 }, { ox: 5.6, oy: 2.8, oz: 1.8 }];
  let session = 0, count = 0, bursts = 0, best0 = 0, bestSaid = false, flying = false, unlocked = [], active = [], turn = 0, lifting = false;
  function showFriend(f) { outdoor.add(f.actor.root); f.actor.root.visible = true; f.actor.setPose('fly'); f.actor.state.blend = 1; f.actor.lookAt(null); if (f.key === 'gem') f.actor.state.shy = false; }
  function hideFriend(f) { f.actor.root.visible = false; f.actor.setPose('rest'); f.actor.setGlow(false); if (f.cave) caveScene.add(f.actor.root); } // back to the scene its chapter expects
  const buttons = () => actions(active.map(f => ({ id: 'btn-free-' + f.key, label: f.label, onClick: () => power(f) })));
  // a friend's power: the next thing ahead flies straight to Worm. Always works; 2.5 s rest per friend.
  function power(f) {
    const i = G.nextItem(), it = items[i], now = performance.now(); if (!flying || !it || lifting || now - f.at < 2500) return;
    lifting = true; f.at = now; f.actor.setGlow(true); f.actor.wiggle(1.2); sfx.magic(); const from = it.g.position.clone(), head = f.actor.headWorld();
    for (let k = 0; k <= 5; k++) fx.burst(head.clone().lerp(from, k / 5), f.col, 10, 2, 0.45, 0.7, 0);
    tween(0.5, k => { it.g.position.lerpVectors(from, fl.pos, k * k); fx.trail(it.g.position.clone(), f.col, 0.45); }).then(() => { lifting = false; f.actor.setGlow(false); if (flying && !it.got && G.nextItem() === i) G.collectNext(); });
  }
  function onCollect(i, it) {
    count++; G.setCounter(String(count), '⭐'); sfx.star((count - 1) % 8); fx.burst(fl.pos.clone(), it.col || 0xffe27a, 34, 6, 0.6, 1.1, -1); worm.wiggle(0.6);
    if (best0 > 0 && count > best0 && !bestSaid) { bestSaid = true; toast(null, 'שיא חדש! 🏆', 2200); }
    if (count % 10) return;
    // every 10: a colour burst, a happy Worm and a cheer
    bursts++; sfx.fanfare(); worm.wiggle(2.2); fx.confetti( // (no glance camera here: the close side view would put Worm under the power buttons)
      fl.pos.clone().add(V(0, 3, 0)), 70);
    for (const c of [0xff6fb0, 0xffe27a, 0x7dffb0, 0x9fdcff]) fx.burst(fl.pos.clone(), c, 30, 8, 0.7, 1.4, 0.5);
    for (const f of active) f.actor.wiggle(1.6);
    G.saveFree(count);
    if (count % 20 === 0 && unlocked.length > 2) { // the friends take turns: the one who has flown longest swaps with the next one waiting
      const s = turn++ % 2, out = active[s], next = unlocked.find(f => !active.includes(f) && f !== out) || out; if (next !== out) { hideFriend(out); active[s] = next; showFriend(next); fx.burst(fl.pos.clone(), next.col, 40, 6, 0.6, 1.2, 0); buttons(); }
    }
  }
  function tick(dt, time) {
    if (!flying) return;
    const yaw = worm.root.rotation.y, c = Math.cos(yaw), s = Math.sin(yaw);
    active.forEach((f, k) => { const o = SLOTS[k]; f.actor.root.position.set(worm.root.position.x + o.ox * c + o.oz * s, worm.root.position.y + o.oy + Math.sin(time * 1.8 + k * 2) * 0.35, worm.root.position.z - o.ox * s + o.oz * c); f.actor.root.rotation.set(0, yaw, 0); f.actor.update(dt, time); });
    const ni = G.nextItem();
    items.forEach((it, i) => {
      if (it.got) { // gone for now: it comes back when Worm is on the far side of the loop
        it.pop += dt; const ahead = ((fl.itemU[i] - fl.u) % 1 + 1) % 1;
        if (it.pop > 0.6 && ahead > 0.3 && ahead < 0.7) { it.got = false; it.pop = 0; it.g.visible = true; it.g.scale.setScalar(1); it.g.position.copy(it.base); }
        else if (it.extra) { const k = Math.max(0, 1 - it.pop * 2.5); it.g.scale.setScalar(k * (1 + it.pop * 3)); it.g.visible = k > 0; }
      } else if (it.extra) { if (!lifting || i !== ni) it.g.position.y = it.base.y + Math.sin(time * 1.6 + i) * 0.45; it.m.rotation.y = time * 1.4 + i; it.sp.material.opacity = i === ni ? 0.8 : 0.5; }
    });
  }
  function cleanup() {
    if (flying) G.saveFree(count); flying = false; lifting = false; clearActions(); group.visible = false; stars.group.visible = false;
    for (const f of active) hideFriend(f); active = []; $('#counter').hidden = true;
  }
  async function start() {
    if (flying) G.saveFree(count);                         // started again while already flying (debug jump): keep the best, start a new count at once
    flying = false; count = 0; bursts = 0; session++;
    const step = runner(); await step(fade(true));
    count = 0; bursts = 0; best0 = G.freeBest; bestSaid = false; turn = 0; lifting = false;
    stars.group.visible = true; stars.reset(); group.visible = true; for (const it of extras) { it.got = false; it.pop = 0; it.g.visible = true; it.g.scale.setScalar(1); it.g.position.copy(it.base); }
    G.startFlight({ items, pathPts: stars.list.map(s => s.base), loop: true, startU: 1 - 0.085, camSide: -1, corridor: [7, 4.5], nextAhead: true, lookDown: 3, onCollect }); // lookDown: Worm sits higher on the short iPhone screen
    fl.kingSaid = true;                                    // no greetings here: free flight has no talk at all
    G.tick = tick; G.onLeave = cleanup; G.tap = null; G.phase = 'free'; G.setCounter('0', '⭐'); flying = true;
    unlocked = FRIENDS.filter(f => G.chapterDone(f.ch)); active = unlocked.slice(0, 2); for (const f of FRIENDS) f.at = 0; for (const f of active) showFriend(f); buttons();
    await step(fade(false)); G.showJoy(true); worm.wiggle(1);
  }
  return { start, debug: () => ({ session, flying, count, bursts, best: G.freeBest, unlocked: unlocked.map(f => f.key), active: active.map(f => f.key), items: items.length, ungot: items.filter(it => !it.got).length }) };
}
