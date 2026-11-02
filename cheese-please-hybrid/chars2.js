// Original 2D cel-shaded characters: Pip (white mouse) and Boris (ginger tabby). Local px coords, y down, origin = ground between feet.
import * as T from './toon.js';
import { lerp, TAU, clamp } from '/core/lib.js';
const { shape, stroke, ell, arc, spline, noodle, quad, push, pop, translate, rotate, scale, tx, S } = T;
const LINE = '#4a3028', LW = 3.4, DK = '#5b1822';
function fillL(pts, col) { const s = pts.map(p => tx(p[0], p[1])), g = T.g; g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = col; g.beginPath(); g.moveTo(s[0][0], s[0][1]); for (const p of s) g.lineTo(p[0], p[1]); g.closePath(); g.fill(); }
const sh = (pts, fill, o = {}) => shape(pts, { fill, lw: o.lw ?? LW, line: o.line ?? LINE, boil: 0, shade: o.shade, stroke: o.stroke });
const st = (pts, lw = LW, col = LINE) => shape(pts, { closed: false, line: col, lw, boil: 0, fill: null });
function hose(a, b, bend, w, col) { shape(noodle(a, b, bend, w, w), { fill: col, lw: LW, line: LINE, boil: 0 }); }
// ---- face parts
function eye(cx, cy, rx, ry, E, o) {
  const t = E?.type || 'open';
  if (t === 'happy') { st(arc(cx, cy + ry * .35, rx, ry * .7, Math.PI * 1.08, Math.PI * 1.92, 14), LW * 1.7); return; }
  if (t === 'shut') { st(arc(cx, cy - ry * .15, rx, ry * .5, Math.PI * .1, Math.PI * .9, 12), LW * 1.7); return; }
  if (t === 'squeeze') { st([[cx - rx, cy - ry * .55], [cx + rx * .8, cy], [cx - rx, cy + ry * .55]], LW * 2); return; }
  const big = t === 'wide' ? 1.22 : 1, R = rx * big, Ry = ry * big, lx = clamp(E?.lx ?? 0, -1, 1), ly = clamp(E?.ly ?? 0, -1, 1);
  let lid = E?.lid ?? 0; if (t === 'sad') lid = Math.max(lid, .3);
  sh(ell(cx, cy, R, Ry), o.sclera || '#fffdf2', { shade: () => {
    const ix = cx + lx * R * .38, iy = cy + ly * Ry * .3 + Ry * .05;
    fillL(ell(ix, iy, R * .62, Ry * .72, 24), o.iris); fillL(ell(ix, iy, R * .34, Ry * .44, 20), '#15100e'); fillL(ell(ix - R * .16, iy - Ry * .22, R * .16, R * .16, 12), '#fff');
    if (lid > .02) { const yl = cy - Ry + lid * 2 * Ry; fillL([[cx - R * 1.2, cy - Ry * 1.3], [cx + R * 1.2, cy - Ry * 1.3], [cx + R * 1.2, yl + (t === 'sad' ? -R * .5 : 0)], [cx - R * 1.2, yl + (t === 'sad' ? R * .15 : 0)]], o.skin); }
  } });
  if (lid > .02) { const yl = cy - Ry + lid * 2 * Ry, hw = Math.sqrt(Math.max(0, 1 - Math.pow((yl - cy) / Ry, 2))) * R; if (hw > 2) st([[cx - hw, yl], [cx + hw, yl]], LW * 1.1); }
}
function brow(cx, cy, w, type, side, th = 1) {
  const s = side, ix = cx - s * w * .5, ox = cx + s * w * .5, lw = LW * 1.7 * th;
  if (type === 'up') st(arc(cx, cy + w * .5, w * .55, w * .4, Math.PI * 1.15, Math.PI * 1.85, 10), lw);
  else if (type === 'sad') st(quad([ix, cy - w * .36], [cx, cy - w * .14], [ox, cy + w * .06]), lw);
  else if (type === 'angry') st(quad([ix, cy + w * .2], [cx, cy - w * .02], [ox, cy - w * .32]), lw * 1.2);
  else if (type === 'flat') st([[cx - w * .45, cy], [cx + w * .45, cy]], lw);
}
function mouthN(cx, cy, w, type, o = {}) {
  const lw = LW * 1.1, h = w * (o.open ?? .6);
  if (type === 'smile') { st(quad([cx - w / 2, cy - w * .08], [cx, cy + w * .36], [cx + w / 2, cy - w * .08]), lw * 1.15); st(arc(cx - w / 2 - 2, cy - w * .08, w * .08, w * .08, Math.PI * .6, Math.PI * 1.4, 6), lw * .8); st(arc(cx + w / 2 + 2, cy - w * .08, w * .08, w * .08, -Math.PI * .4, Math.PI * .4, 6), lw * .8); return; }
  if (type === 'frown') { st(quad([cx - w / 2, cy + w * .12], [cx, cy - w * .22], [cx + w / 2, cy + w * .12]), lw * 1.15); return; }
  if (type === 'flat') { st([[cx - w * .4, cy], [cx + w * .4, cy + 2]], lw * 1.15); return; }
  if (type === 'o') { const r = w * .22; sh(ell(cx, cy + r * .2, r, r * 1.25), DK, { shade: () => fillL(ell(cx, cy + r * 1.3, r * .75, r * .5), '#e8728a') }); return; }
  if (type === 'wavy') { const top = [], bot = []; for (let i = 0; i <= 12; i++) { const u = i / 12, x = cx - w / 2 + u * w; top.push([x, cy - h * .25 + Math.sin(u * TAU * 2) * w * .05]); bot.push([x, cy + h * .35 + Math.sin(u * TAU * 2 + 1) * w * .05]); } sh([...top, ...bot.reverse()], DK); return; }
  const up = type === 'beam' ? .1 : (type === 'grin' ? .04 : -.02);
  const pts = [...quad([cx - w / 2, cy - w * up], [cx, cy + w * (up * .6)], [cx + w / 2, cy - w * up], 10), ...quad([cx + w / 2, cy - w * up], [cx, cy + h * 1.6], [cx - w / 2, cy - w * up], 14).slice(1)];
  sh(pts, DK, { shade: () => { fillL(ell(cx, cy + h * .95, w * .3, h * .45), '#ee7f95'); if (type === 'grin' || type === 'beam') fillL([[cx - w / 2, cy - w * up - 20], [cx + w / 2, cy - w * up - 20], [cx + w / 2, cy + h * .16], [cx - w / 2, cy + h * .16]], '#fffdf5'); } });
}
function glove(x, y, ang, k = 1, type = 'open') {
  push(); translate(x, y); rotate(ang); scale(k);
  sh(ell(20, 0, 17, 15, 22), '#ffffff', { shade: () => fillL([[10, 4], [40, 4], [40, 20], [10, 20]], '#e6dfd6') });
  sh(ell(26, -13, 8, 11, 14, 0), '#ffffff', { lw: LW * .8 });
  if (type === 'open' || type === 'grab') for (const [dx, dy] of [[34, -4], [36, 6], [32, 14]]) sh(ell(dx, dy, 8, 6.5, 12), '#ffffff', { lw: LW * .7 });
  sh(spline([[-4, -13], [6, -19], [10, -13], [10, 13], [6, 19], [-4, 13], [-7, 0]], true, 5), '#fffdf8', { lw: LW * .8 });
  pop();
}
function shoeF(x, y, k = 1, col = '#6b4a3a') { push(); translate(x, y); scale(k); sh(spline([[-15, 0], [-17, -12], [-6, -19], [10, -21], [27, -18], [37, -8], [34, 3], [12, 5], [-8, 4]], true, 6), col, { lw: LW * .9, shade: () => fillL([[-20, -4], [40, -4], [40, 8], [-20, 8]], '#4d3326') }); sh(ell(22, -13, 6, 3, 12), '#c9a48c', { stroke: false }); pop(); }
function cheeseG(x, y, k = 1, rot = 0) { push(); translate(x, y); rotate(rot); scale(k); sh([[-34, 0], [34, 0], [34, -20], [-34, -42]], '#ffd23c', { shade: () => { fillL([[-34, -6], [34, -6], [34, 4], [-34, 4]], '#e9ad1c'); fillL([[-34, -42], [34, -20], [34, -26], [-34, -48]], '#ffe480'); } }); for (const [cx, cy, r] of [[-12, -12, 5], [14, -10, 4], [4, -22, 3.6]]) sh(ell(cx, cy, r, r), '#e8a81c', { lw: LW * .5 }); pop(); }
// ---- Pip: white mouse, ~120 tall
export function mouse(p) {
  const k = p.k ?? 1, dir = p.dir ?? 1, g = p.gait || 'idle', a = (p.ph ?? 0) * TAU, E = p.eyes || {};
  const C = { fur: '#f6eee4', shade: '#dccdbb', ear: '#f5a9b8', skin: '#f6eee4' };
  let fL = [-9, 0], fR = [10, 0], bob = 0, lean = p.lean ?? 0;
  if (g === 'tip') { fL = [12 * Math.sin(a), -9 * Math.max(0, Math.cos(a))]; fR = [-12 * Math.sin(a), -9 * Math.max(0, -Math.cos(a))]; bob = -Math.abs(Math.cos(a)) * 3; }
  if (g === 'run') { fL = [17 * Math.cos(a), -14 + 14 * Math.sin(a)]; fR = [17 * Math.cos(a + Math.PI), -14 + 14 * Math.sin(a + Math.PI)]; lean = .3; bob = -Math.abs(Math.sin(a)) * 4; }
  if (g === 'air') { fL = [16, -22]; fR = [-16, -14]; lean = .2; }
  push(); translate(p.x, p.y + (p.hop ?? 0)); rotate(p.rot ?? 0); scale(dir * k * (p.sx ?? 1), k * (p.sy ?? 1)); translate(0, bob); rotate(lean);
  const armF = p.armF || [20, -50, 'open'], armB = p.armB || [-20, -48, 'open'], shd = [0, -76];
  const arm = (t, front) => { hose(shd, [t[0], t[1]], front ? -6 : 6, 9, C.fur); glove(t[0], t[1], Math.atan2(t[1] - shd[1], t[0] - shd[0]) * .7, .5, t[2]); };
  shape(noodle([-20, -38], [-62 + (p.wag ?? 0), -64 + (p.wag ?? 0) * .5], 16, 5.5, 3), { fill: '#f4b4bc', lw: LW * .8, line: LINE, boil: 0 });
  arm(armB, false);
  hose([6, -32], fR, 5, 9, C.shade); shoeF(fR[0] - 6, fR[1], .5);
  sh(ell(-14, -124, 16, 19), C.fur, {}); sh(ell(-14, -124, 9, 12), C.ear, { stroke: false });
  sh(ell(19, -126, 16, 19), C.fur, {}); sh(ell(19, -126, 9, 12), C.ear, { stroke: false });
  sh(ell(0, -58, 24, 33), C.fur, { shade: () => { fillL([[8, -100], [40, -100], [40, -20], [8, -20]], C.shade); fillL(ell(-4, -52, 14, 22, 20), '#fffaf2'); } });
  sh(ell(2, -100, 27, 22), C.fur, { shade: () => fillL([[14, -130], [40, -130], [40, -70], [14, -70]], C.shade) });
  sh(ell(30, -95, 6, 5), '#e8788a', { lw: LW * .7 });
  for (const [y0, y1] of [[-90, -86], [-94, -98]]) { st([[24, y0], [46, y1]], LW * .45); }
  sh(ell(12, -88, 6, 4, 10), '#f9b9c0', { stroke: false });
  eye(1, -104, 8.5, 11, E, { iris: '#6a4426', skin: C.fur }); eye(18, -105, 8, 10.5, E, { iris: '#6a4426', skin: C.fur });
  if (p.brow) { brow(1, -118, 14, p.brow, -1); brow(18, -119, 14, p.brow, 1); }
  mouthN(14, -85, 15, p.mouth || 'smile');
  hose([-6, -32], fL, 5, 9, C.fur); shoeF(fL[0] - 6, fL[1], .5);
  arm(armF, true);
  if (p.cheese) cheeseG(armF[0] + 10, armF[1] - 4, .6, -.2);
  pop();
}
// ---- Boris: ginger tabby, ~330 tall
function catHeadN(E, mth, o = {}) {
  const C = { fur: '#ee9a46', shade: '#cf7a2c', stripe: '#b45a1c', cream: '#fbe9cf', ear: '#f3a5a8' };
  sh([[-48, -332], [-40, -392], [2, -352]], C.fur); sh([[-42, -342], [-38, -378], [-14, -356]], C.ear, { stroke: false });
  sh([[28, -352], [62, -398], [76, -334]], C.fur); sh([[40, -352], [60, -382], [66, -346]], C.ear, { stroke: false });
  sh(ell(8, -300, 72, 58), C.fur, { shade: () => fillL([[48, -360], [90, -360], [90, -240], [48, -240]], C.shade) });
  for (const dx of [-14, 6, 26]) sh(spline([[dx, -354], [dx + 4, -340], [dx + 1, -330], [dx - 3, -340]], true, 4), C.stripe, { lw: LW * .5 });
  sh(ell(36, -280, 42, 30), C.cream, { lw: LW * .8 });
  sh(spline([[42, -300], [58, -298], [56, -286], [46, -284]], true, 5), '#ee7f94', { lw: LW * .7 });
  for (const [y0, y1] of [[-282, -296], [-276, -280], [-270, -264]]) { st([[66, y0], [118, y1]], LW * .5); st([[-8, y0 - 2], [-60, y1 - 4]], LW * .5); }
  eye(-8, -310, 19, 24, E, { iris: '#4f9a3c', skin: C.fur, sclera: '#fffbe6' }); eye(30, -312, 18, 23, E, { iris: '#4f9a3c', skin: C.fur, sclera: '#fffbe6' });
  if (o.brow) { brow(-8, -340, 38, o.brow, -1, 1.2); brow(30, -341, 36, o.brow, 1, 1.2); }
  mouthN(40, -258, 36, mth || 'smile');
}
export function cat(p) {
  const k = p.k ?? 1, dir = p.dir ?? 1, g = p.gait || 'idle', a = (p.ph ?? 0) * TAU, E = p.eyes || {};
  const C = { fur: '#ee9a46', shade: '#cf7a2c', stripe: '#b45a1c', cream: '#fbe9cf' };
  push(); translate(p.x, p.y + (p.hop ?? 0)); rotate(p.rot ?? 0); scale(dir * k * (p.sx ?? 1), k * (p.sy ?? 1));
  if (p.sleep) {
    shape(noodle([-118, -30], [40, -14], -70, 22, 20), { fill: C.fur, lw: LW, line: LINE, boil: 0 });
    sh(ell(0, -58, 122, 58 * (1 + .04 * Math.cos((p.beat ?? 0) * TAU))), C.fur, { shade: () => fillL([[-130, -34], [130, -34], [130, 0], [-130, 0]], C.shade) });
    for (const x of [-60, -20, 20]) sh(spline([[x, -112], [x + 6, -92], [x, -76], [x - 6, -92]], true, 4), C.stripe, { lw: LW * .5 });
    sh(ell(30, -52, 70, 32), C.cream, { stroke: false });
    sh([[78, -92], [88, -146], [118, -100]], C.fur); sh(ell(104, -64, 54, 44), C.fur); sh(ell(128, -50, 28, 19), C.cream, { lw: LW * .8 }); sh(ell(142, -58, 7, 5), '#ee7f94', { lw: LW * .6 });
    eye(98, -72, 12, 14, { type: 'happy' }, {}); mouthN(124, -38, 18, 'smile'); pop(); return;
  }
  let fL = [-26, 0], fR = [26, 0], bob = 0, lean = p.lean ?? 0;
  if (g === 'run') { fL = [40 * Math.cos(a), -30 + 30 * Math.sin(a)]; fR = [40 * Math.cos(a + Math.PI), -30 + 30 * Math.sin(a + Math.PI)]; lean = .3; bob = -Math.abs(Math.sin(a)) * 10; }
  if (g === 'air') { fL = [52, -70]; fR = [-52, -40]; }
  push(); translate(0, bob); rotate(lean);
  const armF = p.armF || [60, -150, 'open'], armB = p.armB || [-60, -150, 'open'], shF = [50, -224], shB = [-44, -224];
  const arm = (t, s0, front) => { hose(s0, [t[0], t[1]], front ? -14 : 14, 26, C.fur); glove(t[0], t[1], Math.atan2(t[1] - s0[1], t[0] - s0[0]) * .7, 1.08, t[2]); };
  shape(noodle([-70, -110], [-135 + (p.wag ?? 0), -250 + (p.wag ?? 0) * .6], -60, 22, 16), { fill: C.fur, lw: LW, line: LINE, boil: 0 });
  arm(armB, shB, false);
  hose([30, -78], fR, 12, 30, C.shade); sh(ell(fR[0] + 6, fR[1] - 8, 30, 14, 18), C.cream);
  sh(ell(0, -175, 78, 100), C.fur, { shade: () => { fillL([[34, -290], [110, -290], [110, -70], [34, -70]], C.shade); } });
  for (const [x, y] of [[-40, -230], [-52, -190], [-46, -150]]) sh(spline([[x, y], [x + 18, y + 6], [x + 20, y + 14], [x, y + 8]], true, 4), C.stripe, { lw: LW * .5 });
  sh(ell(20, -166, 46, 70), C.cream, { stroke: false });
  catHeadN(E, p.mouth, { brow: p.brow });
  hose([-30, -78], fL, 12, 30, C.fur); sh(ell(fL[0] + 6, fL[1] - 8, 30, 14, 18), C.cream);
  arm(armF, shF, true);
  pop(); pop();
}
export function catHeadBig(E, mth, o) { catHeadN(E, mth, o); }
export const draw = { cheese: cheeseG, glove, hose, sh, st, fillL, LINE, LW };
