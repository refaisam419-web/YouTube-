// Cheese, Please! — flat 2D TV-cartoon edition
import * as T from './toon.js';
import { clamp, lerp, seg, ss, hash, TAU } from '/core/lib.js';
import * as K from './tracks.js';
import { mouse, cat, catHeadBig, draw as D } from './chars2.js';
const W = 1920, H = 1080, FL = K.FL, X = K.X;
const cv = document.getElementById('c'); T.init(cv); const g2 = T.g;
await document.fonts.load('600 52px Fredoka'); await document.fonts.load('700 128px Fredoka');
const bgs = (pts, fill, o = {}) => T.shape(pts, { fill, stroke: false, boil: 0, ...o });
const bgl = (pts, col, lw = 3) => T.shape(pts, { closed: false, line: col, lw, boil: 0, fill: null });
const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
const OUT = '#4a3028';
function kitchen(t, tq) {
  const br = 1 + .03 * Math.cos(tq / K.BEAT * TAU);
  bgs(rect(-900, -400, 3800, 1000), '#f4f1e9');                                                              // wall
  for (let x = -900; x < 2800; x += 230) { bgs(rect(x, 20, 220, 320), '#dfe3e8'); bgs(rect(x, 296, 220, 34), '#b3bac4'); bgs(rect(x + 92, 286, 36, 8), '#6f7784'); bgl([[x, 20], [x, 330]], '#9aa3ae', 3); }   // upper cabinets
  bgs(rect(-900, 520, 3800, 190), '#ffbe2e');                                                                 // splashback
  for (let x = -900; x < 2800; x += 80) { bgs(rect(x, 570, 80, 66), '#f08a1c'); bgl([[x, 570], [x, 636]], '#c8680f', 3); }
  bgl([[-900, 570], [2900, 570]], '#c8680f', 3); bgl([[-900, 636], [2900, 636]], '#c8680f', 3);
  bgs(rect(-900, 690, 3800, 20), '#c9ced6');                                                                 // counter edge
  for (let x = -900; x < 2800; x += 260) { bgs(rect(x, 710, 250, 180), '#eef0f3'); bgs(rect(x + 100, 726, 50, 8), '#6f7784'); bgl([[x, 710], [x, 890]], '#aab1bb', 3); }   // lower cabinets
  bgs(rect(-900, 888, 3800, 20), '#98a0ab');                                                                  // plinth
  // perspective tile floor
  bgs([[-900, 908], [2900, 908], [2900, 1500], [-900, 1500]], '#f9b94e');
  bgs([[420, 908], [1010, 908], [1700, 1500], [380, 1500]], '#ffd27c', { alpha: .65 });                       // sunlight patch
  const vpx = 1000, vpy = 380;
  for (let x0 = -2000; x0 <= 4000; x0 += 200) bgl([[x0, 908], [vpx + (x0 - vpx) * (1500 - vpy) / (908 - vpy), 1500]], '#e29225', 3);
  for (let k = 0; k < 9; k++) { const y = 908 + 58 * Math.pow(k + 1, 1.4) * .55; bgl([[-900, y], [2900, y]], '#e29225', 3); }
  // mousehole
  bgs(T.spline([[X.hole - 70, 908], [X.hole - 70, 850], [X.hole, 806], [X.hole + 70, 850], [X.hole + 70, 908]], true, 6), '#8a5a38'); bgs(T.spline([[X.hole - 54, 908], [X.hole - 54, 856], [X.hole, 822], [X.hole + 54, 856], [X.hole + 54, 908]], true, 6), '#2a1d18');
  // table with the cheese plate
  T.push(); T.translate(X.table, FL); T.scale(br, 2 - br); T.translate(-X.table, -FL);
  D.sh(rect(X.table - 150, 606, 300, 44), '#e07a28', { shade: () => D.fillL([[X.table - 150, 632], [X.table + 150, 632], [X.table + 150, 650], [X.table - 150, 650]], '#bd5f1a') });
  for (const dx of [-124, 102]) D.sh(rect(X.table + dx, 650, 24, FL - 650), '#c8651d', {});
  D.sh(T.ell(X.table, 606, 74, 13), '#fffdf6', { lw: 3 });
  T.pop();
  // stove + shelf with pots
  T.push(); T.translate(X.stove, FL); T.scale(br, 2 - br); T.translate(-X.stove, -FL);
  D.sh(rect(X.stove - 130, 700, 260, FL - 700), '#9aa3b0', { shade: () => D.fillL([[X.stove + 40, 700], [X.stove + 130, 700], [X.stove + 130, FL], [X.stove + 40, FL]], '#818a98') });
  D.sh(rect(X.stove - 130, 676, 260, 28), '#4f5663', {}); D.sh(T.ell(X.stove, 800, 80, 58), '#3b414c', { lw: 3 }); D.sh(rect(X.stove - 90, 880, 180, 12), '#4f5663', {});
  T.pop();
  D.sh(rect(X.stove - 160, 440, 320, 22), '#a8683a', {});
  const pots = [-95, 0, 95]; pots.forEach((dx, i) => { if (i === 1 && tq >= 14.5) return; potD(X.stove + dx, 440, .55 + (i === 1 ? .05 : 0)); });
  // basket
  D.sh(T.ell(X.basket, FL - 6, 156, 40), '#b8803f', { lw: 3 }); D.sh([[X.basket - 156, FL - 6], [X.basket - 134, FL - 74], [X.basket + 134, FL - 74], [X.basket + 156, FL - 6]], '#d49a52', { lw: 3 });
  for (let i = -4; i <= 4; i++) bgl([[X.basket + i * 30, FL - 70], [X.basket + i * 33, FL - 10]], '#a8702f', 3);
  D.sh(T.ell(X.basket, FL - 72, 130, 22), '#e35a50', { lw: 3 });
  // milk puddle
  D.sh(T.ell(X.puddle, FL + 8, 96, 22), '#d8ecff', { lw: 3 }); bgs(T.ell(X.puddle - 24, FL + 3, 26, 6), '#ffffff');
  if (tq < 5.3) D.cheese(X.table, 604, 1.15);
}
function potD(x, y, k = 1, rot = 0) { T.push(); T.translate(x, y); T.rotate(rot); T.scale(k); D.sh(T.spline([[-46, -4], [-52, -60], [-40, -76], [40, -76], [52, -60], [46, -4], [0, 4]], true, 6), '#6b7586', { shade: () => D.fillL([[8, -80], [60, -80], [60, 8], [8, 8]], '#4b5362') }); D.sh(T.ell(0, -76, 46, 9), '#98a1b0', { lw: 3 }); T.pop(); }
function starD(x, y, r, a) { const pts = []; for (let i = 0; i < 10; i++) { const ang = a + i / 10 * TAU, rr = i % 2 ? r * .45 : r; pts.push([x + Math.cos(ang) * rr, y + Math.sin(ang) * rr]); } D.sh(pts, '#ffd83a', { lw: 2.6 }); }
function softShadow(x, y, rx, a) { g2.save(); g2.setTransform(...T.getM()); g2.translate(x, y); g2.scale(1, .2); g2.fillStyle = `rgba(150,80,10,${a})`; g2.beginPath(); g2.arc(0, 0, rx, 0, TAU); g2.fill(); g2.restore(); }
function puff(x, y, r) { g2.save(); g2.setTransform(...T.getM()); g2.fillStyle = 'rgba(255,255,255,.8)'; g2.beginPath(); g2.arc(x, y, r, 0, TAU); g2.fill(); g2.restore(); }
// ---- smoothing
const frz = K.frozen;
function avgPose(fn, t, w = .11, n = 7) {
  const S = []; for (let i = 0; i < n; i++) S.push(fn(frz(Math.max(0, t + w * (i / (n - 1) * 2 - 1)))));
  const rec = (vals, c) => { if (typeof c === 'number') { const nums = vals.filter(v => typeof v === 'number'); return nums.length === vals.length ? nums.reduce((a, b) => a + b, 0) / n : c; } if (Array.isArray(c)) return c.map((_, i) => rec(vals.map(v => v?.[i]), c[i])); if (c && typeof c === 'object') { const o = {}; for (const k of Object.keys(c)) o[k] = k === 'dir' ? c[k] : rec(vals.map(v => v?.[k]), c[k]); return o; } return c; };
  return rec(S, S[(n - 1) / 2]);
}
const CAMS = [() => ({ x: 860, y: 540, z: .92 }), () => null, t => ({ x: lerp(1000, 520, ss(seg(t, 8.2, 13.2))), y: 600, z: .98 }), () => ({ x: 400, y: 640, z: 1.02 }), () => ({ x: 430, y: 640, z: 1.12 }), t => ({ x: lerp(640, 600, seg(t, 27, 30)), y: 760, z: lerp(1.4, 1.5, seg(t, 27, 30)) })];
const shotAt = t => K.CUTS.filter(c => t >= c).length, camBase = c => [c.z, 0, 0, c.z, 960 - c.x * c.z, 540 - c.y * c.z];
function overlay(t, irisPt) {
  const g = g2; g.setTransform(1, 0, 0, 1, 0, 0); g.textBaseline = 'middle'; g.textAlign = 'center';
  if (t < 1.8) { const b = i => Math.sin(t * 8 + i * .5) * 8, s = 'Cheese, Please!'; g.font = '700 128px Fredoka'; let x = 960 - g.measureText(s).width / 2; g.textAlign = 'left'; for (let i = 0; i < s.length; i++) { const ch = s[i], w = g.measureText(ch).width, y = 220 + b(i); g.lineJoin = 'round'; g.lineWidth = 26; g.strokeStyle = '#4a1c08'; g.strokeText(ch, x + 5, y + 8); g.strokeStyle = '#fff'; g.lineWidth = 18; g.strokeText(ch, x, y); g.fillStyle = '#ff7a1a'; g.fillText(ch, x, y); x += w; } g.textAlign = 'center'; }
  const sub = K.SUBS.find(s => t >= s[0] && t < s[1]);
  if (sub) { g.font = '600 52px Fredoka'; const parts = sub[2].split('   '), w = Math.max(...parts.map(s => g.measureText(s).width)) + 90, h = parts.length * 64 + 28, x = 960 - w / 2, y = 930 - (parts.length - 1) * 64; g.fillStyle = 'rgba(40,30,28,.88)'; g.beginPath(); g.roundRect(x, y, w, h, 30); g.fill(); g.fillStyle = '#fff'; parts.forEach((s, i) => g.fillText(s, 960, y + 46 + i * 64)); }
  if (irisPt) { const u = ss(seg(t, 28.0, 29.3)), r = lerp(1300, 70, u); g.fillStyle = '#2a1d18'; g.beginPath(); g.rect(0, 0, W, H); g.moveTo(irisPt[0] + r, irisPt[1]); g.arc(irisPt[0], irisPt[1], r, 0, TAU, true); g.fill('evenodd'); }
  if (t >= 29.3) { const u = ss(seg(t, 29.3, 29.6)); g.fillStyle = '#2a1d18'; g.fillRect(0, 0, W, H); g.font = '700 150px Fredoka'; g.lineJoin = 'round'; g.lineWidth = 30; g.strokeStyle = '#4a1c08'; g.strokeText('The End', 960, lerp(-100, 470, u)); g.fillStyle = '#ff7a1a'; g.fillText('The End', 960, lerp(-100, 470, u)); }
}
function render(t) {
  const sh = shotAt(t), ft = frz(t), cam = CAMS[sh](t);
  const pp = avgPose(K.pipAt, ft), cp = avgPose(K.catAt, ft);
  g2.setTransform(1, 0, 0, 1, 0, 0);
  const s5 = ft >= 19.5 && ft < 24.7 && sh >= 4;
  if (sh === 1) {
    g2.fillStyle = '#ffbe2e'; g2.fillRect(0, 0, W, H); g2.fillStyle = '#f08a1c'; g2.fillRect(0, 640, W, 120); g2.fillStyle = '#f9b94e'; g2.fillRect(0, 760, W, 320);
    T.BASE.splice(0, 6, 1, 0, 0, 1, 0, 0); T.frame(ft, { amp: 0 }); T.reset(); T.push(); T.translate(930, 1560); T.scale(3.5);
    const lid = ft < 6.45 ? .93 : Math.max(0, .93 * (1 - seg(ft, 6.45, 6.6)));
    catHeadBig({ type: 'open', lid, lx: -.5, ly: 0 }, ft < 6.5 ? 'flat' : (K.talk(ft, 'b1') || 'grin'), { brow: ft >= 6.5 ? 'angry' : null }); T.pop();
  } else {
    T.BASE.splice(0, 6, ...camBase(cam)); T.frame(ft, { amp: 0 }); T.reset();
    kitchen(t, ft);
    if (pp.vis !== false) softShadow(pp.x, FL + 6, 46 * (pp.k ?? 1), .38);
    if (!cp.sleep) softShadow(cp.x, FL + 8, 120 * (cp.k ?? 1), .4);
    const speed = (cp.speed || pp.speed) ? (cp.speed ? cp : pp) : null; if (speed && Math.floor(ft * 24) % 2 === 0) for (let i = 0; i < 4; i++) puff(speed.x - (speed.dir ?? -1) * (80 + i * 55), FL - 20, 22 + i * 6);
    if (cp.sleep) for (let i = 0; i < 3; i++) { const u = ((ft * .5 + i / 3) % 1); T.text('Z', X.basket + 20 + u * 60, FL - 170 - u * 120, { font: `${40 + i * 12}px Fredoka`, fill: '#ffffff', outlineW: 7, outlineCol: OUT }); }
    if (s5) { const k = 1.08, shp = [cp.x + 50 * k, FL - 224 * k], tg = K.armTarget(ft), bend = 60 * (1 - ss(seg(ft, 19.5, 22.5)) * .5);
      D.hose(shp, tg, -bend, 26, '#ee9a46'); D.glove(tg[0], tg[1], .9, 1.08, 'grab');
      if (ft >= 23.2) { const tight = ss(seg(ft, 24.25, 24.5)), m = [lerp(shp[0], tg[0], .5), lerp(shp[1], tg[1], .5) + 36], r = lerp(34, 14, tight); D.sh(T.ell(lerp(m[0], 320, tight * .8), lerp(m[1], 780, tight * .5), r, r * .8), '#cf7a2c', {}); } }
    const cc = { ...cp }; if (s5) cc.armF = [30, -30, 'fist'];
    const drawC = () => { cat(cc); if (cp.pot && !cp.sleep) potD(cp.x + (cp.dir > 0 ? 20 : -20), FL - 330, 1, Math.sin(ft * 5) * .08); if (ft >= 14.5 && ft < 14.9 && !cp.pot) { const u = seg(ft, 14.5, 14.9); potD(X.stove, lerp(440, FL - 330, u * u), .6 + .4 * u, u * 1.2); } if (cp.stars) for (let i = 0; i < 3; i++) { const a = ft * 6 + i * TAU / 3; starD(cp.x + Math.cos(a) * 90, FL - (cp.pot ? 380 : 360) + Math.sin(a) * 18, 18, a); } };
    const drawP = () => { if (pp.vis !== false) mouse(pp); };
    if (pp.vis !== false && pp.x > cp.x) { drawC(); drawP(); } else { drawP(); drawC(); }
  }
  let ip = null; if (sh === 5 && ft >= 27) { const m = camBase(cam); ip = [m[0] * pp.x + m[4], m[3] * (FL - 70) + m[5]]; }
  overlay(t, ip);
}
window.DUR = K.DUR; window.EV = K.EV; window.SUBS = K.SUBS;
window.render = t => render(Math.min(t, K.DUR - 1e-4)); window.READY = true;
