// What moves on the page besides the machines at the top. It plays no sound.
import { Visual, CLIPS, DANCES, loadBin, paintClip, paintDancer, mixColour, clamp } from './live.js';
const $ = id => document.getElementById(id);
const still = matchMedia('(prefers-reduced-motion:reduce)').matches;
const onScreen = el => { const r = el.getBoundingClientRect(); return r.bottom > -40 && r.top < innerHeight + 40; };
const SK = { level1: '#58B3A1', level2: '#8A80C4', text: '#E1E1E4', edge: '#2B2C30' };
const TEMPO = 134;

// ---- Headings come out of big pixels as you scroll ---------------------------------------------------------------------------
const heads = [...document.querySelectorAll('h2')].map(h => {
  const words = h.textContent.trim().split(/\s+/);
  h.innerHTML = words.map(w => `<span class="w">${w}</span>`).join(' ');
  const c = document.createElement('canvas'); h.appendChild(c);
  return { h, c, g: c.getContext('2d'), spans: [...h.querySelectorAll('.w')], low: document.createElement('canvas'), last: -1 };
});
function pixelHead(o, p) {
  const { h, c, g, spans, low } = o, e = 1 - Math.pow(1 - p, 2.2), block = Math.max(1, Math.round((1 - e) * 30));
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
  if ('fontStretch' in l) l.fontStretch = 'expanded';
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
  heads.forEach(o => { const r = o.h.getBoundingClientRect(); if (r.bottom < -100 || r.top > vh + 100) return; pixelHead(o, clamp((vh * .94 - r.top) / (vh * .26), 0, 1)); });
}
addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(moveHeads); } }, { passive: true });
addEventListener('resize', () => { heads.forEach(o => { o.last = -1; o.c.style.display = 'none'; }); moveHeads(); });
moveHeads(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(moveHeads);
const seenUp = new IntersectionObserver(l => l.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); seenUp.unobserve(e.target); } }), { threshold: .08 });
document.querySelectorAll('.up').forEach(e => seenUp.observe(e));

// ---- Full screen pictures -------------------------------------------------------------------------------------------------
const box = $('box'), bimg = $('bimg'), bcap = $('bcap');
let list = [], at = 0;
function showAt(i) { at = (i + list.length) % list.length; bimg.src = list[at].src; bimg.alt = list[at].name; bcap.textContent = list[at].name; $('bdesc').textContent = list[at].text || ''; box.classList.toggle('text', !!list[at].text); [list.forEach((x, k) => { if (Math.abs(k - at) === 1) new Image().src = x.src; })]; }
function openBox(items, i) { list = items; showAt(i); box.classList.add('on'); document.documentElement.style.overflow = 'hidden'; if (!items[i].text && box.requestFullscreen && matchMedia('(pointer:fine)').matches) box.requestFullscreen().catch(() => {}); }
function closeBox() { box.classList.remove('on'); document.documentElement.style.overflow = ''; if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); }
$('bx').onclick = closeBox; $('bp').onclick = () => showAt(at - 1); $('bn').onclick = () => showAt(at + 1);
box.addEventListener('click', e => { if (e.target === box) closeBox(); });
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && box.classList.contains('on')) closeBox(); });
addEventListener('keydown', e => { if (!box.classList.contains('on')) return; if (e.key === 'Escape') closeBox(); if (e.key === 'ArrowLeft') showAt(at - 1); if (e.key === 'ArrowRight') showAt(at + 1); });
let swipe = null;
box.addEventListener('touchstart', e => { swipe = e.touches[0].clientX; }, { passive: true });
box.addEventListener('touchend', e => { if (swipe === null) return; const d = e.changedTouches[0].clientX - swipe; swipe = null; if (Math.abs(d) > 50) showAt(at + (d < 0 ? 1 : -1)); }, { passive: true });

$('skins').addEventListener('click', e => {
  const f = e.target.closest('figure'); if (!f) return;
  const figs = [...$('skins').children];
  openBox(figs.map(x => ({ src: 'skins/' + x.querySelector('img').getAttribute('src').split('/').pop(), name: x.querySelector('figcaption').textContent })), figs.indexOf(f));
});

