// Cheese, Please! — 30 s rubber-hose cartoon. Original cast: Pip (mouse), Boris (cat). 120 BPM: beat = 0.5 s = 12 frames.
import * as T from './toon.js';
import { P, pieEye, brow, mouth, glove, shoe, hose } from './chars.js';
import { fatTitle, subPlate } from './ui.js';
import { clamp, lerp, seg, ss, eio, hash, TAU } from '/core/lib.js';
const { shape, stroke, ell, arc, spline, noodle, quad, push, pop, translate, rotate, scale, tx, S: TS } = T;

export const DUR = 30, BEAT = .5;
export const CUTS = [6, 8, 15, 19, 27];
const FL = 980, X = { hole: 620, table: 1000, puddle: 830, stove: 230, basket: 1500 };
const VO = { p1: [2.0, 1.429], b1: [6.5, 1.185], p2: [16.2, 1.196], b2: [24.5, 1.348], p3: [26.0, 1.124] };
export const SUBS = [[1.9, 4.1, 'Just one little nibble.'], [6.4, 8.2, 'Breakfast!'], [16.1, 18.2, 'Nice try, pal!'], [24.4, 27.4, 'Ouch! My arm!   Thanks for the hand!']];
const frozen = t => (t >= 14.0 && t < 14.5) ? 14.0 : t;               // band stop: everything freezes
const q12 = t => Math.floor(t * 12 + 1e-6) / 12;                          // characters on twos
const talk = (t, k) => { const [s, d] = VO[k]; return t >= s && t < s + d ? (Math.floor(t * 12) % 2 ? 'open' : 'o') : null; };
function fillL(pts, col) { const s = pts.map(p => tx(p[0], p[1])), g = T.g; g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = col; g.beginPath(); g.moveTo(s[0][0], s[0][1]); for (const p of s) g.lineTo(p[0], p[1]); g.closePath(); g.fill(); }
const GL = '#2A2927';
const bg0 = { boil: 0, lw: 3.4, line: GL };

// ————————— cheese —————————
function cheese(x, y, k = 1, rot = 0) {
  push(); translate(x, y); rotate(rot); scale(k);
  shape([[-34, 0], [34, 0], [34, -20], [-34, -42]], { fill: P.paper, lw: TS.lw * .8, shade: () => { fillL([[-34, -4], [34, -4], [34, 0], [-34, 0]], P.light); } });
  for (const [cx, cy, r] of [[-12, -12, 5], [14, -10, 4], [4, -22, 3.6]]) shape(ell(cx, cy, r, r), { fill: P.dmid, lw: TS.lw * .45, boil: .3 });
  pop();
}

// ————————— Pip, the mouse (about 120 tall) —————————
export function mouse(p) {
  const k = p.k ?? 1, dir = p.dir ?? 1, g = p.gait || 'idle', a = (p.ph ?? 0) * TAU;
  let fL = [-9, 0], fR = [10, 0], bob = 0, lean = p.lean ?? 0;
  if (g === 'tip') { fL = [12 * Math.sin(a), -9 * Math.max(0, Math.cos(a))]; fR = [-12 * Math.sin(a), -9 * Math.max(0, -Math.cos(a))]; bob = -Math.abs(Math.cos(a)) * 3; }
  if (g === 'run') { fL = [17 * Math.cos(a), -14 + 14 * Math.sin(a)]; fR = [17 * Math.cos(a + Math.PI), -14 + 14 * Math.sin(a + Math.PI)]; lean = .3; bob = -Math.abs(Math.sin(a)) * 4; }
  if (g === 'air') { fL = [16, -22]; fR = [-16, -14]; lean = .2; }
  push(); translate(p.x, p.y + (p.hop ?? 0)); rotate(p.rot ?? 0); scale(dir * k * (p.sx ?? 1), k * (p.sy ?? 1)); translate(0, bob); rotate(lean);
  const E = p.eyes || {}, lwb = TS.lw;
  const armF = p.armF || [20, -50, 'open'], armB = p.armB || [-20, -48, 'open'], sh = [0, -76];
  const arm = (t, front) => { hose(sh, [t[0], t[1]], front ? -6 : 6, 8); glove(t[0], t[1], Math.atan2(t[1] - sh[1], t[0] - sh[0]) * .7, t[2] || 'open', .5); };
  shape(noodle([-20, -38], [-60 + (p.wag ?? 0), -64 + (p.wag ?? 0) * .5], 14, 5, 3), { fill: P.pale, lw: lwb * .6 });   // tail
  arm(armB, false);
  hose([6, -32], fR, 5, 8); shoe(fR[0] - 6, fR[1], 1, .5);
  shape(ell(-14, -124, 14, 17), { fill: P.white, lw: lwb * .85 }); shape(ell(-14, -124, 8, 10), { fill: P.light, stroke: false });      // ears
  shape(ell(18, -126, 14, 17), { fill: P.white, lw: lwb * .85 }); shape(ell(18, -126, 8, 10), { fill: P.light, stroke: false });
  shape(ell(0, -58, 24, 33), { fill: P.white, lw: lwb, shade: () => fillL([[10, -100], [40, -100], [40, -20], [10, -20]], P.pale) });  // body
  shape(ell(2, -100, 27, 22), { fill: P.white, lw: lwb });                                                                              // head
  shape(ell(30, -96, 5, 4), { fill: P.ink, stroke: false, boil: .2 });
  stroke([[26, -91], [46, -87]], lwb * .5, { boil: .2 }); stroke([[26, -94], [48, -97]], lwb * .5, { boil: .2 });
  pieEye(2, -104, 8, 10, { type: E.type || 'open', lx: E.lx ?? .3, ly: E.ly ?? 0, lid: E.lid ?? 0 }); pieEye(18, -105, 7.5, 9.5, { type: E.type || 'open', lx: E.lx ?? .3, ly: E.ly ?? 0, lid: E.lid ?? 0 });
  if (p.brow) { brow(2, -118, 14, p.brow, -1); brow(18, -119, 14, p.brow, 1); }
  mouth(14, -85, 15, p.mouth || 'smile');
  hose([-6, -32], fL, 5, 8); shoe(fL[0] - 6, fL[1], 1, .5);
  arm(armF, true);
  if (p.cheese) { const hx = armF[0] + 10, hy = armF[1] - 4; cheese(hx, hy, .6, -.2); }
  pop();
}

