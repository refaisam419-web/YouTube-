// D-Day in bricks — 10 s Brick Toy film
import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { makePost } from '/core/three/post.js';
import { clamp, seg, eio, ss, lerp } from '/core/lib.js';
import { COL, BRICK, PLATE, brick, plate, mesh, roundGeo, brickGeo, plastic } from './bricks.js';

const W = 1920, H = 1080, DUR = 10, TOP = .3, M = 125, V = (x, y, z) => new THREE.Vector3(x, y, z);
const SSAA = +(new URLSearchParams(location.search).get('ssaa') ?? 2);
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(SSAA === 2 ? 2 : 1); renderer.setSize(W, H);
renderer.toneMapping = THREE.NeutralToneMapping; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('stage').appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, W / H, .5, 3000);
const post = makePost(renderer, scene, camera, W, H, { ssaa: SSAA, ao: true, aoRadius: 3.5, aoThickness: 3, aoAmt: .9 });
post.bloom.strength = .1; post.bloom.threshold = 1.3;
post.vig.uniforms.amt.value = .34; post.vig.uniforms.warm.value = -.3; post.vig.uniforms.contrast.value = .24; post.vig.uniforms.sat.value = 1.1;

// ---- set: walnut desk, studio HDRI, softboxes, real mug + teapot at true scale
const PH = '/core/assets/polyhaven/';
const hdr = await new RGBELoader().loadAsync(PH + 'photo_studio_loft_hall_2k.hdr'); hdr.mapping = THREE.EquirectangularReflectionMapping;
scene.environment = hdr; scene.background = hdr; scene.backgroundBlurriness = .5; scene.backgroundIntensity = .22; scene.environmentIntensity = .45; scene.environmentRotation.y = scene.backgroundRotation.y = 1.2;
const tl = new THREE.TextureLoader(), tex = (f, srgb) => { const t = tl.load(PH + f); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3.5, 3.5); t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
const desk = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), new THREE.MeshStandardMaterial({ map: tex('walnut_diff.jpg', true), normalMap: tex('walnut_nor.jpg'), roughnessMap: tex('walnut_rough.jpg'), roughness: 1 }));
desk.rotation.x = -Math.PI / 2; desk.position.set(0, 0, -20); desk.receiveShadow = true; scene.add(desk);
const key = new THREE.DirectionalLight('#fff4e8', 3.0); key.position.set(-40, 110, 70); key.target.position.set(6, 0, 0);
key.castShadow = true; key.shadow.mapSize.set(4096, 4096); key.shadow.bias = -.0004; key.shadow.normalBias = .03; key.shadow.radius = 4;
Object.assign(key.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 10, far: 400 }); scene.add(key, key.target);
const fill = new THREE.DirectionalLight('#cfe0ff', .45); fill.position.set(60, 40, -50); scene.add(fill);
RectAreaLightUniformsLib.init();
const box = (col, I, w, h, p, at) => { const l = new THREE.RectAreaLight(col, I, w, h); l.position.set(...p); l.lookAt(...at); scene.add(l); };
box('#fff6ee', 6, 70, 45, [-35, 50, 55], [0, 4, 0]); box('#e4eeff', 9, 60, 30, [45, 40, -60], [6, 6, 0]); box('#fff6ee', 4, 50, 30, [20, 60, 30], [10, 2, 0]);
const gl = new GLTFLoader(), tea = (await gl.loadAsync(`${PH}tea_set_01/tea_set_01.gltf`)).scene;
const keep = { tea_set_01_teapot_01: [10, -52, .6], tea_set_01_teapot_01_lid: [10, -52, .6], tea_set_01_cup_small_01: [44, -40, 2.4], tea_set_01_saucer_circular_04: [44, -40, 0] };
const dead = [];
tea.traverse(o => { if (!o.name.startsWith('tea_set_01_')) return; const k = keep[o.name]; if (!k) dead.push(o); else { o.position.set(k[0] / M, o.position.y + (o.name.includes('cup_small') ? .012 : 0), k[1] / M); o.rotation.y = k[2]; } });
dead.forEach(o => o.parent.remove(o)); tea.scale.setScalar(M); tea.traverse(m => { if (m.isMesh) m.castShadow = m.receiveShadow = true; }); scene.add(tea);

