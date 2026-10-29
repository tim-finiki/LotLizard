#!/usr/bin/env python3
"""
Review sheets comparing the original artwork, variant A1 (original mascot colours) and A2 (brighter-lime
mascot grade), plus the approved board for reference. Not served; for approval only.

    python3 scripts/brand/proof_sheets.py <package-dir>

<package-dir> must contain A1-original-mascot-colors/ and A2-brighter-lime-mascot/ built with
`build_assets.py --a1 --out <pkg>/A1-original-mascot-colors` and `build_assets.py --out <pkg>/A2-brighter-lime-mascot`.
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
FONTS = ROOT / "brand/fonts"
ORIGINAL = ROOT / "brand/source/ORIGINAL_APPROVED_MASCOT.png"
BOARD = ROOT / "brand/reference/APPROVED_FINAL_BRAND_BOARD.png"
CHARCOAL, WHITE, LIME, PAGE, INK = (15, 20, 18), (255, 255, 255), (126, 211, 33), (241, 243, 240), (15, 20, 18)
OUTLINE = (2, 21, 40)

label_font = ImageFont.truetype(str(FONTS / "Inter-Medium.ttf"), 22)
small_font = ImageFont.truetype(str(FONTS / "Inter-Medium.ttf"), 17)
title_font = ImageFont.truetype(str(FONTS / "Sora-ExtraBold.ttf"), 30)


def fit(im: Image.Image, w: int, h: int) -> Image.Image:
    s = min(w / im.width, h / im.height)
    return im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)


def tile(im: Image.Image, w: int, h: int, bg: tuple[int, int, int], caption: str = "") -> Image.Image:
    t = Image.new("RGBA", (w, h), bg + (255,))
    art = fit(im.convert("RGBA"), w - 40, h - (70 if caption else 40))
    t.alpha_composite(art, ((w - art.width) // 2, 20 + (h - (70 if caption else 40) - art.height) // 2))
    if caption:
        ImageDraw.Draw(t).text((20, h - 40), caption, font=small_font, fill=(229, 231, 235) if bg == CHARCOAL else (55, 65, 81))
    return t


def sheet(title: str, subtitle: str, rows: list[list[Image.Image]], row_labels: list[str]) -> Image.Image:
    cols = max(len(r) for r in rows)
    tw = max(t.width for r in rows for t in r)
    th = max(t.height for r in rows for t in r)
    W = 40 + cols * (tw + 20) + 20
    H = 130 + len(rows) * (th + 60) + 20
    out = Image.new("RGB", (W, H), PAGE)
    d = ImageDraw.Draw(out)
    d.text((40, 30), title, font=title_font, fill=INK)
    d.text((40, 78), subtitle, font=small_font, fill=(75, 85, 99))
    y = 130
    for r, lab in zip(rows, row_labels):
        d.text((40, y), lab, font=label_font, fill=INK)
        for i, t in enumerate(r):
            out.paste(t.convert("RGB"), (40 + i * (tw + 20), y + 34))
        y += th + 60
    return out


def tagline(width: int, on_dark: bool) -> Image.Image:
    """Optional typeset tagline in the board's style (heavy italic spaced caps, lime dots and rules)."""
    font = ImageFont.truetype(str(FONTS / "Sora-ExtraBold.ttf"), 46)
    words = ["FIND", "PARK", "ENJOY"]
    color = WHITE if on_dark else INK
    track = 10
    pieces = []
    for i, word in enumerate(words):
        pieces.append((word, color))
        if i < len(words) - 1:
            pieces.append(("·", LIME))
    measure = lambda s: sum(font.getlength(c) + track for c in s) - track
    gap = 36
    text_w = sum(measure(p) for p, _ in pieces) + gap * (len(pieces) - 1)
    rule = 90
    W, H = int(text_w + 2 * (rule + 30) + 40), 90
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    x = rule + 50
    for p, col in pieces:
        for c in p:
            d.text((x, 14), c, font=font, fill=col)
            x += font.getlength(c) + track
        x += gap - track
    d.rounded_rectangle((20, 40, 20 + rule, 46), 3, fill=LIME)
    d.rounded_rectangle((W - 20 - rule, 40, W - 20, 46), 3, fill=LIME)
    k = math.tan(math.radians(9))
    im = im.transform((W + int(H * k), H), Image.AFFINE, (1, k, -H * k, 0, 1, 0), Image.BICUBIC)
    return fit(im, width, 200)