// ————————— Boris, the cat (about 330 tall) —————————
function catHead(E, mth, o = {}) {
  const lwb = TS.lw;
  shape([[-48, -332], [-40, -392], [2, -352]], { fill: P.dmid, lw: lwb });  shape([[-42, -342], [-38, -378], [-14, -356]], { fill: P.light, stroke: false });
  shape([[28, -352], [62, -398], [76, -334]], { fill: P.dmid, lw: lwb });   shape([[40, -352], [60, -382], [66, -346]], { fill: P.light, stroke: false });
  shape(ell(8, -300, 72, 58), { fill: P.dmid, lw: lwb, shade: () => fillL([[52, -360], [90, -360], [90, -240], [52, -240]], P.dark) });
  for (const dx of [-12, 6, 24]) stroke([[dx, -352], [dx + 4, -334]], lwb * .9, { boil: .3 });
  shape(ell(36, -282, 40, 28), { fill: P.paper, lw: lwb * .8 });
  shape(ell(50, -296, 11, 7.5), { fill: P.ink, stroke: false, boil: .3 });
  for (const [y0, y1] of [[-280, -292], [-274, -276], [-268, -262]]) stroke([[64, y0], [112, y1]], lwb * .5, { boil: .2 });
  pieEye(-6, -308, 17, 21, { type: E.type || 'open', lx: E.lx ?? .3, ly: E.ly ?? 0, lid: E.lid ?? 0, lidCol: P.dmid });
  pieEye(30, -310, 16, 20, { type: E.type || 'open', lx: E.lx ?? .3, ly: E.ly ?? 0, lid: E.lid ?? 0, lidCol: P.dmid });
  if (o.brow) { brow(-6, -336, 34, o.brow, -1); brow(30, -337, 32, o.brow, 1); }
  mouth(38, -262, 34, mth || 'smile');
}
export function cat(p) {
  const k = p.k ?? 1, dir = p.dir ?? 1, g = p.gait || 'idle', a = (p.ph ?? 0) * TAU, lwb = TS.lw;
  push(); translate(p.x, p.y); rotate(p.rot ?? 0); scale(dir * k * (p.sx ?? 1), k * (p.sy ?? 1));
  if (p.sleep) {   // curled up in the basket
    const br = 1 + .04 * Math.cos(p.beat * TAU);
    shape(noodle([-118, -30], [40, -14], -70, 20, 18), { fill: P.dmid, lw: lwb });
    shape(ell(0, -58, 122, 58 * br), { fill: P.dmid, lw: lwb, shade: () => fillL([[-130, -40], [130, -40], [130, 0], [-130, 0]], P.dark) });
    shape(ell(30, -52, 70, 34), { fill: P.paper, stroke: false });
    shape([[78, -92], [88, -144], [118, -100]], { fill: P.dmid, lw: lwb });
    shape(ell(104, -64, 54, 44), { fill: P.dmid, lw: lwb });
    shape(ell(126, -50, 26, 18), { fill: P.paper, lw: lwb * .8 }); shape(ell(140, -58, 7, 5), { fill: P.ink, stroke: false });
    pieEye(98, -72, 12, 14, { type: 'happy' }); mouth(122, -38, 18, 'smile');
    pop(); return;
  }
  let fL = [-26, 0], fR = [26, 0], bob = 0, lean = p.lean ?? 0;
  if (g === 'run') { fL = [40 * Math.cos(a), -30 + 30 * Math.sin(a)]; fR = [40 * Math.cos(a + Math.PI), -30 + 30 * Math.sin(a + Math.PI)]; lean = .3; bob = -Math.abs(Math.sin(a)) * 10; }
  if (g === 'air') { fL = [52, -70]; fR = [-52, -40]; }
  push(); translate(0, bob); rotate(lean);
  const E = p.eyes || {};
  const armF = p.armF || [60, -150, 'open'], armB = p.armB || [-60, -150, 'open'], shF = [50, -224], shB = [-44, -224];
  const arm = (t, s0, front) => { hose(s0, [t[0], t[1]], front ? -14 : 14, 24); glove(t[0], t[1], Math.atan2(t[1] - s0[1], t[0] - s0[0]) * .7, t[2] || 'open', 1.05); };
  shape(noodle([-70, -110], [-135 + (p.wag ?? 0), -250 + (p.wag ?? 0) * .6], -60, 20, 15), { fill: P.dmid, lw: lwb });
  arm(armB, shB, false);
  hose([30, -78], fR, 12, 28); shoe(fR[0] - 14, fR[1], 1, 1.6);
  shape(ell(0, -175, 78, 100), { fill: P.dmid, lw: lwb, shade: () => fillL([[34, -290], [110, -290], [110, -70], [34, -70]], P.dark) });
  shape(ell(18, -166, 46, 70), { fill: P.paper, stroke: false });
  catHead(E, p.mouth, { brow: p.brow });
  hose([-30, -78], fL, 12, 28); shoe(fL[0] - 14, fL[1], 1, 1.6);
  arm(armF, shF, true);
  pop(); pop();
}

