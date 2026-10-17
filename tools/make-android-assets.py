"""Draws the Android launcher icons (adaptive foreground, legacy square and round) and the splash images from the logo.
Run: python3 tools/make-android-assets.py   (needs Pillow). Output goes into app/android/app/src/main/res."""
import glob, os, sys
sys.path.insert(0, 'tools')
from PIL import Image, ImageDraw
from logo_art import DARK, background, compose, logo

RES = 'app/android/app/src/main/res'
DENSITY = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}

for name, k in DENSITY.items():
    folder = f'{RES}/mipmap-{name}'
    # Adaptive icon: the logo on a transparent 108 dp canvas, kept inside the 66 dp safe circle.
    fg = int(108 * k)
    logo(fg, 0.62).save(f'{folder}/ic_launcher_foreground.png')
    # Legacy icons (48 dp): the same icon the iPhone gets, square and round.
    px = int(48 * k)
    square = compose(512, 0.684).resize((px, px), Image.LANCZOS)
    square.save(f'{folder}/ic_launcher.png')
    mask = Image.new('L', (px * 4, px * 4), 0)
    ImageDraw.Draw(mask).ellipse([0, 0, px * 4 - 1, px * 4 - 1], fill=255)
    round_icon = square.convert('RGBA')
    round_icon.putalpha(mask.resize((px, px), Image.LANCZOS))
    round_icon.save(f'{folder}/ic_launcher_round.png')

# Splash: the dark glow with the logo in the middle, one picture per existing size.
for path in glob.glob(f'{RES}/drawable*/splash.png'):
    w, h = Image.open(path).size
    base = background(max(w, h)).crop((0, 0, w, h)).convert('RGBA')
    side = int(min(w, h) * 0.34)
    base.alpha_composite(logo(side, 1.0), ((w - side) // 2, (h - side) // 2))
    base.convert('RGB').save(path, optimize=True)

with open(f'{RES}/values/ic_launcher_background.xml', 'w') as f:
    f.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#0B1026</color>\n</resources>\n')
print('android icons and splash written')
