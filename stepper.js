import * as THREE from 'three';
import { mergeGeometries } from './lib/BufferGeometryUtils.js';

// The skins in the order of the app: key, name, colour of the case, and the two colours of its level meters.
const SKINS = [
 ['3d_graphit','Graphite',0x232326,'#58b3a1','#8a80c4'],['3d_terrakotta','Terracotta',0x3b2a23,'#d8915f','#e3c07a'],['3d_salbei','Sage',0xcdd5c1,'#7ac9a0','#9cc8e8'],
 ['3d_hellgrau','Light Gray',0xd7d7d4,'#52c7a3','#72aeea'],['3d_gold','Champagne',0xdccfb6,'#e0b65a','#eddcbd'],['3d_petrol','Petrol',0x1f3a43,'#62bccf','#dcae5a'],
 ['3d_comic','Mustard & Navy',0x1f2a42,'#d2a040','#ec8097'],['3d_camouflage','Camouflage',0x4c4f30,'#9eb35a','#d9c27a'],['3d_desert','Desert',0x6a5638,'#d2a860','#e8d8a8'],
 ['3d_urban','Urban',0x4a4c50,'#74b6c8','#c8ccd0'],['3d_snow','Snow',0x565b61,'#7cc4dc','#c8d8e4'],['3d_camo_pink','Pink Camouflage',0x5e2f45,'#ff8fbf','#ffd0e2'],
 ['3d_steel','Brushed Steel',0xa6a7a5,'#58b3a1','#8a80c4'],['3d_kawaii','Lollipop',0xf9dbe8,'#ff9cc8','#9cd8ff'],['3d_phosphor','Phosphor',0x0d1a10,'#3ddc74','#b8ffd0'],
 ['3d_pixel_woodland','Pixel Woodland',0x4c4f30,'#9eb35a','#d9c27a'],['3d_pixel_desert','Pixel Desert',0x6a5638,'#d2a860','#e8d8a8'],['3d_pixel_urban','Pixel Urban',0x4a4c50,'#74b6c8','#c8ccd0'],
 ['3d_pixel_arctic','Pixel Arctic',0x565b61,'#7cc4dc','#c8d8e4'],['3d_pixel_pink','Pixel Pink',0x5e2f45,'#ff8fbf','#ffd0e2'],['3d_bauhaus','Bauhaus',0xefe9dc,'#5a8ae0','#f2c230'],
 ['3d_dot_matrix','Dot Matrix',0xd0ccc4,'#306230','#9bbc0f'],['3d_blueprint','Blueprint',0x134f8c,'#e8f2ff','#8fd0ff'],
 ['graphit','2D Graphite',0x050506,'#58b3a1','#8a80c4'],['terrakotta','2D Terracotta',0x130e0c,'#d8915f','#e3c07a'],['salbei','2D Sage',0xb3bca8,'#7ac9a0','#9cc8e8'],
 ['hellgrau','2D Light Gray',0xbdbdc1,'#52c7a3','#72aeea'],['gold','2D Champagne',0xbcae94,'#e0b65a','#eddcbd'],['petrol','2D Petrol',0x0a1417,'#62bccf','#dcae5a'],
 ['comic','2D Mustard & Navy',0x090d15,'#d2a040','#ec8097'],
].map(([key,name,body,level1,level2])=>({key,name,body,level1,level2,metal:key.startsWith('3d_')?.45:.3,rough:.5}));
const COUNT = SKINS.length;

// ---- The list of skins and the logo ----------------------------------------------------------------------------
document.getElementById('skins').innerHTML = SKINS.map((s, i) => `<figure data-skin="${i}"><img src="thumbs/${s.key}.jpg?v=4" alt="${s.name} skin" loading="lazy"><figcaption>${s.name}</figcaption></figure>`).join('');

const spinEl = document.getElementById('spin');
const sprite = new Image();
sprite.onload = () => {
  const frames = Math.max(1, Math.round(sprite.naturalWidth / FRAME_W));
  spinEl.style.setProperty('--ar', FRAME_W / sprite.naturalHeight);
  spinEl.style.backgroundSize = `${frames * 100}% 100%`;
  // As in the app: it rests, then turns once.
  let at = 0, rest = 0;
  setInterval(() => {
    if (at === 0 && ++rest < 36) return;
    rest = 0;
    at = (at + 1) % frames;
    spinEl.style.backgroundPosition = `${at / (frames - 1) * 100}% 0`;
  }, 70);
};
const FRAME_W = 46;
sprite.src = 'logo/cy_spin.png';

// ---- Things appearing while scrolling ---------------------------------------------------------------------------

const still = matchMedia('(prefers-reduced-motion:reduce)').matches;

// ---- The machines ------------------------------------------------------------------------------------------------
// The window of the app in its design points (the pictures are twice as sharp), 66 points to one unit.
const PX = 1320, PY = 820, U = 66, W = PX / U, D = PY / U;
// Where the app has its parts, as the app itself reports them (build/siteflow/layout.json).
const KEYS = [[1154,204,1174,224],[917,209,927,219],[1226,203,1282,225],[1190,248,1210,268],[1262,248,1282,268],[1164,248,1186,268],[917,253,927,263],[1210,282,1286,302],[1064,467,1144,491],[902,53,982,75],[1219,53,1307,75],[304,54,330,78],[333,54,411,78],[13,465,69,489],[1256,797,1314,817],[829,542,901,566],[901,542,957,566],[709,542,737,566],[737,542,765,566],[765,542,793,566],[793,542,821,566],[34,503,144,529],[150,503,240,529],[246,503,310,529],[1126,503,1210,529],[233,7,263,39],[267,7,297,39],[301,7,331,39],[335,7,365,39],[369,7,399,39],[403,7,433,39],[437,7,467,39],[475,7,569,39],[1150,7,1180,39],[1082,7,1112,39],[1116,7,1146,39],[1184,7,1214,39],[1226,7,1300,39],[316,503,396,529],[1042,503,1122,529],[1214,503,1286,529]];
const PADS = [[469,108,559,198],[565,108,655,198],[661,108,751,198],[757,108,847,198],[469,204,559,294],[565,204,655,294],[661,204,751,294],[757,204,847,294],[469,300,559,390],[565,300,655,390],[661,300,751,390],[757,300,847,390],[469,396,559,486],[565,396,655,486],[661,396,751,486],[757,396,847,486]];
const GRIPS = [[1131,56,1141,72],[363.3,469,373.3,485],[454,508,464,524]];
const RAILS = [[1131,53,1211,75],[79,465,414,489],[454,503,564,529]];
// The screens of the machine, measured on the app's window: position, tempo, bar, level, output, dancer, the effect chain,
// the library with its search field and wave, the pattern and the piano roll.
const SCREENS = [[614,3,694,41],[696,3,776,41],[778,3,832,41],[877,7,1037,37],[902,81,1244,143],[1245,81,1307,143],[906,193,1296,460],
  [14,122,412,385],[14,88,412,113],[14,416,412,458],[52,540,630,765],[676,580,1256,765]];
