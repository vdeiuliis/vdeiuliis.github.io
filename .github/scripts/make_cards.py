"""Create social preview cards (1200x630 PNG) for Thoughts posts.

Run from the repository root (GitHub Actions does it before building the site):
    python3 .github/scripts/make_cards.py

For every _thoughts/YYYY-MM-DD-slug.md it writes images/thoughts/slug.png,
unless that file already exists or the post sets its own `og_image`.
Requires Pillow and PyYAML.
"""
import glob
import os
import re

import yaml
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

ROOT = os.getcwd()
HERE = os.path.dirname(os.path.abspath(__file__))
FONTS = os.path.join(HERE, "fonts")
AVATAR = os.path.join(ROOT, "images", "profile.jpg")
OUT_DIR = os.path.join(ROOT, "images", "thoughts")

S = 2                      # supersampling factor (drawn at 2x, then downscaled)
W, H = 1200, 630
BG, CARD = (244, 246, 248), (255, 255, 255)
ACCENT, TEXT, MUTED = (15, 118, 110), (31, 41, 55), (107, 114, 128)
NAME, URL = "Vittorio De Iuliis", "vdeiuliis.github.io"

# layout (1x pixels)
MARGIN, RADIUS, BAR = 40, 28, 12
PAD_T, PAD_X, PAD_B = 64, 72, 56
X0 = MARGIN + PAD_X                     # left edge of the text
TEXT_W = W - 2 * MARGIN - 2 * PAD_X     # available width for the title


def font(weight, size):
    return ImageFont.truetype(os.path.join(FONTS, f"inter-latin-{weight}-normal.woff"), round(size * S))


def text_width(f, s, track):
    return f.getlength(s) + track * max(len(s) - 1, 0)


def draw_tracked(d, xy, s, f, fill, track, anchor="lm"):
    """Draw text with letter-spacing (track, in device pixels)."""
    x, y = xy
    for i, ch in enumerate(s):
        d.text((x + f.getlength(s[:i]) + i * track, y), ch, font=f, fill=fill, anchor=anchor)


def wrap(words, f, track, maxw):
    lines, cur = [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if cur and text_width(f, trial, track) > maxw:
            lines.append(cur)
            cur = w
        else:
            cur = trial
    if cur:
        lines.append(cur)
    return lines


def layout_title(title):
    """Largest size (72 -> 44 px) fitting in 3 lines, then balance line lengths."""
    words = title.split()
    for size in range(72, 43, -2):
        f = font(800, size)
        track = -0.02 * size * S
        lines = wrap(words, f, track, TEXT_W * S)
        if len(lines) <= 3:
            break
    lo, hi = 1, TEXT_W * S          # narrowest width that keeps the same number of lines
    while lo < hi:
        mid = (lo + hi) // 2
        if len(wrap(words, f, track, mid)) <= len(lines) and all(
                text_width(f, w, track) <= mid for w in words):
            hi = mid
        else:
            lo = mid + 1
    return f, size, track, wrap(words, f, track, hi)


def clean(title):
    title = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", title)   # [text](url) -> text
    return re.sub(r"[*_`]", "", title).strip()


def render(title, out):
    img = Image.new("RGB", (W * S, H * S), BG)
    box = [MARGIN * S, MARGIN * S, (W - MARGIN) * S, (H - MARGIN) * S]

    # soft shadow + white card
    shadow = Image.new("L", img.size, 0)
    ImageDraw.Draw(shadow).rounded_rectangle([box[0], box[1] + 2 * S, box[2], box[3] + 2 * S], RADIUS * S, fill=30)
    img.paste((0, 0, 0), mask=shadow.filter(ImageFilter.GaussianBlur(6 * S)))
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle(box, RADIUS * S, fill=255)
    img.paste(CARD, mask=mask)
    # accent bar on the left, clipped to the rounded card
    bar = Image.new("L", img.size, 0)
    ImageDraw.Draw(bar).rectangle([box[0], box[1], box[0] + BAR * S, box[3]], fill=255)
    img.paste(ACCENT, mask=ImageChops.multiply(bar, mask))

    d = ImageDraw.Draw(img)

    # label: small rounded square + "THOUGHTS"
    top = MARGIN + PAD_T
    label_h = 26 * 1.21
    cy = (top + label_h / 2) * S
    d.rounded_rectangle([X0 * S, cy - 9 * S, (X0 + 18) * S, cy + 9 * S], 5 * S, fill=ACCENT)
    draw_tracked(d, ((X0 + 32) * S, cy), "THOUGHTS", font(700, 26), ACCENT, 0.14 * 26 * S)

    # title
    f, size, track, lines = layout_title(clean(title))
    lh = size * 1.12
    y = top + label_h + 34
    for i, line in enumerate(lines):
        draw_tracked(d, (X0 * S, (y + i * lh + lh / 2) * S), line, f, TEXT, track)

    # footer: avatar, name, url
    bottom = H - MARGIN - PAD_B
    av = 76
    tx = X0
    if os.path.exists(AVATAR):
        a = Image.open(AVATAR).convert("RGB")
        side = min(a.size)
        a = a.crop(((a.width - side) // 2, (a.height - side) // 2,
                    (a.width + side) // 2, (a.height + side) // 2)).resize((av * S, av * S), Image.LANCZOS)
        m = Image.new("L", a.size, 0)
        ImageDraw.Draw(m).ellipse([0, 0, av * S - 1, av * S - 1], fill=255)
        img.paste(a, (X0 * S, (bottom - av) * S), m)
        tx = X0 + av + 22
    name_h, url_h, gap = 30 * 1.21, 24 * 1.21, 4
    block_top = bottom - av / 2 - (name_h + gap + url_h) / 2
    d.text((tx * S, (block_top + name_h / 2) * S), NAME, font=font(700, 30), fill=TEXT, anchor="lm")
    d.text((tx * S, (block_top + name_h + gap + url_h / 2) * S), URL, font=font(500, 24), fill=MUTED, anchor="lm")

    img.resize((W, H), Image.LANCZOS).save(out, optimize=True)


def front_matter(path):
    txt = open(path, encoding="utf-8").read()
    m = re.match(r"^---\s*\n(.*?)\n---", txt, re.S)
    return (yaml.safe_load(m.group(1)) or {}) if m else {}


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for path in sorted(glob.glob(os.path.join(ROOT, "_thoughts", "*.md"))):
        fm = front_matter(path)
        if fm.get("og_image"):
            continue                                   # the post chooses its own image
        slug = re.sub(r"^\d{4}-\d{2}-\d{2}-", "", os.path.splitext(os.path.basename(path))[0])
        out = os.path.join(OUT_DIR, slug + ".png")
        if os.path.exists(out):
            continue                                   # keep cards already in the repository
        render(str(fm.get("title", slug)), out)
        print("card:", os.path.relpath(out, ROOT))


if __name__ == "__main__":
    main()
