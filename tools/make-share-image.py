"""Draws app/public/share.png (1200x630), the preview image shown when a link is shared (Open Graph / Twitter card).
Run: python3 tools/make-share-image.py   (needs Pillow and a bold system font)"""
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
img = Image.new('RGB', (W, H), '#0B1026')
px = img.load()
# A soft radial glow behind the logo, like the main menu.
cx, cy = 300, 300
for y in range(H):
    for x in range(W):
        d = ((x - cx) ** 2 + (y - cy) ** 2) ** .5 / 620
        k = max(0.0, 1 - d)
        r, g, b = px[x, y]
        px[x, y] = (int(r + 18 * k * k), int(g + 28 * k * k), int(b + 90 * k * k))

logo = Image.open('app/public/icon-512.png').convert('RGBA').resize((380, 380), Image.LANCZOS)
mask = Image.new('L', logo.size, 0)
ImageDraw.Draw(mask).rounded_rectangle((0, 0, 379, 379), radius=72, fill=255)
img.paste(logo, (90, 125), mask)

d = ImageDraw.Draw(img)
bold = '/System/Library/Fonts/Supplemental/Arial Bold.ttf'
title = ImageFont.truetype(bold, 112)
sub = ImageFont.truetype(bold, 38)
btn = ImageFont.truetype(bold, 32)
x = 530
d.text((x, 175), 'X SWORD', font=title, fill='#E9F0FF')
d.text((x + 4, 320), 'Direction changes hands', font=sub, fill='#8591BE')
d.text((x + 4, 368), 'every round.', font=sub, fill='#8591BE')
label = 'Play in your browser'
w = int(d.textlength(label, font=btn)) + 64
d.rounded_rectangle((x + 4, 450, x + 4 + w, 512), radius=31, fill='#3BFF8F')
d.text((x + 4 + 32, 464), label, font=btn, fill='#0B1026')
img.save('app/public/share.png', optimize=True)
print('app/public/share.png written')
