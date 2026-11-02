// Cheese, Please! — PS1-style 3D short. 360x270 internal resolution, vertex snapping, affine textures, Gouraud, dither.
import * as THREE from 'three';
import { clamp, lerp, seg, ss, hash } from '/core/lib.js';
import * as K from './tracks.js';
THREE.ColorManagement.enabled = false;
const RW = 360, RH = 270, FOV = 35, PX = 1 / 100;
const cv = document.getElementById('gl'), hud = document.getElementById('hud').getContext('2d');
const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(RW, RH, false); renderer.setClearColor(new THREE.Color('#1a1820'));
await document.fonts.load('8px PS2P'); await document.fonts.load('16px PS2P');

// ---- PS1 material: snapped vertices, affine uv, Gouraud light, depth fog, 15-bit dither
const UNI = { uRes: { value: new THREE.Vector2(RW, RH) }, uLight: { value: new THREE.Vector3(.4, .8, .5) }, uFogColor: { value: new THREE.Color('#b8b2a6') }, uFogNear: { value: 26 }, uFogFar: { value: 60 }, uGain: { value: 1.12 } };
const VS = `uniform vec2 uRes; uniform vec3 uLight; uniform float amb; uniform float uFogNear, uFogFar;
varying vec2 vUvW; varying float vW; varying float vLit; varying float vFog;
void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); vec4 clip = projectionMatrix * mv;
  vec3 n = normalize(normalMatrix * normal); vLit = amb + max(dot(n, normalize(uLight)), 0.) * (1. - amb);
  vec2 ndc = clip.xy / clip.w; ndc = floor(ndc * uRes * .5 + .5) / (uRes * .5); clip.xy = ndc * clip.w;     // vertices snap to the pixel grid
  vUvW = uv * clip.w; vW = clip.w; vFog = clamp((-mv.z - uFogNear) / (uFogFar - uFogNear), 0., 1.);
  gl_Position = clip; }`;
const FS = `uniform sampler2D map; uniform float useMap; uniform vec3 color; uniform vec3 uFogColor; uniform float glow; uniform float uGain;
varying vec2 vUvW; varying float vW; varying float vLit; varying float vFog;
float bayer(vec2 p){ int x = int(mod(p.x, 4.)); int y = int(mod(p.y, 4.)); int i = x + y * 4;
  float m[16] = float[16](0.,8.,2.,10., 12.,4.,14.,6., 3.,11.,1.,9., 15.,7.,13.,5.); return m[i] / 16. - .5; }
void main(){ vec2 uv = vUvW / vW;                                                                               // affine mapping
  vec4 tx = useMap > .5 ? texture2D(map, uv) : vec4(1.); if (tx.a < .5) discard;
  vec3 c = tx.rgb * color * max(vLit * uGain, glow); c = mix(c, uFogColor, vFog);
  c = floor(c * 31. + .5 + bayer(gl_FragCoord.xy) * .9) / 31.;                                                    // 15-bit colour + ordered dither
  gl_FragColor = vec4(c, 1.); }`;
function mat(o = {}) { return new THREE.ShaderMaterial({ uniforms: { ...UNI, color: { value: new THREE.Color(o.color ?? '#ffffff') }, map: { value: o.map ?? null }, useMap: { value: o.map ? 1 : 0 }, amb: { value: o.amb ?? .5 }, glow: { value: o.glow ?? 0 } }, vertexShader: VS, fragmentShader: FS, side: o.side ?? THREE.FrontSide }); }