// ————————— props —————————
const beatOf = t => t / BEAT;
function pot(x, y, k = 1, rot = 0, sq = 1) {
  push(); translate(x, y); rotate(rot); scale(k * (2 - sq), k * sq);
  shape(spline([[-46, -4], [-52, -60], [-40, -76], [40, -76], [52, -60], [46, -4], [0, 4]], true, 6), { fill: P.dark, lw: TS.lw, shade: () => fillL([[10, -80], [60, -80], [60, 8], [10, 8]], P.ink) });
  shape(noodle([-52, -56], [-82, -30], 8, 9, 9), { fill: P.dark, lw: TS.lw * .8 });
  shape(ell(0, -76, 46, 9), { fill: P.mid, lw: TS.lw * .8 });
  pop();
}
function star(x, y, r, a) { const pts = []; for (let i = 0; i < 8; i++) { const ang = a + i / 8 * TAU, rr = i % 2 ? r * .42 : r; pts.push([x + Math.cos(ang) * rr, y + Math.sin(ang) * rr]); } shape(pts, { fill: P.white, lw: TS.lw * .7, boil: .5 }); }
function speedLines(x, y, dir, t, n = 5) { for (let i = 0; i < n; i++) { const h = hash(Math.floor(t * 12) * 7.3 + i), yy = y - 20 - i * 26 - h * 18, len = 70 + h * 90; stroke([[x - dir * (50 + h * 30), yy], [x - dir * (50 + h * 30 + len), yy]], TS.lw * .8, { boil: .3 }); } }
const wall = (x0, y0, x1, y1, col) => shape([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], { ...bg0, fill: col });

