// Cookie soldiers at Normandy — 14 s. three.js + core/three/post.js (GTAO, depth of field, bloom).
import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { makePost } from '/core/three/post.js';
import { clamp, lerp, seg, ss, eio, hash, mulberry } from '/core/lib.js';
const W = 1920, H = 1080, DUR = 14, QS = new URLSearchParams(location.search), SSAA = +(QS.get('ssaa') ?? 1);
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(SSAA === 2 ? 2 : 1); renderer.setSize(W, H); renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = .95;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('stage').appendChild(renderer.domElement);
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(34, W / H, .5, 900);
const SKY = new THREE.Color('#9aa1a8'); scene.background = SKY; scene.fog = new THREE.FogExp2('#9aa1a8', .0042);
const post = makePost(renderer, scene, camera, W, H, { ssaa: SSAA, ao: true, aoRadius: 3, aoThickness: 3, aoAmt: .95 });
post.bloom.strength = .08; post.bloom.threshold = 1.4; post.vig.uniforms.amt.value = .38; post.vig.uniforms.warm.value = -.5; post.vig.uniforms.contrast.value = .22; post.vig.uniforms.sat.value = .92;
const hdr = await new RGBELoader().loadAsync('/core/assets/polyhaven/lythwood_lounge_2k.hdr'); hdr.mapping = THREE.EquirectangularReflectionMapping; scene.environment = hdr; scene.environmentIntensity = .55;
scene.add(new THREE.HemisphereLight('#d3d8dd', '#8a8780', .95));
const key = new THREE.DirectionalLight('#e6ebf0', 1.3); key.position.set(-40, 70, 50); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -.0004; key.shadow.normalBias = .05; key.shadow.radius = 6;
Object.assign(key.shadow.camera, { left: -38, right: 38, top: 38, bottom: -38, near: 10, far: 220 }); scene.add(key, key.target);