// ---- baseplates: blue sea (x -32..0), tan beach (x 0..32), matte
const baseMat = c => new THREE.MeshPhysicalMaterial({ color: c, roughness: .6, clearcoat: .12, clearcoatRoughness: .5 });
const sea = new THREE.Mesh(brickGeo(32, 24, .3), baseMat('#0055bf')); sea.position.set(-16, 0, 0); sea.castShadow = sea.receiveShadow = true; scene.add(sea);
const beach = new THREE.Mesh(brickGeo(32, 24, .3), baseMat('#d8bf8c')); beach.position.set(16, 0, 0); beach.castShadow = beach.receiveShadow = true; scene.add(beach);
for (const [x, z, w] of [[-12, 4, 2], [-20, -5, 3], [-5, -8, 2], [-28, 7, 2], [-16, 9, 3], [-24, 0, 2]]) { const f = plate(w, 1, COL.white, { tile: true }); f.position.set(x, TOP, z); scene.add(f); }  // foam tiles
// hedgehog obstacles on the beach (crossed grey bars)
const hedge = [[5, -4.5], [10, 6.5], [14, -7], [24, 6]].map(([x, z]) => { const g = new THREE.Group(); g.position.set(x, TOP, z);
  for (const [rx, rz] of [[0, 0], [.9, 0], [0, .9]]) { const b = plate(1, 5, COL.dgray); b.rotation.set(rx * .5, rz ? Math.PI / 2 : rx ? .5 : 0, rz * .5); b.position.y = 1.2; g.add(b); }
  const b2 = brick(1, 1, COL.dgray); g.add(b2); scene.add(g); return g; });

// ---- landing boat (bow +x), ramp on a hinge
const boat = new THREE.Group(); scene.add(boat);
const hull = plate(12, 6, COL.dgray); hull.position.y = 0; boat.add(hull);
for (const z of [-2.5, 2.5]) for (let r = 0; r < 2; r++) { const b = brick(12, 1, r ? COL.lgray : COL.dgray); b.position.set(0, PLATE + r * BRICK, z); boat.add(b); }
for (let r = 0; r < 2; r++) { const b = brick(1, 4, r ? COL.lgray : COL.dgray); b.position.set(-5.5, PLATE + r * BRICK, 0); boat.add(b); }
const stripe = brick(1, 4, COL.red, { h: PLATE }); stripe.position.set(-5.5, PLATE + 2 * BRICK, 0); boat.add(stripe);
const hinge = new THREE.Group(); hinge.position.set(6, PLATE, 0); boat.add(hinge);
const ramp = plate(4, 5, COL.lgray); ramp.position.set(2, 0, 0); hinge.add(ramp);
const rampWall = brick(4, 1, COL.dgray, { h: BRICK }); rampWall.visible = false;

// ---- brick figures (rig from the style demo, recoloured as soldiers)
function makeFigure(c) {
  const HIP = PLATE + 2 * BRICK, SH = HIP + PLATE + 2 * BRICK, AL = 3 * BRICK;
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const legs = [-.5, .5].map(x => { const g = new THREE.Group(); g.position.set(x, HIP, 0); body.add(g);
    for (let i = 0; i < 2; i++) { const b = brick(1, 1, c.legs); b.position.y = -HIP + PLATE + i * BRICK; g.add(b); }
    const f = plate(1, 2, COL.black); f.position.set(0, -HIP, .3); g.add(f); return g; });
  const hip = plate(2, 2, COL.dgray); hip.position.y = HIP; body.add(hip);
  for (let i = 0; i < 2; i++) { const b = brick(2, 2, c.torso); b.position.y = HIP + PLATE + i * BRICK; body.add(b); }
  const pack = brick(2, 1, c.legs); pack.position.set(0, HIP + PLATE + .2, -1.5); body.add(pack);
  const arms = [-1.5, 1.5].map(x => { const g = new THREE.Group(); g.position.set(x, SH - .1, 0); body.add(g);
    for (let i = 0; i < 3; i++) { const b = mesh(roundGeo(.5), c.torso); b.position.y = -AL + i * BRICK; g.add(b); } return g; });
  const collar = plate(2, 2, COL.dgray); collar.position.y = SH; body.add(collar);
  const head = new THREE.Group(); head.position.set(0, SH + PLATE, 0); body.add(head);
  const face = mesh(roundGeo(1, BRICK), COL.tan); head.add(face);
  const helm = mesh(roundGeo(1, PLATE * 2), c.helm); helm.scale.set(1.18, 1, 1.18); helm.position.y = BRICK - .1; head.add(helm);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(1.32, 1.32, .12, 40), plastic(c.helm)); brim.position.y = BRICK - .05; head.add(brim);
  const eyeMat = new THREE.MeshStandardMaterial({ color: '#111', roughness: .4 });
  for (const ex of [-.32, .32]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.12, 12, 10), eyeMat); e.position.set(ex, .62, .95); head.add(e); }
  root.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
  function pose(p) {
    root.position.set(p.x, p.y, p.z); root.rotation.y = p.ry ?? 0; body.position.y = p.bob ?? 0; body.rotation.x = p.lean ?? 0;
    legs[0].rotation.x = p.legs?.[0] ?? 0; legs[1].rotation.x = p.legs?.[1] ?? 0;
    const aL = p.armL ?? [0, 0], aR = p.armR ?? [0, 0]; arms[0].rotation.set(aL[0], 0, -aL[1]); arms[1].rotation.set(aR[0], 0, aR[1]); head.rotation.set(p.nod ?? 0, p.look ?? 0, 0);
  }
  return { root, pose };
}
const walkPose = (phi, amp = .55) => { const s = Math.sin(phi); return { legs: [s * amp, -s * amp], armL: [-s * amp * .6, .06], armR: [s * amp * .6, .06], bob: Math.abs(Math.cos(phi)) * .18 }; };
const OLIVE = '#237841', figs = [
  makeFigure({ legs: COL.green, torso: COL.green, helm: COL.dgray }), makeFigure({ legs: COL.green, torso: COL.green, helm: COL.dgray }), makeFigure({ legs: COL.green, torso: COL.green, helm: COL.dgray })];
