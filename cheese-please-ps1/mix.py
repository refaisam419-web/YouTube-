# Chiptune score (2 pulse + triangle + noise), 8-bit sound effects and 8-bit/11 kHz game voice clips for the PS1 edition (30 s, 120 BPM)
import numpy as np, soundfile as sf, soxr, json, os
from scipy.signal import butter, sosfilt
HERE = os.path.dirname(os.path.abspath(__file__)); SR = 48000; DUR = 30.0; N = int(SR * DUR); rng = np.random.default_rng(5)
EV = json.load(open(f'{HERE}/events.json'))['ev']
lp = lambda x, f: sosfilt(butter(2, f, 'low', fs=SR, output='sos'), x)
bp = lambda x, lo, hi: sosfilt(butter(2, [lo, hi], 'band', fs=SR, output='sos'), x)
tt = lambda d: np.arange(int(SR * d)) / SR
mid = lambda m: 440 * 2 ** ((m - 69) / 12)
def place(buf, s, at, g=1.0):
    i = int(at * SR)
    if i < 0 or i >= N: return
    s = s[: N - i]; buf[i:i + len(s)] += s * g
def pulse(f, d, duty=.5, dec=3.0, vol=.2):
    t = tt(d); ph = (f * t) % 1; s = np.where(ph < duty, 1., -1.); return s * np.minimum(1, t / .004) * np.exp(-t * dec) * vol
def tri(f, d, dec=2.0, vol=.35):
    t = tt(d); ph = (f * t) % 1; s = 4 * np.abs(ph - .5) - 1; return np.round(s * 7.5) / 7.5 * np.minimum(1, t / .004) * np.exp(-t * dec) * vol   # 4-bit triangle
def noise(d, dec=20, vol=.3, hi=True):
    t = tt(d); n = rng.choice([-1., 1.], len(t)); n = np.repeat(n[::6], 6)[:len(t)] if not hi else n; return n * np.exp(-t * dec) * vol
def sweep(f0, f1, d, duty=.5, vol=.25, dec=0):
    t = tt(d); f = f0 + (f1 - f0) * t / d; ph = np.cumsum(f) / SR % 1; return np.where(ph < duty, 1., -1.) * np.minimum(1, t / .003) * np.minimum(1, (d - t) / .01) * np.exp(-t * dec) * vol
