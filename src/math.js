// Riddle engine (pure: no DOM, no storage, seedable rng, so it is unit-tested in test/math.mjs).
// makeRiddle(level, kind, rng) → one riddle with plausible wrong answers, a hint visual and worked steps.
// Levels 1-5 (see STORY.md "Math progression"):
//   1  add / subtract within 10, missing number (7 + ? = 10)
//   2  add / subtract within 20 crossing ten (8 + 7, 15 − 6); ×2 ×5 ×10
//   3  two-digit ± one-digit and tens (34 + 5, 40 + 27, 63 − 20); tables 2-5; missing number on either side
//   4  two-digit ± two-digit with carrying / borrowing up to 100 (38 + 27, 71 − 34); tables 2-10; word problems
//   5  everything mixed, plus an occasional two-step story (3 × 4 + 5)
// Every answer is a whole number from 1 to 100. No division, no negatives.
export function mulberry32(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export const KINDS = { 1: ['add', 'sub', 'missing'], 2: ['add', 'sub', 'missing', 'mul'], 3: ['add', 'sub', 'missing', 'mul', 'missingMul', 'word'],
  4: ['add', 'sub', 'missing', 'mul', 'missingMul', 'word'], 5: ['add', 'sub', 'missing', 'mul', 'missingMul', 'word', 'twoStep'] };
const FALLBACK = { mul: 'add', missingMul: 'missing', word: 'add', twoStep: 'word' }; // when a chapter asks for a kind the level does not have yet
export const EXAMPLES = { 1: '4 + 5, 7 + ? = 10', 2: '8 + 7, 15 − 6, 5 × 4', 3: '34 + 5, 63 − 20, 4 × 3', 4: '38 + 27, 71 − 34, 7 × 8', 5: '3 × 4 + 5, 62 − 28' };
export const clampLevel = n => Math.max(1, Math.min(5, Math.round(Number(n)) || 1));

const MINUS = '−', TIMES = '×';
const eqHTML = s => `<bdi dir="ltr" class="eq">${s.replace('?', '<span class="miss">?</span>')}</bdi>`;
const num = n => `<bdi dir="ltr" class="num">${n}</bdi>`;

// ---------------------------------------------------------------- number generators per level
function genAdd(L, ri) {
  if (L <= 1) { const a = ri(1, 8); return [a, ri(1, 10 - a)]; }
  if (L === 2) { const a = ri(5, 9); return ri(0, 1) ? [a, ri(11 - a, 9)] : [ri(11, 15), ri(3, 5)]; }
  if (L === 3) {
    if (ri(0, 1)) { const t = ri(2, 9) * 10, o = ri(1, 7); return [t + o, ri(2, 9 - o)]; }              // 34 + 5 (no carry)
    const t = ri(2, 6) * 10; return [t, ri(11, 99 - t)];                                                // 40 + 27
  }
  for (;;) { const a = ri(15, 79), b = ri(12, 79); if (a % 10 + b % 10 >= 10 && b % 10 && a + b <= 100) return [a, b]; }   // carrying
}
function genSub(L, ri) {
  if (L <= 1) { const a = ri(3, 10); return [a, ri(1, a - 1)]; }
  if (L === 2) { const a = ri(11, 18); return [a, ri(a % 10 + 1, 9)]; }                                 // 15 − 6 (crossing ten)
  if (L === 3) {
    if (ri(0, 1)) { const a = ri(31, 99); return [a, ri(1, Math.floor(a / 10) - 1) * 10]; }             // 63 − 20
    const t = ri(2, 9) * 10, o = ri(3, 9); return [t + o, ri(2, o - 1)];                                // 47 − 5 (no borrow)
  }
  for (;;) { const a = ri(31, 99), b = ri(12, 88); if (b < a - 2 && b % 10 > a % 10) return [a, b]; }   // borrowing
}
function genMul(L, ri) {
  let a, b;
  if (L <= 2) { a = [2, 5, 10][ri(0, 2)]; b = ri(2, 10); }
  else if (L === 3) { a = ri(2, 5); b = ri(2, 10); }
  else { a = ri(2, 10); b = ri(3, 10); }
  return ri(0, 1) ? [a, b] : [b, a];
}

// ---------------------------------------------------------------- Hebrew word problems (original, digits only so no gendered number words)
// Each template: op, emoji for the hint line, text(a, b, c) with every number wrapped as an LTR isolate, compute(a, b, c).
const W = (op, emoji, text, compute) => ({ op, emoji, text, compute });
export const WORD_TEMPLATES = [
  W('add', '⭐', (a, b) => `דרייק אסף ${num(a)} כוכבים, ובדרך מצא עוד ${num(b)}. כמה כוכבים יש לו עכשיו?`, (a, b) => a + b),
  W('add', '💎', (a, b) => `במערה יש ${num(a)} קריסטלים ירוקים ועוד ${num(b)} קריסטלים כחולים. כמה קריסטלים יש בסך הכול?`, (a, b) => a + b),
  W('add', '🏮', (a, b) => `גריפית' הדליק ${num(a)} פנסים בבוקר ועוד ${num(b)} פנסים בערב. כמה פנסים הוא הדליק?`, (a, b) => a + b),
  W('add', '✉️', (a, b) => `המלך רולנד קיבל ${num(a)} מכתבים אתמול ועוד ${num(b)} מכתבים היום. כמה מכתבים הוא קיבל?`, (a, b) => a + b),
  W('sub', '🔥', (a, b) => `במערת הדרקונים היו ${num(a)} אבנים חמות. ${num(b)} מהן התקררו. כמה אבנים חמות נשארו?`, (a, b) => a - b),
  W('sub', '🍎', (a, b) => `לוורם היו ${num(a)} תפוחים. הוא אכל ${num(b)} מהם. כמה תפוחים נשארו לו?`, (a, b) => a - b),
  W('sub', '🐦', (a, b) => `על חומת הטירה ישבו ${num(a)} ציפורים. ${num(b)} מהן עפו משם. כמה ציפורים נשארו?`, (a, b) => a - b),
  W('sub', '🏮', (a, b) => `בטירה דלקו ${num(a)} פנסים. הרוח כיבתה ${num(b)} מהם. כמה פנסים עדיין דולקים?`, (a, b) => a - b),
  W('mul', '🧺', (a, b) => `וורם קיבל ${num(a)} סלים, ובכל סל יש ${num(b)} תפוחים. כמה תפוחים הוא קיבל?`, (a, b) => a * b),
  W('mul', '🚩', (a, b) => `בטירה יש ${num(a)} מגדלים, ועל כל מגדל ${num(b)} דגלים. כמה דגלים יש בסך הכול?`, (a, b) => a * b),
  W('mul', '🪨', (a, b) => `דרייק סידר ${num(a)} שורות של אבנים, ובכל שורה ${num(b)} אבנים. כמה אבנים הוא סידר?`, (a, b) => a * b),
  W('mul', '💧', (a, b) => `בו מילא ${num(a)} דליים, ובכל דלי ${num(b)} טיפות גדולות. כמה טיפות יש בסך הכול?`, (a, b) => a * b),
  W('twoStep', '🧺', (a, b, c) => `לוורם יש ${num(a)} סלים, ובכל סל ${num(b)} תפוחים. דרייק נתן לו עוד ${num(c)} תפוחים. כמה תפוחים יש לוורם?`, (a, b, c) => a * b + c),
  W('twoStep', '💎', (a, b, c) => `גריפית' סידר ${num(a)} שורות של ${num(b)} קריסטלים, ואז מצא עוד ${num(c)}. כמה קריסטלים יש לו?`, (a, b, c) => a * b + c),
];

// ---------------------------------------------------------------- worked steps (shown after the second miss) + hint visuals
function stepsAdd(a, b) {
  const s = a + b;
  if (b >= 10 && b % 10) { const t = b - b % 10; return [`${a} + ${t} = ${a + t}`, `${a + t} + ${b % 10} = ${s}`]; }
  if (b < 10 && a % 10 && a % 10 + b > 10) { const k = 10 - a % 10; return [`${a} + ${k} = ${a + k}`, `${a + k} + ${b - k} = ${s}`]; }
  return [`${a} + ${b} = ${s}`];
}
function stepsSub(a, b) {
  const s = a - b;
  if (b >= 10 && b % 10) { const t = b - b % 10; return [`${a} ${MINUS} ${t} = ${a - t}`, `${a - t} ${MINUS} ${b % 10} = ${s}`]; }
  if (b < 10 && a % 10 && b > a % 10) { const k = a % 10; return [`${a} ${MINUS} ${k} = ${a - k}`, `${a - k} ${MINUS} ${b - k} = ${s}`]; }
  return [`${a} ${MINUS} ${b} = ${s}`];
}
const skip = (a, b) => { const n = Math.min(a, b), k = Math.max(a, b); return [Array.from({ length: n }, (_, i) => k * (i + 1)).join(', ')]; }; // 4, 8, 12

// ---------------------------------------------------------------- distractors: plausible mistakes, not just ±1
function options(ans, cands, n, rnd) {
  const out = []; const ok = v => Number.isInteger(v) && v > 0 && v <= 120 && v !== ans && !out.includes(v);
  for (const v of cands) if (out.length < n - 1 && ok(v)) out.push(v);
  for (let k = 1; out.length < n - 1; k++) for (const v of [ans + k, ans - k]) if (out.length < n - 1 && ok(v)) out.push(v);
  out.push(ans);
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}
const mix = (arr, rnd) => arr.map(v => [rnd(), v]).sort((x, y) => x[0] - y[0]).map(x => x[1]);

// ---------------------------------------------------------------- the generator
export function makeRiddle(level, kind, rng = Math.random, opts = {}) {
  const L = clampLevel(level), ri = (lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
  let k = kind && KINDS[5].includes(kind) ? kind : KINDS[L][ri(0, KINDS[L].length - 1)];
  while (!KINDS[L].includes(k)) k = FALLBACK[k] || 'add';
  // level 5 is a mix: plain kinds use level 3-4 sized numbers
  const NL = L === 5 ? (ri(0, 2) ? 4 : 3) : L, nOpt = L <= 2 ? 3 : 4;
  for (let tries = 0; ; tries++) {
    let r;
    if (k === 'add') { const [a, b] = genAdd(NL, ri), ans = a + b; r = { op: '+', a, b, answer: ans, eq: `${a} + ${b}`, steps: stepsAdd(a, b), visual: { type: 'groups', parts: [a, b], sym: '+' },
      cands: mix([a % 10 + b % 10 >= 10 ? ans - 10 : ans + 10, ans + 10, ans - 10, Math.abs(a - b), ans + 1, ans - 1, ans + 2], rng) }; }
    else if (k === 'sub') { const [a, b] = genSub(NL, ri), ans = a - b; r = { op: '-', a, b, answer: ans, eq: `${a} ${MINUS} ${b}`, steps: stepsSub(a, b), visual: { type: 'groups', parts: [a, b], sym: MINUS },
      cands: mix([b % 10 > a % 10 ? ans + 10 : ans - 10, ans + 10, a + b, ans + 1, ans - 1, ans + 2, Math.abs(Math.floor(a / 10) - Math.floor(b / 10)) * 10 + Math.abs(a % 10 - b % 10)], rng) }; }
    else if (k === 'mul') { const [a, b] = genMul(NL, ri), ans = a * b; r = { op: '*', a, b, answer: ans, eq: `${a} ${TIMES} ${b}`, steps: skip(a, b), visual: { type: 'array', rows: Math.min(a, b), cols: Math.max(a, b) },
      cands: mix([a * (b + 1), a * (b - 1), (a + 1) * b, (a - 1) * b, a + b, ans + 1, ans - 1], rng) }; }
    else if (k === 'missing') {
      const form = L <= 1 ? 0 : ri(0, L === 2 ? 1 : 3);
      if (form === 0 || form === 2) { const [a, b] = genAdd(Math.min(NL, L === 4 || L === 5 ? 4 : NL), ri), t = a + b; // a + ? = t   or   ? + a = t
        r = { op: '+', a, b, total: t, pos: 'b', answer: b, eq: form === 0 ? `${a} + ? = ${t}` : `? + ${a} = ${t}`, steps: [`${t} ${MINUS} ${a} = ${b}`], visual: { type: 'groups', parts: [a, '?'], sym: '+', total: t },
          cands: mix([t, a + t, b + 10, b - 10, Math.abs(b - a), b + 1, b - 1, b + 2], rng) }; }
      else { const [a, b] = genSub(NL, ri), s = a - b;                                                                   // a − ? = s   or   ? − b = s
        r = form === 1 ? { op: '-', a, b, total: s, pos: 'b', answer: b, eq: `${a} ${MINUS} ? = ${s}`, steps: [`${a} ${MINUS} ${s} = ${b}`], visual: { type: 'groups', parts: [a, '?'], sym: MINUS, total: s }, cands: mix([a + s, s, b + 10, b - 10, b + 1, b - 1, b + 2], rng) }
          : { op: '-', a, b, total: s, pos: 'a', answer: a, eq: `? ${MINUS} ${b} = ${s}`, steps: [`${s} + ${b} = ${a}`], visual: { type: 'groups', parts: ['?', b], sym: MINUS, total: s }, cands: mix([s - b, a + 10, a - 10, s, a + 1, a - 1, a + 2].filter(v => v <= 100), rng) }; }
    }
    else if (k === 'missingMul') { const [a, b] = genMul(NL, ri), p = a * b, left = ri(0, 1);                            // ? × b = p   or   a × ? = p
      r = { op: '*', a, b, total: p, pos: left ? 'a' : 'b', answer: left ? a : b, eq: left ? `? ${TIMES} ${b} = ${p}` : `${a} ${TIMES} ? = ${p}`,
        steps: [Array.from({ length: left ? a : b }, (_, i) => (left ? b : a) * (i + 1)).join(', ')], visual: { type: 'array', rows: Math.min(a, b), cols: Math.max(a, b) } };
      r.cands = mix([r.answer + 1, r.answer - 1, r.answer + 2, r.answer - 2, p - (left ? b : a), left ? b : a], rng); }
    else { // word problems and two-step stories
      const pool = WORD_TEMPLATES.filter(t => k === 'twoStep' ? t.op === 'twoStep' : t.op !== 'twoStep' && (opts.wordOps ? opts.wordOps.includes(t.op) : true));
      const t = pool[ri(0, pool.length - 1)]; let a, b, c;
      if (t.op === 'twoStep') { a = ri(2, 5); b = ri(2, 10); c = ri(2, 9); }
      else if (t.op === 'mul') { [a, b] = genMul(Math.max(2, NL - 1), ri); }
      else { [a, b] = (t.op === 'add' ? genAdd : genSub)(L === 3 ? 2 : NL, ri); }
      const ans = t.compute(a, b, c), sym = { add: '+', sub: MINUS, mul: TIMES }[t.op];
      r = { op: t.op, a, b, c, answer: ans, template: WORD_TEMPLATES.indexOf(t), text: t.text(a, b, c), emoji: t.emoji,
        eq: t.op === 'twoStep' ? `${a} ${TIMES} ${b} + ${c}` : `${a} ${sym} ${b}`,
        steps: t.op === 'twoStep' ? [`${a} ${TIMES} ${b} = ${a * b}`, `${a * b} + ${c} = ${ans}`] : t.op === 'add' ? stepsAdd(a, b) : t.op === 'sub' ? stepsSub(a, b) : skip(a, b),
        visual: t.op === 'mul' || t.op === 'twoStep' ? { type: 'array', rows: Math.min(a, b), cols: Math.max(a, b), plus: c } : { type: 'groups', parts: [a, b], sym },
        cands: mix(t.op === 'add' ? [a % 10 + b % 10 >= 10 ? ans - 10 : ans + 10, Math.abs(a - b), ans + 1, ans - 1, ans + 10] : t.op === 'sub' ? [a + b, ans + 10, ans - 10, ans + 1, ans - 1]
          : t.op === 'mul' ? [a + b, a * (b + 1), (a - 1) * b, ans + 1, ans - 1] : [a * b, a + b + c, a * (b + c), ans + 1, ans - 10], rng) };
    }
    r.kind = k; r.level = L; r.key = `${k}:${r.eq}`;
    if (r.answer < 1 || r.answer > 100) continue;
    if (r.key === opts.avoid && tries < 30) continue;                 // never the same riddle twice in a row
    r.options = options(r.answer, r.cands, nOpt, rng); delete r.cands;
    r.qHTML = r.text ? r.text : r.eq.includes('?') ? `כמה חסר? ${eqHTML(r.eq)}` : `כמה זה ${eqHTML(r.eq)}?`;
    r.eqHTML = eqHTML(r.eq.includes('?') ? r.eq : `${r.eq} = ?`);
    return r;
  }
}

// ---------------------------------------------------------------- adaptive difficulty
// state = { level, ceiling, auto, streak, misses }. Defaults: start at level 2, ceiling 5 (he climbs on his own).
// After each riddle call recordResult(state, wrongTaps):
//   0 wrong taps = clean: three clean in a row → level + 1 (never above the parent's ceiling)
//   1 wrong tap  = solved with a hint: no level change by itself, but two such riddles → level − 1
//   2+ wrong taps on one riddle → level − 1 for the next riddle
export function newAdaptive(s = {}) { const ceiling = clampLevel(s.ceiling ?? 5); return { level: Math.min(clampLevel(s.level ?? 2), ceiling), ceiling, auto: s.auto !== false, streak: 0, misses: 0 }; }
export function recordResult(st, wrongTaps) {
  if (!st.auto) return st.level;
  if (wrongTaps === 0) { if (++st.streak >= 3) { st.level = Math.min(st.ceiling, st.level + 1); st.streak = 0; st.misses = 0; } }
  else { st.streak = 0; st.misses += wrongTaps >= 2 ? 2 : 1; if (st.misses >= 2) { st.level = Math.max(1, st.level - 1); st.misses = 0; } }
  return st.level;
}
