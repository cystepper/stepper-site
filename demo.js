// What can be touched on the page. The drawing comes from live.js, the sounds are made here in the browser.
import { EFFECTS, summary, newState, stepState, paintEffect, resonanceNode, setResonanceNode, paintEq, eqX, eqF, eqY, eqG, Visual, CLIPS, DANCES, loadBin, paintClip, paintDancer, mixColour, sidechainCurve, clamp, db } from './live.js';
const $ = id => document.getElementById(id);
const still = matchMedia('(prefers-reduced-motion:reduce)').matches;
const onScreen = el => { const r = el.getBoundingClientRect(); return r.bottom > -40 && r.top < innerHeight + 40; };
const SK = { level1: '#58B3A1', level2: '#8A80C4', effects: ['#F08379','#E8A65F','#DCC762','#74C98E','#62BFCB','#7FA8E8','#B398E6','#E08CC8'], text: '#E1E1E4', edge: '#2B2C30', faint: '#9C9C9F', clipper: '#E0605A', accent: '#C4C4C9', accentText: '#0C0C0E' };

// ---- Headings come out of big pixels as you scroll ---------------------------------------------------------------------------
const heads = [...document.querySelectorAll('h2')].map(h => {
  const words = h.textContent.trim().split(/\s+/);
  h.innerHTML = words.map(w => `<span class="w">${w}</span>`).join(' ');
  const c = document.createElement('canvas'); h.appendChild(c);
  return { h, c, g: c.getContext('2d'), spans: [...h.querySelectorAll('.w')], low: document.createElement('canvas'), last: -1 };
});
function pixelHead(o, p) {
  const { h, c, g, spans, low } = o, e = 1 - Math.pow(1 - p, 2.2);
  const block = Math.max(1, Math.round((1 - e) * 30));
  if (p >= 1 || still) { if (o.last !== 1) { h.style.color = ''; c.style.display = 'none'; o.last = 1; } return; }
  if (block === o.last) return;
  o.last = block;
  const dpr = Math.min(2, devicePixelRatio || 1), W = h.clientWidth, H = h.clientHeight, box = h.getBoundingClientRect();
  c.style.display = 'block'; c.style.width = W + 'px'; c.style.height = H + 'px';
  h.style.color = 'transparent';
  c.width = W * dpr; c.height = H * dpr;
  const lw = Math.max(1, Math.ceil(W / block)), lh = Math.max(1, Math.ceil(H / block));
  low.width = lw; low.height = lh;
  const l = low.getContext('2d'), st = getComputedStyle(h);
  l.setTransform(1 / block, 0, 0, 1 / block, 0, 0);
  l.fillStyle = '#f5f5f7'; l.textBaseline = 'alphabetic'; l.font = `${st.fontWeight} ${st.fontSize} ${st.fontFamily}`;
  if ('letterSpacing' in l) l.letterSpacing = st.letterSpacing;
  spans.forEach(s => { const r = s.getBoundingClientRect(); l.fillText(s.textContent.toUpperCase(), r.left - box.left, r.top - box.top + r.height * .82); });
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height);
  g.imageSmoothingEnabled = false; g.globalAlpha = Math.min(1, .25 + e);
  g.drawImage(low, 0, 0, lw, lh, 0, 0, lw * block * dpr, lh * block * dpr);
}
let queued = false;
function moveHeads() {
  queued = false;
  const vh = innerHeight;
  heads.forEach(o => { const r = o.h.getBoundingClientRect(); if (r.bottom < -100 || r.top > vh + 100) return; pixelHead(o, clamp((vh * .92 - r.top) / (vh * .34), 0, 1)); });
}
addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(moveHeads); } }, { passive: true });
addEventListener('resize', () => { heads.forEach(o => { o.last = -1; o.c.style.display = 'none'; }); moveHeads(); });
moveHeads(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(moveHeads);
const seenUp = new IntersectionObserver(l => l.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); seenUp.unobserve(e.target); } }), { threshold: .08 });
document.querySelectorAll('.up').forEach(e => seenUp.observe(e));