function background(t, bt) {
  const br = 1 + .04 * Math.cos(beatOf(bt) * TAU);
  wall(-900, -400, 2500, 985, '#8C8981');
  for (let x = -840; x < 2500; x += 150) wall(x, -400, x + 60, 985, '#827F78');
  wall(-900, 940, 2500, 985, '#66635D');
  for (let r = 0; r < 6; r++) for (let i = -8; i < 24; i++) { const y0 = 985 + r * 85, x0 = i * 150 + (r % 2) * 75; shape([[x0, y0], [x0 + 150, y0], [x0 + 150, y0 + 85], [x0, y0 + 85]], { ...bg0, fill: (i + r) % 2 ? '#A29F97' : '#7E7B74', lw: 2.4 }); }
  // window and clock (they breathe on the beat)
  push(); translate(700, 520); scale(1, br); translate(-700, -520);
  shape([[600, 160], [800, 160], [800, 380], [600, 380]], { ...bg0, fill: '#C8C5BC' }); stroke([[700, 160], [700, 380]], 5, { boil: 0 }); stroke([[600, 270], [800, 270]], 5, { boil: 0 });
  pop();
  push(); translate(1280, 300); scale(br, br); shape(ell(0, 0, 70, 70), { ...bg0, fill: P.paper }); const ca = (bt / 60) * TAU; stroke([[0, 0], [Math.sin(ca) * 48, -Math.cos(ca) * 48]], 5, { boil: 0 }); stroke([[0, 0], [Math.sin(ca / 12) * 32, -Math.cos(ca / 12) * 32]], 6, { boil: 0 }); pop();
  // mousehole: an arched hole at the base of the wall
  shape(spline([[X.hole - 70, 985], [X.hole - 70, 922], [X.hole, 876], [X.hole + 70, 922], [X.hole + 70, 985]], true, 6), { ...bg0, fill: '#575550' });
  shape(spline([[X.hole - 54, 985], [X.hole - 54, 930], [X.hole, 892], [X.hole + 54, 930], [X.hole + 54, 985]], true, 6), { ...bg0, fill: P.ink });
  // table with the cheese plate
  push(); translate(X.table, FL); scale(br, 2 - br); translate(-X.table, -FL);
  shape([[X.table - 140, 610], [X.table + 140, 610], [X.table + 140, 650], [X.table - 140, 650]], { ...bg0, fill: '#66635D' });
  for (const dx of [-120, 100]) shape([[X.table + dx, 650], [X.table + dx + 22, 650], [X.table + dx + 22, FL], [X.table + dx, FL]], { ...bg0, fill: '#575550' });
  shape(ell(X.table, 608, 70, 12), { ...bg0, fill: P.paper });
  pop();
  // stove + shelf with pots
  push(); translate(X.stove, FL); scale(br, 2 - br); translate(-X.stove, -FL);
  shape([[X.stove - 130, 700], [X.stove + 130, 700], [X.stove + 130, FL], [X.stove - 130, FL]], { ...bg0, fill: '#575550' });
  shape([[X.stove - 130, 676], [X.stove + 130, 676], [X.stove + 130, 700], [X.stove - 130, 700]], { ...bg0, fill: P.dark });
  shape(ell(X.stove, 790, 70, 55), { ...bg0, fill: P.dark });
  pop();
  shape([[X.stove - 150, 440], [X.stove + 150, 440], [X.stove + 150, 462], [X.stove - 150, 462]], { ...bg0, fill: '#66635D' });
  pot(X.stove - 90, 440, .55); if (bt < 14.5) pot(X.stove, 440, .6); pot(X.stove + 90, 440, .5);
  // basket
  shape(ell(X.basket, FL - 6, 150, 40), { ...bg0, fill: '#6B6963' });
  shape([[X.basket - 150, FL - 6], [X.basket - 130, FL - 70], [X.basket + 130, FL - 70], [X.basket + 150, FL - 6]], { ...bg0, fill: '#7C7972' });
  for (let i = -4; i <= 4; i++) stroke([[X.basket + i * 30, FL - 66], [X.basket + i * 33, FL - 10]], 3, { boil: 0 });
  // puddle
  shape(ell(X.puddle, FL + 6, 90, 20), { ...bg0, fill: P.paper }); shape(ell(X.puddle - 22, FL + 2, 24, 5), { fill: P.white, stroke: false, boil: 0 });
}

