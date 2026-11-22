# Credits & licences

Private, non-commercial family project. *Dragon Masters* (characters, names, story) © Tracey West / Scholastic.
No book text, illustrations, or music are included. All dialogue here is original.

## Code / engine
| What | Licence | Source |
|---|---|---|
| three.js r187 (`lib/three.module.js`, `lib/three.core.js`, `lib/addons/`: EffectComposer, UnrealBloomPass, OutputPass, HDRLoader, GLTFLoader, RoomEnvironment, BufferGeometryUtils, SkeletonUtils) | MIT | https://github.com/mrdoob/three.js |

## Fonts
| File | Licence | Source |
|---|---|---|
| `lib/fonts/rubik-hebrew.woff2`, `lib/fonts/rubik-latin.woff2` (Rubik, variable 400–700) | SIL Open Font License 1.1 | https://fonts.google.com/specimen/Rubik |

## Textures & HDRI (Poly Haven, CC0 1.0: public domain; credited as a courtesy)
| File | Poly Haven asset | Licence | URL |
|---|---|---|---|
| `assets/hdri/kloofendal_day_1k.hdr` | Kloofendal 48d Partly Cloudy (Pure Sky), 1K | CC0 1.0 | https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky |
| `assets/textures/castle_wall_1k.jpg` | Castle Wall Varriation (diffuse 1K) | CC0 1.0 | https://polyhaven.com/a/castle_wall_varriation |
| `assets/textures/slate_roof_1k.jpg` | Slate Floor (diffuse 1K; used as roof bump) | CC0 1.0 | https://polyhaven.com/a/slate_floor |
| `assets/textures/wood_1k.jpg` | Wood Floor Deck (diffuse 1K) | CC0 1.0 | https://polyhaven.com/a/wood_floor_deck |
| `assets/textures/grass_1k.jpg` | Aerial Grass Rock (diffuse 1K) | CC0 1.0 | https://polyhaven.com/a/aerial_grass_rock |

## 3D character models (assets/models/*.glb)
| File | Source | Author | Licence | Notes |
|---|---|---|---|---|
| `drake.glb` | "Young Medieval Boy [MESHY]" https://sketchfab.com/3d-models/802543ab36f3443594bc3c999c624499 (retrieved 2026-11-22) | EthanfromEngland | CC BY 4.0 | rigged, recoloured tunic, Dragon Stone added |
| `griffith.glb`, `roland.glb` | "An Old Man \| Full Body [MESHY]" https://sketchfab.com/3d-models/3176a35f258946d69f67730313cbba36 (retrieved 2026-11-22) | EthanfromEngland | CC BY 4.0 | rigged, recoloured, hat / crown added |
| rigs and animation clips (drake, griffith, roland) | Quaternius Universal Base Characters + Universal Animation Library 1 & 2 (itch.io) | Quaternius | CC0 | skeleton and Idle/Walk/Talk/Wave/etc clips |
| `worm.glb` | Original model built in Blender for this project, from a FLUX.1-schnell (Apache-2.0) concept image | this repo | n/a | procedural skin textures |

## Procedural (original, this repo)
Worm, Drake, Griffith, King Roland, the cave, the castle geometry, trees, clouds, stars, particles, scale/rock/sand/heart/sparkle
textures (drawn at runtime on `<canvas>`), and all sound effects and music (synthesized with WebAudio at runtime). (Characters now use the GLB models listed above where models.json enables them.)

## Read-aloud
Hebrew narration uses the device's own speech-synthesis voice (Web Speech API). No recorded audio ships with the game.

## Update: read-aloud removed; app icons
The game no longer uses the device's speech-synthesis voice (the "Read-aloud" section above is historical). Professional voice-over may come later.
App icons (`assets/icons/*.png`) are renders of this repo's own procedural Worm (`test/make-icons.mjs`). No third-party art.
