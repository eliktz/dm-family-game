// Hebrew RTL HUD: dialogue bubbles, toasts, action buttons, joystick, riddle panel, cards.
import { sfx, speak } from './audio.js';
const $ = s => document.querySelector(s);
export const FACES = { griffith: '🧙‍♂️', worm: '🐉', drake: '👦', king: '👑', bo: '🧒', baby: '💧' };
export const NAMES = { griffith: "גריפית'", worm: 'וורם', drake: 'דרייק', king: 'המלך רולנד', bo: 'בו', baby: 'בועה' };
export const ui = { fast: false, onSay: null };

export function say(who, text) {
  const d = $('#dialog'); d.hidden = false; d.dataset.who = who;
  d.querySelector('.face').textContent = FACES[who]; d.querySelector('.name').textContent = NAMES[who];
  d.querySelector('.text').textContent = text; d.style.animation = 'none'; d.offsetWidth; d.style.animation = '';
  speak(text, who); ui.onSay && ui.onSay(who, text);
  return new Promise(res => {
    const done = () => { d.removeEventListener('pointerup', done); clearTimeout(t); sfx.tap(); d.hidden = true; res(); };
    const t = ui.fast ? setTimeout(done, 40) : null;
    setTimeout(() => d.addEventListener('pointerup', done), ui.fast ? 0 : 350);
  });
}
let toastT = null;
export function toast(who, text, ms = 2800) {
  const t = $('#toast'); t.hidden = false; t.querySelector('.face').textContent = FACES[who] || '✨'; t.querySelector('.text').textContent = text;
  t.style.animation = 'none'; t.offsetWidth; t.style.animation = '';
  if (who) speak(text, who);
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
  let dx = (e.clientX - cx) / R, dy = (e.clientY - cy) / R; const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; }
  knob.style.transform = `translate(${dx * R * 0.6}px, ${dy * R * 0.6}px)`;
  const mm = Math.min(1, m), k = mm < 0.12 ? 0 : Math.pow((mm - 0.12) / 0.88, 1.3) / (mm || 1);
  joy.x = dx * k; joy.y = dy * k;
}
jEl.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); jId = e.pointerId; jEl.setPointerCapture(jId); joy.active = true; jSet(e); });
jEl.addEventListener('pointermove', e => { if (e.pointerId === jId) jSet(e); });
const jEnd = e => { if (e.pointerId !== jId) return; jId = null; joy.active = false; joy.x = joy.y = 0; knob.style.transform = ''; };
jEl.addEventListener('pointerup', jEnd); jEl.addEventListener('pointercancel', jEnd);
export function showJoy(on) { jEl.hidden = !on; joy.enabled = on; if (!on) { joy.x = joy.y = 0; knob.style.transform = ''; } }
// keyboard (desktop testing)
const keys = new Set(); addEventListener('keydown', e => keys.add(e.key)); addEventListener('keyup', e => keys.delete(e.key));
export function input() {
  let x = joy.x, y = joy.y;
  if (keys.has('ArrowLeft') || keys.has('a')) x -= 1; if (keys.has('ArrowRight') || keys.has('d')) x += 1;
  if (keys.has('ArrowUp') || keys.has('w')) y -= 1; if (keys.has('ArrowDown') || keys.has('s')) y += 1;
  return { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) };
}

