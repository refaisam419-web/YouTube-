// Normandy in bricks — Brick Toy style, 12 s
import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { makePost } from '/core/three/post.js';
import { clamp, lerp, seg, ss, hash, mulberry } from '/core/lib.js';
import { COL, BRICK, PLATE, brick, plate, mesh, roundGeo, brickGeo, plastic } from './bricks.js';
const W = 1920, H = 1080, DUR = 12, TOP = .3, M = 125, QS = new URLSearchParams(location.search), SSAA = +(QS.get('ssaa') ?? 1);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(SSAA === 2 ? 2 : 1); renderer.setSize(W, H); renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; document.getElementById('stage').appendChild(renderer.domElement);
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(32, W / H, .5, 3000);
const post = makePost(renderer, scene, camera, W, H, { ssaa: SSAA, ao: true, aoRadius: 3.5, aoThickness: 3, aoAmt: .9 });
post.bloom.strength = .1; post.bloom.threshold = 1.3; post.vig.uniforms.amt.value = .4; post.vig.uniforms.warm.value = -.5; post.vig.uniforms.contrast.value = .26; post.vig.uniforms.sat.value = 1.0;
// ---- real surface: walnut desk under a cool studio HDRI (overcast-neutral), softboxes, a hard-ish key
const PH = '/core/assets/polyhaven/';
const hdr = await new RGBELoader().loadAsync(PH + 'photo_studio_loft_hall_2k.hdr'); hdr.mapping = THREE.EquirectangularReflectionMapping;
scene.environment = hdr; scene.background = hdr; scene.backgroundBlurriness = .6; scene.backgroundIntensity = .2; scene.environmentIntensity = .42; scene.environmentRotation.y = scene.backgroundRotation.y = 1.2;
const tl = new THREE.TextureLoader(), tex = (f, srgb) => { const t = tl.load(PH + f); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3.5, 3.5); t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
const desk = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshStandardMaterial({ map: tex('walnut_diff.jpg', true), normalMap: tex('walnut_nor.jpg'), roughnessMap: tex('walnut_rough.jpg'), roughness: 1 })); desk.rotation.x = -Math.PI / 2; desk.position.set(0, 0, 0); desk.receiveShadow = true; scene.add(desk);
const key = new THREE.DirectionalLight('#f4f1ea', 2.7); key.position.set(-50, 90, 70); key.target.position.set(0, 0, 0); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -.0004; key.shadow.normalBias = .03; key.shadow.radius = 4;
Object.assign(key.shadow.camera, { left: -62, right: 62, top: 62, bottom: -62, near: 10, far: 400 }); scene.add(key, key.target);
const fill = new THREE.DirectionalLight('#cfe0ff', .5); fill.position.set(60, 40, -50); scene.add(fill);
RectAreaLightUniformsLib.init(); const box = (c, I, w, h, p, at) => { const l = new THREE.RectAreaLight(c, I, w, h); l.position.set(...p); l.lookAt(...at); scene.add(l); };
box('#fff6ee', 6, 80, 50, [-45, 55, 60], [0, 4, 0]); box('#e4eeff', 9, 70, 35, [50, 45, -80], [0, 6, 0]);
{ const gl = new GLTFLoader(), tea = (await gl.loadAsync(`${PH}tea_set_01/tea_set_01.gltf`)).scene; const keep = { tea_set_01_teapot_01: [-70, -85, .6], tea_set_01_teapot_01_lid: [-70, -85, .6], tea_set_01_cup_small_01: [64, -78, 2.4], tea_set_01_saucer_circular_04: [64, -78, 0] }, dead = [];
  tea.traverse(o => { if (!o.name.startsWith('tea_set_01_')) return; const k = keep[o.name]; if (!k) dead.push(o); else { o.position.set(k[0] / M, o.position.y + (o.name.includes('cup_small') ? .012 : 0), k[1] / M); o.rotation.y = k[2]; } });
  dead.forEach(o => o.parent.remove(o)); tea.scale.setScalar(M); tea.traverse(m => { if (m.isMesh) m.castShadow = m.receiveShadow = true; }); scene.add(tea); }