figs.forEach(f => scene.add(f.root));
// flag
const flag = new THREE.Group(); scene.add(flag);
for (let i = 0; i < 6; i++) { const b = mesh(roundGeo(.5), COL.white); b.position.y = i * BRICK; flag.add(b); }
const cloth = brick(3, 1, COL.red, { h: BRICK * 1.5 }); cloth.position.set(1.5, 6 * BRICK - 1.7, 0); flag.add(cloth); const wb = brick(3, 1, COL.white, { h: PLATE }); wb.position.set(1.5, 6 * BRICK - 1.7 + BRICK * 1.5, 0); flag.add(wb);
flag.visible = false;

// ---- timeline
const T = { ramp: 3.0, walk0: 3.5, flag: 7.3, craneStart: 6.6 };
const VO = [{ id: 'l1', t: 0.4, d: 2.421, text: 'June sixth, nineteen forty-four.' }, { id: 'l2', t: 3.2, d: 2.332, text: 'A thousand boats sailed to one beach.' }, { id: 'l3', t: 7.2, d: 1.242, text: 'And the world turned.' }];
const q = t => Math.floor(t * 12 + 1e-6) / 12;   // bricks and figures step on twos
const BOAT_X = t => lerp(-28, -7, ss(seg(t, 0, 3.0)));
const OFF = [[-3.5, -.8], [-.8, .8], [1.8, 0]], TGT = [[18, -1], [13.5, 4.2], [9, -2.2]];
const STAGGER = i => T.walk0 + i * .35, DIST = i => Math.hypot(TGT[i][0] - (-7 + OFF[i][0]), TGT[i][1] - OFF[i][1]);
const walkDur = i => i === 0 ? 3.0 : 2.5 + i * .05;
function figAt(i, tq) {
  const bx = BOAT_X(tq), x0 = bx + OFF[i][0], z0 = OFF[i][1], t0 = STAGGER(i), t1 = t0 + walkDur(i);
  const y0 = TOP + PLATE;
  if (tq < t0) return { x: x0, y: y0, z: z0, ry: Math.PI / 2, bob: Math.sin(tq * 9 + i) * .03, armL: [-.2, .05], armR: [-.2, .05] };
  const u = seg(tq, t0, t1), ex = TGT[i][0], ez = TGT[i][1], sx = -7 + OFF[i][0], x = lerp(sx, ex, u), z = lerp(z0, ez, u);
  const gy = x < -1 ? y0 : TOP + PLATE * (1 - clamp((x + 1) / 3));
  const moving = u > 0 && u < 1, p = { x, y: gy, z, ry: Math.atan2(ex - sx, ez - z0) };
  if (moving) Object.assign(p, walkPose(Math.hypot(x - sx, z - z0) / 2.6 * Math.PI * 2, .45));
  else Object.assign(p, { armL: [-.2, .05], armR: [-.2, .05] });
  if (i === 0 && tq >= t1) {   // lead: turns, hops, raises both arms as the flag lands
    const f = tq - T.flag; p.ry = lerp(Math.PI / 2, .35, ss(seg(tq, t1, t1 + .4)));
    const arm = f > -.1 ? lerp(-.3, -2.95, ss(seg(tq, T.flag - .1, T.flag + .3))) : -.3; p.armL = p.armR = [arm, .2];
    if (f > .35 && f < .8) p.y += Math.sin(seg(tq, T.flag + .35, T.flag + .8) * Math.PI) * .9;
  }
  return p;
}

