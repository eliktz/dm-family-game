---
name: dm-chapter
description: How to add a new plot-driven chapter to dmgame (story card, dialogue beats, one activity, celebration, teaser, title-screen unlock, smoke coverage). Use when building chapter 2+.
---
- Each chapter is `src/chapters/chN.js` exporting `chapterN(G)` → `{ start(from) }` (see `ch2.js`); register it in `src/main.js` (`CHAPTERS`, a title
  button, `GO` shortcuts). Per-chapter hooks: `G.tick`, `G.tap`, `G.onLeave`; flights reuse `G.startFlight({ items, pos, yaw, onCollect })`.
- Scripts are async and built on `runner()` / `step()` (cancellable), `say(who, text)`, `toast()`, `actions()`,
  `riddle(a, b)`, `card({...})`, `fade()`, and `waitFor(test)` (resolved by the per-frame update).
- Shape: `card({kicker:'פרק N', title})` → 3–6 `say` beats → one activity (≤ 2 min) → celebration (`fx.confetti`, `sfx.fanfare`, Worm wiggle) →
  `card` "המשך יבוא…" teaser with `עוד פעם?` and `🏠 לתפריט`.
- Worm reacts in every scene (`worm.wiggle()`, `worm.chomp()`, `worm.setGlow()`, `toast('worm', …)`).
- Add a `phase` marker for each beat, a `__dm.go('<chapter>')` shortcut, and extend `test/smoke.mjs` to play it through.
- Unlock it on the title (`.chapters` buttons with a `.ks` keepsake badge). Call `G.markDone(N)` at the teaser (saved in `dm.progress`).
- Create actors once at start-up (hidden), never lights; new dragons reuse `createWorm({ colors, … , light: false })`.
- Get original lines from the story-writer agent; never use book text.
