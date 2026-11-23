# 🐉 מאסטרים של דרקונים — דרייק ווורם

> **Private family project.** A small, non-commercial game made at home for one 7-year-old fan.
> *Dragon Masters* and its characters belong to **Tracey West / Scholastic**. This project is not
> affiliated with or endorsed by them, it isn't for sale, and it contains **no book text, art, or music**.
> All 3D art and sound in it are original procedural code or CC0 assets (see [CREDITS.md](CREDITS.md)).

משחק קטן בעברית לאייפד: **פרק 1 – אבן הדרקון**. דרייק פוגש את וורם במערת הדרקונים, אבן הדרקון זוהרת,
מאכילים ומלטפים את וורם, פותרים חידת חשבון קטנה ליד השער, ואז טסים על וורם מסביב לטירה של המלך רולנד
ואוספים 8 כוכבים. הפרק נגמר במסך חגיגה וב"המשך יבוא…".

**פרק 2 – הביצה המסתורית** נפתח אחרי פרק 1: ביצה כחולה מתגלגלת למערה, מרחפים מעל הנהר ואוספים טיפות בזוגות,
מחממים את הביצה ב-5 אבנים חמות, והיא בוקעת. בסוף מגיעים בו ודרקונית המים שלו. (העלילה המלאה ב-[STORY.md](STORY.md).)

## Full screen on iPhone / iPad
Open the page in Safari, tap **Share ⬆️ → "Add to Home Screen"** (הוסף למסך הבית). Started from the home-screen icon the game runs full screen in
landscape, without Safari's bars (`manifest.json`, icons in `assets/icons/` rendered from our own Worm by `test/make-icons.mjs`). The game shows this hint once.

Progress (finished chapters and the last checkpoint) is saved on the device; **המשך** on the title resumes it. Parents: hold the title text for 3 seconds
to unlock every chapter (or add `?all=1`).

There is no read-aloud for now: **professional voice-over may come later**.

## How to play
- **Title** → tap **"פרק 1: אבן הדרקון"**. Tap Worm on the title for a hello wiggle.
- **Cave**: tap the bubble (**המשך ◀**) to continue. Walk with the joystick (bottom-left) or tap the floor / Worm.
  Then **🍎 להאכיל** and **✋ ללטף**. Riddle: tap the right number (a wrong one only gives a hint and counting help).
- **Flight**: the joystick steers (left/right = turn, up/down = climb). If you let go, Worm glides gently toward the next
  star on his own, so nobody gets stuck. The gold arrow points at stars that are off-screen.
- 🔊 = sound, 🏠 = home.

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
| `src/main.js` | Shared core: story runner (cancellable async scripts), cave + flight engines, cameras, title + progress (`dm.progress`), debug hook |
| `src/chapters/ch1.js`, `ch2.js` | One story script per chapter; each gets the core through `G` (`?all=1` unlocks every chapter) |
| `src/worm.js` | **Worm**: deforming spline-tube body, scaled skin, ridge spikes, expressive head (blink, look-at, jaw/chomp, ear fins, blush), breathing, happy wiggle, Dragon-Stone eye glow, flight pose |
| `src/people.js` | Drake (with Dragon Stone pendant), Griffith, King Roland: procedural chibi figures with walk, sit, and wave |
| `src/cave.js` | Cosy Dragon Cave: rock dome, sunbeam spot + shadows, torches, crystals, glowing mushrooms, straw bed, cave gate |
| `src/outdoor.js` | Kingdom: terrain, lake, stone castle (CC0 textures, merged per material), instanced trees/flowers, 3D clouds, stars |
| `src/engine.js` | WebGL2 renderer, ACES tone mapping, soft shadows, HDRI/PMREM env, bloom (UnrealBloom → OutputPass), quality tiers |
| `src/fx.js`, `src/tex.js` | Particles (hearts/sparkles/confetti, 2 draw calls), procedural canvas textures |
| `src/audio.js` | Synthesized SFX + soft music-box loop (all original); no read-aloud |
| `src/assets.js`, `assets/models/models.json` | **GLB swap-in**: list a Blender GLB (worm/drake/griffith/king/castle) and it replaces the placeholder |

## Design notes
- **Worm and flying:** in the books Worm has no wings and moves people with his mind. Here he *floats and glides by mind power*,
  shown with a soft green aura and sparkle trail, and he says so himself in the game: "אין לי כנפיים – אבל אני טס בכוח המחשבה שלי!".
- Never scary, no fail states. The first win (the Dragon Stone glowing) comes within about 30 seconds, and wrong answers only bring a hint.
- iPad budget: DPR ≤ 2, one shadow light per scene, lights created once, ~150k triangles in the main pass, auto tier downgrade.

## Swapping in Blender assets
Export a GLB from the pipeline (`/workspace/dmgame-assets/exports/game/`) into `assets/models/` and add it to `models.json`:
`"worm": { "url": "assets/models/worm.glb", "scale": 1 }` (also `height`, `ground`, `y`/`position`, `rotY`, `clips`; see the header of `src/assets.js`).
Convention: origin at the feet/belly, facing +z, metres. The procedural mesh is hidden and its invisible rig still drives the game logic.
Clips named `idle`, `fly`, `coil`, `wiggle`/`happy`, `chomp`, `walk`, `sit`, and `wave` are picked up; when one is missing the model is bobbed/scaled instead.
A missing or empty manifest, or a GLB that fails to load, just leaves that character procedural. `__dm.stats().models` shows which is in use.

## Next steps
See [STORY.md](STORY.md) for the 8-chapter arc. Chapters 1–3 are built; chapter 4 (Rori and the fire dragon) is next.
