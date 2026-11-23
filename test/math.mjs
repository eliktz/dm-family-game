// Unit test for the riddle engine (node, no browser). Usage: node math.mjs
import { makeRiddle, mulberry32, KINDS, WORD_TEMPLATES, newAdaptive, recordResult } from '../src/math.js';
let fails = 0; const bad = (m, r) => { if (fails++ < 12) console.log('FAIL', m, r ? JSON.stringify({ level: r.level, kind: r.kind, eq: r.eq, answer: r.answer, options: r.options }) : ''); };
const rng = mulberry32(20261123); const seen = {};
const carry = (a, b) => a % 10 + b % 10 >= 10, borrow = (a, b) => b % 10 > a % 10, two = n => n >= 10;
for (let L = 1; L <= 5; L++) for (const kind of KINDS[L]) {
  const pos = {}; let last = null, n2 = 0, nCarry = 0;
  for (let i = 0; i < 500; i++) {
    const r = makeRiddle(L, kind, rng, { avoid: last }); const { a, b, c, answer: ans } = r;
    if (r.kind !== kind || r.level !== L) bad('kind/level', r);
    if (r.key === last) bad('same riddle twice in a row', r); last = r.key;
    if (!Number.isInteger(ans) || ans < 1 || ans > 100) bad('answer must be a whole number 1..100', r);
    if (new Set(r.options).size !== r.options.length || r.options.filter(o => o === ans).length !== 1) bad('options unique with the answer exactly once', r);
    if (r.options.some(o => !Number.isInteger(o) || o <= 0)) bad('no option <= 0', r);
    if (r.options.length !== (L <= 2 ? 3 : 4)) bad('3 options at L1-2, 4 at L3+', r);
    pos[r.options.indexOf(ans)] = (pos[r.options.indexOf(ans)] || 0) + 1;
    if (!r.steps.length || !r.qHTML.includes('dir="ltr"')) bad('steps and an LTR-isolated question', r);
    if (/\d\s*-\s*\d|\*/.test(r.eq)) bad('uses − and ×, never ASCII', r);
    // the answer really solves it
    const base = r.op === '+' || r.op === 'add' ? a + b : r.op === '-' || r.op === 'sub' ? a - b : r.op === 'twoStep' ? a * b + c : a * b;
    if (kind === 'missing' || kind === 'missingMul') { if (ans !== (r.pos === 'a' ? a : b) || r.total !== base) bad('missing number solves the equation', r); }
    else if (ans !== base) bad('answer = computed value', r);
    if (r.text) { const t = WORD_TEMPLATES[r.template]; const nums = [...r.text.matchAll(/class="num">(\d+)</g)].map(m => +m[1]);
      if (t.compute(...nums) !== ans || t.compute(a, b, c) !== ans) bad('numbers in the story match the answer', r); }
    if (r.text && Math.min(...[a, b, c].filter(v => v != null)) < 2) bad('story numbers are never 1 (the Hebrew nouns are plural)', r);
    // ranges per level
    const isAddSub = ['+', '-', 'add', 'sub'].includes(r.op), big = Math.max(a, b, base);
    if (r.op === '*' || r.op === 'mul') { if (a * b > 100) bad('product <= 100', r);
      if (L === 2 && ![2, 5, 10].some(f => f === a || f === b)) bad('L2 multiplication is x2 x5 x10', r);
      if (L === 3 && kind !== 'word' && Math.min(a, b) > 5) bad('L3 tables 2-5', r); if (Math.max(a, b) > 10) bad('factors <= 10', r); }
    if (isAddSub) { if (L === 1 && big > 10) bad('L1 within 10', r); if (L === 2 && big > 20) bad('L2 within 20', r); if (big > 100) bad('within 100', r);
      if (L >= 3 && kind !== 'word' && two(Math.max(a, b))) n2++;
      if (L === 4 && (kind === 'add' || kind === 'sub')) { if (!(r.op === '+' ? carry(a, b) : borrow(a, b)) || !two(a) || !two(b)) bad('L4 = two-digit with carrying / borrowing', r); nCarry++; } }
    if (L === 1 && (kind === 'add' || kind === 'sub') && r.eq === '3 + 2') seen.trivial = true;
    if (r.op === 'twoStep') seen.twoStep = true; if (r.text && L >= 4) seen['word' + L] = true; if (kind === 'missing') seen['missing' + L] = true; if (r.op === '*' && L >= 2) seen['mul' + L] = true;
  }
  const counts = Object.values(pos); if (counts.length < (L <= 2 ? 3 : 4) || Math.max(...counts) > 500 * 0.5) bad(`correct-button position is spread out (L${L} ${kind}: ${JSON.stringify(pos)})`);
  if (L >= 3 && ['add', 'sub'].includes(kind) && n2 < 500) bad(`L${L} ${kind} always has a two-digit number (${n2}/500)`);
}
for (const k of ['twoStep', 'word4', 'word5', 'missing1', 'missing2', 'missing3', 'missing4', 'missing5', 'mul2', 'mul3', 'mul4', 'mul5']) if (!seen[k]) bad('coverage: ' + k);
if (WORD_TEMPLATES.length < 12) bad('at least 12 word templates');
// a kind the level does not have yet falls back gracefully
if (makeRiddle(1, 'mul', rng).kind !== 'add' || makeRiddle(2, 'word', rng).kind !== 'add' || makeRiddle(1, 'missingMul', rng).kind !== 'missing') bad('fallback kinds');
// adaptive difficulty
const run = (init, taps) => { const s = newAdaptive(init); for (const t of taps) recordResult(s, t); return s.level; };
const eq = (got, want, m) => { if (got !== want) bad(`adaptive: ${m} (got ${got}, want ${want})`); };
eq(run({ level: 2, ceiling: 5 }, [0, 0, 0]), 3, '3 clean → level + 1');
eq(run({ level: 2, ceiling: 5 }, [0, 0]), 2, '2 clean → no change');
eq(run({ level: 3, ceiling: 5 }, [1, 1]), 2, 'two riddles with a miss → level − 1');
eq(run({ level: 3, ceiling: 5 }, [2]), 2, 'two wrong taps on one riddle → level − 1');
eq(run({ level: 3, ceiling: 5 }, [3]), 2, 'guided solve → level − 1');
eq(run({ level: 3, ceiling: 5 }, [1]), 3, 'one hint-assisted riddle → no change');
eq(run({ level: 3, ceiling: 5 }, [0, 0, 1, 0, 0]), 3, 'a miss breaks the streak');
eq(run({ level: 1, ceiling: 5 }, [2, 2, 2]), 1, 'clamped at 1');
eq(run({ level: 3, ceiling: 3 }, [0, 0, 0, 0, 0, 0]), 3, 'clamped at the ceiling');
eq(run({ level: 2, ceiling: 5 }, [0, 0, 0, 0, 0, 0]), 4, 'six clean → + 2');
eq(run({ level: 3, ceiling: 5, auto: false }, [0, 0, 0, 2, 2]), 3, 'auto off → fixed');
eq(newAdaptive({ level: 9, ceiling: 'x' }).level, 1, 'bad saved values are clamped'); eq(newAdaptive({ level: 9 }).level, 5, 'level clamped to 5'); eq(newAdaptive({}).level, 2, 'default level 2'); eq(newAdaptive({}).ceiling, 5, 'default ceiling 5'); eq(newAdaptive({ level: 3 }).ceiling, 5, 'a save without a ceiling gets 5');
eq(newAdaptive({ level: 4, ceiling: 2 }).level, 2, 'level never above the ceiling'); eq(run({}, [0, 0, 0, 0, 0, 0, 0, 0, 0]), 5, 'by default he can climb from 2 to 5');
console.log(fails ? `MATH FAIL (${fails})` : 'MATH PASS'); process.exit(fails ? 1 : 0);
