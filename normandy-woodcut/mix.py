# Synthesised score + foley for the 5 s woodcut (numpy only; no sample downloads)
import numpy as np, soundfile as sf, os
from scipy.signal import butter, sosfilt
SR = 48000; DUR = 5.0; N = int(SR * DUR); rng = np.random.default_rng(7)
out = np.zeros((N, 2))
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], 'band', fs=SR, output='sos'), x)
def lp(x, f): return sosfilt(butter(2, f, 'low', fs=SR, output='sos'), x)
def add(sig, at, gain=1.0, pan=0.0):
    i = int(at * SR); sig = sig[: max(0, N - i)]
    out[i:i + len(sig), 0] += sig * gain * (1 - max(0, pan)); out[i:i + len(sig), 1] += sig * gain * (1 + min(0, pan))
def tt(d): return np.arange(int(SR * d)) / SR
def env(d, a, r): x = np.ones(int(SR * d)); na, nr = int(SR * a), int(SR * r); x[:na] = np.linspace(0, 1, na); x[-nr:] = np.linspace(1, 0, nr); return x
# ambience: waves (filtered noise, slow swell) 0 - 3.0
t = tt(3.0); sw = .5 + .5 * np.sin(2 * np.pi * .35 * t - 1)
add(lp(rng.standard_normal(len(t)), 900) * sw * env(3.0, .5, .3) * .35, 0)
# drone: contrabass-like saw, 55 Hz + fifth, 0 - 3.05 and a tail under plate 3
def drone(d, f, g):
    t = tt(d); s = sum(np.sin(2 * np.pi * f * k * t) / k for k in (1, 2, 3, 4)) + .5 * np.sin(2 * np.pi * f * 1.5 * t)
    return lp(s, 400) * env(d, .6, .5) * g
add(drone(3.05, 55, .22), 0)
add(drone(.9, 55, .16), 4.1)
# knife into wood: fibre-tearing noise ticks while cuts grow
def knife(d):
    t = tt(d); n = bp(rng.standard_normal(len(t)), 1200, 5000) * (1 + .8 * np.sin(2 * np.pi * 14 * t)); return n * env(d, .02, .15)
add(knife(.9), .1, .22, -.3); add(knife(.7), 1.6, .22, .3); add(knife(.4), 4.2, .2, 0)
# paper / brayer on each hard cut (new impression)
def paper(d=.18): return bp(rng.standard_normal(int(SR * d)), 2500, 9000) * env(d, .005, min(.15, d * .8))
add(paper(), 1.5, .35); add(paper(), 4.2, .35)
# woodblock beats
def wood(f=800):
    t = tt(.25); return np.sin(2 * np.pi * f * t) * np.exp(-t * 38) + .3 * bp(rng.standard_normal(len(t)), 600, 3000) * np.exp(-t * 60)
for tm, f in ((2.0, 780), (2.5, 820), (3.0, 760)): add(wood(f), tm, .55, .2)
# silence: duck everything from 3.05 to 3.35
fade = np.ones(N); a, b = int(3.05 * SR), int(3.35 * SR); fade[a:b] = 0; fade[a - 480:a] = np.linspace(1, 0, 480); fade[b:b + 480] = np.linspace(0, 1, 480); out *= fade[:, None]
# gran cassa + shell crack at 3.4
t = tt(1.4); gc = np.sin(2 * np.pi * (48 + 40 * np.exp(-t * 9)) * t) * np.exp(-t * 3.2)
crack = bp(rng.standard_normal(len(t)), 300, 8000) * np.exp(-t * 14)
add(gc * .9 + crack * .6, 3.4, .8)
# rubble/fleck patter after the blast
add(bp(rng.standard_normal(int(SR * .6)), 2000, 7000) * np.exp(-tt(.6) * 7) * (rng.random(int(SR * .6)) > .93), 3.55, .5)
# tam-tam at 4.2: inharmonic partials
t = tt(.8); tam = sum(np.sin(2 * np.pi * f * t + p) * a_ for f, a_, p in ((180, 1, 0), (277, .8, 1), (413, .7, 2), (587, .5, 3.1))) * np.exp(-t * 2.4)
add(tam * .12, 4.2, 1)
# ink pressing the caption: tiny pat
add(paper(.1), 4.3, .25)
# master: gentle limit; mux.sh does loudnorm
out = np.tanh(out * 1.1); os.makedirs('out', exist_ok=True); sf.write('out/mix.wav', out.astype(np.float32), SR)
print('mix ok', out.shape, float(np.abs(out).max()))
