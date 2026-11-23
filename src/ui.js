// Hebrew RTL HUD: dialogue bubbles, toasts, action buttons, joystick, riddle panel, cards.
import { sfx } from './audio.js';
const $ = s => document.querySelector(s);
export const FACES = { griffith: '🧙‍♂️', worm: '🐉', drake: '👦', king: '👑', bo: '🧒', baby: '💧', ana: '👧', kepri: '☀️', cloud: '☁️', rori: '👩‍🦰', vulcan: '🔥' };
export const NAMES = { griffith: "גריפית'", worm: 'וורם', drake: 'דרייק', king: 'המלך רולנד', bo: 'בו', baby: 'בועה', ana: 'אנה', kepri: 'קפרי', cloud: 'הענן הרטנן', rori: 'רורי', vulcan: 'וולקן' };
export const ui = { fast: false, onSay: null };

// A bubble that is abandoned (the chapter was left with 🏠 while it was open) must take its tap handlers with it: a stale
// handler used to hide the NEXT bubble on the first quick tap without resolving it, which left the story stuck.
let dropSay = null;
export function say(who, text) {
  if (dropSay) dropSay();
  const d = $('#dialog'); d.hidden = false; d.dataset.who = who;
  d.querySelector('.face').textContent = FACES[who]; d.querySelector('.name').textContent = NAMES[who];
  d.querySelector('.text').textContent = text; d.style.animation = 'none'; d.offsetWidth; d.style.animation = '';
  ui.onSay && ui.onSay(who, text);
  // A tap anywhere on the bubble advances it. pointerup and click are both accepted (some browsers drop one of them after a
  // scroll or a long press) and only the first one counts. After 12 s without a tap the "המשך" button pulses; it never
  // advances by itself.
  d.classList.remove('waiting');
  return new Promise(res => {
    let finished = false, armed = false, ta = null;
    const off = () => { finished = true; d.removeEventListener('pointerup', done); d.removeEventListener('click', done); clearTimeout(t); clearTimeout(tw); clearTimeout(ta); d.classList.remove('waiting'); if (dropSay === off) dropSay = null; };
    const done = () => { if (finished || !armed) return; off(); sfx.tap(); d.hidden = true; ui.onSayEnd && ui.onSayEnd(who); res(); };
    dropSay = off;
    d.addEventListener('pointerup', done); d.addEventListener('click', done);
    const t = ui.fast ? setTimeout(() => { armed = true; done(); }, 40) : null;
    const tw = setTimeout(() => { if (!finished) d.classList.add('waiting'); }, 12000);
    ta = setTimeout(() => { armed = true; }, ui.fast ? 0 : 350); // ignore the tap that was still on its way to the previous bubble
  });
}
let toastT = null;
export function toast(who, text, ms = 2800) {
  const t = $('#toast'); t.hidden = false; t.querySelector('.face').textContent = FACES[who] || '✨'; t.querySelector('.text').textContent = text;
  t.style.animation = 'none'; t.offsetWidth; t.style.animation = '';
  clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), ms);
}
export function hideToast() { $('#toast').hidden = true; }
export function actions(list) {
  const a = $('#actions'); a.innerHTML = '';
  for (const it of list) { const b = document.createElement('button'); b.className = 'big ' + (it.cls || ''); b.id = it.id; b.textContent = it.label;
    b.addEventListener('pointerup', e => { e.stopPropagation(); sfx.tap(); it.onClick(b); }); a.appendChild(b); }
}
export function clearActions() { $('#actions').innerHTML = ''; }