// ---- the beach: tan baseplates (land, +z) and blue baseplates (sea, -z), matte
const bpM = c => new THREE.MeshPhysicalMaterial({ color: c, roughness: .55, clearcoat: .1, clearcoatRoughness: .5 });
for (const [x, z, c] of [[-16, 12, '#d8bf8c'], [16, 12, '#d8bf8c'], [-16, 36, '#d8bf8c'], [16, 36, '#d8bf8c'], [-16, -12, '#0b5aa8'], [16, -12, '#0b5aa8'], [-16, -36, '#0b5aa8'], [16, -36, '#0b5aa8']]) { const b = new THREE.Mesh(brickGeo(32, 24, .3), bpM(c)); b.position.set(x, 0, z); b.castShadow = b.receiveShadow = true; scene.add(b); }
// translucent surf plates + white foam tiles
const surf = [], R = mulberry(5);
for (let i = 0; i < 14; i++) { const p = mesh(brickGeo(4, 1, PLATE, { tile: true }), '#7fc4e8', { trans: true }); p.position.set(-26 + i * 4, TOP + .05, -3); scene.add(p); surf.push(p); }
const foam = []; for (let i = 0; i < 16; i++) { const p = plate(2, 1, COL.white, { tile: true }); p.position.set(-28 + R() * 56, TOP + .02, -2 + R() * 3); scene.add(p); foam.push([p, p.position.x, p.position.z, R() * 6]); }
// brick tank-traps ("hedgehogs") and distant landing craft
for (const [x, z, ry] of [[-18, 2, .4], [10, -6, 1.1], [20, 14, 2.0], [-6, 30, .8], [-24, 22, 1.4]]) { const g = new THREE.Group(); g.position.set(x, TOP + .6, z); g.rotation.y = ry; scene.add(g); for (const [rx, rz] of [[0, .6], [.9, 0], [0, -.6]]) { const b = plate(1, 6, COL.dgray); b.rotation.set(rx * .6, 0, rz + .6); b.position.y = 1.6; g.add(b); } }
function boatMesh(x, z, ry) { const g = new THREE.Group(); g.position.set(x, TOP, z); g.rotation.y = ry; scene.add(g); g.add(plate(12, 6, COL.dgray)); for (const zz of [-2.5, 2.5]) for (let r = 0; r < 2; r++) { const b = brick(12, 1, r ? COL.lgray : COL.dgray); b.position.set(0, PLATE + r * BRICK, zz); g.add(b); } for (let r = 0; r < 2; r++) { const b = brick(1, 4, COL.dgray); b.position.set(-5.5, PLATE + r * BRICK, 0); g.add(b); } const ramp = plate(4, 5, COL.lgray); ramp.position.set(8, PLATE + .3, 0); ramp.rotation.z = -.35; g.add(ramp); return g; }
boatMesh(-24, -30, 1.7); boatMesh(14, -40, 1.5); boatMesh(30, -22, 1.9);
// ---- brick-built soldier
const HIP = PLATE + 2 * BRICK, SHO = HIP + PLATE + 2 * BRICK, OLV = '#5a6140', OLD = '#3e4630', SKIN = '#e0b27a';
function makeSoldier(o = {}) {
  const root = new THREE.Group(), r = { root }; scene.add(root);
  r.body = new THREE.Group(); root.add(r.body);
  const mkLeg = x => { const g = new THREE.Group(); g.position.set(x, HIP, 0); r.body.add(g); for (let i = 0; i < 2; i++) { const b = brick(1, 1, OLV); b.position.y = -HIP + PLATE + i * BRICK; g.add(b); } const f = plate(1, 2, COL.black); f.position.set(0, -HIP, .3); g.add(f); return g; };
  r.legL = mkLeg(-.5); r.legR = mkLeg(.5);
  const hip = plate(2, 2, COL.dgray); hip.position.y = HIP; r.body.add(hip);
  for (let i = 0; i < 2; i++) { const b = brick(2, 2, OLV); b.position.y = HIP + PLATE + i * BRICK; r.body.add(b); }
  for (const dx of [-.5, .5]) { const p = brick(1, 1, OLD, { h: BRICK * .8 }); p.position.set(dx, HIP + PLATE + .2, 1.5); r.body.add(p); }
  const pack = brick(2, 1, COL.dgray); pack.position.set(0, HIP + PLATE + .3, -1.5); r.body.add(pack);
  const mkArm = s => { const g = new THREE.Group(); g.position.set(s * 1.5, SHO - .1, 0); r.body.add(g); for (let i = 0; i < 3; i++) { const b = mesh(roundGeo(.5), i === 2 ? SKIN : OLV); b.position.y = -3.6 + i * BRICK; g.add(b); } return g; };
  r.armL = mkArm(-1); r.armR = mkArm(1);
  const collar = plate(2, 2, COL.dgray); collar.position.y = SHO; r.body.add(collar);
  r.head = new THREE.Group(); r.head.position.set(0, SHO + PLATE, 0); r.body.add(r.head);
  const face = mesh(roundGeo(1, BRICK * 2), SKIN); r.head.add(face);
  const hb = mesh(roundGeo(1.5, PLATE * 2), OLD); hb.position.y = BRICK * 2 - .2; r.head.add(hb); const dome = mesh(roundGeo(1, PLATE * 2), OLD); dome.position.y = BRICK * 2 + .4; r.head.add(dome);
  for (const ex of [-.45, .45]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.17, 12, 8), plastic(COL.black)); e.position.set(ex, 1.55, .95); r.head.add(e); }
  r.mouth = new THREE.Mesh(new THREE.CylinderGeometry(.34, .34, .12, 20), plastic(COL.black)); r.mouth.rotation.x = Math.PI / 2; r.mouth.position.set(0, .8, 1.0); r.head.add(r.mouth);
  const rifle = new THREE.Group(); r.body.add(rifle); rifle.position.set(.3, SHO - 1.0, 1.4); rifle.rotation.set(.5, .5, 0); const rb = brick(1, 4, COL.dgray, { h: PLATE }); rb.position.set(0, 0, 0); rifle.add(rb); const st = brick(1, 2, '#8a5a30', { h: PLATE }); st.position.set(0, -.2, -2.8); rifle.add(st);
  r.red = []; if (o.red) for (const [p, par] of [[[.1, -1.2, .5], r.armR], [[-.1, -2.2, .5], r.armL], [[.8, SHO - 2, 1.05], r.body]]) { const b = mesh(roundGeo(.5, PLATE), COL.red); b.position.set(...p); par.add(b); r.red.push(b); }
  root.traverse(m => { if (m.isMesh) m.castShadow = m.receiveShadow = true; }); return r;
}
function poseS(r, p) {
  r.root.visible = p.vis !== false; r.root.position.set(p.x, TOP, p.z); r.root.rotation.set(0, p.ry ?? 0, 0);
  const a = (p.ph ?? 0) * Math.PI * 2, run = p.run ?? 0, kn = p.kneel ?? 0;
  r.body.position.y = -kn * 1.6 + Math.abs(Math.sin(a)) * .25 * run; r.body.rotation.x = -(.12 * run + .3 * kn);
  r.legL.rotation.x = -(Math.sin(a) * .55 * run) - kn * 1.0; r.legR.rotation.x = Math.sin(a) * .55 * run - kn * 1.4;
  r.armL.rotation.set(-1.0, 0, .1); r.armR.rotation.set(-1.15, 0, -.1);
  const m = p.mouth ?? 0; r.mouth.scale.set(.7 + m * .6, 1, .7 + m * 1.0); r.mouth.position.y = lerp(.8, .55, m); r.head.rotation.set(p.nod ?? 0, p.look ?? 0, 0);
}
function tipped(r, x, z, ry, side, seed) { r.root.visible = true; r.root.position.set(x, TOP + .9, z); r.root.rotation.set(0, ry, side * (Math.PI / 2 - .1)); r.legL.rotation.x = -.3; r.legR.rotation.x = .4; r.armL.rotation.set(-.4, 0, .9); r.armR.rotation.set(.3, 0, -1.2); r.mouth.scale.set(1, 1, 1); r.head.rotation.set(.3, .6, 0); }
const lead = makeSoldier({ red: true }), crew = [0, 1, 2, 3, 4].map(i => makeSoldier({ red: i === 2 })), fallen = [0, 1, 2].map(i => makeSoldier({ red: true }));
tipped(fallen[0], -14, 8, 1.0, 1, 1); tipped(fallen[1], 12, -2, 2.2, -1, 2); tipped(fallen[2], -26, -10, .3, 1, 3);
// scattered loose bricks near the fallen figures (they came apart)
for (const [x, z, c, ry] of [[-10, 11, '#5a6140', .4], [-16, 13, COL.tan, 1.2], [9, 1, '#5a6140', 2.0], [15, 0, COL.red, .6], [-22, -8, COL.dgray, 1.5], [-12, 4, COL.red, 2.6]]) { const b = mesh(roundGeo(.5, BRICK), c); b.position.set(x, TOP + .5, z); b.rotation.set(Math.PI / 2, 0, ry); scene.add(b); }
// small brick burst (translucent orange + grey pieces) for the muted boom
const burst = [], Rb = mulberry(33); for (let i = 0; i < 18; i++) { const o = i % 3, b = o ? mesh(roundGeo(.5, o === 1 ? PLATE : BRICK), o === 1 ? '#f2a63a' : COL.lgray, o === 1 ? { trans: true } : {}) : mesh(roundGeo(.5, PLATE), '#f6d34a', { trans: true }); b.visible = false; scene.add(b); const a = Rb() * Math.PI * 2, s = 6 + Rb() * 10; burst.push({ b, vx: Math.cos(a) * s, vz: Math.sin(a) * s, vy: 22 + Rb() * 16, rot: [Rb() * 6, Rb() * 6, Rb() * 6] }); }
const BX = 8, BZ = -16, BT = 5.8;
// ---- timeline
const SUBS = [[.4, 3.7, 'June sixth, nineteen forty-four.'], [3.9, 8.0, 'A thousand boats. One beach. No turning back.'], [8.6, 11.2, 'And still, they kept going.']];
const q = t => Math.floor(t * 12 + 1e-6) / 12, qf = t => Math.floor(t * 24 + 1e-6) / 24;
const LEAD_S2 = { x: -4, z: 8 };
function leadAt(t) {
  if (t < 3.6) { const u = t / 3.6; return { x: lerp(-3, -4, u), z: lerp(-26, 8, ss(u * .3 + u * .7)), ry: 0, ph: t * 2.2, run: 1, mouth: .6 }; }
  if (t < 8.4) { return { x: LEAD_S2.x, z: LEAD_S2.z, ry: -.45, run: 0, kneel: .8 - .08 * Math.sin(t * 2.7), mouth: t < 5.8 ? .35 : (t < 7.2 ? 1.0 : .4), look: -.3 + .25 * Math.sin(t * .9), nod: t > 5.8 && t < 6.4 ? .25 : 0 }; }
  const u = seg(t, 8.4, 12); const st = ss(seg(t, 8.4, 9.3)); return { x: lerp(LEAD_S2.x, -3, ss(seg(t, 9.0, 12))), z: LEAD_S2.z + 60 * Math.pow(seg(t, 9.2, 12), 1.5), ry: lerp(-.45, 0, st), ph: t * 2.2, run: ss(seg(t, 9.1, 10)), kneel: .8 * (1 - st), mouth: .2 };
}
const CREW = [[-14, -30], [-9, -22], [6, -32], [11, -24], [16, -28]];
function crewAt(i, t) { const [x0, z0] = CREW[i], sp = 12.5 + i; const z = t < 3.6 ? z0 + sp * t : (t < 8.4 ? z0 + sp * 3.6 : z0 + sp * 3.6 + 9 * (t - 8.4)); return { x: x0 + Math.sin(i * 2) * 1.5, z, ry: 0, ph: t * 2.0 + i * .31, run: (t < 3.6 || t > 8.4) ? 1 : 0, mouth: .1, vis: !(t >= 3.6 && t < 8.4) }; }
function cam(t) {
  let pos, look, focus, aper;
  if (t < 3.6) { const u = t / 3.6; pos = V(lerp(-7, 3, u), lerp(3.2, 4.0, u), lerp(44, 38, u)); look = V(lerp(-4, -3, u), 4.6, lerp(-14, 4, u)); const l = leadAt(t); focus = pos.distanceTo(V(l.x, 5, l.z)); aper = 2.4; }
  else if (t < 8.4) { const u = seg(t, 3.6, 8.4), shake = t > BT && t < BT + .5 ? Math.sin((t - BT) * 90) * .22 * (1 - seg(t, BT, BT + .5)) : 0; pos = V(lerp(-15, -13, u) + shake, lerp(5.8, 6.4, u), lerp(23, 20.5, u)); look = V(-4.3, 5.4, 7.5); focus = pos.distanceTo(V(-4, 6.0, 8)); aper = 5.2; }
  else { const u = ss(seg(t, 8.4, 12)); pos = V(lerp(-13, 38, u), lerp(6, 120, u), lerp(20, 128, u)); look = V(lerp(-4.3, 0, u), lerp(5.4, 0, u), lerp(7.5, 14, u)); focus = pos.distanceTo(V(0, 0, 14)); aper = lerp(5.0, 1.8, u); }
  camera.position.copy(pos); camera.lookAt(look); camera.updateMatrixWorld(); post.dof.focus = Math.max(3, focus); post.dof.aper = aper; post.dof.maxCoc = 16;
}
const ov = document.getElementById('ov').getContext('2d');
function brickIcon(x, y) { ov.fillStyle = '#c91a09'; ov.beginPath(); ov.roundRect(x, y + 6, 46, 28, 5); ov.fill(); ov.fillStyle = '#e03a2a'; for (const dx of [8, 28]) { ov.beginPath(); ov.roundRect(x + dx, y, 10, 9, 3); ov.fill(); } }
function hud(t) {
  ov.clearRect(0, 0, W, H); ov.textBaseline = 'middle';
  const s = SUBS.find(q => t >= q[0] && t < q[1]); if (s) { const a = clamp(seg(t, s[0], s[0] + .2)) * (1 - clamp(seg(t, s[1] - .25, s[1]))); ov.save(); ov.globalAlpha = a; ov.font = '600 44px Fredoka'; const w = ov.measureText(s[2]).width + 150, x = (W - w) / 2, y = 930; ov.fillStyle = 'rgba(20,24,30,.84)'; ov.beginPath(); ov.roundRect(x, y, w, 88, 44); ov.fill(); brickIcon(x + 28, y + 26); ov.fillStyle = '#fff'; ov.textAlign = 'left'; ov.fillText(s[2], x + 98, y + 46); ov.restore(); }
  const f = ss(seg(t, 11.0, 11.9)); if (f > 0) { ov.fillStyle = `rgba(0,0,0,${f})`; ov.fillRect(0, 0, W, H); }
  if (t < 2.4) { ov.save(); ov.globalAlpha = 1 - ss(seg(t, 1.7, 2.4)); ov.textAlign = 'center'; ov.font = '700 40px Fredoka'; ov.fillStyle = '#fff'; ov.shadowColor = 'rgba(0,0,0,.7)'; ov.shadowBlur = 12; ov.fillText('NORMANDY  ·  6 JUNE 1944', 960, 110); ov.restore(); }
}
function render(t) {
  const tq = q(t);
  poseS(lead, leadAt(tq)); crew.forEach((c, i) => poseS(c, crewAt(i, tq)));
  surf.forEach((p, i) => { p.position.z = -3 + Math.sin(tq * 1.2 + i * .4) * 2.2; p.position.y = TOP + .05 + .1 * Math.sin(tq * 3 + i); });
  foam.forEach(([p, x, z, ph]) => { p.position.z = z + Math.sin(tq * 1.2 + ph) * 2.6; p.position.x = x + Math.sin(tq * .5 + ph) * 1.2; });
  burst.forEach(o => { const u = tq - BT, v = u >= 0 && u < 6; o.b.visible = tq >= BT; if (tq >= BT) { const tt = Math.min(u, 6); let y = TOP + .5 + o.vy * Math.min(tt, 1.4) - 30 * Math.min(tt, 1.4) ** 2; if (tt > 1.4) y = TOP + .5; const ds = Math.min(tt, 1.4); o.b.position.set(BX + o.vx * ds * .5, Math.max(TOP + .4, y), BZ + o.vz * ds * .5); o.b.rotation.set(o.rot[0] * ds, o.rot[1] * ds, o.rot[2] * ds); } });
  key.target.position.set(0, 0, 10); key.target.updateMatrixWorld();
  cam(t); post.composer.render(); hud(t);
}
export const EV = [];
for (let k = 0; k < 14; k++) EV.push({ t: .5 + k * .25, type: 'step' }); for (let k = 0; k < 10; k++) EV.push({ t: 9.2 + k * .28, type: 'step' });
EV.push({ t: BT, type: 'boom' }); for (let k = 0; k < 14; k++) EV.push({ t: BT + .3 + Math.pow(k / 14, 1.5) * 1.4 + hash(k) * .05, type: 'clack' });
window.DUR = DUR; window.EV = EV; window.SUBS = SUBS.map(s => ({ t0: s[0], t1: s[1], text: s[2] }));
await document.fonts.load('600 44px Fredoka'); await document.fonts.load('700 40px Fredoka');
render(parseFloat(QS.get('t') ?? '1')); window.render = render; window.READY = true;
