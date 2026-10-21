"""Builds the classic theme's take sounds from real CC0 recordings (Kenney "RPG Audio" and "Impact Sounds", kenney.nl).
Arda, 21 October 2026: the take sound was "too modern for classic, make it calmer". So a take is a warm wooden knock, like a
captured piece set aside on a board, under a soft blade swish; no cinematic metal hit and no boom.
  take      a wooden knock
  slash     a soft, short blade swish (any take)
  slashBig  a fuller swish with a light knock (your own takes)
  combo     two swishes and two knocks with a faint steel ring (two or more takes in a burst)
Run after tools/make-sounds.py and tools/cut-sounds.py:
  python3 tools/make-take-sounds.py <folder with the unzipped kenney_rpg-audio and kenney_impact-sounds packs>   (macOS: afconvert)"""
import aifc, array, glob, math, os, subprocess, sys, tempfile

SRC = sys.argv[1]
SR = 44100


def load(stem):
    path = glob.glob(f'{SRC}/**/{stem}.ogg', recursive=True)[0]
    tmp = tempfile.mktemp(suffix='.aif')
    subprocess.run(['afconvert', '-f', 'AIFF', '-d', f'BEI16@{SR}', '-c', '1', path, tmp], check=True)
    f = aifc.open(tmp); a = array.array('h', f.readframes(f.getnframes())); f.close(); os.remove(tmp)
    if sys.byteorder == 'little': a.byteswap()
    s = [x / 32768 for x in a]
    p = max(1e-9, max(abs(v) for v in s))
    return [v / p for v in s]


def slow(s, rate):
    n = int(len(s) / rate); out = []
    for i in range(n):
        p = i * rate; j = int(p); f = p - j
        out.append(s[j] * (1 - f) + (s[j + 1] if j + 1 < len(s) else 0) * f)
    return out


def soften(s, k=0.35):
    """A gentle one-pole low-pass: takes the hiss off a recording so it sits warmer."""
    y = 0.0; out = []
    for v in s: y += k * (v - y); out.append(y)
    p = max(1e-9, max(abs(v) for v in out)); return [v / p for v in out]


def ring(x, freq, t60, n):
    r = 10 ** (-3 / (t60 * SR)); c = 2 * r * math.cos(2 * math.pi * freq / SR); r2 = r * r
    y1 = y2 = 0.0; out = []
    for i in range(n):
        y = (x[i] if i < len(x) else 0.0) * (1 - r) + c * y1 - r2 * y2
        out.append(y); y2, y1 = y1, y
    p = max(1e-9, max(abs(v) for v in out)); return [v / p for v in out]


def build(length, layers):
    total = [0.0] * int(length * SR)
    for sound, at, gain in layers:
        o = int(at * SR)
        for i, v in enumerate(sound):
            if o + i < len(total): total[o + i] += v * gain
    fade = int(0.04 * SR)
    for i in range(fade): total[-1 - i] *= i / fade
    return total


def save(total, name):
    out = f'app/public/sounds/{name}.m4a'
    peak = max(abs(v) for v in total); g = 0.79 / peak  # -2 dBFS, like tools/cut-sounds.py
    a = array.array('h', [int(max(-1.0, min(1.0, v * g)) * 32767) for v in total])
    if sys.byteorder == 'little': a.byteswap()
    tmp = tempfile.mktemp(suffix='.aif'); f = aifc.open(tmp, 'wb')
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR); f.writeframes(a.tobytes()); f.close()
    subprocess.run(['afconvert', '-f', 'm4af', '-d', 'aac', '-b', '64000', tmp, out], check=True); os.remove(tmp)
    print(f'{name:9s} {os.path.getsize(out)} bytes')


knock = soften(load('impactWood_medium_002'), 0.45)
knock_heavy = soften(load('impactWood_heavy_001'), 0.4)
swish = soften(slow(load('drawKnife2'), 0.85), 0.3)
swish_full = soften(slow(load('drawKnife1'), 0.8), 0.3)

save(build(0.45, [(knock, 0.0, 1.0)]), 'take')
save(build(0.55, [(swish, 0.0, 1.0)]), 'slash')
save(build(0.75, [(swish_full, 0.0, 1.0), (knock, 0.16, 0.45)]), 'slashBig')
steel = ring(knock_heavy, 2650, 0.9, int(0.9 * SR))
save(build(1.2, [(swish_full, 0.0, 0.9), (swish, 0.09, 0.7), (knock_heavy, 0.17, 0.8), (knock, 0.27, 0.6), (steel, 0.18, 0.12)]), 'combo')