const GLASS = [[614,3,694,41],[696,3,776,41],[778,3,832,41],[877,7,1037,37],[902,81,1244,143],[1245,81,1307,143]];

const canvas = document.getElementById('c');
const small = Math.min(innerWidth, innerHeight) < 700;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setClearColor(0x000000, 0);
renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
// AgX keeps the colours of the skins truer than ACES, which pushes them towards yellow and grey.
renderer.toneMapping = THREE.AgXToneMapping;
renderer.toneMappingExposure = .92;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x000000, 40, 92);
const pmrem = new THREE.PMREMGenerator(renderer);
// A dark studio with big soft lights: they are what edges, knobs and glass reflect.
const studio = new THREE.Scene();
studio.background = new THREE.Color(0x050506);
const softbox = (w, h, x, y, z, power, color = 0xffffff) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(power), side: THREE.DoubleSide }));
  m.position.set(x, y, z); m.lookAt(0, 0, 0); studio.add(m);
};
softbox(26, 11, 0, 24, 3, 7);
softbox(5, 24, -26, 9, 6, 4.5, 0xfff1e0);
softbox(5, 24, 26, 8, 2, 3.2, 0xdce8ff);
softbox(34, 2.4, 0, 7, 28, 5);
softbox(24, 7, 0, 10, -28, 1.6, 0xbcd0ff);
// A wide, soft window behind the machines: it is what the glossy faces mirror back towards the viewer.
softbox(46, 16, 0, 20, -34, 2.6, 0xf4f6ff);
softbox(8, 30, -14, 16, -30, 3.2);
softbox(8, 30, 14, 16, -30, 3.2);
scene.environment = pmrem.fromScene(studio, .012).texture;
scene.environmentIntensity = 1.6;
const camera = new THREE.PerspectiveCamera(24, 1, 1, 260);

const key = new THREE.DirectionalLight(0xfff3e6, 2.0);
key.position.set(-9, 22, 14);
key.castShadow = true;
key.shadow.mapSize.set(small ? 1024 : 4096, small ? 1024 : 4096);
Object.assign(key.shadow.camera, { left: -17, right: 17, top: 13, bottom: -13, near: 1, far: 60 });
key.shadow.bias = -.0004;
key.shadow.radius = 5;
scene.add(key);
const rim = new THREE.DirectionalLight(0x9ebcff, 1.1);
rim.position.set(12, 8, -16);
scene.add(rim);
// Light that bounces off the floor and the room, so the shadows are never dead black.
scene.add(new THREE.HemisphereLight(0xdfe6ff, 0x1a1712, .35));

const X = p => p / U - W / 2, Z = p => p / U - D / 2;

// A raised part: its top carries that piece of the picture, its sides the darkened edge of it.
// The face of a key as the app draws it (Hardware.cpp keyFace and chamferFor): a little in from its bounds, its corners cut off.
function faceOf(x0, y0, x1, y1) {
  if (x1 - x0 < 14 || y1 - y0 < 14) return [x0, y0, x1 - 1, y1 - 1, 0];
  const f = [x0 + 1, y0, x1 - 2, y1 - 3], side = Math.min(f[2] - f[0], f[3] - f[1]);
  return [...f, side >= 16 ? Math.min(7, Math.round(side * .24)) : 0];
}
// A raised part: an octagon like the face in the app, its top carrying that piece of the picture, its sides the darkened edge of it.
function raisedGeometry(bx0, by0, bx1, by1, height) {
  const [x0, y0, x1, y1, cut] = faceOf(bx0, by0, bx1, by1);
  const w = (x1 - x0) / U, d = (y1 - y0) / U, bevel = Math.min(.008, height * .2), c = Math.min(cut / U, w / 2, d / 2);
  const hw = w / 2 - bevel, hd = d / 2 - bevel, cc = Math.max(0, c - bevel * .41), shape = new THREE.Shape();
  shape.moveTo(-hw + cc, -hd); shape.lineTo(hw - cc, -hd); shape.lineTo(hw, -hd + cc); shape.lineTo(hw, hd - cc);
  shape.lineTo(hw - cc, hd); shape.lineTo(-hw + cc, hd); shape.lineTo(-hw, hd - cc); shape.lineTo(-hw, -hd + cc); shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: height - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 1 })
    .rotateX(-Math.PI / 2).translate(0, bevel, 0).toNonIndexed();
  geo.computeVertexNormals();
  const pos = geo.attributes.position, nor = geo.attributes.normal, uv = geo.attributes.uv, tone = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    // Only the top carries the picture. The sides take one plain spot of it, so no writing is smeared down them,
    // and they darken towards the foot, where little light reaches.
    const top = nor.getY(i) > .7;
    uv.setXY(i, top ? (x0 + (pos.getX(i) / w + .5) * (x1 - x0)) / PX : (x0 + 2) / PX, top ? 1 - (y0 + (pos.getZ(i) / d + .5) * (y1 - y0)) / PY : 1 - (y1 - 2) / PY);
    const t = top ? 1 : .28 + .4 * Math.min(1, pos.getY(i) / height);
    tone.set([t, t, t], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(tone, 3));
  geo.translate(X((x0 + x1) / 2), 0, Z((y0 + y1) / 2));
  return geo;
}

