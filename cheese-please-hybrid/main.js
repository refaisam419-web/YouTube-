// Cheese, Please! — hybrid edition: 2D cel characters over a realistic 3D room (level camera so the z=0 plane is an exact screen mapping)
import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { clamp, lerp, seg, ss, hash, TAU } from '/core/lib.js';
import * as K from './tracks.js';
import * as T from './toon.js';
import { mouse, cat, catHeadBig, draw as D } from './chars2.js';
const W = 1920, H = 1080, PX = .01, FOV = 32;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H); renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.2;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('stage').appendChild(renderer.domElement);
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(FOV, W / H, .3, 200);
const PH = '/core/assets/polyhaven/';
const hdr = await new RGBELoader().loadAsync(PH + 'photo_studio_loft_hall_2k.hdr'); hdr.mapping = THREE.EquirectangularReflectionMapping;
scene.environment = hdr; scene.environmentIntensity = .7; scene.background = new THREE.Color('#2a2622');
const key = new THREE.DirectionalLight('#fff0dc', 2.8); key.position.set(-6, 16, 14); key.target.position.set(8.5, 2, 0); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -.0003; key.shadow.normalBias = .04; key.shadow.radius = 6; Object.assign(key.shadow.camera, { left: -14, right: 14, top: 12, bottom: -6, near: 4, far: 60 }); scene.add(key, key.target);
const rim = new THREE.DirectionalLight('#cfe0ff', 1.0); rim.position.set(14, 8, -8); scene.add(rim); scene.add(new THREE.HemisphereLight('#fff4e4', '#8a6a4a', .5));
// ---- realistic materials
const tl = new THREE.TextureLoader(), tex = (f, srgb, rep) => { const t = tl.load(PH + f); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
const mk = (c, o = {}) => new THREE.MeshPhysicalMaterial({ color: c, roughness: o.r ?? .6, metalness: o.m ?? 0, clearcoat: o.cc ?? 0, map: o.map ?? null, normalMap: o.nm ?? null, roughnessMap: o.rm ?? null });
const cvTex = (w, h, fn, rep) => { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.anisotropy = 8; return t; };
let rs = 5; const R = () => (rs = (rs * 16807) % 2147483647) / 2147483647;
const plaster = cvTex(512, 512, (g, w, h) => { g.fillStyle = '#d8ccb6'; g.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${R() > .5 ? '255,250,240' : '90,70,50'},${.02 + R() * .04})`; g.fillRect(R() * w, R() * h, 2 + R() * 5, 2 + R() * 5); } for (let i = 0; i < 14; i++) { g.fillStyle = `rgba(120,100,80,${.03 + R() * .03})`; g.beginPath(); g.ellipse(R() * w, R() * h, 40 + R() * 90, 20 + R() * 50, R() * 3, 0, 7); g.fill(); } }, [6, 2]);
const MAT = {
  floor: mk('#ffe9cf', { map: tex('walnut_diff.jpg', true, [9, 6]), nm: tex('walnut_nor.jpg', false, [9, 6]), rm: tex('walnut_rough.jpg', false, [9, 6]), r: 1, cc: .2 }),
  wall: mk('#ffffff', { map: plaster, r: .9 }), panel: mk('#e8e2d4', { r: .5 }), wood: mk('#ffffff', { map: tex('walnut_diff.jpg', true, [1.2, 1.2]), nm: tex('walnut_nor.jpg', false, [1.2, 1.2]), r: .55, cc: .15 }),
  metal: mk('#8a94a6', { r: .3, m: .7 }), dark: mk('#23262e', { r: .35, m: .5 }), pot: mk('#59606f', { r: .3, m: .6 }), basket: mk('#c79a5a', { r: .85 }), cushion: mk('#b5483c', { r: .8 }),
  white: mk('#f3efe6', { r: .4 }), glass: mk('#9fc7e8', { r: .1, cc: 1 }), hole: mk('#09080a', { r: 1 }), holeRim: mk('#6a4a32', { r: .7 }), puddle: new THREE.MeshPhysicalMaterial({ color: '#e8f2ff', roughness: .05, clearcoat: 1, transparent: true, opacity: .75 }), black: mk('#101014', { r: .4 })
};
const CYL = new THREE.CylinderGeometry(1, 1, 1, 32), SPH = new THREE.SphereGeometry(1, 24, 16), RB = (w, h, d, r = .06) => new RoundedBoxGeometry(w, h, d, 4, r);
const add = (geo, mat, parent, pos = [0, 0, 0], sc = [1, 1, 1]) => { const m = new THREE.Mesh(geo, mat); m.position.set(...pos); m.scale.set(...sc); m.castShadow = m.receiveShadow = true; parent?.add(m); return m; };
const set = new THREE.Group(); scene.add(set);
const floor = add(new THREE.PlaneGeometry(44, 26), MAT.floor, set, [8.5, 0, 6]); floor.rotation.x = -Math.PI / 2; floor.castShadow = false;
add(new THREE.PlaneGeometry(44, 14), MAT.wall, set, [8.5, 7, -1.7]).castShadow = false;
add(RB(44, .6, .25, .05), MAT.panel, set, [8.5, .3, -1.62]); add(RB(44, .12, .3, .03), MAT.panel, set, [8.5, 3.4, -1.6]);
add(RB(44, 3.3, .1, .03), mk('#a9b59d', { r: .7 }), set, [8.5, 1.75, -1.66]).castShadow = false;
add(RB(2.6, 2.8, .22, .06), MAT.panel, set, [6.2, 7.2, -1.62]); add(new THREE.PlaneGeometry(2.2, 2.4), new THREE.MeshBasicMaterial({ color: '#cfe6ff' }), set, [6.2, 7.2, -1.5]).castShadow = false; add(RB(.14, 2.4, .1, .03), MAT.panel, set, [6.2, 7.2, -1.45]); add(RB(2.2, .14, .1, .03), MAT.panel, set, [6.2, 7.2, -1.45]);
const clock = new THREE.Group(); set.add(clock); clock.position.set(12.8, 7, -1.5); add(CYL, MAT.white, clock, [0, 0, 0], [.75, .1, .75]).rotation.x = Math.PI / 2; const cHand = new THREE.Group(); clock.add(cHand); cHand.position.z = .1; add(RB(.07, .5, .04, .02), MAT.black, cHand, [0, .22, 0]);
add(new THREE.CircleGeometry(.88, 32, 0, Math.PI), MAT.holeRim, set, [K.X.hole * PX, 0, -1.54]).castShadow = false; add(new THREE.CircleGeometry(.7, 32, 0, Math.PI), MAT.hole, set, [K.X.hole * PX, 0, -1.52]).castShadow = false;
const table = new THREE.Group(); set.add(table);
add(RB(3.0, .32, 1.2, .08), MAT.wood, table, [10, 3.55, -1.0]); for (const dx of [-1.25, 1.25]) for (const dz of [-.35, .35]) add(RB(.24, 3.4, .24, .06), MAT.wood, table, [10 + dx, 1.7, -1.0 + dz]);
add(CYL, MAT.white, table, [10, 3.76, -1.0], [.75, .05, .75]);
const cheeseG = new THREE.Group(); table.add(cheeseG); cheeseG.position.set(10, 3.8, -1.0);
{ const sh = new THREE.Shape(); sh.moveTo(-.5, 0); sh.lineTo(.5, 0); sh.lineTo(.5, .22); sh.lineTo(-.5, .52); sh.closePath(); const geo = new THREE.ExtrudeGeometry(sh, { depth: .6, bevelEnabled: true, bevelThickness: .04, bevelSize: .04, bevelSegments: 3 }); geo.translate(0, 0, -.3); add(geo, mk('#f4c430', { r: .5, cc: .3 }), cheeseG); for (const [x, y, z, r] of [[-.15, .2, .36, .09], [.2, .13, .36, .07], [0, .34, .36, .06]]) add(SPH, mk('#c9961a', { r: .7 }), cheeseG, [x, y, z], [r, r, .03]); }
const stove = new THREE.Group(); set.add(stove);
add(RB(2.7, 2.8, 1.0, .12), MAT.metal, stove, [2.3, 1.4, -1.1]); add(RB(2.8, .2, 1.1, .06), MAT.dark, stove, [2.3, 2.85, -1.1]); for (const dx of [-.6, .6]) add(CYL, MAT.black, stove, [2.3 + dx, 2.97, -1.1], [.5, .03, .5]); add(RB(2.0, 1.2, .08, .05), mk('#2b3340', { r: .1, cc: 1 }), stove, [2.3, 1.5, -.58]);
add(RB(3.4, .22, .6, .06), MAT.wood, set, [2.3, 5.4, -1.3]);
const shelfPots = [-1, 0, 1].map(i => { const g = new THREE.Group(); set.add(g); g.position.set(2.3 + i * .95, 5.52, -1.3); add(CYL, MAT.pot, g, [0, .38, 0], [.42, .38, .42]); add(RB(.12, .1, .5, .04), MAT.pot, g, [.5, .5, 0]); add(SPH, MAT.pot, g, [0, .78, 0], [.46, .1, .46]); return g; });
const basketG = new THREE.Group(); set.add(basketG); basketG.position.set(K.X.basket * PX, 0, 0); add(CYL, MAT.basket, basketG, [0, .42, 0], [1.9, .42, 1.35]); add(SPH, MAT.cushion, basketG, [0, .72, 0], [1.6, .3, 1.1]);
add(CYL, MAT.puddle, set, [K.X.puddle * PX, .03, .35], [.95, .03, .62]).castShadow = false;
{ const gl = new GLTFLoader(), tea = (await gl.loadAsync(`${PH}tea_set_01/tea_set_01.gltf`)).scene, SC = 15;
  const keep = { tea_set_01_teapot_01: [12.9, -1.3, .6], tea_set_01_teapot_01_lid: [12.9, -1.3, .6], tea_set_01_unused: [0, 0, 0] }, dead = [];
  tea.traverse(o => { if (!o.name.startsWith('tea_set_01_')) return; const k = keep[o.name]; if (!k) dead.push(o); else { o.position.set(k[0] / SC, o.position.y + (o.name.includes('cup_small') ? .012 : 0), k[1] / SC); o.rotation.y = k[2]; } });
  dead.forEach(o => o.parent.remove(o)); tea.scale.setScalar(SC); tea.traverse(m => { if (m.isMesh) m.castShadow = m.receiveShadow = true; }); scene.add(tea); }

// ---- smoothing (average numeric pose fields over a short window)
const frz = K.frozen;
function avgPose(fn, t, w = .11, n = 7) {
  const S = []; for (let i = 0; i < n; i++) S.push(fn(frz(Math.max(0, t + w * (i / (n - 1) * 2 - 1)))));
  const rec = (vals, c) => { if (typeof c === 'number') { const nums = vals.filter(v => typeof v === 'number'); return nums.length === vals.length ? nums.reduce((a, b) => a + b, 0) / n : c; } if (Array.isArray(c)) return c.map((_, i) => rec(vals.map(v => v?.[i]), c[i])); if (c && typeof c === 'object') { const o = {}; for (const k of Object.keys(c)) o[k] = k === 'dir' ? c[k] : rec(vals.map(v => v?.[k]), c[k]); return o; } return c; };
  return rec(S, S[(n - 1) / 2]);
}
// ---- camera: level (no pitch) so stage px map affinely onto the screen
const CAMS = [() => ({ x: 860, y: 540, z: .92 }), () => ({ x: 1480, y: 700, z: 1.0 }), t => ({ x: lerp(1000, 520, ss(seg(t, 8.2, 13.2))), y: 600, z: .98 }), () => ({ x: 400, y: 640, z: 1.02 }), () => ({ x: 430, y: 640, z: 1.12 }), t => ({ x: lerp(640, 600, seg(t, 27, 30)), y: 760, z: lerp(1.4, 1.5, seg(t, 27, 30)) })];
const shotAt = t => K.CUTS.filter(c => t >= c).length, camBase = c => [c.z, 0, 0, c.z, 960 - c.x * c.z, 540 - c.y * c.z];
function setCam(c) { const cx = c.x * PX, cy = (K.FL - c.y) * PX, d = (10.8 / c.z / 2) / Math.tan(FOV * Math.PI / 360); camera.position.set(cx, cy, d); camera.rotation.set(0, 0, 0); camera.updateMatrixWorld(); }
// ---- 2D layer
const cv = document.getElementById('ov'); T.init(cv); const g2 = T.g;
function softShadow(x, y, rx, a) { const m = T.getM(); g2.save(); g2.setTransform(...m); g2.translate(x, y); g2.scale(1, .22); const gr = g2.createRadialGradient(0, 0, 0, 0, 0, rx); gr.addColorStop(0, `rgba(10,6,2,${a})`); gr.addColorStop(.6, `rgba(10,6,2,${a * .5})`); gr.addColorStop(1, 'rgba(10,6,2,0)'); g2.fillStyle = gr; g2.beginPath(); g2.arc(0, 0, rx, 0, TAU); g2.fill(); g2.restore(); }
function potD(x, y, k = 1, rot = 0) { T.push(); T.translate(x, y); T.rotate(rot); T.scale(k); D.sh(T.spline([[-46, -4], [-52, -60], [-40, -76], [40, -76], [52, -60], [46, -4], [0, 4]], true, 6), '#6b7586', { shade: () => D.fillL([[8, -80], [60, -80], [60, 8], [8, 8]], '#4b5362') }); D.sh(T.ell(0, -76, 46, 9), '#9099a8', { lw: 3 }); T.pop(); }
function starD(x, y, r, a) { const pts = []; for (let i = 0; i < 10; i++) { const ang = a + i / 10 * TAU, rr = i % 2 ? r * .45 : r; pts.push([x + Math.cos(ang) * rr, y + Math.sin(ang) * rr]); } D.sh(pts, '#ffd83a', { lw: 2.6 }); }
function puff(x, y, r) { const m = T.getM(); g2.save(); g2.setTransform(...m); const gr = g2.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,250,.85)'); gr.addColorStop(1, 'rgba(255,255,250,0)'); g2.fillStyle = gr; g2.beginPath(); g2.arc(x, y, r, 0, TAU); g2.fill(); g2.restore(); }
function overlay(t, irisPt) {
  const g = g2; g.setTransform(1, 0, 0, 1, 0, 0); g.textBaseline = 'middle'; g.textAlign = 'center';
  if (t < 1.8) { const b = i => Math.sin(t * 8 + i * .5) * 8, s = 'Cheese, Please!'; g.font = '700 128px Fredoka'; let x = 960 - g.measureText(s).width / 2; g.textAlign = 'left'; for (let i = 0; i < s.length; i++) { const ch = s[i], w = g.measureText(ch).width, y = 230 + b(i); g.lineJoin = 'round'; g.lineWidth = 26; g.strokeStyle = '#4a1c08'; g.strokeText(ch, x + 5, y + 8); g.strokeStyle = '#fff'; g.lineWidth = 18; g.strokeText(ch, x, y); g.fillStyle = '#ffc928'; g.fillText(ch, x, y); x += w; } g.textAlign = 'center'; }
  const sub = K.SUBS.find(s => t >= s[0] && t < s[1]);
  if (sub) { g.font = '600 52px Fredoka'; const parts = sub[2].split('   '), w = Math.max(...parts.map(s => g.measureText(s).width)) + 90, h = parts.length * 64 + 28, x = 960 - w / 2, y = 920 - (parts.length - 1) * 64; g.save(); g.shadowColor = 'rgba(0,0,0,.4)'; g.shadowBlur = 22; g.shadowOffsetY = 6; g.fillStyle = 'rgba(255,255,255,.95)'; g.beginPath(); g.roundRect(x, y, w, h, 34); g.fill(); g.restore(); g.fillStyle = '#3a2a2a'; parts.forEach((s, i) => g.fillText(s, 960, y + 46 + i * 64)); }
  if (irisPt) { const u = ss(seg(t, 28.0, 29.3)), r = lerp(1300, 70, u); g.fillStyle = '#16121a'; g.beginPath(); g.rect(0, 0, W, H); g.moveTo(irisPt[0] + r, irisPt[1]); g.arc(irisPt[0], irisPt[1], r, 0, TAU, true); g.fill('evenodd'); }
  if (t >= 29.3) { const u = ss(seg(t, 29.3, 29.6)); g.fillStyle = '#16121a'; g.fillRect(0, 0, W, H); g.font = '700 150px Fredoka'; g.lineJoin = 'round'; g.lineWidth = 30; g.strokeStyle = '#4a1c08'; g.strokeText('The End', 960, lerp(-100, 470, u)); g.fillStyle = '#ffc928'; g.fillText('The End', 960, lerp(-100, 470, u)); }
}
function render(t) {
  const sh = shotAt(t), ft = frz(t), cam = CAMS[sh](t);
  const pp = avgPose(K.pipAt, ft), cp = avgPose(K.catAt, ft);
  cheeseG.visible = ft < 5.3; shelfPots[1].visible = ft < 14.5; cHand.rotation.z = -ft * .2;
  setCam(cam); renderer.render(scene, camera);
  g2.setTransform(1, 0, 0, 1, 0, 0); g2.clearRect(0, 0, W, H);
  T.BASE.splice(0, 6, ...camBase(cam)); T.frame(ft, { amp: 0 }); T.reset();
  const s5 = ft >= 19.5 && ft < 24.7 && sh >= 4;
  if (sh === 1) {   // close-up on the sleeping cat's face (drawn big in screen space over the real room)
    T.BASE.splice(0, 6, 1, 0, 0, 1, 0, 0); T.frame(ft, { amp: 0 }); T.reset(); T.push(); T.translate(930, 1560); T.scale(3.5); const lid = ft < 6.45 ? .93 : Math.max(0, .93 * (1 - seg(ft, 6.45, 6.6)));
    catHeadBig({ type: 'open', lid, lx: -.5, ly: 0 }, ft < 6.5 ? 'flat' : (K.talk(ft, 'b1') || 'grin'), { brow: ft >= 6.5 ? 'angry' : null }); T.pop();
  } else {
    if (pp.vis !== false) softShadow(pp.x, K.FL + 6, 46 * (pp.k ?? 1), .45);
    if (!cp.sleep) softShadow(cp.x, K.FL + 8, 120 * (cp.k ?? 1), .5);
    const speed = (cp.speed || pp.speed) ? (cp.speed ? cp : pp) : null; if (speed && Math.floor(ft * 24) % 2 === 0) for (let i = 0; i < 4; i++) puff(speed.x - (speed.dir ?? -1) * (80 + i * 55), K.FL - 20, 24 + i * 6);
    if (s5) { const k = 1.08, shp = [cp.x + 50 * k, K.FL - 224 * k], tg = K.armTarget(ft), bend = 60 * (1 - ss(seg(ft, 19.5, 22.5)) * .5);
      D.hose(shp, tg, -bend, 26, '#ee9a46'); D.glove(tg[0], tg[1], .9, 1.08, 'grab');
      if (ft >= 23.2) { const tight = ss(seg(ft, 24.25, 24.5)), m = [lerp(shp[0], tg[0], .5), lerp(shp[1], tg[1], .5) + 36], r = lerp(34, 14, tight); D.sh(T.ell(lerp(m[0], 280 + 40, tight * .8), lerp(m[1], 780, tight * .5), r, r * .8), '#cf7a2c', {}); } }
    const cc = { ...cp }; if (s5) { cc.armF = [30, -30, 'fist']; }
    const drawC = () => { cat(cc); if (cp.pot && !cp.sleep) potD(cp.x + (cp.dir > 0 ? 20 : -20), K.FL - 330, 1, Math.sin(ft * 5) * .08); if (ft >= 14.5 && ft < 14.9 && !cp.pot) { const u = seg(ft, 14.5, 14.9); potD(K.X.stove, lerp(440, K.FL - 330, u * u), .6 + .4 * u, u * 1.2); } if (cp.stars) for (let i = 0; i < 3; i++) { const a = ft * 6 + i * TAU / 3; starD(cp.x + Math.cos(a) * 90, K.FL - (cp.pot ? 380 : 360) + Math.sin(a) * 18, 18, a); } };
    const drawP = () => { if (pp.vis !== false) mouse(pp); };
    if (pp.vis !== false && pp.x > cp.x) { drawC(); drawP(); } else { drawP(); drawC(); }
  }
  let ip = null; if (sh === 5 && ft >= 27) { const m = camBase(cam); ip = [m[0] * pp.x + m[4], m[3] * (K.FL - 70) + m[5]]; }
  overlay(t, ip);
}
window.DUR = K.DUR; window.EV = K.EV; window.SUBS = K.SUBS;
await document.fonts.load('600 52px Fredoka'); await document.fonts.load('700 128px Fredoka');
window.render = t => render(Math.min(t, K.DUR - 1e-4)); window.READY = true;
