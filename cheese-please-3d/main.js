// Cheese, Please! — smooth 3D-cartoon edition (three.js, 24 fps, continuous poses)
import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { clamp, lerp, seg, ss, hash } from '/core/lib.js';
import * as K from './tracks.js';
const W = 1920, H = 1080, PX = .01, FOV = 32, QS = new URLSearchParams(location.search);
const renderer = new THREE.WebGLRenderer({ antialias: QS.get('aa') !== '0', preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H); renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('stage').appendChild(renderer.domElement);
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(FOV, W / H, .3, 200);
const hdr = await new RGBELoader().loadAsync('/core/assets/polyhaven/photo_studio_loft_hall_2k.hdr'); hdr.mapping = THREE.EquirectangularReflectionMapping;
scene.environment = hdr; scene.environmentIntensity = .75; scene.background = new THREE.Color('#e9d9bd');
const key = new THREE.DirectionalLight('#fff1dc', 2.6); key.position.set(-6, 16, 14); key.target.position.set(8.5, 2, 0); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -.0003; key.shadow.normalBias = .04; key.shadow.radius = 5; Object.assign(key.shadow.camera, { left: -14, right: 14, top: 12, bottom: -6, near: 4, far: 60 }); scene.add(key, key.target);
const rim = new THREE.DirectionalLight('#bcd6ff', 1.1); rim.position.set(14, 8, -8); scene.add(rim);
const fill = new THREE.HemisphereLight('#fff6e6', '#b08a62', .55); scene.add(fill);

// ---- materials & textures (smooth, mipmapped)
const cvTex = (w, h, fn, rep = [1, 1]) => { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.anisotropy = 8; return t; };
let rs = 3; const R = () => (rs = (rs * 16807) % 2147483647) / 2147483647;
const floorT = cvTex(512, 512, (g, w, h) => { for (let i = 0; i < 4; i++) { g.fillStyle = ['#c98d55', '#bf8049', '#d29a62', '#c28650'][i]; g.fillRect(0, i * 128, w, 128); g.fillStyle = 'rgba(70,35,10,.35)'; g.fillRect(0, i * 128, w, 3); for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(80,40,10,${.05 + R() * .08})`; g.fillRect(R() * w, i * 128 + 6 + R() * 116, 30 + R() * 120, 1 + R() * 2); } } }, [5, 5]);
const wallT = cvTex(512, 512, (g, w, h) => { g.fillStyle = '#f3c7a0'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 128) { g.fillStyle = '#ecb88c'; g.fillRect(x, 0, 48, h); g.fillStyle = '#fbe0c4'; for (let y = 24; y < h; y += 64) { g.beginPath(); g.arc(x + 88, y, 7, 0, 7); g.fill(); } } }, [9, 2.5]);
const woodT = cvTex(256, 256, (g, w, h) => { g.fillStyle = '#9a6a3f'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 2) { g.fillStyle = `rgba(60,30,8,${.04 + R() * .1})`; g.fillRect(0, y, w, 1); } });
const std = (c, o = {}) => new THREE.MeshPhysicalMaterial({ color: c, roughness: o.r ?? .55, metalness: o.m ?? 0, clearcoat: o.cc ?? .1, clearcoatRoughness: .4, sheen: o.sh ?? 0, sheenColor: new THREE.Color('#fff'), map: o.map ?? null, transparent: !!o.tr, opacity: o.op ?? 1, side: o.side ?? THREE.FrontSide, emissive: o.em ?? '#000000', emissiveIntensity: o.ei ?? 0 });
const M = {
  mouse: std('#f6efe4', { r: .6, sh: .8 }), mouseDk: std('#d9cdbb', { r: .6 }), pink: std('#f2a5b4', { r: .5 }), nosePk: std('#e86f8e', { r: .35, cc: .5 }), black: std('#1a1820', { r: .25, cc: .6 }), white: std('#ffffff', { r: .3, cc: .3 }),
  cat: std('#8f9bb8', { r: .6, sh: .8 }), catDk: std('#6e7a99', { r: .6 }), catW: std('#f7f2ea', { r: .6, sh: .8 }), glove: std('#ffffff', { r: .45, cc: .3 }), shoe: std('#3a2a2a', { r: .35, cc: .5 }),
  cheese: std('#ffcc33', { r: .4, cc: .4 }), cheeseHole: std('#e0a21c', { r: .6 }), wood: std('#ffffff', { map: woodT, r: .55 }), metal: std('#7d8499', { r: .3, m: .6 }), stove: std('#6d7a8e', { r: .4, m: .3 }), pot: std('#4a4f5e', { r: .3, m: .5 }),
  basket: std('#d9a05b', { r: .8 }), cushion: std('#e85c6a', { r: .7 }), white2: std('#f4f1ea', { r: .5 }), puddle: std('#dcefff', { r: .08, cc: 1, tr: true, op: .9 }), star: std('#ffd23a', { em: '#ffb800', ei: 1.2, r: .3 }),
  eyeW: std('#ffffff', { r: .15, cc: 1 }), hole: std('#0d0b10', { r: 1 }), holeRim: std('#8c5a3a', { r: .6 })
};
const SPH = new THREE.SphereGeometry(1, 32, 20), CYL = new THREE.CylinderGeometry(1, 1, 1, 24, 1), CONE = new THREE.ConeGeometry(1, 1, 24), RB = (w, h, d, r = .08) => new RoundedBoxGeometry(w, h, d, 4, r);
const add = (geo, mat, parent, pos = [0, 0, 0], sc = [1, 1, 1]) => { const m = new THREE.Mesh(geo, mat); m.position.set(...pos); m.scale.set(...sc); m.castShadow = m.receiveShadow = true; parent?.add(m); return m; };
const V3 = (x, y, z = 0) => new THREE.Vector3(x, y, z), Y = V3(0, 1, 0), tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

// ---- the kitchen set (units = stage px / 100; characters walk on z = 0)
const set = new THREE.Group(); scene.add(set);
const floor = add(new THREE.PlaneGeometry(44, 26), std('#ffffff', { map: floorT, r: .5, cc: .25 }), set, [8.5, 0, 6]); floor.rotation.x = -Math.PI / 2; floor.castShadow = false;
add(new THREE.PlaneGeometry(44, 14), std('#ffffff', { map: wallT, r: .85, cc: 0 }), set, [8.5, 7, -1.7]).castShadow = false;
add(RB(44, .55, .25, .08), M.white2, set, [8.5, .27, -1.62]);
const win = new THREE.Group(); set.add(win); add(RB(2.5, 2.7, .2, .06), M.white2, win, [6.2, 7.2, -1.62]); add(new THREE.PlaneGeometry(2.1, 2.3), new THREE.MeshBasicMaterial({ color: '#9fd4ff' }), win, [6.2, 7.2, -1.5]).castShadow = false; add(RB(.14, 2.3, .1, .03), M.white2, win, [6.2, 7.2, -1.45]); add(RB(2.1, .14, .1, .03), M.white2, win, [6.2, 7.2, -1.45]);
const clock = new THREE.Group(); set.add(clock); clock.position.set(12.8, 7, -1.5); add(CYL, M.white2, clock, [0, 0, 0], [.75, .12, .75]).rotation.x = Math.PI / 2; add(CYL, std('#ffffff'), clock, [0, 0, .08], [.62, .05, .62]).rotation.x = Math.PI / 2;
const cHand = new THREE.Group(); clock.add(cHand); cHand.position.z = .13; add(RB(.07, .5, .04, .02), M.black, cHand, [0, .22, 0]);
// mousehole
const holeX = K.X.hole * PX; add(new THREE.CircleGeometry(.85, 24, 0, Math.PI), M.holeRim, set, [holeX, 0, -1.44]).castShadow = false; add(new THREE.CircleGeometry(.68, 24, 0, Math.PI), M.hole, set, [holeX, 0, -1.42]).castShadow = false;
// table
const table = new THREE.Group(); set.add(table);
add(RB(3.0, .32, 1.2, .1), M.wood, table, [10, 3.55, -1.0]); for (const dx of [-1.25, 1.25]) for (const dz of [-.35, .35]) add(RB(.24, 3.4, .24, .08), M.wood, table, [10 + dx, 1.7, -1.0 + dz]);
add(CYL, M.white2, table, [10, 3.76, -1.0], [.75, .06, .75]);
const cheeseG = new THREE.Group(); table.add(cheeseG); cheeseG.position.set(10, 3.82, -1.0);
function makeCheese(parent) { const sh = new THREE.Shape(); sh.moveTo(-.5, 0); sh.lineTo(.5, 0); sh.lineTo(.5, .22); sh.lineTo(-.5, .52); sh.closePath(); const geo = new THREE.ExtrudeGeometry(sh, { depth: .6, bevelEnabled: true, bevelThickness: .05, bevelSize: .05, bevelSegments: 3 }); geo.translate(0, 0, -.3); const m = add(geo, M.cheese, parent); for (const [x, y, z, r] of [[-.15, .2, .36, .09], [.2, .13, .36, .07], [0, .34, .36, .06], [.3, .12, -.36, .08]]) add(SPH, M.cheeseHole, parent, [x, y, z], [r, r, .03]); return m; }
makeCheese(cheeseG);
// stove + shelf
const stove = new THREE.Group(); set.add(stove);
add(RB(2.7, 2.8, 1.0, .15), M.stove, stove, [2.3, 1.4, -1.1]); add(RB(2.8, .22, 1.1, .08), M.pot, stove, [2.3, 2.85, -1.1]); for (const dx of [-.6, .6]) add(CYL, M.black, stove, [2.3 + dx, 2.98, -1.1], [.5, .04, .5]);
add(RB(2.0, 1.2, .08, .06), std('#c7d2e0', { r: .2, m: .5 }), stove, [2.3, 1.5, -.58]);
add(RB(3.4, .22, .6, .07), M.wood, set, [2.3, 5.4, -1.3]);
const shelfPots = [-1, 0, 1].map(i => { const g = new THREE.Group(); set.add(g); g.position.set(2.3 + i * .95, 5.52, -1.3); add(CYL, M.pot, g, [0, .38, 0], [.42, .38, .42]); add(RB(.12, .1, .5, .04), M.pot, g, [.5, .5, 0]); add(SPH, M.pot, g, [0, .78, 0], [.46, .1, .46]); return g; });
// basket with cushion
const basketG = new THREE.Group(); set.add(basketG); basketG.position.set(K.X.basket * PX, 0, 0); add(CYL, M.basket, basketG, [0, .42, 0], [1.9, .42, 1.35]); add(SPH, M.cushion, basketG, [0, .72, 0], [1.6, .3, 1.1]);
const puddle = add(CYL, M.puddle, set, [K.X.puddle * PX, .03, .35], [.95, .03, .62]); puddle.castShadow = false;
const potFall = new THREE.Group(); scene.add(potFall); add(CYL, M.pot, potFall, [0, .38, 0], [.42, .38, .42]); add(SPH, M.pot, potFall, [0, .78, 0], [.46, .1, .46]); add(RB(.12, .1, .5, .04), M.pot, potFall, [.5, .5, 0]);
const potHead = new THREE.Group(); scene.add(potHead); add(CYL, M.pot, potHead, [0, .38, 0], [.55, .42, .55]); add(SPH, M.pot, potHead, [0, .8, 0], [.58, .12, .58]);
const stars = [0, 1, 2].map(() => { const m = add(new THREE.IcosahedronGeometry(1, 1), M.star, scene, [0, -9, 0], [.18, .18, .18]); m.castShadow = false; return m; });
const knot = add(SPH, M.black, scene, [0, -9, 0], [.3, .3, .3]);
const dust = [0, 1, 2, 3, 4].map(() => add(SPH, std('#ffffff', { r: .9 }), scene, [0, -9, 0], [.2, .2, .2]));

// ---- limbs: two-segment rubber-hose (joint spheres hide seams)
function Limb(mat, r, parent) {
  const g = new THREE.Group(); parent.add(g);
  const c1 = add(CYL, mat, g), c2 = add(CYL, mat, g), j0 = add(SPH, mat, g, [0, 0, 0], [r, r, r]), j1 = add(SPH, mat, g, [0, 0, 0], [r, r, r]), j2 = add(SPH, mat, g, [0, 0, 0], [r, r, r]);
  return { r, g, update(a, b, bend, bdir) {
    const m = tmp2.copy(a).lerp(b, .5).addScaledVector(bdir, bend);
    const seg = (c, p, q) => { const d = tmp.copy(q).sub(p), len = Math.max(d.length(), 1e-4); c.position.copy(p).addScaledVector(d, .5); c.quaternion.setFromUnitVectors(Y, d.normalize()); c.scale.set(r, len, r); };
    seg(c1, a, m); seg(c2, m, b); j0.position.copy(a); j1.position.copy(m); j2.position.copy(b);
  } };
}
function Glove(parent, s) { const g = new THREE.Group(); parent.add(g); add(SPH, M.glove, g, [0, 0, 0], [s, s * .92, s]); add(SPH, M.glove, g, [s * .4, s * .75, s * .5], [s * .38, s * .38, s * .38]); add(SPH, M.glove, g, [0, -s * .1, 0], [s * 1.12, s * .22, s * 1.12]); return g; }
function Eye(parent, x, y, z, r, tilt = 0) {
  const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
  add(SPH, M.eyeW, g, [0, 0, 0], [r, r * 1.08, r]); const p = add(SPH, M.black, g, [r * .8, 0, 0], [r * .42, r * .62, r * .55]); const hl = add(SPH, std('#ffffff', { em: '#ffffff', ei: 2 }), g, [r * 1.12, r * .22, r * .14], [r * .13, r * .15, r * .15]); hl.castShadow = false;
  const lidMat = g.userData.lidMat = null; return { g, p, hl, r };
}
function Face(head, cfg, skin) {
  const f = { eyes: [Eye(head, cfg.ex, cfg.ey, -cfg.ez, cfg.er), Eye(head, cfg.ex, cfg.ey, cfg.ez, cfg.er)] };
  f.lids = f.eyes.map((e, i) => { const l = add(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), skin, e.g, [0, 0, 0], [e.r * 1.06, e.r * 1.16, e.r * 1.06]); l.castShadow = false; return l; });
  f.brows = [-1, 1].map(s => { const b = add(RB(.04, .035, cfg.er * 1.9, .015), M.black, head, [cfg.ex - .02, cfg.ey + cfg.er * 1.6, s * cfg.ez]); b.visible = false; return b; });
  f.mouthG = new THREE.Group(); f.mouthG.position.set(cfg.mx, cfg.my, 0); head.add(f.mouthG);
  const mk = (shape, mat = M.black) => { const m = new THREE.Mesh(new THREE.ShapeGeometry(shape, 16), mat); m.rotation.y = Math.PI / 2; m.visible = false; f.mouthG.add(m); return m; };
  const arc = (w, d, thick) => { const s = new THREE.Shape(); s.moveTo(-w, 0); s.quadraticCurveTo(0, -d * 2, w, 0); s.lineTo(w - .005, thick); s.quadraticCurveTo(0, -d * 2 + thick, -w + .005, thick); return s; };
  const ell = (rx, ry) => { const s = new THREE.Shape(); s.absellipse(0, 0, rx, ry, 0, Math.PI * 2); return s; };
  const half = (w, h) => { const s = new THREE.Shape(); s.moveTo(-w, 0); s.lineTo(w, 0); s.quadraticCurveTo(w, -h * 1.6, 0, -h * 1.6); s.quadraticCurveTo(-w, -h * 1.6, -w, 0); return s; };
  const sc = cfg.ms; f.mouths = { smile: mk(arc(.11 * sc, .06 * sc, .012 * sc)), grin: mk(half(.14 * sc, .09 * sc)), open: mk(ell(.07 * sc, .1 * sc)), o: mk(ell(.05 * sc, .06 * sc)), flat: mk(arc(.09 * sc, .005, .01 * sc)), wavy: mk(half(.1 * sc, .07 * sc)), beam: mk(half(.16 * sc, .1 * sc)), frown: mk(arc(.09 * sc, -.03 * sc, .012 * sc)) };
  f.mouths.wavy.position.y = 0; f.tongue = null; return f;
}
function setFace(f, E, mouth, brow, big = 1) {
  const t = E?.type || 'open'; let lid = E?.lid ?? 0, sz = 1;
  if (t === 'happy' || t === 'shut') lid = .93; else if (t === 'squeeze') lid = .8; else if (t === 'sad') lid = Math.max(lid, .35); else if (t === 'wide') sz = 1.22;
  f.eyes.forEach((e, i) => { e.g.scale.setScalar(sz); const ang = Math.PI / 2 - lid * Math.PI * .97; f.lids[i].rotation.z = ang; e.p.position.set(e.r * .62, -(E?.ly ?? 0) * e.r * .35, (i ? 1 : -1) * 0 + (E?.lx ?? 0) * 0); e.p.position.x = e.r * .8 + (E?.lx ?? 0) * e.r * .1; e.p.position.y = -(E?.ly ?? 0) * e.r * .3; e.hl.position.y = e.p.position.y + e.r * .24; });
  Object.entries(f.mouths).forEach(([k, m]) => m.visible = k === (mouth || 'smile'));
  f.brows.forEach((b, i) => { b.visible = !!brow; const s = i ? 1 : -1; b.rotation.x = brow === 'angry' ? s * -.5 : brow === 'up' ? 0 : 0; b.position.y = f.eyes[0].g.position.y + f.eyes[0].r * (brow === 'up' ? 2.2 : 1.55) * big; });
}

// ---- Pip (1.2 tall) and Boris (3.3 tall)
function makePip() {
  const root = new THREE.Group(), r = { root }; scene.add(root);
  r.body = add(SPH, M.mouse, root, [0, .56, 0], [.28, .36, .26]);
  r.head = new THREE.Group(); r.head.position.set(.05, 1.0, 0); root.add(r.head);
  add(SPH, M.mouse, r.head, [0, 0, 0], [.32, .27, .28]); add(SPH, M.mouse, r.head, [.24, -.06, 0], [.16, .12, .13]); add(SPH, M.nosePk, r.head, [.39, -.01, 0], [.055, .05, .055]);
  r.ears = [-1, 1].map(s => { const g = new THREE.Group(); g.position.set(-.04, .27, s * .2); r.head.add(g); add(SPH, M.mouse, g, [0, .08, 0], [.19, .2, .05]); add(SPH, M.pink, g, [0, .08, s * .03], [.12, .13, .03]); return g; });
  for (const s of [-1, 1]) add(SPH, M.pink, r.head, [.2, -.1, s * .22], [.06, .045, .03]).material = std('#f7b0b8', { r: .6 });
  r.f = Face(r.head, { ex: .22, ey: .06, ez: .11, er: .095, mx: .36, my: -.16, ms: 1.0 }, M.mouse);
  r.tail = Array.from({ length: 14 }, (_, i) => add(SPH, M.pink, root, [0, 0, 0], Array(3).fill(.032 - i * .0012)));
  r.armF = Limb(M.black, .05, root); r.armB = Limb(M.black, .05, root); r.glF = Glove(root, .1); r.glB = Glove(root, .1);
  r.legF = Limb(M.black, .055, root); r.legB = Limb(M.black, .055, root); r.shF = add(SPH, M.shoe, root, [0, 0, 0], [.14, .065, .09]); r.shB = add(SPH, M.shoe, root, [0, 0, 0], [.14, .065, .09]);
  r.cheese = new THREE.Group(); root.add(r.cheese); makeCheese(r.cheese); r.cheese.scale.setScalar(.36); return r;
}
function makeCat() {
  const root = new THREE.Group(), r = { root }; scene.add(root);
  r.st = new THREE.Group(); root.add(r.st);
  add(SPH, M.cat, r.st, [0, 1.65, 0], [.9, 1.05, .8]); add(SPH, M.catW, r.st, [.4, 1.55, 0], [.55, .75, .64]);
  r.head = new THREE.Group(); r.head.position.set(.1, 2.98, 0); r.st.add(r.head);
  add(SPH, M.cat, r.head, [0, 0, 0], [.82, .66, .72]); add(SPH, M.catW, r.head, [.55, -.2, 0], [.36, .28, .42]); add(SPH, M.nosePk, r.head, [.9, -.03, 0], [.1, .08, .12]);
  for (const s of [-1, 1]) { const e = new THREE.Group(); e.position.set(-.1, .5, s * .4); e.rotation.x = -s * .28; r.head.add(e); add(CONE, M.cat, e, [0, .3, 0], [.3, .6, .22]); add(CONE, M.pink, e, [.06, .26, 0], [.17, .42, .1]); for (const y of [-.14, -.2, -.26]) add(CYL, M.white, r.head, [.78, y, s * .34], [.006, .55, .006]).rotation.set(0, 0, Math.PI / 2 + (y + .2) * 1.6); }
  for (const dx of [-.1, .05, .2]) add(SPH, M.catDk, r.head, [dx, .6, 0], [.03, .1, .03]);
  r.f = Face(r.head, { ex: .55, ey: .14, ez: .3, er: .2, mx: .9, my: -.29, ms: 2.4 }, M.cat);
  r.tail = Array.from({ length: 16 }, (_, i) => add(SPH, M.cat, r.st, [0, 0, 0], Array(3).fill(.2 - i * .006)));
  r.armF = Limb(M.black, .12, root); r.armB = Limb(M.black, .12, root); r.glF = Glove(root, .27); r.glB = Glove(root, .27);
  r.legF = Limb(M.black, .14, root); r.legB = Limb(M.black, .14, root); r.shF = add(SPH, M.shoe, root, [0, 0, 0], [.42, .2, .28]); r.shB = add(SPH, M.shoe, root, [0, 0, 0], [.42, .2, .28]);
  // sleeping version
  r.sl = new THREE.Group(); root.add(r.sl); add(SPH, M.cat, r.sl, [0, .78, 0], [1.35, .72, .95]); add(SPH, M.catW, r.sl, [.2, .6, .62], [.8, .38, .3]);
  r.sTail = Array.from({ length: 6 }, (_, i) => add(SPH, M.cat, r.sl, [-1.3 + i * .2, .45 + Math.sin(i * .8) * .1, .6 + i * .12], [.2, .2, .2]));
  r.sh = new THREE.Group(); r.sh.position.set(1.2, .8, .1); r.sl.add(r.sh); add(SPH, M.cat, r.sh, [0, 0, 0], [.82, .66, .72]); add(SPH, M.catW, r.sh, [.55, -.2, 0], [.36, .28, .42]); add(SPH, M.nosePk, r.sh, [.9, -.03, 0], [.1, .08, .12]);
  for (const s of [-1, 1]) { const e = new THREE.Group(); e.position.set(-.1, .5, s * .4); e.rotation.x = -s * .28; r.sh.add(e); add(CONE, M.cat, e, [0, .3, 0], [.3, .6, .22]); add(CONE, M.pink, e, [.06, .26, 0], [.17, .42, .1]); }
  r.sf = Face(r.sh, { ex: .55, ey: .14, ez: .3, er: .2, mx: .9, my: -.29, ms: 2.4 }, M.cat);
  return r;
}
const pip = makePip(), cat = makeCat();
const L3 = (x, y, z) => V3(x * PX, -y * PX, z);   // stage-local px (y down) -> local units

// ---- smoothing: average numeric pose fields over a short window so key poses blend
const frz = K.frozen;
function avgPose(fn, t, w = .11, n = 7) {
  const samples = []; for (let i = 0; i < n; i++) samples.push(fn(frz(Math.max(0, t + w * (i / (n - 1) * 2 - 1)))));
  const c = samples[(n - 1) / 2];
  const rec = (vals, ctr) => { if (typeof ctr === 'number') { const nums = vals.filter(v => typeof v === 'number'); return nums.length === vals.length ? nums.reduce((a, b) => a + b, 0) / n : ctr; }
    if (Array.isArray(ctr)) return ctr.map((_, i) => rec(vals.map(v => v?.[i]), ctr[i])); if (ctr && typeof ctr === 'object') { const o = {}; for (const k of Object.keys(ctr)) o[k] = rec(vals.map(v => v?.[k]), ctr[k]); return o; } return ctr; };
  return rec(samples, c);
}
const yawOf = dir => lerp(Math.PI + .5, -.5, (clamp(dir, -1, 1) + 1) / 2);
function place(r, p, k0 = 1) { r.root.visible = p.vis !== false; r.root.position.set(p.x * PX, (K.FL - p.y - (p.hop || 0)) * PX, 0); r.root.rotation.set(0, yawOf(p.dir ?? 1), -(p.rot ?? 0) * (p.dir >= 0 ? 1 : -1)); const k = p.k ?? 1; r.root.scale.set(k * (p.sx ?? 1), k * (p.sy ?? 1), k * (p.sx ?? 1)); }
function feet(p, big) {
  const a = (p.ph ?? 0) * Math.PI * 2, g = p.gait || 'idle'; let fL = big ? [-26, 0] : [-9, 0], fR = big ? [26, 0] : [10, 0], bob = 0, lean = p.lean ?? 0;
  if (!big) { if (g === 'tip') { fL = [12 * Math.sin(a), -9 * Math.max(0, Math.cos(a))]; fR = [-12 * Math.sin(a), -9 * Math.max(0, -Math.cos(a))]; bob = -Math.abs(Math.cos(a)) * 3; } if (g === 'run') { fL = [17 * Math.cos(a), -14 + 14 * Math.sin(a)]; fR = [17 * Math.cos(a + Math.PI), -14 + 14 * Math.sin(a + Math.PI)]; lean = .3; bob = -Math.abs(Math.sin(a)) * 4; } if (g === 'air') { fL = [16, -22]; fR = [-16, -14]; lean = .2; } }
  else { if (g === 'run') { fL = [40 * Math.cos(a), -30 + 30 * Math.sin(a)]; fR = [40 * Math.cos(a + Math.PI), -30 + 30 * Math.sin(a + Math.PI)]; lean = .3; bob = -Math.abs(Math.sin(a)) * 10; } if (g === 'air') { fL = [52, -70]; fR = [-52, -40]; } }
  return { fL, fR, bob, lean };
}
const UPV = V3(0, 0, 1);
function tailChain(parts, base, seg, wag, t, up) { parts.forEach((s, i) => { const u = i / (parts.length - 1); s.position.set(base[0] - seg * i * .42 * (7 / parts.length * 1.0), base[1] + up * u * u + Math.sin(t * 4 - i * .35) * wag * u, Math.sin(t * 3 - i * .4) * wag * u * .6); }); }
function posePip(p, t, vel) {
  const r = pip; place(r, p); if (p.vis === false) { return; }
  const { fL, fR, bob, lean } = feet(p, false); r.root.position.y += -bob * PX; r.root.rotation.z += -lean * .55;
  r.root.scale.y *= 1 + clamp(Math.abs(vel.y) * .012, 0, .16);
  setFace(r.f, p.eyes, p.mouth, p.brow); r.ears.forEach((e, i) => e.rotation.x = (i ? -1 : 1) * (.2 + clamp(vel.y * .01, -.5, .5)));
  const aF = p.armF || [20, -50, 'open'], aB = p.armB || [-20, -48, 'open'];
  const hF = L3(aF[0], aF[1], .22), hB = L3(aB[0], aB[1], -.22); r.armF.update(V3(0, .76, .2), hF, .07, V3(0, 0, 1)); r.armB.update(V3(0, .76, -.2), hB, .07, V3(0, 0, -1)); r.glF.position.copy(hF); r.glB.position.copy(hB);
  const aL = L3(fL[0], fL[1], .09), aR = L3(fR[0], fR[1], -.09); r.legF.update(V3(0, .32, .09), aL, .04, V3(1, 0, 0)); r.legB.update(V3(0, .32, -.09), aR, .04, V3(1, 0, 0)); r.shF.position.set(aL.x + .05, aL.y + .04, .09); r.shB.position.set(aR.x + .05, aR.y + .04, -.09);
  tailChain(r.tail, [-.28, .4, 0], .08, (p.wag ?? 0) * PX * .6 + .03, t, .35);
  r.cheese.visible = !!p.cheese; r.cheese.position.copy(hF).add(V3(.12, .02, 0)); r.cheese.rotation.z = -.3;
}
function poseCat(p, t, vel, s5) {
  const r = cat;
  if (p.sleep) {
    r.st.visible = false; r.sl.visible = true; [r.armF, r.armB].forEach(a => 0); r.glF.visible = r.glB.visible = r.shF.visible = r.shB.visible = false; hideLimbs(r, false);
    r.root.visible = true; r.root.position.set(p.x * PX, .5, .25); r.root.rotation.set(0, Math.PI + .35, 0); r.root.scale.setScalar(1); r.sl.scale.set(1, 1 + .035 * Math.sin(t * 2.2), 1);
    const lid = t < 6.45 ? .93 : Math.max(0, .93 * (1 - seg(t, 6.45, 6.6))); setFace(r.sf, { type: 'open', lid, lx: -.5, ly: 0 }, t < 6.5 ? 'flat' : (K.talk(t, 'b1') || 'grin'), t >= 6.5 && t < 8 ? 'angry' : null, 1);
    return;
  }
  r.st.visible = true; r.sl.visible = false; r.glF.visible = r.glB.visible = r.shF.visible = r.shB.visible = true; hideLimbs(r, true);
  place(r, p); const { fL, fR, bob, lean } = feet(p, true); r.root.position.y += -bob * PX; r.root.rotation.z += -lean * .4;
  r.root.scale.y *= 1 + clamp(Math.abs(vel.y) * .008, 0, .12);
  setFace(r.f, p.eyes, p.mouth, p.brow);
  const aF = s5 ? [30, -60, 'fist'] : (p.armF || [60, -150, 'open']), aB = p.armB || [-60, -150, 'open'];
  const shF = V3(.15, 2.25, .78), shB = V3(.1, 2.25, -.78), hF = L3(aF[0], aF[1], .85), hB = L3(aB[0], aB[1], -.85);
  r.armF.update(shF, hF, .2, V3(0, 0, 1)); r.armB.update(shB, hB, .2, V3(0, 0, -1)); r.glF.position.copy(hF); r.glB.position.copy(hB);
  const aL = L3(fL[0], fL[1], .38), aR = L3(fR[0], fR[1], -.38); r.legF.update(V3(0, .85, .38), aL, .12, V3(1, 0, 0)); r.legB.update(V3(0, .85, -.38), aR, .12, V3(1, 0, 0)); r.shF.position.set(aL.x + .2, aL.y + .12, .38); r.shB.position.set(aR.x + .2, aR.y + .12, -.38);
  tailChain(r.tail, [-.9, 1.1, 0], .2, (p.wag ?? 0) * PX * .5 + .12, t, 1.7);
}
function hideLimbs(r, vis) { [r.armF, r.armB, r.legF, r.legB].forEach(l => { l.g.visible = vis; }); }
// give Limb a visibility switch

// ---- camera
const CAMS = [
  () => ({ x: 860, y: 540, z: .92 }), () => null,
  t => ({ x: lerp(1000, 520, ss(seg(t, 8.2, 13.2))), y: 600, z: .98 }),
  () => ({ x: 400, y: 640, z: 1.02 }), () => ({ x: 430, y: 640, z: 1.12 }),
  t => ({ x: lerp(640, 600, seg(t, 27, 30)), y: 760, z: lerp(1.4, 1.5, seg(t, 27, 30)) })
];
const shotAt = t => K.CUTS.filter(c => t >= c).length;
function setCam(t, sh) {
  const sway = Math.sin(t * .9) * .06;
  if (sh === 1) { const hp = cat.sh.getWorldPosition(new THREE.Vector3()); camera.position.set(hp.x - 1.5 + sway, hp.y + .5, 3.7); camera.lookAt(hp.x - .4, hp.y + .0, 0); camera.updateMatrixWorld(); return; }
  const c = CAMS[sh](t), cx = c.x * PX, cy = (K.FL - c.y) * PX, d = (10.8 / c.z / 2) / Math.tan(FOV * Math.PI / 360);
  camera.position.set(cx + sway * 2, cy + 1.2, d); camera.lookAt(cx, cy - .35, 0); camera.updateMatrixWorld();
}
// ---- overlay: captions, title, end card, iris
const ov = document.getElementById('ov').getContext('2d');
function rrect(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
function overlay(t, irisPt) {
  const g = ov; g.clearRect(0, 0, W, H); g.textBaseline = 'middle'; g.textAlign = 'center';
  if (t < 1.8) { const b = i => Math.sin(t * 8 + i * .5) * 8; const s = 'Cheese, Please!'; g.font = '700 128px Fredoka'; let x = 960 - g.measureText(s).width / 2; g.textAlign = 'left';
    for (let i = 0; i < s.length; i++) { const ch = s[i], w = g.measureText(ch).width, y = 230 + b(i); g.lineJoin = 'round'; g.lineWidth = 26; g.strokeStyle = '#6b2a0c'; g.strokeText(ch, x + 5, y + 8); g.strokeStyle = '#fff'; g.lineWidth = 18; g.strokeText(ch, x, y); g.fillStyle = '#ffc928'; g.fillText(ch, x, y); x += w; } g.textAlign = 'center'; }
  const sub = K.SUBS.find(s => t >= s[0] && t < s[1]);
  if (sub) { g.font = '600 52px Fredoka'; const parts = sub[2].split('   '), w = Math.max(...parts.map(s => g.measureText(s).width)) + 90, h = parts.length * 64 + 28, x = 960 - w / 2, y = 920 - (parts.length - 1) * 64; g.save(); g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 22; g.shadowOffsetY = 6; g.fillStyle = 'rgba(255,255,255,.94)'; rrect(g, x, y, w, h, 34); g.fill(); g.restore(); g.fillStyle = '#3a2a2a'; parts.forEach((s, i) => g.fillText(s, 960, y + 14 + 32 + i * 64 + 4)); }
  if (irisPt) { const u = ss(seg(t, 28.0, 29.3)), r = lerp(1300, 70, u); g.fillStyle = '#16121a'; g.beginPath(); g.rect(0, 0, W, H); g.moveTo(irisPt[0] + r, irisPt[1]); g.arc(irisPt[0], irisPt[1], r, 0, Math.PI * 2, true); g.fill('evenodd'); }
  if (t >= 29.3) { const u = ss(seg(t, 29.3, 29.6)); g.fillStyle = '#16121a'; g.fillRect(0, 0, W, H); g.font = '700 150px Fredoka'; g.lineJoin = 'round'; g.lineWidth = 30; g.strokeStyle = '#6b2a0c'; g.strokeText('The End', 960, lerp(-100, 470, u)); g.fillStyle = '#ffc928'; g.fillText('The End', 960, lerp(-100, 470, u)); }
}
function render(t) {
  const sh = shotAt(t), ft = frz(t);
  const pp = avgPose(K.pipAt, ft), cp = avgPose(K.catAt, ft);
  const dt = 1 / 48, pa = avgPose(K.pipAt, frz(ft + dt)), pb = avgPose(K.pipAt, frz(Math.max(0, ft - dt))), ca = avgPose(K.catAt, frz(ft + dt)), cb = avgPose(K.catAt, frz(Math.max(0, ft - dt)));
  const vP = { x: (pa.x - pb.x) / (2 * dt) * PX, y: ((pb.y - pa.y) + (pb.hop || 0) * -1 + (pa.hop || 0)) / (2 * dt) * -PX * -1 }, vC = { x: (ca.x - cb.x) / (2 * dt) * PX, y: (cb.y - ca.y) / (2 * dt) * PX };
  const s5 = ft >= 19.5 && ft < 24.7 && sh >= 4;
  posePip(pp, ft, vP); poseCat(cp, ft, vC, s5);
  cheeseG.visible = ft < 5.3; shelfPots[1].visible = ft < 14.5; cHand.rotation.z = -ft * .2;
  const fall = ft >= 14.5 && ft < 14.9; potFall.visible = fall; if (fall) { const u = seg(ft, 14.5, 14.9); potFall.position.set(2.3, lerp(5.9, 3.4, u * u), -1.3 + u * 1.3); potFall.rotation.z = u * 1.3; }
  potHead.visible = !!cp.pot && !cp.sleep; if (potHead.visible) { potHead.position.set(cp.x * PX + (cp.dir > 0 ? .1 : -.1), 3.72, 0); potHead.rotation.z = Math.sin(ft * 5) * .08; }
  stars.forEach((s, i) => { s.visible = !!cp.stars; if (cp.stars) { const a = ft * 6 + i * 2.09; s.position.set(cp.x * PX + Math.cos(a) * .95, (cp.pot ? 4.7 : 3.9) + Math.sin(a * 1.3) * .12, Math.sin(a) * .95); s.scale.setScalar(.16 + .05 * Math.sin(a * 3)); } });
  dust.forEach((d, i) => { const src = cp.speed ? cp : pp.speed ? pp : null; const sp = !!src && Math.floor(ft * 24) % 2 === 0; d.visible = sp; if (sp) { const dd = src.dir ?? -1, u = ((ft * 3 + i * .3) % 1); d.position.set(src.x * PX - dd * (.9 + i * .55), .15 + u * .3, .5); d.scale.setScalar(.12 + u * .28); } });
  knot.visible = false;
  if (s5) { const k = 1.08, shp = V3(cp.x * PX + .15 * k, 2.25 * k, .78), tg = K.armTarget(ft), hnd = V3(tg[0] * PX, (K.FL - tg[1]) * PX, .2); cat.armF.update(shp, hnd, .25 + .4 * (1 - ss(seg(ft, 19.5, 22.5))) + (ft > 24.25 ? .5 : 0), V3(0, -.3, 1).normalize()); cat.glF.position.copy(hnd);
    if (ft >= 23.2) { const tight = ss(seg(ft, 24.25, 24.5)), mid = shp.clone().lerp(hnd, .5), kp = mid.clone().lerp(V3(cp.x * PX + .5, 2.9, .5), tight * .8); knot.visible = true; knot.position.copy(kp).add(V3(0, -.2, .1)); knot.scale.setScalar(lerp(.36, .17, tight)); } }
  scene.updateMatrixWorld(true); setCam(t, sh);
  renderer.render(scene, camera);
  let ip = null; if (sh === 5 && ft >= 27) { const pw = V3(pp.x * PX, .6, 0).project(camera); ip = [(pw.x * .5 + .5) * W, (1 - (pw.y * .5 + .5)) * H]; }
  overlay(t, ip);
}
window.DUR = K.DUR; window.EV = K.EV; window.SUBS = K.SUBS;
await document.fonts.load('600 52px Fredoka'); await document.fonts.load('700 128px Fredoka');
window.render = t => render(Math.min(t, K.DUR - 1e-4)); window.READY = true;