// The keys of the effect cards are left flat: every machine plays its own effect, so they sit elsewhere on each one.
const CHAIN = [900, 190, 1300, 465];
function raisedKeysAll() { return raisedKeys; }
const raisedKeys = KEYS.filter(([x0, y0, x1, y1]) => !(x0 >= CHAIN[0] && y0 >= CHAIN[1] && x1 <= CHAIN[2] && y1 <= CHAIN[3]));
const keysGeo = mergeGeometries(raisedKeys.map(([x0, y0, x1, y1]) => raisedGeometry(x0, y0, x1, y1, .1)));
const padGeos = PADS.map(([x0, y0, x1, y1]) => raisedGeometry(x0, y0, x1, y1, .26));
// The rails the fader grips run in, cut into the face as narrow slots.
const slotGeo = mergeGeometries(RAILS.map(([x0, y0, x1, y1]) => new THREE.BoxGeometry((x1 - x0 + 4) / U, .014, 3.5 / U).translate(X((x0 + x1) / 2), .006, Z((y0 + y1) / 2))));
const faderGeo = mergeGeometries(GRIPS.map(([x0, y0, x1, y1]) => raisedGeometry(x0, y0, x1, y1, .16)));

const MARGIN = .7, THICK = 1.7;
// A pattern laid over from each side in turn, at one size everywhere, so nothing is stretched along an edge.
function boxMapped(geo) {
  const pos = geo.attributes.position, nor = geo.attributes.normal, uv = geo.attributes.uv, k = 1 / 10.24, kv = 1 / 5.12;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), nx = Math.abs(nor.getX(i)), ny = Math.abs(nor.getY(i)), nz = Math.abs(nor.getZ(i));
    if (ny >= nx && ny >= nz) uv.setXY(i, x * k, z * kv);
    else if (nx >= nz) uv.setXY(i, (z + 7.3) * k, y * kv);
    else uv.setXY(i, (x + 3.1) * k, y * kv);
  }
  return geo;
}
// The window of the app has its four corners cut off at an angle, 16 points along each edge (Main.cpp kCorner),
// and so has every layer of the machine around it, the cut growing with each layer so the bands stay even.
const CUT = 16 / U, cutAt = grow => CUT + grow * (Math.SQRT2 - 1);
function octShape(hw, hd, c) {
  const s = new THREE.Shape();
  s.moveTo(-hw + c, -hd); s.lineTo(hw - c, -hd); s.lineTo(hw, -hd + c); s.lineTo(hw, hd - c);
  s.lineTo(hw - c, hd); s.lineTo(-hw + c, hd); s.lineTo(-hw, hd - c); s.lineTo(-hw, -hd + c); s.closePath();
  return s;
}
// A slab with that outline, centred on the origin, its edges rounded by bevel.
function slab(grow, height, bevel, holeGrow = null) {
  const shape = octShape(W / 2 + grow - bevel, D / 2 + grow - bevel, Math.max(0, cutAt(grow) - bevel * (Math.SQRT2 - 1)));
  if (holeGrow !== null) shape.holes.push(octShape(W / 2 + holeGrow, D / 2 + holeGrow, cutAt(holeGrow)));
  return new THREE.ExtrudeGeometry(shape, { depth: Math.max(.001, height - bevel * 2), bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 5, curveSegments: 1 })
    .rotateX(-Math.PI / 2).translate(0, bevel - height / 2, 0);
}
const bodyGeo = boxMapped(slab(MARGIN, THICK, .12));
const seatGeo = slab(.07, .03, 0);
const plateGeo = (() => {
  const g = new THREE.ShapeGeometry(octShape(W / 2, D / 2, CUT)), pos = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / W + .5, pos.getY(i) / D + .5);
  return g;
})();
const footGeo = (() => {
  const parts = [[-1,-1,1.9],[1,-1,1.9],[-1,1,.65],[1,1,.65]].map(([x, z, h]) => new THREE.CylinderGeometry(.5, .56, h, 20).translate(x * (W / 2 - .5), -THICK - h / 2 + .06, z * (D / 2 - .5)));
  return mergeGeometries(parts);
})();
// Each screen as its own pane of glass, carrying that piece of the picture.
const screenGeo = mergeGeometries(SCREENS.map(([a, b, c, d]) => {
  const g = new THREE.PlaneGeometry((c - a) / U, (d - b) / U).rotateX(-Math.PI / 2), uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (a + uv.getX(i) * (c - a)) / PX, 1 - (b + (1 - uv.getY(i)) * (d - b)) / PY);
  return g.translate(X((a + c) / 2), .003, Z((b + d) / 2));
}));
// Up close, the fine grid of the pixels behind the glass.
const raster = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 8;
  const g = c.getContext('2d'); g.fillStyle = 'rgba(0,0,0,0)'; g.clearRect(0, 0, 8, 8); g.fillStyle = 'rgba(0,0,0,.9)'; g.fillRect(0, 7, 8, 1); g.fillRect(7, 0, 1, 8);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(PX / 1.5, PY / 1.5); t.anisotropy = 8; return t;
})();
const rasterGeo = (() => { const g = screenGeo.clone(), uv = g.attributes.uv; return g.translate(0, .001, 0); })();
// Shadows worked out once: soft dark seams around every pad, key and grip, and the inner edge of every screen,
// so the parts sit in the case and the screens lie a little deeper than the print.
const seams = (() => {
  const k = 2, c = document.createElement('canvas'); c.width = PX * k; c.height = PY * k;
  const g = c.getContext('2d'); g.scale(k, k); g.fillStyle = '#fff'; g.fillRect(0, 0, PX, PY);
  g.filter = 'blur(3px)'; g.fillStyle = 'rgba(0,0,0,.5)';
  [...PADS, ...raisedKeysAll(), ...GRIPS].forEach(([x0, y0, x1, y1]) => g.fillRect(x0 - 1.5, y0 - .5, x1 - x0 + 3, y1 - y0 + 4));
  g.filter = 'blur(2.5px)'; g.strokeStyle = 'rgba(0,0,0,.7)'; g.lineWidth = 6;
  SCREENS.forEach(([x0, y0, x1, y1]) => { g.save(); g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0); g.clip(); g.strokeRect(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4); g.restore(); });
  g.filter = 'none';
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
})();
const seamMat = new THREE.MeshBasicMaterial({ map: seams, transparent: true, blending: THREE.MultiplyBlending, premultipliedAlpha: true, depthWrite: false, toneMapped: false });
const rasterMat = new THREE.MeshBasicMaterial({ map: raster, transparent: true, opacity: .22, depthWrite: false });
const glassGeo = mergeGeometries(GLASS.map(([a, b, c, d]) => new THREE.PlaneGeometry((c - a) / U, (d - b) / U).rotateX(-Math.PI / 2).translate(X((a + c) / 2), .016, Z((b + d) / 2))));

