# Synthesised 1930s band + foley + radio-chain voices + optical-soundtrack ageing for "Cheese, Please!" (30 s, 120 BPM)
import numpy as np, soundfile as sf, soxr, json, os
from scipy.signal import butter, sosfilt
HERE = os.path.dirname(os.path.abspath(__file__)); SR = 48000; DUR = 30.0; N = int(SR * DUR); rng = np.random.default_rng(11)
EV = json.load(open(f'{HERE}/events.json'))['ev']
bp = lambda x, lo, hi: sosfilt(butter(2, [lo, hi], 'band', fs=SR, output='sos'), x)
lp = lambda x, f: sosfilt(butter(2, f, 'low', fs=SR, output='sos'), x)
hp = lambda x, f: sosfilt(butter(2, f, 'high', fs=SR, output='sos'), x)
tt = lambda d: np.arange(int(SR * d)) / SR
mid = lambda m: 440 * 2 ** ((m - 69) / 12)
def place(buf, s, at, g=1.0):
    i = int(at * SR)
    if i < 0 or i >= N: return
    s = s[: N - i]; buf[i:i + len(s)] += s * g
def ad(t, a, d): return np.minimum(1, t / a) * np.exp(-t * d)
# ---- instruments
def piano(m, d=.6): t = tt(d); f = mid(m); s = sum(np.sin(2*np.pi*f*h*t) / h**1.2 for h in (1, 2, 3, 4, 5, 6)); return s * ad(t, .004, 5) * .25
def tuba(m, d=.35): t = tt(d); f = mid(m); s = lp(np.sign(np.sin(2*np.pi*f*t)) * .6 + np.sin(2*np.pi*f*t), 700); return s * ad(t, .02, 4) * .5
def clar(m, d=.3): t = tt(d); f = mid(m) * (1 + .004*np.sin(2*np.pi*5.5*t)); s = sum(np.sin(2*np.pi*f*h*t) / h for h in (1, 3, 5, 7)); return lp(s, 3000) * ad(t, .03, 2.2) * .22
def banjo(m, d=.3): t = tt(d); f = mid(m); s = sum(np.sin(2*np.pi*f*h*t) / h for h in (1, 2, 3, 4, 5)) * np.exp(-t * 14) + .2*bp(rng.standard_normal(len(t)), 2000, 6000)*np.exp(-t*50); return s * .2
def pizz(m, d=.25): t = tt(d); f = mid(m); return (np.sin(2*np.pi*f*t) + .4*np.sin(2*np.pi*f*2*t)) * np.exp(-t*12) * .45
def brush(d=.2, v=.3): t = tt(d); return bp(rng.standard_normal(len(t)), 3000, 9000) * np.minimum(1, t/.02) * np.exp(-t*14) * v * .3
def wood(f=900, v=1.0): t = tt(.2); return (np.sin(2*np.pi*f*t) * np.exp(-t*40) + .25*bp(rng.standard_normal(len(t)), 700, 3500) * np.exp(-t*70)) * v * .45
def whistle(d, up=True): t = tt(d); f = (500 + 1700*t/d) if up else (2200 - 1700*t/d); ph = np.cumsum(f) / SR; return np.sin(2*np.pi*ph + .6*np.sin(2*np.pi*7*t)) * np.minimum(1, t/.03) * np.minimum(1, (d-t)/.05) * .28
def boing(): t = tt(.7); f = 190 + 120*np.sin(2*np.pi*3*t)*np.exp(-t*3); ph = np.cumsum(f) / SR; return np.sin(2*np.pi*ph) * np.exp(-t*4) * .45
def clang(): t = tt(1.4); s = sum(np.sin(2*np.pi*f*t) * a * np.exp(-t*d) for f, a, d in ((210, 1, 3.2), (341, .8, 3.8), (587, .7, 4.5), (912, .5, 6), (1480, .4, 8))); return (s + bp(rng.standard_normal(len(t)), 800, 5000) * np.exp(-t*30)) * .55
def kazoo(m): t = tt(.18); f = mid(m); return lp(np.sign(np.sin(2*np.pi*f*t)) * .5 + bp(rng.standard_normal(len(t)), 800, 3000)*.3, 3200) * np.minimum(1, t/.01) * np.exp(-t*7) * .3
def raspberry(): t = tt(.5); f = 110 - 40*t; ph = np.cumsum(f) / SR; s = np.sign(np.sin(2*np.pi*ph)) * (1 + .9*np.sign(np.sin(2*np.pi*38*t))); return lp(s, 1200) * np.minimum(1, t/.02) * np.exp(-t*3) * .35
def creak(d): t = tt(d); return bp(np.sign(np.sin(2*np.pi*(90 + 40*np.sin(2*np.pi*9*t))*t)) , 300, 1500) * np.minimum(1, t/.05) * np.minimum(1, (d-t)/.08) * .22
def cymbal(): t = tt(2.2); return hp(rng.standard_normal(len(t)), 4000) * ad(t, .003, 2.2) * .35
def chord(ms, d=1.6): return sum(clar(m, d) * 1.3 + piano(m, d) * .8 for m in ms) * .5
def pop(): t = tt(.12); return np.sin(2*np.pi*(700 - 4000*t)*t) * np.exp(-t*35) * .5
def slap(): t = tt(.2); return (bp(rng.standard_normal(len(t)), 500, 5000) * np.exp(-t*35) + np.sin(2*np.pi*120*t)*np.exp(-t*25)) * .6
def whoosh(): t = tt(.5); return bp(rng.standard_normal(len(t)), 400, 3000) * np.sin(np.pi * t / .5) * .25
music, fx, voice = np.zeros(N), np.zeros(N), np.zeros(N)
STOPS = [(6.0, 6.5), (14.0, 14.5), (24.0, 24.25)]
BEAT = .5
# ---- score: sections on the 0.5 s grid
def bass(m, at): place(music, tuba(m), at)
def chd(ms, at, v=.7): place(music, sum(piano(m, .35) for m in ms) * v, at)
CH = {'C': [60, 64, 67], 'F': [60, 65, 69], 'G': [59, 62, 67], 'Am': [57, 60, 64]}; BASS = {'C': 36, 'F': 41, 'G': 43, 'Am': 33}
prog = ['C', 'Am', 'F', 'G']
TH = [(0, 72), (.5, 76), (1, 79), (1.5, 76), (2, 74), (2.5, 77), (3, 81), (3.5, 77), (4, 76), (4.5, 79), (5, 83), (5.5, 79), (6, 77), (6.5, 74), (7, 71), (7.5, 67)]   # 2-bar theme in beats of 0.5 s
def band(t0, t1, full=True, mel=True):
    b = t0
    while b < t1 - 1e-6:
        bar = int((b - t0) / 2) % 4; c = prog[bar]; beat = int(round(((b - t0) % 2) / BEAT))
        if beat in (0, 2): bass(BASS[c] + (7 if beat == 2 else 0), b)
        else: chd(CH[c], b, .8 if full else .5)
        if full: place(music, brush(.15, .5), b); place(music, banjo(CH[c][0] + 12, .2), b + .25, .8) if beat in (1, 3) else None
        b += BEAT
    if mel:
        for k in range(int((t1 - t0) / 1.0)):
            for off, m in TH[(k * 2) % 16:(k * 2) % 16 + 2]:
                place(music, clar(m, .3), t0 + k * 1.0 + (off % 1.0)) if t0 + k + (off % 1) < t1 else None