// ---- Effect windows, lying about like cards ----------------------------------------------------------------------------------
const FX = [
  ['eq', 'EQ', 'Shape your tone by dragging bands right in the curve, with the sound moving behind it.'],
  ['resonance', 'Resonance Suppressor', 'Finds harsh resonances and pulls them down as they ring. Draw where it should work harder, and use Delta to hear what it takes out.'],
  ['compressor', 'Compressor', 'Evens out the level. The curve shows your settings, and the dot and the bar show how hard it is working right now.'],
  ['enveloper', 'Enveloper', 'Reshapes every hit: more or less attack, and a longer or shorter ring-out.'],
  ['sidechain', 'Sidechain', 'Ducks the sound on every trigger, with eight curves to choose from. It can work on the bass alone.'],
  ['distortion', 'Distortion', 'Four kinds of dirt, from warm to rude: Overdrive, Fuzz, Rectifier and Foldback.'],
  ['flanger', 'Flanger', 'A sweeping comb of notches. You watch them slide across the sound as the delay moves.'],
  ['phaser', 'Phaser', 'One to six moving notches that sweep through the sound, drawn as they happen.'],
  ['rotor', 'Rotor Cabinet', 'The horn and drum of a rotary speaker, spinning slow or fast.'],
  ['delay', 'Delay', 'Echoes of up to two seconds, with feedback and tone. Each bar is an echo.'],
  ['stereo_delay', 'Stereo Delay', 'Left and right each get a time of their own, with feedback, tone and crossfeed.'],
  ['reverb', 'Reverb', 'Space with up to 12 seconds of decay, plus size, damping and predelay.'],
  ['soft_clipper', 'Soft Clipper', 'Rounds off the peaks at the ceiling for a warmer kind of loud.'],
  ['hard_clipper', 'Hard Clipper', 'Cuts the peaks flat at the ceiling, for loudness with an edge.'],
  ['limiter', 'Limiter', 'Holds your level under the ceiling. Red shows what goes over, and the bar how much is held back.'],
];
const fxItems = FX.map(([k, n, text]) => ({ src: `fx/${k}.jpg`, name: n, text }));
const pile = $('pile');
pile.innerHTML = FX.map(([k, n], i) => `<button class="fxc" data-i="${i}" aria-label="${n}"><img src="fx/${k}.jpg" alt="${n} window" loading="lazy"></button>`).join('');
pile.addEventListener('click', e => { const c = e.target.closest('.fxc'); if (c) openBox(fxItems, +c.dataset.i); });
const noise = i => { const v = Math.sin(i * 12.9898 + 4.1) * 43758.5453; return v - Math.floor(v); };
function layPile() {
  const w = pile.clientWidth, narrow = w < 620, cols = narrow ? 3 : 5, rows = Math.ceil(15 / cols), cw = w * (narrow ? .54 : .3), ch = cw * .4;
  const height = narrow ? rows * ch * 1.02 + ch * 1.5 : rows * ch * 1.42 + ch * 1.1;
  pile.style.setProperty('--ph', Math.round(height) + 'px');
  pile.style.setProperty('--cw', Math.round(cw) + 'px');
  [...pile.children].forEach((c, i) => {
    const q = i % cols, r = Math.floor(i / cols), gx = (w - cw) / Math.max(1, cols - 1), gy = (height - ch * 1.6) / Math.max(1, rows - 1);
    c.style.setProperty('--x', Math.round(q * gx + (noise(i) - .5) * cw * .1) + 'px');
    c.style.setProperty('--y', Math.round(r * gy + (noise(i + 40) - .5) * ch * .22 + (q % 2 ? ch * .2 : 0)) + 'px');
    c.style.setProperty('--r', ((noise(i + 80) - .5) * 15).toFixed(1) + 'deg');
    c.style.setProperty('--sx', Math.round((w - cw) / 2) + 'px');
    c.style.setProperty('--sy', Math.round((height - ch) / 2) + 'px');
    c.style.setProperty('--sr', ((noise(i + 20) - .5) * 8).toFixed(1) + 'deg');
    c.style.zIndex = 1 + Math.floor(noise(i + 7) * 20);
    c.style.transitionDelay = pile.classList.contains('in') ? '0s' : `${i * .025}s`;
  });
}
layPile(); addEventListener('resize', layPile);
new IntersectionObserver((l, o) => { if (l[0].isIntersecting) { pile.classList.add('in'); o.disconnect(); setTimeout(() => [...pile.children].forEach(c => c.style.transitionDelay = '0s'), 1500); } }, { threshold: .18 }).observe(pile);

const hues = ['Red','Orange','Yellow','Green','Blue','Violet'], colourItems = hues.map((n, i) => ({ src: `fx/colour_${i + 1}.jpg`, name: n }));
$('fan').innerHTML = hues.map((n, i) => `<div><img src="fx/colour_${i + 1}.jpg" alt="An effect window in ${n.toLowerCase()}" data-i="${i}" loading="lazy"></div>`).join('');
$('fan').addEventListener('click', e => { if (e.target.dataset.i !== undefined) openBox(colourItems, +e.target.dataset.i); });