// What only a real machine has: a metal rim around the face, a base plate, and sockets and vents in its front.
const FRONT = D / 2 + MARGIN;
const rimGeo = boxMapped(slab(.17, .07, .015, .06).translate(0, -.006, 0));
const baseGeo = slab(MARGIN - .14, .22, .03);
const ventGeo = mergeGeometries(Array.from({ length: 44 }, (_, i) => new THREE.BoxGeometry(.075, .3, .03).translate(-W / 2 + 1 + i * .17, -THICK * .52, FRONT + .003)));
const socketGeo = mergeGeometries([0, 1, 2].flatMap(i => [new THREE.CylinderGeometry(.13, .13, .05, 24).rotateX(Math.PI / 2).translate(W / 2 - 1.1 - i * .62, -THICK * .52, FRONT)]));
const holeGeo = mergeGeometries([0, 1, 2].map(i => new THREE.CylinderGeometry(.07, .07, .06, 16).rotateX(Math.PI / 2).translate(W / 2 - 1.1 - i * .62, -THICK * .52, FRONT + .006)));
const ledGeo = new THREE.SphereGeometry(.045, 12, 8).translate(W / 2 - 3.2, -THICK * .52, FRONT + .004);

const blackMat = new THREE.MeshStandardMaterial({ color: 0x09090a, roughness: .7, metalness: .3 });
const rubberMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: .9 });
const screwMat = new THREE.MeshStandardMaterial({ color: 0x8a8a8c, metalness: 1, roughness: .32 });
const PAD_LIGHT = .16;
const slotMat = new THREE.MeshPhysicalMaterial({ color: 0x050506, roughness: .3, clearcoat: 1, clearcoatRoughness: .1 });
const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .02, transparent: true, opacity: .1, ior: 1.5, specularIntensity: 1, clearcoat: 1, clearcoatRoughness: .01, envMapIntensity: 3 });
const ledMat = new THREE.MeshStandardMaterial({ color: 0x33ff88, emissive: 0x33ff88, emissiveIntensity: 2.4 });

