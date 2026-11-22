---
name: dm-ipad-perf
description: iPad/iPhone Safari performance and touch rules for dmgame (budgets, quality tiers, DPR, shadows, safe areas). Use when adding geometry, lights, effects or touch UI.
---
- Budgets in the main pass: ≤ ~200k triangles, ≤ ~150 draw calls, textures ≤ 150 MB GPU, DPR ≤ 2. Read `__dm.stats()` (counts include shadow and bloom passes).
- Merge static geometry per material (`mergeGeometries`) and use InstancedMesh for repeats (trees, flowers, spikes). Particles = `src/fx.js` Points (2 draw calls).
- Lights are created once per scene; never add or remove lights at runtime (that triggers a shader recompile and a stall on iPad). Animate intensities instead.
- One shadow-casting light per scene (outdoor sun follows the player; cave spot). Use a 1–2K map.
- Quality tiers live in `src/engine.js` (high/medium/low, downgrade-only after a 3 s warm-up). `?tier=` pins a tier for tests.
- Touch: `touch-action:none`, block pinch/double-tap zoom, buttons ≥ 72 px, joystick bottom-left with a dead-zone, `env(safe-area-inset-*)`,
  portrait shows the rotate prompt. Audio unlocks on the first tap (WebAudio), and there is no speech synthesis.
- Animations must be time-based (`performance.now()` or dt), never frame-count based (120 Hz iPads).
