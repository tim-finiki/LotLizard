# LotLizard brand

**Approved direction:** A2. Approved by the owner on October 29, 2026, from the A1/A2 proof package.

## Source of truth
- `source/ORIGINAL_APPROVED_MASCOT.png` is the original artwork. It is never edited; a test pins its SHA-256 (`src/lib/brand.test.ts`).
- `reference/` holds the approved brand board and handoff notes. They are the styling reference only; nothing is cropped from the board.
- Every logo and icon is generated from the original by `scripts/brand/build_assets.py`. No illustration is redrawn.

## Approved set (A2)
| Asset | File | Notes |
|---|---|---|
| Primary logo | `public/brand/lotlizard-logo-full.png` | Original stadium, cars, lot lines, dark wordmark backing and arched lettering. Brighter-lime mascot grade. Lime "Lizard". Dark edge plus restrained lime outline. |
| Compact logo | `public/brand/lotlizard-logo-compact.png` | Mascot plus the original wordmark badge, no stadium or cars. |
| Mascot / head | `public/brand/lotlizard-mascot.png`, `lotlizard-mascot-head.png` | Cut from the original pixels. |
| Website header | `src/components/Brand.tsx` (`HeaderLogo`) | Header B: A2 mascot head plus live Sora wordmark (white "Lot", lime "Lizard", dark edge, lime outline). |
| App icon | `src/app/icon.png`, `public/brand/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `src/app/apple-icon.png` | A2 head on charcoal `#0F1412`. |
| Favicon | `src/app/favicon.ico` | 32 and 48 px from the app icon. The 16 px image is a tighter crop of the same head pixels (dark edge only, light sharpening), for legibility. |
| Social image | `src/app/opengraph-image.png`, `twitter-image.png` | Full logo on charcoal, plus headline. |
| Print / alternates | `brand/production/` | 2× print version, on-white and on-charcoal versions, grayscale, 1024 px icons, lime-background icon. Not served. |

No tagline: "FIND · PARK · ENJOY" is not used, per the approval.

## Rebuilding
```
python3 scripts/brand/build_assets.py         # A2 (approved)
python3 scripts/brand/build_assets.py --a1    # A1 reference: original mascot colours
```
This needs Python 3 with Pillow and NumPy. The fonts are in `brand/fonts` (SIL Open Font License). The website itself loads Sora and Inter through `next/font`, self-hosted at build time.

## Design tokens (`src/app/globals.css`)
| Token | Value | Use |
|---|---|---|
| `ink` | `#0F1412` | Charcoal: dark sections, footer, text |
| `lizard` | `#7ED321` | Lime: primary buttons and accents. Text on lime is always charcoal. |
| `forest` | `#2E7D32` | Green text and links on light backgrounds (5.1:1) |
| `mist` | `#F8FAF8` | Page background |
| `line` | `#E2E6E0` | Borders and surfaces |
| `mascot-blue` | `#1E67D2` | Mascot accent only |

The existing `brand-*` utilities map onto these values.

## Compromises
1. **Wordmark:** the letterforms, arch and dark plate are the original's. The board's redrawn plate-less wordmark can't be derived without inventing artwork.
2. **Scene:** the original gray cars, stadium shape and lot-line strip are kept, not the board's redrawn scene.
3. **Header B:** uses live Sora lettering, not the original arched lettering, for legibility at header size (as approved).
4. **Button text:** white text on lime is 1.87:1, which fails WCAG. Lime buttons use charcoal text (9.94:1).
5. **Secondary text:** the board's `#94A3B8` is used on charcoal only. On white it is 2.56:1, so light surfaces use darker grays.
6. **Map pins:** they still encode lot type with distinct colours (official lots are charcoal), each with at least 4.5:1 contrast against its white label. The board shows uniform charcoal price pins.
7. **Print:** the source is a 1254 px raster, sharp to about 4 in at 300 dpi. The 2× file is an upscale; larger print needs a vector master.
8. **Monochrome:** grayscale only. A one-colour line-art version needs a vector redraw.
9. **Narrow phones:** below 360 px wide (original iPhone SE), the header hides the "Report" button; it remains in the footer.
