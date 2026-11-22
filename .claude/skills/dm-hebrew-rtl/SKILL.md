---
name: dm-hebrew-rtl
description: Hebrew RTL UI conventions for dmgame (dir, bidi of numbers and equations, font, names, tone). Use when adding or changing any UI text.
---
- `<html lang="he" dir="rtl">`. Font: Rubik, vendored in `lib/fonts` (`lib/fonts.css`), with system Hebrew fallbacks.
- Equations, counters and mixed digits go inside `<span dir="ltr">` (e.g. `3 + 2`, `4 / 8`). Otherwise the bidi algorithm reorders them.
- "Next" arrows point LEFT in RTL (`המשך ◀`). The joystick stays bottom-left (thumb), the action buttons bottom-right.
- Names: דרייק, וורם, בו, אנה, רורי, פטרה, גריפית', המלך רולנד. Speaker chips use `FACES`/`NAMES` in `src/ui.js`.
- Tone: age 7, short, warm, never scary. Male second person for the player. All text is original (never book text).
- `speak()` in `src/audio.js` reads lines aloud with the device's Hebrew voice. Keep lines plain (emoji get stripped).