// ---- The real pad page, in frames ---------------------------------------------------------------------------------------------
const hitFrames = pad => ['padframe', 'ftall', 'fwide'].map($).forEach(f => { if (onScreen(f) && f.contentWindow) f.contentWindow.postMessage({ hit: pad }, '*'); });
const chips = (el, names, chosen, pick) => { el.innerHTML = names.map((n, i) => `<button class="${i === chosen ? 'on' : ''}">${n}</button>`).join(''); [...el.children].forEach((b, i) => b.onclick = () => { [...el.children].forEach(c => c.classList.remove('on')); b.classList.add('on'); pick(i); }); };
chips($('animchips'), ['Orbit','Ripple','Sparks','Meter','Dither','Scan'], 5, i => $('padframe').contentWindow.postMessage({ anim: i }, '*'));
const PSK = [['3d_graphit','Graphite'],['3d_camouflage','Camo'],['3d_steel','Steel'],['3d_kawaii','Kawaii'],['3d_petrol','Petrol'],['3d_clear','Clear']];
chips($('padskins'), PSK.map(s => s[1]), 0, i => $('padframe').contentWindow.postMessage({ skin: PSK[i][0] }, '*'));
const KEYS = ['5','6','7','8','R','T','Z','U','F','G','H','J','C','V','B','N'];
addEventListener('keydown', e => { if (e.repeat || e.metaKey || e.ctrlKey || box.classList.contains('on') || !onScreen($('padframe'))) return; const i = KEYS.indexOf(e.key.toUpperCase()); if (i >= 0) hitFrames(i); });
function fitFrames() {
  $('ftall').style.transform = `scale(${$('ptall').clientWidth / 393})`;
  $('fwide').style.transform = `scale(${$('pwide').clientWidth / 852})`;
  $('padframe').style.transform = `scale(${$('padwrap').clientWidth / 480})`;
}
addEventListener('resize', fitFrames); fitFrames();

// ---- Sequencer and piano roll: tracks that live in the roll are left alone in the grid --------------------------------------------
const NAMES = ['Kick','FX','Perc','808','Snare','Vox','Rim','Snare 2','Closed Hat','FX 2','Open Hat','Crash','Chop','Vox 2','Vox 3','Perc 2'];
const STEPS = 32;
const notes = (() => { const n = {}; const add = (p, list, pitch = 0) => (n[p] = n[p] || []).push(...list.map(s => ({ s, pitch })));
  add(0, [0, 10, 16, 26]); add(3, [0, 6, 16, 22], -12); add(4, [8, 24]); add(7, [8, 24]);
  add(8, Array.from({ length: 32 }, (_, i) => i)); add(10, [6, 14, 22, 30]); add(11, [0]); add(14, [4, 20], 3); add(12, [12, 28]);
  return n; })();
