"""Builds app/public/sounds/sword-draw.m4a, the sword drawn at match start, from real CC0 recordings (Kenney "RPG Audio" and
"Impact Sounds", kenney.nl). It replaces a Freesound file whose license could not be traced (Arda, 21 October 2026) and follows
its shape: a click at the scabbard mouth, a bright scrape that swells for ~0.3 s, then a "shing" that rings at about 2.65 and
3.2 kHz and fades over ~1.2 s. The scrape is two knife draws slowed down to sword weight; the ring is a real metal tap whose
sound is carried on by tuned resonators (a struck blade rings at its own partials).
Run: python3 tools/make-sword-draw.py <folder with the unzipped kenney_rpg-audio and kenney_impact-sounds packs>   (macOS: afconvert)"""
import aifc, array, glob, math, os, subprocess, sys, tempfile

SRC = sys.argv[1]
SR = 44100
OUT = 'app/public/sounds/sword-draw.m4a'


def load(stem):
    path = glob.glob(f'{SRC}/**/{stem}.ogg', recursive=True)[0]
    tmp = tempfile.mktemp(suffix='.aif')
    subprocess.run(['afconvert', '-f', 'AIFF', '-d', f'BEI16@{SR}', '-c', '1', path, tmp], check=True)
    f = aifc.open(tmp); a = array.array('h', f.readframes(f.getnframes())); f.close(); os.remove(tmp)
    if sys.byteorder == 'little': a.byteswap()
    return [x / 32768 for x in a]


def slow(s, rate):
    """Plays a recording at `rate` speed (below 1: longer and lower, like a bigger blade)."""
    n = int(len(s) / rate)
    out = []
    for i in range(n):
        p = i * rate; j = int(p); f = p - j
        out.append(s[j] * (1 - f) + (s[j + 1] if j + 1 < len(s) else 0) * f)
    return out


def resonate(x, freq, t60, n):
    """Two-pole resonator: the input keeps ringing at `freq`, falling 60 dB in `t60` seconds."""
    r = 10 ** (-3 / (t60 * SR)); c = 2 * r * math.cos(2 * math.pi * freq / SR); r2 = r * r
    y1 = y2 = 0.0; out = []
    for i in range(n):
        y = (x[i] if i < len(x) else 0.0) * (1 - r) + c * y1 - r2 * y2
        out.append(y); y2, y1 = y1, y
    return out


def mix(dst, src, at, gain):
    o = int(at * SR)
    for i, v in enumerate(src):
        if o + i < len(dst): dst[o + i] += v * gain


def norm(s):
    p = max(1e-9, max(abs(v) for v in s)); return [v / p for v in s]


total = [0.0] * int(1.85 * SR)
mix(total, norm(load('metalClick')), 0.0, 0.18)                       # the guard leaves the scabbard
scrape = norm(slow(load('drawKnife1'), 0.88))
mix(total, scrape, 0.03, 1.0)                                          # bright scrape, peaks ~0.25 s
mix(total, norm(slow(load('drawKnife3'), 0.66)), 0.07, 0.45)           # a lower body under it
tap = norm(load('impactMetal_light_003'))
mix(total, tap, 0.30, 0.55)                                            # the tip clears: a real metal tap
edge = scrape[int(0.2 * SR):int(0.3 * SR)]                             # the last of the scrape, under the tap
tail = [v + (0.5 * edge[i] if i < len(edge) else 0.0) for i, v in enumerate(tap)]  # what excites the ring
ring = [0.0] * int(1.5 * SR)
for freq, t60, gain in [(2650, 2.0, 1.0), (3200, 1.3, 0.8), (5575, 0.5, 0.12)]:
    for i, v in enumerate(norm(resonate(tail, freq, t60, len(ring)))): ring[i] += v * gain
mix(total, norm(ring), 0.31, 0.3)
# A gentle fade so the file ends in silence.
for i in range(int(0.15 * SR)): total[-1 - i] *= i / (0.15 * SR)

peak = max(abs(v) for v in total); g = 0.89 / peak
a = array.array('h', [int(max(-1.0, min(1.0, v * g)) * 32767) for v in total])
if sys.byteorder == 'little': a.byteswap()
tmp = tempfile.mktemp(suffix='.aif'); f = aifc.open(tmp, 'wb')
f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR); f.writeframes(a.tobytes()); f.close()
subprocess.run(['afconvert', '-f', 'm4af', '-d', 'aac', '-b', '96000', tmp, OUT], check=True); os.remove(tmp)
print(f'{OUT}  ({os.path.getsize(OUT)} bytes)')
