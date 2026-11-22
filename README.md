# 🐉 מאסטרים של דרקונים — דרייק ווורם

> **Private family project.** A small, non-commercial game made at home for one 7-year-old fan.
> *Dragon Masters* and its characters belong to **Tracey West / Scholastic**. This project is not
> affiliated with or endorsed by them, it isn't for sale, and it contains **no book text, art, or music**.
> All 3D art and sound in it are original procedural code or CC0 assets (see [CREDITS.md](CREDITS.md)).

משחק קטן בעברית לאייפד: **פרק 1 – אבן הדרקון**. דרייק פוגש את וורם במערת הדרקונים, אבן הדרקון זוהרת,
מאכילים ומלטפים את וורם, פותרים חידת חשבון קטנה ליד השער, ואז טסים על וורם מסביב לטירה של המלך רולנד
ואוספים 8 כוכבים. הפרק נגמר במסך חגיגה וב"המשך יבוא…".

## How to play
- **Title** → tap **"פרק 1: אבן הדרקון"**. Tap Worm on the title for a hello wiggle.
- **Cave**: tap the bubble (**המשך ◀**) to continue. Walk with the joystick (bottom-left) or tap the floor / Worm.
  Then **🍎 להאכיל** and **✋ ללטף**. Riddle: tap the right number (a wrong one only gives a hint and counting help).
- **Flight**: the joystick steers (left/right = turn, up/down = climb). If you let go, Worm glides gently toward the next
  star on his own, so nobody gets stuck. The gold arrow points at stars that are off-screen.
- 🔊 = sound, 🗣️ = Hebrew read-aloud (uses the iPad's built-in Hebrew voice), 🏠 = home.

## Run locally
No build step: static ES modules plus an import map. three.js r187 and its addons are vendored in `lib/`.
```bash
cd dmgame
python3 -m http.server 8765      # then open http://localhost:8765/
```
URL flags: `?tier=high|medium|low` (fixes the quality tier; by default it only steps down if FPS drops), `?a=4&b=3` (riddle numbers).

## Tests
```bash
cd test && npm install && npx playwright install webkit   # first time
node smoke.mjs                 # local, WebKit (Safari engine), iPad landscape 1180×820
node smoke.mjs https://…/      # against the live GitHub Pages URL (shots → shots/live/)
node smoke.mjs --chromium      # Chromium with iPad emulation instead
```
The smoke test plays the whole chapter through the real buttons. It checks lang/dir RTL, the title, Griffith's dialogue,
the joystick, the friendly wrong-answer hint, the star counter, the celebration with "עוד פעם?", the to-be-continued card, and
**zero console, page, or network errors**. Screenshots go to `shots/`. The debug hook `window.__dm` provides
`go('title'|'cave'|'bond'|'math'|'flight')`, `walkToWorm()`, `collectNext()`, `collectAll()`, `stats()`, `setTier()`, and `fast`.

## Structure
| File | What |
|---|---|
| `index.html`, `style.css` | Hebrew RTL HUD (Rubik font, vendored), safe areas, rotate-to-landscape prompt, noindex |
| `src/main.js` | Story runner (cancellable async chapter script), cave + flight gameplay, cameras, debug hook |
| `src/worm.js` | **Worm**: deforming spline-tube body, scaled skin, ridge spikes, expressive head (blink, look-at, jaw/chomp, ear fins, blush), breathing, happy wiggle, Dragon-Stone eye glow, flight pose |
| `src/people.js` | Drake (with Dragon Stone pendant), Griffith, King Roland: procedural chibi figures with walk, sit, and wave |
| `src/cave.js` | Cosy Dragon Cave: rock dome, sunbeam spot + shadows, torches, crystals, glowing mushrooms, straw bed, cave gate |
| `src/outdoor.js` | Kingdom: terrain, lake, stone castle (CC0 textures, merged per material), instanced trees/flowers, 3D clouds, stars |
| `src/engine.js` | WebGL2 renderer, ACES tone mapping, soft shadows, HDRI/PMREM env, bloom (UnrealBloom → OutputPass), quality tiers |
| `src/fx.js`, `src/tex.js` | Particles (hearts/sparkles/confetti, 2 draw calls), procedural canvas textures |
| `src/audio.js` | Synthesized SFX + soft music-box loop (all original), Hebrew speech synthesis |
| `src/assets.js`, `assets/models/models.json` | **GLB swap-in**: list a Blender GLB (worm/drake/griffith/king/castle) and it replaces the placeholder |

## Design notes
- **Worm and flying:** in the books Worm has no wings and moves people with his mind. Here he *floats and glides by mind power*,
  shown with a soft green aura and sparkle trail, and he says so himself in the game: "אין לי כנפיים – אבל אני טס בכוח המחשבה שלי!".
- Never scary, no fail states. The first win (the Dragon Stone glowing) comes within about 30 seconds, and wrong answers only bring a hint.
- iPad budget: DPR ≤ 2, one shadow light per scene, lights created once, ~150k triangles in the main pass, auto tier downgrade.

## Swapping in Blender assets
Export a GLB from the pipeline (`/workspace/dmgame-assets/exports/game/`) into `assets/models/` and add it to `models.json`:
`"worm": { "url": "assets/models/worm.glb", "scale": 1 }`. The procedural mesh is hidden and the game logic still drives the root.
Clips named `idle`, `wiggle`, `fly`, `walk`, `sit`, and `wave` are picked up. The procedural Worm stays the default because it is fully animated.

## Next steps
See the "Next increments" section of the latest report: more dragons (Shadow, Kepri, Vulcan…), chapter 2 (the egg), and more kinds of math.
