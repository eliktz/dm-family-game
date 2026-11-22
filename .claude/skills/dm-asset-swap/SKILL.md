---
name: dm-asset-swap
description: Swapping procedural placeholders (Worm, Drake, Griffith, King, castle) for Blender/Sketchfab GLBs from /workspace/dmgame-assets. Use when wiring a new model into the game.
---
1. Assets are produced in `/workspace/dmgame-assets` (tmux `dmart`, Blender MCP on **port 9877**, headless `/home/box/apps/blender -b`).
   Game-ready exports go to `exports/game/`. Run `tools/optimize-glb.sh` and `tools/validate-glb.mjs` (or the asset-qa agent) first.
2. Copy the GLB to `/workspace/dmgame/assets/models/` and add `"worm": { "url": "assets/models/worm.glb", "scale": 1, "y": 0, "rotY": 0 }`
   to `assets/models/models.json`. `src/assets.js` hides the procedural children of that root and plays clips named
   idle/wiggle/fly/walk/sit/wave when present.
3. Character origin at the feet, facing +Z, 1 unit = 1 m (Drake ≈ 1.7 tall; Worm head ≈ 1.2 m, body ≈ 10.5 m long).
4. Only CC0/CC-BY files are committed. Add each one to CREDITS.md (title, author, URL, licence). Non-free files go in a gitignored `private-assets/`.
5. Worm's procedural rig (`src/worm.js`) is the reference for expressiveness. A GLB Worm must match it (blink, wiggle, chomp, glow eyes) before it replaces it.
