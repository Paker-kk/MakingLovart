"""Generate Flovart brand icon — purple gradient background with 'F' letter and rounded corners."""
from PIL import Image, ImageDraw, ImageFont
import os

SIZE = 1024
RADIUS = 200  # corner radius

# Create RGBA image
img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

# Draw rounded rectangle with gradient
# Base: solid purple-to-violet gradient simulation (top→bottom)
for y in range(SIZE):
    t = y / SIZE
    r = int(88 * (1 - t) + 139 * t)   # 58→8B
    g = int(28 * (1 - t) + 92 * t)     # 1C→5C
    b = int(235 * (1 - t) + 246 * t)   # EB→F6
    draw.line([(0, y), (SIZE - 1, y)], fill=(r, g, b, 255))

# Apply rounded corners mask
mask = Image.new('L', (SIZE, SIZE), 0)
mask_draw = ImageDraw.Draw(mask)
mask_draw.rounded_rectangle([(0, 0), (SIZE - 1, SIZE - 1)], radius=RADIUS, fill=255)
img.putalpha(mask)

# Draw "F" letter
draw = ImageDraw.Draw(img)

# Try to use a good font, fallback to default
font = None
font_paths = [
    "C:/Windows/Fonts/arialbd.ttf",      # Windows Arial Bold
    "C:/Windows/Fonts/segoeui.ttf",       # Segoe UI
    "C:/Windows/Fonts/calibrib.ttf",      # Calibri Bold
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
]
for fp in font_paths:
    if os.path.exists(fp):
        try:
            font = ImageFont.truetype(fp, 620)
            break
        except Exception:
            pass

if font is None:
    font = ImageFont.load_default()

# Center the "F"
text = "F"
bbox = draw.textbbox((0, 0), text, font=font)
tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
tx = (SIZE - tw) // 2 - bbox[0]
ty = (SIZE - th) // 2 - bbox[1] - 20  # slight upward nudge

draw.text((tx, ty), text, fill=(255, 255, 255, 255), font=font)

# Save
out_path = os.path.join(os.path.dirname(__file__), '..', 'src-tauri', 'icons', 'flovart-source.png')
img.save(out_path, 'PNG')
print(f"Generated: {os.path.abspath(out_path)}")
