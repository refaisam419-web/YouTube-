# Music-box + drone score, heartbeat, brick foley (steps, muted boom, clacks), narration — Brick Toy sound palette (12 s)
import numpy as np, soundfile as sf, soxr, json, os
from scipy.signal import butter, sosfilt, fftconvolve
HERE = os.path.dirname(os.path.abspath(__file__)); SR = 48000; DUR = 12.0; N = int(SR * DUR); rng = np.random.default_rng(8)
EV = json.load(open(f'{HERE}/events.json'))['ev']
lp = lambda x, f: sosfilt(butter(2, f, 'low', fs=SR, output='sos'), x); bp = lambda x, lo, hi: sosfilt(butter(2, [lo, hi], 'band', fs=SR, output='sos'), x)
tt = lambda d: np.arange(int(SR * d)) / SR; mid = lambda m: 440 * 2 ** ((m - 69) / 12)
def place(buf, s, at, g=1.0):
    i = int(at * SR)
    if i < 0 or i >= N: return
    s = s[: N - i]; buf[i:i + len(s)] += s * g
t = np.arange(N) / SR
bed = (lp(rng.standard_normal(N), 420) * (.5 + .5 * np.sin(2 * np.pi * t / 7 + 1)) * .04 + bp(rng.standard_normal(N), 300, 2500) * (.5 + .5 * np.sin(2 * np.pi * t / 5.5)) * .02) * np.minimum(1, t) * np.clip((DUR - t) / 1.2, 0, 1)
music, fx, voice = np.zeros(N), np.zeros(N), np.zeros(N)
def drone(f, d, g): x = tt(d); s = sum(np.sin(2 * np.pi * f * k * x) / k for k in (1, 2, 3, 4)); return lp(s, 700) * np.minimum(1, x / 1.0) * np.minimum(1, (d - x) / 1.2) * g
for at, d, ms in ((0, 4.0, (38, 45)), (3.8, 4.4, (34, 41)), (8.0, 4.0, (31, 38))):
    for m in ms: place(music, drone(mid(m), d, .08), at)
def mbox(m, d=1.6): x = tt(d); f = mid(m); return (np.sin(2 * np.pi * f * x) + .45 * np.sin(2 * np.pi * f * 2.76 * x) * np.exp(-x * 9)) * np.exp(-x * 3.2) * .18     # music-box bell
for at, m in ((.6, 62), (1.2, 65), (1.8, 69), (2.4, 65), (3.0, 62), (4.2, 69), (5.0, 72), (5.8, 69), (6.6, 65), (7.2, 62), (8.9, 65), (9.6, 62), (10.3, 57)): place(music, mbox(m), at)
def beat(): x = tt(.25); return np.sin(2 * np.pi * (70 - 30 * x / .25) * x) * np.exp(-x * 22) * .5
b = 3.9
while b < 7.9: place(music, beat(), b); place(music, beat() * .6, b + .22); b += .95
m = np.ones(N); a0, a1, a2 = int(7.8 * SR), int(7.9 * SR), int(8.5 * SR); m[a1:a2] = 0; m[a0:a1] = np.linspace(1, 0, a1 - a0); music *= m
def click(v=1.0): x = tt(.1); return (np.sin(2 * np.pi * 2900 * x) + .7 * np.sin(2 * np.pi * 4600 * x)) * np.exp(-x * 70) * v * .4 + bp(rng.standard_normal(len(x)), 1500, 7000) * np.exp(-x * 150) * v * .25
def step(): x = tt(.06); return (bp(rng.standard_normal(len(x)), 1200, 5000) * np.exp(-x * 80) + np.sin(2 * np.pi * 220 * x) * np.exp(-x * 60)) * .3
for e in EV:
    ty, tm = e['type'], e['t']
    if ty == 'step': place(fx, step(), tm, .8)
    elif ty == 'clack': place(fx, click(.8 + hash(str(tm)) % 3 * .1), tm)
    elif ty == 'boom': x = tt(1.6); place(fx, lp(rng.standard_normal(len(x)), 140) * np.exp(-x * 3) * 2.2 + np.sin(2 * np.pi * 52 * x) * np.exp(-x * 3.5) * .6, tm)
IR = rng.standard_normal(int(SR * .5)) * np.exp(-np.arange(int(SR * .5)) / (SR * .1)); IR /= np.abs(IR).max()
for k, at in (('n1', .4), ('n2', 3.9), ('n3', 8.6)):
    w, sr = sf.read(f'{HERE}/voices/{k}.wav'); w = w if w.ndim == 1 else w.mean(1); w = bp(soxr.resample(w, sr, SR), 90, 8500); place(voice, w + fftconvolve(w, IR)[:len(w)] * .1, at)
env = np.convolve(np.abs(voice), np.ones(int(.12 * SR)) / int(.12 * SR), 'same'); duck = 1 - .45 * np.clip(env / (env.max() * .3 + 1e-9), 0, 1)
raw = music * duck + fx + bed + voice * 1.2; mix = np.tanh(raw * 1.8) / np.tanh(1.8) * .55; st = np.stack([mix, mix], 1)
os.makedirs(f'{HERE}/out', exist_ok=True); sf.write(f'{HERE}/out/mix.wav', st.astype(np.float32), SR); print('mix ok', st.shape, float(np.abs(st).max()))