for k in range(2, 12): pass
# S1 tiptoe (0.5-6): pizzicato + sparse clarinet, brushes
b = .5
while b < 6.0:
    m = [48, 55, 52, 55][int((b - .5) / BEAT) % 4]; place(music, pizz(m), b)
    if int(round((b - .5) / BEAT)) % 2: place(music, brush(.12, .3), b)
    b += BEAT
for i, m in enumerate([72, 76, 79, 76, 72, 67, 72]): place(music, clar(m, .45), 1.0 + i * 1.0, .7)
place(music, chord([48, 55, 60, 64], 1.2) * .9, 0.0)                  # opening band hit
band(8.0, 14.0, True, True)                                           # chase: full band
for i, m in enumerate([76, 74, 72, 74, 76, 79, 77, 74]): place(music, kazoo(m), 15.2 + i * .5 * 1.0) if 15.2 + i * .5 < 19 else None
b = 15.0
while b < 19.0: chd(CH['C'] if int((b - 15) / 2) % 2 == 0 else CH['G'], b, .5); bass(36 if int((b - 15) / 2) % 2 == 0 else 43, b); b += 1.0
b = 19.5
while b < 24.0: place(music, pizz(48 + (int((b - 19.5) / BEAT) % 3) * 2), b); b += BEAT        # sneaking pizzicato
band(27.0, 29.3, True, True)
place(music, chord([48, 55, 60, 64, 67], 2.0), 29.4)
for a, e in STOPS:                                                  # band stops: everything but the gate hiss drops out (reverb tails included)
    m = np.ones(N); i0, i1 = int(a * SR), int(e * SR); m[i0:i1] = 0; m[i0 - 400:i0] = np.linspace(1, 0, 400); music *= m
