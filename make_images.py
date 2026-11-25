# python make_images.py <photo> : web-sized banner (EXIF dropped) and home screen icons
import sys
from PIL import Image, ImageDraw, ImageOps

im = ImageOps.exif_transpose(Image.open(sys.argv[1])).convert("RGB")
im.thumbnail((1600, 1600))
im.save("header.jpg", quality=80, optimize=True)

for size, name in ((180, "apple-touch-icon.png"), (192, "icon-192.png"), (512, "icon-512.png")):
    s = 1024
    ic = Image.new("RGB", (s, s), "#00274c")
    d = ImageDraw.Draw(ic)
    for x, tip in ((300, -1), (512, 1), (724, -1)):  # oars
        d.line([(x, 512), (x + 90 * tip, 190 if tip < 0 else 834)], fill="#f4f8ff", width=34)
        cy = 190 if tip < 0 else 834
        d.rounded_rectangle([x + 90 * tip - 48, cy - 100, x + 90 * tip + 48, cy + 100], 40, fill="#ffcb05")
    d.polygon([(90, 512), (260, 440), (700, 430), (960, 512), (700, 594), (260, 584)], fill="#ffcb05")
    for x in range(300, 760, 110):
        d.ellipse([x - 36, 476, x + 36, 548], fill="#00274c")
    ic.resize((size, size), Image.LANCZOS).save(name)
