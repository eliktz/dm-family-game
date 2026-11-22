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
| Ch | Math focus | Example |
|---|---|---|
| 1 | Addition ≤ 5 | 3 + 2 |
| 2 | Addition ≤ 10, missing addend | 2 + ? = 5 warm stones |
| 3 | Subtraction ≤ 10 | 8 sunbeams − 3 clouds |
| 4 | Add/subtract ≤ 20, making 10 | 7 + 3, 15 − 5 |
| 5 | Patterns and counting by 2s | crystal pattern 🔷🔶🔷🔶… |
| 6 | Equal groups (pre-multiplication), counting by 5s | 3 baskets × 2 apples |
| 7 | Multiplication ×2, ×5, ×10 as arrays | 4 rows of 2 lanterns |
| 8 | Celebration review (mixed, the kid's choice of difficulty) | "Worm's big quiz" |

Visual aids (apples, stones, drops, stars) are always on screen. A wrong answer only gets a hint and a counting animation.

## Chapters
1. **אבן הדרקון** (done): Drake meets Worm in the Dragon Cave, the Dragon Stone glows, he feeds and pets Worm, solves the gate riddle and takes his first flight around King Roland's castle, collecting 8 stars.
   *Keepsake:* the green Dragon Stone.

2. **הביצה המסתורית**: A glowing blue egg rolls into the cave. Worm curls protectively around it. Griffith says a new Dragon Master is on the way.
   - *Activity A, river glide:* Worm glides low along the river behind the castle (guided, like ch. 1). The player collects water-drop bubbles in **pairs**,
     and every pair shows a sum (2, 4, 6…).
   - *Activity B, warm the egg:* the egg needs 5 warm stones and Worm already brought 2. "How many more?" (missing addend), with stones on screen. Then tap the stones to place them.
   - The egg hatches into a tiny, giggly water-dragon baby, and **Bo arrives with his water dragon**, who has been looking for it. Worm and the baby become friends.
   - *Teaser:* the river suddenly fills with grey mist… "מישהו קטן ורטנן מסתתר בענן…" *Keepsake:* a blue water drop.

3. **השמש של אנה**: **Ana and her sun dragon** come from the desert. The Grumble Cloud covers the sun over the castle gardens.
   - *Activity, mirror light:* Worm lifts 3 mirrors with mind power, and the player rotates them to bounce the sun dragon's beam onto the flower beds. Subtraction appears as clouds block beams: 8 − 3.
   - *Teaser:* Rori's fire dragon has a hiccup problem… *Keepsake:* a golden sun disc.

4. **הלהבה של רורי**: **Rori and her fire dragon**. The fire dragon has fiery hiccups and keeps toasting things by accident. It's funny, not dangerous.
   - *Activity A, the dragon bakery:* bake bread with gentle fire for the castle feast, counting loaves by making 10 (7 + 3).
   - *Activity B, hiccup cure:* a rhythm game. Tap with Worm's slow breathing to calm the fire dragon down.
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
