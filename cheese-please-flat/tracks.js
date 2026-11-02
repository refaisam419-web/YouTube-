// Cheese, Please! — 30 s rubber-hose cartoon. Original cast: Pip (mouse), Boris (cat). 120 BPM: beat = 0.5 s = 12 frames.
import { clamp, lerp, seg, ss, eio, hash, TAU } from '/core/lib.js';

export const DUR = 30, BEAT = .5;
export const CUTS = [6, 8, 15, 19, 27];
export const FL = 980, X = { hole: 620, table: 1000, puddle: 830, stove: 230, basket: 1500 };
export const VO = { p1: [2.0, 1.429], b1: [6.5, 1.185], p2: [16.2, 1.196], b2: [24.5, 1.348], p3: [26.0, 1.124] };
export const SUBS = [[1.9, 4.1, 'Just one little nibble.'], [6.4, 8.2, 'Breakfast!'], [16.1, 18.2, 'Nice try, pal!'], [24.4, 27.4, 'Ouch! My arm!   Thanks for the hand!']];
export const frozen = t => (t >= 14.0 && t < 14.5) ? 14.0 : t;               // band stop: everything freezes
export const q12 = t => Math.floor(t * 12 + 1e-6) / 12;                          // characters on twos
export const talk = (t, k) => { const [s, d] = VO[k]; return t >= s && t < s + d ? (Math.floor(t * 12) % 2 ? 'open' : 'o') : null; };
export const beatOf = t => t / BEAT;
const tiptoeX = t => lerp(X.hole, 900, ss(seg(t, .5, 3.5)));
export function pipAt(t) {
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
export function catAt(t) {
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
export function armTarget(t) {   // world position of Boris's front hand
  const home = [260 + 60 * 1.08, FL - 150 * 1.08];
  if (t < 19.5) return home;
  if (t < 22.5) { const u = ss(seg(t, 19.5, 22.5)); return [lerp(home[0], X.hole, u), lerp(home[1], 955, u)]; }
  if (t < 24.25) return [X.hole, 955];
  const u = ss(seg(t, 24.25, 24.55)); return [lerp(X.hole, 260 + 36, u), lerp(955, FL - 262 * 1.08, u)];
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
