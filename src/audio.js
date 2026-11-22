// Original synthesized sound (no recorded/copyrighted audio) + optional Hebrew read-aloud
// via the device's speech engine (iPad has a he-IL voice), so a 7-year-old can follow along.
let ctx = null, master = null, musicGain = null, musicOn = false;
export const settings = { sound: localStorage.getItem('dm.sound') !== '0', voice: localStorage.getItem('dm.voice') !== '0' };
export function unlock() {
  if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination); } catch { return; } }
  if (ctx.state === 'suspended') ctx.resume();
}
function tone(freq, t0, dur, type = 'sine', vol = 0.3, slide = 0, dest = master) {
  if (!ctx || !settings.sound) return;
  const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(dest); o.start(t0); o.stop(t0 + dur + 0.05);
}
const now = () => ctx ? ctx.currentTime : 0;
export const sfx = {
  tap() { tone(660, now(), 0.12, 'triangle', 0.2); },
  chime() { const t = now(); [784, 988, 1175, 1568].forEach((f, i) => tone(f, t + i * 0.08, 0.5, 'sine', 0.22)); },
  star(i = 0) { const t = now(), base = [523, 587, 659, 698, 784, 880, 988, 1047][i % 8]; tone(base, t, 0.25, 'triangle', 0.25); tone(base * 1.5, t + 0.07, 0.4, 'sine', 0.2); tone(base * 2, t + 0.14, 0.5, 'sine', 0.12); },
  squeak() { const t = now(); tone(1250, t, 0.09, 'sine', 0.2, 1.5); tone(1500, t + 0.13, 0.12, 'sine', 0.2, 1.35); },
  happy() { const t = now(); tone(220, t, 0.18, 'sine', 0.25, 1.6); tone(330, t + 0.16, 0.22, 'sine', 0.22, 1.5); },
  purr() { const t = now(); for (let i = 0; i < 6; i++) tone(110 + (i % 2) * 18, t + i * 0.09, 0.12, 'triangle', 0.18); },
  munch() { const t = now(); for (let i = 0; i < 3; i++) tone(180 - i * 20, t + i * 0.16, 0.08, 'square', 0.08, 0.6); },
  oops() { const t = now(); tone(440, t, 0.18, 'sine', 0.18, 0.8); tone(392, t + 0.15, 0.25, 'sine', 0.16); },
  magic() { const t = now(); for (let i = 0; i < 10; i++) tone(600 + i * 120, t + i * 0.05, 0.3, 'sine', 0.1); },
  whoosh() { if (!ctx || !settings.sound) return; const t = now(), b = ctx.createBuffer(1, ctx.sampleRate * 0.8, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / d.length);
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = b; f.type = 'bandpass'; f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(1800, t + 0.7); g.gain.value = 0.25;
    s.connect(f).connect(g).connect(master); s.start(t); },
  fanfare() { const t = now(); [[523, 0], [659, 0.15], [784, 0.3], [1047, 0.45], [784, 0.65], [1047, 0.8]].forEach(([f, d]) => { tone(f, t + d, 0.4, 'triangle', 0.22); tone(f / 2, t + d, 0.4, 'sine', 0.12); }); },
};
// gentle music-box loop (procedural pentatonic, very quiet)
let musicTimer = null;
export function music(on) {
  musicOn = on; if (!ctx) return;
  if (!musicGain) { musicGain = ctx.createGain(); musicGain.gain.value = 0.12; musicGain.connect(master); }
  clearInterval(musicTimer); if (!on) return;
  const scale = [392, 440, 523, 587, 659, 784, 880]; let step = 0;
  const pattern = [0, 2, 4, 2, 5, 4, 2, 1, 0, 2, 4, 6, 5, 4, 2, 4];
  musicTimer = setInterval(() => { if (!settings.sound) return; const t = now(); tone(scale[pattern[step % 16]], t, 0.9, 'sine', 0.35, 0, musicGain); if (step % 4 === 0) tone(scale[pattern[step % 16]] / 2, t, 1.6, 'triangle', 0.25, 0, musicGain); step++; }, 420);
}
// Hebrew read-aloud
let heVoice = null;
function pickVoice() { const vs = speechSynthesis.getVoices(); heVoice = vs.find(v => /^he/i.test(v.lang)) || null; }
if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
export function speak(text, who) {
  if (!settings.voice || !('speechSynthesis' in window) || !heVoice) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[^\u0590-\u05FF0-9\s,.!?'"+\-=]/g, ' ').replace(/\+/g, ' ועוד '));
    u.voice = heVoice; u.lang = heVoice.lang; u.rate = 0.92;
    u.pitch = who === 'worm' ? 0.75 : who === 'drake' ? 1.4 : who === 'griffith' ? 0.85 : 1.0;
    speechSynthesis.speak(u);
  } catch { /* speech is optional */ }
}
export function save() { localStorage.setItem('dm.sound', settings.sound ? '1' : '0'); localStorage.setItem('dm.voice', settings.voice ? '1' : '0'); }