# ---- foley from events
for e in EV:
    t, ty = e['t'], e['type']
    if ty == 'tick': place(fx, wood(900 + 40 * (int(t * 2) % 3)), t, .8)
    elif ty == 'whistle': place(fx, whistle(e['d'], e.get('dir', 1) > 0), t)
    elif ty == 'pop': place(fx, pop(), t)
    elif ty == 'stinger': place(fx, sum(clar(m, .5) for m in (55, 62, 67)) * 1.2, t); place(fx, wood(500), t, 2)
    elif ty == 'whoosh': place(fx, whoosh(), t)
    elif ty == 'hop': place(fx, boing() * .5, t)
    elif ty == 'clang': place(fx, clang(), t)
    elif ty == 'boing': place(fx, boing(), t)
    elif ty == 'kazoo': pass
    elif ty == 'tie': place(fx, creak(.8), t)
    elif ty == 'slap': place(fx, slap(), t)
    elif ty == 'raspberry': place(fx, raspberry(), t)
    elif ty == 'cymbal': place(fx, cymbal(), t)
for k in range(8): place(fx, wood(700 - k * 20, .5), 8.3 + k * .25 + (0 if k < 7 else 0), .6)      # chase footsteps
# ---- voices: radio chain, ducking music
V = {'p1': 2.0, 'b1': 6.5, 'p2': 16.2, 'b2': 24.5, 'p3': 26.0}
for k, at in V.items():
    w, sr = sf.read(f'{HERE}/voices/{k}.wav'); w = soxr.resample(w if w.ndim == 1 else w.mean(1), sr, SR)
    w = bp(w, 90, 9500); place(voice, w, at, .9)
env = np.convolve(np.abs(voice), np.ones(int(.1 * SR)) / int(.1 * SR), 'same'); duck = 1 - .6 * np.clip(env / (env.max() * .3 + 1e-9), 0, 1)
mus = music * duck
# ---- clean master: soft peak compression (no film ageing in this edition)
bus = np.tanh((mus + fx) * 1.2) / 1.2
mix = bus * .95 + voice
mix = np.tanh(mix * 2.0) / np.tanh(2.0) * .55; st = np.stack([mix, mix], 1)
os.makedirs(f'{HERE}/out', exist_ok=True); sf.write(f'{HERE}/out/mix.wav', st.astype(np.float32), SR); print('mix ok', st.shape, float(np.abs(st).max()))
