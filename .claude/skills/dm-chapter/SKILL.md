---
name: dm-chapter
description: How to add a new plot-driven chapter to dmgame (story card, dialogue beats, one activity, celebration, teaser, title-screen unlock, smoke coverage). Use when building chapter 2+.
---
- Chapters are async scripts in `src/main.js` built on `runner()` / `step()` (cancellable), `say(who, text)`, `toast()`, `actions()`,
  `riddle(a, b)`, `card({...})`, `fade()`, and `waitFor(test)` (resolved by the per-frame update).
- Shape: `card({kicker:'פרק N', title})` → 3–6 `say` beats → one activity (≤ 2 min) → celebration (`fx.confetti`, `sfx.fanfare`, Worm wiggle) →
  `card` "המשך יבוא…" teaser with `עוד פעם?` and `🏠 לתפריט`.
- Worm reacts in every scene (`worm.wiggle()`, `worm.chomp()`, `worm.setGlow()`, `toast('worm', …)`).
- Add a `phase` marker for each beat, a `__dm.go('<chapter>')` shortcut, and extend `test/smoke.mjs` to play it through.
- Unlock it on the title (`.chapters`). Save progress in localStorage under the `dm.` prefix.
- Get original lines from the story-writer agent; never use book text.
