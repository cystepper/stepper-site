import * as THREE from 'three';
import { RoundedBoxGeometry } from './lib/RoundedBoxGeometry.js';
import { mergeGeometries } from './lib/BufferGeometryUtils.js';
import { EFFECTS, newState, stepState, paintEffect, Visual, loadBin, paintDancer, paintClip, CLIPS, mixColour } from './live.js';

const SKINS = [
 ['3d_camouflage','Camouflage',0x25261a,.35,.62],['3d_graphit','Graphite',0x1a1a1d,.65,.42],['3d_steel','Brushed Steel',0x8f908e,1,.36],['3d_clear','Transparent Tech',0xaab3ae,.2,.22],
 ['3d_kawaii','Kawaii',0xe9bccd,.05,.5],['3d_petrol','Petrol',0x13272d,.55,.45],['3d_gold','Champagne',0xb3a68c,.9,.34],['3d_desert','Desert',0x4a3c27,.3,.6],['3d_urban','Urban',0x2f3134,.4,.55],
 ['3d_snow','Snow',0x4c5157,.35,.55],['3d_terrakotta','Terracotta',0x35241d,.5,.46],['3d_salbei','Sage',0xa9b29d,.4,.48],['3d_hellgrau','Light Gray',0xbcbcb9,.5,.42],['3d_comic','Mustard & Navy',0x1a2438,.5,.46],
 ['graphit','2D Graphite',0x0b0b0d,.6,.45],['terrakotta','2D Terracotta',0x1e1511,.5,.5],['salbei','2D Sage',0x98a18d,.4,.5],['hellgrau','2D Light Gray',0xaeaeb2,.5,.44],['gold','2D Champagne',0xa89b82,.8,.38],['petrol','2D Petrol',0x0e1a1e,.55,.46],['comic','2D Mustard & Navy',0x0d121d,.5,.48],
].map(([key,name,body,metal,rough])=>({key,name,body,metal,rough}));
const COUNT = SKINS.length;

// ---- The list of skins and the logo ----------------------------------------------------------------------------
document.getElementById('skins').innerHTML = SKINS.map((s, i) => `<figure data-skin="${i}"><img src="thumbs/${s.key}.jpg" alt="${s.name} skin" loading="lazy"><figcaption>${s.name}</figcaption></figure>`).join('');

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
const PX = 2000, PY = 1170, W = PX / 100, D = PY / 100;
const canvas = document.getElementById('c');
const small = Math.min(innerWidth, innerHeight) < 700;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(small ? 2 : 2, devicePixelRatio || 1));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
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
scene.environment = pmrem.fromScene(studio, .012).texture;
scene.environmentIntensity = .85;
const camera = new THREE.PerspectiveCamera(24, 1, 1, 260);

const key = new THREE.DirectionalLight(0xfff3e6, 2.0);
key.position.set(-9, 22, 14);
key.castShadow = true;
key.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
Object.assign(key.shadow.camera, { left: -17, right: 17, top: 13, bottom: -13, near: 1, far: 60 });
key.shadow.bias = -.0004;
key.shadow.radius = 5;
scene.add(key);
const rim = new THREE.DirectionalLight(0x9ebcff, 1.1);
rim.position.set(12, 8, -16);
scene.add(rim);

const X = p => p / 100 - W / 2, Z = p => p / 100 - D / 2;

// A raised part: its top carries that piece of the picture, its sides the darkened edge of it.
function raisedGeometry(x0, y0, x1, y1, height, radius) {
  const w = (x1 - x0) / 100, d = (y1 - y0) / 100;
  const geo = new RoundedBoxGeometry(w, height, d, 3, Math.min(radius, height * .48)).toNonIndexed();
  const pos = geo.attributes.position, nor = geo.attributes.normal, uv = geo.attributes.uv, tone = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    // Only the top carries the picture. The sides take one plain spot of it, so no writing is smeared down them.
    const top = nor.getY(i) > .85;
    uv.setXY(i, top ? (x0 + (pos.getX(i) / w + .5) * (x1 - x0)) / PX : (x0 + 4) / PX, top ? 1 - (y0 + (pos.getZ(i) / d + .5) * (y1 - y0)) / PY : 1 - (y1 - 4) / PY);
    const t = top ? 1 : .4;
    tone.set([t, t, t], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(tone, 3));
  geo.translate(X((x0 + x1) / 2), height / 2, Z((y0 + y1) / 2));
  return geo;
}

