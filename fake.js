// On this web site the real phone page has no Mac behind it. This stands in for the connection: the rest is the very page STEPPER serves.
(function () {
  const q = new URLSearchParams(location.search);
  let skin = q.get('skin') || '3d_camouflage', form = q.get('form') || 'phone', page = 0, anim = 5, self = null;
  const names = ['Kick','FX','Perc','808','Snare','Vox','Rim','Snare 2','Closed Hat','FX 2','Open Hat','Crash','Chop','Vox 2','Vox 3','Perc 2'];
  const all = []; for (let p = 0; p < 6; p++) for (let i = 0; i < 16; i++) all.push(p === 0 ? names[i] : '');
  let fx = [];
  const lights = () => all.map((n, i) => n === '' ? [] : i % 3 === 0 ? [fx[0], fx[3]] : i % 3 === 1 ? [fx[4]] : [fx[1], fx[5], fx[2]]);
  const say = text => self && self.onmessage && self.onmessage({ data: text });
  async function look() {
    const layoutUrl = form === 'pad' ? `phone/${skin}_pad.json` : `phone/${skin}_layout.json`;
    const [s, l, p] = await Promise.all([`phone/${skin}.json`, layoutUrl, `phone/${skin}_piano.json`].map(u => fetch(u).then(r => r.json())));
    fx = s.effects;
    const stem = form === 'pad' ? `${skin}_pad` : skin;
    say(JSON.stringify({ t: 'look', skin: s, layout: l, pianoLayout: p, up: `phone/${stem}_up.jpg`, down: `phone/${stem}_down.jpg`, piano: `phone/${skin}_piano.jpg` }));
    state();
  }
  function state() { say(JSON.stringify({ t: 'state', page, anim, target: 'Kick', names: all, lights: lights(), muted: [] })); }
  window.WebSocket = class {
    constructor() { self = this; this.readyState = 1; setTimeout(() => this.onopen && this.onopen(), 10); setInterval(() => say('p'), 2000); }
    send(t) { if (t.startsWith('hello')) look(); else if (t !== 'p') { if (t[0] === 'g') page = +t.slice(1); parent.postMessage({ stepper: t }, '*'); } }
    close() {}
  };
  addEventListener('message', e => { const m = e.data || {}; if (m.skin) { skin = m.skin; look(); } if (m.anim !== undefined) { anim = m.anim; state(); } if (m.hit !== undefined) say('h' + m.hit); });
  // The wheel over these pads moves the page they sit in, and nothing stops on the way.
  addEventListener('wheel', e => { e.preventDefault(); parent.scrollBy({ top: e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY, behavior: 'instant' }); }, { passive: false });
  const short = 393, long = 852;
  Object.defineProperty(screen, 'width', { get: () => short }); Object.defineProperty(screen, 'height', { get: () => long });
})();