// ————————— animation tracks —————————
const tiptoeX = t => lerp(X.hole, 900, ss(seg(t, .5, 3.5)));
function pipAt(t) {
  const o = { x: X.hole, y: FL, dir: 1, k: 1, gait: 'idle', mouth: 'smile', eyes: { lx: .5, type: 'open' }, vis: true };
  const beat = beatOf(t), br = Math.cos(beat * TAU) * .05;
  o.sy = 1 + br; o.sx = 1 - br * .5;
  if (t < 12) { o.cheese = t >= 5.4 && t < 15.2; }
  if (t < .5) { const u = ss(seg(t, 0, .5)); o.k = lerp(.4, 1, u); o.y = lerp(FL - 30, FL, u); o.x = X.hole; return o; }
  if (t < 3.5) { o.x = tiptoeX(t); o.gait = 'tip'; o.ph = (t - .5) / 1.0; o.eyes = { lx: 1, ly: 0, type: 'open' }; o.wag = Math.sin(t * 6) * 4; o.armF = [26, -38 + Math.sin(t * 6) * 4, 'open']; o.brow = 'up'; return o; }
  o.x = 900;
  if (t < 4.0) { o.eyes = { lx: .6, ly: -1 }; o.mouth = 'o'; o.armF = [20, -50, 'open']; return o; }
  if (t < 4.5) { const u = ss(seg(t, 4.0, 4.3)); o.sy = lerp(1, .78, u) ; o.sx = lerp(1, 1.12, u); o.eyes = { lx: .6, ly: -1 }; o.mouth = 'grin'; return o; }
  if (t < 5.7) {   // rubber-hose stretch up to the cheese on the table
    const u = ss(seg(t, 4.5, 5.2)), r = ss(seg(t, 5.2, 5.7));
    o.armF = [lerp(20, 100, u) , lerp(-50, -360, u) * (1 - r) + -50 * r, 'grab']; o.armF[0] = lerp(o.armF[0], 20, r);
    o.sy = lerp(.78, 1.08, ss(seg(t, 4.5, 4.7))) - r * .08; o.eyes = { lx: .9, ly: -1 }; o.mouth = 'grin'; o.cheese = t >= 5.2; return o;
  }
  o.cheese = true; o.eyes = { lx: lerp(.3, 1, seg(t, 5.7, 5.9)) }; o.mouth = 'wavy'; o.brow = 'up'; o.armF = [24, -46, 'grab'];
  if (t < 8.0) return o;
  // chase
  if (t < 8.3) { o.dir = -1; const u = ss(seg(t, 8.0, 8.3)); o.sy = lerp(1, .78, u); o.sx = lerp(1, 1.12, u); o.eyes = { lx: -1 }; o.mouth = 'wavy'; o.brow = 'up'; return o; }
  if (t < 10.1) {
    const u = seg(t, 8.3, 10.1); o.dir = -1; o.x = lerp(900, X.hole, ss(u * 1)); o.gait = 'run'; o.ph = (t - 8.3) * 3.2; o.sy = 1; o.sx = 1; o.eyes = { lx: -1 }; o.mouth = 'wavy'; o.brow = 'up';
    o.hop = -90 * Math.sin(clamp(seg(t, 8.65, 9.15)) * Math.PI); if (o.hop) o.gait = 'air';
    o.armF = [20, -40, 'grab']; o.armB = [-22, -52, 'open']; o.speed = true; return o;
  }
  if (t < 10.5) { const u = seg(t, 10.1, 10.5); o.dir = -1; o.x = X.hole; o.sy = 1 - u * .4; o.k = 1 - u * .5; o.y = FL - u * 120; o.mouth = 'wavy'; return o; }
  if (t < 15.2) { o.vis = false; return o; }
  // steps out and thumbs his nose
  if (t < 15.8) { const u = ss(seg(t, 15.2, 15.8)); o.k = lerp(.5, 1, u); o.y = lerp(FL - 80, FL, u); o.dir = 1; o.mouth = 'grin'; o.cheese = false; o.eyes = { lx: -.8, type: 'open' }; return o; }
  if (t < 19.3) { o.dir = -1; o.x = X.hole; o.mouth = talk(t, 'p2') || 'grin'; o.eyes = { lx: -.9, ly: .1 }; o.cheese = true; o.armF = [30 + Math.sin(t * 12) * 4, -92, 'open']; o.armB = [-22, -52, 'grab']; o.armB = [-8, -80 + Math.sin(t * 12) * 6, 'open']; o.armF = [30, -48, 'grab']; return o; }
  if (t < 19.6) { const u = ss(seg(t, 19.3, 19.6)); o.dir = -1; o.k = 1 - u * .5; o.y = FL - u * 80; o.x = X.hole; o.cheese = true; return o; }
  if (t < 22.5) { o.vis = false; return o; }
  // pops out, ties the knot in the cat's arm
  if (t < 23.0) { const u = ss(seg(t, 22.5, 23.0)); o.dir = -1; o.k = lerp(.5, 1, u); o.y = lerp(FL - 80, FL, u); o.x = lerp(X.hole, 470, u); o.mouth = 'grin'; o.cheese = true; return o; }
  if (t < 24.25) { o.dir = -1; o.x = 470; o.mouth = 'grin'; o.eyes = { lx: -.7 }; o.cheese = false; o.armF = [-8, -150 + Math.sin(t * 24) * 6, 'grab']; o.armB = [-14, -150 + Math.sin(t * 24 + 2) * 6, 'grab']; o.sy = 1; if (t >= 24.0) { o.sy = 1.05; o.armF = [-8, -152, 'grab']; } return o; }
  if (t < 27.0) { o.dir = -1; o.cheese = true; const u = ss(seg(t, 24.25, 24.6)); o.x = lerp(470, 660, u); o.hop = -50 * Math.sin(clamp(seg(t, 24.25, 24.7)) * Math.PI); o.mouth = talk(t, 'p3') || 'beam'; o.eyes = { lx: -.9 }; o.armF = [24, -46, 'grab']; return o; }
  o.x = 700; o.dir = -1; o.cheese = true; o.mouth = (Math.floor(t * 12) % 4 < 2) ? 'open' : 'smile'; o.eyes = { type: 'happy' }; o.armF = [22, -80 - 6 * Math.sin(t * 8), 'grab']; return o;
}
const catPath = t => {
  // 7.0 wakes; 8.0 leaps out; runs to the puddle; slips; slides; hits the stove at 14.5
  if (t < 8.0) return { x: X.basket, sleep: true };
  return null;
};
function catAt(t) {
  const beat = beatOf(t), br = Math.cos(beat * TAU) * .04;
  const o = { x: X.basket, y: FL, dir: -1, k: 1, gait: 'idle', mouth: 'smile', eyes: { lx: -.5, type: 'open' }, sx: 1 - br * .5, sy: 1 + br, beat };
  if (t < 7.0) { o.sleep = true; o.eyes = {}; o.x = X.basket; return o; }
  if (t < 8.0) { o.sleep = true; return o; }
  if (t < 8.5) { const u = ss(seg(t, 8.0, 8.5)); o.x = lerp(X.basket, X.basket - 80, u); o.y = FL - 70 * Math.sin(u * Math.PI); o.gait = 'air'; o.mouth = 'grin'; o.eyes = { lx: -1 }; o.brow = 'angry'; return o; }
  if (t < 11.2) { const u = seg(t, 8.5, 11.2); o.x = lerp(X.basket - 80, X.puddle + 60, eio(u) * .6 + u * .4); o.gait = 'run'; o.ph = (t - 8.5) * 2.6; o.mouth = 'grin'; o.eyes = { lx: -1 }; o.brow = 'angry'; o.speed = true; o.sx = 1; o.sy = 1; return o; }
  if (t < 11.9) { const u = seg(t, 11.2, 11.9); o.x = lerp(X.puddle + 60, X.puddle - 40, u); o.gait = 'air'; o.rot = -dirRot(1) * ss(u) * 1.3; o.y = FL - 120 * Math.sin(u * Math.PI); o.mouth = 'wavy'; o.eyes = { type: 'wide' }; o.brow = 'up'; o.sx = 1; o.sy = 1; return o; }
  if (t < 14.5) { const tt = frozen(t), u = seg(tt, 11.9, 14.5); o.x = lerp(X.puddle - 40, 330, u); o.gait = 'air'; o.rot = -dirRot(1) * 1.45; o.y = FL - 100 + u * 60; o.mouth = 'wavy'; o.eyes = { type: 'wide' }; o.brow = 'up'; o.sx = 1; o.sy = 1; if (t >= 14.0) { o.eyes = { type: 'wide' }; } return o; }
  if (t < 14.7) { const u = seg(t, 14.5, 14.7); o.x = lerp(330, 260, u); o.y = FL; o.rot = 0; o.sx = 1 + .5 * Math.sin(u * Math.PI); o.sy = 1 - .45 * Math.sin(u * Math.PI); o.mouth = 'wavy'; o.eyes = { type: 'squeeze', side: 1 }; return o; }
  o.x = 260; o.dir = 1; o.pot = true;
  if (t < 19.0) { o.mouth = 'o'; o.eyes = { type: 'sad', lx: Math.sin(t * 6) * .6 }; o.stars = true; o.rot = Math.sin(t * 4) * .06; if (t > 18.0) { o.stars = false; o.pot = t < 18.3; o.eyes = { type: 'open', lx: 1 }; o.brow = 'angry'; o.mouth = 'grin'; } return o; }
  o.pot = false;
  if (t < 24.25) { o.k = 1.08; o.eyes = { type: 'open', lx: t > 22.4 ? .2 : 1, ly: .6 }; o.brow = 'angry'; o.mouth = 'grin'; return o; }
  if (t < 24.6) { o.k = 1.08; o.eyes = { type: 'squeeze', side: 1 }; o.mouth = 'wavy'; const u = seg(t, 24.25, 24.6); o.sx = 1 + .35 * ss(seg(t, 24.5, 24.6)); o.sy = 1 - .3 * ss(seg(t, 24.5, 24.6)); o.stars = t > 24.5; return o; }
  o.k = 1.08; o.eyes = { type: 'sad', lx: Math.sin(t * 6) * .5 }; o.mouth = talk(t, 'b2') || 'o'; o.stars = t < 26.5; return o;
}
const dirRot = d => d;
// the stretching arm in S5
function armTarget(t) {   // world position of Boris's front hand
  const home = [260 + 60 * 1.08, FL - 150 * 1.08];
  if (t < 19.5) return home;
  if (t < 22.5) { const u = ss(seg(t, 19.5, 22.5)); return [lerp(home[0], X.hole, u), lerp(home[1], 955, u)]; }
  if (t < 24.25) return [X.hole, 955];
  const u = ss(seg(t, 24.25, 24.55)); return [lerp(X.hole, 260 + 36, u), lerp(955, FL - 262 * 1.08, u)];
}