// ---- Sound ------------------------------------------------------------------------------------------------------------------
let ctx = null, bus, fxIn, fxOut, analyser, noiseBuf, freq = new Uint8Array(64), wave = new Uint8Array(128), TUNE = 1;
function audio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  bus = ctx.createGain(); bus.gain.value = .75; fxIn = ctx.createGain(); fxOut = ctx.createGain();
  analyser = ctx.createAnalyser(); analyser.fftSize = 512; analyser.smoothingTimeConstant = .5;
  freq = new Uint8Array(analyser.frequencyBinCount); wave = new Uint8Array(analyser.fftSize);
  const safety = ctx.createDynamicsCompressor(); safety.threshold.value = -3; safety.ratio.value = 12;
  bus.connect(fxIn); fxOut.connect(analyser); analyser.connect(safety); safety.connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  rebuild();
  return ctx;
}
function env(t, peak, decay) { const g = ctx.createGain(); g.gain.setValueAtTime(peak, t); g.gain.exponentialRampToValueAtTime(.0008, t + decay); g.connect(bus); return g; }
function tone(t, type, f0, f1, sweep, peak, decay) { const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0 * TUNE, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1 * TUNE, t + sweep); o.connect(env(t, peak, decay)); o.start(t); o.stop(t + decay + .02); return o; }
function noise(t, type, f, q, peak, decay) { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f * TUNE; b.Q.value = q; s.connect(b); b.connect(env(t, peak, decay)); s.start(t, Math.random()); s.stop(t + decay + .02); }
const SOUND = {
  kick: t => tone(t, 'sine', 150, 42, .09, 1, .34),
  snare: t => { noise(t, 'bandpass', 2300, .5, .62, .19); tone(t, 'triangle', 215, 150, .05, .4, .1); },
  snare2: t => { [0, .012, .024].forEach(d => noise(t + d, 'bandpass', 1500, 1.3, .5, .09)); noise(t + .03, 'bandpass', 1400, 1, .45, .21); },
  hat: t => noise(t, 'highpass', 8200, .7, .3, .045),
  open: t => noise(t, 'highpass', 7200, .7, .28, .3),
  crash: t => noise(t, 'highpass', 4800, .4, .34, 1.15),
  bass: t => tone(t, 'sine', 104, 55, .04, .85, .85),
  perc: t => tone(t, 'triangle', 620, 330, .05, .45, .14),
  fx: t => { const o = tone(t, 'sawtooth', 500, 1600, .36, .13, .55); o.frequency.exponentialRampToValueAtTime(700 * TUNE, t + .55); },
  fx2: t => noise(t, 'bandpass', 3000, 7, .7, .35),
  vox: t => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 196 * TUNE; const b = ctx.createBiquadFilter(); b.type = 'bandpass'; b.frequency.setValueAtTime(700, t); b.frequency.linearRampToValueAtTime(1150, t + .22); b.Q.value = 5; o.connect(b); b.connect(env(t, .55, .34)); o.start(t); o.stop(t + .36); },
  chop: t => { SOUND.vox(t); SOUND.vox(t + .1); },
};
const PADS = [['Kick','kick'],['FX','fx'],['',''],['808','bass'],['Snare','snare'],['Vox','vox'],['',''],['Snare 2','snare2'],['Closed Hat','hat'],['FX 2','fx2'],['Open Hat','open'],['Crash','crash'],['Chop','chop'],['Vox 2','vox'],['Vox 3','vox'],['Perc','perc']];
const KEYS = ['5','6','7','8','R','T','Z','U','F','G','H','J','C','V','B','N'];
function play(pad, when, pitch = 0) { const n = PADS[pad] && PADS[pad][1]; if (!n) return; audio(); TUNE = Math.pow(2, pitch / 12); SOUND[n](when ?? ctx.currentTime); TUNE = 1; level = 1; }

// ---- The real pad page, in frames -----------------------------------------------------------------------------------------
let level = 0, rollPad = 0;
const frames = () => ['padframe', 'ftall', 'fwide'].map($).filter(Boolean);
addEventListener('message', e => {
  const t = e.data && e.data.stepper; if (typeof t !== 'string') return;
  const v = +t.slice(1);
  if (t[0] === 'd' && v < 16) play(v);
  if (t[0] === 'k') play(padFor(), undefined, v - 60);
});
const padFor = () => rollPad;
const hitFrames = pad => frames().forEach(f => { if (onScreen(f) && f.contentWindow) f.contentWindow.postMessage({ hit: pad }, '*'); });
const chips = (el, names, chosen, pick) => { el.innerHTML = names.map((n, i) => `<button class="${i === chosen ? 'on' : ''}">${n}</button>`).join(''); [...el.children].forEach((b, i) => b.onclick = () => { [...el.children].forEach(c => c.classList.remove('on')); b.classList.add('on'); pick(i); }); };
chips($('animchips'), ['Orbit','Ripple','Sparks','Meter','Dither','Scan'], 5, i => $('padframe').contentWindow.postMessage({ anim: i }, '*'));
const PSK = [['3d_graphit','Graphite'],['3d_camouflage','Camouflage'],['3d_steel','Steel'],['3d_kawaii','Kawaii'],['3d_petrol','Petrol'],['3d_clear','Clear']];
chips($('padskins'), PSK.map(s => s[1]), 0, i => $('padframe').contentWindow.postMessage({ skin: PSK[i][0] }, '*'));
addEventListener('keydown', e => { if (e.repeat || e.metaKey || e.ctrlKey || !onScreen($('padframe'))) return; const i = KEYS.indexOf(e.key.toUpperCase()); if (i >= 0) { play(i); hitFrames(i); } });
function fitPhones() {
  const a = $('ptall'), b = $('pwide');
  $('ftall').style.transform = `scale(${a.clientWidth / 393})`;
  $('fwide').style.transform = `scale(${b.clientWidth / 852})`;
  $('padframe').style.transform = `scale(${$('padwrap').clientWidth / 480})`;
}
addEventListener('resize', fitPhones); fitPhones();

