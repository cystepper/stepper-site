// The drawing of the real app, carried over from its C++: effect windows, visualizer, pixel films and the dancer.
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const db = v => Math.pow(10, v / 20);
export const toDb = (g, floor = -100) => g <= 0 ? floor : Math.max(floor, 20 * Math.log10(g));
const TAU = Math.PI * 2;
export const CELL = 2, DOT = 1.5;

export class Layer {
  constructor() { this.l = [[], [], [], [], []]; }
  add(x, y, v) { if (v > .04) this.l[clamp(Math.floor(v * 5), 0, 4)].push(x, y); }
  draw(g, colour) {
    g.fillStyle = colour;
    this.l.forEach((list, i) => {
      if (!list.length) return;
      g.globalAlpha = (i + 1) / 5;
      g.beginPath();
      for (let k = 0; k < list.length; k += 2) g.rect(list[k], list[k + 1], DOT, DOT);
      g.fill();
    });
    g.globalAlpha = 1;
  }
}
const reduced = (a, dx, dy = dx) => ({ x: a.x + dx, y: a.y + dy, w: a.w - dx * 2, h: a.h - dy * 2 });
const hex2 = (c, alpha) => { const n = parseInt(c.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${alpha})`; };

function pixelBar(g, a, share, colour, fromTop, lit = 1, rest = .14) {
  const L = new Layer(), length = Math.floor((fromTop ? a.h : a.w) / CELL), thick = Math.floor((fromTop ? a.w : a.h) / CELL), filled = Math.round(clamp(share, 0, 1) * length);
  for (let along = 0; along < length; along++) for (let across = 0; across < thick; across++)
    L.add(a.x + (fromTop ? across : along) * CELL, a.y + (fromTop ? along : across) * CELL, along < filled ? lit : rest);
  L.draw(g, colour);
}
function pixelPath(g, pts, colour) {
  const K = 3, snap = v => Math.floor(v / K) * K;
  g.fillStyle = colour; g.beginPath();
  let lx = -1e6, ly = -1e6;
  for (let i = 1; i < pts.length; i++) {
    const [a, b] = [pts[i - 1], pts[i]], steps = Math.max(1, Math.floor(Math.hypot(b[0] - a[0], b[1] - a[1]) / 1.5));
    for (let k = 0; k <= steps; k++) { const X = snap(a[0] + (b[0] - a[0]) * k / steps), Y = snap(a[1] + (b[1] - a[1]) * k / steps); if (X !== lx || Y !== ly) g.rect(X, Y, 2, 2); lx = X; ly = Y; }
  }
  g.fill();
}

// The parameters as the app's table has them: name, unit, min, max, standard, step, hidden.
const P = (name, unit, min, max, def, step = 0, hidden = false) => ({ name, unit, min, max, def, step, hidden });
export const EFFECTS = [
  { n: 'EQ', k: 'eq', p: [] },
  { n: 'Resonance Suppressor', k: 'resonance', p: [P('Depth','%',0,100,40),P('Sharpness','%',0,100,50),P('Selectivity','%',0,100,50),P('Attack','ms',1,100,10),P('Release','ms',10,500,120),P('Mix','%',0,100,100),P('Delta','',0,1,0,1,true),
      P('Point 1','%',-100,100,0,0,true),P('Point 2','%',-100,100,0,0,true),P('Point 3','%',-100,100,0,0,true),P('Point 4','%',-100,100,0,0,true),P('Point 5','%',-100,100,0,0,true),P('Point 6','%',-100,100,0,0,true),
      P('Freq 1','Hz',30,18000,80,0,true),P('Freq 2','Hz',30,18000,250,0,true),P('Freq 3','Hz',30,18000,800,0,true),P('Freq 4','Hz',30,18000,2500,0,true),P('Freq 5','Hz',30,18000,6000,0,true),P('Freq 6','Hz',30,18000,12000,0,true)] },
  { n: 'Compressor', k: 'compressor', p: [P('Threshold','dB',-60,0,-18),P('Ratio',':1',1,20,4),P('Attack','ms',.1,200,10),P('Release','ms',5,1000,120),P('Makeup','dB',0,36,0),P('Mix','%',0,100,100)] },
  { n: 'Enveloper', k: 'enveloper', p: [P('Attack','%',-100,100,30),P('Sustain','%',-100,100,0),P('Output','dB',-24,12,0),P('Mix','%',0,100,100)] },
  { n: 'Sidechain', k: 'sidechain', p: [P('Mix','%',0,100,100),P('Length','/16',.5,16,4,.5),P('Curve','',0,7,1,1),P('Bass Only','Hz',0,500,0,10)] },
  { n: 'Distortion', k: 'distortion', p: [P('Drive','dB',0,48,18),P('Type','',0,3,0,1),P('Tone','%',0,100,70),P('Output','dB',-36,12,-6),P('Mix','%',0,100,100)] },
  { n: 'Flanger', k: 'flanger', p: [P('Rate','Hz',.02,10,.25),P('Depth','%',0,100,60),P('Delay','ms',.5,10,2.5),P('Feedback','%',-90,90,40),P('Mix','%',0,100,50)] },
  { n: 'Phaser', k: 'phaser', p: [P('Rate','Hz',.02,10,.4),P('Depth','%',0,100,60),P('Center','Hz',100,4000,800),P('Feedback','%',-90,90,40),P('Mix','%',0,100,100),P('Notches','',1,6,2,1)] },
  { n: 'Rotor Cabinet', k: 'rotor', p: [P('Speed','%',0,100,0),P('Depth','%',0,100,70),P('Horn','%',0,100,50),P('Mix','%',0,100,100)] },
  { n: 'Delay', k: 'delay', p: [P('Time','ms',1,2000,375),P('Feedback','%',0,90,35),P('Tone','%',0,100,70),P('Ping-Pong','%',0,100,0,0,true),P('Mix','%',0,100,25)] },
  { n: 'Stereo Delay', k: 'stereoDelay', p: [P('Left','ms',1,2000,250),P('Right','ms',1,2000,375),P('Feedback','%',0,90,35),P('Tone','%',0,100,70),P('Crossfeed','%',0,100,0),P('Mix','%',0,100,25)] },
  { n: 'Reverb', k: 'reverb', p: [P('Decay','s',.2,12,1.8),P('Size','%',0,100,60),P('Damping','%',0,100,40),P('Predelay','ms',0,200,10),P('Mix','%',0,100,25)] },
  { n: 'Soft Clipper', k: 'softClipper', p: [P('Drive','dB',0,24,0),P('Ceiling','dB',-24,0,-.3),P('Softness','%',5,100,50),P('Mix','%',0,100,100)] },
  { n: 'Hard Clipper', k: 'hardClipper', p: [P('Drive','dB',0,24,0),P('Ceiling','dB',-24,0,-.3),P('Mix','%',0,100,100)] },
  { n: 'Limiter', k: 'limiter', p: [P('Input','dB',0,24,0),P('Ceiling','dB',-24,0,-.3),P('Release','ms',5,500,80)] },
];
const one = v => (+v).toFixed(1), KINDS = ['Overdrive', 'Fuzz', 'Rectifier', 'Foldback'];
export function summary(k, p) {
  switch (k) {
    case 'limiter': case 'hardClipper': return `Ceiling ${one(p[1])} dB`;
    case 'softClipper': return `Softness ${Math.round(p[2])} %`;
    case 'reverb': return `${one(p[0])} s`;
    case 'delay': return `${Math.round(p[0])} ms`;
    case 'flanger': case 'phaser': return `${one(p[0])} Hz`;
    case 'compressor': return `${Math.round(p[1])}:1`;
    case 'enveloper': return `Attack ${Math.round(p[0])} %`;
    case 'stereoDelay': return `${Math.round(p[0])} / ${Math.round(p[1])} ms`;
    case 'rotor': return p[0] > 50 ? 'Fast' : 'Slow';
    case 'resonance': return `Depth ${Math.round(p[0])} %`;
    case 'sidechain': return `Curve ${Math.round(p[2]) + 1}`;
    case 'distortion': return KINDS[clamp(Math.round(p[1]), 0, 3)];
    default: return '4 Bands';
  }
}

// The curves of the sound engine.
const softCurve = (x, knee) => { const start = 1 - clamp(knee, .02, 1), size = Math.abs(x); if (size <= start) return x; const range = 1 - start, bent = start + range * Math.tanh((size - start) / range); return x < 0 ? -bent : bent; };
const distortionCurve = (x, kind) => kind === 0 ? (x >= 0 ? Math.tanh(x) : Math.tanh(.7 * x) / .8) : kind === 1 ? clamp(x, -.7, .7) / .7 * (.9 + .1 * Math.cos(x * 9)) : kind === 2 ? Math.abs(Math.tanh(x)) * 2 - .5 : Math.sin(x * 1.5707963);
function curveOf(k, p, input) {
  const driven = input * db(p[0]);
  if (k === 'hardClipper') { const c = db(p[1]); return clamp(driven, -c, c); }
  if (k === 'softClipper') { const c = db(p[1]); return softCurve(driven / c, p[2] * .01) * c; }
  return distortionCurve(driven, Math.round(p[1])) * db(p[3]);
}
const KNEE = 6;
function compressed(input, threshold, ratio) {
  const over = input - threshold, slope = 1 / Math.max(1, ratio) - 1;
  if (over <= -KNEE / 2) return input;
  if (over >= KNEE / 2) return input + slope * over;
  const into = over + KNEE / 2;
  return input + slope * into * into / (2 * KNEE);
}
export function sidechainCurve(shape, x) {
  x = clamp(x, 0, 1);
  switch (clamp(shape, 0, 7)) {
    case 0: return 1 - x;
    case 1: return Math.pow(1 - x, 2);
    case 2: return Math.pow(1 - x, 4);
    case 3: return Math.sqrt(1 - x);
    case 4: return x < .5 ? 1 : 1 - (x - .5) * 2;
    case 5: return x < .75 ? 1 : 1 - (x - .75) * 4;
    case 6: return .5 + .5 * Math.cos(x * Math.PI);
    default: return x < .1 ? 1 - x * 2 : .8 * Math.pow(1 - (x - .1) / .9, 1.5);
  }
}
const cmul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const cdiv = (a, b) => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; };
function phaserResponse(p, sweep, frequency, rate) {
  const depth = p[1] * .01, feedback = clamp(p[3] * .01, -.9, .9), mix = p[4] * .01, stages = 2 * clamp(p[5], 1, 6);
  const corner = clamp(p[2] * Math.pow(2, 2 * depth * Math.sin(TAU * sweep)), 20, rate * .45), t = Math.tan(Math.PI * corner / rate), a = (t - 1) / (t + 1);
  const z = [Math.cos(-TAU * frequency / rate), Math.sin(-TAU * frequency / rate)];
  const stage = cdiv([a + z[0], z[1]], [1 + a * z[0], a * z[1]]);
  let all = [1, 0]; for (let i = 0; i < stages; i++) all = cmul(all, stage);
  const looped = cdiv(all, [1 - feedback * all[0], -feedback * all[1]]);
  return Math.hypot(1 + (looped[0] - 1) * mix * .5, looped[1] * mix * .5);
}

export const newState = () => ({ clock: 0, drive: 0, wet: 0, reduction: 1, phase: 0, phase2: 0, sc: 1, input: new Float32Array(48), bands: new Float32Array(48), node: -1 });

// What the meters of an effect follow, from one number for how loud the beat is right now.
export function stepState(s, k, p, dt, level, spectrum) {
  s.clock += dt;
  const fall = Math.exp(-dt / .12);
  s.drive = Math.max(level, s.drive * fall);
  s.wet = Math.max(level * .36, s.wet * Math.exp(-dt / .5));
  const rate = k === 'flanger' || k === 'phaser' ? p[0] : k === 'rotor' ? .7 + p[0] * .06 : 0;
  s.phase = (s.phase + rate * dt) % 1;
  s.phase2 = (s.phase2 + rate * .62 * dt) % 1;
  if (k === 'compressor') { const inDb = toDb(s.drive, -60), wanted = inDb - compressed(inDb, p[0], p[1]); s.reduction = db(-wanted); }
  else if (k === 'limiter') { const over = Math.max(0, toDb(s.drive * db(p[0]), -60) - p[1]); s.reduction = db(-over); }
  else s.reduction = 1;
  if (k === 'resonance' && spectrum) {
    for (let i = 0; i < 48; i++) {
      const x = i / 47, input = spectrum[i];
      s.input[i] = Math.max(input, s.input[i] - .012);
      const bump = Math.pow(.5 + .5 * Math.sin(x * 38 + 1.3) * Math.sin(x * 17), 4);
      s.bands[i] = Math.max(input * bump * p[0] * .012 * (.4 + p[2] * .012), s.bands[i] * Math.exp(-dt / Math.max(.02, p[4] * .001)));
    }
  }
}

function areaOf(w, h) { return { x: 0, y: 0, w, h }; }
function resArea(w, h) { return reduced(areaOf(w, h), 8, 8); }
export const resonanceNode = (p, node, w, h) => { const a = resArea(w, h); return [a.x + a.w * Math.log(p[13 + node] / 30) / Math.log(18000 / 30), a.y + a.h / 2 - p[7 + node] * .01 * a.h * .42]; };
export function setResonanceNode(p, node, x, y, w, h) { const a = resArea(w, h); p[13 + node] = 30 * Math.pow(600, clamp((x - a.x) / a.w, 0, 1)); p[7 + node] = clamp((a.y + a.h / 2 - y) / (a.h * .42), -1, 1) * 100; }

// One effect's picture, the same as ChainPanel paints it.
export function paintEffect(g, w, h, k, p, s, enabled, c) {
  const colour = c.colour, A = areaOf(w, h);
  const activity = enabled ? clamp(Math.max(s.drive, s.wet * 2, 1 - s.reduction), 0, 1) : 0;
  if (activity > .01) { g.fillStyle = hex2(colour, .1 * activity); g.fillRect(0, 0, w, h); }
  const level = enabled ? clamp(s.wet * 3, 0, 1) : 0;
  switch (k) {
    case 'reverb': {
      const a = reduced(A, 4), cx = a.x + a.w / 2, cy = a.y + a.h / 2, reach = Math.max(a.w, a.h) * .5 * (.5 + p[1] * .005), rings = clamp(Math.round(2 + p[0]), 2, 9), speed = .25 / Math.max(.4, Math.sqrt(p[0]));
      const R = [], S = [];
      for (let i = 0; i < rings; i++) { const t = (s.clock * speed + i / rings) % 1, f = (1 - t) * (1 - t); R[i] = 4 + t * reach; S[i] = enabled ? .2 * f + .8 * level * f : .1 * f; }
      const L = new Layer(), cols = Math.floor(a.w / CELL), rows = Math.floor(a.h / CELL);
      for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
        const x = a.x + q * CELL, y = a.y + r * CELL, d = Math.hypot(x - cx, (y - cy) / .62);
        let v = d < 5 ? (enabled ? .4 + .6 * level : .15) : 0;
        for (let i = 0; i < rings; i++) if (Math.abs(d - R[i]) < 2.4) v = Math.max(v, S[i]);
        L.add(x, y, v);
      }
      L.draw(g, colour); break;
    }
    case 'delay': {
      const a = reduced(A, 10, 6), fb = p[1] * .01, spacing = 12 + Math.sqrt(p[0] / 2000) * (a.w * .5 - 12), mid = a.y + a.h / 2, L = new Layer();
      let st = 1;
      for (let x = a.x; x < a.x + a.w; x += CELL) L.add(x, mid, .12);
      for (let x = a.x + 6; x < a.x + a.w && st > .02; x += spacing) {
        const reach = st * Math.min(a.h * .5, 8 + 26 * level), steps = Math.floor(reach / CELL), v = (enabled ? .3 + .7 * level : .12) * Math.max(.2, st);
        for (let q = 0; q < 3; q++) for (let t = -steps; t <= steps; t++) L.add(x + q * CELL, mid + t * CELL, v);
        st *= Math.max(.05, fb);
      }
      L.draw(g, colour); break;
    }
    case 'flanger': {
      const a = reduced(A, 4, 5), wave = .5 + .5 * Math.sin(TAU * s.phase), sec = p[2] * .001 * (1 + p[1] * .01 * wave * 1.5), mix = p[4] * .01, fb = p[3] * .01, lev = enabled ? clamp(s.drive * 2, .2, 1) : .1;
      const cols = Math.floor(a.w / CELL), rows = Math.floor(a.h / CELL), L = new Layer();
      for (let q = 0; q < cols; q++) {
        const f = 40 * Math.pow(400, q / Math.max(1, cols - 1)), ang = TAU * f * sec, d = [Math.cos(-ang), Math.sin(-ang)];
        const wet = cdiv(d, [1 - fb * d[0], -fb * d[1]]), resp = Math.hypot(1 - mix + mix * wet[0], mix * wet[1]);
        const dec = clamp(20 * Math.log10(Math.max(.001, resp)), -30, 12), ht = Math.round((dec + 30) / 42 * rows), x = a.x + q * CELL;
        for (let r = 0; r < ht; r++) L.add(x, a.y + a.h - (r + 1) * CELL, r === ht - 1 ? (enabled ? .35 + .65 * lev : .2) : .3 * lev + .06);
      }
      L.draw(g, colour); break;
    }
    case 'enveloper': {
      const a = reduced(A, 10, 8), at = p[0] * .01, su = p[1] * .01, lev = enabled ? clamp(.25 + s.drive * 2, .25, 1) : .1, cols = Math.floor(a.w / CELL), rows = Math.floor(a.h / CELL), L = new Layer();
      for (let q = 0; q < cols; q++) {
        const t = q / Math.max(1, cols - 1), ht = Math.round(clamp((.55 + .45 * at) * Math.exp(-t * 14) + .4 * Math.exp(-t * (3.5 - 2.6 * su)), 0, 1) * rows);
        for (let r = 0; r < ht; r++) L.add(a.x + q * CELL, a.y + a.h - (r + 1) * CELL, r === ht - 1 ? lev : lev * .3);
      }
      L.draw(g, colour); break;
    }
    case 'stereoDelay': {
      const a = reduced(A, 10, 6), fb = p[2] * .01, mid = a.y + a.h / 2, L = new Layer();
      const echoes = (time, dir) => {
        const spacing = 10 + Math.sqrt(time / 2000) * (a.w * .5 - 10); let st = 1;
        for (let x = a.x + 6; x < a.x + a.w && st > .02; x += spacing) {
          const steps = Math.max(1, Math.floor(st * Math.min(a.h * .48, 14 + 20 * level) / CELL)), v = (enabled ? .3 + .7 * level : .12) * Math.max(.2, st);
          for (let q = 0; q < 2; q++) for (let t = 1; t <= steps; t++) L.add(x + q * CELL, mid + dir * t * CELL, v);
          st *= Math.max(.05, fb);
        }
      };
      echoes(p[0], -1); echoes(p[1], 1);
      for (let x = a.x; x < a.x + a.w; x += CELL) L.add(x, mid, .12);
      L.draw(g, colour); break;
    }
    case 'rotor': {
      const a = reduced(A, 10, 6), radius = Math.min(a.h, a.w * .4) * .5, lev = enabled ? clamp(.3 + s.drive, .3, 1) : .12, L = new Layer();
      const beam = (cx, cy, turn, size, arms) => {
        const steps = Math.floor(size / CELL);
        for (let r = -steps; r <= steps; r++) for (let q = -steps; q <= steps; q++) {
          const x = q * CELL, y = r * CELL, d = Math.hypot(x, y);
          if (d > size) continue;
          if (d > size - CELL) { L.add(cx + x, cy + y, lev * .25); continue; }
          const ang = Math.atan2(y, x) / TAU - turn, v = ang * arms, wrapped = Math.abs(v - Math.round(v));
          if (wrapped < .12) L.add(cx + x, cy + y, lev * (1 - wrapped * 4));
        }
      };
      beam(a.x + a.w / 2 - radius * 1.2, a.y + a.h / 2, s.phase, radius, 2);
      beam(a.x + a.w / 2 + radius * 1.2, a.y + a.h / 2, s.phase2, radius, 1);
      L.draw(g, colour); break;
    }
    case 'phaser': {
      const a = reduced(A, 4, 5), lev = enabled ? clamp(s.drive * 2, .2, 1) : .1, cols = Math.floor(a.w / CELL), rows = Math.floor(a.h / CELL), L = new Layer();
      for (let q = 0; q < cols; q++) {
        const f = 60 * Math.pow(280, q / Math.max(1, cols - 1)), dec = clamp(toDb(phaserResponse(p, s.phase, f, 48000), -30), -30, 6), ht = Math.round((dec + 30) / 36 * rows), x = a.x + q * CELL;
        for (let r = 0; r < ht; r++) L.add(x, a.y + a.h - (r + 1) * CELL, r === ht - 1 ? (enabled ? .35 + .65 * lev : .2) : .3 * lev + .06);
      }
      L.draw(g, colour); break;
    }
    case 'sidechain': {
      const a0 = reduced(A, 10, 6), a = { x: a0.x, y: a0.y + 18, w: a0.w, h: a0.h - 18 }, mix = p[0] * .01, shape = Math.round(p[2]), cols = Math.floor(a.w / CELL), rows = Math.floor(a.h / CELL), L = new Layer();
      for (let q = 0; q < cols; q++) {
        const t = q / Math.max(1, cols - 1), ht = Math.round((1 - mix * sidechainCurve(shape, t)) * rows), reached = enabled && s.sc < 1 && t <= s.sc, x = a.x + q * CELL;
        for (let r = 0; r < ht; r++) L.add(x, a.y + a.h - (r + 1) * CELL, r === ht - 1 ? (enabled ? .9 : .2) : (reached ? .55 : .14));
      }
      L.draw(g, colour); break;
    }
    case 'resonance': {
      const a = resArea(w, h), sound = new Layer(), cut = new Layer(), cols = Math.floor(a.w / CELL), rows = Math.floor(a.h / CELL);
      const at = (v, pos) => { const place = pos * 47, i = clamp(Math.floor(place), 0, 46); return v[i] + (v[i + 1] - v[i]) * (place - i); };
      for (let q = 0; q < cols; q++) {
        const pos = q / Math.max(1, cols - 1), x = a.x + q * CELL, ht = Math.floor(at(s.input, pos) * rows), taken = Math.floor(at(s.bands, pos) * rows);
        for (let r = 0; r < ht; r++) { const y = a.y + a.h - (r + 1) * CELL; if (r >= ht - taken) cut.add(x, y, enabled ? 1 : .25); else sound.add(x, y, enabled ? .25 + .45 * r / Math.max(1, rows) : .12); }
      }
      sound.draw(g, colour); cut.draw(g, c.clipper);
      g.fillStyle = hex2(c.text, .14); g.fillRect(a.x, a.y + a.h / 2, a.w, 1);
      g.strokeStyle = hex2(c.text, enabled ? .85 : .3); g.lineWidth = 1; g.beginPath();
      for (let x = a.x; x <= a.x + a.w; x += 3) {
        const oct = Math.log2(30 * Math.pow(600, (x - a.x) / a.w)); let am = 0;
        for (let n = 0; n < 6; n++) { const v = p[7 + n] * .01, d = oct - Math.log2(p[13 + n]), shelf = (n === 0 && d < 0) || (n === 5 && d > 0); am += shelf ? v : v * Math.exp(-d * d); }
        const y = a.y + a.h / 2 - clamp(am, -1, 1) * a.h * .42;
        x === a.x ? g.moveTo(x, y) : g.lineTo(x, y);
      }
      g.stroke();
      g.font = 'bold 10px Helvetica, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      for (let n = 0; n < 6; n++) { const [x, y] = resonanceNode(p, n, w, h), on = n === s.node; g.fillStyle = on ? c.accent : c.text; g.fillRect(x - 6.5, y - 6.5, 13, 13); g.fillStyle = on ? c.accentText : '#101113'; g.fillText(n + 1, x, y + .5); }
      g.textAlign = 'left'; g.textBaseline = 'alphabetic'; break;
    }
    case 'compressor': {
      const a0 = reduced(A, 6, 5), bar = { x: a0.x + a0.w - 14, y: a0.y, w: 14, h: a0.h }, a = { x: a0.x, y: a0.y, w: a0.w - 20, h: a0.h }, floor = -60;
      const pt = (i, o) => [a.x + (i - floor) / -floor * a.w, a.y + a.h - clamp((o - floor) / -floor, 0, 1) * a.h];
      g.strokeStyle = c.edge; g.lineWidth = 1; g.beginPath(); g.moveTo(...pt(floor, floor)); g.lineTo(...pt(0, 0)); g.stroke();
      const out = i => compressed(i, p[0], p[1]) + p[4], curve = []; for (let i = 0; i <= 60; i++) curve.push(pt(floor + i, out(floor + i)));
      pixelPath(g, curve, hex2(colour, enabled ? .7 : .2));
      if (enabled && s.drive > 0) { const i = toDb(s.drive, floor), q = pt(i, out(i)); g.fillStyle = colour; g.fillRect(Math.floor(q[0] / 3) * 3 - 3, Math.floor(q[1] / 3) * 3 - 3, 8, 8); }
      pixelBar(g, bar, -toDb(s.reduction, -60) / 24, colour, true); break;
    }
    case 'limiter': {
      const a = reduced(A, 8, 6), toX = d => a.x + a.w * clamp((d + 36) / 42, 0, 1), ceil = toX(0);
      g.fillStyle = hex2(colour, enabled ? .8 : .3); g.fillRect(ceil, a.y, 1, a.h);
      const bar = { x: a.x, y: a.y, w: a.w, h: a.h * .42 }, sx = toX(toDb(s.drive * db(p[0]) / Math.max(.05, db(p[1])), -60)), below = new Layer(), above = new Layer();
      const cols = Math.floor(bar.w / CELL), rows = Math.floor(bar.h / CELL);
      for (let q = 0; q < cols; q++) {
        const x = bar.x + q * CELL, lit = s.drive > 0 && x < sx, beyond = x >= ceil, share = clamp((x - bar.x) / Math.max(1, ceil - bar.x), 0, 1);
        for (let r = 0; r < rows; r++) { const y = bar.y + r * CELL; if (lit && beyond) above.add(x, y, .9); else below.add(x, y, lit ? .3 + .65 * share : .1); }
      }
      below.draw(g, colour); above.draw(g, c.clipper);
      const dbs = -toDb(s.reduction, -60), rb = { x: a.x, y: a.y + a.h * .58, w: a.w, h: a.h * .42 };
      pixelBar(g, rb, dbs / 24, colour, false, 1, .2);
      const text = `-${dbs.toFixed(1)} DB`; g.font = '12px Helvetica, Arial, sans-serif';
      const tw = g.measureText(text).width + 10;
      g.fillStyle = '#101113'; g.fillRect(rb.x + rb.w - tw, rb.y + rb.h / 2 - 8, tw, 16);
      g.fillStyle = c.text; g.textBaseline = 'middle'; g.fillText(text, rb.x + rb.w - tw + 5, rb.y + rb.h / 2 + .5); g.textBaseline = 'alphabetic'; break;
    }
    case 'softClipper': case 'hardClipper': case 'distortion': {
      const a = reduced(A, 6, 5), range = 2, cx = a.x + a.w / 2, cy = a.y + a.h / 2;
      const pt = (i, o) => [cx + i / range * a.w * .5, cy - clamp(o, -1.2, 1.2) / 1.2 * a.h * .5];
      g.fillStyle = c.edge; g.fillRect(a.x, Math.floor(cy), a.w, 1); g.fillRect(Math.floor(cx), a.y, 1, a.h);
      const dr = db(p[0]), reach = clamp(s.drive * Math.max(1, dr) / Math.max(.001, dr) * 1.6, 0, range), whole = [], lit = [];
      for (let t = 0; t <= 96; t++) { const i = -range + 2 * range * t / 96, q = pt(i, curveOf(k, p, i)); whole.push(q); if (Math.abs(i) <= reach) lit.push(q); }
      pixelPath(g, whole, hex2(colour, enabled ? .4 : .15));
      if (enabled && reach > 0 && lit.length > 1) {
        pixelPath(g, lit, colour); g.fillStyle = colour;
        for (const i of [-reach, reach]) { const q = pt(i, curveOf(k, p, i)); g.fillRect(Math.floor(q[0] / 3) * 3 - 2, Math.floor(q[1] / 3) * 3 - 2, 6, 6); }
      }
      if (k === 'distortion' && enabled && s.drive > .5) {
        const sa = reduced(A, 6, 5), st = clamp((s.drive - .5) * .1 + .2, 0, 1), L = new Layer();
        for (let i = 0; i < 28; i++) L.add(Math.round(sa.x + i / 28 * sa.w), Math.round(sa.y + sa.h / 2 + Math.sin(i * 2.3) * sa.h * .4 * st * 1.8), st);
        L.draw(g, colour);
      }
      break;
    }
  }
}

// ---- The equalizer: real filter curves ------------------------------------------------------------------------------------
export function biquadDb(b, f, rate = 48000) {
  const A = Math.pow(10, b.gain / 40), w0 = TAU * b.freq / rate, cs = Math.cos(w0), sn = Math.sin(w0), al = sn / (2 * b.q);
  let c;
  if (b.type === 'low') { const q = 2 * Math.sqrt(A) * al; c = [A * ((A + 1) - (A - 1) * cs + q), 2 * A * ((A - 1) - (A + 1) * cs), A * ((A + 1) - (A - 1) * cs - q), (A + 1) + (A - 1) * cs + q, -2 * ((A - 1) + (A + 1) * cs), (A + 1) + (A - 1) * cs - q]; }
  else if (b.type === 'high') { const q = 2 * Math.sqrt(A) * al; c = [A * ((A + 1) + (A - 1) * cs + q), -2 * A * ((A - 1) + (A + 1) * cs), A * ((A + 1) + (A - 1) * cs - q), (A + 1) - (A - 1) * cs + q, 2 * ((A - 1) - (A + 1) * cs), (A + 1) - (A - 1) * cs - q]; }
  else c = [1 + al * A, -2 * cs, 1 - al * A, 1 + al / A, -2 * cs, 1 - al / A];
  const w = TAU * f / rate, zr = Math.cos(w), zi = Math.sin(w), z2r = Math.cos(2 * w), z2i = Math.sin(2 * w);
  const nr = c[0] + c[1] * zr + c[2] * z2r, ni = -(c[1] * zi + c[2] * z2i), dr = c[3] + c[4] * zr + c[5] * z2r, di = -(c[4] * zi + c[5] * z2i);
  return 10 * Math.log10((nr * nr + ni * ni) / (dr * dr + di * di));
}
export const eqX = (f, w) => w * Math.log(f / 20) / Math.log(1000);
export const eqF = (x, w) => 20 * Math.pow(1000, clamp(x / w, 0, 1));
export const eqY = (d, h) => h / 2 - d / 18 * h * .46;
export const eqG = (y, h) => clamp((h / 2 - y) / (h * .46) * 18, -18, 18);
export function paintEq(g, w, h, bands, chosen, spectrum, enabled, c) {
  g.fillStyle = '#101113'; g.fillRect(0, 0, w, h);
  g.font = '11px Helvetica, Arial, sans-serif';
  for (const f of [50, 100, 200, 500, 1000, 2000, 5000, 10000]) { const x = eqX(f, w); g.fillStyle = c.edge; g.fillRect(x, 0, 1, h); g.fillStyle = c.faint; g.fillText(f >= 1000 ? `${f / 1000}K` : `${f}`, x + 4, h - 5); }
  for (const d of [-12, -6, 6, 12]) { g.fillStyle = c.edge; g.fillRect(0, eqY(d, h), w, 1); }
  g.fillStyle = hex2(c.colour, .14); g.beginPath();
  for (let x = 0; x < w; x += 3) { const v = spectrum[clamp(Math.floor(x / w * 48), 0, 47)], top = h - v * h; for (let y = h - 2; y > top; y -= 3) g.rect(x, y, 2, 2); }
  g.fill();
  const zero = eqY(0, h), pts = [];
  for (let x = 0; x <= w; x += 2) { let d = 0; bands.forEach(b => d += biquadDb(b, eqF(x, w))); pts.push([x, clamp(eqY(d, h), -4, h + 4)]); }
  g.beginPath(); g.moveTo(0, zero); pts.forEach(q => g.lineTo(q[0], q[1])); g.lineTo(w, zero); g.closePath(); g.fillStyle = hex2(c.colour, enabled ? .18 : .05); g.fill();
  g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.strokeStyle = enabled ? c.colour : c.faint; g.lineWidth = 1.5; g.stroke();
  bands.forEach((b, i) => { const x = eqX(b.freq, w), y = eqY(b.gain, h), on = i === chosen; g.fillStyle = on ? c.colour : '#101113'; g.strokeStyle = c.colour; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill(); g.stroke(); g.fillStyle = on ? '#101113' : c.colour; g.font = 'bold 9px Helvetica, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(i + 1, x, y + .5); g.textAlign = 'left'; g.textBaseline = 'alphabetic'; });
}

// ---- The visualizer ----------------------------------------------------------------------------------------------------------
const BARS = 48;
export class Visual {
  constructor() { this.bars = new Float32Array(BARS); this.waves = [new Float32Array(256), new Float32Array(256), new Float32Array(256)]; this.age = 0; this.reach = .1; this.loudest = 0; this.clock = 0; this.seed = 0; }
  barAt(share) { const q = clamp(share, 0, 1) * (BARS - 1), i = Math.floor(q), n = Math.min(i + 1, BARS - 1); return this.bars[i] + (this.bars[n] - this.bars[i]) * (q - i); }
  // From an analyser while there is sound, otherwise from a quiet beat of its own.
  step(dt, analyser, freq, wave, level, time) {
    this.clock += dt;
    const fall = Math.exp(-dt / .12);
    for (let i = 0; i < BARS; i++) this.bars[i] = this.bars[i] < .002 ? 0 : this.bars[i] * fall;
    if (++this.age >= 3) { this.age = 0; const last = this.waves[2]; this.waves[2] = this.waves[1]; this.waves[1] = this.waves[0]; this.waves[0] = last; }
    const W = this.waves[0];
    if (analyser) {
      analyser.getByteFrequencyData(freq); analyser.getByteTimeDomainData(wave);
      for (let b = 0; b < BARS; b++) { const a = 1.3 * Math.pow(freq.length * .84 / 1.3, b / BARS), z = 1.3 * Math.pow(freq.length * .84 / 1.3, (b + 1) / BARS); let pk = 0; for (let i = Math.floor(a); i <= Math.min(Math.floor(z), freq.length - 1); i++) pk = Math.max(pk, freq[i]); this.bars[b] = Math.max(this.bars[b], Math.pow(pk / 255, 1.4)); }
      for (let i = 0; i < 256; i++) W[i] = wave[Math.floor(i / 256 * wave.length)] / 128 - 1;
    } else {
      for (let b = 0; b < BARS; b++) { const x = b / BARS, shape = (.86 * Math.exp(-x * 2.4) + .22) * (.62 + .38 * Math.sin(b * 1.9 + time * 1.2) * Math.sin(b * .37 - time * 2.1)); this.bars[b] = Math.max(this.bars[b], clamp(level * shape * (.75 + .25 * Math.sin(b * b)), 0, 1)); }
      for (let i = 0; i < 256; i++) { const u = i / 256; W[i] = (Math.sin(u * 44 + time * 21) * .55 + Math.sin(u * 131 + time * 9) * .25 + Math.sin(u * 13 - time * 5) * .2) * level * Math.sin(u * Math.PI); }
    }
    let l = 0; for (const v of W) l = Math.max(l, Math.abs(v));
    this.reach = Math.max(.08, l, this.reach * .97);
    this.loudest = Math.max(level * .8, this.loudest * Math.exp(-dt / .2));
  }
  swing(x, y) { return Math.pow(Math.max(this.barAt(Math.atan2(Math.abs(y), Math.abs(x)) / (Math.PI / 2)), this.loudest), .6); }
  paint(g, w, h, style, pixels, col) {
    const a = { x: 1, y: 1, w: w - 2, h: h - 2 };
    if (style === 0) {
      const gap = pixels <= 2 ? 1 : Math.max(1, Math.round(pixels * .18)), cell = pixels + gap, cols = Math.floor(a.w / cell), rows = Math.floor(a.h / cell), left = a.x + (a.w - cols * cell + gap) / 2, bottom = a.y + a.h;
      for (let q = 0; q < cols; q++) {
        const share = q / Math.max(1, cols - 1), to = (q + 1) / cols; let v = 0;
        for (let t = share; t < to; t += 1 / BARS) v = Math.max(v, this.barAt(t));
        const lit = Math.round(v * rows); g.fillStyle = col(share); g.beginPath();
        for (let r = 0; r < lit; r++) g.rect(left + q * cell, bottom - (r + 1) * cell + gap, pixels, pixels);
        g.fill();
      }
    } else if (style === 3) {
      const size = Math.min(pixels, 8), cell = size + (pixels <= 2 ? 1 : Math.max(1, Math.round(size * .15))), mid = a.y + a.h / 2, scale = a.h * .46, cols = Math.floor(a.w / cell);
      for (let age = 2; age >= 0; age--) {
        const W = this.waves[age], span = Math.max(1, Math.floor(256 / cols)); let prev = 0;
        g.globalAlpha = age === 0 ? 1 : age === 1 ? .4 : .18;
        for (let q = 0; q < cols; q++) {
          const first = Math.min(256 - span, Math.floor(q * 256 / cols)); let sum = 0;
          for (let i = first; i < first + span; i++) sum += W[i];
          const row = Math.round(clamp(sum / span / this.reach, -1, 1) * scale / cell), from = q === 0 ? row : prev;
          g.fillStyle = col(q / (cols - 1));
          for (let r = Math.min(from, row); r <= Math.max(from, row); r++) g.fillRect(a.x + q * cell, mid - r * cell - size / 2, size, size);
          prev = row;
        }
      }
      g.globalAlpha = 1;
    } else {
      const gap = pixels <= 2 ? 1 : Math.max(1, Math.round(pixels * .12)), cell = pixels + gap, cx = a.x + a.w / 2, cy = a.y + a.h / 2, hw = a.w / 2, hh = a.h / 2, cols = Math.floor(hw / cell), rows = Math.floor(hh / cell), hole = .2;
      for (let r = -rows; r <= rows; r++) {
        const y = r * cell; g.fillStyle = col(.5 + y / a.h); g.beginPath();
        for (let q = -cols; q <= cols; q++) {
          const x = q * cell, nx = x / hw, ny = y / hh, ang = Math.atan2(ny, nx), sw = this.swing(nx, ny);
          if (style === 1) { const rad = .14 + 1.3 * sw * (.97 + .03 * Math.sin(ang * 5 + this.clock * 1.3)); if (nx * nx + ny * ny <= rad * rad) g.rect(cx + x - pixels / 2, cy + y - pixels / 2, pixels, pixels); }
          else { const d = Math.hypot(nx, ny), petal = .5 + .5 * Math.cos(ang * 8), outer = hole + .06 + 1.2 * sw * (.6 + .4 * petal); if (d >= hole && d <= outer) g.rect(cx + x - pixels / 2, cy + y - pixels / 2, pixels, pixels); }
        }
        g.fill();
      }
    }
  }
}

// ---- Pixel films and the dancer, the very data of the app ------------------------------------------------------------------
export const CLIPS = ['sword', 'tokyo', 'war', 'flowers', 'duel', 'kawaii'];
const CW = 175, CH = 31, CF = 348, CB = 24, CBYTES = Math.ceil(CW * CH / 8), DW = 56, DH = 54, DBYTES = Math.ceil(DW * DH / 8), DFRAMES = 128;
const cache = new Map();
export const loadBin = name => { if (!cache.has(name)) cache.set(name, fetch(`data/${name}.bin`).then(r => r.arrayBuffer()).then(b => new Uint8Array(b))); return cache.get(name); };
export const DANCES = ['Floss','Dab','Whip','Orange Justice','Gangnam','Renegade','Macarena','Jerk','Shuffle','Popping','Krump','Headspin','Freeze'];
export function paintClip(g, w, h, data, beatsIn, col) {
  const frame = clamp(Math.floor(((beatsIn % CB) + CB) % CB / CB * CF), 0, CF - 1), cx = w / CW, cy = h / CH, dx = Math.max(1, cx * .75), dy = Math.max(1, cy * .75);
  for (let x = 0; x < CW; x++) {
    let any = false;
    for (let y = 0; y < CH; y++) {
      const bit = y * CW + x, at = frame * CBYTES + (bit >> 3);
      if ((data[at] >> (bit & 7)) & 1) { if (!any) { g.fillStyle = col(x / (CW - 1)); g.beginPath(); any = true; } g.rect(x * cx, y * cy, dx, dy); }
    }
    if (any) g.fill();
  }
}
export function paintDancer(g, w, h, data, dance, beat, colour) {
  const frame = Math.floor(((beat * 8) % DFRAMES + DFRAMES) % DFRAMES), base = (dance * DFRAMES + frame) * DBYTES, cell = Math.min(w / DW, h / DH), x0 = (w - cell * DW) / 2, y0 = (h - cell * DH) / 2;
  g.fillStyle = colour; g.beginPath();
  for (let y = 0; y < DH; y++) for (let x = 0; x < DW; x++) {
    const bit = y * DW + x;
    if ((data[base + (bit >> 3)] >> (bit & 7)) & 1) { let e = x; while (e + 1 < DW) { const b2 = y * DW + e + 1; if ((data[base + (b2 >> 3)] >> (b2 & 7)) & 1) e++; else break; } g.rect(x0 + x * cell, y0 + y * cell, (e - x + 1) * cell, cell); x = e; }
  }
  g.fill();
}
export const mixColour = (a, b, t) => { const p = parseInt(a.slice(1), 16), q = parseInt(b.slice(1), 16), m = s => Math.round(((p >> s) & 255) + (((q >> s) & 255) - ((p >> s) & 255)) * clamp(t, 0, 1)); return `rgb(${m(16)},${m(8)},${m(0)})`; };