// ---- textures
const R0 = mulberry(9); const cv = (w, h, fn, rep = [1, 1], srgb = true) => { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
const sandT = cv(512, 512, (g, w, h) => { g.fillStyle = '#a49c8c'; g.fillRect(0, 0, w, h); for (let i = 0; i < 26000; i++) { const v = R0(); g.fillStyle = v > .5 ? `rgba(255,248,230,${.05 + R0() * .08})` : `rgba(70,55,35,${.05 + R0() * .1})`; g.fillRect(R0() * w, R0() * h, 1 + R0() * 2, 1 + R0() * 2); } }, [90, 60]);
const bumpT = cv(256, 256, (g, w, h) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { const v = 90 + R0() * 80 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(R0() * w, R0() * h, 1 + R0() * 3, 1 + R0() * 3); } for (let i = 0; i < 26; i++) { g.strokeStyle = 'rgba(30,30,30,.9)'; g.lineWidth = 1 + R0(); g.beginPath(); let x = R0() * w, y = R0() * h; g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (R0() - .5) * 38; y += (R0() - .5) * 38; g.lineTo(x, y); } g.stroke(); } }, [1, 1], false);
const mat = (c, o = {}) => new THREE.MeshPhysicalMaterial({ color: c, roughness: o.r ?? .85, metalness: o.m ?? 0, bumpMap: o.bump ? bumpT : null, bumpScale: o.bs ?? 1.6, clearcoat: o.cc ?? 0, clearcoatRoughness: o.ccr ?? .2, vertexColors: !!o.vc, map: o.map ?? null });
const M = { cookie: mat('#a86f3b', { bump: true, r: .9 }), cookieD: mat('#8a5a30', { bump: true, r: .9 }), olive: mat('#4e5440', { bump: true, r: .8, bs: .8 }), helmet: mat('#3d4536', { r: .55, m: .15, cc: .3 }), dark: mat('#1d1d1f', { r: .5, m: .3 }), black: mat('#08080a', { r: .4 }), jam: mat('#b3121b', { r: .18, cc: 1, ccr: .05 }), mouth: mat('#0a0505', { r: 1 }), tongue: mat('#6b2a24', { r: .7 }), steel: mat('#3a3733', { r: .5, m: .6 }) };
// ---- terrain: sand sloping up away from the sea (sea is at -z), wet band near the waterline
const zS = -22, hT = (x, z) => { const slope = z < zS ? Math.max(-3.2, (z - zS) * .03) : (z - zS) * .02; const dunes = z > 40 ? (Math.sin(x * .05) * Math.sin(z * .04) * 3 + Math.sin(x * .13 + z * .09) * 1) * ss(clamp((z - 40) / 40)) : 0; return slope + dunes + Math.sin(x * .8) * Math.sin(z * .6) * .08; };
const tg = new THREE.PlaneGeometry(900, 520, 260, 160); tg.rotateX(-Math.PI / 2); { const p = tg.attributes.position, col = new Float32Array(p.count * 3); for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, hT(x, z)); const wet = clamp(1 - (z - zS) / 18) * (z > zS - 8 ? 1 : 0), c = new THREE.Color('#ffffff').lerp(new THREE.Color('#8a8272'), wet * .6 + (z < zS ? .5 : 0)); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; } tg.setAttribute('color', new THREE.BufferAttribute(col, 3)); tg.computeVertexNormals(); }
const sandM = mat('#ffffff', { map: sandT, vc: true, r: 1 }); sandM.envMapIntensity = .06; sandM.specularIntensity = 0; const terrain = new THREE.Mesh(tg, sandM); terrain.receiveShadow = true; scene.add(terrain);
// ---- sea: gently animated grey water, plus a foam sheet that swashes up and down the shore
const wg = new THREE.PlaneGeometry(900, 520, 120, 70); wg.rotateX(-Math.PI / 2); const wp = wg.attributes.position, w0 = Float32Array.from(wp.array);
const water = new THREE.Mesh(wg, new THREE.MeshPhysicalMaterial({ color: '#566268', roughness: .4, metalness: 0, clearcoat: .25, clearcoatRoughness: .35, envMapIntensity: .35 })); water.position.set(0, -.05, zS - 250); scene.add(water);
const foamT = cv(256, 128, (g, w, h) => { g.clearRect(0, 0, w, h); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(255,255,255,${.12 + R0() * .3})`; g.beginPath(); g.ellipse(R0() * w, R0() * h, 2 + R0() * 9, 1 + R0() * 3, R0() * 3, 0, 7); g.fill(); } const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); }, [14, 1]);
const foam = new THREE.Mesh(new THREE.PlaneGeometry(900, 26), new THREE.MeshBasicMaterial({ map: foamT, transparent: true, opacity: .8, depthWrite: false, fog: true })); foam.rotation.x = -Math.PI / 2; foam.position.y = .12; scene.add(foam);
if (QS.get('nowater')) water.visible = false;
function animWater(t) { const p = wp; for (let i = 0; i < p.count; i++) { const x = w0[i * 3], z = w0[i * 3 + 2]; p.setY(i, Math.sin(x * .07 + t * .9) * .5 + Math.sin(z * .09 + t * 1.3) * .45 + Math.sin((x + z) * .16 + t * 1.9) * .18); } p.needsUpdate = true; wg.computeVertexNormals(); const sw = Math.sin(t * .8) * 3; foam.position.z = zS + 6 + sw; foam.material.map.offset.x = t * .02; }
// ---- cookie soldier rig
const SPH = new THREE.SphereGeometry(1, 28, 18), CYL = new THREE.CylinderGeometry(1, 1, 1, 20), RB = (w, h, d, r = .3) => new RoundedBoxGeometry(w, h, d, 4, r);
const add = (geo, m, parent, pos = [0, 0, 0], sc = [1, 1, 1]) => { const o = new THREE.Mesh(geo, m); o.position.set(...pos); o.scale.set(...sc); o.castShadow = o.receiveShadow = true; parent?.add(o); return o; };
function jam(parent, x, y, z, s, n = 1) { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); add(SPH, M.jam, g, [0, 0, 0], [s, s * .45, s * .9]); for (let i = 0; i < n; i++) add(SPH, M.jam, g, [(i - n / 2) * s * .6, -s * (.7 + i * .3), s * .3], [s * .22, s * (.5 + i * .2), s * .2]); return g; }
function limb(parent, len, r, mat, sleeve) { const g = new THREE.Group(); parent.add(g); add(CYL, sleeve ?? mat, g, [0, -len / 2, 0], [r, len, r]); add(SPH, sleeve ?? mat, g, [0, 0, 0], [r, r, r]); const e = new THREE.Group(); e.position.set(0, -len, 0); g.add(e); return { g, e }; }
function makeSoldier(seed, o = {}) {
  const R = mulberry(seed), root = new THREE.Group(), r = { root }; scene.add(root);
  r.hip = new THREE.Group(); r.hip.position.y = 5.4; root.add(r.hip);
  add(RB(4.0, 3.0, 2.6, .8), M.olive, r.hip, [0, 0, 0]);
  r.torso = new THREE.Group(); r.torso.position.y = 1.2; r.hip.add(r.torso);
  add(RB(4.6, 4.6, 2.8, 1.0), M.olive, r.torso, [0, 2.2, 0]);
  add(RB(4.7, .55, 3.0, .2), M.dark, r.torso, [0, .2, 0]); add(RB(1.4, 1.4, 1.0, .3), M.olive, r.torso, [-1.3, 1.4, 1.7]); add(RB(1.4, 1.4, 1.0, .3), M.olive, r.torso, [1.3, 1.4, 1.7]);
  add(RB(3.4, 3.8, 1.4, .5), M.olive, r.torso, [0, 2.6, -2.1]); add(RB(3.0, .7, 1.5, .25), M.dark, r.torso, [0, 4.4, -2.1]);   // pack
  add(RB(3.6, .5, .5, .15), M.dark, r.torso, [0, 3.6, 1.55]);                                                                     // strap
  r.head = new THREE.Group(); r.head.position.set(0, 5.4, .15); r.torso.add(r.head);
  add(SPH, M.cookie, r.head, [0, 1.7, 0], [2.7, 2.6, 2.5]);
  add(new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), M.helmet, r.head, [0, 2.75, -.1], [3.15, 2.2, 3.05]); add(new THREE.TorusGeometry(1, .2, 10, 40), M.helmet, r.head, [0, 2.75, -.1], [3.3, 3.2, 1.3]).rotation.x = Math.PI / 2;
  const eyeM = M.black; add(SPH, eyeM, r.head, [-.95, 1.95, 2.25], [.46, .52, .3]); add(SPH, eyeM, r.head, [.95, 1.95, 2.25], [.46, .52, .3]);
  r.mouth = add(SPH, M.mouth, r.head, [0, .8, 2.3], [.5, .4, .22]); r.tongue = add(SPH, M.tongue, r.head, [0, .45, 2.2], [.3, .15, .12]);
  r.chin = add(RB(2.9, .35, .5, .12), M.dark, r.head, [0, -.05, 1.6]);
  const mkA = s => { const a = limb(r.torso, 2.6, .72, M.cookie, M.olive); a.g.position.set(s * 2.9, 4.2, 0); const f = limb(a.e, 2.4, .62, M.cookie); r.torso.add(a.g); a.fore = f; add(SPH, M.cookie, f.e, [0, 0, 0], [.85, .8, .85]); return a; };
  r.armL = mkA(-1); r.armR = mkA(1);
  const mkL = s => { const l = limb(r.hip, 2.9, .95, M.olive); l.g.position.set(s * 1.2, -1.0, 0); const k = limb(l.e, 2.7, .85, M.olive); add(RB(1.7, .9, 2.6, .35), M.dark, k.e, [0, -.25, .5]); return Object.assign(l, { shin: k }); };
  r.legL = mkL(-1); r.legR = mkL(1);
  r.rifle = new THREE.Group(); r.torso.add(r.rifle); r.rifle.position.set(.4, 2.2, 2.2); r.rifle.rotation.set(.45, .55, 0); add(RB(.5, .6, 6.6, .15), M.steel, r.rifle, [0, 0, .6]); add(RB(.6, .9, 1.9, .2), M.cookieD, r.rifle, [0, -.1, -2.7]);
  r.jam = []; if (o.jam) { r.jam.push(jam(r.armR.g, .5, -1.3, .45, .8, 2), jam(r.armL.fore.g, -.5, -1.4, .5, .7, 1), jam(r.torso, 1.5, 2.6, 1.45, .8, 1), jam(r.armR.fore.g, .3, -1.2, .5, .75, 1)); }
  root.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return r;
}
function poseSoldier(r, p) {   // p: {x,z,ry, ph, run, lean, mouth, crouch, dead}
  const y0 = hT(p.x, p.z + 0) + 0 + 40 * 0; r.root.position.set(p.x, hT(p.x, p.z - 40 * 0) , p.z); r.root.rotation.set(0, p.ry ?? 0, 0);
  const a = (p.ph ?? 0) * Math.PI * 2, run = p.run ?? 0, cr = p.crouch ?? 0;
  r.hip.position.y = lerp(5.4, 3.2, cr) + Math.abs(Math.sin(a)) * .7 * run; r.hip.rotation.x = 0;
  r.torso.rotation.x = -(.18 * run + .5 * cr + (p.lean ?? 0)); r.head.rotation.x = .15 * run - .2 * cr + (p.nod ?? 0); r.head.rotation.y = p.look ?? 0;
  const thL = -Math.sin(a) * .95 * run - cr * 1.2, thR = Math.sin(a) * .95 * run - cr * 1.5; r.legL.g.rotation.x = thL; r.legR.g.rotation.x = thR;
  r.legL.shin.g.rotation.x = Math.max(0, Math.sin(a + 1.2)) * 1.3 * run + cr * 2.2 * (1); r.legR.shin.g.rotation.x = Math.max(0, -Math.sin(a + 1.2)) * 1.3 * run + cr * 1.6;
  const arm = (A, s) => { A.g.rotation.set(-.45 + (s ? .05 : -.1) * Math.sin(a) * run, 0, s * -.1); A.fore.g.rotation.x = -.95; };
  arm(r.armL, -1); arm(r.armR, 1); r.armR.g.rotation.x += .15;
  const m = p.mouth ?? 0; r.mouth.scale.set(.5 + m * .62, .35 + m * .95, .25); r.mouth.position.y = lerp(.8, .25, m); r.tongue.visible = m > .3; r.tongue.scale.set(.3 + m * .6, .15 + m * .4, .12); r.tongue.position.y = lerp(.45, .1, m);
  r.root.visible = p.vis !== false;
}
function lieDown(r, x, z, ry, seed) {   // fallen cookie soldier (background): lying on its back, limbs loose
  r.root.position.set(x, hT(x, z) + 1.6, z); r.root.rotation.set(-Math.PI / 2 + .1, ry, 0); r.hip.position.y = 4.4; r.torso.rotation.x = 0; r.head.rotation.set(.3, .5, 0); r.mouth.scale.set(.6, .5, .25); r.tongue.visible = false;
  const R = mulberry(seed); r.legL.g.rotation.set(-.15, 0, -.35); r.legR.g.rotation.set(-.1, 0, .4); r.armL.g.rotation.set(-.4 + R() * .6, 0, -1.0); r.armR.g.rotation.set(-.2, 0, 1.1 + R() * .4); r.armL.fore.g.rotation.x = -.3; r.armR.fore.g.rotation.x = -.5; r.rifle.visible = false;
}
// ---- cast
const lead = makeSoldier(1, { jam: true }), crew = [2, 3, 4, 5, 6, 7].map(i => makeSoldier(i * 11, { jam: i % 3 === 0 })), fallen = [0, 1, 2, 3].map(i => makeSoldier(50 + i, { jam: true }));
lieDown(fallen[0], -22, -10, 1.2, 1); lieDown(fallen[1], 17, -16, 2.4, 2); lieDown(fallen[2], -42, -24, .4, 3); lieDown(fallen[3], 34, -4, 1.9, 4);
fallen.forEach((f, i) => { f.root.position.y += (i === 2 ? -.4 : 0); });
// sand splashes and hedgehog obstacles
for (const [x, z, s, ry] of [[-30, -4, 1, .4], [26, -18, 1.1, 1.1], [4, -26, 1.2, 2], [-8, -30, 1.3, .8], [46, -8, 1, 1.5]]) { const g = new THREE.Group(); g.position.set(x, hT(x, z) + 2.4 * s, z); g.rotation.y = ry; scene.add(g); for (const [rx, rz] of [[0, .6], [.9, 0], [0, -.6]]) { const b = add(RB(.7 * s, 9 * s, .7 * s, .15), M.steel, g); b.rotation.set(rx, 0, rz + .7); } }
// distant landing craft (dark boxes in the haze)
for (const [x, z, s] of [[-80, -120, 1.2], [20, -160, 1.6], [110, -140, 1.3], [-150, -190, 1.8]]) { const g = new THREE.Group(); g.position.set(x, 1, z + 40 - 40); scene.add(g); add(RB(34 * s, 6 * s, 12 * s, 1.2), mat('#4a4f52', { r: .7 }), g); add(RB(9 * s, 7 * s, 8 * s, 1.0), mat('#3a3f42', { r: .7 }), g, [-9 * s, 5 * s, 0]); }
// ---- timeline
const SUBS = [[.5, 3.9, 'June sixth, nineteen forty-four.'], [4.4, 8.6, 'A thousand boats. One beach. No turning back.'], [9.5, 12.0, 'And still, they kept going.']];
const LEAD_S2 = { x: -7, z: -2 };
function leadAt(t) {   // returns a pose
  if (t < 4.0) { const u = t / 4.0; return { x: lerp(-6, -5, u), z: lerp(-74, 6, ss(u * .35 + u * .65)), ry: 0, ph: t * 2.3, run: 1, mouth: .8 }; }
  if (t < 8.6) { const u = seg(t, 4.0, 8.6); return { x: LEAD_S2.x, z: LEAD_S2.z, ry: -.5, ph: 0, run: 0, crouch: .85 - .1 * Math.sin(t * 3), mouth: t < 6.2 ? .95 : lerp(.95, .3, seg(t, 6.2, 7.4)), look: lerp(.2, -.3, u), nod: .1 * Math.sin(t * 7) * (t < 6.2 ? 1 : .3) }; }
  const u = seg(t, 8.6, 14); const stand = ss(seg(t, 8.6, 9.6)); const run = ss(seg(t, 9.4, 10.4));
  return { x: LEAD_S2.x + (-4 - LEAD_S2.x) * ss(seg(t, 9.0, 14)), z: LEAD_S2.z + 140 * Math.pow(seg(t, 9.4, 14), 1.4), ry: lerp(-.5, 0, stand), ph: t * 2.4, run, crouch: 0.85 * (1 - stand), mouth: .15 };
}
const CREW = [[-18, -62], [-12, -50], [9, -66], [14, -54], [24, -58], [-27, -70]];
function crewAt(i, t) { const [x0, z0] = CREW[i], sp = 17 + i * 1.2; const z = z0 + sp * Math.min(t, 4.0) * 1.0 + (t > 8.6 ? 9 * (t - 8.6) : 0) * 0; return { x: x0 + Math.sin(i) * 2, z: t < 4 ? z : (t < 8.6 ? z0 + sp * 4.0 : z0 + sp * 4.0 + 12 * (t - 8.6)), ry: 0, ph: t * 2.1 + i * .37, run: t < 4 || t > 8.6 ? 1 : 0, mouth: .12, vis: !(t >= 4.0 && t < 9.0) }; }
function cam(t) {
  let pos, look, focus, aper;
  if (t < 4.0) { const u = t / 4.0; pos = new THREE.Vector3(lerp(-4, 2, u), lerp(2.6, 3.4, u), lerp(46, 40, u)); look = new THREE.Vector3(lerp(-6, -4, u), 5.5, lerp(-30, -10, u)); const l = leadAt(t); focus = pos.distanceTo(new THREE.Vector3(l.x, 6, l.z)); aper = 3.6; }
  else if (t < 9.0) { const u = seg(t, 4.0, 9.0), sh = (t > 6.15 && t < 6.6) ? Math.sin((t - 6.15) * 80) * .15 * (1 - seg(t, 6.15, 6.6)) : 0; pos = new THREE.Vector3(lerp(-19, -16.5, u) + sh, lerp(9.6, 10.2, u), lerp(13.5, 11.0, u)); look = new THREE.Vector3(-7.4, 9.0 - .3 * u, -2); focus = pos.distanceTo(new THREE.Vector3(-7, 9.6, -1.2)); aper = 6; }
  else { const u = ss(seg(t, 9.0, 14)); pos = new THREE.Vector3(lerp(-10, -22, u), lerp(7, 30, u), lerp(-34, -80, u)); look = new THREE.Vector3(lerp(-6, 0, u), lerp(6, 4, u), lerp(6, 46, u)); const l = leadAt(t); focus = pos.distanceTo(new THREE.Vector3(l.x, 5, l.z)); aper = lerp(4.5, 1.0, u); }
  camera.position.copy(pos); camera.lookAt(look); camera.updateMatrixWorld(); post.dof.focus = Math.max(2, focus); post.dof.aper = aper; post.dof.maxCoc = 16;
}
const ov = document.getElementById('ov').getContext('2d');
function overlay(t) {
  const g = ov; g.clearRect(0, 0, W, H); g.textAlign = 'center'; g.textBaseline = 'middle';
  const s = SUBS.find(q => t >= q[0] && t < q[1]); if (s) { const a = clamp(seg(t, s[0], s[0] + .3)) * (1 - clamp(seg(t, s[1] - .3, s[1]))); g.globalAlpha = a; g.font = '500 46px serif'; g.shadowColor = 'rgba(0,0,0,.8)'; g.shadowBlur = 14; g.fillStyle = '#f2efe8'; g.fillText(s[2], 960, 960); g.shadowBlur = 0; g.globalAlpha = 1; }
  const f = ss(seg(t, 12.6, 13.6)); if (f > 0) { g.fillStyle = `rgba(0,0,0,${f})`; g.fillRect(0, 0, W, H); }
  if (t > 0 && t < 2.4) { g.globalAlpha = 1 - ss(seg(t, 1.6, 2.4)); g.font = '600 38px serif'; g.fillStyle = '#f2efe8'; g.shadowColor = 'rgba(0,0,0,.8)'; g.shadowBlur = 12; g.fillText('NORMANDY  ·  6 JUNE 1944', 960, 110); g.shadowBlur = 0; g.globalAlpha = 1; }
}
function render(t) {
  animWater(t); const q = Math.floor(t * 24 + 1e-6) / 24;
  poseSoldier(lead, leadAt(t)); crew.forEach((c, i) => poseSoldier(c, crewAt(i, t)));
  const l = leadAt(t); key.position.set(l.x - 40, 70, l.z + 50); key.target.position.set(l.x, 0, l.z); key.target.updateMatrixWorld();
  cam(t); post.composer.render(); overlay(t);
}
window.DUR = DUR; window.SUBS = SUBS.map(s => ({ t0: s[0], t1: s[1], text: s[2] })); window.EV = [];
render(parseFloat(QS.get('t') ?? '1'));
window.render = render; window.READY = true;