// ---- Sequencer and piano roll ---------------------------------------------------------------------------------------------
const STEPS = 32;
const START = () => { const n = {}; const add = (p, list, pitch = 0) => (n[p] = n[p] || []).push(...list.map(s => ({ s, pitch })));
  add(0, [0, 10, 16, 26]); add(3, [0, 6, 16, 22], -12); add(4, [8, 24]); add(7, [8, 24]);
  add(8, Array.from({ length: 32 }, (_, i) => i)); add(10, [6, 14, 22, 30]); add(11, [0]); add(14, [4, 20], 3); add(12, [12, 28]);
  return n; };
let notes = START();
const seqC = $('seq'), rollC = $('roll'), sg = seqC.getContext('2d'), rg = rollC.getContext('2d');
const ROW = 25.5, LABEL = 96, RH = 12, KEYW = 44, TOPP = 14, BOTP = -19;
function setup(c, h) { const dpr = Math.min(2, devicePixelRatio || 1), w = c.clientWidth; if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); c.style.height = h + 'px'; } const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); return [g, w]; }
const pitchName = p => ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][(60 + p) % 12] + (Math.floor((60 + p) / 12) - 1);
const isBlack = p => [1,3,6,8,10].includes((60 + p) % 12);
let shownStep = -1;
function drawSeq() {
  const [g, w] = setup(seqC, ROW * 16), cw = (w - LABEL) / STEPS;
  g.fillStyle = '#101113'; g.fillRect(0, 0, w, ROW * 16);
  g.font = '11px Helvetica, Arial, sans-serif'; g.textBaseline = 'middle';
  for (let i = 0; i < 16; i++) {
    const y = i * ROW;
    if (i === rollPad) { g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(0, y, LABEL, ROW); }
    g.fillStyle = SK.text; g.fillText(KEYS[i], 7, y + ROW / 2 + .5);
    g.fillStyle = 'rgba(232,233,235,.82)'; g.fillText(PADS[i][0].toUpperCase(), 24, y + ROW / 2 + .5);
    g.fillStyle = SK.edge; g.fillRect(LABEL, y + ROW - 1, w - LABEL, 1);
  }
  for (let s = 0; s <= STEPS; s++) { g.fillStyle = s % 16 === 0 ? '#9c9c9f' : s % 4 === 0 ? '#5e5e5f' : SK.edge; g.fillRect(LABEL + s * cw, 0, 1, ROW * 16); }
  for (let i = 0; i < 16; i++) {
    const list = notes[i]; if (!list) continue;
    const melodic = list.some(n => n.pitch !== 0) || i === 8;
    if (melodic) { g.fillStyle = 'rgba(160,160,165,.3)'; g.fillRect(LABEL, i * ROW + 1, w - LABEL, ROW - 3); }
    for (const n of list) {
      g.fillStyle = mixColour(SK.level1, SK.level2, i / 15);
      if (melodic) g.fillRect(LABEL + n.s * cw + 1, i * ROW + ROW * .55, Math.max(2, cw * .8), 2);
      else g.fillRect(LABEL + n.s * cw + 1, i * ROW + 1, cw - 1, ROW - 3);
    }
  }
  if (shownStep >= 0) { g.fillStyle = 'rgba(255,255,255,.75)'; g.fillRect(LABEL + shownStep * cw, 0, 1, ROW * 16); }
}
function drawRoll() {
  const rows = TOPP - BOTP + 1, [g, w] = setup(rollC, rows * RH), cw = (w - KEYW) / STEPS;
  g.fillStyle = '#101113'; g.fillRect(0, 0, w, rows * RH);
  g.font = '10px Helvetica, Arial, sans-serif'; g.textBaseline = 'middle';
  for (let p = TOPP; p >= BOTP; p--) {
    const y = (TOPP - p) * RH, black = isBlack(p);
    if (black) { g.fillStyle = 'rgba(255,255,255,.04)'; g.fillRect(KEYW, y, w - KEYW, RH); }
    g.fillStyle = SK.edge; g.fillRect(KEYW, y, w - KEYW, 1);
    g.fillStyle = black ? '#101113' : '#5e5e5f'; g.fillRect(0, y, KEYW - 1, RH - 1);
    if (!black) { g.fillStyle = p === 0 ? SK.text : '#bdbdc0'; g.textAlign = 'right'; g.fillText(pitchName(p), KEYW - 5, y + RH / 2); g.textAlign = 'left'; }
  }
  for (let s = 0; s <= STEPS; s++) { g.fillStyle = s % 16 === 0 ? '#9c9c9f' : s % 4 === 0 ? '#5e5e5f' : SK.edge; g.fillRect(KEYW + s * cw, 0, 1, rows * RH); }
  g.fillStyle = mixColour(SK.level1, SK.level2, rollPad / 15);
  for (const n of notes[rollPad] || []) { if (n.pitch > TOPP || n.pitch < BOTP) continue; g.fillRect(KEYW + n.s * cw + 1, (TOPP - n.pitch) * RH + 1, cw - 1, RH - 2); }
  if (shownStep >= 0) { g.fillStyle = 'rgba(255,255,255,.75)'; g.fillRect(KEYW + shownStep * cw, 0, 1, rows * RH); }
}
const redraw = () => { drawSeq(); drawRoll(); };
function toggle(pad, s, pitch) { const list = notes[pad] = notes[pad] || [], i = list.findIndex(n => n.s === s && n.pitch === pitch); if (i >= 0) list.splice(i, 1); else { list.push({ s, pitch }); play(pad, undefined, pitch); } redraw(); }
function choose(pad) { rollPad = pad; $('rollname').textContent = PADS[pad][0] || `Pad ${pad + 1}`; if (PADS[pad][1]) play(pad); redraw(); }
seqC.addEventListener('click', e => { const r = seqC.getBoundingClientRect(), x = e.clientX - r.left, y = clamp(Math.floor((e.clientY - r.top) / ROW), 0, 15); if (x < LABEL) return choose(y); if (!PADS[y][1]) return; const s = clamp(Math.floor((x - LABEL) / ((r.width - LABEL) / STEPS)), 0, STEPS - 1); toggle(y, s, 0); });
rollC.addEventListener('click', e => { const r = rollC.getBoundingClientRect(), x = e.clientX - r.left, p = TOPP - Math.floor((e.clientY - r.top) / RH); if (x < KEYW) return play(rollPad, undefined, p); const s = clamp(Math.floor((x - KEYW) / ((r.width - KEYW) / STEPS)), 0, STEPS - 1); toggle(rollPad, s, p); });
addEventListener('resize', redraw); redraw();