// Only so many machines exist, and they take on whichever skins are in view as the ring turns.
const FLOOR = -THICK - 1.0;
// No table surface: the machines stand on plain black, in a pool of light.
// The soft pool of light under the machines lies behind the canvas, in the page itself. Drawn in 3D it showed coloured dots.
const glowEl = document.getElementById('glow');
const glowWanted = new THREE.Color(0x8a8a90);
const STEP = Math.PI / 4.4, REACH = 2;      // Angle between neighbours, and how many are built to each side.
// A fine grain for the printed face: no real surface reflects perfectly evenly.
const grain = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), img = g.createImageData(256, 256);
  for (let i = 0; i < img.data.length; i += 4) { const v = 150 + Math.random() * 70; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(14, 9); return t;
})();
// Fine scratches in the clear lacquer, seen only where a light glances off it, and the grain of the rubber pads.
function normalCanvas(size, draw) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'); g.fillStyle = 'rgb(128,128,255)'; g.fillRect(0, 0, size, size); draw(g, size);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
const scratches = normalCanvas(512, (g, n) => {
  for (let i = 0; i < 260; i++) {
    const x = Math.random() * n, y = Math.random() * n, a = Math.random() * Math.PI, l = 8 + Math.random() * 60;
    const nx = Math.round(128 + Math.cos(a + Math.PI / 2) * 70), ny = Math.round(128 + Math.sin(a + Math.PI / 2) * 70);
    g.strokeStyle = `rgba(${nx},${ny},255,${.25 + Math.random() * .5})`; g.lineWidth = .6;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
});
scratches.repeat.set(5, 3);
const rubber = normalCanvas(256, (g, n) => {
  const img = g.getImageData(0, 0, n, n);
  for (let i = 0; i < img.data.length; i += 4) { img.data[i] = 128 + (Math.random() - .5) * 60; img.data[i + 1] = 128 + (Math.random() - .5) * 60; }
  g.putImageData(img, 0, 0);
});
rubber.repeat.set(40, 25);
// The fine stipple of moulded plastic: soft little bumps, not sharp noise.
const stipple = normalCanvas(512, (g, n) => {
  const h = document.createElement('canvas'); h.width = h.height = n;
  const hg = h.getContext('2d'); hg.fillStyle = '#808080'; hg.fillRect(0, 0, n, n);
  for (let i = 0; i < 9000; i++) { const v = Math.random() < .5 ? 40 : 215; hg.fillStyle = `rgba(${v},${v},${v},.35)`; hg.beginPath(); hg.arc(Math.random() * n, Math.random() * n, .8 + Math.random() * 1.6, 0, 7); hg.fill(); }
  hg.filter = 'blur(1.2px)'; hg.drawImage(h, 0, 0); hg.filter = 'none';
  const src = hg.getImageData(0, 0, n, n).data, img = g.getImageData(0, 0, n, n), at = (x, y) => src[(((y + n) % n) * n + ((x + n) % n)) * 4];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const i = (y * n + x) * 4, dx = (at(x + 1, y) - at(x - 1, y)) / 255, dy = (at(x, y + 1) - at(x, y - 1)) / 255;
    img.data[i] = 128 - dx * 127; img.data[i + 1] = 128 - dy * 127; img.data[i + 2] = 255; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
});
stipple.repeat.set(26, 16);
class Machine {
  constructor() {
    this.group = new THREE.Group();
    this.tilt = new THREE.Group();
    this.tilt.rotation.x = .1;
    this.group.add(this.tilt);
    const add = (geo, mat, shadow = true) => { const m = new THREE.Mesh(geo, mat); m.castShadow = shadow; this.tilt.add(m); return m; };
    this.bodyMat = new THREE.MeshPhysicalMaterial({ clearcoat: 1, clearcoatRoughness: .04, roughnessMap: grain, clearcoatNormalMap: scratches, clearcoatNormalScale: new THREE.Vector2(.12, .12) });
    const body = add(bodyGeo, this.bodyMat); body.position.y = -THICK / 2 - .015; body.receiveShadow = true;
    this.body = body;
    add(seatGeo, blackMat, false).position.y = -.018;
    // The displays give off a little light of their own.
    // The case around the pads and screens is matt moulded plastic with a fine stipple.
    this.faceMat = new THREE.MeshPhysicalMaterial({ roughness: .82, roughnessMap: grain, metalness: 0, normalMap: stipple, normalScale: new THREE.Vector2(.55, .55), clearcoat: 0, specularIntensity: .55, emissive: 0xffffff, emissiveIntensity: .035 });
    const face = add(plateGeo, this.faceMat, false); face.rotation.x = -Math.PI / 2; face.receiveShadow = true;
    this.keyMat = new THREE.MeshPhysicalMaterial({ roughness: .22, metalness: 0, vertexColors: true, clearcoat: 1, clearcoatRoughness: .04, clearcoatNormalMap: scratches, clearcoatNormalScale: new THREE.Vector2(.1, .1), specularIntensity: 1 });
    add(slotGeo, slotMat, false);
    add(keysGeo, this.keyMat).receiveShadow = true;
    add(footGeo, rubberMat);
    add(faderGeo, this.keyMat);
    // The screens: glass over the picture, glowing a little and mirroring the room; the print around them is satin.
    this.screenMat = new THREE.MeshPhysicalMaterial({ roughness: .7, metalness: 0, emissive: 0xffffff, emissiveIntensity: .32, clearcoat: 1, clearcoatRoughness: 0, specularIntensity: 1, ior: 1.52 });
    add(screenGeo, this.screenMat, false).receiveShadow = true;
    add(rasterGeo, rasterMat, false);
    const seam = add(plateGeo, seamMat, false); seam.rotation.x = -Math.PI / 2; seam.position.y = .006; seam.renderOrder = 2;
    add(rimGeo, this.bodyMat, false); add(ventGeo, blackMat, false); add(socketGeo, screwMat, false); add(holeGeo, blackMat, false); add(ledGeo, ledMat, false);
    add(baseGeo, rubberMat).position.y = -THICK - .09;
    this.pads = padGeos.map(geo => {
      // The pads are soft rubber with a fine grain and a velvet sheen; when a pad lights up in the app, the light
      // shines a little through the rubber, so its edges glow too.
      const material = new THREE.MeshPhysicalMaterial({ roughness: .45, vertexColors: true, normalMap: rubber, normalScale: new THREE.Vector2(.18, .18), sheen: .5, sheenRoughness: .35, sheenColor: 0xffffff, clearcoat: .5, clearcoatRoughness: .14, emissive: 0xffffff, emissiveIntensity: PAD_LIGHT });
      const mesh = add(geo, material); mesh.receiveShadow = true;
      return { mesh, material, press: 0, glow: 0 };
    });
    this.skin = -1;
    this.video = Object.assign(document.createElement('video'), { muted: true, loop: true, playsInline: true, preload: 'none' });
    this.video.setAttribute('playsinline', ''); this.video.setAttribute('muted', '');
    this.film = new THREE.VideoTexture(this.video); this.film.colorSpace = THREE.SRGBColorSpace; this.film.anisotropy = 8;
    this.video.addEventListener('playing', () => { if (this.filmFor === this.skin && !this.moving) { this.moving = true; this.show(this.film); } });
    scene.add(this.group);
  }
  // The picture on the face, the keys and the pads: the still one, or the film of the app running in this skin.
  show(t) {
    this.faceMat.map = this.faceMat.emissiveMap = this.keyMat.map = this.screenMat.map = this.screenMat.emissiveMap = t;
    this.faceMat.needsUpdate = this.keyMat.needsUpdate = this.screenMat.needsUpdate = true;
    this.pads.forEach(p => { p.material.map = p.material.emissiveMap = t; p.material.needsUpdate = true; });
  }
  // Only the machines near the front play their film; the others rest on their still picture.
  live(on) {
    const v = this.video;
    if (on) {
      if (this.filmFor !== this.skin) { this.filmFor = this.skin; this.moving = false; v.src = `video/${SKINS[this.skin].key}.mp4?v=3`; }
      if (v.paused) v.play().catch(() => {});
    } else if (!on && !v.paused) v.pause();
  }
  wear(index) {
    if (this.skin === index) return;
    this.skin = index;
    if (this.moving) { this.moving = false; this.video.pause(); }
    const skin = SKINS[index];
    const pattern = PLATES.has(skin.key), steel = skin.key === '3d_steel', m = this.bodyMat;
    m.map = pattern ? plateOf(skin.key) : null;
    m.color.setHex(pattern ? 0xffffff : skin.body);
    m.metalness = steel ? .95 : pattern ? .08 : skin.metal;
    m.roughness = steel ? .3 : pattern ? .62 : skin.rough;
    // Brushed steel: its highlights stretch out along the grain, and it has no lacquer on it.
    m.anisotropy = steel ? .85 : 0; m.clearcoat = steel ? .15 : 1; m.clearcoatRoughness = .04;
    m.needsUpdate = true;
    textureOf(index).then(t => {
      if (this.skin !== index) return;
      if (!pattern) paintBodyFrom(t, skin, m);
      // A light face throws back far more of the lamps than a dark one: it is toned down so it does not burn out.
      const lum = brightnessOf(t), tone = lum > .45 ? 1 - (lum - .45) * .55 : 1;
      this.faceMat.color.setScalar(tone); this.keyMat.color.setScalar(tone); this.screenMat.color.setScalar(tone); this.screenMat.emissiveIntensity = lum > .45 ? .1 : .32; this.pads.forEach(p => p.material.color.setScalar(tone));
      if (!this.moving) this.show(t);
      canvas.classList.add('on');
    });
  }
}

// The cases of these skins carry the pattern of their surface.
const PLATES = new Set(['3d_camouflage', '3d_desert', '3d_urban', '3d_snow', '3d_steel']), plates = new Map();
function plateOf(key) {
  if (!plates.has(key)) { const t = loader.load(`skins/body_${key}.jpg`); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping; t.anisotropy = anisotropy; plates.set(key, t); }
  return plates.get(key);
}
// The frame takes the main colour of the machine's own face.
const sampler = document.createElement('canvas'); sampler.width = 60; sampler.height = 6;
function paintBodyFrom(t, skin, mat) {
  const g = sampler.getContext('2d', { willReadFrequently: true }), w = t.image.naturalWidth || t.image.width, h = t.image.naturalHeight || t.image.height;
  g.drawImage(t.image, w * .1, h * .978, w * .3, h * .012, 0, 0, 60, 6);
  const d = g.getImageData(0, 0, 60, 6).data; let r = 0, gr = 0, b = 0;
  for (let i = 0; i < d.length; i += 4) { r += d[i]; gr += d[i + 1]; b += d[i + 2]; }
  const n = d.length / 4, c = new THREE.Color().setRGB(r / n / 255, gr / n / 255, b / n / 255, THREE.SRGBColorSpace), light = (c.r + c.g + c.b) / 3;
  mat.color.copy(c);
  // Light cases are soft-touch plastic: a satin sheen rather than a mirror; dark ones keep their deep lacquer.
  if (light > .25) { mat.metalness = .04; mat.roughness = .55; mat.clearcoat = .35; mat.clearcoatRoughness = .32; } else mat.metalness = Math.min(skin.metal, .5);
}
function brightnessOf(t) {
  const g = sampler.getContext('2d', { willReadFrequently: true });
  g.drawImage(t.image, 0, 0, 60, 6);
  const d = g.getImageData(0, 0, 60, 6).data; let sum = 0;
  for (let i = 0; i < d.length; i += 4) sum += .2126 * d[i] + .7152 * d[i + 1] + .0722 * d[i + 2];
  return sum / (d.length / 4) / 255;
}
const loader = new THREE.TextureLoader(), textures = new Map(), anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
function textureOf(index) {
  if (!textures.has(index)) textures.set(index, new Promise(ok => loader.load(`skins/${SKINS[index].key}.jpg?v=4`, t => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = anisotropy;
    ok(t);
  })));
  return textures.get(index);
}
// Pictures far from view leave the memory of the phone.
function forgetFar(around) {
  textures.forEach((promise, index) => {
    const away = Math.min((index - around + COUNT) % COUNT, (around - index + COUNT) % COUNT);
    if (away > REACH + 2) { textures.delete(index); promise.then(t => t.dispose()); }
  });
}