// thumb joystick (bottom-left). Value in [-1,1]^2 with radial dead-zone and soft curve.
export const joy = { x: 0, y: 0, active: false, enabled: false };
const jEl = $('#joy'), knob = $('#knob'); let jId = null;
function jSet(e) {
  const r = jEl.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, R = r.width / 2;
  // a finger still held (and moving) on the stick after it was hidden has no box to measure: dividing by its zero radius
  // gave NaN input, which poisoned the next flight's positions and crashed the frame
  if (!joy.enabled || !(R > 0)) { joy.x = joy.y = 0; return; }
  let dx = (e.clientX - cx) / R, dy = (e.clientY - cy) / R; const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; }
  knob.style.transform = `translate(${dx * R * 0.6}px, ${dy * R * 0.6}px)`;
  const mm = Math.min(1, m), k = mm < 0.12 ? 0 : Math.pow((mm - 0.12) / 0.88, 1.3) / (mm || 1);
  joy.x = dx * k; joy.y = dy * k;
}
jEl.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); jId = e.pointerId; jEl.setPointerCapture(jId); joy.active = true; jSet(e); });
jEl.addEventListener('pointermove', e => { if (e.pointerId === jId) jSet(e); });
const jEnd = e => { if (e.pointerId !== jId) return; jId = null; joy.active = false; joy.x = joy.y = 0; knob.style.transform = ''; };
jEl.addEventListener('pointerup', jEnd); jEl.addEventListener('pointercancel', jEnd);
export function showJoy(on) {
  jEl.hidden = !on; joy.enabled = on;
  if (!on) { if (jId !== null) { try { jEl.releasePointerCapture(jId); } catch { } jId = null; } joy.active = false; joy.x = joy.y = 0; knob.style.transform = ''; }
}
// keyboard (desktop testing)
const keys = new Set(); addEventListener('keydown', e => keys.add(e.key)); addEventListener('keyup', e => keys.delete(e.key));
export function input() {
  let x = joy.x, y = joy.y;
  if (keys.has('ArrowLeft') || keys.has('a')) x -= 1; if (keys.has('ArrowRight') || keys.has('d')) x += 1;
  if (keys.has('ArrowUp') || keys.has('w')) y -= 1; if (keys.has('ArrowDown') || keys.has('s')) y += 1;
  if (!Number.isFinite(x)) x = 0; if (!Number.isFinite(y)) y = 0;
  return { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) };
}

