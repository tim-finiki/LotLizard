# LotLizard — Phased MVP Implementation Plan

_Last updated: 2026-10-29_

## Phase 0 — Foundation ✅ (this PR)
- Next.js 16 + TypeScript + Tailwind v4 scaffold, Vercel-ready, Cache Components enabled.
- Domain model (`src/lib/types.ts`) with attribution/confidence on every fact.
- Source registry and repository layer over typed seed data.
- PRD, architecture and this plan.

## Phase 1 — Buffalo pilot, read-only experience ✅ (this PR)
- Highmark Stadium (Orchard Park, NY) pilot data: official lots (2026 configuration as reported), ADA lots,
  RV and bus/limo lots, NFTA Game Day Express, rideshare zone, and private lots that have a public source.
  Facts sourced from official/media/third-party pages; anything not confirmed is labelled `low`/`unverified`.
- Venue directory (~30 major U.S. venues, `venue_only` coverage) with client-side search and filters.
- Venue page: interactive map, type filters, ranked lot list, priorities sheet, compare (up to 3), policies,
  getting-there/exit notes, predictions "coming soon", sources & confidence.
- Lot pages, state hub pages, methodology page.
- SEO: metadata, canonical URLs, sitemap, robots, JSON-LD.
- Unit tests for geo, ranking, confidence and moderation pre-checks.

## Phase 2 — Community data with moderation ✅ (MVP version in this PR)
- Submission form (price, review, lot info, correction, exit time), honeypot + rate limiting.
- Moderation queue UI at `/admin` (token-protected), approve/reject with notes.
- Approved reviews/prices rendered on lot pages as community-reported with derived confidence.
- **Next:** enable Upstash Redis in Vercel (free tier) so submissions persist; add moderator audit log.

## Phase 3 — Consumer experience upgrade ✅ (map-first explorer)
- Map is the primary interface: full-height map with floating event / direction / filter controls.
- Draggable bottom sheet (peek · half · full; keyboard and tap accessible) becomes a side panel on desktop.
- Two-way selection: tapping a pin highlights and scrolls to its card; selecting a card highlights and centres its pin.
- Event selection from sourced schedule data (lot opening time derived from the official 4-hour rule).
- Direction-of-travel preference scored against each lot's post-game exit corridor (low-confidence inference, labelled).
- Compact cards: price, walk, tailgating, exit and a recommendation tier; details expand on selection.
- Google/Apple Maps links only for exact pins or sourced street addresses.
- Evidence-only scoring: match score, data completeness and confidence are separate; missing data adds nothing.

## Phase 4 — Data hardening (next 2–4 weeks)
- On-site verification of all pilot lots during remaining 2026 home games; upgrade confidence to `verified`
  with `lastVerifiedAt`.
- Precise lot polygons/entrances (replace approximate pins), per-gate walking routes.
- Move seed data to Postgres + PostGIS (Neon/Supabase/Vercel Postgres) behind the existing repository
  interface; add admin editing of curated data with change history.
- Automated event schedule ingestion (today: hand-curated, sourced `EVENTS`), event-specific prices.
- Verify lot entrances so more lots get turn-by-turn directions.

## Phase 5 — Expansion (Buffalo region → nationwide)
- Buffalo region: KeyBank Center, Sahlen Field, Darien Lake. Then top 30 NFL stadiums, then NBA/NHL arenas,
  MLB ballparks and major amphitheaters.
- Contributor playbook + bulk import tooling for curated lot data; dedupe and geocoding pipeline.
- Search moves to Postgres trigram/FTS or a hosted index once the venue count exceeds a few thousand.

## Phase 6 — Monetization
- Referral partnerships (booking links via `/go/[lot]` click-tracking redirect, `rel="sponsored"`).
- Labelled venue sponsorships via `SponsoredSlot`; operator "claimed listing" (never affects rank).
- Data services: API keys, quotas and paid tiers on `/api/v1`, aggregated price-trend reports.

## Phase 7 — Predictive arrival & exit times
- Collect exit-time reports (already supported) and field observations → `TravelObservation`.
- Integrate a traffic data provider (paid service decision) and weather.
- Batch model producing per-lot exit-time distributions by event type; served through the existing
  `ArrivalExitPredictor` interface with confidence and model version, shown only when backtests pass.

## Definition of done for each phase
- `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` pass.
- Lighthouse mobile performance ≥ 90 on venue pages; no layout shift from the map.
- No fact rendered without a confidence badge and a source.
