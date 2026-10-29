# LotLizard — Technical Architecture

_Last updated: 2026-10-29_

## 1. Stack

| Concern | Choice | Why |
| --- | --- | --- |
| Framework | **Next.js 16 (App Router) + React 19 + TypeScript** | Server components, static prerendering with Cache Components/PPR, first-class Vercel deploys |
| Styling | **Tailwind CSS v4** | Small CSS, fast iteration, mobile-first utilities |
| Maps | **Leaflet + react-leaflet**, OSM-compatible raster tiles (configurable URL) | ~40 KB, no API key, loaded client-side only on venue pages |
| Validation | **zod** | Shared schemas for API input validation |
| Tests | **Vitest** | Fast unit tests for ranking, geo, confidence and moderation logic |
| Hosting | **Vercel** | Edge CDN for prerendered pages, serverless route handlers |
| Submission storage | Pluggable: in-memory (dev) or **Upstash Redis REST** (free tier, env-configured) | No paid service required to start; swap for Postgres later |

## 2. High-level design

```
            ┌──────────────────────────── Vercel CDN ────────────────────────────┐
 Browser ──▶│ Prerendered HTML (venues, lots, states, about)   ─ static/ISR       │
            │ Dynamic holes (community reviews) streamed via Suspense (PPR)       │
            └───────────────┬───────────────────────────────┬────────────────────┘
                            │                               │
                  Server Components                Route Handlers (/api)
                            │                               │
               ┌────────────▼──────────┐       ┌────────────▼─────────────┐
               │ Repository layer       │       │ Submissions + moderation  │
               │ (lib/data/repository)  │       │ (lib/submissions/*)       │
               └────────────┬──────────┘       └────────────┬─────────────┘
                            │                               │
                 Curated seed data (TS)             SubmissionStore adapter
                 → Postgres/PostGIS later           memory | Upstash Redis
```

### Key modules (`src/lib`)

- `types.ts` — the domain model (below). The single source of truth shared by UI, API and seed data.
- `data/` — seed data (`sources.ts`, `venues.ts`, `facilities/*.ts`) and `repository.ts`, an async
  repository interface. Pages only talk to the repository, so moving to a database changes one module.
- `geo.ts` — haversine distance, estimated walking time (straight-line × route factor), bounds.
- `ranking.ts` — evidence-only personalized scoring. Returns a match score, data completeness, confidence of the
  evidence used, and a recommendation tier (`top_pick`, `good_match`, `fair_match`, `limited_data`). Unknown
  factors contribute 0, so missing data can never lift a lot; lots under 50% completeness are never recommended.
- `events.ts`, `directions.ts` — event labels/lot opening times (pure string math, timezone-safe) and map links
  that only target exact pins or sourced street addresses.
- `confidence.ts` — confidence ordering, labels, and community-report corroboration rules.
- `submissions/` — zod schemas, automated pre-moderation checks, store interface + adapters.
- `predictions/` — `ArrivalExitPredictor` interface and the MVP `UnavailablePredictor`.
- `seo.ts` — site URL, metadata helpers and JSON-LD builders.

## 3. Domain model (nationwide-scalable)

```
DataSource ─┐ (id, type: official|operator|media|user_report|lotlizard_field|editorial_estimate|third_party_api,
            │  name, url, retrievedAt)
Attribution { sourceIds[], confidence, lastVerifiedAt, notes }   ← attached to every fact

Venue (slug, type, teams[], address, location{lat,lng,precision}, timezone, coverage, gates[], policies[],
       transit[], attribution)
  └─ ParkingFacility (slug, venueId, type: official_lot|private_lot|garage|independent|residential|shuttle|
                      rideshare_zone|ada, operator, location, walk{minutes?: Attributed}, prices: PriceObservation[],
                      amenities[], tailgating{allowed, atmosphere 1–5}, exit{rating 1–5, routes, notes},
                      prepaidRequired, vehicleTypes[], booking{url, partner, isAffiliate}, attribution)
        └─ PriceObservation (min/max, vehicle, eventKind, season, observedAt, attribution)
Event (venueId, startsAt, kind)                       ← future: schedule ingest
TravelObservation (facilityId, eventId, kind: arrival|exit, minutes, source)   ← future model training
Submission (kind: price|review|lot_info|correction|exit_time, status: pending|approved|rejected, flags[])
Sponsorship (placement, sponsorName, url) — always labelled
```

