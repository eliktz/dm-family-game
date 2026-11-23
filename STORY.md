# STORY.md: "הרפתקה לזכור": the chapter arc

Inspired by Tracey West's *Dragon Masters* (characters, dragon types, King Roland's castle) but **all plot and wording are original**.
No scenes or lines from the books. Audience: age 7, Hebrew, never scary. **Worm is the star of every chapter.**

## Spine of the story
Drake becomes a Dragon Master (ch. 1). One by one, new young Dragon Masters and their dragons arrive at the castle: **Bo** with a
water dragon, **Ana** with a sun dragon, **Rori** with a fire dragon, and **Petra** with a crystal/stone dragon. Each time, Worm helps the new dragon feel at home.
Meanwhile a small grey storm cloud, **"הענן הרטנן" (the Grumble Cloud)**, keeps showing up and causing mischief: it hides the stars, mists up the river
and steals the colours of the flowers. It is never scary. It is just lonely and grumpy, because nobody ever plays with it.
In the finale the whole dragon team works together. Worm's mind power lifts everyone up to the cloud, and Drake asks it to be friends.
It turns into a rainbow over the castle.

Each chapter follows the same pattern: a story card → 3–6 short dialogue beats → **1–2 guided activities** → celebration → a **"המשך יבוא…" teaser**.
Each chapter ends with Worm receiving a small **keepsake** (a badge on the title screen), so the kid sees the adventure building up.

## Math progression (gentle, hint-only, no fail states)
Riddles come from one engine (`src/math.js`) with five levels. The level adapts while playing (three clean answers in a row → harder,
two riddles with a miss → easier) between level 1 and a ceiling. Defaults: start at level 2, ceiling 5, so the kid climbs on his own.
A parent can set the start level and the ceiling separately in the hidden parent panel (hold the title for 3 s).

| Level | Content | Example |
|---|---|---|
| 1 | Add / subtract within 10, missing number | 4 + 5, 7 + ? = 10 |
| 2 | Add / subtract within 20 crossing ten; ×2, ×5, ×10 | 8 + 7, 15 − 6, 5 × 4 |
| 3 | Two-digit ± one-digit and tens; tables 2-5; missing number on either side; first word problems | 34 + 5, 63 − 20, ? × 3 = 12 |
| 4 | Two-digit ± two-digit with carrying / borrowing up to 100; tables 2-10; word problems | 38 + 27, 71 − 34, 7 × 8 |
| 5 | Everything mixed, plus an occasional two-step story | 3 × 4 + 5 |

Each chapter picks the *kinds* of riddle that fit its story; the level decides how big the numbers are.

| Ch | Riddle kinds | Where |
|---|---|---|
| 1 | Addition, then a missing number | two riddles at the cave gate |
| 2 | Missing number, then subtraction or multiplication | two riddles before the warm stones |
| 3 | Subtraction, missing number | sunbeams and clouds |
| 4 | Addition, then a missing number (ten loaves on a ten-frame) | the dragon bakery |
| 5 | Missing number (patterns), multiplication by 2 | crystal patterns |
| 6 | Multiplication (equal groups), word problems | colour sparks, paint pots |
| 7 | Multiplication, missing factor, two-step stories | lanterns, stepping stones, bridge planks |
| 8 | Everything: "Worm's big quiz" of five riddles | the finale |

A wrong answer never ends anything: the first miss shows a picture of dragon stones (tens as bars, rows for ×), the second shows the worked
steps and removes one wrong answer, and on the third Worm shows the answer and the right button glows.

## Chapters
1. **אבן הדרקון** (done): Drake meets Worm in the Dragon Cave, the Dragon Stone glows, he feeds and pets Worm, solves the gate riddle and takes his first flight around King Roland's castle, collecting 8 stars.
   *Keepsake:* the green Dragon Stone.

2. **הביצה המסתורית**: A glowing blue egg rolls into the cave. Worm curls protectively around it. Griffith says a new Dragon Master is on the way.
   - *Activity A, river glide:* Worm glides low along the river behind the castle (guided, like ch. 1). The player collects water-drop bubbles in **pairs**,
     and every pair shows a sum (2, 4, 6…).
   - *Activity B, warm the egg:* the egg needs 5 warm stones and Worm already brought 2. "How many more?" (missing addend), with stones on screen. Then tap the stones to place them.
   - The egg hatches into a tiny, giggly water-dragon baby, and **Bo arrives with his water dragon**, who has been looking for it. Worm and the baby become friends.
   - *Teaser:* the river suddenly fills with grey mist… "מישהו קטן ורטנן מסתתר בענן…" *Keepsake:* a blue water drop.