def with_tagline(logo: Image.Image, on_dark: bool) -> Image.Image:
    tg = tagline(round(logo.width * 0.86), on_dark)
    out = Image.new("RGBA", (logo.width, logo.height + tg.height + 10), (0, 0, 0, 0))
    out.alpha_composite(logo, (0, 0))
    out.alpha_composite(tg, ((logo.width - tg.width) // 2, logo.height + 4))
    return out


def main(pkg: Path) -> None:
    a1, a2 = pkg / "A1-original-mascot-colors/assets", pkg / "A2-brighter-lime-mascot/assets"
    out = pkg / "proof-sheets"
    out.mkdir(exist_ok=True)
    original = Image.open(ORIGINAL).convert("RGBA")
    full1, full2 = Image.open(a1 / "lotlizard-logo-full.png"), Image.open(a2 / "lotlizard-logo-full.png")
    comp1, comp2 = Image.open(a1 / "lotlizard-logo-compact.png"), Image.open(a2 / "lotlizard-logo-compact.png")
    head1, head2 = Image.open(a1 / "lotlizard-mascot-head.png"), Image.open(a2 / "lotlizard-mascot-head.png")
    W, H = 620, 560

    def save(im: Image.Image, name: str) -> None:
        im.save(out / name, optimize=True)
        print(f"  proof-sheets/{name}  {im.width}x{im.height}")

    # 1. Original vs A1 vs A2, on white and charcoal.
    save(sheet(
        "Full primary logo — original vs A1 vs A2",
        "Same pixels and composition as the original. A1: original mascot colours. A2: brighter-lime mascot grade. Both: lime 'Lizard', dark edge, restrained lime outline.",
        [[tile(original, W, H, WHITE, "Original source (white background is part of the file)"), tile(full1, W, H, WHITE, "A1 on white"), tile(full2, W, H, WHITE, "A2 on white")],
         [tile(original, W, H, CHARCOAL, "Original source (opaque, shown for scale)"), tile(full1, W, H, CHARCOAL, "A1 on charcoal #0F1412"), tile(full2, W, H, CHARCOAL, "A2 on charcoal #0F1412")]],
        ["On white", "On charcoal"]), "1-original-vs-A1-vs-A2.png")

    # 2. Compact logo.
    save(sheet(
        "Compact logo — mascot + original wordmark badge (no stadium)",
        "The lot lines are part of the original badge, so they stay; stadium and cars are removed.",
        [[tile(comp1, W, H, WHITE, "A1 on white"), tile(comp2, W, H, WHITE, "A2 on white")],
         [tile(comp1, W, H, CHARCOAL, "A1 on charcoal"), tile(comp2, W, H, CHARCOAL, "A2 on charcoal")]],
        ["On white", "On charcoal"]), "2-compact-logo.png")

    # 3. Mascot-head icons at real sizes.
    sizes = (16, 32, 48, 64, 128, 180, 256)
    rows, labels = [], []
    for variant, folder in (("A1", a1), ("A2", a2)):
        for bgname, file in (("charcoal", "lotlizard-icon.png"), ("lime", "lotlizard-icon-lime.png")):
            icon = Image.open(folder / file)
            for page_name, page in (("white page", WHITE), ("charcoal page", CHARCOAL)):
                strip = Image.new("RGBA", (sum(sizes) + 30 * len(sizes) + 30, 300), page + (255,))
                d = ImageDraw.Draw(strip)
                x = 30
                for s in sizes:
                    strip.alpha_composite(icon.resize((s, s), Image.LANCZOS), (x, 20 + (256 - s)))
                    d.text((x, 280), f"{s}px", font=small_font, fill=(156, 163, 175))
                    x += s + 30
                rows.append([strip])
                labels.append(f"{variant} · {bgname} icon on a {page_name}")
    save(sheet("Mascot-head icon at real sizes", "16/32 px = favicon, 180 = Apple touch, 192/512 = PWA. Pixels are downsampled, never redrawn.", rows, labels), "3-icon-sizes.png")

    # 4. Board reference vs A2 (compromises).
    board = Image.open(BOARD).convert("RGBA")
    crops = {
        "Board: final production logo": board.crop((505, 40, 960, 330)),
        "Board: compact logo": board.crop((995, 40, 1290, 310)),
        "Board: mascot icon": board.crop((1290, 40, 1530, 250)),
    }
    save(sheet(
        "Approved board (concept) vs A2 (derived from the original)",
        "The board is a redrawn concept; A2 keeps the original geometry. Differences are listed in COMPROMISES.md.",
        [[tile(v, W, H, WHITE, k) for k, v in crops.items()],
         [tile(full2, W, H, WHITE, "A2: full primary logo"), tile(comp2, W, H, WHITE, "A2: compact logo"), tile(head2, W, H, WHITE, "A2: mascot head")]],
        ["Board", "A2"]), "4-board-vs-A2.png")

    # 5. Optional tagline in the board's style (typeset, not part of the original).
    save(sheet(
        "Optional: FIND · PARK · ENJOY tagline (typeset in Sora, as on the board)",
        "Not in the original artwork. Shown only so you can decide whether to add it.",
        [[tile(with_tagline(full2, False), W, H + 60, WHITE, "A2 + tagline on white"), tile(with_tagline(full2, True), W, H + 60, CHARCOAL, "A2 + tagline on charcoal")],
         [tile(with_tagline(comp2, False), W, H + 60, WHITE, "Compact A2 + tagline on white"), tile(with_tagline(comp2, True), W, H + 60, CHARCOAL, "Compact A2 + tagline on charcoal")]],
        ["Full", "Compact"]), "5-optional-tagline.png")


if __name__ == "__main__":
    main(Path(sys.argv[1]).resolve())
