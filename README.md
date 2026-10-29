# LotLizard

Independent, nationwide parking and event-day intelligence. Compare official lots, private lots, garages,
shuttles and rideshare at stadiums, arenas and concert venues. Rank them by price, walking distance,
tailgating and exit, and see the source and confidence level behind every fact.

**Pilot:** Highmark Stadium (Buffalo Bills), Orchard Park, NY.

- Product requirements: [`docs/PRD.md`](docs/PRD.md)
- Technical architecture: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- Phased MVP plan: [`docs/MVP_PLAN.md`](docs/MVP_PLAN.md)

## Stack

Next.js 16 (App Router, Cache Components/PPR) · React 19 · TypeScript · Tailwind CSS v4 · Leaflet ·
zod · Vitest. Built to deploy on Vercel.

## Getting started

```bash
npm install
cp .env.example .env.local   # set ADMIN_TOKEN to use /admin
npm run dev                  # http://localhost:3000
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generate route types, then `tsc --noEmit` |
| `npm test` | Vitest unit tests (ranking, geo, confidence, moderation, data integrity) |
| `npm run check` | Lint, typecheck and test |

## Project layout

```
src/
  app/                     Routes (pages, API route handlers, sitemap, robots)
    venues/[venue]/        Venue guide: map, rankings, compare, policies, sources
      parking/[lot]/       Lot detail + community reports (streamed)
    states/[state]/        State hub pages (SEO)
    submit/  admin/        Community submissions + moderation queue
    api/submissions        POST submissions (validated, rate-limited, honeypot)
    api/admin/submissions  Moderation API (Bearer ADMIN_TOKEN)
    api/v1/venues          Public read API with attribution
  components/              UI (VenueExplorer, VenueMap, ConfidenceBadge, ...)
  lib/
    types.ts               Domain model — every fact is Attributed
    data/                  Source registry, seed venues/facilities, repository
    ranking.ts geo.ts confidence.ts search.ts seo.ts
    submissions/           Schema, pre-moderation checks, store adapters
    predictions/           Arrival/exit predictor interface (MVP: "unavailable")
```

## Data honesty

Every price, rule and rating carries an `Attribution` with source IDs and a confidence level
(`verified` › `high` › `medium` › `low` › `unverified`). The pilot data comes from public official, media
and third-party sources, which are listed on each page. Nothing is marked `verified` yet, because no facts
have been checked in the field. Map pins are approximate editorial placements, and lots with no locating
source are listed but not mapped. Unit tests enforce some of these rules.

## Deploying to Vercel

1. Import the GitHub repo in Vercel. The framework is detected automatically, so no build settings are needed.
2. Set the environment variables listed in `.env.example`. At minimum, set `ADMIN_TOKEN`. For
   submissions that survive redeploys, also set the Upstash variables (free tier).
3. Deploy. Pull requests get Preview Deployments automatically.

Before you scale traffic, move map tiles off the public OpenStreetMap servers to a tile provider or a
self-hosted tile server. Change the tiles with `NEXT_PUBLIC_MAP_TILE_URL`.
