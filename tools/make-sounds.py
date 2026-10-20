"""Builds app/public/sounds/**/*.m4a from Kenney's CC0 sound packs (kenney.nl: RPG Audio, Impact Sounds, Interface Sounds,
Sci-Fi Sounds, Casino Audio).
Run: python3 tools/make-sounds.py <folder with the unzipped kenney_* packs> [theme]   (macOS: uses afconvert)
Each game event (the names in app/src/game/haptics.ts → SOUNDS) maps to one recording. Change a table to try another one.
Events cut from the Sonniss bundle (tools/cut-sounds.py: classic select, move, take, slash, slashBig, combo, out, collapse, armor,
bell; futuristic interface sounds and collapse; energy take and collapse) are not in these tables; run that script after this one.
The classic theme ('') writes app/public/sounds/<event>.m4a; another theme writes app/public/sounds/<theme>/<event>.m4a and
only needs the events it changes (haptics.ts → THEME_RECORDED lists them; the rest fall back to classic)."""
import glob, os, subprocess, sys

SRC = sys.argv[1]
THEME = sys.argv[2] if len(sys.argv) > 2 else ''
OUT = 'app/public/sounds' + (f'/{THEME}' if THEME else '')
MAPS = {
    '': {
        'points':     'interface-sounds/confirmation_001',
        'myTurn':     'interface-sounds/pluck_001',
        'turn':       'interface-sounds/tick_002',
        'mode':       'interface-sounds/switch_002',
        'bonusGain':  'interface-sounds/confirmation_002',
        'bonusUse':   'interface-sounds/maximize_002',
        'useStep':    'interface-sounds/maximize_004',
        'useDouble':  'interface-sounds/pluck_002',
        'useSwap':    'interface-sounds/switch_007',
        'win':        'interface-sounds/confirmation_004',
        'lose':       'interface-sounds/minimize_008',
        'tick':       'interface-sounds/tick_001',
        'count':      'impact-sounds/impactPlank_medium_000',
    },
    # Futuristic: lasers, force fields and crunchy explosions from Kenney's Sci-Fi Sounds.
    'future': {
        'take':       'sci-fi-sounds/laserSmall_000',
        'slash':      'sci-fi-sounds/laserLarge_000',
        'slashBig':   'sci-fi-sounds/laserLarge_002',
        'combo':      'sci-fi-sounds/explosionCrunch_000',
        'out':        'sci-fi-sounds/explosionCrunch_002',
        'armor':      'sci-fi-sounds/forceField_000',
        'useStep':    'sci-fi-sounds/laserRetro_000',
        'useDouble':  'sci-fi-sounds/laserRetro_002',
        'useSwap':    'sci-fi-sounds/forceField_002',
        'unsheath':   'sci-fi-sounds/forceField_001',
    },
    # Energy blade: the strokes, the ignition and the combo are synthesized in haptics.ts; these are the zaps around them.
    'energy': {
        'armor':      'sci-fi-sounds/forceField_003',
        'useSwap':    'sci-fi-sounds/forceField_004',
    },
}

MAP = MAPS[THEME]
os.makedirs(OUT, exist_ok=True)
missing = []
for event, name in MAP.items():
    pack, stem = name.split('/')
    found = glob.glob(f'{SRC}/kenney_{pack}/**/{stem}.ogg', recursive=True)
    if not found: missing.append(name); continue
    dst = f'{OUT}/{event}.m4a'
    # Ogg Vorbis → mono 16-bit WAV → AAC (iPhone and every browser play .m4a; Safari is unreliable with .ogg).
    wav = f'{OUT}/.tmp.wav'
    subprocess.run(['afconvert', '-f', 'WAVE', '-d', 'LEI16', '-c', '1', found[0], wav], check=True)
    subprocess.run(['afconvert', '-f', 'm4af', '-d', 'aac', '-b', '56000', wav, dst], check=True)
    os.remove(wav)
    print(f'{event:10s} ← {name}  ({os.path.getsize(dst)} bytes)')
if missing:
    print('missing:', missing); sys.exit(1)