// ---- textures (small, nearest-filtered, drawn procedurally)
let rs = 7; const R = () => (rs = (rs * 16807) % 2147483647) / 2147483647;
function tex(w, h, fn, rep = [1, 1]) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); fn(g, w, h); const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); return t; }
const noise = (g, w, h, base, amt) => { g.fillStyle = base; g.fillRect(0, 0, w, h); for (let i = 0; i < w * h * .5; i++) { const v = (R() - .5) * amt; g.fillStyle = v > 0 ? `rgba(255,255,255,${v / 255})` : `rgba(0,0,0,${-v / 255})`; g.fillRect(R() * w | 0, R() * h | 0, 1, 1); } };
const T = {
  wall: tex(64, 64, (g, w, h) => { noise(g, w, h, '#d9c9a3', 30); for (let x = 0; x < w; x += 16) { g.fillStyle = '#b9a47c'; g.fillRect(x, 0, 6, h); } for (let y = 4; y < h; y += 16) for (let x = 3; x < w; x += 16) { g.fillStyle = '#c9c2b0'; g.fillRect(x + 8, y, 2, 2); } }, [10, 3]),
  floor: tex(64, 64, (g, w, h) => { for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { g.fillStyle = (i + j) % 2 ? '#cdbd98' : '#7d6c52'; g.fillRect(i * 16, j * 16, 16, 16); } for (let i = 0; i < 250; i++) { g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(R() * w | 0, R() * h | 0, 1, 1); } }, [12, 8]),
  wood: tex(32, 32, (g, w, h) => { noise(g, w, h, '#7a5a3c', 30); for (let y = 0; y < h; y += 4) { g.fillStyle = 'rgba(40,20,5,.35)'; g.fillRect(0, y, w, 1); } }),
  fur: tex(32, 32, (g, w, h) => noise(g, w, h, '#8d8a94', 60)),
  furW: tex(32, 32, (g, w, h) => noise(g, w, h, '#f6f3ee', 22)),
  cheese: tex(32, 32, (g, w, h) => { g.fillStyle = '#f2c230'; g.fillRect(0, 0, w, h); g.fillStyle = '#c9961a'; for (const [x, y, r] of [[6, 7, 3], [20, 12, 4], [11, 22, 3], [26, 26, 2]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } }),
  metal: tex(32, 32, (g, w, h) => { noise(g, w, h, '#5d5b66', 36); g.fillStyle = '#26242c'; g.fillRect(0, 0, w, 3); }),
  window: tex(32, 32, (g, w, h) => { g.fillStyle = '#7fb7e6'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.fillRect(4, 6, 12, 5); g.fillRect(14, 9, 10, 4); g.fillStyle = '#4a4538'; g.fillRect(14, 0, 4, h); g.fillRect(0, 14, w, 4); }),
  basket: tex(32, 32, (g, w, h) => { noise(g, w, h, '#a2794a', 36); for (let y = 0; y < h; y += 4) { g.fillStyle = 'rgba(40,20,0,.4)'; g.fillRect(0, y, w, 1); } for (let x = 0; x < w; x += 6) { g.fillStyle = 'rgba(40,20,0,.3)'; g.fillRect(x, 0, 1, h); } }),
  puddle: tex(16, 16, (g, w, h) => { g.fillStyle = '#e8eef5'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.fillRect(3, 3, 5, 2); })
};
// ---- low-poly geometry
const SPH = new THREE.SphereGeometry(1, 8, 6), BOX = new THREE.BoxGeometry(1, 1, 1), CYL = new THREE.CylinderGeometry(1, 1, 1, 8), CONE = new THREE.ConeGeometry(1, 1, 4), DISC = (() => { const g = new THREE.CylinderGeometry(1, 1, 1, 8); g.rotateX(Math.PI / 2); return g; })(), OCT = new THREE.OctahedronGeometry(1, 0);
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(FOV, RW / RH, .3, 200);
const M = {
  white: mat({ color: '#ffffff', map: T.furW, amb: .6 }), black: mat({ color: '#18171d', amb: .7 }), pink: mat({ color: '#e0a8a8', amb: .7 }), nose: mat({ color: '#2a2a2a' }), eyeW: mat({ color: '#ffffff', amb: .9 }),
  fur: mat({ color: '#ffffff', map: T.fur, amb: .55 }), cheese: mat({ color: '#ffffff', map: T.cheese, amb: .8 }), metal: mat({ color: '#ffffff', map: T.metal }), wood: mat({ color: '#ffffff', map: T.wood }),
  star: mat({ color: '#ffe65a', glow: 1 }), skin: mat({ color: '#ffffff', map: T.furW, amb: .6 })
};
function mesh(geo, m, parent, pos = [0, 0, 0], sc = [1, 1, 1]) { const o = new THREE.Mesh(geo, m); o.position.set(...pos); o.scale.set(...sc); parent?.add(o); return o; }
const Y = new THREE.Vector3(0, 1, 0), tmp = new THREE.Vector3();
function limb(o, a, b, w) { const d = tmp.copy(b).sub(a), len = Math.max(d.length(), .001); o.position.copy(a).addScaledVector(d, .5); o.quaternion.setFromUnitVectors(Y, d.normalize()); o.scale.set(w, len, w); }

// ---- the set (2D stage coords / 100 = world units; characters stand on z = 0)
const set = new THREE.Group(); scene.add(set);
const W = (x) => x * PX, FLR = K.FL;
mesh(new THREE.PlaneGeometry(40, 20), mat({ color: '#ffffff', map: T.floor, amb: .75 }), set, [8, 0, 3], [1, 1, 1]).rotation.x = -Math.PI / 2;
mesh(new THREE.PlaneGeometry(40, 12), mat({ color: '#ffffff', map: T.wall, amb: .7 }), set, [8, 6, -1.6]);
mesh(BOX, mat({ color: '#6c6558', amb: .6 }), set, [8, .22, -1.55], [40, .45, .1]);                                    // baseboard
mesh(new THREE.PlaneGeometry(2.0, 2.2), mat({ color: '#ffffff', map: T.window, amb: .9 }), set, [6.2, 7.0, -1.55]);       // window
const clockM = mesh(new THREE.CylinderGeometry(.7, .7, .1, 10), mat({ color: '#f1ede0', amb: .9 }), set, [12.8, 7, -1.5]); clockM.rotation.x = Math.PI / 2;
const hand = mesh(BOX, M.black, set, [12.8, 7.15, -1.42], [.07, .5, .05]);
const holeFrame = mesh(new THREE.CircleGeometry(.78, 10, 0, Math.PI), mat({ color: '#5a554b', amb: .8 }), set, [W(K.X.hole), 0, -1.53]);
const hole = mesh(new THREE.CircleGeometry(.62, 10, 0, Math.PI), mat({ color: '#050506', amb: 1 }), set, [W(K.X.hole), 0, -1.5]);
const table = new THREE.Group(); set.add(table);
mesh(BOX, M.wood, table, [10, 3.55, 0], [2.8, .3, 1.6]); for (const dx of [-1.2, 1.2]) for (const dz of [-.6, .6]) mesh(BOX, M.wood, table, [10 + dx, 1.75, dz], [.2, 3.5, .2]);
mesh(CYL, mat({ color: '#e8e6e0' }), table, [10, 3.74, 0], [.7, .05, .7]);
const cheesePlate = mesh(CONE, M.cheese, table, [10, 4.0, 0], [.42, .5, .42]); cheesePlate.scale.set(.42, .5, .42); cheesePlate.rotation.y = .6;
const stove = new THREE.Group(); set.add(stove);
mesh(BOX, M.metal, stove, [2.3, 1.4, -1.15], [2.6, 2.8, .9]); mesh(BOX, mat({ color: '#26242c' }), stove, [2.3, 2.85, -1.15], [2.7, .2, 1.0]);
for (const dx of [-.55, .55]) mesh(CYL, mat({ color: '#111' }), stove, [2.3 + dx, 3.0, -1.15], [.5, .05, .5]);
const shelfY = 5.4; mesh(BOX, M.wood, set, [2.3, shelfY, -1.25], [3, .25, .6]);
const shelfPots = [-.9, 0, .9].map((dx, i) => mesh(CYL, M.metal, set, [2.3 + dx, shelfY + .5, -1.2], [.38, .7, .38]));
const basket = mesh(CYL, mat({ color: '#ffffff', map: T.basket, amb: .7 }), set, [W(K.X.basket), .4, 0], [1.9, .8, 1.3]); mesh(BOX, mat({ color: '#d9d4c6' }), set, [W(K.X.basket), .82, 0], [2.8, .1, 2]).scale.set(2.8, .1, 2);
const puddle = mesh(new THREE.CircleGeometry(.9, 10), mat({ color: '#ffffff', map: T.puddle, amb: .9 }), set, [W(K.X.puddle), .02, .3]); puddle.rotation.x = -Math.PI / 2;
const potFall = mesh(CYL, M.metal, scene, [0, -9, 0], [.5, .75, .5]), potHead = mesh(CYL, M.metal, scene, [0, -9, 0], [.55, .75, .55]);
const stars = [0, 1, 2].map(() => mesh(OCT, M.star, scene, [0, -9, 0], [.22, .22, .08]));
const hs = mesh(BOX, M.black, scene); hs.visible = false;
const speedBars = [0, 1, 2, 3].map(() => mesh(BOX, mat({ color: '#ffffff', glow: 1 }), scene, [0, -9, 0], [1, .05, .03]));

// ---- characters
function face(root, hp, s) {   // build eyes/mouth on a head group
  const f = { eyes: [], pup: [], lids: [] };
  for (const z of [-1, 1]) { const w = mesh(SPH, M.eyeW, hp, [hp.eye.x, hp.eye.y, z * hp.eye.z], [hp.eye.r, hp.eye.r, hp.eye.r * .9]); const p = mesh(SPH, M.black, hp, [hp.eye.x + hp.eye.r * .8, hp.eye.y, z * hp.eye.z], [hp.eye.r * .55, hp.eye.r * .55, hp.eye.r * .5]); f.eyes.push(w); f.pup.push(p); }
  f.mouth = mesh(BOX, M.black, hp, [hp.mouth.x, hp.mouth.y, 0], [.03, .04, .12]);
  f.brow = [-1, 1].map(z => mesh(BOX, M.black, hp, [hp.eye.x, hp.eye.y + hp.eye.r * 1.5, z * hp.eye.z], [.03, .03, hp.eye.r * 1.6]));
  return f;
}
function setFace(f, hp, E, mouth, brow) {
  const t = E?.type || 'open', r = hp.eye.r; let lid = E?.lid ?? 0, big = 1;
  if (t === 'happy' || t === 'shut') lid = .92; else if (t === 'squeeze') lid = .85; else if (t === 'sad') lid = Math.max(lid, .35); else if (t === 'wide') big = 1.25;
  f.eyes.forEach((e, i) => { e.scale.set(r * big, Math.max(.05, r * big * (1 - lid)), r * .9 * big); });
  f.pup.forEach((p, i) => { const z = i ? 1 : -1; p.visible = lid < .75; p.position.set(hp.eye.x + r * .75 * big + (E?.lx ?? 0) * r * .12, hp.eye.y - (E?.ly ?? 0) * r * .5, z * hp.eye.z); p.scale.set(r * .5, r * .55 * (1 - lid * .6), r * .45); });
  const mm = { smile: [.03, .03, .16], grin: [.04, .06, .22], open: [.05, .12, .14], o: [.05, .1, .1], wavy: [.04, .09, .16], beam: [.04, .08, .24], flat: [.03, .02, .12], frown: [.03, .03, .12] }[mouth || 'smile'] || [.03, .03, .14];
  f.mouth.scale.set(...mm.map(v => v * hp.sc));
  f.brow.forEach((b, i) => { b.visible = !!brow; const z = i ? 1 : -1; b.rotation.x = brow === 'angry' ? z * -.5 : brow === 'up' ? 0 : 0; b.position.y = hp.eye.y + r * (brow === 'up' ? 2.1 : 1.45); });
}
function makePip() {
  const g = new THREE.Group(), r = { g };
  mesh(SPH, M.white, g, [0, .58, 0], [.25, .34, .22]);
  r.head = new THREE.Group(); r.head.position.set(.03, 1.0, 0); g.add(r.head); r.head.eye = { x: .2, y: .06, z: .1, r: .085 }; r.head.mouth = { x: .25, y: -.1 }; r.head.sc = 1;
  mesh(SPH, M.white, r.head, [0, 0, 0], [.27, .23, .23]); mesh(SPH, M.nose, r.head, [.27, -.04, 0], [.05, .05, .05]);
  for (const z of [-1, 1]) { mesh(DISC, M.white, r.head, [-.04, .24, z * .2], [.15, .15, .035]); mesh(DISC, M.pink, r.head, [-.03, .24, z * .23], [.09, .09, .02]); }
  r.f = face(g, r.head);
  r.tail = [0, 1, 2].map(() => mesh(BOX, M.pink, g, [0, 0, 0], [.04, .1, .04]));
  r.armB = mesh(BOX, M.black, g); r.armF = mesh(BOX, M.black, g); r.glB = mesh(SPH, M.white, g, [0, 0, 0], [.09, .09, .09]); r.glF = mesh(SPH, M.white, g, [0, 0, 0], [.09, .09, .09]);
  r.legB = mesh(BOX, M.black, g); r.legF = mesh(BOX, M.black, g); r.ftB = mesh(BOX, M.black, g, [0, 0, 0], [.2, .07, .12]); r.ftF = mesh(BOX, M.black, g, [0, 0, 0], [.2, .07, .12]);
  r.cheese = mesh(CONE, M.cheese, g, [0, 0, 0], [.2, .25, .2]); scene.add(g); return r;
}
function makeCat() {
  const g = new THREE.Group(), r = { g };
  r.body = new THREE.Group(); g.add(r.body);
  mesh(SPH, M.fur, r.body, [0, 1.75, 0], [.8, 1.0, .72]); mesh(SPH, M.white, r.body, [.38, 1.65, 0], [.55, .72, .6]);
  r.head = new THREE.Group(); r.head.position.set(.1, 2.98, 0); r.body.add(r.head); r.head.eye = { x: .52, y: .12, z: .3, r: .17 }; r.head.mouth = { x: .62, y: -.2 }; r.head.sc = 2.4;
  mesh(SPH, M.fur, r.head, [0, 0, 0], [.72, .58, .62]); mesh(SPH, M.white, r.head, [.5, -.14, 0], [.34, .26, .36]); mesh(SPH, M.nose, r.head, [.82, -.02, 0], [.09, .08, .1]);
  for (const z of [-1, 1]) { mesh(CONE, M.fur, r.head, [-.1, .66, z * .38], [.22, .5, .16]); mesh(BOX, M.black, r.head, [.2, .52, z * .12 * 1], [.02, .1, .02]); }
  for (const y of [-.14, -.2, -.26]) for (const z of [-1, 1]) mesh(BOX, M.black, r.head, [.78, y, z * .3], [.5, .01, .01]);
  r.f = face(g, r.head);
  r.tail = [0, 1, 2, 3].map(() => mesh(BOX, M.fur, r.body, [0, 0, 0], [.2, .6, .2]));
  r.armB = mesh(BOX, M.black, g); r.armF = mesh(BOX, M.black, g); r.glB = mesh(SPH, M.white, g, [0, 0, 0], [.26, .26, .26]); r.glF = mesh(SPH, M.white, g, [0, 0, 0], [.26, .26, .26]);
  r.legB = mesh(BOX, M.black, g); r.legF = mesh(BOX, M.black, g); r.ftB = mesh(BOX, M.black, g, [0, 0, 0], [.7, .22, .4]); r.ftF = mesh(BOX, M.black, g, [0, 0, 0], [.7, .22, .4]);
  // sleeping version
  r.sl = new THREE.Group(); g.add(r.sl); mesh(SPH, M.fur, r.sl, [0, .7, 0], [1.3, .65, .85]); mesh(SPH, M.white, r.sl, [.35, .55, .5], [.7, .35, .3]);
  for (const i of [0, 1, 2]) mesh(BOX, M.fur, r.sl, [-1.2 + i * .15, .35 + i * .12, .55 + i * .15], [.35, .22, .22]);
  r.sh = new THREE.Group(); r.sh.position.set(1.15, .72, .12); r.sl.add(r.sh); r.sh.eye = { x: .5, y: .1, z: .3, r: .17 }; r.sh.mouth = { x: .62, y: -.18 }; r.sh.sc = 2.4;
  mesh(SPH, M.fur, r.sh, [0, 0, 0], [.72, .58, .62]); mesh(SPH, M.white, r.sh, [.5, -.14, 0], [.34, .26, .36]); mesh(SPH, M.nose, r.sh, [.82, -.02, 0], [.09, .08, .1]);
  for (const z of [-1, 1]) mesh(CONE, M.fur, r.sh, [-.1, .66, z * .38], [.22, .5, .16]);
  r.sf = face(g, r.sh); scene.add(g); return r;
}
const pip = makePip(), cat = makeCat();
const V3 = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const L2 = (p, x, y, side = 0) => V3(x * PX, -y * PX, side);          // 2D local px (y down) -> 3D local
function yaw(dir) { return dir > 0 ? -.45 : Math.PI + .45; }
function placeRoot(r, p) { r.g.visible = p.vis !== false; r.g.position.set(p.x * PX, (K.FL - p.y - (p.hop || 0)) * PX, 0); r.g.rotation.set(0, yaw(p.dir ?? 1), -(p.rot ?? 0) * (p.dir ?? 1)); const k = p.k ?? 1; r.g.scale.set(k * (p.sx ?? 1), k * (p.sy ?? 1), k * (p.sx ?? 1)); }
function gaitFeet(p, big) {
  const a = (p.ph ?? 0) * Math.PI * 2, g = p.gait || 'idle', s = big ? 1 : 1; let fL = big ? [-26, 0] : [-9, 0], fR = big ? [26, 0] : [10, 0], bob = 0, lean = p.lean ?? 0;
  if (!big) { if (g === 'tip') { fL = [12 * Math.sin(a), -9 * Math.max(0, Math.cos(a))]; fR = [-12 * Math.sin(a), -9 * Math.max(0, -Math.cos(a))]; bob = -Math.abs(Math.cos(a)) * 3; } if (g === 'run') { fL = [17 * Math.cos(a), -14 + 14 * Math.sin(a)]; fR = [17 * Math.cos(a + Math.PI), -14 + 14 * Math.sin(a + Math.PI)]; lean = .3; bob = -Math.abs(Math.sin(a)) * 4; } if (g === 'air') { fL = [16, -22]; fR = [-16, -14]; lean = .2; } }
  else { if (g === 'run') { fL = [40 * Math.cos(a), -30 + 30 * Math.sin(a)]; fR = [40 * Math.cos(a + Math.PI), -30 + 30 * Math.sin(a + Math.PI)]; lean = .3; bob = -Math.abs(Math.sin(a)) * 10; } if (g === 'air') { fL = [52, -70]; fR = [-52, -40]; } }
  return { fL, fR, bob, lean };
}
function posePip(p, t) {
  const r = pip; placeRoot(r, p); if (p.vis === false) return;
  const { fL, fR, bob, lean } = gaitFeet(p, false); r.g.rotation.x = 0; r.g.position.y += -bob * PX; r.g.rotation.z += -lean * .6 * (p.dir ?? 1) * -1;
  setFace(r.f, r.head, p.eyes, p.mouth, p.brow);
  const sh = V3(0, .76), aF = p.armF || [20, -50, 'open'], aB = p.armB || [-20, -48, 'open'];
  const hF = L2(r.g, aF[0], aF[1], .22), hB = L2(r.g, aB[0], aB[1], -.22); limb(r.armF, V3(0, .76, .2), hF, .07); limb(r.armB, V3(0, .76, -.2), hB, .07); r.glF.position.copy(hF); r.glB.position.copy(hB);
  const aL = L2(r.g, fL[0], fL[1], .08), aR = L2(r.g, fR[0], fR[1], -.08); limb(r.legF, V3(0, .32, .08), aL, .07); limb(r.legB, V3(0, .32, -.08), aR, .07); r.ftF.position.set(aL.x + .05, aL.y + .03, .08); r.ftB.position.set(aR.x + .05, aR.y + .03, -.08);
  const w = (p.wag ?? 0) * PX; r.tail.forEach((s, i) => { s.position.set(-.26 - i * .1, .36 + i * .08 + w * i, 0); s.rotation.z = 1.2 - i * .2; });
  r.cheese.visible = !!p.cheese; r.cheese.position.copy(hF).add(V3(.07, .08, 0));
}
function poseCat(p, t, S5) {
  const r = cat; r.g.visible = p.vis !== false;
  if (p.sleep) {
    r.body.visible = false; r.sl.visible = true; r.f.eyes.forEach(e => e.visible = false); r.f.pup.forEach(e => e.visible = false); r.f.mouth.visible = false; r.f.brow.forEach(b => b.visible = false);
    [r.armB, r.armF, r.glB, r.glF, r.legB, r.legF, r.ftB, r.ftF].forEach(o => o.visible = false);
    r.g.position.set(p.x * PX, .5, .2); r.g.rotation.set(0, Math.PI + .3, 0); r.g.scale.setScalar(1); r.sl.position.y = 0; r.sl.scale.set(1, 1 + .04 * Math.cos(p.beat * Math.PI * 2), 1);
    r.sf.eyes.forEach(e => e.visible = true); r.sf.pup.forEach(e => e.visible = (p.eyes?.lid ?? 1) < .75); r.sf.mouth.visible = true;
    const lid = t < 6.45 ? .92 : Math.max(0, .92 * (1 - seg(t, 6.45, 6.6))); r.sf.pup.forEach(e => e.visible = lid < .75);
    setFace(r.sf, r.sh, { type: 'open', lid, lx: -.6, ly: 0 }, t < 6.5 ? 'flat' : (K.talk(t, 'b1') || 'grin'), t >= 6.5 && t < 8 ? 'angry' : null); return;
  }
  r.body.visible = true; r.sl.visible = false; [r.armB, r.armF, r.glB, r.glF, r.legB, r.legF, r.ftB, r.ftF].forEach(o => o.visible = true); r.f.eyes.forEach(e => e.visible = true); r.f.mouth.visible = true;
  placeRoot(r, p); const { fL, fR, bob, lean } = gaitFeet(p, true); r.g.position.y += -bob * PX; r.g.rotation.z += lean * .5 * (p.dir ?? 1);
  setFace(r.f, r.head, p.eyes, p.mouth, p.brow); if (p.eyes?.type !== 'sad') r.f.pup.forEach(e => e.visible = (p.eyes?.type !== 'happy' && p.eyes?.type !== 'shut'));
  const aF = S5 ? [30, -30, 'fist'] : (p.armF || [60, -150, 'open']), aB = p.armB || [-60, -150, 'open'];
  const shF = V3(.15, 2.25, .62), shB = V3(.1, 2.25, -.62), hF = L2(r.g, aF[0], aF[1], .75), hB = L2(r.g, aB[0], aB[1], -.75);
  limb(r.armF, shF, hF, .22); limb(r.armB, shB, hB, .22); r.glF.position.copy(hF); r.glB.position.copy(hB);
  const aL = L2(r.g, fL[0], fL[1], .35), aR = L2(r.g, fR[0], fR[1], -.35); limb(r.legF, V3(0, .85, .35), aL, .26); limb(r.legB, V3(0, .85, -.35), aR, .26); r.ftF.position.set(aL.x + .2, aL.y + .1, .35); r.ftB.position.set(aR.x + .2, aR.y + .1, -.35);
  const w = (p.wag ?? 0) * PX; r.tail.forEach((s, i) => { s.position.set(-.85 - i * .22, 1.1 + i * .38 + w, 0); s.rotation.z = .9 + i * .15; });
}
// ---- camera: 2D stage cam {x,y,z} -> perspective camera looking at that point from a little above
const CAMS = [
  () => ({ x: 860, y: 560, z: .92 }), () => null,
  t => ({ x: lerp(1000, 520, ss(seg(t, 8.2, 13.2))), y: 600, z: .98 }),
  () => ({ x: 400, y: 640, z: 1.02 }), () => ({ x: 430, y: 640, z: 1.12 }),
  t => ({ x: lerp(640, 600, seg(t, 27, 30)), y: 760, z: lerp(1.4, 1.5, seg(t, 27, 30)) })
];
const shotAt = t => K.CUTS.filter(c => t >= c).length;
const ZQ = new URLSearchParams(location.search).get('zoom');
function setCam(t, sh) {
  if (ZQ) { const pp = K.pipAt(t); camera.position.set(pp.x * PX + .6, .9, 3.2); camera.lookAt(pp.x * PX, .6, 0); camera.updateMatrixWorld(); return; }
  let cx, cy, dist, yoff = 1.4, xoff = 0;
  if (sh === 1) { const hp = cat.sh.getWorldPosition(new THREE.Vector3()); camera.position.set(hp.x - 1.5, hp.y + .35, 2.7); camera.lookAt(hp.x - .55, hp.y + .02, 0); camera.updateMatrixWorld(); return; }
  const c = CAMS[sh](t); cx = c.x * PX; cy = (K.FL - c.y) * PX; dist = 17.1 / c.z;
  camera.position.set(cx + (sh === 2 ? 1.2 : 2.0) * Math.sin(t * .0), cy + yoff, dist); camera.lookAt(cx, cy - .3, 0); camera.updateMatrixWorld();
}
// ---- overlay (HUD) drawn at 360x270 in pixel font
function hudDraw(t, sh, irisPos) {
  const g = hud; g.clearRect(0, 0, RW, RH); g.imageSmoothingEnabled = false; g.textBaseline = 'top';
  const text = (s, x, y, size, col, sh2 = '#000') => { g.font = `${size}px PS2P`; g.fillStyle = sh2; g.fillText(s, x + 1, y + 1); g.fillStyle = col; g.fillText(s, x, y); };
  if (t < 1.8) { g.textAlign = 'center'; const b = Math.floor(t * 8) % 2; text('CHEESE,', 180, 60 + b, 20, '#ffd23a', '#7a2a00'); text('PLEASE!', 180, 86 + (1 - b), 20, '#ffd23a', '#7a2a00'); if (Math.floor(t * 4) % 2) text('PRESS START', 180, 180, 8, '#fff'); g.textAlign = 'left'; }
  const sub = K.SUBS.find(s => t >= s[0] && t < s[1]);
  if (sub) { g.font = '8px PS2P'; const parts = sub[2].split('   '), w = Math.max(...parts.map(s => g.measureText(s).width)) + 14, h = parts.length * 12 + 8, x = (RW - w) / 2, y = 10; g.fillStyle = 'rgba(10,20,90,.88)'; g.fillRect(x, y, w, h); g.strokeStyle = '#e8e8ff'; g.lineWidth = 1; g.strokeRect(x + .5, y + .5, w - 1, h - 1); parts.forEach((s, i) => text(s, x + 7, y + 6 + i * 12, 8, '#fff')); }
  if (irisPos) { const u = ss(seg(t, 28.0, 29.3)), r = lerp(260, 14, u); g.fillStyle = '#000'; g.beginPath(); g.rect(0, 0, RW, RH); g.moveTo(irisPos[0] + r, irisPos[1]); g.arc(irisPos[0], irisPos[1], r, 0, Math.PI * 2, true); g.fill('evenodd'); }
  if (t >= 29.3) { g.fillStyle = '#000'; g.fillRect(0, 0, RW, RH); g.textAlign = 'center'; text('THE END', 180, 100, 24, '#ffd23a', '#7a2a00'); if (Math.floor(t * 3) % 2) text('PRESS START', 180, 160, 8, '#fff'); g.textAlign = 'left'; }
  // HUD: lives and cheese counter like a platformer
  if (t > 2 && t < 29.3 && sh !== 1 && !irisPos) { text('PIP x3', 6, 252, 8, '#fff'); }
}
function render(t) {
  const sh = shotAt(t), ft = K.frozen(t), tq = Math.floor(ft * 15 + 1e-6) / 15, tq12 = ft;
  const pp = K.pipAt(Math.floor(ft * 12 + 1e-6) / 12), cp = K.catAt(Math.floor(ft * 12 + 1e-6) / 12);   // characters step at 15fps-ish (12 for the shared timeline)
  posePip(pp, ft); poseCat(cp, ft, tq >= 19.5 && tq < 24.7 && sh >= 4); scene.updateMatrixWorld(true);
  const Lw = new THREE.Vector3(-.4, .8, .6).normalize(); setCam(t, sh); UNI.uLight.value.copy(Lw).transformDirection(camera.matrixWorldInverse);
  // timeline-driven props
  cheesePlate.visible = tq < 5.3;
  shelfPots[1].visible = tq < 14.5;
  const fall = tq >= 14.5 && tq < 14.9; potFall.visible = fall; if (fall) { const u = seg(tq, 14.5, 14.9); potFall.position.set(2.3 * 1, lerp(5.9, 3.3, u * u), -1.2 + u * 1.2); potFall.rotation.z = u * 1.2; potFall.scale.set(.4 + .15 * u, .75, .4 + .15 * u); }
  potHead.visible = !!cp.pot && !cp.sleep; if (potHead.visible) potHead.position.set(cp.x * PX + (cp.dir > 0 ? .2 : -.2), 3.9, 0);
  stars.forEach((s, i) => { s.visible = !!cp.stars; if (cp.stars) { const a = tq * 6 + i * 2.09; s.position.set(cp.x * PX + Math.cos(a) * .9, (cp.pot ? 4.5 : 3.8) + Math.sin(a) * .15, Math.sin(a) * .9); s.rotation.y = a; } });
  speedBars.forEach((b, i) => { const vis = !!(cp.speed || pp.speed) && Math.floor(tq * 24) % 2 === 0; b.visible = vis; if (vis) { const src = cp.speed ? cp : pp, d = src.dir ?? -1; b.position.set(src.x * PX - d * (1.2 + i * .5), (src === cp ? 1.2 : .5) + i * .25, .4); b.scale.set(1.2 + hash(tq * 7 + i), .05, .03); } });
  // S5: stretchy arm
  hs.visible = false; const arm = cat.armF;
  if (tq >= 19.5 && tq < 24.7 && sh >= 4) { const k = 1.08, shp = V3(cp.x * PX + .15 * k, (K.FL - 0) * PX * 0 + 2.25 * k, .62), tg = K.armTarget(tq), hnd = V3(tg[0] * PX, (K.FL - tg[1]) * PX, .4); limb(cat.armF, shp, hnd, .24); cat.glF.position.copy(hnd); const tight = ss(seg(tq, 24.25, 24.5)); if (tq >= 23.2) { const mid = shp.clone().lerp(hnd, .5); const kp = mid.clone().lerp(V3(cp.x * PX + 0.4, 2.8, .4), tight * .8); hs.visible = true; hs.geometry = SPH; hs.position.copy(kp); hs.scale.setScalar(lerp(.34, .16, tight)); } }
  // keep a still camera setter (positions updated) and render
  if (sh !== 1) { /* */ }
  renderer.render(scene, camera);
  let ip = null; if (sh === 5 && tq >= 27) { const pw = new THREE.Vector3(pp.x * PX, .6, 0).project(camera); ip = [(pw.x * .5 + .5) * RW, (1 - (pw.y * .5 + .5)) * RH]; }
  hudDraw(t, sh, ip);
}
window.DUR = K.DUR; window.EV = K.EV; window.SUBS = K.SUBS;
window.render = t => render(Math.min(t, K.DUR - 1e-4)); window.READY = true;
