"""Cuts game sounds out of the Sonniss GDC 2026 Game Audio Bundle (gdc.sonniss.com; royalty-free, commercial use, no credit
needed; the raw sounds must not be redistributed on their own, so only the short cuts below ship inside the game).
Run after tools/make-sounds.py (these cuts replace some of its Kenney files):
  python3 tools/cut-sounds.py <folder with the unzipped Sonniss libraries>   (macOS: uses afconvert)
Each row: theme ('' = classic → app/public/sounds/, otherwise app/public/sounds/<theme>/), game event, a piece of the library
folder name, a piece of the file name, start and end in seconds (found by listening and by the loudness envelope), and how long
the fade-out at the end is. Every cut is normalized to the same peak; per-event loudness lives in haptics.ts → SAMPLE_GAIN."""
import array, glob, math, os, subprocess, sys, wave

SRC = sys.argv[1]
PEAK = 10 ** (-2 / 20)  # -2 dBFS
CUTS = [
    # Classic: wooden pieces, real steel and a church bell.
    ('', 'select',   'Board Game',        'UIClick_UI Button Analog Vintage',      0.00, 0.20, 0.05),
    ('', 'move',     'Board Game',        'Piece Action Organic Connect Dots',     0.00, 0.20, 0.05),
    ('', 'take',     'Historical Weapons', 'Spear And Stick Impact, Wooden',        1.97, 2.32, 0.12),
    ('', 'slash',    'Historical Weapons', 'Sword Slide Cuts, Metallic',            4.32, 4.92, 0.20),
    ('', 'slashBig', 'Historical Weapons', 'Sword Slide Cuts, Metallic',           10.80, 11.60, 0.30),
    ('', 'combo',    'Melee Weapons',     'METAL SWING HIT',                       0.00, 2.30, 0.90),
    ('', 'out',      'Melee Weapons',     'SWING IMPACTS Quick Heavy',             0.00, 1.00, 0.30),
    ('', 'collapse', 'Trailer Booms',     'Booms_Vol2_011',                        0.25, 3.20, 1.50),
    ('', 'armor',    'HD Game Materials', 'Metal Old File Impact',                 0.00, 0.50, 0.15),
    ('', 'bell',     'Church Bells',      '04 Church Bells, Near Distance',        1.55, 4.50, 1.60),
    # Futuristic: glassy interface sounds and a dark braam for the collapse.
    ('future', 'select',    'Interface & Infographics', 'Interface Pop High Short',      0.00, 0.60, 0.20),
    ('future', 'move',      'Interface & Infographics', 'Interface Percussion Snap',     0.00, 0.70, 0.25),
    ('future', 'points',    'Interface & Infographics', 'Interface Accept Glassy Snap',  0.00, 0.40, 0.15),
    ('future', 'myTurn',    'System & UI',              'Interface Sci-Fi Ping Down',    0.00, 0.80, 0.30),
    ('future', 'mode',      'Ultra Transitions',        'Woosh Sweep Slide Infographics', 0.00, 0.50, 0.15),
    ('future', 'bonusGain', 'User Interface',           'Button Arp Twinkle',            0.00, 1.80, 0.60),
    ('future', 'bonusUse',  'Fantasy Game 2',           'Collect Scifi Futuristic',      0.00, 0.30, 0.10),
    ('future', 'win',       'User Interface',           'Interface Plucks Happy',        0.00, 0.90, 0.30),
    ('future', 'lose',      'System & UI',              'Interface Deny Low Fat Dark',   0.00, 0.70, 0.25),
    ('future', 'collapse',  'Ultra Transitions',        'Transition Braam Slow Dark',    0.00, 3.00, 1.20),
    # Energy blade: electric arcs (the blade itself is synthesized in haptics.ts).
    ('energy', 'take',     'InMotionAudio - Arc',  'ArcDesign15',                 0.00, 1.00, 0.35),
    ('energy', 'collapse', 'Elemental Mutation',   'Impact Electric Tonal Deep',  0.00, 3.06, 1.20),
]


def find(lib, name):
    hits = [f for f in glob.glob(f'{SRC}/**/*.wav', recursive=True) if lib in os.path.dirname(f) and name in os.path.basename(f)]
    if len(hits) != 1: sys.exit(f'{lib} / {name}: {len(hits)} matches')
    return hits[0]


def cut(src, dst, start, end, fade):
    tmp = dst + '.tmp.wav'
    subprocess.run(['afconvert', '-f', 'WAVE', '-d', 'LEI16@44100', '-c', '1', src, tmp], check=True)
    with wave.open(tmp) as w:
        sr = w.getframerate()
        a = array.array('h', w.readframes(w.getnframes()))
    s = array.array('h', a[int(start * sr):int(end * sr)])
    gain = PEAK * 32767 / max(1, max(abs(x) for x in s))
    n, fi, fo = len(s), int(0.004 * sr), int(fade * sr)
    out = array.array('h', bytes(2 * n))
    for i, x in enumerate(s):
        env = min(1.0, i / fi) if fi else 1.0
        if i > n - fo: env *= 0.5 + 0.5 * math.cos(math.pi * (i - (n - fo)) / fo)
        out[i] = max(-32767, min(32767, int(x * gain * env)))
    with wave.open(tmp, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(out.tobytes())
    subprocess.run(['afconvert', '-f', 'm4af', '-d', 'aac', '-b', '64000', tmp, dst], check=True)
    os.remove(tmp)


for theme, event, lib, name, start, end, fade in CUTS:
    out_dir = 'app/public/sounds' + (f'/{theme}' if theme else '')
    os.makedirs(out_dir, exist_ok=True)
    dst = f'{out_dir}/{event}.m4a'
    cut(find(lib, name), dst, start, end, fade)
    print(f'{theme or "classic":7s} {event:10s} ← {lib} / {name}  ({os.path.getsize(dst)} bytes)')
