"""Builds app/public/sounds/*.m4a from Kenney's CC0 sound packs (kenney.nl: RPG Audio, Impact Sounds, Interface Sounds).
Run: python3 tools/make-sounds.py <folder with the unzipped kenney_* packs>   (macOS: uses afconvert)
Each game event (the names in app/src/game/haptics.ts → SOUNDS) maps to one recording. Change the table to try another one."""
import glob, os, subprocess, sys

SRC = sys.argv[1]
OUT = 'app/public/sounds'
MAP = {
    'select':     'interface-sounds/select_001',
    'move':       'interface-sounds/drop_002',
    'take':       'impact-sounds/impactPlate_light_001',
    'slash':      'rpg-audio/knifeSlice',
    'slashBig':   'rpg-audio/knifeSlice2',
    'points':     'interface-sounds/confirmation_001',
    'myTurn':     'interface-sounds/pluck_001',
    'turn':       'interface-sounds/tick_002',
    'mode':       'interface-sounds/switch_002',
    'collapse':   'impact-sounds/impactMining_003',
    'out':        'impact-sounds/impactMetal_heavy_001',
    'bonusGain':  'interface-sounds/confirmation_002',
    'bonusUse':   'interface-sounds/maximize_002',
    'useStep':    'interface-sounds/maximize_004',
    'useDouble':  'interface-sounds/pluck_002',
    'useSwap':    'interface-sounds/switch_007',
    'armor':      'impact-sounds/impactMetal_medium_002',
    'win':        'interface-sounds/confirmation_004',
    'lose':       'interface-sounds/minimize_008',
    'tick':       'interface-sounds/tick_001',
    'count':      'impact-sounds/impactPlank_medium_000',
    'bell':       'impact-sounds/impactBell_heavy_000',
}

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
