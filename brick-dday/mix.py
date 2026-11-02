# Narration + synthesised toy score + foley for the 10 s brick film
import numpy as np, soundfile as sf, soxr, json, os
from scipy.signal import butter, sosfilt
HERE = os.path.dirname(os.path.abspath(__file__)); SR = 48000; DUR = 10.0; N = int(SR * DUR); rng = np.random.default_rng(3)
EV = json.load(open(f'{HERE}/events.json'))['ev']
bp = lambda x, lo, hi: sosfilt(butter(2, [lo, hi], 'band', fs=SR, output='sos'), x)
lp = lambda x, f: sosfilt(butter(2, f, 'low', fs=SR, output='sos'), x)
tt = lambda d: np.arange(int(SR * d)) / SR
def place(buf, sig, at, g=1.0):
    i = int(at * SR); sig = sig[: max(0, N - i)]; buf[i:i + len(sig)] += sig * g
music, foley, room, voice = (np.zeros(N) for _ in range(4))
# room tone (fridge-like hum + air) all the way through
room += lp(rng.standard_normal(N), 400) * .02 + np.sin(2 * np.pi * 50 * np.arange(N) / SR) * .004
# foley
def click(v=1.0, pitch=1.0):
    t = tt(.12); s = (np.sin(2*np.pi*2900*pitch*t) + .7*np.sin(2*np.pi*4600*pitch*t)) * np.exp(-t*70) + bp(rng.standard_normal(len(t)), 1500, 7000) * np.exp(-t*160); return s * v * .5
def step(v=.4): t = tt(.05); return bp(rng.standard_normal(len(t)), 1800, 6000) * np.exp(-t*90) * v * .5
for e in EV:
    if e['type'] == 'click': place(foley, click(e.get('v', 1)), e['t'], .8)
    elif e['type'] == 'step': place(foley, step(e.get('v', .4)), e['t'], .7)
# boat gliding: soft wave noise 0-3
t = tt(3.0); place(foley, lp(rng.standard_normal(len(t)), 700) * (.5 + .5*np.sin(2*np.pi*.5*t)) * np.minimum(1, t*2) * np.minimum(1, (3-t)*2) * .05, 0)
# music: glockenspiel + pizzicato, bar-aligned at 100 BPM (beat .6 s)
def glock(f, d=.9): t = tt(d); return (np.sin(2*np.pi*f*t) + .35*np.sin(2*np.pi*f*4.01*t)*np.exp(-t*8)) * np.exp(-t*4.5)
def pizz(f, d=.4): t = tt(d); return np.sin(2*np.pi*f*t) * np.exp(-t*9) + .3*np.sin(2*np.pi*f*2*t)*np.exp(-t*14)
def melodica(fs, d): t = tt(d); s = sum(np.sign(np.sin(2*np.pi*f*t)) * .15 + np.sin(2*np.pi*f*t) * .3 for f in fs); return lp(s, 3500) * np.minimum(1, t*6) * np.exp(-np.maximum(0, t-.6)*2.2)
C = lambda m: 440 * 2 ** ((m - 69) / 12)
beat = .6
for i, m in enumerate([72, 76, 79, 76, 74, 77, 81, 77, 76, 79, 83]):   # tune plinks
    at = i * beat
    if 6.6 <= at < 7.2: continue
    place(music, glock(C(m)), at, .22)
for i in range(16):
    at = i * beat * 2 / 2 ; m = [48, 55, 52, 55][i % 4]
    if at < 6.6 or at >= 7.2: place(music, pizz(C(m - 12 + 12)), at, .25)
place(music, melodica([C(60), C(64), C(67), C(72)], 1.0), 9.0, .35)
# silence beat 6.6-7.2: music and foley drop out, only room tone
cut = np.ones(N); a, b = int(6.6*SR), int(7.2*SR); cut[a:b] = 0; cut[a-1200:a] = np.linspace(1, 0, 1200); cut[b:b+1200] = np.linspace(0, 1, 1200); music *= cut; foley *= np.where(cut > 0, 1, 0.0)
# voice: three lines, compressed
VO = json.load(open(f'{HERE}/lines.json')); starts = {'l1': .4, 'l2': 3.2, 'l3': 7.2}
for L in VO:
    w, sr = sf.read(f'{HERE}/voices/{L["id"]}.wav'); w = soxr.resample(w if w.ndim == 1 else w.mean(1), sr, SR); place(voice, np.tanh(w * 2.2) / np.tanh(2.2), starts[L['id']], .9)
# duck music ~40 % under voice
env = np.convolve(np.abs(voice), np.ones(int(.08*SR))/int(.08*SR), 'same'); duck = 1 - .4 * np.clip(env / (env.max() * .3 + 1e-9), 0, 1)
mix = voice + music * duck * .9 + foley + room
mix = np.tanh(mix * 1.1); st = np.stack([mix, mix], 1)
os.makedirs(f'{HERE}/out', exist_ok=True); sf.write(f'{HERE}/out/mix.wav', st.astype(np.float32), SR); print('mix ok', st.shape, float(np.abs(st).max()))
