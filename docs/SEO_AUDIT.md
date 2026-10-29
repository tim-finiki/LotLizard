# LotLizard SEO / GEO / AI-search audit

Audited 2026-10-29 against `main` @ 92e4552 (production build served locally; `*.vercel.app` isn't reachable from the audit sandbox, so production was checked through its build output and commit statuses). Targets: Google, Bing, and AI answer engines (ChatGPT search, Perplexity, Gemini / AI Overviews, Copilot).

Ground rules for everything here: no fabricated inventory, prices, amenities, reviews or availability; no thin or doorway pages; no AI-specific gimmicks. Structured data and plain text only state what the curated data already supports.

## Findings ranked by impact and effort

| # | Finding | Impact | Effort | Status in this PR |
|---|---------|--------|--------|-------------------|
| 1 | **Lot pages were not linked from the venue page.** Venue HTML had zero `<a>` links to the 19 lot pages: cards link only after a client-side expand, so crawlers found lots only through the sitemap. | High | Low | **Fixed.** A server-rendered "All N parking options" list links every lot, and lot pages link to their siblings. |
| 2 | **30 directory-only venue pages (~139 words, no parking data) were indexable and in the sitemap**, plus 18 state pages listing only those venues. That's a thin, near-duplicate page set at scale. | High | Low | **Fixed.** These pages are `noindex, follow` and dropped from the sitemap. They return when a venue has ≥3 parking options. |
| 3 | **Venue and lot pages were served `private, no-store`.** The cause was a sponsorship slot (`connection()`) that renders nothing, plus a community-reports hole while reporting is off. Every crawl and visit was rendered on demand. | High (CWV, crawl budget) | Low | **Fixed.** Both slots render only when they can show something, so the pages are fully static (`s-maxage=900`). |
| 4 | **The facts machines need weren't readable as text.** Per-lot price, walk, payment, amenities and tailgating were rendered only inside the client map. Verification state ("not yet field-verified") and review dates appeared nowhere in the HTML. | High (AI answers, featured snippets) | Medium | **Fixed.** Each lot gets a plain-text summary (unknowns stated as unknown; area-wide prices labelled as not lot-specific). Every venue and lot page shows a "Data status" line. |
| 5 | **Structured-data problems:** `priceRange` isn't valid on `ParkingFacility`; approximate editorial pins were published as `geo`; the venue had no `containsPlace` or events; there was no `WebSite` or `Organization`. | Medium | Low | **Fixed.** `priceRange` is removed, `geo` is published only for exact pins, and `amenityFeature` covers confirmed amenities only. Sourced games are `SportsEvent` with zoned `startDate`. `WebSite` and `Organization` are on the home page. |
| 6 | **robots.txt blocked `/api/`,** which hid the read-only `/api/v1` data API (the same facts with sources and confidence). | Medium (GEO) | Low | **Fixed.** `/api/v1/` is allowed and private endpoints are listed explicitly. Venue pages advertise the JSON with `<link rel="alternate" type="application/json">`. |
| 7 | **Sitemap had no `lastmod`.** | Medium | Low | **Fixed.** `lastmod` comes from the data (latest source review or field check), never from build time. |
| 8 | `/submit` was indexable while showing a "coming soon" placeholder. | Low | Low | **Fixed** (`noindex, follow`). |
| 9 | No Search Console or Bing Webmaster verification hook. | Medium (measurement) | Low | **Fixed.** `GOOGLE_SITE_VERIFICATION` and `BING_SITE_VERIFICATION` env vars feed the meta tags. |
| 10 | No `og:image` or brand logo in `Organization` markup. | Medium (CTR, sharing) | Low | **Blocked on the logo PNG.** |
| 11 | Venue HTML is ~250 KB, ~170 KB of it inline RSC payload (full venue and facility objects passed to the client explorer). | Medium (LCP / TBT on mid phones) | Medium | Open. Pass a slim per-lot view model to the explorer. |
| 12 | Canonical host comes from `VERCEL_PROJECT_PRODUCTION_URL` unless `NEXT_PUBLIC_SITE_URL` is set. | High, once a custom domain exists | Low | **Decision needed:** set `NEXT_PUBLIC_SITE_URL` to the final domain. |
| 13 | Map tiles come from the public OSM tile server, which isn't meant for production traffic. | Medium (reliability, CWV) | Low | Open. Choose a tile provider (see `.env.example`). |

Already good, and kept:
- one `h1` per page;
- clean canonicals (query-param filter states canonicalize to the venue path);
- unique titles and descriptions;
- `BreadcrumbList` on every page;
- policies, transit and traffic text server-rendered;
- previews automatically `noindex` on Vercel;
- mobile layout with no horizontal overflow.

## What this PR implements

- `src/lib/seo.ts`:
  - indexability rule: `isIndexableVenue`, at least 3 parking options and not `venue_only`;
  - corrected `venueJsonLd`, `facilityJsonLd` and `siteJsonLd`;
  - `zonedDateTime`, which applies the venue's DST-aware UTC offset.
- `src/lib/verification.ts`: one "how verified and how fresh" summary, used on pages and for sitemap `lastmod`. Reviewing published sources is not counted as field verification.
- `src/lib/facility-summary.ts` and `ParkingOptionsList`: crawlable plain-text facts per lot.
- Venue page:
  - parking options list (collapsed on load; the content is still in the HTML);
  - season schedule with lot-open times;
  - data status line;
  - JSON alternate link;
  - `noindex` for directory venues;
  - static rendering.
- Lot page: data status line, sibling links, `noindex` when the venue isn't indexable, static while reporting is off.
- State, home, submit and layout: `noindex` for thin state pages, site schema, home canonical, `noindex` on `/submit`, verification meta.
- `sitemap.ts` and `robots.ts` as described above.
- `src/lib/seo.test.ts` (18 tests):
  - indexability;
  - sitemap contents and `lastmod`;
  - robots rules;
  - JSON-LD types, absolute URLs, and no rating, price or offer claims;
  - `geo` only for exact pins;
  - amenities only when confirmed;
  - event times;
  - verification summary;
  - unknowns stay unknown in the text summaries.

## Information architecture (recommended next)

Keep the page set tied to verified inventory:

1. **Venue guide** (exists): the hub, indexable at ≥3 parking options.
2. **Lot pages** (exist): one per real facility, indexable with their venue.
3. **Event pages:** only when an event has event-specific data (a game-day payment override, a special lot-open time or a sourced price). Otherwise the venue page plus schedule markup covers it, and a page per game would be a doorway.
4. **City, neighborhood and airport hubs:** only when a city has ≥2 indexable venues, or an airport has ≥5 verified facilities. Until then the state page (noindex while thin) is enough.
5. **Owner and operator profiles:** when an operator runs ≥2 listed facilities, or claims a listing through the planned owner flow.
6. **Editorial guides** (e.g. "Highmark Stadium tailgating rules", "Getting out after a Bills game"): only from sourced policy and transit data already on the site, written once and kept current. No AI-generated filler.

Rule of thumb: a new page type ships with a test, like the one here, that keeps it out of the index and the sitemap until its data threshold is met.

## Competitive differentiation (SpotHero, ParkWhiz)

SpotHero and ParkWhiz rank for "[venue] parking" with bookable inventory pages. Their pages are transactional: price, a "Reserve" button and a list of garages in their network. LotLizard should not try to imitate a booking catalogue it doesn't have. The defensible angle, already reflected in this PR:

- **The whole picture, not just the inventory they sell:**
  - official team lots;
  - cash-only private lots;
  - shuttles;
  - rideshare zones;
  - tailgating rules.
- **Source and confidence on every fact.** AI answer engines prefer citable, attributed statements; "official lots open 4 hours before kickoff (source: Buffalo Bills, medium confidence)" is quotable.
- **Honest unknowns:** "Not yet field-verified", "area-wide range, not specific to this lot". This builds trust and avoids the stale-price complaints that booking sites attract.
- **Event-day intelligence** they don't cover: tailgating, exit direction, game-day payment changes.
- **Machine-readable data** at `/api/v1` for assistants and partners.

Booking-site affiliate links, if adopted, stay clearly labelled and outside the ranking (already enforced by `ReferralLink` and the sponsorship rules).

## Measurement plan (decision needed on the provider)

1. **Google Search Console and Bing Webmaster Tools:**
   - verify through the new env vars;
   - submit `/sitemap.xml`;
   - watch indexed pages (expect about 24), queries, CTR and Core Web Vitals.
   - Bing also feeds Copilot and ChatGPT search.
2. **Privacy-friendly analytics.** Options: Vercel Web Analytics, Plausible or GA4 (GA4 needs a consent banner).
   - Events to track:
     - `filter_applied`;
     - `lot_opened`;
     - `directions_clicked` (Google/Apple), the main conversion;
     - `referral_clicked`;
     - `report_started` (once reporting launches).
3. **AI referral tracking.** Segment sessions by referrer host:
   - `chatgpt.com` / `chat.openai.com`;
   - `perplexity.ai`;
   - `gemini.google.com`;
   - `copilot.microsoft.com` / `bing.com/chat`;
   - `claude.ai`.

   Also segment by `utm_source=chatgpt.com`, which ChatGPT appends.
4. **Vercel Speed Insights** for field CWV (LCP and INP) on the venue page, the heaviest page.

## Remaining opportunities

- Slim the RSC payload passed to `VenueExplorer` (finding 11).
- Add an OG image and the logo in `Organization` once the approved PNG arrives (no generated artwork).
- Field-verify entrances so lots can publish exact `geo` and directions. This unlocks more structured data automatically.
- Expand verified inventory venue by venue. Each venue becomes indexable on its own as it crosses the threshold.
- After launch, consider `llms.txt` only if it gains real adoption. It isn't needed for current crawlers, which read the sitemap and the JSON alternate.

## Decisions for the owner

1. **Canonical domain:** set `NEXT_PUBLIC_SITE_URL` when a custom domain is chosen.
2. **AI crawler policy:** currently all crawlers are allowed, including GPTBot, PerplexityBot, Google-Extended and ClaudeBot, to maximise AI-search visibility. Blocking training-only crawlers while allowing search crawlers is a business choice.
3. **Analytics provider** and whether a consent banner is acceptable.
4. **Logo PNG** for header, favicon, OG images and `Organization.logo`.
5. **Map tile provider** for production traffic.