let playing = false, nextTime = 0, step = 0, timer = null;
const queue = [];
function setPlaying(on) {
  playing = on;
  $('play').classList.toggle('on', on);
  $('fxplay').textContent = on ? 'Stop the beat' : 'Play the beat';
  if (on) { audio(); nextTime = ctx.currentTime + .06; step = 0; timer = setInterval(schedule, 25); schedule(); wake(); }
  else { clearInterval(timer); shownStep = -1; queue.length = 0; redraw(); }
}
$('play').onclick = () => setPlaying(true);
$('stop').onclick = () => setPlaying(false);
$('fxplay').onclick = () => setPlaying(!playing);
$('tempo').oninput = e => $('bpm').textContent = e.target.value;
$('clear').onclick = () => { notes = {}; redraw(); };
$('reset').onclick = () => { notes = START(); redraw(); };
function schedule() {
  const stepLen = 60 / +$('tempo').value / 4, swing = +$('swing').value / 100;
  while (nextTime < ctx.currentTime + .11) {
    const at = nextTime + (step % 2 ? stepLen * swing * .5 : 0);
    for (let p = 0; p < 16; p++) for (const n of notes[p] || []) if (n.s === step) { play(p, at, n.pitch); queue.push([at, p, step]); if (p === 0) duck(at); }
    queue.push([at, -1, step]);
    nextTime += stepLen; step = (step + 1) % STEPS;
  }
}
function drain() {
  if (!ctx) return;
  while (queue.length && queue[0][0] <= ctx.currentTime) {
    const [at, p, s] = queue.shift();
    if (p >= 0) { hitFrames(p); level = 1; if (p === 0) fxS.sc = 0; }
    else if (s !== shownStep) { shownStep = s; if (onScreen(seqC)) redraw(); }
  }
}