const machines = []; for (let i = 0; i <= REACH * 2; i++) machines.push(new Machine());
const mod = n => ((n % COUNT) + COUNT) % COUNT;

// ---- Turning the ring ----------------------------------------------------------------------------------------------
let lookX = 0, lookY = 0, wantX = 0, wantY = 0, camBase = camera.position.clone(), camAim = new THREE.Vector3(0, -.3, -.3);
let turn = 0, target = 0, radius = 30, shownName = -1;
const nameEl = document.querySelector('#skin b'), countEl = document.querySelector('#skin span');

function fit() {
  const w = canvas.parentElement.clientWidth, h = canvas.parentElement.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  const top = document.getElementById('tag').getBoundingClientRect().bottom - canvas.parentElement.getBoundingClientRect().top + 8;
  const bottom = h - (document.getElementById('pick').getBoundingClientRect().top - canvas.parentElement.getBoundingClientRect().top) + 8;
  // The front machine fills the room between the logo and the buttons, and as much of the width as there is.
  const across = (W + 2 * MARGIN) / (w < h * 1.1 ? .98 : .9) / camera.aspect;
  const tall = (D * .74 + THICK * .7) * h / Math.max(120, h - top - bottom);
  const dist = Math.max(across, tall) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  // Far enough apart that two neighbours never cut into each other at any point of a turn (checked for every step
  // of a turn with the corners of both cases; 1.25 is the least that works, the rest is room for the tilt).
  radius = (W + MARGIN * 2) * .5 / Math.tan(STEP / 2) * 1.3;
  camera.position.set(0, dist * .68, dist * .735);
  camera.lookAt(0, -.3, -.3);
  camBase = camera.position.clone();
  camera.setViewOffset(w, h, 0, -(top - bottom) / 2, w, h);
  camera.near = Math.max(3, dist * .35); camera.far = dist * 4;
  camera.updateProjectionMatrix();
  scene.fog.near = dist * 1.02;
  scene.fog.far = dist + radius * 1.15;
}
addEventListener('resize', fit); fit();

if (matchMedia('(pointer:fine)').matches) addEventListener('pointermove', e => { wantX = e.clientX / innerWidth * 2 - 1; wantY = e.clientY / innerHeight * 2 - 1; }, { passive: true });

function place() {
  const nearest = Math.round(turn);
  machines.forEach((m, i) => {
    const slot = nearest + i - REACH;
    m.wear(mod(slot));
    // One machine on a turntable: it turns away, and while its edge faces you it changes its skin.
    const d = turn - nearest;
    m.group.visible = slot === nearest;
    m.group.rotation.y = d * Math.PI;
    m.group.position.y = 0;
    m.live(visible && !still && slot === nearest);
  });
  const current = mod(nearest);
  if (current !== shownName) {
    shownName = current;
    nameEl.textContent = SKINS[current].name;
    countEl.textContent = `${current + 1} of ${COUNT}`;
    forgetFar(current);
  }
}

let dragging = false, startX = 0, startY = 0, startTurn = 0, moved = false, decided = false, horizontal = false, lastTouched = -1e9;
const pxPerStep = () => Math.max(260, canvas.clientWidth * .5);

const ray = new THREE.Raycaster(), point = new THREE.Vector2();
function padAt(e) {
  const r = canvas.getBoundingClientRect();
  point.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
  ray.setFromCamera(point, camera);
  const front = machines[REACH];
  const hit = ray.intersectObjects(front.pads.map(p => p.mesh))[0];
  return hit ? front.pads.find(p => p.mesh === hit.object) : null;
}

canvas.addEventListener('pointerdown', e => {
  dragging = true; moved = false; decided = false; horizontal = false;
  startX = e.clientX; startY = e.clientY; startTurn = target;
  lastTouched = performance.now();
  canvas.classList.add('drag');
  const pad = padAt(e);
  if (pad) strike(pad);
});
addEventListener('pointermove', e => {
  if (!dragging) return;
  const dx = e.clientX - startX, dy = e.clientY - startY;
  if (!decided && Math.hypot(dx, dy) > 8) { decided = true; horizontal = Math.abs(dx) > Math.abs(dy); }
  if (decided && horizontal) { moved = true; target = startTurn - dx / pxPerStep(); }
});
const release = () => {
  if (!dragging) return;
  dragging = false;
  canvas.classList.remove('drag');
  target = Math.round(target);
  lastTouched = performance.now();
};
addEventListener('pointerup', release);
addEventListener('pointercancel', release);
const go = by => { target = Math.round(target) + by; lastTouched = performance.now(); };
document.getElementById('prev').onclick = () => go(-1);
document.getElementById('next').onclick = () => go(1);
addEventListener('keydown', e => { if (scrollY < innerHeight * .6) { if (e.key === 'ArrowLeft') go(-1); if (e.key === 'ArrowRight') go(1); } });