// ————————— shots —————————
const CAMS = [
  t => ({ x: 860, y: 560, z: .92 }),                                                   // S1 stage-wide
  t => ({ x: 960, y: 540, z: 1 }),                                                      // S2 close-up (screen space)
  t => ({ x: lerp(1000, 520, ss(seg(t, 8.2, 13.2))), y: 600, z: .98 }),                // S3 trucking pan
  t => ({ x: 400, y: 640, z: 1.02 }),                                                   // S4
  t => ({ x: 430, y: 640, z: 1.12 }),                                                   // S5
  t => ({ x: lerp(640, 600, seg(t, 27, 30)), y: 760, z: lerp(1.4, 1.5, seg(t, 27, 30)) }) // S6
];
const shotAt = t => CUTS.filter(c => t >= c).length;
const camBase = c => [c.z, 0, 0, c.z, 960 - c.x * c.z, 540 - c.y * c.z];

export function draw(t) {
  const sh = shotAt(t), cam = CAMS[sh](t), ft = frozen(t), tq = q12(ft);
  T.BASE.splice(0, 6, ...camBase(cam)); T.frame(tq, { amp: 1.2 }); T.reset();
  if (sh === 1) { drawCU(t, tq); }
  else {
    const g = T.g;
    background(t, tq);
    const pip = pipAt(tq), cat_ = catAt(tq);
    // cheese on the plate until grabbed
    if (tq < 5.3) cheese(X.table, 604, 1.1);
    if (tq >= 5.3 && tq < 8) { /* held in hand */ }
    // milk puddle splash stays; Z's over the sleeping cat
    if (cat_.sleep && sh === 0) for (let i = 0; i < 3; i++) { const u = ((tq * .5 + i / 3) % 1); T.text('Z', X.basket + 20 + u * 60, FL - 170 - u * 120, { font: `${40 + i * 12}px Shrikhand`, fill: P.white, outlineW: 6 }); }
    // order: cat behind during S3/S4 depending on position
    if (sh === 5 && tq >= 27) drawS6(tq, pip);
    else { drawChars(tq, pip, cat_, sh); }
  }
  drawOverlays(t, sh);
}
function drawChars(tq, pip, cat_, sh) {
  if (cat_.speed) { const dx = -1; speedLines(cat_.x + 80, FL - 60, dx, tq, 4); }
  if (pip.vis && pip.speed) speedLines(pip.x + (pip.dir > 0 ? -20 : 20), FL - 30, -pip.dir, tq, 4);
  // long arm for S5 (drawn behind the cat body, from the shoulder to the hand)
  if (tq >= 19.5 && tq < 24.7 && sh >= 4) {
    const k = 1.08, sh0 = [cat_.x + 50 * k, FL - 224 * k], hand = armTarget(tq);
    shape(noodle(sh0, hand, 60 * (1 - ss(seg(tq, 19.5, 22.5)) * .5), 24, 24), { fill: P.ink, lw: TS.lw * .8 });
    const m = [lerp(sh0[0], hand[0], .5), lerp(sh0[1], hand[1], .5) + 36];
    if (tq >= 23.2) { const tight = ss(seg(tq, 24.25, 24.5)); const r = lerp(34, 14, tight); const kx = lerp(m[0], 280 + 40, tight * .8), ky = lerp(m[1], 780, tight * .5); shape(ell(kx, ky, r, r * .8), { fill: P.dark, lw: TS.lw * .8 }); }
    glove(hand[0], hand[1], .9, 'grab', 1.05);
    cat_.armF = [-5, 40, 'fist']; cat_.armF = [60, -150, 'open'];
    cat_.noFrontArm = true;
  }
  if (pip.vis && pip.x > cat_.x) { drawCat(cat_, tq); drawPip(pip); } else { if (pip.vis) drawPip(pip); drawCat(cat_, tq); }
}
function drawPip(p) { mouse(p); }
function drawCat(c, tq) {
  if (c.noFrontArm) { const a = c.armF; c.armF = [30, -30, 'fist']; cat(c); c.armF = a; } else cat(c);
  if (c.pot) pot(c.x + (c.dir > 0 ? 20 : -20), FL - 330, 1.0, Math.sin(tq * 5) * .08);
  if (tq >= 14.5 && tq < 14.9 && !c.pot) { const u = seg(tq, 14.5, 14.9); pot(X.stove, lerp(440, FL - 330, u * u), .6 + .4 * u, u * 1.2); }
  if (c.stars) for (let i = 0; i < 3; i++) { const a = tq * 6 + i * TAU / 3; star(c.x + Math.cos(a) * 90, FL - (c.pot ? 380 : 360) + Math.sin(a) * 18, 18, a); }
}
function drawCU(t, tq) {
  T.g.setTransform(1, 0, 0, 1, 0, 0); T.g.fillStyle = '#8C8981'; T.g.fillRect(0, 0, 1920, 1080);
  for (let x = -100; x < 2200; x += 150) { T.g.fillStyle = '#827F78'; T.g.fillRect(x - ((t * 5) % 150), 0, 60, 1080); }
  const lid = t < 6.45 ? 1 : ss(1 - seg(t, 6.45, 6.55)) * 1;
  const snap = t < 6.5 ? 1 : 0;
  push(); translate(940, 1525); scale(3.2); translate(-8, 0);
  catHead({ type: 'open', lx: -.6, ly: .1, lid: t < 6.45 ? 1 : (t < 6.6 ? 1 - seg(t, 6.45, 6.6) : 0) }, t < 6.5 ? 'flat' : (talk(t, 'b1') || 'grin'), { brow: t < 6.5 ? 'flat' : 'angry' });
  pop();
  if (t >= 6.5 && t < 6.62) { const g = T.g; g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = 'rgba(252,251,247,.35)'; g.fillRect(0, 0, 1920, 1080); }
}
function drawS6(tq, pip) {
  const g = T.g, c = [lerp(0, 0, 0)];
  mouse({ ...pip, x: 650, k: 1.2 });
  const u = ss(seg(tq, 28.0, 29.3)), r = lerp(900, 60, u);
  const [sx, sy] = tx(650, FL - 70);
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#000'; g.beginPath(); g.rect(0, 0, 1920, 1080); g.arc(sx, sy, r, 0, TAU, true); g.fill('evenodd');
  if (u > 0 && u < 1) { glove(sx + r * .7, sy - r * .7, 2.3, 'grab', 1.4); }
}
function drawOverlays(t, sh) {
  const g = T.g; g.setTransform(1, 0, 0, 1, 0, 0);
  if (t < 1.8) { const b = i => Math.sin(t * TAU / BEAT / 1 + i * .6) * 12; fatTitle(g, 'Cheese, Please!', 960, 300, 118, { bounce: b }); }
  if (t >= 29.3) { const u = ss(seg(t, 29.3, 29.55)); fatTitle(g, 'The End', 960, lerp(-120, 330, u) + (u >= 1 ? 0 : 0), 130); g.save(); g.fillStyle = '#F1EEE6'; g.font = '30px Limelight'; g.textAlign = 'center'; g.fillText('A  RUBBER  HOSE  CARTOON', 960, lerp(-20, 440, u)); g.restore(); }
  const sub = SUBS.find(s => t >= s[0] && t < s[1]); if (sub) subPlate(g, sub[2], 960, 110, { size: 38 });
}

// ————————— sound events for mix.py —————————
export const EV = (() => {
  const ev = [], add = (type, t, o = {}) => ev.push({ type, t, ...o });
  add('title', 0.0); for (let t = .5; t < 3.5; t += .5) add('tick', t);
  add('whistle', 4.5, { d: .7, dir: 1 }); add('pop', 5.2); add('whistle', 5.2, { d: .5, dir: -1 });
  add('stop', 6.0, { d: .5 }); add('stinger', 6.5);
  add('whoosh', 8.3); add('hop', 8.65);
  add('whistle', 11.2, { d: .7, dir: -1 }); add('stop', 14.0, { d: .5 }); add('clang', 14.5); add('boing', 14.7);
  add('kazoo', 16.2); add('whistle', 19.6, { d: 2.9, dir: 1 }); add('boing', 22.5); add('tie', 23.4); add('stop', 24.0, { d: .25 });
  add('whistle', 24.25, { d: .3, dir: -1 }); add('slap', 24.55); add('raspberry', 24.7);
  add('cymbal', 29.3); add('chord', 29.4);
  return ev;
})();