music, fx, voice = np.zeros(N), np.zeros(N), np.zeros(N)
STOPS = [(6.0, 6.5), (14.0, 14.5), (24.0, 24.25)]
BEAT = .5; prog = ['C', 'Am', 'F', 'G']; CH = {'C': [60, 64, 67], 'F': [60, 65, 69], 'G': [59, 62, 67], 'Am': [57, 60, 64]}; BS = {'C': 36, 'F': 41, 'G': 43, 'Am': 33}
TH = [72, 76, 79, 76, 74, 77, 81, 77, 76, 79, 83, 79, 77, 74, 71, 67]
def band(t0, t1, drums=True, lead=True):
    b = t0
    while b < t1 - 1e-6:
        i = int(round((b - t0) / BEAT)); c = prog[(i // 4) % 4]; beat = i % 4
        place(music, tri(mid(BS[c] + (7 if beat in (2,) else 0)), .45), b)
        for j, m in enumerate(CH[c]): place(music, pulse(mid(m + 12), .12, .25, 14, .09), b + (j * .125))           # arpeggio on pulse 2
        if drums:
            if beat in (0, 2): place(music, np.sin(2 * np.pi * (140 - 100 * tt(.12) / .12) * tt(.12)) * np.exp(-tt(.12) * 25) * .5, b)
            if beat in (1, 3): place(music, noise(.12, 24, .28), b)
            place(music, noise(.04, 90, .1), b + .25)
        if lead: place(music, pulse(mid(TH[i % 16]), .4, .5 if beat % 2 else .25, 3.5, .17), b)
        b += BEAT
# S1 sneaky (0.5-6): short staccato pulse + triangle walking bass
b = .5; i = 0
while b < 6.0: place(music, tri(mid([36, 43, 40, 43][i % 4]), .3, 5), b); place(music, pulse(mid([72, 76, 79, 76, 72, 67, 72, 76][i % 8]), .1, .125, 12, .13), b); b += BEAT; i += 1
place(music, sum(pulse(mid(m), .5, .5, 3, .12) for m in (48, 55, 60, 64)), 0.0)         # title chord
band(8.0, 14.0)                                                                           # chase
b = 15.0; i = 0
while b < 19.0: place(music, pulse(mid([76, 74, 72, 74][i % 4]), .35, .25, 4, .15), b); place(music, tri(mid(36 if (i // 4) % 2 == 0 else 43), .4), b); b += BEAT; i += 1
b = 19.5; i = 0
while b < 24.0: place(music, pulse(mid(48 + (i % 3) * 2), .12, .125, 10, .12), b); place(music, tri(mid(31), .3, 4), b); b += BEAT; i += 1
band(27.0, 29.3, True, True)
place(music, sum(pulse(mid(m), 1.8, .5, 1.6, .11) for m in (48, 55, 60, 64, 67)), 29.4)
for a, e in STOPS:
    m = np.ones(N); m[int(a * SR):int(e * SR)] = 0; music *= m                                                      # digital silence
# ---- 8-bit sound effects
for e in EV:
    t, ty = e['t'], e['type']
    if ty == 'tick': place(fx, pulse(1100 + 80 * (int(t * 2) % 3), .05, .25, 60, .3), t)
    elif ty == 'whistle': d = e['d']; place(fx, sweep(500, 2200, d, .5, .2) if e.get('dir', 1) > 0 else sweep(2200, 500, d, .5, .2), t)
    elif ty == 'pop': place(fx, sweep(900, 200, .08, .5, .3), t)
    elif ty == 'stinger': place(fx, sum(pulse(mid(m), .45, .5, 5, .12) for m in (55, 62, 67)), t)
    elif ty == 'whoosh': place(fx, noise(.4, 6, .2), t)
    elif ty == 'hop': place(fx, sweep(300, 700, .15, .25, .22), t)
    elif ty == 'clang': place(fx, sum(pulse(f, 1.0, .5, 5, .1) for f in (210, 341, 587, 912)), t); place(fx, noise(.4, 12, .3), t)
    elif ty == 'boing': place(fx, sweep(150, 520, .35, .5, .25, 3) , t)
    elif ty == 'tie': place(fx, sweep(120, 200, .6, .125, .15), t)
    elif ty == 'slap': place(fx, noise(.15, 28, .5), t); place(fx, sweep(200, 60, .12, .5, .3), t)
    elif ty == 'raspberry': place(fx, sweep(110, 70, .5, .125, .3), t)
    elif ty == 'cymbal': place(fx, noise(1.8, 3, .3), t)
for k in range(8): place(fx, pulse(600 - k * 15, .04, .25, 80, .22), 8.3 + k * .25)
# ---- voices: 8-bit, 11.025 kHz game clips
V = {'p1': 2.0, 'b1': 6.5, 'p2': 16.2, 'b2': 24.5, 'p3': 26.0}
for k, at in V.items():
    w, sr = sf.read(f'{HERE}/voices/{k}.wav'); w = w if w.ndim == 1 else w.mean(1)
    w = soxr.resample(w, sr, 11025); w = lp(np.repeat(np.round(w / np.max(np.abs(w)) * 127) / 127, 1), 4800) if False else np.round(w / (np.max(np.abs(w)) + 1e-9) * 100) / 100
    w = np.repeat(w, SR // 11025 + 1)[:int(len(w) * SR / 11025)]; w = lp(w, 4200)
    place(voice, w, at, .95)
env = np.convolve(np.abs(voice), np.ones(int(.1 * SR)) / int(.1 * SR), 'same'); duck = 1 - .55 * np.clip(env / (env.max() * .3 + 1e-9), 0, 1)
raw = music * duck * 1.1 + fx * 1.0 + voice * 1.0; mix = np.tanh(raw * 2.2) / np.tanh(2.2) * .55; st = np.stack([mix, mix], 1)
os.makedirs(f'{HERE}/out', exist_ok=True); sf.write(f'{HERE}/out/mix.wav', st.astype(np.float32), SR); print('mix ok', st.shape, float(np.abs(st).max()))