// ---- The light under the machines takes the colours of the front one's level meters ------------------------------------------
let liveLevel = 0, liveLast = 0, liveBeat = 0;
function runLive(dt, tempo) {
  liveBeat += dt * tempo / 60;
  liveLevel *= Math.exp(-dt / .16);
  const qt = Math.floor(liveBeat * 4);
  if (qt !== liveLast) { liveLast = qt; const s = qt % 16; if (s === 0 || s === 10) liveLevel = 1; else if (s === 4 || s === 12) liveLevel = .85; else liveLevel = Math.max(liveLevel, .28); }
  const sk = SKINS[machines[REACH].skin];
  glowWanted.setStyle(sk.level1, THREE.LinearSRGBColorSpace).lerp(new THREE.Color().setStyle(sk.level2, THREE.LinearSRGBColorSpace), .4).lerp(new THREE.Color(0xffffff), .28);
  glowEl.style.setProperty('--g', `${Math.round(glowWanted.r * 255)},${Math.round(glowWanted.g * 255)},${Math.round(glowWanted.b * 255)}`);
  glowEl.style.opacity = (.88 + liveLevel * .12).toFixed(2);
}

// ---- Playing -------------------------------------------------------------------------------------------------------
function strike(p) { p.press = 1; p.glow = 1; }
const TEMPO = 134;
let step = 0, nextStep = 700, lastFrame = performance.now(), visible = true, nextTurn = 7000;
new IntersectionObserver(l => { visible = l[0].isIntersecting; }, { threshold: .02 }).observe(canvas);

function tick(now) {
  requestAnimationFrame(tick);
  if (!visible) { lastFrame = now; return; }
  const dt = Math.min(.05, (now - lastFrame) / 1000);
  lastFrame = now;

  if (!still && !dragging && now - lastTouched > 12000 && now > nextTurn) { target = Math.round(target) + 1; nextTurn = now + 6500; }
  turn += (target - turn) * (1 - Math.exp(-dt * (dragging ? 22 : 5.2)));
  if (Math.abs(target - turn) < .0005) turn = target;
  place();

  const front = machines[REACH];
  machines.forEach(m => m.pads.forEach(p => {
    if (p.press < .001 && p.glow < .002) { if (p.mesh.position.y !== 0) { p.mesh.position.y = 0; p.material.emissiveIntensity = PAD_LIGHT; } return; }
    p.press *= Math.exp(-dt / .05);
    p.glow *= Math.exp(-dt / .16);
    p.mesh.position.y = -.11 * p.press;
    p.material.emissiveIntensity = PAD_LIGHT + p.glow * .85;
  }));
  if (!still) {
    lookX += (wantX + Math.sin(now * .00023) * .35 - lookX) * Math.min(1, dt * 2.4);
    lookY += (wantY * .5 + Math.sin(now * .00017) * .2 - lookY) * Math.min(1, dt * 2.4);
    camera.position.set(camBase.x + lookX * 1.5, camBase.y - lookY * .8, camBase.z);
    camera.lookAt(camAim);
  }
  if (visible) runLive(dt, TEMPO);
  renderer.render(scene, camera);
}
place();
requestAnimationFrame(tick);