const KEYS = [
 [678,9,712,41],[721,9,770,41],[779,9,815,41],[824,9,860,41],[869,9,905,41],[914,9,950,41],[960,9,996,41],[1003,9,1041,41],
 [1740,9,1774,40],[1783,9,1851,40],[1860,9,1896,40],[1905,9,1982,40],[523,63,548,87],[556,62,641,87],
 [713,91,799,114],[810,91,896,114],[907,91,993,114],[1004,91,1090,114],[1101,91,1187,114],[1198,91,1286,114],
 [1695,60,1780,84],[1875,60,1985,84],[1822,181,1870,204],[1877,181,1902,204],[1908,181,1983,204],[16,677,78,700],
 [1873,268,1957,292],[15,725,50,751],[56,725,93,751],[107,725,226,751],[966,725,992,751],[1006,725,1032,751],[1040,725,1155,751],
 [1776,725,1868,751],[1875,725,1955,751],[1965,725,1992,751],[1327,772,1355,798],[1360,772,1388,798],[1393,772,1420,798],[1424,772,1452,798],
 [1465,772,1543,798],[1550,772,1606,798],[1613,772,1678,798],[1690,772,1763,798],[1773,772,1858,798],[1873,772,1903,798],[1909,772,1938,798],[1943,772,1972,798],[1932,1142,1988,1162],
];
const keysGeo = mergeGeometries(KEYS.map(k => raisedGeometry(...k, .11, .04)));
const PADX = [713,859,1005,1151], PADY = [126,272,418,564];
const padGeos = [];
PADY.forEach(y => PADX.forEach(x => padGeos.push(raisedGeometry(x + 5, y + 5, x + 133, y + 133, .26, .07))));

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
const bodyGeo = boxMapped(new RoundedBoxGeometry(W + MARGIN * 2, THICK, D + MARGIN * 2, 6, .3));
const seatGeo = new THREE.BoxGeometry(W + .14, .03, D + .14);
const plateGeo = new THREE.PlaneGeometry(W, D);
const footGeo = (() => {
  const parts = [[-1,-1,1.9],[1,-1,1.9],[-1,1,.65],[1,1,.65]].map(([x, z, h]) => new THREE.CylinderGeometry(.5, .56, h, 20).translate(x * (W / 2 - .5), -THICK - h / 2 + .06, z * (D / 2 - .5)));
  return mergeGeometries(parts);
})();
const screwGeo = mergeGeometries([[-1,-1],[1,-1],[-1,1],[1,1]].map(([x, z]) => new THREE.CylinderGeometry(.11, .125, .05, 18).translate(x * (W / 2 + MARGIN * .52), .004, z * (D / 2 + MARGIN * .52))));
const KNOBS = [[1408,443,2.3],[1508,443,.1],[1609,443,-.8],[1710,443,2.4],[1810,443,2.3],[1911,443,-.4],[1432,678,.3],[1584,678,2.3],[1736,678,2.3],[1888,678,2.3]];
function knobParts(radius) { return mergeGeometries(KNOBS.map(([x, y]) => mergeGeometries([new THREE.CylinderGeometry(radius * .84, radius, .12, 32).translate(0, .06, 0).toNonIndexed(), new THREE.CylinderGeometry(radius * .68, radius * .78, .24, 28).translate(0, .24, 0).toNonIndexed()]).translate(X(x), 0, Z(y)))); }
const knobGeo = knobParts(.135);
const capGeo = mergeGeometries(KNOBS.map(([x, y]) => new THREE.CylinderGeometry(.07, .08, .014, 24).translate(X(x), .37, Z(y))));
const markGeo = mergeGeometries(KNOBS.map(([x, y, turn]) => new THREE.BoxGeometry(.022, .018, .09).translate(0, .38, -.05).rotateY(turn).translate(X(x), 0, Z(y))));
const faderGeo = mergeGeometries([[574,690,.13,.28],[1796,73,.13,.24],[1673,738,.13,.24]].map(([x, y, w, d]) => new RoundedBoxGeometry(w, .16, d, 2, .03).toNonIndexed().translate(X(x), .08, Z(y))));
const GLASS = [[1061,10,1156,42],[1161,10,1256,42],[1262,10,1322,42],[1559,10,1720,42],[1354,95,1908,165],[1915,95,1985,165],[17,101,648,130],[17,620,648,668],[168,777,962,1104],[1073,825,1957,1104],[1367,274,1957,405],[1367,545,1957,650]];
const glassGeo = mergeGeometries(GLASS.map(([a, b, c, d]) => new THREE.PlaneGeometry((c - a) / 100, (d - b) / 100).rotateX(-Math.PI / 2).translate(X((a + c) / 2), .016, Z((b + d) / 2))));

