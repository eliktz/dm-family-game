---
name: dm-smoke
description: How to run and read the dmgame Playwright smoke test and screenshots (WebKit iPad landscape). Use before every push and after any change.
---
1. `cd /workspace/dmgame/test` (first time: `npm install && npx playwright install webkit`).
2. `timeout 900 node smoke.mjs`. This uses WebKit (the Safari engine) at iPad landscape 1180×820, writes `shots/01-title.png … 13-to-be-continued.png`,
   and must end with `SMOKE PASS (webkit)`. Add `--chromium` for Chromium iPad emulation, `--no-shots` for speed, or a URL to test live Pages (shots go to `shots/live/`).
3. It fails on ANY console error, page error, failed request or HTTP ≥ 400. Fix the cause; don't mute it.
4. **Look at the screenshots** (Read the PNGs). Check RTL text, nothing clipped behind HUD, Worm clearly visible and charming,
   no overexposure or bloom haze, and big readable buttons.
5. One-off views: `node peek.mjs "index.html?tier=high" /tmp/x.png "__dm.go('flight')" 5000`.
6. If the flow changes, update smoke.mjs (it drives the real buttons; `__dm` only skips walking/steering).
