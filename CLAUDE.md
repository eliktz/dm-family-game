# dmgame: מאסטרים של דרקונים (private family game)

A Hebrew, iPad-first, **plot-driven** three.js game for Elik's 7-year-old son, based on Tracey West's
*Dragon Masters* (© Tracey West / Scholastic). It's a private, non-commercial family project. Repo: `dm-family-game` (public, GitHub Pages, noindex).

## Standing rules (from Elik)
- Only Claude Code writes code and files in this repo. The supervising bot never edits /workspace/dmgame directly; it writes briefs in /workspace/dm-briefs, reviews screenshots, and verifies.
- Claude Code runs only in the supervised interactive tmux session (dmexplore). It is never run headless (no `claude -p`).

## Hard rules
- **Never touch the Harry Potter project**: tmux sessions `hpart`, `hpexplore`, `hpart-blender`, `hpfable`, or the folders
  `/workspace/hpgame-*` and `/workspace/hp-*`. You may *read* `/workspace/hpgame-*` code for proven patterns, but never edit it.
  Our tmux sessions are prefixed `dm` (`dmexplore` = this repo, `dmart` = assets, `dm-blender`, `dm-herdr`).
- **Blender MCP is port 9877** (never 9876, which belongs to HP). Assets come from `/workspace/dmgame-assets`.
- **No copyrighted book text, illustrations, or music.** Character names are fine. All dialogue is original Hebrew. Record every
  external asset (author, URL, licence) in `CREDITS.md`. Only CC0/CC-BY assets get committed; anything else goes in a gitignored `private-assets/`.
- **No secrets** in code, commits, logs or screenshots. Never print tokens.
- **Git**: small commits with clear messages; push to `main` **fast-forward only**. Never force-push or rewrite pushed history.
- **Smoke test before every push**: `cd test && node smoke.mjs` must print `SMOKE PASS (webkit)` (it runs iPad and iPhone landscape; `--device=ipad|iphone` for one). After pushing, run
  `node smoke.mjs https://eliktz.github.io/dm-family-game/` against the live Pages URL.
- Keep `<meta name="robots" content="noindex,nofollow">` and `robots.txt` (Disallow: /). Keep the README low-key.

## Product rules
- **Hebrew RTL everywhere** (`<html lang="he" dir="rtl">`, Rubik font vendored in `lib/fonts`). Wrap equations and counters
  in `dir="ltr"` spans. Speaker names: דרייק, וורם, בו, אנה, רורי, פטרה, גריפית', המלך רולנד.
- **Plot-driven chapters**, not free exploration. Each chapter is a short story card, then scenes with dialogue bubbles,
  then one clear activity (riddle, guided flight, …), then a celebration and a "המשך יבוא…" teaser.
  The story runner is in `src/main.js` (cancellable async script: `runner()`, `step()`, `waitFor()`); each chapter's script is
  `src/chapters/chN.js` and receives the shared core as `G`. The arc is in `STORY.md`. Progress: localStorage `dm.progress`; `?all=1` unlocks all.
- **Worm is the star** (the kid's favourite). He gets the most polished model and animation (breathing, happy wiggle, chomp,
  look-at, Dragon-Stone eye glow) and warm reactions everywhere. In the books Worm has no wings and moves with mind power,
  so in flight he *floats/glides* with a green aura.
- **Never scary, no fail states.** Wrong answers only give a friendly hint. The first win should come within about 30 s.
  Big touch targets (≥ 72 px on iPad), a virtual joystick at the bottom-left, landscape orientation, and safe areas.
  It must also work on iPhone landscape (844×390): the `max-height: 500px` CSS block scales the UI down and `engine.js` frames the scene lower;
  the HUD must never cover Drake or Worm (the smoke test checks this with `__dm.actorBoxes()`). No read-aloud (voice-over may come later).
  Home-screen web app: `manifest.json` + `assets/icons/`; all paths relative (Pages subpath).
- **HD visual bar**: at least as good as `/workspace/hpgame-game/hogwarts-explorer-hd`: ACES tone mapping, HDRI/PMREM environment,
  soft shadows, bloom with emissive-only highlights (keep albedo ≤ 0.84), warm lighting, PBR/physical materials.
  Look at the screenshots yourself after every visual change.

## Tech
- three.js **r187 vendored** in `lib/` with an import map and no build step. WebGL2 `WebGLRenderer` + EffectComposer (bloom → OutputPass).
- iPad budget: DPR ≤ 2, ≤ ~200k triangles in the main pass, ≤ ~150 draw calls in the main pass, textures ≤ 150 MB, one shadow light,
  lights created once (never add lights at runtime), and the auto quality tier only ever downgrades (`src/engine.js`).
- Procedural placeholders can be swapped for GLBs through `assets/models/models.json` → `src/assets.js`.
- Debug hook: `window.__dm` (`go('ch2' | 'ch2-glide' | 'ch2-warm' | 'ch2-hatch' | …)`, `walkToWorm()`, `collectNext()`, `collectAll()`, `stoneScreen()`,
  `progress`, `resetProgress()`, `stats()`, `setTier()`, `fast`).

## Layout
`index.html` `style.css` | `src/` (main, chapters/chN, worm, people, cave, outdoor, engine, fx, tex, ui, audio, assets) | `lib/` vendored |
`assets/` CC0 textures/HDRI/models | `test/` Playwright (`smoke.mjs`, `peek.mjs`, `serve.mjs`) | `shots/` screenshots.
Serve locally with `python3 -m http.server 8765`, or use `test/serve.mjs`.
