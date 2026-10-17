"""Draws the iPhone app icon (1024x1024, no transparency) and the launch splash (2732x2732) from the logo shapes in
app/public/icon.svg. Run: python3 tools/make-ios-assets.py   (needs Pillow). Output goes into app/ios/App/App/Assets.xcassets."""
import sys
sys.path.insert(0, 'tools')
from logo_art import compose

assets = 'app/ios/App/App/Assets.xcassets'
compose(1024, 0.684).save(f'{assets}/AppIcon.appiconset/AppIcon-512@2x.png', optimize=True)
splash = compose(2732, 0.3)
for name in ('splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png'):
    splash.save(f'{assets}/Splash.imageset/{name}', optimize=True)
print('icon and splash written')