// What only a real machine has: a metal rim around the face, a base plate, and sockets and vents in its front.
const FRONT = D / 2 + MARGIN;
const rimGeo = boxMapped(mergeGeometries([
  new THREE.BoxGeometry(W + .34, .07, .11).translate(0, -.006, -D / 2 - .115), new THREE.BoxGeometry(W + .34, .07, .11).translate(0, -.006, D / 2 + .115),
  new THREE.BoxGeometry(.11, .07, D + .12).translate(-W / 2 - .115, -.006, 0), new THREE.BoxGeometry(.11, .07, D + .12).translate(W / 2 + .115, -.006, 0),
]));
const baseGeo = new RoundedBoxGeometry(W + MARGIN * 2 - .28, .22, D + MARGIN * 2 - .28, 3, .08);
const ventGeo = mergeGeometries(Array.from({ length: 44 }, (_, i) => new THREE.BoxGeometry(.075, .3, .03).translate(-W / 2 + 1 + i * .17, -THICK * .52, FRONT + .003)));
const socketGeo = mergeGeometries([0, 1, 2].flatMap(i => [new THREE.CylinderGeometry(.13, .13, .05, 24).rotateX(Math.PI / 2).translate(W / 2 - 1.1 - i * .62, -THICK * .52, FRONT)]));
const holeGeo = mergeGeometries([0, 1, 2].map(i => new THREE.CylinderGeometry(.07, .07, .06, 16).rotateX(Math.PI / 2).translate(W / 2 - 1.1 - i * .62, -THICK * .52, FRONT + .006)));
const ledGeo = new THREE.SphereGeometry(.045, 12, 8).translate(W / 2 - 3.2, -THICK * .52, FRONT + .004);
const ringGeo = mergeGeometries(KNOBS.map(([x, y]) => new THREE.TorusGeometry(.145, .008, 8, 40).rotateX(Math.PI / 2).translate(X(x), .012, Z(y))));

const blackMat = new THREE.MeshStandardMaterial({ color: 0x09090a, roughness: .7, metalness: .3 });
const rubberMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: .9 });
const screwMat = new THREE.MeshStandardMaterial({ color: 0x8a8a8c, metalness: 1, roughness: .32 });
const knobMat = new THREE.MeshStandardMaterial({ color: 0x17171a, roughness: .38, metalness: .75 });
const capMat = new THREE.MeshStandardMaterial({ color: 0x8c8c90, roughness: .3, metalness: 1 });
const markMat = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: .4, emissive: 0xffffff, emissiveIntensity: .35 });
const faderMat = new THREE.MeshStandardMaterial({ color: 0xb6b6b8, roughness: .35, metalness: .85 });
const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .03, transparent: true, opacity: .13, clearcoat: 1, clearcoatRoughness: .02, envMapIntensity: 2.6 });
const ledMat = new THREE.MeshStandardMaterial({ color: 0x33ff88, emissive: 0x33ff88, emissiveIntensity: 2.4 });