const INROLL = new Set([3, 8, 14]);
let rollPad = 0, shownStep = -1;
const seqC = $('seq'), rollC = $('roll');
const ROW = 25.5, LABEL = 96, RH = 12, KEYW = 44, TOPP = 14, BOTP = -19;
function setup(c, h) { const dpr = Math.min(2, devicePixelRatio || 1), w = c.clientWidth; if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); c.style.height = h + 'px'; } const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); return [g, w]; }
const pitchName = p => ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][(60 + p) % 12] + (Math.floor((60 + p) / 12) - 1);
const isBlack = p => [1,3,6,8,10].includes((60 + p) % 12);
function drawSeq() {
  const [g, w] = setup(seqC, ROW * 16), cw = (w - LABEL) / STEPS;
  g.fillStyle = '#101113'; g.fillRect(0, 0, w, ROW * 16);
  g.font = '11px Helvetica, Arial, sans-serif'; g.textBaseline = 'middle';
  for (let i = 0; i < 16; i++) {
    const y = i * ROW;
    if (i === rollPad) { g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(0, y, LABEL, ROW); }
    g.fillStyle = SK.text; g.fillText(KEYS[i], 7, y + ROW / 2 + .5);
    g.fillStyle = 'rgba(232,233,235,.88)'; g.fillText(NAMES[i].toUpperCase(), 24, y + ROW / 2 + .5);
    g.fillStyle = SK.edge; g.fillRect(LABEL, y + ROW - 1, w - LABEL, 1);
  }
  for (let s = 0; s <= STEPS; s++) { g.fillStyle = s % 16 === 0 ? '#9c9c9f' : s % 4 === 0 ? '#5e5e5f' : SK.edge; g.fillRect(LABEL + s * cw, 0, 1, ROW * 16); }
  for (let i = 0; i < 16; i++) {
    const inRoll = INROLL.has(i), list = notes[i] || [];
    if (inRoll) { g.fillStyle = 'rgba(160,160,165,.3)'; g.fillRect(LABEL, i * ROW + 1, w - LABEL, ROW - 3); }
    g.fillStyle = mixColour(SK.level1, SK.level2, i / 15);
    for (const n of list) { if (inRoll) g.fillRect(LABEL + n.s * cw + 1, i * ROW + ROW * .55, Math.max(2, cw * .8), 2); else g.fillRect(LABEL + n.s * cw + 1, i * ROW + 1, cw - 1, ROW - 3); }
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
function toggle(pad, s, pitch) { const l = notes[pad] = notes[pad] || [], i = l.findIndex(n => n.s === s && n.pitch === pitch); if (i >= 0) l.splice(i, 1); else l.push({ s, pitch }); redraw(); }
seqC.addEventListener('click', e => {
  const r = seqC.getBoundingClientRect(), x = e.clientX - r.left, y = clamp(Math.floor((e.clientY - r.top) / ROW), 0, 15);
  if (x < LABEL) { rollPad = y; $('rollname').textContent = NAMES[y]; redraw(); return; }
  if (INROLL.has(y)) return;
  toggle(y, clamp(Math.floor((x - LABEL) / ((r.width - LABEL) / STEPS)), 0, STEPS - 1), 0);
});
seqC.addEventListener('mousemove', e => { const r = seqC.getBoundingClientRect(), x = e.clientX - r.left, y = Math.floor((e.clientY - r.top) / ROW); seqC.style.cursor = x < LABEL || !INROLL.has(y) ? 'pointer' : 'default'; });
rollC.addEventListener('click', e => { const r = rollC.getBoundingClientRect(), x = e.clientX - r.left, p = TOPP - Math.floor((e.clientY - r.top) / RH); if (x < KEYW) return; toggle(rollPad, clamp(Math.floor((x - KEYW) / ((r.width - KEYW) / STEPS)), 0, STEPS - 1), p); });
addEventListener('resize', redraw); redraw();

// ---- Output display and the dancing man -------------------------------------------------------------------------------------------
const visual = new Visual(), man = $('man'), mg = man.getContext('2d'), pic = $('vis'), pg = pic.getContext('2d');
let vStyle = 0, vClip = -1, clipData = null, danceData = null, dance = 7, beat = 0, level = 0;
$('vdance').innerHTML = DANCES.map((d, i) => `<option${i === 7 ? ' selected' : ''}>${d}</option>`).join('');
$('vdance').onchange = e => dance = e.target.selectedIndex;
$('vstyle').onchange = async e => { const i = e.target.selectedIndex; if (i < 4) { vStyle = i; vClip = -1; } else { vClip = i - 4; clipData = null; const data = await loadBin(CLIPS[vClip]); if (vClip === i - 4) clipData = data; } };
const col = t => mixColour(SK.level1, SK.level2, t);
function fitCanvas(c) { const dpr = Math.min(2, devicePixelRatio || 1), w = c.clientWidth, h = c.clientHeight; if (c.width !== Math.round(w * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); } return dpr; }
function drawOutput() {
  const dpr = fitCanvas(pic);
  pg.setTransform(dpr, 0, 0, dpr, 0, 0); pg.clearRect(0, 0, pic.clientWidth, pic.clientHeight);
  if (vClip >= 0 && clipData) paintClip(pg, pic.clientWidth, pic.clientHeight, clipData, beat, col);
  else if (vClip < 0) visual.paint(pg, pic.clientWidth, pic.clientHeight, vStyle, 3, col);
}
function drawMan() {
  const dpr = fitCanvas(man);
  mg.setTransform(dpr, 0, 0, dpr, 0, 0); mg.clearRect(0, 0, man.clientWidth, man.clientHeight);
  if (danceData) paintDancer(mg, man.clientWidth, man.clientHeight, danceData, dance, beat, '#E8E9EB');
}
loadBin('dancers').then(d => danceData = d);

// ---- The one clock of all that moves --------------------------------------------------------------------------------------------
let last = performance.now(), lastStep = -1;
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (still) { if (lastStep < 0) { lastStep = 0; drawOutput(); drawMan(); } return; }
  const seqSeen = onScreen($('daw')), padSeen = onScreen($('padframe')), outSeen = onScreen($('outp')), manSeen = onScreen(man);
  if (!seqSeen && !padSeen && !outSeen && !manSeen && !onScreen($('ptall'))) return;
  beat += dt * TEMPO / 60;
  const step = Math.floor(beat * 4) % STEPS;
  if (step !== lastStep) {
    lastStep = step;
    for (let p = 0; p < 16; p++) for (const n of notes[p] || []) if (n.s === step) { if (p !== 8) hitFrames(p); if (p === 0 || p === 4) level = 1; else level = Math.max(level, .35); }
    if (seqSeen) { shownStep = step; redraw(); }
  }
  level *= Math.exp(-dt / .16);
  if (outSeen) { visual.step(dt, null, null, null, level, now / 1000); drawOutput(); }
  if (manSeen) drawMan();
}
requestAnimationFrame(loop);
