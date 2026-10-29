#!/usr/bin/env python3
"""
Builds the LotLizard logo and icon set from the approved original artwork.

    python3 scripts/brand/build_assets.py            # approved A2 set (brighter-lime mascot grade)
    python3 scripts/brand/build_assets.py --a1       # A1: original mascot colours (reference only)

Source of truth: brand/source/ORIGINAL_APPROVED_MASCOT.png (never modified). Every illustrated pixel in
the outputs comes from that file; nothing is redrawn or generated. The script only:
  - removes the plain white surround (full logo) or the stadium and cars (compact logo, mascot, head),
  - adds the approved logo treatment: dark edging + restrained lime (#7ED321) exterior outline,
  - brightens the "Lizard" letters of the original wordmark to lime (letters only),
  - applies the approved brighter-lime colour grade to the mascot's greens (A2; same pixels, new grade),
  - crops, scales and places art on backgrounds for icons and social images.

Requires Python 3 with Pillow and NumPy. Outputs:
  public/brand       files the website serves (logos, mascot, icons, PWA icons)
  src/app            Next.js metadata files (favicon.ico, icon.png, apple-icon.png, social images)
  brand/production   print, background and alternate versions (kept in the repo, not served)
"""
from __future__ import annotations

import colorsys
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "brand/source/ORIGINAL_APPROVED_MASCOT.png"
FONTS = ROOT / "brand/fonts"
PUBLIC = ROOT / "public/brand"
APP = ROOT / "src/app"
PRODUCTION = ROOT / "brand/production"

CHARCOAL = (15, 20, 18)  # #0F1412 (approved board)
LIME = (126, 211, 33)  # #7ED321
NEAR_WHITE = (248, 250, 248)  # #F8FAF8 (approved board)
OUTLINE = (2, 21, 40)  # mean colour of the original's dark outline (measured)
LIZARD_LETTERS = (140, 216, 86)  # mean colour of the original "Lizard" letters (measured)

# ---------------------------------------------------------------- pixel helpers


def load() -> np.ndarray:
    return np.asarray(Image.open(SRC).convert("RGB")).astype(np.int32)