// ---- Effect windows ---------------------------------------------------------------------------------------------------------
const params = new Map(EFFECTS.map(f => [f, f.p.map(q => q.def)]));
{ const r = params.get(EFFECTS[1]); r[0] = 100; r[7] = 18; r[9] = -24; r[10] = 30; r[11] = -12; }
const bands = () => [{ type: 'low', freq: 80, gain: 3, q: .7 }, { type: 'peak', freq: 420, gain: -4, q: 1.2 }, { type: 'peak', freq: 2400, gain: 3, q: 1 }, { type: 'high', freq: 9000, gain: 2, q: .7 }];
let eqBands = bands(), eqChosen = 1;
let fx = EFFECTS[1], fxOn = true, fxNodes = [], fxLfos = [], duckGain = null, fxS = newState();
const card = $('card'), vis = $('cvis'), vg = vis.getContext('2d');
const place = f => EFFECTS.indexOf(f) % 8;
const colours = () => ({ colour: fxOn ? SK.effects[place(fx)] : SK.faint, clipper: SK.clipper, text: SK.text, edge: SK.edge, faint: SK.faint, accent: SK.accent, accentText: SK.accentText });

function curveData(fn) { const a = new Float32Array(1024); for (let i = 0; i < 1024; i++) a[i] = fn(i / 511.5 - 1); return a; }
function impulse(sec, damp) { const len = Math.floor(ctx.sampleRate * Math.min(sec, 6)), b = ctx.createBuffer(2, len, ctx.sampleRate); for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3 + damp * 4); } return b; }
function rebuild() {
  if (!ctx) return;
  fxIn.disconnect(); fxNodes.forEach(n => { try { n.disconnect(); } catch (e) {} }); fxLfos.forEach(o => { try { o.stop(); } catch (e) {} }); fxNodes = []; fxLfos = []; duckGain = null;
  if (!fxOn) { fxIn.connect(fxOut); return; }
  const p = params.get(fx), node = n => { fxNodes.push(n); return n; }, gain = v => { const g = node(ctx.createGain()); g.gain.value = v; return g; };
  const biq = (type, f, q, g = 0) => { const b = node(ctx.createBiquadFilter()); b.type = type; b.frequency.value = f; b.Q.value = q; b.gain.value = g; return b; };
  const lfo = (rate, amount, target) => { const o = ctx.createOscillator(), g = gain(amount); o.frequency.value = rate; o.connect(g); g.connect(target); o.start(); fxLfos.push(o); };
  const mix = m => { const w = gain(m / 100), d = gain(1 - m / 100); fxIn.connect(d); d.connect(fxOut); w.connect(fxOut); return w; };
  switch (fx.k) {
    case 'eq': { let last = fxIn; for (const b of eqBands) { const n = biq(b.type === 'low' ? 'lowshelf' : b.type === 'high' ? 'highshelf' : 'peaking', b.freq, b.q, b.gain); last.connect(n); last = n; } last.connect(fxOut); break; }
    case 'resonance': { const w = mix(p[5]); const a = biq('notch', 700, .5 + p[1] / 8), b = biq('notch', 2600, .5 + p[1] / 8), c = biq('peaking', 180 + p[2] * 8, 2, -p[0] / 9); fxIn.connect(a); a.connect(b); b.connect(c); c.connect(w); break; }
    case 'compressor': { const w = mix(p[5]), c = node(ctx.createDynamicsCompressor()), m = gain(db(p[4])); c.threshold.value = p[0]; c.ratio.value = p[1]; c.attack.value = p[2] / 1000; c.release.value = Math.min(1, p[3] / 1000); fxIn.connect(c); c.connect(m); m.connect(w); break; }
    case 'enveloper': { const w = mix(p[3]), c = node(ctx.createDynamicsCompressor()), h = biq('highshelf', 3000, 1, p[0] / 12), o = gain(db(p[2])); c.threshold.value = -40; c.ratio.value = 1 + Math.max(0, -p[1]) / 12; fxIn.connect(c); c.connect(h); h.connect(o); o.connect(w); break; }
    case 'sidechain': { duckGain = gain(1); const w = mix(p[0]); fxIn.connect(duckGain); duckGain.connect(w); break; }
    case 'distortion': { const k = db(p[0]), t = Math.round(p[1]), fn = [x => x >= 0 ? Math.tanh(x * k) : Math.tanh(.7 * x * k) / .8, x => clamp(x * k, -.7, .7) / .7, x => Math.abs(Math.tanh(x * k)) * 2 - .5, x => Math.sin(x * k * 1.57)][t]; const tone = biq('lowpass', 800 + p[2] * 110, .5), w = mix(p[4]), s = node(ctx.createWaveShaper()), o = gain(db(p[3])); s.curve = curveData(fn); s.oversample = '2x'; fxIn.connect(s); s.connect(tone); tone.connect(o); o.connect(w); break; }
    case 'flanger': { const w = mix(p[4]), d = node(ctx.createDelay(.03)), fb = gain(p[3] / 100); d.delayTime.value = p[2] / 1000; lfo(p[0], p[1] / 100 * .002, d.delayTime); fxIn.connect(d); d.connect(fb); fb.connect(d); d.connect(w); break; }
    case 'phaser': { const w = mix(p[4]); let last = fxIn; for (let i = 0; i < Math.round(p[5]) * 2; i++) { const a = biq('allpass', p[2], 1); lfo(p[0], p[2] * p[1] / 130, a.frequency); last.connect(a); last = a; } last.connect(w); break; }
    case 'rotor': { const w = mix(p[3]), v = gain(1), pan = node(ctx.createStereoPanner()); lfo(.7 + p[0] * .06, p[1] / 100 * .9, pan.pan); lfo(.7 + p[0] * .06, p[2] / 300, v.gain); fxIn.connect(v); v.connect(pan); pan.connect(w); break; }
    case 'delay': { const w = mix(p[4]), d = node(ctx.createDelay(2.1)), fb = gain(p[1] / 100), t = biq('lowpass', 500 + p[2] * 120, .5); d.delayTime.value = p[0] / 1000; fxIn.connect(d); d.connect(t); t.connect(fb); fb.connect(d); t.connect(w); break; }
    case 'stereoDelay': { const w = mix(p[5]), merge = node(ctx.createChannelMerger(2)), t = biq('lowpass', 500 + p[3] * 120, .5); [p[0], p[1]].forEach((ms, i) => { const d = node(ctx.createDelay(2.1)), fb = gain(p[2] / 100); d.delayTime.value = ms / 1000; fxIn.connect(d); d.connect(fb); fb.connect(d); d.connect(merge, 0, i); }); merge.connect(t); t.connect(w); break; }
    case 'reverb': { const w = mix(p[4]), con = node(ctx.createConvolver()), pre = node(ctx.createDelay(.25)), t = biq('lowpass', 12000 - p[2] * 100, .5); pre.delayTime.value = p[3] / 1000; con.buffer = impulse(p[0] * (.5 + p[1] / 100), p[2] / 100); fxIn.connect(pre); pre.connect(con); con.connect(t); t.connect(w); break; }
    case 'softClipper': case 'hardClipper': { const c = db(p[1]), soft = fx.k === 'softClipper', m = soft ? p[3] : p[2], w = mix(m), a = gain(db(p[0])), s = node(ctx.createWaveShaper()); const knee = soft ? clamp(p[2] * .01, .02, 1) : 0; s.curve = curveData(x => { if (!soft) return clamp(x, -c, c); const u = x / c, st = 1 - knee, z = Math.abs(u); if (z <= st) return x; const b = st + knee * Math.tanh((z - st) / knee); return (u < 0 ? -b : b) * c; }); fxIn.connect(a); a.connect(s); s.connect(w); break; }
    case 'limiter': { const a = gain(db(p[0])), c = node(ctx.createDynamicsCompressor()); c.threshold.value = p[1] - 1; c.knee.value = 0; c.ratio.value = 20; c.attack.value = .001; c.release.value = p[2] / 1000; fxIn.connect(a); a.connect(c); c.connect(fxOut); break; }
  }
}
function duck(at) { if (!duckGain) return; const p = params.get(fx), len = p[1] * 60 / +$('tempo').value / 4, steps = 24; duckGain.gain.cancelScheduledValues(at); for (let i = 0; i <= steps; i++) duckGain.gain.setValueAtTime(1 - sidechainCurve(Math.round(p[2]), i / steps), at + len * i / steps); }

