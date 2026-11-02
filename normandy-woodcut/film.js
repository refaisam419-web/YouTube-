// Normandy, 6 June 1944 — 5 s woodcut. Three plates: landing craft / obstacles + flash / helmet.
import * as WC from './engine/index.js';
export const DUR = 5, CAPTION = '6 JUNE 1944', CAP_T = 4.2;
export const EV = [
  { t: 0.0, type: 'drone' }, { t: 0.1, type: 'carve' }, { t: 1.5, type: 'cut' }, { t: 1.6, type: 'carve' },
  { t: 2.0, type: 'wood' }, { t: 2.5, type: 'wood' }, { t: 3.0, type: 'wood' },
  { t: 3.05, type: 'silence', dur: 0.3 }, { t: 3.4, type: 'boom' }, { t: 4.2, type: 'cut' }, { t: 4.2, type: 'tam' }, { t: 4.3, type: 'ink' },
];
const W = 1920, H = 1080, IMG = { x: 36, y: 36, w: 1848, h: 912 };
const [M, m] = WC.canvas(W, H), [C, c] = WC.canvas(W, H);
let P, S = null;
const KX = (x, y) => (x + y * .3) / 2200;
const L = WC.light(.5, -.6, .6);
const rot = (pts, a, cx, cy) => pts.map(([x, y]) => [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)]);
const bar = (cx, cy, len, th, a) => rot(WC.rect(cx - len / 2, cy - th / 2, len, th), a, cx, cy);
const wave = (y0, amp, ph, x0 = 40, x1 = 1880) => { const o = []; for (let x = x0; x <= x1; x += 40) o.push([x, y0 + Math.sin(x / 140 + ph) * amp]); return o; };

function build() {
  P = WC.makePrinter(W, H);
  const s = S = {};
  // ---- Plate 1: landing craft under a sky of rays (0 – 1.5)
  s.p1 = [];
  s.p1.push(WC.rays(1480, 140, { n: 46, r0: 110, r1: [600, 1500], w: 18, seed: 3, reveal: { t0: 0.0, t1: 0.9 } }));
  for (let i = 0; i < 13; i++) s.p1.push(WC.cutAlong(wave(600 + i * i * 2.2 + i * 6, 4 + i * .7, i), { w: 3 + i * .9, kind: i < 6 ? 'v' : 'u', seed: i + 11, seg: [90, 220], gap: [14, 40], reveal: { t0: .25 + i * .05, t1: 1.0 + i * .03, speed: 1400 } }));
  s.craft = WC.shape([[[200, 520], [1230, 500], [1360, 660], [140, 700]]], { light: L, sp: 9, halo: 10, reveal: { key: KX, t0: .1, t1: 1.0, key: (x) => x / 1500 } });
  s.ramp = WC.shape([[[1230, 500], [1450, 640], [1440, 680], [1220, 580]]], { light: L, sp: 8, halo: 8, reveal: { key: KX, t0: .5, t1: 1.1, key: (x) => x / 1500 } });
  s.men1 = [0, 1, 2, 3, 4, 5, 6].map(i => WC.shape([WC.ellipse(300 + i * 130, 478 + (i % 2) * 6, 44, 34, 24).concat([]), WC.rect(280 + i * 130, 500, 40, 30)].slice(0, 1), { light: L, sp: 6, halo: 6, reveal: { key: KX, t0: .6 + i * .05, t1: 1.2 } }));
  // ---- Plate 2: beach obstacles, wading men (1.5 – 4.2)
  const T0 = 1.5;
  s.p2 = [];
  s.p2.push(WC.rays(900, 500, { n: 40, r0: 60, r1: [500, 1400], w: 14, seed: 5, reveal: { t0: T0 + .05, t1: T0 + .7 } }));
  for (let i = 0; i < 9; i++) s.p2.push(WC.cutAlong(wave(640 + i * 28, 6, i * 1.3), { w: 4 + i, kind: 'u', seed: i + 31, seg: [120, 300], gap: [16, 46], reveal: { t0: T0 + .2 + i * .05, t1: T0 + .9, speed: 1600 } }));
  s.hedge = [[420, 700, 1.15], [760, 650, .85], [1010, 780, 1.45], [1480, 690, 1.0], [1700, 640, .7]].map(([x, y, k], i) => {
    const polys = [bar(x, y, 150 * k, 16 * k, .6), bar(x, y, 150 * k, 16 * k, -.6), bar(x, y, 150 * k, 16 * k, Math.PI / 2)];
    return WC.shape(polys, { light: L, sp: 7, halo: 7, reveal: { key: KX, t0: T0 + .2 + i * .1, t1: T0 + .9 + i * .1 } });
  });
  s.men2 = [[560, 800, 1.6], [900, 740, 1.3], [1180, 840, 1.9], [1560, 770, 1.4]].map(([x, y, k], i) => {
    const body = [[x - 22 * k, y - 100 * k], [x + 22 * k, y - 100 * k], [x + 30 * k, y], [x - 30 * k, y]];
    return [WC.shape([body], { light: L, sp: 6, halo: 6, reveal: { key: KX, t0: T0 + .35 + i * .1, t1: T0 + 1.0 + i * .1 } }),
      WC.shape([WC.ellipse(x, y - 125 * k, 26 * k, 22 * k, 20)], { light: L, sp: 5, halo: 5, reveal: { key: KX, t0: T0 + .4 + i * .1, t1: T0 + 1.0 + i * .1 } })];
  });
  s.flash = WC.rays(1280, 480, { n: 64, r0: 30, r1: [320, 960], w: 22, seed: 9, jit: .6, reveal: { t0: 3.4, t1: 3.58 } });
  s.fleck = WC.flecks(Array.from({ length: 50 }, (_, i) => [1280 + Math.cos(i * 2.4) * (60 + i * 7), 480 + Math.sin(i * 2.4) * (40 + i * 5), 4 + (i % 4)]), { seed: 2 });
  // ---- Plate 3: helmet in the surf (4.2 – 5)
  const T3 = 4.2;
  s.p3 = [WC.rays(960, 560, { n: 50, r0: 330, r1: [520, 1100], w: 16, seed: 7, reveal: { t0: T3, t1: T3 + .4 } })];
  for (let i = 0; i < 8; i++) s.p3.push(WC.cutAlong(wave(690 + i * 30, 5 + i, i * .9), { w: 4 + i * 1.1, kind: 'u', seed: i + 51, seg: [120, 300], gap: [14, 40], reveal: { t0: T3 + i * .03, t1: T3 + .5, speed: 2200 } }));
  const dome = []; for (let i = 0; i <= 40; i++) { const a = Math.PI + i / 40 * Math.PI; dome.push([960 + Math.cos(a) * 280, 620 + Math.sin(a) * 230]); }
  s.dome = WC.shape([dome], { light: L, sp: 8, halo: 10, dir: WC.dirRing ? WC.dirRing(960, 620, 1) : 'contour', reveal: { key: KX, t0: T3, t1: T3 + .55, key: (x) => Math.abs(x - 960) / 300 } });
  s.brim = WC.shape([WC.ellipse(960, 626, 390, 44, 48)], { light: L, sp: 7, halo: 8, reveal: { key: KX, t0: T3 + .15, t1: T3 + .6 } });
}

