#!/usr/bin/env python3
"""Draws the site's film assets into public/img: grain, dust, the burnt tail, the icons and the
six placeholder frames. Needs Pillow. Replace public/img/frames/frame-0N.webp with real frames
(3:2, about 900 x 600) when they arrive; don't re-run this afterwards, or skip draw_frames()."""
import random, sys
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent / "public" / "img"
APP = Path.home() / "Developer/Sprocket/Analogue/Sprocket"


def grain():
    size = 256
    noise = Image.effect_noise((size, size), 70).load()
    tile = Image.new("RGBA", (size, size))
    px = tile.load()
    for y in range(size):
        for x in range(size):
            n = noise[x, y] - 128
            px[x, y] = (255, 255, 255, min(255, n)) if n > 0 else (0, 0, 0, min(255, -n))
    tile.save(ROOT / "grain.png", optimize=True)


def dust():
    src = Image.open(APP / "Assets.xcassets/DustScratches.imageset/dust-scratches.jpg").convert("RGB")
    src.thumbnail((1600, 1600))
    src.save(ROOT / "dust.webp", quality=62, method=6)


def icons():
    """The finished icon comes out of the built app: iconutil -c iconset Sprocket.icns -o i.iconset,
    then icon_512x512.png goes to tools/app-icon.png."""
    src = Image.open(Path(__file__).parent / "app-icon.png").convert("RGBA")
    for name, side in (("icon-512.png", 512), ("apple-touch-icon.png", 180), ("favicon.png", 64)):
        src.resize((side, side), Image.LANCZOS).save(ROOT / name, optimize=True)


def walk(rng, width, step, wander, jitter, start=0.0):
    """A jagged edge: a slow wander plus fine jitter, as the app's BurnEdge."""
    y, out = start, []
    for x in range(0, width + step, step):
        y += rng.uniform(-wander, wander)
        y *= 0.985
        out.append((x, y + rng.uniform(-jitter, jitter)))
    return out


def burn():
    """The end of the roll, seen from the film: light seeping in from below, in two-part line."""
    w, h = 2880, 420
    rng = random.Random(17)
    edge = walk(rng, w, 6, 3.4, 1.0)
    canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))

    def layer(inset, colour, blur, wander=0.0, seed=1):
        r = random.Random(seed)
        pts = [(x, h - inset + y + r.uniform(-wander, wander)) for x, y in edge]
        img = Image.new("RGBA", (w, h), colour[:3] + (0,))
        ImageDraw.Draw(img).polygon(pts + [(w, h), (0, h)], fill=colour)
        return img.filter(ImageFilter.GaussianBlur(blur))

    for inset, colour, blur, wander, seed in (
        (250, (10, 6, 4, 150), 42, 0, 1),        # dark halo
        (205, (120, 26, 8, 170), 26, 5, 2),      # red feather
        (178, (214, 72, 14, 210), 13, 7, 3),     # orange strands
        (160, (246, 150, 40, 235), 6, 5, 4),     # orange body
        (146, (226, 214, 150, 255), 2.4, 3, 5),  # grey-yellow line
        (140, (255, 247, 217, 255), 1.4, 2, 6),  # the harder line
        (132, (251, 250, 245, 255), 1.4, 2, 7),  # burnt out
    ):
        canvas = Image.alpha_composite(canvas, layer(inset, colour, blur, wander, seed))
    canvas.save(ROOT / "burn.webp", quality=80, method=6)


SCENES = [  # sky top, sky bottom, far hills, near hills, sun (x, y, r, colour) or None
    ((58, 74, 112), (238, 164, 112), (92, 76, 104), (34, 30, 44), (0.70, 0.56, 62, (255, 214, 150))),
    ((122, 168, 186), (226, 222, 196), (128, 150, 150), (62, 88, 84), None),
    ((226, 196, 150), (240, 142, 84), (170, 90, 62), (84, 42, 36), (0.28, 0.40, 84, (255, 232, 190))),
    ((36, 44, 64), (92, 98, 122), (52, 58, 78), (20, 22, 32), (0.78, 0.22, 34, (232, 232, 216))),
    ((170, 196, 208), (236, 232, 222), (150, 170, 182), (214, 218, 216), None),
    ((88, 104, 92), (200, 196, 150), (74, 96, 72), (36, 52, 40), (0.50, 0.46, 50, (246, 232, 180))),
]


def draw_frames():
    w, h = 900, 600
    for i, (top, bottom, far, near, sun) in enumerate(SCENES, 1):
        rng = random.Random(40 + i)
        mask = Image.linear_gradient("L").resize((w, h))
        img = Image.composite(Image.new("RGB", (w, h), bottom), Image.new("RGB", (w, h), top), mask)
        if sun:
            glow = Image.new("L", (w, h), 0)
            cx, cy, r = sun[0] * w, sun[1] * h, sun[2]
            ImageDraw.Draw(glow).ellipse((cx - r, cy - r, cx + r, cy + r), fill=255)
            img.paste(Image.new("RGB", (w, h), sun[3]), mask=glow.filter(ImageFilter.GaussianBlur(9)))
            img.paste(Image.new("RGB", (w, h), sun[3]), mask=glow.filter(ImageFilter.GaussianBlur(90)).point(lambda v: v // 2))
        for level, colour, wander in ((0.62, far, 4.2), (0.78, near, 3.0)):
            ridge = [(x, level * h + y) for x, y in walk(rng, w, 6, wander, 0.5)]
            land = Image.new("L", (w, h), 0)
            ImageDraw.Draw(land).polygon(ridge + [(w, h), (0, h)], fill=255)
            img.paste(Image.new("RGB", (w, h), colour), mask=land.filter(ImageFilter.GaussianBlur(1.6)))
        img = img.filter(ImageFilter.GaussianBlur(1.1))
        noise = Image.effect_noise((w, h), 34).convert("RGB")
        img = ImageChops.soft_light(img, noise)
        vignette = Image.radial_gradient("L").resize((w, h)).point(lambda v: v * 150 // 255)
        img.paste(Image.new("RGB", (w, h), (12, 8, 6)), mask=vignette)
        img.save(ROOT / "frames" / f"frame-{i:02}.webp", quality=72, method=6)


if __name__ == "__main__":
    grain(); dust(); burn(); icons()
    if "--keep-frames" not in sys.argv:
        draw_frames()
