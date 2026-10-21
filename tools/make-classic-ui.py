"""Builds the classic theme's points and bonus sounds from real CC0 recordings (Kenney "RPG Audio" and "Impact Sounds",
kenney.nl). Arda, 21 October 2026: the points and bonus sounds were interface blips that "don't fit the classic theme". The
classic theme is wood, cloth, steel and bells, so:
  points     abacus beads: two light wooden clicks with a warm wooden tone
  bonusGain  a small bell, two rising notes
  useStep    two quick wooden steps over a cloth swish (Double step: a dash)
  useDouble  two wooden knocks, the second a little higher (Double move)
  useSwap    two cloth swishes crossing, then a soft click (Switcheroo and Twin swap)
Run after tools/make-sounds.py (it replaces these five of its files):
  python3 tools/make-classic-ui.py <folder with the unzipped kenney_rpg-audio and kenney_impact-sounds packs>   (macOS: afconvert)"""
import aifc, array, glob, math, os, subprocess, sys, tempfile

SRC = sys.argv[1]
SR = 44100


def load(stem):
    path = glob.glob(f'{SRC}/**/{stem}.ogg', recursive=True)[0]
    tmp = tempfile.mktemp(suffix='.aif')
    subprocess.run(['afconvert', '-f', 'AIFF', '-d', f'BEI16@{SR}', '-c', '1', path, tmp], check=True)
    f = aifc.open(tmp); a = array.array('h', f.readframes(f.getnframes())); f.close(); os.remove(tmp)
    if sys.byteorder == 'little': a.byteswap()
    return norm([x / 32768 for x in a])


def norm(s):
    p = max(1e-9, max(abs(v) for v in s)); return [v / p for v in s]


def speed(s, rate):
    """Plays a recording at `rate` speed: above 1 shorter and higher, below 1 longer and lower."""
    n = int(len(s) / rate); out = []
    for i in range(n):
        p = i * rate; j = int(p); f = p - j
        out.append(s[j] * (1 - f) + (s[j + 1] if j + 1 < len(s) else 0) * f)
    return out


def cut(s, secs):
    n = min(len(s), int(secs * SR)); out = s[:n]; fade = int(min(0.05, secs / 3) * SR)
    for i in range(fade): out[-1 - i] *= i / fade
    return out


def warm(s, k=0.4):
    y = 0.0; out = []
    for v in s: y += k * (v - y); out.append(y)
    return norm(out)


def tone(x, freq, t60, secs):
    """A real hit carried on by a tuned resonator: the warm pitched ring of wood or a bell."""
    r = 10 ** (-3 / (t60 * SR)); c = 2 * r * math.cos(2 * math.pi * freq / SR); r2 = r * r
    y1 = y2 = 0.0; out = []
    for i in range(int(secs * SR)):
        y = (x[i] if i < len(x) else 0.0) * (1 - r) + c * y1 - r2 * y2
        out.append(y); y2, y1 = y1, y
    return norm(out)


def save(name, length, layers):
    total = [0.0] * int(length * SR)
    for sound, at, gain in layers:
        o = int(at * SR)
        for i, v in enumerate(sound):
            if o + i < len(total): total[o + i] += v * gain
    fade = int(0.04 * SR)
    for i in range(fade): total[-1 - i] *= i / fade
    out = f'app/public/sounds/{name}.m4a'
    g = 0.79 / max(abs(v) for v in total)  # -2 dBFS
    a = array.array('h', [int(max(-1.0, min(1.0, v * g)) * 32767) for v in total])
    if sys.byteorder == 'little': a.byteswap()
    tmp = tempfile.mktemp(suffix='.aif'); f = aifc.open(tmp, 'wb')
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR); f.writeframes(a.tobytes()); f.close()
    subprocess.run(['afconvert', '-f', 'm4af', '-d', 'aac', '-b', '64000', tmp, out], check=True); os.remove(tmp)
    print(f'{name:9s} {length:.2f} s  {os.path.getsize(out)} bytes')


click = warm(speed(load('impactWood_light_000'), 1.6), 0.5)
click2 = warm(speed(load('impactWood_light_002'), 1.8), 0.5)
save('points', 0.4, [(click, 0.0, 0.9), (tone(click, 1047, 0.18, 0.3), 0.0, 0.35),
                     (click2, 0.075, 0.8), (tone(click2, 1319, 0.2, 0.3), 0.075, 0.35)])

bell = cut(speed(load('impactBell_heavy_002'), 2.2), 0.45)
bell_hi = cut(speed(load('impactBell_heavy_003'), 2.9), 0.5)
save('bonusGain', 0.75, [(bell, 0.0, 0.8), (bell_hi, 0.13, 0.9)])

step_a = warm(speed(load('footstep_wood_000'), 1.25)); step_b = warm(speed(load('footstep_wood_002'), 1.35))
swish = warm(cut(load('cloth1'), 0.35), 0.3)
save('useStep', 0.45, [(swish, 0.0, 0.35), (step_a, 0.02, 0.9), (step_b, 0.13, 0.9)])

knock = warm(load('impactWood_medium_000'), 0.45); knock_hi = warm(speed(load('impactWood_medium_001'), 1.25), 0.45)
save('useDouble', 0.5, [(knock, 0.0, 0.85), (knock_hi, 0.15, 0.9)])

cloth_a = warm(cut(load('cloth2'), 0.35), 0.3); cloth_b = warm(cut(speed(load('cloth3'), 1.15), 0.3), 0.3)
save('useSwap', 0.55, [(cloth_a, 0.0, 0.8), (cloth_b, 0.1, 0.8), (click, 0.3, 0.5)])