// gentle riddles: wrong answers only give a hint + a counting animation; resolves when the right one is tapped
function quiz({ title, qHTML, visHTML, ans, right, wrong1, wrong2, countSel }, cb = {}) {
  const m = $('#math'); m.hidden = false;
  m.querySelector('.m-title').textContent = title; m.querySelector('.m-q').innerHTML = qHTML;
  const vis = m.querySelector('.m-visual'); vis.innerHTML = visHTML;
  const hint = m.querySelector('.m-hint'); hint.textContent = 'בחר את התשובה הנכונה 👇';
  const opts = [...new Set([ans, ans + 1, Math.max(1, ans - 1) === ans ? ans + 2 : ans - 1])].sort(() => Math.random() - 0.5);
  const box = m.querySelector('.m-answers'); box.innerHTML = '';
  return new Promise(res => {
    let tries = 0;
    for (const o of opts) {
      const btn = document.createElement('button'); btn.textContent = o; btn.dataset.v = o; box.appendChild(btn);
      btn.addEventListener('pointerup', async () => {
        if (btn.classList.contains('wrong')) return;
        if (o === ans) {
          btn.classList.add('right'); sfx.chime(); hint.textContent = right; speak(hint.textContent, 'griffith');
          cb.right && cb.right(); setTimeout(() => { m.hidden = true; res(); }, ui.fast ? 50 : 1400);
        } else {
          tries++; btn.classList.add('wrong'); sfx.oops(); cb.wrong && cb.wrong();
          hint.textContent = tries === 1 ? wrong1 : wrong2; speak(hint.textContent, 'griffith');
          const aps = [...vis.querySelectorAll(countSel)];
          aps.forEach((ap, i) => setTimeout(() => { ap.classList.add('count'); sfx.tap(); setTimeout(() => ap.classList.remove('count'), 300); }, 350 * i));
        }
      });
    }
  });
}
const rep = (html, n) => html.repeat(n);
// "3 + 2 = ?" with apples
export function riddle(a, b, cb = {}) {
  return quiz({ title: '🔮 חידת השער', qHTML: `כמה זה <span dir="ltr" class="eq">${a} + ${b}</span>?`,
    visHTML: `<span class="grp">${rep('<span class="ap">🍎</span>', a)}</span><span class="plus">+</span><span class="grp">${rep('<span class="ap">🍎</span>', b)}</span>`,
    ans: a + b, right: `נכון מאוד! ${a} ועוד ${b} זה ${a + b}! 🎉`, wrong1: 'כמעט! בוא נספור יחד את התפוחים 🍎', wrong2: 'אתה ממש קרוב! נסה עוד פעם 💚', countSel: '.ap' }, cb);
}
// missing addend "2 + ? = 5" with warm stones and empty places
export function riddleMissing(a, total, cb = {}) {
  const miss = total - a;
  return quiz({ title: '🔥 חידת האבנים החמות', qHTML: `כמה חסר? <span dir="ltr" class="eq">${a} + <span class="miss">?</span> = ${total}</span>`,
    visHTML: `<span class="grp">${rep('<span class="st ap"></span>', a)}</span><span class="plus">+</span><span class="grp">${rep('<span class="st slot ap">?</span>', miss)}</span><span class="plus">=</span><span class="tot">${total}</span>`,
    ans: miss, right: `נכון מאוד! ${a} ועוד ${miss} זה ${total}! 🎉`, wrong1: 'כמעט! בוא נספור יחד את המקומות הריקים', wrong2: 'אתה ממש קרוב! נסה עוד פעם 💚', countSel: '.slot' }, cb);
}
export function card({ kicker = '', title = '', text = '', buttons = [], cls = '' }) {
  const c = $('#card'); c.hidden = false; c.className = 'screen ' + cls;
  c.querySelector('.c-kicker').textContent = kicker; c.querySelector('.c-title').textContent = title; c.querySelector('.c-text').textContent = text;
  if (text) speak(title + '. ' + text, 'griffith');
  const box = c.querySelector('.c-buttons'); box.innerHTML = '';
  return new Promise(res => {
    if (!buttons.length) { setTimeout(() => { c.hidden = true; res(); }, ui.fast ? 50 : 2000); return; }
    for (const b of buttons) { const el = document.createElement('button'); el.className = 'big ' + (b.cls || ''); el.textContent = b.label; el.dataset.v = b.value;
      el.addEventListener('pointerup', () => { sfx.tap(); c.hidden = true; res(b.value); }); box.appendChild(el); }
  });
}
export function hideOverlays() { for (const s of ['#math', '#card', '#dialog', '#toast']) $(s).hidden = true; clearActions(); }
export const fade = on => new Promise(r => { $('#fade').classList.toggle('on', on); setTimeout(r, ui.fast ? 30 : 650); });
