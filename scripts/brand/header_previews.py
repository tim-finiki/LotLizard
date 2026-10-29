#!/usr/bin/env python3
"""Review sheet: header lockup options on white and charcoal, desktop and phone widths (not served)."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
B = ROOT / "public/brand"
F = ROOT / "brand/fonts"
CHARCOAL, LIME, OUTLINE = (17, 24, 39), (126, 211, 33), (2, 21, 40)
compact = Image.open(B / "lotlizard-logo-compact.png")
head = Image.open(B / "lotlizard-mascot-head.png")
nav = ImageFont.truetype(str(F / "Inter-Medium.ttf"), 15)
label = ImageFont.truetype(str(F / "Inter-Medium.ttf"), 16)


def fit_h(im, h):
    return im.resize((round(im.width * h / im.height), h), Image.LANCZOS)


def typeset(h):
    """Option B text: Sora ExtraBold, white "Lot" + lime "Lizard", dark edge + lime outline (not the original lettering)."""
    font = ImageFont.truetype(str(F / "Sora-ExtraBold.ttf"), h)
    im = Image.new("RGBA", (h * 8, h * 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    for sw, cols in ((round(h * .16), (LIME, LIME)), (round(h * .09), (OUTLINE, OUTLINE)), (0, ((255, 255, 255), LIME))):
        x = round(h * .3)
        for word, col in (("Lot", cols[0]), ("Lizard", cols[1])):
            d.text((x, round(h * .3)), word, font=font, fill=col, stroke_width=sw, stroke_fill=col)
            x += font.getlength(word) - round(h * .02)
    return im.crop(im.getbbox())


def bar(width, height, bg, option, links):
    im = Image.new("RGBA", (width, height), bg + (255,))
    d = ImageDraw.Draw(im)
    fg = (255, 255, 255) if bg == CHARCOAL else CHARCOAL
    pad = 16 if width < 600 else 32
    if option == "A":
        logo = fit_h(compact, height - 10)
        im.alpha_composite(logo, (pad, 5))
        x = pad + logo.width + 16
    else:
        hd = fit_h(head, height - 14)
        im.alpha_composite(hd, (pad, 7))
        t = fit_h(typeset(40), round(height * 0.42))
        im.alpha_composite(t, (pad + hd.width + 6, (height - t.height) // 2))
        x = pad + hd.width + 6 + t.width + 16
    if links:
        lx = width - pad
        cta = "Find parking"
        cw = round(d.textlength(cta, font=nav)) + 28
        d.rounded_rectangle((lx - cw, height // 2 - 18, lx, height // 2 + 18), 10, fill=LIME)
        d.text((lx - cw + 14, height // 2 - 9), cta, font=nav, fill=CHARCOAL)
        lx -= cw + 24
        for t in reversed(["Venues", "Cities", "How it works"]):
            tw = d.textlength(t, font=nav)
            d.text((lx - tw, height // 2 - 9), t, font=nav, fill=fg)
            lx -= tw + 24
    else:
        for i in range(3):
            d.rounded_rectangle((width - pad - 22, height // 2 - 8 + i * 7, width - pad, height // 2 - 6 + i * 7), 1, fill=fg)
    return im


rows = []
for opt, title in (("A", "Option A: compact logo (original arched wordmark), header height"), ("B", "Option B: head icon + typeset Sora wordmark (not the original lettering)")):
    for bg, bgname in (((255, 255, 255), "white"), (CHARCOAL, "charcoal")):
        rows.append((f"{title} · on {bgname}", bar(1200, 72, bg, opt, True), bar(390, 64, bg, opt, False)))
sheet = Image.new("RGB", (1200 + 40 + 390 + 40, len(rows) * 130 + 20), (241, 245, 249))
d = ImageDraw.Draw(sheet)
y = 20
for title, desk, phone in rows:
    d.text((20, y), title, font=label, fill=(55, 65, 81))
    sheet.paste(desk.convert("RGB"), (20, y + 28))
    sheet.paste(phone.convert("RGB"), (20 + 1200 + 40, y + 28))
    y += 130
out = ROOT / "brand/previews/header-options.png"
sheet.save(out, optimize=True)
print(out.relative_to(ROOT))