// Knobs as in Knob.h: the dial, the reached arc, the cap and its pointer.
const arc = (r, a0, a1, c) => { const pt = d => [19 + r * Math.sin(d), 20 - r * Math.cos(d)], s = pt(a0), e = pt(a1), large = a1 - a0 > Math.PI ? 1 : 0; return `<path d="M${s[0]} ${s[1]}A${r} ${r} 0 ${large} 1 ${e[0]} ${e[1]}" fill="none" stroke="${c}" stroke-width="2.5"/>`; };
function dial(share) { const st = -Math.PI * .75, en = Math.PI * .75, a = st + share * (en - st), r = 17.5, cap = 13, tip = r - 5.5; return `<svg viewBox="0 0 38 38" aria-hidden="true">${arc(r, st, en, '#3d3e42')}${share > .001 ? arc(r, st, a, 'var(--c)') : ''}<circle cx="19" cy="20" r="${cap}" fill="url(#capg)"/><circle cx="19" cy="20" r="${cap - .5}" fill="none" stroke="rgba(255,255,255,.05)"/><g transform="rotate(${a * 180 / Math.PI} 19 20)"><rect x="18" y="${20 - tip}" width="2" height="${r * .5}" fill="#fff"/></g></svg>`; }
const unitText = (v, u) => { const d = Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : 2, t = (+v).toFixed(d); return u ? t + (u !== ':1' ? ' ' : '') + u : t; };
function cell(name, unit, min, max, get, set, step = 0) {
  const el = document.createElement('div'); el.className = 'cell';
  const paint = () => { el.querySelector('svg').outerHTML = dial(clamp((get() - min) / (max - min), 0, 1)); };
  el.innerHTML = dial(clamp((get() - min) / (max - min), 0, 1)) + `<b>${name}</b>`;
  const label = el.querySelector('b');
  let from = 0, startY = 0, on = false, later = null;
  el.addEventListener('pointerdown', e => { e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch (x) {} on = true; from = get(); startY = e.clientY; el.classList.add('held'); label.textContent = unitText(get(), unit); audio(); });
  el.addEventListener('pointermove', e => { if (!on) return; let v = from - (e.clientY - startY) / 200 * (max - min); if (step) v = Math.round(v / step) * step; set(clamp(v, min, max)); paint(); label.textContent = unitText(get(), unit); $('csum').textContent = summary(fx.k, params.get(fx)); clearTimeout(later); later = setTimeout(rebuild, fx.k === 'reverb' ? 160 : 40); });
  const end = () => { if (!on) return; on = false; el.classList.remove('held'); label.textContent = name; };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  return el;
}
function buildCells() {
  const box = $('ccells'); box.innerHTML = '';
  if (fx.k === 'eq') {
    const b = eqBands[eqChosen];
    box.appendChild(cell('Freq', 'Hz', 20, 20000, () => b.freq, v => b.freq = v));
    box.appendChild(cell('Gain', 'dB', -18, 18, () => b.gain, v => b.gain = v));
    box.appendChild(cell('Q', '', .3, 6, () => b.q, v => b.q = v));
    return;
  }
  const p = params.get(fx);
  fx.p.forEach((q, i) => { if (!q.hidden) box.appendChild(cell(q.name, q.unit, q.min, q.max, () => p[i], v => p[i] = v, q.step)); });
}
function chooseFx(f) { fx = f; fxS = newState(); card.style.setProperty('--c', fxOn ? SK.effects[place(f)] : SK.faint); $('cname').textContent = f.n; $('csum').textContent = summary(f.k, params.get(f)); buildCells(); rebuild(); }
chips($('fxlist'), EFFECTS.map(f => f.n), 1, i => chooseFx(EFFECTS[i]));
document.body.insertAdjacentHTML('beforeend', '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><linearGradient id="capg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#47474c"/><stop offset="1" stop-color="#1a1a1d"/></linearGradient></defs></svg>');
$('cpower').onclick = () => { fxOn = !fxOn; card.classList.toggle('off', !fxOn); card.style.setProperty('--c', fxOn ? SK.effects[place(fx)] : SK.faint); rebuild(); };
$('creset').onclick = () => { params.set(fx, fx.p.map(q => q.def)); if (fx.k === 'eq') eqBands = bands(); chooseFx(fx); };
$('cfold').onclick = () => { card.classList.toggle('fold'); };
let dragging = -1;
vis.addEventListener('pointerdown', e => {
  const r = vis.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
  if (fx.k === 'resonance') { const p = params.get(fx); let best = -1, near = 18; for (let n = 0; n < 6; n++) { const q = resonanceNode(p, n, r.width, r.height), d = Math.hypot(q[0] - x, q[1] - y); if (d < near) { near = d; best = n; } } dragging = best; fxS.node = best; }
  if (fx.k === 'eq') { let best = -1, near = 22; eqBands.forEach((b, i) => { const d = Math.hypot(eqX(b.freq, r.width) - x, eqY(b.gain, r.height) - y); if (d < near) { near = d; best = i; } }); dragging = best; if (best >= 0) { eqChosen = best; buildCells(); } }
  if (dragging >= 0) { try { vis.setPointerCapture(e.pointerId); } catch (x2) {} e.preventDefault(); audio(); }
});
vis.addEventListener('pointermove', e => {
  if (dragging < 0) return;
  const r = vis.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
  if (fx.k === 'resonance') setResonanceNode(params.get(fx), dragging, x, y, r.width, r.height);
  else { eqBands[dragging].freq = eqF(x, r.width); eqBands[dragging].gain = eqG(y, r.height); buildCells(); rebuild(); }
});
const endDrag = () => { dragging = -1; }; vis.addEventListener('pointerup', endDrag); vis.addEventListener('pointercancel', endDrag);
chooseFx(fx);

