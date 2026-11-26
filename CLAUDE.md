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
  `src/chapters/chN.js` (chapters 1-6 are built) and receives the shared core as `G`. The arc is in `STORY.md`. Progress: localStorage `dm.progress`; `?all=1` unlocks all.
- **Less talk, more action (brief-18).** At most **7 blocking speech bubbles per chapter**, none longer than 60 characters (the smoke test
  checks this with `__dm.bubbles()`); hints and reactions go in non-blocking toasts. Tap-to-skip: a title card goes away on a tap, and ⏭
  (`#btn-skip`, top bar) shows while a bubble is open or a scripted move of 1.2 s or longer plays; one tap fast-forwards to the next thing the
  player does (`updateSkip()` in `main.js`; it hides while the counter shows and stops after 6 s at most). Dialog never auto-advances by itself.
  After cutting a line, keep a short `tween` pause before a celebration card so the beat is still seen.
- **Worm is the star** (the kid's favourite). He gets the most polished model and animation (breathing, happy wiggle, chomp,
  look-at, Dragon-Stone eye glow) and warm reactions everywhere. In the books Worm has no wings and moves with mind power,
  so in flight he *floats/glides* with a green aura.
- **Riddles** come from `src/math.js` (pure, 5 levels, adaptive; unit test `node test/math.mjs`). Chapters call `G.math.ask({ kind, title })`;
  the level and the parent's ceiling live in `dm.progress.math`. Wrap every equation and number in `<bdi dir="ltr" class="eq|num">`, use − and ×.
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

## Known issues / testing notes
- **Soak findings (`node test/soak.mjs`, chapter 2 cave in a loop, headless WebKit).** Two separate things were found:
  1. *Test environment:* the browser page sometimes freezes for tens of seconds (a tween caught 0.35 s into 0.8 s after a 25 s gap) and twice the
     page / browser died outright. Animation frames were otherwise steady (about 520 per loop) and GPU geometries, textures, shader programs and
     pending timers stayed flat across loops, so there is no leak and no general frame starvation. Not a game bug as far as we can tell.
  2. *Real bug, fixed:* a speech bubble abandoned by leaving the chapter kept its tap handler; on the next chapter the first quick tap ran the
     stale handler, which hid the new bubble without resolving it, and the story was stuck with nothing on screen. `say()` now drops the previous
     bubble's handlers (also from `hideOverlays()`); the smoke test has a regression check.
- **Slow-motion stalls, fixed.** Story animations used to advance by a per-frame step capped at 0.05 s, so at 1-4 frames per second a 3 s move
  took minutes; the chapter 3 bloom (the heaviest moment) stalled the live iPhone smoke twice. All story animations now go through `G.tween(dur, fn)`
  in `main.js`: wall-clock based, with a deadline timer that resolves the promise even if no frame arrives. Never write a bare
  `requestAnimationFrame` loop or a frame-counted animation in a chapter. `node test/starve.mjs` stops animation frames and checks the story still
  advances (and that the watchdog rescues a hung step).
- **Safety net (keep it):** `main.js` runs the frame from a timer when no frame has run for 400 ms (`__dm.frameStats` counts both sources);
  a dialog advances on a tap anywhere on the bubble, accepts `pointerup` and `click` once, and pulses "המשך" after 12 s (never auto-advances);
  a story watchdog nudges a phase that sits 45 s while it is not the player's turn (`G.playerTurn`; it finishes all tweens first; `__dm.watchdog` counts
  nudges and the smoke test expects 0). New scripted waits must go through `step()`, never a bare promise.
- **Chapter 1 flight (two laps):** `src/chapters/ch1.js` flies one closed rail twice: the 8 stars, then 8 golden rings that sit on the same
  rail (`startFlight({ items: [...stars, ...rings], pathPts })`; the rings are in the list from the start, marked collected and hidden until
  the last star). The ring items are flagged `gold` (star items already have a `ring` field: their halo). `#btn-lift` (✨ mind-lift) pulls the
  next ring to Worm. In tests use `__dm.collectNext()` for the stars: `collectAll()` would take the freshly lit rings too.
- **Chapter 2 river glide:** ten pairs on a ~410 m rail (`buildBubbles(10, -160, 32)`, about 50 s). Shu is moved into the outdoor scene for
  the glide and swims just ahead of Worm (`swim` in ch2.js `tick`); `shuHome()` puts her back in the cave scene before her arrival beat and on
  leaving. `#btn-splash` (💦) lifts the next pair to Worm, the same pattern as chapter 1's `#btn-lift`.
- **Chapter 6 (cloud):** `src/chapters/ch6.js`: a rail flight (`G.startFlight`, mode `flight`) with Kepri and Vulcan borrowed from chapters 3-4
  through `G.team`, then the lawn (mode `paint`). The Grumble Cloud is one shared actor (`G.grumble`, built in ch3.js, GLB key `grumbleCloud`); its
  expression loops are set with `state.mood` ('sad' / 'happy'). Debug: `__dm.go('ch6' | 'ch6-flight' | 'ch6-pots' | 'ch6-end')`, `__dm.potScreen()`.