3. **השמש של אנה** (done): **Ana and her sun dragon** come from the desert. The Grumble Cloud covers the sun over the castle gardens.
   - *Activity, mirror light:* Worm lifts 3 mirrors with mind power, and the player rotates them to bounce the sun dragon's beam onto the flower beds. Subtraction appears as clouds block beams: 8 − 3.
   - *Teaser:* Rori's fire dragon has a hiccup problem… *Keepsake:* a golden sun disc.

4. **הלהבה של רורי** (done): **Rori and Vulcan, her fire dragon**, arrive at the castle lawn. Vulcan has fiery hiccups: every "היק!" pops out a
   small, warm fireball. It's funny, never dangerous: an untouched fireball just pops into steam.
   - *Activity, the dragon bakery:* Worm's idea is to turn every hiccup into bread for tonight's feast. The player taps the floating fireballs and
     Worm bakes each one into a warm loaf with his mind power. Ten loaves in two rounds of five fill a ten-frame on the feast table
     (two rows of five). After a quiet while Worm bakes one himself, so nobody is ever stuck.
   - *Riddles:* an addition after the first row and a missing number after the second, from the adaptive engine.
   - *The cure:* Worm teaches Vulcan to breathe slowly with him (a calm, guided moment, no rhythm game) and the hiccups stop.
     One last tiny hiccup leaves a small ember.
   - *Teaser:* a strange echo comes from the crystal caves… *Keepsake:* a warm ember (glows but doesn't burn).

5. **מערת הקריסטלים של פטרה**: **Petra and her crystal/stone dragon** in the echo caves under the mountain.
   - *Activity, crystal patterns:* complete sparkling patterns to light a path (AB, AAB, counting by 2s). Worm's mind power hums each crystal like a xylophone.
   - Petra's dragon is shy. Worm teaches it that being quiet is okay. Gentle friendship moment.
   - *Teaser:* all the colours are vanishing from the kingdom! *Keepsake:* a rainbow crystal.

6. **הענן הרטנן**: The Grumble Cloud steals the flowers' colours and hides them in little grey puffs.
   - *Activity A, team flight:* fly with all the dragons in formation and pop grey puffs to free colour sparks. Collect them in **equal groups** (3 groups of 2).
   - *Activity B, count by 5s:* refill the castle's paint pots.
   - Drake notices the cloud looks… sad? Worm: "אולי הוא פשוט רוצה חבר?" *Keepsake:* a paintbrush feather.

7. **המסע אל הר הקשת**: The team journeys to the Rainbow Mountain, where the cloud lives. Three friendly gates, each opened by one dragon's power:
   the water dragon fills a fountain, the sun dragon lights lanterns, and the fire dragon warms a frozen bridge.
   - *Activities:* multiplication as arrays (4 rows of 2 lanterns, 5 × 2 stepping stones, 10 × 1 bridge planks). Worm carries everyone across the last gap with mind power.
   - *Teaser:* the cloud is right above them, and it's crying a tiny drizzle… *Keepsake:* a mountain map.

8. **קשת של חברים** (finale): Worm's biggest moment. His eyes glow green, and he lifts all the dragons and Dragon Masters up to the cloud with his mind.
   Drake talks to the Grumble Cloud and invites it to play. It laughs for the first time and turns into a huge rainbow over King Roland's castle.
   - *Activities:* "Worm's big quiz" (mixed review where the kid picks easy/medium/hard), then a festival: fly through the rainbow arcs collecting 8 colours.
   - King Roland awards everyone the **"מאסטר דרקונים אמיתי"** medal. Credits roll with all the dragons dancing, and Worm gets the last hug.
   - *Ending card:* "סוף ההרפתקה… או רק ההתחלה?" *Keepsake:* the rainbow medal.

## Production notes
- Each chapter is one async story function in `src/` (move to `src/chapters/chN.js` once ch. 2 exists). It is unlocked on the title after the previous one,
  with progress saved in `localStorage` (`dm.progress`). Every chapter gets a `__dm.go('chN')` shortcut and smoke coverage.
- New dragons get procedural placeholders first (recoloured/reshaped from the Worm rig: water = blue-teal with fins, sun = gold with sun crest,
  fire = red with small flame wings, crystal = lilac with faceted spikes). Each one gets a GLB swap-in slot in `models.json`.
- The Grumble Cloud: a puffy grey cloud with big round eyes and a pouty mouth. It's cute, never menacing, and has no lightning.
- Voice: there is no read-aloud in the game for now (the device's synthetic voice was removed). **Professional voice-over may come later.**