function drawCard(dt) {
  const dpr = Math.min(2, devicePixelRatio || 1), w = vis.clientWidth, h = vis.clientHeight;
  if (!w) return;
  if (vis.width !== Math.round(w * dpr)) { vis.width = Math.round(w * dpr); vis.height = Math.round(h * dpr); }
  vg.setTransform(dpr, 0, 0, dpr, 0, 0); vg.clearRect(0, 0, w, h);
  const p = params.get(fx);
  const spectrum = new Float32Array(48); for (let i = 0; i < 48; i++) spectrum[i] = visual.barAt(i / 47) * .92;
  fxS.sc = Math.min(1, fxS.sc + dt / Math.max(.05, (p[1] || 4) * 60 / +$('tempo').value / 4));
  if (!fxS.lastLevel || level > fxS.lastLevel + .4) fxS.sc = 0;
  fxS.lastLevel = level;
  if (fx.k === 'eq') { paintEq(vg, w, h, eqBands, eqChosen, spectrum, fxOn, colours()); return; }
  stepState(fxS, fx.k, p, dt, level * .95, spectrum);
  paintEffect(vg, w, h, fx.k, p, fxS, fxOn, colours());
}

// ---- Output display -----------------------------------------------------------------------------------------------------------
const visual = new Visual(), man = $('man'), mg = man.getContext('2d'), pic = $('vis'), pg = pic.getContext('2d');
let vStyle = 0, vClip = -1, clipData = null, danceData = null, dance = 7, beatNow = 0;
$('vdance').innerHTML = DANCES.map((d, i) => `<option${i === 7 ? ' selected' : ''}>${d}</option>`).join('');
$('vdance').onchange = e => dance = e.target.selectedIndex;
$('vstyle').onchange = async e => { const i = e.target.selectedIndex; if (i < 4) { vStyle = i; vClip = -1; } else { vClip = i - 5; clipData = await loadBin(CLIPS[vClip]); } };
const col = t => mixColour(SK.level1, SK.level2, t);
function drawOutput() {
  const dpr = Math.min(2, devicePixelRatio || 1);
  for (const c of [pic, man]) { const w = c.clientWidth, h = c.clientHeight; if (c.width !== Math.round(w * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); } }
  pg.setTransform(dpr, 0, 0, dpr, 0, 0); pg.clearRect(0, 0, pic.clientWidth, pic.clientHeight);
  if (vClip >= 0 && clipData) paintClip(pg, pic.clientWidth, pic.clientHeight, clipData, beatNow, col);
  else visual.paint(pg, pic.clientWidth, pic.clientHeight, vStyle, +$('vsize').value, col);
  mg.setTransform(dpr, 0, 0, dpr, 0, 0); mg.clearRect(0, 0, man.clientWidth, man.clientHeight);
  if (danceData) paintDancer(mg, man.clientWidth, man.clientHeight, danceData, dance, beatNow, '#E8E9EB');
}
loadBin('dancers').then(d => danceData = d);

// ---- The one clock of all that moves ----------------------------------------------------------------------------------------
let last = performance.now(), running = false, idleBeat = 0, idleNext = 0;
function wake() { if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); } }
function loop(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  drain();
  const cardSeen = onScreen(card), outSeen = onScreen($('outp')), bpm = +$('tempo').value;
  if (!playing && !still) { idleBeat += dt * bpm / 60; beatNow = idleBeat; const q = Math.floor(idleBeat * 2); if (q !== idleNext) { idleNext = q; if (q % 2 === 0 || q % 8 === 3) level = q % 4 === 0 ? 1 : .6; } }
  else if (playing) { idleBeat += dt * bpm / 60; beatNow = idleBeat; }
  level *= Math.exp(-dt / .16);
  if (cardSeen || outSeen) visual.step(dt, playing && analyser ? analyser : null, freq, wave, level, now / 1000);
  if (cardSeen) drawCard(dt);
  if (outSeen) drawOutput();
  if (playing || cardSeen || outSeen) requestAnimationFrame(loop);
  else running = false;
}
const nearby = new IntersectionObserver(l => { if (l.some(e => e.isIntersecting)) wake(); }, { rootMargin: '60px' });
nearby.observe(card); nearby.observe($('outp'));