// Only so many machines exist, and they take on whichever skins are in view as the ring turns.
const FLOOR = -THICK - 1.0;
const table = new THREE.Mesh(new THREE.CircleGeometry(150, 64).rotateX(-Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: 0x050506, metalness: .55, roughness: .42, transparent: !small, opacity: small ? 1 : .86 }));
table.position.y = FLOOR;
table.receiveShadow = true;
table.renderOrder = 2;
scene.add(table);
// A soft pool of light on the table, in the colours of the skin in front, so the machines don't stand in plain black.
const glowCanvas = document.createElement('canvas'); glowCanvas.width = glowCanvas.height = 512;
{ const g = glowCanvas.getContext('2d'), r = g.createRadialGradient(256, 256, 0, 256, 256, 256);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.38, 'rgba(255,255,255,.62)'); r.addColorStop(.7, 'rgba(255,255,255,.16)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 512, 512); }
const glowMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(glowCanvas), color: 0x8a8a90, transparent: true, opacity: .58, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false });
const glow = new THREE.Mesh(new THREE.PlaneGeometry(W * 3, D * 3.4).rotateX(-Math.PI / 2), glowMat);
glow.position.set(0, FLOOR + .02, 1);
glow.renderOrder = 3;
scene.add(glow);
const glowWanted = new THREE.Color(0x8a8a90);
const STEP = Math.PI / 4.4, REACH = 2;      // Angle between neighbours, and how many are built to each side.
const insideGeo = new THREE.BoxGeometry(W + MARGIN * 2 - .5, THICK * .55, D + MARGIN * 2 - .5).translate(0, -THICK * .55, 0);
let insideShared = null;
function insideMat() {
  if (!insideShared) { const t = new THREE.TextureLoader().load('skins/inside_clear.jpg'); t.colorSpace = THREE.SRGBColorSpace; insideShared = new THREE.MeshStandardMaterial({ map: t, roughness: .55, metalness: .25 }); }
  return insideShared;
}
class Machine {
  constructor() {
    this.group = new THREE.Group();
    this.tilt = new THREE.Group();
    this.tilt.rotation.x = .1;
    this.group.add(this.tilt);
    const add = (geo, mat, shadow = true) => { const m = new THREE.Mesh(geo, mat); m.castShadow = shadow; this.tilt.add(m); return m; };
    this.bodyMat = new THREE.MeshPhysicalMaterial({ clearcoat: .25, clearcoatRoughness: .5 });
    const body = add(bodyGeo, this.bodyMat); body.position.y = -THICK / 2 - .015; body.receiveShadow = true;
    this.body = body;
    // What can be seen through the clear case: the boards inside it, as on the skin's own surface.
    this.inside = add(insideGeo, insideMat(), false); this.inside.visible = false;
    add(seatGeo, blackMat, false).position.y = -.018;
    // The displays give off a little light of their own.
    this.faceMat = new THREE.MeshPhysicalMaterial({ roughness: .55, metalness: .1, bumpScale: .7, clearcoat: .18, clearcoatRoughness: .55, emissive: 0xffffff, emissiveIntensity: .1 });
    const face = add(plateGeo, this.faceMat, false); face.rotation.x = -Math.PI / 2; face.receiveShadow = true;
    this.keyMat = new THREE.MeshStandardMaterial({ roughness: .5, metalness: .1, vertexColors: true });
    add(keysGeo, this.keyMat).receiveShadow = true;
    add(footGeo, rubberMat); add(screwGeo, screwMat, false);
    add(knobGeo, knobMat); add(capGeo, capMat, false); add(markGeo, markMat, false); add(faderGeo, faderMat);
    add(glassGeo, glassMat, false);
    add(rimGeo, this.bodyMat, false); add(ventGeo, blackMat, false); add(socketGeo, screwMat, false); add(holeGeo, blackMat, false); add(ledGeo, ledMat, false); add(ringGeo, screwMat, false);
    add(baseGeo, rubberMat).position.y = -THICK - .09;
    this.pads = padGeos.map(geo => {
      const material = new THREE.MeshPhysicalMaterial({ roughness: .72, vertexColors: true, clearcoat: .15, clearcoatRoughness: .7, emissive: 0xffffff, emissiveIntensity: 0 });
      const mesh = add(geo, material); mesh.receiveShadow = true;
      return { mesh, material, press: 0, glow: 0 };
    });
    this.skin = -1;
    // A real reflection in the table on large screens: the same machine once more, upside down below it.
    if (!small) {
      const mirror = new THREE.Mesh(bodyGeo, this.bodyMat);
      mirror.scale.y = -1;
      mirror.rotation.x = -this.tilt.rotation.x;
      mirror.position.y = FLOOR * 2 + THICK / 2;
      this.group.add(mirror);
    }
    scene.add(this.group);
  }
  wear(index) {
    if (this.skin === index) return;
    this.skin = index;
    const skin = SKINS[index];
    const pattern = PLATES.has(skin.key), clear = skin.key === '3d_clear', steel = skin.key === '3d_steel', m = this.bodyMat;
    m.map = pattern ? plateOf(skin.key) : null;
    m.color.setHex(clear ? 0xeaf3ef : pattern ? 0xffffff : skin.body);
    m.metalness = steel ? .92 : clear ? 0 : pattern ? .08 : skin.metal;
    m.roughness = steel ? .38 : clear ? .07 : pattern ? .62 : skin.rough;
    m.transparent = clear; m.opacity = clear ? .3 : 1; m.depthWrite = !clear; m.clearcoat = clear ? 1 : .25; m.clearcoatRoughness = clear ? .05 : .5;
    m.needsUpdate = true;
    this.inside.visible = clear;
    this.body.castShadow = !clear;
    textureOf(index).then(t => {
      if (this.skin !== index) return;
      if (!pattern && !clear) paintBodyFrom(t, skin, m);
      this.tray = sampleColour(t, .17, .34, .12, .06); this.trayText = this.tray.lum > .42 ? '#111214' : '#e8e9eb'; this.tray = this.tray.css;
      this.faceMat.map = this.faceMat.bumpMap = this.faceMat.emissiveMap = this.keyMat.map = t;
      this.faceMat.needsUpdate = this.keyMat.needsUpdate = true;
      this.pads.forEach(p => { p.material.map = p.material.emissiveMap = t; p.material.needsUpdate = true; });
      canvas.classList.add('on');
    });
  }
}