def flood(open_mask: np.ndarray, seeds: list[tuple[int, int]]) -> np.ndarray:
    """4-connected flood fill over `open_mask` from `seeds`."""
    h, w = open_mask.shape
    seen = np.zeros_like(open_mask, bool)
    q: deque[tuple[int, int]] = deque()
    for y, x in seeds:
        if open_mask[y, x] and not seen[y, x]:
            seen[y, x] = True
            q.append((y, x))
    while q:
        y, x = q.popleft()
        for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if 0 <= ny < h and 0 <= nx < w and open_mask[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True
                q.append((ny, nx))
    return seen


def border_seeds(h: int, w: int) -> list[tuple[int, int]]:
    return [(0, x) for x in range(w)] + [(h - 1, x) for x in range(w)] + [(y, 0) for y in range(h)] + [(y, w - 1) for y in range(h)]


def fill_holes(mask: np.ndarray) -> np.ndarray:
    return mask | ~flood(~mask, border_seeds(*mask.shape))


def largest_component(mask: np.ndarray) -> np.ndarray:
    seen = np.zeros_like(mask, bool)
    best, best_n = mask, 0
    for y, x in zip(*np.nonzero(mask)):
        if seen[y, x]:
            continue
        comp = flood(mask, [(y, x)])
        seen |= comp
        if comp.sum() > best_n:
            best, best_n = comp, int(comp.sum())
    return best


def max_filter(mask: np.ndarray, size: int) -> np.ndarray:
    return np.asarray(Image.fromarray(mask.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(size))) > 0


def grow(alpha: np.ndarray, radius: float) -> np.ndarray:
    """Rounded, anti-aliased dilation of a 0..1 alpha map by about `radius` px."""
    if radius < 1:  # Pillow's MaxFilter(1) faults; nothing to grow anyway
        return alpha
    m = Image.fromarray((np.clip(alpha, 0, 1) * 255).astype(np.uint8), "L")
    size = int(radius) * 2 + 1
    g = m.filter(ImageFilter.MaxFilter(size)).filter(ImageFilter.GaussianBlur(radius * 0.45))
    return np.clip((np.asarray(g).astype(np.float32) / 255 - 0.35) / 0.3, 0, 1)


def soft_alpha(mask: np.ndarray) -> np.ndarray:
    m = Image.fromarray(mask.astype(np.uint8) * 255, "L").filter(ImageFilter.GaussianBlur(0.7))
    return np.asarray(m).astype(np.float32) / 255


def compose_outlined(rgb: np.ndarray, alpha: np.ndarray, dark_px: float, lime_px: float) -> Image.Image:
    """Art over a dark edge over a lime exterior outline, on transparency."""
    dark_a = grow(alpha, dark_px)
    lime_a = grow(dark_a, lime_px)
    out = np.zeros(alpha.shape + (4,), np.float32)
    for color, a in ((np.array(LIME, np.float32), lime_a), (np.array(OUTLINE, np.float32), dark_a), (rgb.astype(np.float32), alpha)):
        a3 = a[..., None]
        out[..., :3] = color * a3 + out[..., :3] * (1 - a3)
        out[..., 3:] = a3 + out[..., 3:] * (1 - a3)
    out[..., 3] *= 255
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA")


def compose_ring_under(rgb: np.ndarray, art_alpha: np.ndarray, ring_source: np.ndarray, dark_px: float, lime_px: float) -> Image.Image:
    """
    Lime + dark outline around `ring_source` (mascot and badge), drawn *beneath* the art: it shows only
    where the emblem meets empty space, so the stadium and cars keep their original edges.
    """
    dark_a = grow(ring_source, dark_px)
    lime_a = grow(dark_a, lime_px)
    out = np.zeros(art_alpha.shape + (4,), np.float32)
    for color, a in ((np.array(LIME, np.float32), lime_a), (np.array(OUTLINE, np.float32), dark_a), (rgb.astype(np.float32), art_alpha)):
        a3 = a[..., None]
        out[..., :3] = color * a3 + out[..., :3] * (1 - a3)
        out[..., 3:] = a3 + out[..., 3:] * (1 - a3)
    out[..., 3] *= 255
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA")


def white_key(a: np.ndarray, outside: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """
    Soft transparency for the white surround: pixels connected to it get alpha from how far they are
    from white, and their colour is un-blended from white, so faded stadium edges stay faded (and
    keep their blue-gray) on any background.
    """
    rgb = a.astype(np.float32)
    dist = (255 - rgb.min(axis=2))
    alpha = np.where(outside, np.clip((dist - 4) / 60, 0, 1), 1.0)
    safe = np.maximum(alpha, 1e-3)[..., None]
    unblended = np.clip((rgb - (1 - alpha[..., None]) * 255) / safe, 0, 255)
    return np.where(outside[..., None], unblended, rgb), alpha


def trim(im: Image.Image, margin: int = 0) -> Image.Image:
    im = im.crop(im.getchannel("A").getbbox())
    if not margin:
        return im
    out = Image.new("RGBA", (im.width + 2 * margin, im.height + 2 * margin), (0, 0, 0, 0))
    out.alpha_composite(im, (margin, margin))
    return out


def fit(im: Image.Image, size: tuple[int, int]) -> Image.Image:
    s = min(size[0] / im.width, size[1] / im.height)
    return im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)


def on_background(im: Image.Image, color: tuple[int, int, int], margin: int) -> Image.Image:
    bg = Image.new("RGBA", (im.width + 2 * margin, im.height + 2 * margin), color + (255,))
    bg.alpha_composite(im, (margin, margin))
    return bg


def save(im: Image.Image, path: Path, **kw) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, optimize=True, **kw)
    print(f"  {path.relative_to(ROOT)}  {im.size[0]}x{im.size[1]}")


# ---------------------------------------------------------------- segmentation of the original


def badge_curve(a: np.ndarray) -> np.ndarray:
    """Top edge of the wordmark badge, fitted from the stretches where nothing covers it."""
    navy = (a.max(axis=2) < 80) & (a[..., 2] >= a[..., 0])
    xs, ys = [], []
    for x in list(range(90, 221)) + list(range(700, 861)) + list(range(1000, 1111)):
        run = 0
        for y in range(690, 900):
            run = run + 1 if navy[y, x] else 0
            if run >= 14:
                xs.append(x)
                ys.append(y - 13)
                break
    xa, ya = np.array(xs), np.array(ys)
    c = np.polyfit(xa, ya, 2)
    keep = np.abs(ya - np.polyval(c, xa)) < 8
    return np.polyfit(xa[keep], ya[keep], 2)


