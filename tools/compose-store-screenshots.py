"""Turns the raw web screenshots (tools/make-store-screenshots.mjs) into App Store images, 1320x2868 (iPhone 6.9"):
- plain/: the game under an iPhone status bar (9:41, signal, Wi-Fi, battery) and above the home indicator;
- captioned/: the same screen, slightly smaller, under a headline.
Run: python3 tools/compose-store-screenshots.py <rawDir> [outDir]   (needs Pillow and a bold system font)"""
import glob, os, sys
from PIL import Image, ImageDraw, ImageFont

RAW = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else 'store/screenshots/ios-6.9'
W, H = 1320, 2868
TOP, BOTTOM = 186, 102                      # status bar and home indicator areas, in pixels
BG = (11, 16, 38)
BOLD = '/System/Library/Fonts/Supplemental/Arial Bold.ttf'

CAPTION = {
    'tr': {'menu': 'Yön her tur\nel değiştirir', 'take': 'Doğru kareyi seç,\ntaşı al', 'bonuses': 'Bonuslarla\noyunu çevir', 'hunter': 'Sana doğru\nyürüyen avcılar',
           'new-game': 'Tek, yapay zekâyla\nya da arkadaşlarınla', 'bonus-guide': 'Neyi ne zaman\nkazandığını gör', 'achievements': '15 başarım,\nhepsi oynayarak açılır', 'solved': 'Bulmacalarda\nyıldız topla'},
    'en': {'menu': 'Direction changes\nhands every round', 'take': 'Pick the right square,\ntake the piece', 'bonuses': 'Turn the game\nwith bonuses', 'hunter': 'Hunters that walk\ntoward you',
           'new-game': 'Solo, against AI\nor with friends', 'bonus-guide': 'See what you earn\nand when', 'achievements': '15 achievements,\nall unlocked by playing', 'solved': 'Collect stars\nin puzzles'},
}

def status_bar(d):
    f = ImageFont.truetype(BOLD, 66)
    d.text((150, 62), '9:41', font=f, fill='white')
    x = W - 150
    # battery
    d.rounded_rectangle([x - 100, 76, x - 8, 126], radius=14, outline=(255, 255, 255, 150), width=4)
    d.rounded_rectangle([x - 94, 82, x - 14, 120], radius=8, fill='white')
    d.rounded_rectangle([x - 4, 90, x + 4, 112], radius=3, fill=(255, 255, 255, 150))
    # Wi-Fi: three arcs and a dot
    cx, cy = x - 190, 126
    for r in (54, 36, 18):
        d.arc([cx - r, cy - r, cx + r, cy + r], 225, 315, fill='white', width=9)
    d.ellipse([cx - 7, cy - 7, cx + 7, cy + 7], fill='white')
    # signal: four bars
    sx = x - 330
    for i in range(4):
        h = 18 + i * 12
        d.rounded_rectangle([sx + i * 22, 126 - h, sx + i * 22 + 14, 126], radius=4, fill='white')

def device(raw_path):
    shot = Image.open(raw_path).convert('RGB')
    img = Image.new('RGB', (W, H), BG)
    img.paste(shot, (0, TOP))
    d = ImageDraw.Draw(img, 'RGBA')
    status_bar(d)
    d.rounded_rectangle([W // 2 - 180, H - 58, W // 2 + 180, H - 46], radius=6, fill=(255, 255, 255, 230))
    return img

def captioned(plain, text):
    img = Image.new('RGB', (W, H), BG)
    for y in range(H):                       # a soft glow behind the headline
        k = max(0.0, 1 - y / 1500)
        img.paste((int(BG[0] + 14 * k), int(BG[1] + 24 * k), int(BG[2] + 70 * k)), (0, y, W, y + 1))
    d = ImageDraw.Draw(img)
    f = ImageFont.truetype(BOLD, 104)
    lines = text.split('\n')
    y = 130
    for line in lines:
        w = d.textlength(line, font=f)
        d.text(((W - w) / 2, y), line, font=f, fill='#E9F0FF')
        y += 128
    scale = 0.80
    sw, sh = int(W * scale), int(H * scale)
    small = plain.resize((sw, sh), Image.LANCZOS)
    mask = Image.new('L', (sw, sh), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, sw - 1, sh - 1], radius=90, fill=255)
    x0, y0 = (W - sw) // 2, 470
    d.rounded_rectangle([x0 - 6, y0 - 6, x0 + sw + 6, y0 + sh + 6], radius=96, outline=(59, 255, 143), width=5)
    img.paste(small, (x0, y0), mask)
    return img

for lang in ('tr', 'en'):
    for path in sorted(glob.glob(f'{RAW}/{lang}/*.png')):
        no, name = os.path.basename(path)[:-4].split('-', 1)
        plain = device(path)
        for kind, im in (('plain', plain), ('captioned', captioned(plain, CAPTION[lang][name]))):
            folder = f'{OUT}/{lang}/{kind}'
            os.makedirs(folder, exist_ok=True)
            im.save(f'{folder}/{no}-{name}.png', optimize=True)
print('screenshots written to', OUT)
