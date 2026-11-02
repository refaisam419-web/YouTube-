import * as T from './toon.js';
import { makeFilm, post } from './film.js';
const cv = document.getElementById('c'); T.init(cv);
for (const f of ['38px "IM Fell English SC"', '40px Shrikhand', '40px Limelight']) await document.fonts.load(f);
const S = await import('./scene.js');
const F = makeFilm(cv); T.init(F.scene);
window.DUR = S.DUR; window.EV = S.EV; window.SUBS = S.SUBS;
window.render = t => {
  t = Math.min(t, S.DUR - 1e-4);
  const sg = F.sg; sg.setTransform(1, 0, 0, 1, 0, 0); sg.fillStyle = '#000'; sg.fillRect(0, 0, 1920, 1080);
  S.draw(t);
  const f = Math.round(t * 24), jump = S.CUTS.some(c => Math.round(c * 24) === f) ? 3 : 0;
  post(F, t, { jump });
};
window.READY = true;