// ---- camera on ones (24 fps); focus on the head / the lead
function cam(t) {
  let pos, look, aper;
  if (t < 3.0) { const bx = BOAT_X(t); pos = V(bx + 8, 6.5, 36); look = V(bx + 1, 4.5, 0); aper = 3; }
  else if (t < T.craneStart) { const u = (t - 3.0) / (T.craneStart - 3.0), l = figAt(0, q(t)); pos = V(lerp(0, 8, eio(u)), lerp(9, 8, eio(u)), lerp(34, 26, eio(u))); look = V(l.x + 1, 5.5, l.z); aper = 2.5; }
  else { const u = eio(clamp((t - T.craneStart) / (DUR - T.craneStart))), l = figAt(0, q(t)), a = V(8, 8, 26), b = V(-4, 90, 85);
    pos = a.clone().lerp(b, u); look = V(l.x + 1, 5.5, l.z).lerp(V(8, 1, 0), u); aper = lerp(2.5, .8, u); }
  camera.position.copy(pos); camera.lookAt(look);
  post.dof.focus = pos.distanceTo(look); post.dof.aper = aper; post.dof.maxCoc = 16;
}

// ---- subtitles on a toy pill
const ov = document.getElementById('ov').getContext('2d');
function brickIcon(x, y) { ov.fillStyle = '#c91a09'; ov.beginPath(); ov.roundRect(x, y + 6, 46, 28, 5); ov.fill(); ov.fillStyle = '#e03a2a'; for (const dx of [8, 28]) { ov.beginPath(); ov.roundRect(x + dx, y, 10, 9, 3); ov.fill(); } }
function hud(t) {
  ov.clearRect(0, 0, W, H);
  const L = VO.find(l => t >= l.t - .05 && t <= l.t + Math.max(1.8, l.d + .6)); if (!L) return;
  const a = clamp(seg(t, L.t - .05, L.t + .1)) * (1 - clamp(seg(t, L.t + Math.max(1.8, L.d + .6) - .15, L.t + Math.max(1.8, L.d + .6))));
  ov.save(); ov.globalAlpha = a; ov.font = '600 46px Fredoka'; ov.textBaseline = 'middle';
  const w = ov.measureText(L.text).width + 150, x = (W - w) / 2, y = 905;
  ov.fillStyle = 'rgba(20,24,30,.82)'; ov.beginPath(); ov.roundRect(x, y, w, 90, 45); ov.fill();
  brickIcon(x + 28, y + 28); ov.fillStyle = '#fff'; ov.fillText(L.text, x + 98, y + 47); ov.restore();
}

function render(t) {
  const tq = q(t), bx = BOAT_X(tq);
  boat.position.set(bx, TOP + Math.sin(tq * 5) * .04 * (1 - seg(tq, 2.6, 3.0)), 0); boat.rotation.z = Math.sin(tq * 4) * .01 * (1 - seg(tq, 2.6, 3.0));
  hinge.rotation.z = lerp(1.45, -.12, ss(seg(tq, T.ramp, T.ramp + .3)));
  figs.forEach((f, i) => f.pose(figAt(i, tq)));
  const fl = tq >= T.flag; flag.visible = fl;
  if (fl) { const u = seg(tq, T.flag, T.flag + .25), l = figAt(0, tq); flag.position.set(TGT[0][0] + 3, TOP + (1 - eio(u)) * 8, TGT[0][1] + 1.5); flag.rotation.z = (1 - u) * .5; }
  cam(t); post.composer.render(); hud(t);
}
// sound events for mix.py
const EV = [{ t: 0, type: 'room' }, { t: T.ramp + .3, type: 'click', v: 1.2 }, { t: T.flag + .25, type: 'click', v: 1.4 }, { t: 6.6, type: 'silence', d: .6 }, { t: 9.0, type: 'chord' }];
for (let i = 0; i < 3; i++) for (let f = STAGGER(i) * 12 | 0; f < (STAGGER(i) + walkDur(i)) * 12; f += 3) EV.push({ t: f / 12, type: 'step', v: .4 });
window.render = render; window.DUR = DUR; window.EV = EV; window.VO = VO;
await document.fonts.load('600 46px Fredoka');
render(parseFloat(new URLSearchParams(location.search).get('t') ?? '4'));
window.READY = true;
