# LotLizard — Product Requirements Document

_Status: v0.1 (pilot) · Owner: LotLizard founding team · Last updated: 2026-10-29_

## 1. Vision

LotLizard is an independent, nationwide parking and event-day intelligence platform. The goal is to be the
definitive place to compare parking at every major stadium, arena, amphitheater, concert venue and
entertainment destination in the United States, and to answer the question fans actually ask: **"Where should
I park for this event, given what I care about?"**

LotLizard is **independent**: it is not affiliated with any team, league, venue or parking operator. Its
long-term moat is **trustworthy data** — every fact is attributed to a source and carries a confidence level.

## 2. Problem

- Parking information is fragmented across team sites, ticketing apps, operator sites, Reddit threads and
  word of mouth. It's often stale, contradictory or missing for private and independent lots.
- Official pages describe official lots only; the dozens of private lots, front-yard lots and garages that
  fans actually use are invisible.
- Fans optimize for different things (price, walking distance, tailgating culture, getting out fast), but no
  tool ranks options by personal preference.
- Nobody tells you how confident they are. A price from a 2019 forum post looks identical to an operator's
  published rate.

## 3. Target users

| Persona | Need | Key features |
| --- | --- | --- |
| **Season-ticket tailgater** | Best tailgate atmosphere at a fair price, RV/space rules | Tailgate scores, rules, community reviews |
| **Visiting fan / first-timer** | Simple, safe, close option; know if pre-pay is required | Map, walk times, official vs private labeling, policies |
| **Families / accessibility** | ADA parking, short walk, restrooms | Amenity filters, ADA info, walk estimates |
| **Get-out-fast commuter** | Lowest exit time back to highway | Exit convenience ranking, exit-route notes, future exit predictions |
| **Lot operators (future B2B)** | Visibility, accurate listings, bookings | Claimed listings, referral bookings |
| **Data buyers (future B2B)** | Pricing/demand data across venues | Data API, aggregated reports |

## 4. Core principles

1. **Never present fabricated parking information as verified.** Every displayed fact carries a source and a
   confidence level (`verified`, `high`, `medium`, `low`, `unverified`). Editorial placeholders and estimates
   are labelled as such in the UI, in the API and in structured data.
2. **Mobile-first.** Most usage happens in a car or a parking lot on game day, on a phone, often on poor
   connectivity. Pages must be fast, readable in sunlight, and usable one-handed.
3. **Independent rankings.** Sponsorships and referral partnerships never change ranking order. Sponsored
   placements are always visibly labelled.
4. **SEO-first information architecture.** Every venue, lot and state has a stable, crawlable, pre-rendered
   URL with descriptive metadata.
5. **Nationwide data model from day one**, even though the pilot is a single venue.

## 5. Scope — MVP (pilot: Buffalo Bills, Highmark Stadium, Orchard Park, NY)

### 5.1 Venue directory (Feature 1)
- Searchable directory of major U.S. venues (stadiums, arenas, amphitheaters, ballparks, speedways).
- Search by venue name, team, city or state; filter by venue type and state.
- SEO pages: `/venues`, `/venues/[venue]`, `/venues/[venue]/parking/[lot]`, `/states/[state]`.
- Each venue shows its **coverage level**: `pilot_detailed` (full lot data), `basic`, or `venue_only`
  (no parking data yet — invite contributions). We never pad thin pages with invented lots.

### 5.2 Interactive map (Feature 2)
- Map of the venue with markers for official lots, private lots, garages, independent/residential lots,
  shuttles, rideshare and ADA zones, color-coded by type, with a legend.
- Tap a marker to see a lot summary; filter chips by type sync with the list.
- Location precision is labelled (`exact` vs `approximate`).

### 5.3 Parking comparison (Feature 3)
- Lot cards show price (with confidence), estimated walk distance/time, amenities, tailgating atmosphere,
  exit convenience and pre-pay requirement.
- Select up to 3 lots for a side-by-side compare view.

### 5.4 Personalized rankings (Feature 4)
- User sets priorities (cost, walking distance, tailgating, exit convenience) on simple sliders plus hard
  filters (must allow tailgating, vehicle type, max price).
- Ranking is transparent: each lot shows its per-factor breakdown and a data-completeness indicator. Missing
  data is scored neutrally and flagged, never silently treated as good.
- Preferences persist locally on the device (no account needed).

### 5.5 Community contributions with moderation (Feature 5)
- Anyone can submit: a price paid, a review (overall/tailgate/exit ratings), new lot information, a
  correction, or an exit-time report (seeds future predictions).
- All submissions enter a **pending** moderation queue. Automated pre-checks flag outliers (e.g., price far
  from known range), links and spam patterns. Moderators approve/reject with notes.
- Approved community data is displayed as **community-reported** with confidence derived from corroboration
  (one report → `low`; several consistent recent reports → `medium`).

### 5.6 Prediction-ready architecture (Feature 6)
- Data model includes events, historical arrival/exit observations and a predictor interface.
- MVP ships a predictor that explicitly returns "not available yet" — the UI shows a "coming soon" state, not
  a made-up number. Exit-time reports are collected now to train future models.

### 5.7 Attribution and confidence (Feature 7)
- Global source registry. Every fact references source IDs, retrieval date and confidence.
- Per-venue "Sources & confidence" section and a public methodology page (`/about/data`).
- Structured data (JSON-LD) includes only non-price facts and never marks estimates as verified.

### 5.8 Monetization-ready (not activated in MVP)
- **Parking referrals:** lots can carry a booking link with partner + `isAffiliate` flag; links render with
  `rel="sponsored"` and a disclosure.
- **Sponsorships:** typed sponsorship placements (venue page, directory) always labelled "Sponsored".
- **Data services:** versioned public JSON API (`/api/v1/...`) that includes attribution, ready for keys and
  rate tiers later.

## 6. Out of scope for MVP
User accounts, payments/bookings checkout, native apps, live occupancy, real traffic feeds, ML predictions,
operator self-serve portal, multi-language.

## 7. Success metrics

| Metric | Pilot target (first full season) |
| --- | --- |
| Organic search sessions to Highmark pages | Top-3 ranking for "Bills parking" long-tail queries |
| Mobile Largest Contentful Paint (p75) | < 2.0 s |
| Lots with ≥ `medium` confidence price | ≥ 60% of pilot lots |
| Community submissions / home game | ≥ 50, with < 10% rejected as spam |
| Ranking interaction rate (preferences changed) | ≥ 25% of venue-page visitors |
| Referral click-through (when activated) | ≥ 5% of venue-page visitors |

## 8. Risks & mitigations

| Risk | Mitigation |
| --- | --- |
| Inaccurate data damages trust | Confidence labels everywhere, moderation, source registry, visible "last verified" dates |
| Venue stadium transitions (e.g., new Highmark Stadium in 2026) make data stale | Seasons on price observations, `lastVerifiedAt`, editorial review before each season |
| Spam/abuse of submissions | Moderation queue, honeypot, rate limiting, outlier flags |
| Map tile usage limits | Tile URL is configurable; move to a commercial/self-hosted tile provider before scale |
| Trademark/affiliation confusion | Independent disclaimer site-wide; no team logos |

## 9. Open questions (business decisions, deferred)
- Which referral partner(s) to integrate (e.g., ParkWhiz/SpotHero affiliate programs) and the revenue share.
- Database / map tile provider selection when moving beyond free tiers.
- Whether operators can pay for "claimed listing" enhancements (must not affect ranking).