Database migration path: each entity maps 1:1 to a Postgres table (PostGIS `geography(Point)` for location,
GIN trigram index for search). `Attributed<T>` becomes value + attribution columns or a side table
`fact_attributions(entity, field, source_id, confidence, verified_at)`.

## 4. Rendering & performance

- **Cache Components / PPR** (`cacheComponents: true`). Venue, lot, state and directory pages are prerendered
  at build via `generateStaticParams`; data access goes through `'use cache'` repository functions.
- Community content (approved reviews/prices) is request-time data rendered inside `<Suspense>` so the static
  shell is served from the CDN instantly and the dynamic hole streams in.
- The venue explorer is map-first: a full-height map with a draggable results sheet (`BottomSheet`) that turns
  into a side panel at the `lg` breakpoint. Event and direction selections live in the URL (`?event=&dir=`) so
  views are shareable; detailed rules and sources render server-side below the map for SEO.
- The map is a client-only island (`next/dynamic`, `ssr: false`) with a fixed-height placeholder to avoid
  layout shift. Leaflet CSS/JS is only loaded on venue pages.
- System font stack (no web-font download), SVG icon, no client analytics in MVP.
- Directory search runs client-side over a compact index (fine to ~5k venues); beyond that, move to Postgres
  full-text/trigram or a hosted search index.

## 5. SEO

- Descriptive titles/descriptions per venue and lot (`generateMetadata`), canonical URLs, Open Graph.
- `sitemap.ts` lists every venue, lot and state page; `robots.ts` disallows `/admin` and `/api`.
- JSON-LD: `StadiumOrArena` for venues, `ParkingFacility` for lots, `BreadcrumbList`. Prices are excluded from
  structured data unless confidence ≥ `high`.
- State hub pages (`/states/ny`) create internal links for crawl depth.

## 6. Trust: attribution & confidence

- Confidence levels: `verified` (confirmed by operator/official source and re-checked this season), `high`
  (official/operator published), `medium` (credible media or corroborated community reports), `low`
  (single community report or dated source), `unverified` (editorial estimate/placeholder).
- UI components `ConfidenceBadge` and `SourceList` are mandatory wherever a fact is displayed.
- Ranking output carries a completeness score so users see how much of a ranking is based on real data.

## 7. Submissions & moderation

1. `POST /api/submissions` — zod validation, honeypot field, per-IP rate limit, automated flags
   (price outlier vs known range, links, shouting, very short text).
2. Stored with `status: pending`.
3. `/admin` moderation UI → `GET/PATCH /api/admin/submissions` authorized by `ADMIN_TOKEN` (Bearer).
4. Approved items are exposed via repository `getCommunityReports(facilityId)` and rendered as
   community-reported with derived confidence.

Store adapters: `MemorySubmissionStore` (default; resets on redeploy/cold start — dev/preview only) and
`UpstashSubmissionStore` (when `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` are set). Future:
Postgres with an audit log table and moderator accounts.

## 8. Predictions (future)

`ArrivalExitPredictor.predict({ venueSlug, facilitySlug, eventStartsAt })` → `Prediction | Unavailable`.
Inputs planned: historical `TravelObservation`s (community exit-time reports, field data), event metadata
(attendance, kickoff time, weather), traffic APIs. The MVP returns `{ status: "unavailable" }` and the UI says
so. Models will run offline (batch) and write predictions to a table read by the same interface.

## 9. Monetization hooks

- `booking` on facilities → `ReferralLink` (`rel="sponsored noopener"`, disclosure text). Click tracking can be
  added via a redirect route (`/go/[facility]`) later.
- `Sponsorship` entities rendered by `SponsoredSlot`, never interleaved into rankings.
- `/api/v1/*` read API with attribution included, ready for API keys and quotas.

## 10. Environments & configuration

| Variable | Purpose | Required |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL for metadata/sitemap | Recommended in production |
| `ADMIN_TOKEN` | Moderation API/UI access | Required to moderate |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Persistent submission storage | Optional (memory store otherwise) |
| `NEXT_PUBLIC_MAP_TILE_URL`, `NEXT_PUBLIC_MAP_TILE_ATTRIBUTION` | Map tile provider | Optional (OSM default) |

## 11. Security & privacy
- Reporter email (optional) is stored for moderation only and never returned by public APIs.
- Admin token compared in constant time; admin routes `noindex`.
- No third-party trackers in MVP.