def full_logo_mask(a: np.ndarray) -> np.ndarray:
    """Everything except the plain white surround: mascot, stadium, vehicles, lot lines, badge."""
    return ~flood(a.min(axis=2) >= 238, border_seeds(*a.shape[:2]))


def mascot_mask(a: np.ndarray) -> np.ndarray:
    """
    The mascot alone. Its dark outline and white sticker halo separate it from the stadium. Where the
    arms rest on the badge there is no halo, so the cut follows the badge's top edge; the fingers that
    hang over the badge are restored from the hand's own green pixels and outline.
    """
    h, w, _ = a.shape
    yy, xx = np.mgrid[0:h, 0:w]
    curve = np.polyval(badge_curve(a), xx) + 4
    below = yy > curve
    dark = a.max(axis=2) < 80
    badge_line = (yy > curve - 20) & (a.min(axis=2) > 185)
    m = ~flood(~(dark | below | badge_line), border_seeds(h, w)) & ~below & ~badge_line
    green = (a[..., 1] > a[..., 0] + 25) & (a[..., 1] > a[..., 2] + 25) & ~dark
    zone = (xx >= 500) & (xx <= 740) & (yy >= 660) & (yy <= 830)
    hand = flood(green & zone, [(700, 625)])
    m &= ~(zone & (yy > curve - 25))
    m |= hand | (max_filter(hand, 15) & dark & zone)
    return fill_holes(largest_component(m))


def badge_and_mascot_mask(a: np.ndarray, mascot: np.ndarray) -> np.ndarray:
    """Mascot + the complete wordmark badge (letters, plate and its lot lines), without stadium or cars."""
    full = full_logo_mask(a)
    near_white = a.min(axis=2) > 200
    plate = flood(full & ~near_white, [(990, 820)])  # navy fill between the letters
    m = fill_holes(plate | mascot)
    # the badge's own white edging
    m |= max_filter(m, 17) & near_white & full
    # the white lot-line stripes run off the badge's bottom edge: close the outline across them
    h, w = m.shape
    yy = np.mgrid[0:h, 0:w][0]
    closed = np.asarray(Image.fromarray(m.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(31)).filter(ImageFilter.MinFilter(31))) > 0
    m |= closed & (yy > 950)
    return fill_holes(largest_component(m))


# ---------------------------------------------------------------- colour


def brighten_lizard_letters(a: np.ndarray, mascot: np.ndarray) -> np.ndarray:
    """Shift the original "Lizard" letters to the approved lime, keeping their shading."""
    h, w, _ = a.shape
    yy, xx = np.mgrid[0:h, 0:w]
    letters = (yy > np.polyval(badge_curve(a), xx) + 2) & (yy < 1000) & ~max_filter(mascot, 9)
    green = (a[..., 1] > a[..., 0] + 25) & (a[..., 1] > a[..., 2] + 25)
    weight = np.clip((a[..., 1] - 34) / (LIZARD_LETTERS[1] - 34), 0, 1) * green * letters
    shift = np.array(LIME, np.float32) - np.array(LIZARD_LETTERS, np.float32)
    return np.clip(a.astype(np.float32) + weight[..., None] * shift, 0, 255)


def lime_grade(rgb: np.ndarray, mask: np.ndarray) -> np.ndarray:
    """Brighter-lime grade of the mascot's greens: hue nudged toward #7ED321, more saturation."""
    out = rgb.copy()
    ys, xs = np.nonzero(mask)
    px = rgb[ys, xs] / 255
    target_h = colorsys.rgb_to_hsv(*(np.array(LIME) / 255))[0]
    for i, (r, g, b) in enumerate(px):
        hh, ss, vv = colorsys.rgb_to_hsv(r, g, b)
        if 0.17 < hh < 0.42 and ss > 0.25:  # greens only; blues, reds, whites and outlines untouched
            hh = hh + (target_h - hh) * 0.6
            ss = min(1.0, ss * 1.12)
            vv = min(1.0, vv * 1.04)
            out[ys[i], xs[i]] = np.array(colorsys.hsv_to_rgb(hh, ss, vv)) * 255
    return out


# ---------------------------------------------------------------- icons


def rounded_mask(size: int, radius_frac: float) -> Image.Image:
    m = Image.new("L", (size, size), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, size - 1, size - 1), radius=round(size * radius_frac), fill=255)
    return m