// ---- The price, as letters of the STEPPER font standing in the same studio, under the same lacquer ----------------------
{
  const host = document.getElementById('price3d');
  // The letters as the app draws them (PixelFont.h); the dollar is the S of the font with a bar through it.
  const S = ['...#########...', '.#############.', '#####.....#####', '####.......####', '####...........', '#####..........', '.###########...', '..#############', '....###########', '..........#####', '...........####', '...........####', '####.......####', '#####.....#####', '.#############.', '...#########...'];
  const ONE = ['....####....', '..######....', '.#######....', '....####....', '....####....', '....####....', '....####....', '....####....', '....####....', '....####....', '....####....', '....####....', '....####....', '############', '############', '############'];
  const DOLLAR = ['......###......', '......###......', ...S, '......###......', '......###......'].map((r, i) => i >= 2 && i < 18 ? r.slice(0, 6) + '###' + r.slice(9) : r);
  const cells = new Set(), at = (x, y) => cells.has(x + ',' + y);
  const put = (rows, x0, y0) => rows.forEach((r, y) => [...r].forEach((c, x) => { if (c === '#') cells.add((x0 + x) + ',' + (y0 + y)); }));
  put(ONE, 0, 2); put(DOLLAR, 15, 0);
  // The outline of all cells together, so each letter is one solid with one rounded edge all around.
  const edges = new Map(), key = (x, y) => x + ',' + y;
  const edge = (x1, y1, x2, y2) => { const k = key(x1, y1); if (!edges.has(k)) edges.set(k, []); edges.get(k).push([x2, y2]); };
  cells.forEach(c => {
    const [x, y] = c.split(',').map(Number);
    if (!at(x, y - 1)) edge(x, y, x + 1, y);
    if (!at(x + 1, y)) edge(x + 1, y, x + 1, y + 1);
    if (!at(x, y + 1)) edge(x + 1, y + 1, x, y + 1);
    if (!at(x - 1, y)) edge(x, y + 1, x, y);
  });
  const loops = [];
  while (edges.size) {
    const [start] = edges.keys(); let [x, y] = start.split(',').map(Number); const loop = [[x, y]];
    let dx = 0, dy = 0;
    for (;;) {
      const list = edges.get(key(x, y)); if (!list) break;
      // Where two cells only touch at a corner, turn right first, so each one keeps its own outline.
      let pick = 0;
      if (list.length > 1 && (dx || dy)) {
        const rank = ([nx, ny]) => { const ex = nx - x, ey = ny - y, cross = dx * ey - dy * ex; return cross > 0 ? 0 : cross === 0 ? 1 : 2; };
        list.forEach((q, i) => { if (rank(q) < rank(list[pick])) pick = i; });
      }
      const [nx, ny] = list.splice(pick, 1)[0]; if (!list.length) edges.delete(key(x, y));
      dx = nx - x; dy = ny - y; x = nx; y = ny; if (key(x, y) === start) break; loop.push([x, y]);
    }
    // Only the corners stay, so the bevel runs cleanly along each side.
    loops.push(loop.filter((p, i) => { const a = loop[(i + loop.length - 1) % loop.length], b = loop[(i + 1) % loop.length]; return (p[0] - a[0]) * (b[1] - p[1]) !== (p[1] - a[1]) * (b[0] - p[0]); }));
  }
  const area = l => l.reduce((s, p, i) => { const q = l[(i + 1) % l.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0) / 2;
  const toShape = (l, Cls) => { const s = new Cls(); l.forEach(([x, y], i) => i ? s.lineTo(x - 15, 10 - y) : s.moveTo(x - 15, 10 - y)); s.closePath(); return s; };
  // The same outline moved inwards by d cells all around: the screen inside the black frame.
  const inset = (l, d) => l.map((p, i) => {
    const a = l[(i + l.length - 1) % l.length], b = l[(i + 1) % l.length];
    const n1 = [-(p[1] - a[1]), p[0] - a[0]], n2 = [-(b[1] - p[1]), b[0] - p[0]], len = v => Math.hypot(v[0], v[1]) || 1;
    return [p[0] + d * (n1[0] / len(n1) + n2[0] / len(n2)), p[1] + d * (n1[1] / len(n1) + n2[1] / len(n2))];
  });
  const outer = loops.filter(l => area(l) > 0), holes = loops.filter(l => area(l) < 0);
  const shapes = outer.map(l => toShape(l, THREE.Shape));
  // Each hole goes into the letter around it.
  const inside = ([px, py], l) => { let c = false; for (let i = 0, j = l.length - 1; i < l.length; j = i++) { const [xi, yi] = l[i], [xj, yj] = l[j]; if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) c = !c; } return c; };
  const screens = outer.map(l => toShape(inset(l, .75), THREE.Shape));
  holes.forEach(h => { const p = [h[0][0] + .5, h[0][1] + .5], i = Math.max(0, outer.findIndex(l => inside(p, l))); shapes[i].holes.push(toShape(h, THREE.Path)); screens[i].holes.push(toShape(inset(h, .75), THREE.Path)); });
  const geo = new THREE.ExtrudeGeometry(shapes, { depth: 3.2, bevelEnabled: true, bevelThickness: .45, bevelSize: .32, bevelSegments: 5, curveSegments: 1 }).translate(0, 0, -1.6);

  const r2 = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  r2.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  r2.toneMapping = THREE.AgXToneMapping; r2.toneMappingExposure = 1.05;
  r2.shadowMap.enabled = true; r2.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(r2.domElement);
  const s2 = new THREE.Scene();
  s2.environment = new THREE.PMREMGenerator(r2).fromScene(studio, .012).texture;
  s2.environmentIntensity = 1.4;
  const lamp = new THREE.DirectionalLight(0xfff3e6, 1.6); lamp.position.set(-12, 18, 22); s2.add(lamp);
  const back = new THREE.DirectionalLight(0x9ebcff, .9); back.position.set(14, 6, -14); s2.add(back);
  // A light from behind that catches the edges, so the black letters stand clear of the glow behind them.
  const rim2 = new THREE.DirectionalLight(0xdfe8ff, 1.6); rim2.position.set(-6, 10, -30); s2.add(rim2);
  s2.add(new THREE.HemisphereLight(0xdfe6ff, 0x1a1712, .3));
  // A black case under a hard, mirror-like lacquer, like the machines at the top of the page ...
  const word = new THREE.Group();
  word.add(new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: 0x0b0b0d, roughness: .18, metalness: .2, clearcoat: 1, clearcoatRoughness: .02, specularIntensity: 1 })));
  // ... and inside its outline a screen with the Blocks visualizer of the app running on it, under glass
  // (the recording cut to the display and set on black so the blocks stand out; only its lower part is used, so the
  // loud moments reach right up to the top of the letters).
  const film = Object.assign(document.createElement('video'), { muted: true, loop: true, playsInline: true, preload: 'none', src: 'rec/vis_price.mp4?v=4' });
  film.setAttribute('playsinline', ''); film.setAttribute('muted', '');
  const filmTex = new THREE.VideoTexture(film); filmTex.colorSpace = THREE.SRGBColorSpace;
  const screenGeo = new THREE.ShapeGeometry(screens);
  { const pos = screenGeo.attributes.position, uv = screenGeo.attributes.uv; for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + 15) / 30, (pos.getY(i) + 10) / 20 * .6); }
  const screen = new THREE.Mesh(screenGeo, new THREE.MeshPhysicalMaterial({ color: 0x0e0e12, emissive: 0xffffff, emissiveMap: filmTex, emissiveIntensity: .85, toneMapped: false, roughness: .05, clearcoat: 1, clearcoatRoughness: .01, specularIntensity: 1 }));
  screen.position.z = 2.06;
  word.add(screen);
  s2.add(word);
  const cam = new THREE.PerspectiveCamera(22, 1, 10, 400);
  cam.position.set(0, 0, 86);
  let seen = false, mx = 0, my = 0;
  new IntersectionObserver(l => { seen = l[0].isIntersecting; }, { threshold: 0 }).observe(host);
  if (matchMedia('(pointer:fine)').matches) addEventListener('pointermove', e => { mx = e.clientX / innerWidth * 2 - 1; my = e.clientY / innerHeight * 2 - 1; }, { passive: true });
  const size = () => { const w = host.clientWidth, h = host.clientHeight; r2.setSize(w, h, false); cam.aspect = w / h; const t = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)); cam.position.z = Math.max(12.5 / t, 18.5 / (t * cam.aspect)); cam.updateProjectionMatrix(); };
  addEventListener('resize', size); size();
  const spin = t => {
    requestAnimationFrame(spin);
    if (!seen) { if (!film.paused) film.pause(); return; }
    if (film.paused && !still) film.play().catch(() => {});
    // It turns slowly to and fro, and leans towards the pointer, so the lights run over its edges.
    word.rotation.y = (still ? 0 : Math.sin(t * .0006) * .32) + mx * .25;
    word.rotation.x = (still ? 0 : Math.sin(t * .00043) * .08) + my * .12;
    r2.render(s2, cam);
  };
  requestAnimationFrame(spin);
}
