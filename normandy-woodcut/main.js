const cv = document.getElementById('cv'), g = cv.getContext('2d');
await document.fonts.load('400 44px "IM Fell English"');
const m = await import('./film.js');
window.DUR = m.DUR; window.EV = m.EV; window.render = t => m.render(g, t);
window.TEXTS = t => (t >= m.CAP_T ? [{ id: 'cap', text: m.CAPTION, x0: 700, y0: 960, x1: 1220, y1: 1060 }] : []);
window.READY = true;