const PLATES = new Set(['3d_camouflage', '3d_desert', '3d_urban', '3d_snow', '3d_steel']), plates = new Map();
function plateOf(key) {
  if (!plates.has(key)) { const t = loader.load(`skins/plate_${key}.jpg`); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping; t.anisotropy = anisotropy; plates.set(key, t); }
  return plates.get(key);
}
function sampleColour(t, fx, fy, fw, fh) {
  const g = sampler.getContext('2d', { willReadFrequently: true }), w = t.image.naturalWidth || t.image.width, h = t.image.naturalHeight || t.image.height;
  g.drawImage(t.image, w * fx, h * fy, w * fw, h * fh, 0, 0, 60, 6);
  const d = g.getImageData(0, 0, 60, 6).data; let r = 0, gr = 0, b = 0;
  for (let i = 0; i < d.length; i += 4) { r += d[i]; gr += d[i + 1]; b += d[i + 2]; }
  const n = d.length / 4; r /= n; gr /= n; b /= n;
  return { css: `rgb(${Math.round(r)},${Math.round(gr)},${Math.round(b)})`, lum: (.2126 * r + .7152 * gr + .0722 * b) / 255 };
}
// The frame takes the main colour of the machine's own face.
const sampler = document.createElement('canvas'); sampler.width = 60; sampler.height = 6;
function paintBodyFrom(t, skin, mat) {
  const g = sampler.getContext('2d', { willReadFrequently: true }), w = t.image.naturalWidth || t.image.width, h = t.image.naturalHeight || t.image.height;
  g.drawImage(t.image, w * .36, h * .955, w * .3, h * .016, 0, 0, 60, 6);
  const d = g.getImageData(0, 0, 60, 6).data; let r = 0, gr = 0, b = 0;
  for (let i = 0; i < d.length; i += 4) { r += d[i]; gr += d[i + 1]; b += d[i + 2]; }
  const n = d.length / 4, c = new THREE.Color().setRGB(r / n / 255, gr / n / 255, b / n / 255, THREE.SRGBColorSpace), light = (c.r + c.g + c.b) / 3;
  mat.color.copy(c);
  if (light > .25) { mat.metalness = .06; mat.roughness = .5; } else mat.metalness = Math.min(skin.metal, .5);
}
const loader = new THREE.TextureLoader(), textures = new Map(), anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
function textureOf(index) {
  if (!textures.has(index)) textures.set(index, new Promise(ok => loader.load(`skins/${SKINS[index].key}.jpg`, t => {
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
  const across = (W + 2 * MARGIN) / (w < h * 1.1 ? .95 : .72) / camera.aspect;
  const tall = (D * .92 + THICK * .9) * h / Math.max(120, h - top - bottom);
  const dist = Math.max(across, tall) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  radius = (W + MARGIN * 2) * .5 / Math.tan(STEP / 2) * (w < h * 1.1 ? 1.0 : 1.08);
  camera.position.set(0, dist * .68, dist * .735);
  camera.lookAt(0, -.3, -.3);
  camBase = camera.position.clone();
  camera.setViewOffset(w, h, 0, -(top - bottom) / 2, w, h);
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
    const a = (slot - turn) * STEP;
    // They stand back from the one in front, and turn less than the ring does, so that their near corners stay out of its way.
    m.group.position.set(Math.sin(a) * radius, 0, (Math.cos(a) - 1) * radius * 1.7);
    m.group.rotation.y = a * .72;
    m.group.visible = Math.abs(a) < Math.PI * .72;
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

// ---- The machines run: every model with its own display, dance and effect colours, as in the app ---------------------------------
const LIVE = { skins: null, dancer: null, clips: new Map(), visual: new Visual(), reso: newState(), clip: newState() };
fetch('data/skins.json').then(r => r.json()).then(d => LIVE.skins = d);
loadBin('dancers').then(d => LIVE.dancer = d);
CLIPS.forEach(c => { if (!small) loadBin(c).then(d => LIVE.clips.set(c, d)); });
const RESO = EFFECTS.find(e => e.k === 'resonance'), SOFT = EFFECTS.find(e => e.k === 'softClipper');
const resoP = RESO.p.map(q => q.def); resoP[0] = 100; resoP[7] = 18; resoP[9] = -24; resoP[10] = 30; resoP[11] = -12;
const softP = SOFT.p.map(q => q.def); softP[0] = 8; softP[2] = 100;
const RESO_KNOBS = [[51,219,'Depth',1],[151,219,'Sharpness',.5],[252,219,'Selectivity',.5],[353,219,'Attack',.09],[453,219,'Release',.22],[554,219,'Mix',1]];
const SOFT_KNOBS = [[75,175,'',.33],[227,175,'',.99],[379,175,'',1],[531,175,'',1]];
const pick = (i, n) => ((i % n) + n) % n;
const DANCE_ORDER = [7, 0, 4, 11, 5, 6, 1, 8, 3, 9, 2, 10, 12];
const SAMPLE_WORDS = ['KICK','SNARE','CLAP','HIHAT','OPEN HAT','808','RIM','PERC','SHAKER','TOM','CRASH','RIDE','VOX CHOP','STAB','RISER','FX HIT','SUB','COWBELL','SNAP','LOOP'];
const SAMPLE_NAMES = Array.from({ length: 80 }, (_, i) => `${SAMPLE_WORDS[i % 20]} ${(i * 7) % 19 + 1}.WAV`);
const SAMPLE_TIMES = SAMPLE_NAMES.map((_, i) => `0:0${(i * 3) % 3}.${String((i * 37) % 90 + 10)}`);

function liveLayer(x0, y0, x1, y1, scale, y = .02) {
  const c = document.createElement('canvas'), w = x1 - x0, h = y1 - y0;
  c.width = Math.round(w * scale); c.height = Math.round(h * scale);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = anisotropy;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w / 100, h / 100).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: t, toneMapped: false }));
  m.position.set(X((x0 + x1) / 2), y, Z((y0 + y1) / 2));
  return { c, t, m, g: c.getContext('2d'), w, h, scale };
}
const headMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .8 });
const headSeqGeo = new THREE.BoxGeometry(.016, .012, 3.27), headRollGeo = new THREE.BoxGeometry(.016, .012, 2.79);
const q = small ? 1 : 1.5;
machines.forEach(m => {
  m.live = { out: liveLayer(1356, 97, 1906, 163, q), man: liveLayer(1917, 97, 1983, 163, small ? 1 : 2), reso: liveLayer(1357, 224, 1968, 492, q), clip: liveLayer(1357, 503, 1968, 702, q), pos: liveLayer(1062, 11, 1155, 41, 2), lib: liveLayer(17, 141, 648, 584, q), key: liveLayer(721, 9, 770, 41, 2, .118), seq: new THREE.Mesh(headSeqGeo, headMat), roll: new THREE.Mesh(headRollGeo, headMat), skin: -1 };
  ['out', 'man', 'reso', 'clip', 'pos', 'lib', 'key'].forEach(k => m.tilt.add(m.live[k].m));
  m.live.seq.position.set(X(168), .024, Z(940)); m.live.roll.position.set(X(1073), .024, Z(964));
  m.tilt.add(m.live.seq, m.live.roll);
});
const fit2 = l => l.g.setTransform(l.scale, 0, 0, l.scale, 0, 0);
function card(l, name, sum, colour, knobs, top, height, drawPicture, sk) {
  const g = l.g; fit2(l);
  g.fillStyle = '#17181b'; g.fillRect(0, 0, l.w, l.h);
  g.save(); g.translate(0, top); g.beginPath(); g.rect(0, 0, l.w, height); g.clip(); drawPicture(g, l.w, height); g.restore();
  g.strokeStyle = colour; g.lineWidth = 1.5; g.strokeRect(1, 1, l.w - 2, l.h - 2);
  g.fillStyle = colour; g.beginPath(); g.arc(19, 19, 6, 0, 7); g.fill();
  g.font = 'bold 16px Helvetica, Arial, sans-serif'; g.textBaseline = 'middle'; g.fillText(name, 54, 19.5);
  const nw = g.measureText(name).width;
  g.fillStyle = '#a6a6ac'; g.font = '14px Helvetica, Arial, sans-serif'; g.fillText(sum, 54 + nw + 12, 19.5);
  g.fillStyle = colour; g.globalAlpha = .16; g.fillRect(l.w - 88, 8, 46, 22); g.globalAlpha = 1; g.font = '13px Helvetica, Arial, sans-serif'; g.fillText('14', l.w - 66, 19.5);
  g.strokeStyle = colour; g.lineWidth = 1.2; g.strokeRect(l.w - 83, 12, 8, 7); g.strokeRect(l.w - 80, 16, 8, 7);
  g.strokeStyle = '#e1e1e4'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(l.w - 113, 14); g.lineTo(l.w - 103, 24); g.moveTo(l.w - 103, 14); g.lineTo(l.w - 113, 24); g.moveTo(l.w - 30, 22); g.lineTo(l.w - 25, 16); g.lineTo(l.w - 20, 22); g.stroke();
  knobs.forEach(([x, y, label, share]) => {
    const st = -Math.PI * 1.25, en = Math.PI * .25;
    g.lineWidth = 3; g.strokeStyle = '#3d3e42'; g.beginPath(); g.arc(x, y, 21, st, en); g.stroke();
    if (share > 0) { g.strokeStyle = colour; g.beginPath(); g.arc(x, y, 21, st, st + share * (en - st)); g.stroke(); }
    if (label) { g.fillStyle = '#a6a6ac'; g.font = '13px Helvetica, Arial, sans-serif'; g.textAlign = 'center'; g.fillText(label.toUpperCase(), x, y + 38); g.textAlign = 'left'; }
  });
  g.textBaseline = 'alphabetic'; l.t.needsUpdate = true;
}
function library(l, tray, text, beat, seed) {
  const g = l.g; fit2(l); g.fillStyle = tray; g.fillRect(0, 0, l.w, l.h);
  const row = 29, tick = Math.floor(beat * 4), offset = tick + seed * 11, lit = 5 + (tick % 7);
  g.font = '16px Helvetica, Arial, sans-serif'; g.textBaseline = 'middle';
  for (let i = 0; i < 16; i++) {
    const n = (offset + i) % SAMPLE_NAMES.length, y = 4 + i * row;
    if (i === lit) { g.fillStyle = text; g.globalAlpha = .16; g.fillRect(0, y, l.w, row); g.globalAlpha = 1; }
    g.fillStyle = text; g.globalAlpha = i === lit ? 1 : .82; g.fillText(SAMPLE_NAMES[n], 96, y + row / 2 + 1);
    g.globalAlpha = .6; g.textAlign = 'right'; g.font = '14px Helvetica, Arial, sans-serif'; g.fillText(SAMPLE_TIMES[n], l.w - 22, y + row / 2 + 1); g.textAlign = 'left'; g.font = '16px Helvetica, Arial, sans-serif'; g.globalAlpha = 1;
  }
  g.textBaseline = 'alphabetic'; l.t.needsUpdate = true;
}
function drawMachine(m, index, now, sk) {
  const L = m.live, skinIndex = m.skin, col = t => mixColour(sk.level1, sk.level2, t), beat = liveBeat + index * .5;
  const clipPick = pick(skinIndex, 6) === 5 ? CLIPS[pick(skinIndex, CLIPS.length)] : null;
  const o = L.out; fit2(o); o.g.fillStyle = '#101113'; o.g.fillRect(0, 0, o.w, o.h);
  if (clipPick && LIVE.clips.get(clipPick)) paintClip(o.g, o.w, o.h, LIVE.clips.get(clipPick), beat, col);
  else LIVE.visual.paint(o.g, o.w, o.h, pick(skinIndex, 4), pick(skinIndex, 3) + 2, col);
  o.t.needsUpdate = true;
  const a = L.man; fit2(a); a.g.fillStyle = '#101113'; a.g.fillRect(0, 0, a.w, a.h);
  if (LIVE.dancer) paintDancer(a.g, a.w, a.h, LIVE.dancer, DANCE_ORDER[pick(skinIndex, 13)], beat, sk.screenText);
  a.t.needsUpdate = true;
  const c1 = sk.effects[pick(skinIndex * 3 + 1, 8)], c2 = sk.effects[pick(skinIndex * 5 + 4, 8)], pal = { clipper: sk.clipper, text: '#e1e1e4', edge: '#2b2c30', faint: '#a6a6ac', accent: sk.accent, accentText: sk.accentText };
  card(L.reso, 'RESONANCE SUPPRESSOR', 'DEPTH 100 %', c1, RESO_KNOBS, 40, 140, (g, w, h) => paintEffect(g, w, h, 'resonance', resoP, LIVE.reso, true, { ...pal, colour: c1 }), sk);
  card(L.clip, 'SOFT CLIPPER', 'SOFTNESS 100 %', c2, SOFT_KNOBS, 40, 108, (g, w, h) => paintEffect(g, w, h, 'softClipper', softP, LIVE.clip, true, { ...pal, colour: c2 }), sk);
  if (m.tray) library(L.lib, m.tray, m.trayText, beat, skinIndex);
  const p = L.pos; fit2(p); p.g.fillStyle = '#101113'; p.g.fillRect(0, 0, p.w, p.h);
  const bar = Math.floor(beat / 4) % 8 + 1, bt = Math.floor(beat) % 4 + 1, st = Math.floor(beat * 4) % 4 + 1;
  p.g.fillStyle = sk.screenText; p.g.font = '9px Helvetica, Arial, sans-serif'; p.g.globalAlpha = .75; p.g.fillText('POSITION', 7, 10); p.g.globalAlpha = 1; p.g.font = '17px Helvetica, Arial, sans-serif'; p.g.fillText(`${String(bar).padStart(3, '0')}.${bt}.${st}`, 7, 26); p.t.needsUpdate = true;
  const loop = (beat % 8) / 8; L.seq.position.x = X(168 + loop * 794); L.roll.position.x = X(1073 + loop * 884);
  if (L.skin !== skinIndex) { L.skin = skinIndex; const k = L.key, g = k.g; fit2(k); g.fillStyle = sk.accent; g.fillRect(0, 0, k.w, k.h); g.fillStyle = sk.accentText; g.beginPath(); g.moveTo(18, 8); g.lineTo(33, 16); g.lineTo(18, 24); g.closePath(); g.fill(); k.t.needsUpdate = true; }
}
let liveBeat = 0, liveLevel = 0, liveLast = 0, liveFrame = 0;
function runLive(now, dt, tempo) {
  const front = machines[REACH];
  liveBeat += dt * tempo / 60;
  liveLevel *= Math.exp(-dt / .16);
  const qt = Math.floor(liveBeat * 4);
  if (qt !== liveLast) { liveLast = qt; const s = qt % 16; if (s === 0 || s === 10) liveLevel = 1; else if (s === 4 || s === 12) liveLevel = .85; else liveLevel = Math.max(liveLevel, .28); }
  if (!LIVE.skins) return;
  const fk = LIVE.skins[SKINS[front.skin].key]; if (!fk) return;
  glowWanted.set(fk.level1).lerp(new THREE.Color(fk.level2), .4).lerp(new THREE.Color(0xffffff), .28);
  glowMat.color.lerp(glowWanted, Math.min(1, dt * 3));
  glowMat.opacity = .58 + liveLevel * .08;
  LIVE.visual.step(dt, null, null, null, liveLevel, now / 1000);
  const spec = new Float32Array(48); for (let i = 0; i < 48; i++) spec[i] = LIVE.visual.barAt(i / 47) * .92;
  stepState(LIVE.reso, 'resonance', resoP, dt, liveLevel, spec);
  stepState(LIVE.clip, 'softClipper', softP, dt, liveLevel, null);
  liveFrame++;
  machines.forEach((m, i) => {
    const away = Math.abs(i - REACH), sk = LIVE.skins[SKINS[m.skin].key]; if (!sk || !m.group.visible) return;
    if (away === 0 || m.live.skin !== m.skin) drawMachine(m, i, now, sk);
    else if (away === 1 && !small && (liveFrame + i) % 4 === 0) drawMachine(m, i, now, sk);
    else if (away === 1 && small && (liveFrame + i) % 12 === 0) drawMachine(m, i, now, sk);
  });
}

