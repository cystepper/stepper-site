// What moves on the page besides the machines at the top. It plays no sound.
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const $ = id => document.getElementById(id);
const still = matchMedia('(prefers-reduced-motion:reduce)').matches;
const onScreen = el => { const r = el.getBoundingClientRect(); return r.bottom > -40 && r.top < innerHeight + 40; };
const SK = { level1: '#58B3A1', level2: '#8A80C4', text: '#E1E1E4', edge: '#2B2C30' };
const TEMPO = 134;

// ---- Headings and texts fade in as you scroll to them --------------------------------------------------------------------------
document.querySelectorAll('h2').forEach(h => h.classList.add('up'));
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
  ['resonance_suppressor', 'Resonance Suppressor', 'Finds harsh resonances and pulls them down as they ring. Draw where it should work harder, and use Delta to hear what it takes out.'],
  ['compressor', 'Compressor', 'Evens out the level. The curve shows your settings, and the dot and the bar show how hard it is working right now.'],
  ['enveloper', 'Enveloper', 'Reshapes every hit: more or less attack, and a longer or shorter ring-out.'],
  ['sidechain', 'Sidechain', 'Ducks the sound on every trigger, with eight curves to choose from. It can work on the bass alone.'],
  ['distortion', 'Distortion', 'Four kinds of dirt, from warm to rude: Overdrive, Fuzz, Rectifier and Foldback.'],
  ['flanger', 'Flanger', 'A sweeping comb of notches. You watch them slide across the sound as the delay moves.'],
  ['phaser', 'Phaser', 'One to six moving notches that sweep through the sound, drawn as they happen.'],
  ['rotor_cabinet', 'Rotor Cabinet', 'The horn and drum of a rotary speaker, spinning slow or fast.'],
  ['delay', 'Delay', 'Echoes of up to two seconds, with feedback and tone. Each bar is an echo.'],
  ['stereo_delay', 'Stereo Delay', 'Left and right each get a time of their own, with feedback, tone and crossfeed.'],
  ['reverb', 'Reverb', 'Space with up to 12 seconds of decay, plus size, damping and predelay.'],
  ['soft_clipper', 'Soft Clipper', 'Rounds off the peaks at the ceiling for a warmer kind of loud.'],
  ['hard_clipper', 'Hard Clipper', 'Cuts the peaks flat at the ceiling, for loudness with an edge.'],
  ['limiter', 'Limiter', 'Holds your level under the ceiling. Red shows what goes over, and the bar how much is held back.'],
];
const fxItems = FX.map(([k, n, text]) => ({ src: `fx/${k}.webp?v=5`, name: n, text }));
const pile = $('pile');
pile.innerHTML = FX.map(([k, n], i) => `<button class="fxc" data-i="${i}" aria-label="${n}"><img src="fx/${k}.webp?v=5" alt="${n} window" loading="lazy"></button>`).join('');
pile.addEventListener('click', e => { const c = e.target.closest('.fxc'); if (c) openBox(fxItems, +c.dataset.i); });
const noise = i => { const v = Math.sin(i * 12.9898 + 4.1) * 43758.5453; return v - Math.floor(v); };
function layPile() {
  const w = pile.clientWidth, narrow = w < 620, cols = narrow ? 3 : 5, rows = Math.ceil(15 / cols), cw = w * (narrow ? .54 : .3), ch = cw * .64;
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

// The same window six times along an arc, with the colours travelling through all of them.
const hues = ['Red','Orange','Yellow','Green','Blue','Violet'], colourItems = hues.map((n, i) => ({ src: `fx/colour_${i + 1}.jpg?v=4`, name: n }));
const fan = $('fan');
fan.innerHTML = hues.map((n, i) => `<button class="fc" data-i="${i}" aria-label="An effect window in many colors">${hues.map((c, k) => `<img src="fx/colour_${k + 1}.jpg?v=4" alt="" class="${k === i ? 'on' : ''}">`).join('')}</button>`).join('');
fan.addEventListener('click', e => { const c = e.target.closest('.fc'); if (c) openBox(colourItems, (+c.dataset.i + colourTick) % 6); });
function layFan() {
  const w = fan.clientWidth, narrow = w < 620, cw = w * (narrow ? .44 : .3), ch = cw * .64, step = cw * (narrow ? .26 : .46);
  fan.style.setProperty('--fw', Math.round(cw) + 'px');
  let lowest = 0;
  [...fan.children].forEach((c, i) => {
    const q = i - 2.5, y = q * q * cw * (narrow ? .05 : .042);
    lowest = Math.max(lowest, y);
    c.style.setProperty('--x', Math.round(q * step) + 'px');
    c.style.setProperty('--y', Math.round(y) + 'px');
    c.style.setProperty('--r', (q * 4.2).toFixed(1) + 'deg');
    c.style.zIndex = 20 - Math.round(Math.abs(q) * 2);
  });
  fan.style.setProperty('--fh', Math.round(lowest + ch + cw * .1) + 'px');
}
layFan(); addEventListener('resize', layFan);
let colourTick = 0;
setInterval(() => {
  if (still || !onScreen(fan)) return;
  colourTick = (colourTick + 1) % 6;
  [...fan.children].forEach((c, i) => [...c.children].forEach((img, k) => img.classList.toggle('on', k === (i + colourTick) % 6)));
}, 1500);

// ---- The real pad page, in frames ---------------------------------------------------------------------------------------------
const hitFrames = pad => ['padframe', 'ftall', 'fwide'].map($).forEach(f => { if (onScreen(f) && f.contentWindow) f.contentWindow.postMessage({ hit: pad }, '*'); });
const chips = (el, names, chosen, pick) => { el.innerHTML = names.map((n, i) => `<button class="${i === chosen ? 'on' : ''}">${n}</button>`).join(''); [...el.children].forEach((b, i) => b.onclick = () => { [...el.children].forEach(c => c.classList.remove('on')); b.classList.add('on'); pick(i); }); };
chips($('animchips'), ['Orbit','Ripple','Sparks','Meter','Dither','Scan'], 5, i => $('padframe').contentWindow.postMessage({ anim: i }, '*'));
const PSK = [['3d_graphit','Graphite'],['3d_camouflage','Camo'],['3d_steel','Steel'],['3d_kawaii','Lollipop'],['3d_petrol','Petrol']];
chips($('padskins'), PSK.map(s => s[1]), 0, i => $('padframe').contentWindow.postMessage({ skin: PSK[i][0] }, '*'));
const KEYS = ['5','6','7','8','R','T','Z','U','F','G','H','J','C','V','B','N'];
addEventListener('keydown', e => { if (e.repeat || e.metaKey || e.ctrlKey || box.classList.contains('on') || !onScreen($('padframe'))) return; const i = KEYS.indexOf(e.key.toUpperCase()); if (i >= 0) hitFrames(i); });
function fitFrames() {
  $('ftall').style.transform = `scale(${$('ptall').clientWidth / 393})`;
  $('fwide').style.transform = `scale(${$('pwide').clientWidth / 852})`;
  $('padframe').style.transform = `scale(${$('padwrap').clientWidth / 480})`;
}
addEventListener('resize', fitFrames); fitFrames();

// The two phones go through the skins by themselves, and the piano plays a little.
const PHONE_SKINS = ['3d_camouflage', '3d_petrol', '3d_kawaii', '3d_graphit', '3d_steel'];
let phoneSkin = 0;
setInterval(() => {
  if (still || !onScreen($('ptall'))) return;
  phoneSkin = (phoneSkin + 1) % PHONE_SKINS.length;
  const boxes = [$('ptall'), $('pwide')];
  boxes.forEach(b => b.classList.add('swap'));
  setTimeout(() => { [$('ftall'), $('fwide')].forEach(f => f.contentWindow && f.contentWindow.postMessage({ skin: PHONE_SKINS[phoneSkin] }, '*')); }, 280);
  setTimeout(() => boxes.forEach(b => b.classList.remove('swap')), 620);
}, 4800);
const TUNE = [0, 2, 3, 5, 9, 5, 3, 2, 7, 9, 10, 12, 9, 7, 5, 3];
let tuneAt = 0, tuneDown = -1;
setInterval(() => {
  if (still || !onScreen($('pwide'))) return;
  const w = $('fwide').contentWindow; if (!w) return;
  if (tuneDown >= 0) w.postMessage({ key: tuneDown, down: false }, '*');
  tuneDown = TUNE[tuneAt++ % TUNE.length];
  w.postMessage({ key: tuneDown, down: true }, '*');
}, 300);

// ---- The beat the pads above play along to ----------------------------------------------------------------------------------
let beat = 0;
const NAMES = ['Kick','FX','Perc','808','Snare','Vox','Rim','Snare 2','Closed Hat','FX 2','Open Hat','Crash','Chop','Vox 2','Vox 3','Perc 2'];
const STEPS = 32;
const notes = (() => { const n = {}; const add = (p, list, pitch = 0) => (n[p] = n[p] || []).push(...list.map(s => ({ s, pitch })));
  add(0, [0, 10, 16, 26]); add(3, [0, 6, 16, 22], -12); add(4, [8, 24]); add(7, [8, 24]);
  add(8, Array.from({ length: 32 }, (_, i) => i)); add(10, [6, 14, 22, 30]); add(11, [0]); add(14, [4, 20], 3); add(12, [12, 28]);
  return n; })();
// ---- Output display and the dancing man, recorded in the app -----------------------------------------------------------------------
$('vstyle').onchange = e => { $('vis').src = `rec/vis_${e.target.value}.webp?v=4`; };
const DANCE_LIST = [['floss','Floss'],['dab','Dab'],['whip','Whip'],['orange_justice','Orange Justice'],['gangnam','Gangnam'],['renegade','Renegade'],['macarena','Macarena'],['jerk','Jerk'],['shuffle','Shuffle'],['popping','Popping'],['krump','Krump'],['headspin','Headspin'],['freeze','Freeze']];
$('dances').innerHTML = DANCE_LIST.map(([k, n]) => `<figure class="dance"><img src="rec/dance_${k}.webp?v=4" alt="${n}" loading="lazy"><figcaption>${n}</figcaption></figure>`).join('');

// ---- The one clock of all that moves --------------------------------------------------------------------------------------------
let last = performance.now(), lastStep = -1;
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  const padSeen = onScreen($('padframe'));
  if (still || (!padSeen && !onScreen($('ptall')))) return;
  beat += dt * TEMPO / 60;
  const step = Math.floor(beat * 4) % STEPS;
  if (step !== lastStep) {
    lastStep = step;
    for (let p = 0; p < 16; p++) for (const n of notes[p] || []) if (n.s === step) { if (p !== 8) hitFrames(p); }
  }
}
requestAnimationFrame(loop);