// ---- riddles (numbers come from src/math.js). Never a fail state: a wrong tap only greys that button and brings more help.
//   1st miss: a warm line + the stones picture (tens as bars, arrays for ×, empty places for a missing number)
//   2nd miss: the worked steps appear one by one and one wrong answer is taken away
//   3rd miss: Worm shows the answer; the right button glows and the kid taps it
const stones = n => n === '?' ? '<span class="st slot ap">?</span>' : '<span class="bar ap">10</span>'.repeat(Math.floor(n / 10)) + '<span class="st ap"></span>'.repeat(n % 10);
function visualHTML(r) {
  const v = r.visual;
  if (v.type === 'array') return `<span class="arr">${(`<span class="row ap">${'<i></i>'.repeat(v.cols)}</span>`).repeat(v.rows)}</span><span class="tot" dir="rtl"><bdi dir="ltr">${v.rows}</bdi> שורות של <bdi dir="ltr">${v.cols}</bdi></span>` + (v.plus ? `<span class="plus">+</span><span class="grp">${stones(v.plus)}</span>` : '');
  return `<span class="grp">${stones(v.parts[0])}</span><span class="plus">${v.sym}</span><span class="grp">${stones(v.parts[1])}</span>` + (v.total != null ? `<span class="plus">=</span><span class="tot">${v.total}</span>` : '');
}
export let currentRiddle = null;
export function askRiddle(r, { title = '🔮 חידה קסומה', cb = {} } = {}) {
  const m = $('#math'); m.hidden = false; currentRiddle = r;
  m.querySelector('.m-title').textContent = title;
  const q = m.querySelector('.m-q'); q.innerHTML = r.qHTML; q.classList.toggle('word', !!r.text);
  const vis = m.querySelector('.m-visual'); vis.innerHTML = visualHTML(r); vis.hidden = r.level > 2;   // harder levels: the picture is help, not a giveaway
  const steps = m.querySelector('.m-steps'); steps.innerHTML = ''; steps.hidden = true;
  const hint = m.querySelector('.m-hint'); hint.textContent = 'בחר את התשובה הנכונה 👇';
  const box = m.querySelector('.m-answers'); box.innerHTML = ''; box.classList.toggle('four', r.options.length > 3);
  return new Promise(res => {
    let wrong = 0, done = false; const btns = [];
    const pulse = () => { const aps = [...vis.querySelectorAll('.ap')].slice(0, 24); aps.forEach((ap, i) => setTimeout(() => { ap.classList.add('count'); setTimeout(() => ap.classList.remove('count'), 300); }, 220 * i)); };
    for (const o of r.options) {
      const btn = document.createElement('button'); btn.textContent = o; btn.dataset.v = o; box.appendChild(btn); btns.push(btn);
      btn.addEventListener('pointerup', () => {
        if (done || btn.classList.contains('wrong')) return;
        if (o === r.answer) {
          done = true; btn.classList.remove('glow'); btn.classList.add('right'); sfx.chime();
          hint.textContent = wrong >= 3 ? 'לא נורא, ככה לומדים! 💚' : 'נכון מאוד! 🎉'; steps.hidden = false; steps.innerHTML = `<bdi dir="ltr" class="eq">${r.eq.includes('?') ? r.eq.replace('?', r.answer) : `${r.eq} = ${r.answer}`}</bdi>`;
          cb.right && cb.right(wrong);
          setTimeout(() => { m.hidden = true; if (currentRiddle === r) currentRiddle = null; res({ wrong }); }, ui.fast ? 50 : 1400);
          return;
        }
        wrong++; btn.classList.add('wrong'); sfx.oops(); cb.wrong && cb.wrong(wrong);
        if (wrong === 1) { hint.textContent = 'כמעט! בוא נסתכל יחד על האבנים 💚'; vis.hidden = false; pulse(); }
        else if (wrong === 2) {
          hint.textContent = 'בוא נפתור יחד, צעד אחר צעד ✨'; vis.hidden = false;
          steps.hidden = false; steps.innerHTML = r.steps.map(t => `<bdi dir="ltr" class="eq step">${t}</bdi>`).join('');
          [...steps.children].forEach((el, i) => setTimeout(() => el.classList.add('on'), ui.fast ? 0 : 500 * i));
          const extra = btns.find(x => +x.dataset.v !== r.answer && !x.classList.contains('wrong')); if (extra && btns.filter(x => !x.classList.contains('wrong')).length > 2) extra.classList.add('wrong'); // 50:50
        } else {
          hint.textContent = 'לא נורא, ככה לומדים! גע בתשובה הזוהרת ✨';
          for (const x of btns) if (+x.dataset.v === r.answer) x.classList.add('glow'); else x.classList.add('wrong');
        }
      });
    }
  });
}
export function card({ kicker = '', title = '', text = '', buttons = [], cls = '' }) {
  const c = $('#card'); c.hidden = false; c.className = 'screen ' + cls;
  c.querySelector('.c-kicker').textContent = kicker; c.querySelector('.c-title').textContent = title; c.querySelector('.c-text').textContent = text;
  const box = c.querySelector('.c-buttons'); box.innerHTML = '';
  return new Promise(res => {
    if (!buttons.length) { setTimeout(() => { c.hidden = true; res(); }, ui.fast ? 50 : 2000); return; }
    for (const b of buttons) { const el = document.createElement('button'); el.className = 'big ' + (b.cls || ''); el.textContent = b.label; el.dataset.v = b.value;
      el.addEventListener('pointerup', () => { sfx.tap(); c.hidden = true; res(b.value); }); box.appendChild(el); }
  });
}
export function hideOverlays() { for (const s of ['#math', '#card', '#dialog', '#toast']) $(s).hidden = true; currentRiddle = null; if (dropSay) dropSay(); clearActions(); }
export const fade = on => new Promise(r => { $('#fade').classList.toggle('on', on); setTimeout(r, ui.fast ? 30 : 650); });