// ---- Playing -------------------------------------------------------------------------------------------------------
function strike(p) { p.press = 1; p.glow = 1; }
const BEAT = [[0,8],[8],[4,8],[8],[0,8],[8,10],[4,8,15],[3,8]];
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
  if (!still && now > nextStep) { nextStep = now + 60000 / TEMPO / 2; BEAT[step++ % BEAT.length].forEach(i => strike(front.pads[i])); }
  machines.forEach(m => m.pads.forEach(p => {
    if (p.press < .001 && p.glow < .002) { if (p.mesh.position.y !== 0) { p.mesh.position.y = 0; p.material.emissiveIntensity = 0; } return; }
    p.press *= Math.exp(-dt / .05);
    p.glow *= Math.exp(-dt / .16);
    p.mesh.position.y = -.11 * p.press;
    p.material.emissiveIntensity = p.glow * .85;
  }));
  if (!still) {
    lookX += (wantX + Math.sin(now * .00023) * .35 - lookX) * Math.min(1, dt * 2.4);
    lookY += (wantY * .5 + Math.sin(now * .00017) * .2 - lookY) * Math.min(1, dt * 2.4);
    camera.position.set(camBase.x + lookX * 1.5, camBase.y - lookY * .8, camBase.z);
    camera.lookAt(camAim);
  }
  if (visible) runLive(now, dt, TEMPO);
  renderer.render(scene, camera);
}
place();
requestAnimationFrame(tick);
