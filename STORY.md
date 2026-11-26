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
| 5 | Missing number, then multiplication; colour patterns AB / AAB / ABC | crystal patterns |
| 6 | Equal groups (n × 2 up to 12) and counting by fives in the activities; a multiplication and an addition riddle | colour sparks, paint pots |
| 7 | Multiplication, missing factor, two-step stories | lanterns, stepping stones, bridge planks |
| 8 | Everything: "Worm's big quiz" of five riddles | the finale |

A wrong answer never ends anything: the first miss shows a picture of dragon stones (tens as bars, rows for ×), the second shows the worked
steps and removes one wrong answer, and on the third Worm shows the answer and the right button glows.

## Chapters
1. **אבן הדרקון** (done): Drake meets Worm in the Dragon Cave, the Dragon Stone glows, he feeds and pets Worm, solves the gate riddle and takes his first flight around King Roland's castle: two rail-guided laps, 8 stars and then 8 golden rings, with Worm's mind-lift button (✨) that pulls the next ring to him.
   *Keepsake:* the green Dragon Stone.

2. **הביצה המסתורית**: A glowing blue egg rolls into the cave. Worm curls protectively around it. Griffith says a new Dragon Master is on the way.
   - *Activity A, river glide:* Worm glides low along the river behind the castle (guided, like ch. 1). The player collects water-drop bubbles in **pairs**,
     and every pair shows a sum (2, 4, 6… up to 20). It is a long glide (ten pairs, about 50 s). A blue dragon swims in the river below:
     Shu, before the story introduces her. Her splash button (💦) lifts the next pair straight to Worm.
   - *Activity B, warm the egg:* the egg needs 5 warm stones and Worm already brought 2. "How many more?" (missing addend), with stones on screen. Then tap the stones to place them.
   - The egg hatches into a tiny, giggly water-dragon baby, and **Bo arrives with his water dragon**, who has been looking for it. Worm and the baby become friends.
   - *Teaser:* the river suddenly fills with grey mist… "מישהו קטן ורטנן מסתתר בענן…" *Keepsake:* a blue water drop.

3. **השמש של אנה** (done): **Ana and her sun dragon** come from the desert. The Grumble Cloud covers the sun over the castle gardens.
   - *Activity, mirror light:* Worm lifts 3 mirrors with mind power, and the player rotates them to bounce the sun dragon's beam onto the flower beds. Subtraction appears as clouds block beams: 8 − 3.
   - *Action, the sunbeam flight:* after the third mirror Worm and Drake fly with Kepri round the castle through 12 light orbs (rail-guided, about 50 s).
     Every orb sends a sunbeam down and a patch of garden bursts into colour; the counter counts down as a subtraction (12 − 5 = 7). Kepri's ☀️ button carries the next orb to Worm.
   - *Teaser:* Rori's fire dragon has a hiccup problem… *Keepsake:* a golden sun disc.

4. **הלהבה של רורי** (done): **Rori and Vulcan, her fire dragon**, arrive at the castle lawn. Vulcan has fiery hiccups: every "היק!" pops out a
   small, warm fireball. It's funny, never dangerous: an untouched fireball just pops into steam.
   - *Activity, the dragon bakery:* Worm's idea is to turn every hiccup into bread for tonight's feast. The player taps the floating fireballs and
     Worm bakes each one into a warm loaf with his mind power. Ten loaves in two rounds of five fill a ten-frame on the feast table
     (two rows of five). After a quiet while Worm bakes one himself, so nobody is ever stuck.
   - *Riddles:* an addition after the first row and a missing number after the second, from the adaptive engine.
   - *The cure:* Worm teaches Vulcan to breathe slowly with him (a calm, guided moment, no rhythm game) and the hiccups stop.
     One last tiny hiccup leaves a small ember.
   - *Action, the fireball chase:* one giant hiccup sends 12 little fireballs up round the castle. Worm, Drake and Vulcan chase them on a rail (about 55 s);
     each one caught becomes a warm bun and the counter adds on to the ten loaves (10 + 4 = 14). Vulcan's 🔥 button carries the next fireball to Worm.
   - *Teaser:* a strange echo comes from the crystal caves… *Keepsake:* a warm ember (glows but doesn't burn).

5. **מערת הקריסטלים של פטרה** (done): the strange echo in the Dragon Cave is **Petra's shy crystal dragon**, hiding in the dark. His name is a
   placeholder, נצנץ ("sparkle"), kept in one constant (`src/names.js`, `PETRA_DRAGON_NAME`) until the kid picks one.
   - *Activity, crystal patterns:* the crystals light the way when someone hums the right pattern. Worm hums each lit crystal with his mind power
     (xylophone chimes) and the player taps which crystal comes next: AB, then AAB, then ABC. A wrong crystal only wobbles and Worm hums again;
     after two misses or a quiet while the right one glows. After each pattern the shy dragon comes a little closer.
   - *Riddles:* a missing number and a multiplication (counting in equal steps) from the adaptive engine, between the patterns.
   - *Friendship moment:* Worm tells him that being quiet is okay, and that friends don't need many words.
   - *Teaser:* all the colours are vanishing from the kingdom! *Keepsake:* a rainbow crystal.

6. **הענן הרטנן** (done): the Grumble Cloud takes the colours from King Roland's flower beds ("הם שלי עכשיו!") and hides them in little grey
   puffs in the sky.
   - *Activity A, team flight:* Worm flies with Kepri and Vulcan in formation, rail-guided like chapters 1 and 2 (it collects by itself, so it can
     never stall), right round the castle. This is the longest part of the chapter. Six pairs of grey puffs pop into colour sparks, in
     **equal groups**: 2, 2 × 2 = 4 … 6 × 2 = 12. Kepri's sunbeam and Vulcan's fireball take turns popping them, and the colours trail behind the team.
   - *Activity B, paint pots:* on the lawn, tap each of four pots and Worm pours 5 sparks into it, **counting by fives** (5, 10, 15, 20). Each pot
     gives a flower bed its colour back. After a quiet while Worm pours one himself.
   - *Riddles:* a multiplication and an addition from the adaptive engine, between the pots.
   - *Emotional beat:* the cloud peeks back ("עכשיו שוב אין לי כלום"); Drake notices he is not angry but sad. Worm: "אולי הוא פשוט רוצה חבר?"
   - *Teaser:* the whole team sets out for Rainbow Mountain, the cloud's home. *Keepsake:* a paintbrush feather, from King Roland.

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