def head_icon(head: Image.Image, size: int, bg: tuple[int, int, int] | None, radius_frac: float = 0.22, scale: float = 0.86) -> Image.Image:
    """Whole head centred (slightly low, so the cap has room), on an optional rounded background."""
    canvas = Image.new("RGBA", (size, size), (bg + (255,)) if bg else (0, 0, 0, 0))
    h = fit(head, (round(size * scale), round(size * scale)))
    canvas.alpha_composite(h, ((size - h.width) // 2, (size - h.height) // 2 + round(size * 0.03)))
    if radius_frac and bg:
        canvas.putalpha(ImageOps.invert(ImageOps.invert(rounded_mask(size, radius_frac))))
    return canvas


# ---------------------------------------------------------------- build


def favicon_16(rgb: np.ndarray, head_m: np.ndarray) -> Image.Image:
    """
    16px favicon: the same A2 head pixels cropped tighter (cap, sunglasses, face), with only the dark
    edge (a lime ring is sub-pixel at this size), full-bleed charcoal, light sharpening. Not redrawn.
    """
    art = compose_outlined(rgb, soft_alpha(head_m), dark_px=6, lime_px=0).crop((290, 120, 935, 565))
    canvas = Image.new("RGBA", (256, 256), CHARCOAL + (255,))
    f = fit(art, (246, 246))
    canvas.alpha_composite(f, ((256 - f.width) // 2, (256 - f.height) // 2))
    small = canvas.resize((16, 16), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=0.6, percent=90, threshold=0))
    return ImageEnhance.Contrast(small).enhance(1.12)


def main(lime: bool) -> None:
    a = load()
    h, w, _ = a.shape
    yy, xx = np.mgrid[0:h, 0:w]
    print(f"Building LotLizard brand assets from {SRC.relative_to(ROOT)}{' (brighter-lime grade)' if lime else ''}")

    mascot_m = mascot_mask(a)
    rgb = brighten_lizard_letters(a, mascot_m)
    if lime:
        rgb = lime_grade(rgb, mascot_m)

    # 1. Full primary logo: original composition with a soft-keyed transparent surround; the outline
    #    wraps the mascot and badge only (beneath the art), so stadium and cars keep their own edges.
    compact_m = badge_and_mascot_mask(a, mascot_m)
    # the white surround (lighter greys are art); the badge's stripe ends belong to the badge
    surround = flood((a.min(axis=2) >= 235) & ~compact_m, border_seeds(h, w))
    full_rgb, full_alpha = white_key(rgb, surround)
    ring = soft_alpha(compact_m)
    full = trim(compose_ring_under(full_rgb, full_alpha, ring, dark_px=4, lime_px=8), 10)
    save(full, PUBLIC / "lotlizard-logo-full.png")
    # 2x for print: the art is the 1254px original upscaled (no added detail); outlines are rendered at 2x.
    big = lambda arr: np.asarray(Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).resize((w * 2, h * 2), Image.LANCZOS)).astype(np.float32)
    full2 = trim(compose_ring_under(big(full_rgb), big(full_alpha * 255) / 255, big(ring * 255) / 255, dark_px=8, lime_px=16), 20)
    save(full2, PRODUCTION / "lotlizard-logo-full@2x.png")

    # 2. Compact logo: mascot + the complete original wordmark badge, no stadium or cars.
    compact = trim(compose_outlined(rgb, soft_alpha(compact_m), dark_px=4, lime_px=8), 10)
    save(compact, PUBLIC / "lotlizard-logo-compact.png")

    # 3. Mascot alone (bust as it rests on the badge); the cut along the badge is closed in outline colour.
    m_rgb = rgb.copy()
    curve = np.polyval(badge_curve(a), xx) + 4
    m_rgb[mascot_m & (yy > curve - 7) & ~((xx >= 500) & (xx <= 740))] = OUTLINE
    mascot = trim(compose_outlined(m_rgb, soft_alpha(mascot_m), dark_px=4, lime_px=9), 8)
    save(mascot, PUBLIC / "lotlizard-mascot.png")

    # 4. Head: cap, sunglasses, face and neck (thumb excluded), for icons.
    head_cut = 560
    head_m = largest_component(mascot_m & (yy < head_cut) & ~((xx > 860) & (yy > 470)) & ~((xx < 470) & (yy > 520)))
    h_rgb = rgb.copy()
    h_rgb[head_m & (yy >= head_cut - 7)] = OUTLINE
    head = trim(compose_outlined(h_rgb, soft_alpha(head_m), dark_px=4, lime_px=9), 6)
    save(head, PUBLIC / "lotlizard-mascot-head.png")

    # Web sizes, served as lossless PNG (no re-encoding) so the approved art is shown exactly.
    for width in (520, 760):
        save(full.resize((width, round(full.height * width / full.width)), Image.LANCZOS), PUBLIC / f"lotlizard-logo-full-{width}.png")
    save(head.resize((160, round(head.height * 160 / head.width)), Image.LANCZOS), PUBLIC / "lotlizard-mascot-head-160.png")

    # 5. Background versions (light and dark) of the logos.
    for name, im in (("full", full), ("compact", compact)):
        save(on_background(im, (255, 255, 255), 40).convert("RGB"), PRODUCTION / f"lotlizard-logo-{name}-on-white.png")
        save(on_background(im, CHARCOAL, 40).convert("RGB"), PRODUCTION / f"lotlizard-logo-{name}-on-charcoal.png")
    # Grayscale (print / one-colour contexts that accept tone). A line-art monochrome needs a vector redraw.
    gray = ImageOps.grayscale(full.convert("RGB")).convert("RGBA")
    gray.putalpha(full.getchannel("A"))
    save(gray, PRODUCTION / "lotlizard-logo-full-grayscale.png")

    # 6. Icons: the head on charcoal (primary) and lime (alternate).
    icon = head_icon(head, 1024, CHARCOAL)
    icon_lime = head_icon(head, 1024, LIME)
    save(icon, PRODUCTION / "lotlizard-icon-1024.png")
    save(icon_lime, PRODUCTION / "lotlizard-icon-lime-1024.png")
    for s in (192, 512):
        save(icon.resize((s, s), Image.LANCZOS), PUBLIC / f"icon-{s}.png")
    maskable = Image.new("RGBA", (512, 512), CHARCOAL + (255,))
    maskable.alpha_composite(head_icon(head, 410, None, radius_frac=0, scale=0.92), (51, 51))
    save(maskable, PUBLIC / "icon-maskable-512.png")
    save(icon.resize((512, 512), Image.LANCZOS), APP / "icon.png")
    save(head_icon(head, 180, CHARCOAL, radius_frac=0).convert("RGB"), APP / "apple-icon.png")  # iOS rounds corners itself
    fav = head_icon(head, 256, CHARCOAL, radius_frac=0.18, scale=0.96)
    fav16 = favicon_16(rgb, head_m)
    fav48 = fav.resize((48, 48), Image.LANCZOS)
    APP.mkdir(parents=True, exist_ok=True)
    fav48.save(APP / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)], append_images=[fav16, fav.resize((32, 32), Image.LANCZOS)])
    print("  favicon.ico  16 (optimised crop) / 32 / 48")
    save(fav16, PRODUCTION / "favicon-16.png")

    # 7. Social image 1200x630: full logo on charcoal + plain description.
    og = Image.new("RGBA", (1200, 630), CHARCOAL + (255,))
    logo = fit(full, (560, 560))
    og.alpha_composite(logo, (48, (630 - logo.height) // 2))
    d = ImageDraw.Draw(og)
    hf = ImageFont.truetype(str(FONTS / "Sora-ExtraBold.ttf"), 56)
    bf = ImageFont.truetype(str(FONTS / "Inter-Medium.ttf"), 27)
    y = 175
    for line, color in (("Find the best", NEAR_WHITE), ("parking for", LIME), ("every event.", NEAR_WHITE)):
        d.text((650, y), line, font=hf, fill=color)
        y += 68
    y += 26
    for line in ("Compare stadium and event parking:", "official and private lots, with the", "source behind every fact."):
        d.text((650, y), line, font=bf, fill=(209, 213, 219))
        y += 38
    save(og.convert("RGB"), APP / "opengraph-image.png")
    save(og.convert("RGB"), APP / "twitter-image.png")


if __name__ == "__main__":
    if "--out" in sys.argv:  # write everything to one folder (review packages) instead of the repo
        out = Path(sys.argv[sys.argv.index("--out") + 1]).resolve()
        PUBLIC, APP, PRODUCTION = out / "assets", out / "app-icons", out / "production"
        _save = save

        def save(im, path, **kw):  # noqa: F811 — print paths relative to the output folder
            path.parent.mkdir(parents=True, exist_ok=True)
            im.save(path, optimize=True, **kw)
            print(f"  {path.relative_to(out)}  {im.size[0]}x{im.size[1]}")

    main(lime="--a1" not in sys.argv)