- **Chapter 5 (crystals):** `src/chapters/ch5.js` in the cave scene (mode `cave`, cameras through `G.camGoal`). After the rainbow crystal comes
  the crystal tunnel (mode `flight`, phases `c5-fly-ready` → `c5-flight` → `c5-flight-done`): a helix tube built once in the OUTDOOR scene high above
  the castle (unlit tube + one instanced mesh of wall crystals + 12 gate rings in the blue/yellow/pink pattern; `world.group` is hidden while inside),
  the crystal dragon beside Worm, the next gate always glows, `#btn-sparkle` (✨, 2.5 s rest). `endTunnel()` restores the world and puts the dragon back
  in the cave scene. `__dm.go('ch5-flight')`. `startFlight({ lookDown })` aims the chase camera lower on the short iPhone screen only. Petra's dragon's name lives only in
  `src/names.js` (`PETRA_DRAGON_NAME`). Debug: `__dm.go('ch5' | 'ch5-patterns' | 'ch5-end')`, `__dm.crystalScreen(wrong?)`, `__dm.ch5.debug()`.
- **Chapter 4 (bakery):** `src/chapters/ch4.js`, mode `bakery`. After the second riddle comes the fireball chase (mode `flight`, phases
  `c4-fly-ready` → `c4-flight` → `c4-flight-done`): 12 fireballs on a clockwise spiral rail with Vulcan beside Worm, `#btn-puff` (🔥, 2.5 s rest)
  carries the next one to him, counter `10 + n`; then `stage(true)` + `setTable()` return to the lawn for the breathing beat. `__dm.go('ch4-flight')`.
  **Rail flights keep wall-clock pace at low frame rates:** `frameBody` sub-steps `updateFlight` in 50 ms slices (at most 0.5 s per frame), so a
  57 s flight still takes about 57 s when frames come from the 400 ms fallback timer. Debug: `__dm.go('ch4' | 'ch4-catch' | 'ch4-end')`, `__dm.fireballScreen()`,
  `__dm.ch4.debug()`; `soak.mjs --chapter=4` and `starve.mjs` cover it. Fireball timing uses the wall clock, not frames.
- **Chapter 3 (garden):** `src/chapters/ch3.js` runs in mode `garden` with its own camera in `G.tick`. After the third mirror comes the
  sunbeam flight (mode `flight`, phases `c3-fly-ready` → `c3-flight` → `c3-flight-done`): 12 light orbs on a spiral rail round the castle with
  Kepri beside Worm, `#btn-sunbeam` (☀️, 2.5 s rest) carries the next orb to him, then `stage(true)` returns to the garden for the bloom.
  `__dm.go('ch3-flight')` jumps to it. Debug: `__dm.go('ch3' | 'ch3-mirrors' | 'ch3-end')`,
  `__dm.mirrorScreen()`, `__dm.ch3.debug()`. `node test/soak.mjs --chapter=3` presses 🏠 mid-dialog in every loop. Background characters use
  `makeChibi({ lod })` / `createWorm({ lod })` to stay inside the triangle budget (garden main pass: 121 draw calls, 190k triangles).
  Test output goes to the git-ignored `test-logs/`.
- **Browser dies mid-smoke (not a game leak).** A full-session smoke holds about 2 GB in the WebKit web process (1.1 GB for one chapter); the
  shared box's free memory swings by 2-3 GB from other work, and when it dips the whole headless browser goes away ("Target page, context or
  browser has been closed", page closed + browser disconnected together, **no** `crash` event; the smoke logs all three). `node test/mem.mjs`
  visits every chapter twice in one session: GPU geometries / textures / programs must be flat on the second pass (146 / 61 / 149) and 40 cloud
  mood flips must allocate nothing. Re-run a smoke that died this way once, alone; `flight.mjs --chapter=ch1 --modes=kid` re-runs single cases.
- **Slow test machine:** run one test at a time; `smoke.mjs --dsf=1` renders the iPhone at 1x; phase waits are 240 s. The box is shared, so
  a single timeout is not proof of a bug: re-run, and use `soak.mjs` to tell a real stall from load.

## Layout
`index.html` `style.css` | `src/` (main, chapters/chN, worm, people, cave, outdoor, engine, fx, tex, ui, audio, assets) | `lib/` vendored |
`assets/` CC0 textures/HDRI/models | `test/` Playwright (`smoke.mjs`, `flight.mjs`, `soak.mjs`, `starve.mjs`, `models.mjs`, `perf.mjs`, `mem.mjs`, `math.mjs`, `peek.mjs`, `serve.mjs`) | `shots/` screenshots.
Serve locally with `python3 -m http.server 8765`, or use `test/serve.mjs`.
