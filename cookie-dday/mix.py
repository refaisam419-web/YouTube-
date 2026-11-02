# Solemn score + surf/wind bed + muffled distant booms + narration with light reverb (14 s)
import numpy as np, soundfile as sf, soxr, json, os
from scipy.signal import butter, sosfilt, fftconvolve
HERE = os.path.dirname(os.path.abspath(__file__)); SR = 48000; DUR = 14.0; N = int(SR * DUR); rng = np.random.default_rng(21)
lp = lambda x, f: sosfilt(butter(2, f, 'low', fs=SR, output='sos'), x); hp = lambda x, f: sosfilt(butter(2, f, 'high', fs=SR, output='sos'), x); bp = lambda x, lo, hi: sosfilt(butter(2, [lo, hi], 'band', fs=SR, output='sos'), x)
tt = lambda d: np.arange(int(SR * d)) / SR; mid = lambda m: 440 * 2 ** ((m - 69) / 12)
def place(buf, s, at, g=1.0):
    i = int(at * SR)
    if i < 0 or i >= N: return
    s = s[: N - i]; buf[i:i + len(s)] += s * g
t = np.arange(N) / SR
# surf + wind bed (the only sound inside the silence)
swell = .55 + .45 * np.sin(2 * np.pi * t / 6.5 - 1.2); wind = lp(rng.standard_normal(N), 500) * (.5 + .5 * np.sin(2 * np.pi * t / 9 + 2)) * .05
surf = bp(rng.standard_normal(N), 250, 3200) * swell * .06
bed = (wind + surf) * np.minimum(1, t / 1.0) * np.clip((DUR - t) / 1.5, 0, 1)
music = np.zeros(N)
# string drone chords, slow swells (cello-like: filtered saw)
def string(f, d, g):
    x = np.arange(int(SR * d)) / SR; v = 1 + .004 * np.sin(2 * np.pi * 5.2 * x); s = sum(np.sin(2 * np.pi * f * k * v * x) / k for k in (1, 2, 3, 4, 5)); return lp(s, 900) * np.minimum(1, x / 1.2) * np.minimum(1, (d - x) / 1.4) * g
for at, d, notes in ((0, 4.2, (38, 45, 50)), (4.0, 4.4, (34, 41, 46)), (8.2, 3.8, (31, 38, 43)), (11.6, 2.4, (38, 45, 50))):
    for m in notes: place(music, string(mid(m), d, .09), at)
for at, m in ((4.4, 69), (9.5, 65), (11.8, 62)): place(music, string(mid(m), 3.0, .05), at)           # a held high line under the narration
# heartbeat 4.0 - 8.3, then silence until 9.5
def beat():
    x = tt(.25); return (np.sin(2 * np.pi * (70 - 30 * x / .25) * x) * np.exp(-x * 22)) * .5
b = 4.0
while b < 8.3: place(music, beat(), b); place(music, beat() * .6, b + .22); b += .95
# muffled distant booms
for at, g in ((2.1, .5), (6.2, .8), (7.3, .35)):
    x = tt(1.8); place(music, lp(rng.standard_normal(len(x)), 120) * np.exp(-x * 2.6) * 2.4 * g, at)
# the final piano-like note
x = tt(3.0); note = sum(np.sin(2 * np.pi * mid(62) * k * x) / k ** 1.4 for k in (1, 2, 3, 4)) * np.exp(-x * 1.5) * .22; place(music, note, 11.8)
# silence beat 8.3 - 9.5: music off, bed stays
m = np.ones(N); a0, a1, a2 = int(8.2 * SR), int(8.3 * SR), int(9.5 * SR); m[a1:a2] = 0; m[a0:a1] = np.linspace(1, 0, a1 - a0); music *= m
# narration: warm EQ + small room
IR = rng.standard_normal(int(SR * .6)) * np.exp(-np.arange(int(SR * .6)) / (SR * .12)); IR /= np.abs(IR).max()
voice = np.zeros(N)
for k, at in (('n1', .5), ('n2', 4.4), ('n3', 9.5)):
    w, sr = sf.read(f'{HERE}/voices/{k}.wav'); w = w if w.ndim == 1 else w.mean(1); w = soxr.resample(w, sr, SR); w = bp(w, 90, 8500)
    wet = fftconvolve(w, IR)[:len(w)] * .12; place(voice, w + wet, at, 1.0)
env = np.convolve(np.abs(voice), np.ones(int(.12 * SR)) / int(.12 * SR), 'same'); duck = 1 - .45 * np.clip(env / (env.max() * .3 + 1e-9), 0, 1)
raw = music * duck + bed + voice * 1.2
mix = np.tanh(raw * 1.8) / np.tanh(1.8) * .55; st = np.stack([mix, mix], 1)
os.makedirs(f'{HERE}/out', exist_ok=True); sf.write(f'{HERE}/out/mix.wav', st.astype(np.float32), SR); print('mix ok', st.shape, float(np.abs(st).max()))
