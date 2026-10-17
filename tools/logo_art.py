"""The X Sword logo drawn with Pillow (shared by make-ios-assets.py and make-android-assets.py)."""
from PIL import Image, ImageDraw

DARK, ICE, GREEN = (11, 16, 38), (233, 240, 255), (59, 255, 143)

def background(size):
    # The icon's radial glow, computed small and scaled up smoothly.
    n = 128
    img = Image.new('RGB', (n, n))
    px = img.load()
    for y in range(n):
        for x in range(n):
            d = (((x / n - .5) ** 2 + (y / n - .4) ** 2) ** .5) / .65
            k = max(0.0, 1 - d)
            px[x, y] = tuple(int(DARK[i] + ((23, 34, 90)[i] - DARK[i]) * k) for i in range(3))
    return img.resize((size, size), Image.BICUBIC)

def logo(size, logo_scale):
    """The logo on a transparent layer, drawn 4x and scaled down for smooth edges."""
    big = size * 4
    layer = Image.new('RGBA', (big, big), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    k = big / 200 * logo_scale                    # 200 = the logo's own coordinate box
    off = big / 2 - 100 * k
    P = lambda x, y: (off + x * k, off + y * k)
    d.rounded_rectangle([*P(44, 44), *P(156, 156)], radius=6 * k, fill=DARK + (255,), outline=ICE + (255,), width=int(7 * k))
    # The outline starts and ends past a corner so the closing join has no notch.
    d.line([P(179, 100), P(100, 179), P(21, 100), P(100, 21), P(179, 100), P(100, 179)], fill=GREEN + (255,), width=int(7 * k), joint='curve')
    d.polygon([P(86, 66), P(114, 66), P(134, 86), P(134, 114), P(114, 134), P(86, 134), P(66, 114), P(66, 86)], fill=GREEN + (255,))
    w = int(8 * k)
    d.line([P(84, 84), P(116, 116)], fill=DARK + (255,), width=w)
    d.line([P(116, 84), P(84, 116)], fill=DARK + (255,), width=w)
    for x, y in [(84, 84), (116, 116), (116, 84), (84, 116)]:
        r = w / 2
        cx, cy = P(x, y)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=DARK + (255,))
    return layer.resize((size, size), Image.LANCZOS)

def compose(size, logo_scale):
    img = background(size).convert('RGBA')
    img.alpha_composite(logo(size, logo_scale))
    return img.convert('RGB')               # no alpha channel: the App Store rejects an icon with transparency