function begin() {
  m.setTransform(1, 0, 0, 1, 0, 0); c.setTransform(1, 0, 0, 1, 0, 0);
  m.fillStyle = '#fff'; m.fillRect(0, 0, W, H); c.clearRect(0, 0, W, H);
  m.save(); m.beginPath(); m.rect(IMG.x, IMG.y, IMG.w, IMG.h); m.clip(); m.fillStyle = '#000'; m.fillRect(0, 0, W, H);
}
function end() { m.restore(); }

export function render(g, t) {
  if (!P) build();
  begin();
  const plate = t < 1.5 ? 1 : t < 4.2 ? 2 : 3;
  const tt = plate === 1 ? t : t;
  let zoom = 1, cx = 960, cy = 492;
  if (plate === 1) zoom = 1 + .06 * (t / 1.5);                                // slow push
  if (plate === 2 && t > 3.4) zoom = 1 + .12 * Math.min(1, (t - 3.4) / .15); // snap zoom on the flash
  m.translate(cx, cy); m.scale(zoom, zoom); m.translate(-cx, -cy);
  if (plate === 1) {
    for (const k of S.p1) WC.drawStrokes(m, k, { t });
    S.craft.draw(m, t); S.ramp.draw(m, t); S.men1.forEach(x => x.draw(m, t));
  } else if (plate === 2) {
    WC.drawStrokes(m, S.p2[0], { t });
    for (let i = 1; i < S.p2.length; i++) WC.drawStrokes(m, S.p2[i], { t });
    S.hedge.forEach(x => x.draw(m, t)); S.men2.forEach(a => a.forEach(x => x.draw(m, t)));
    if (t >= 3.4) {
      WC.drawStrokes(m, S.flash, { t }); WC.drawStrokes(m, S.fleck, { t });
      const a = Math.max(0, 1 - Math.max(0, t - 3.7) / .5);
      c.setTransform(zoom, 0, 0, zoom, cx - cx * zoom, cy - cy * zoom);
      WC.plate(c, [WC.ellipse(1280, 480, 250, 230, 48)], a);
      c.setTransform(1, 0, 0, 1, 0, 0);
    }
  } else {
    for (const k of S.p3) WC.drawStrokes(m, k, { t });
    S.dome.draw(m, t); S.brim.draw(m, t);
    if (t > 4.5) WC.plate(c, [WC.ellipse(840, 470, 38, 20, 24, -.4)], Math.min(1, (t - 4.5) / .15));
  }
  end();
  if (t >= CAP_T) { m.font = '400 44px "IM Fell English"'; m.textAlign = 'center'; m.textBaseline = 'middle'; m.fillStyle = `rgba(0,0,0,${Math.min(1, (t - CAP_T) / .1)})`; m.fillText(CAPTION, W / 2, IMG.y + IMG.h + (H - IMG.y - IMG.h) / 2 + 2); }
  const sinceCut = plate === 2 ? t - 1.5 : plate === 3 ? t - 4.2 : 9;
  const reg = sinceCut >= 0 && sinceCut < 2 / 24 ? [5, -3] : [0, 0];
  g.drawImage(P.render(M, C, { seed: 4, inkSeed: plate, plate: '#C8502A', reg }), 0, 0);
}
