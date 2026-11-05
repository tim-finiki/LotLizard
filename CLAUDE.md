@AGENTS.md

# LotLizard: instructions for Claude Code

The line above imports `AGENTS.md`, which `next dev` writes and re-adds (Next.js 16 agent rules). Keep that import, and don't hand-edit `AGENTS.md`.

LotLizard is an independent parking and event-day guide for stadiums and arenas (pilot: Highmark Stadium). It is a **public repository**: keep proprietary research, strategy, revenue plans and credentials out of it. Start with `README.md`; detail is in `docs/`.

## Hard rules

1. **Data honesty.** Every price, rule and rating carries an `Attribution` with source IDs and a confidence level (`verified` › `high` › `medium` › `low` › `unverified`). Never invent a fact, never upgrade confidence without evidence, and never mark anything `verified` without a field check. Unknown stays unknown: it is neutral in ranking, never treated as "no".
2. **Inventory data goes through the pipeline.** Venue and lot facts are imported with `npm run inventory -- import <file>` into `src/data/inventory/<venue>.json` (see `docs/DATA_PIPELINE.md`). Replaced values move to dated history; nothing is silently deleted.
3. **Community submissions stay off** unless every requirement in `README.md` is configured (`SUBMISSIONS_ENABLED`, Upstash, a 32+ character `ADMIN_TOKEN`). Don't weaken those gates.
4. **Secrets.** Never commit, print or log `ADMIN_TOKEN`, Upstash credentials or any other secret; nothing secret gets a `NEXT_PUBLIC_` prefix.
5. **Isolation.** LotLizard shares no database, credentials or env vars with FullSize, BestCardsForMe/MoneyFactor or other projects.
6. **Stop and ask Tim** in the issue before production data or environment changes, paid services, enabling submissions, or changing the production domain.

## How work arrives and is reported

- Tasks arrive as **GitHub issues** in this repo. ChatGPT creates and updates issues directly through its GitHub integration (or Tim asks Claude to file one); the issue is the source of truth, not a chat transcript.
- Work on a branch and open a **pull request** that says `Closes #N`, with what changed, how it was verified, and what was deliberately not changed. Every PR gets a Vercel preview; the preview smoke test runs against it.
- Post a short result comment on the issue: PR link, check results, anything blocked or needing Tim.
- Tim merges to `main` (production). Don't merge yourself unless the issue explicitly says so.

## Commands

```bash
npm ci
npm run check            # lint + typecheck + unit tests (run before every PR)
npm run dev              # http://localhost:3000 (submissions on, in-memory store)
npm run build
npm run inventory -- validate | report | import <file>
```

## Checks already in place

- `preview-smoke.yml`: on each PR, waits for the Vercel preview and runs a mobile smoke test.
- `production-check.yml`: daily, after each push to `main`, and on demand: robots.txt, sitemap, canonicals, noindex, JSON-LD on the live site.
- There is no GitHub Actions job running `npm run check` yet; run it yourself before opening a PR.

## Map

| Area | Where |
| --- | --- |
| Domain model (every fact `Attributed`) | `src/lib/types.ts` |
| Repository layer and seed data | `src/lib/data/` |
| Imported venue inventory | `src/data/inventory/`, `src/lib/inventory/`, `scripts/inventory.ts` |
| Ranking, filters, map markers | `src/lib/ranking.ts`, `src/lib/explorer.ts`, `src/lib/features.ts`, `src/lib/payment.ts` |
| Confidence rules | `src/lib/confidence.ts` |
| Submissions and moderation | `src/lib/submissions/`, `src/app/api/submissions`, `src/app/api/admin/submissions` |
| Public read API | `src/app/api/v1/venues` |
| SEO, metadata, JSON-LD | `src/lib/seo.ts` |
| Analytics events | `src/lib/analytics.ts`, `src/components/AnalyticsEvents.tsx` (see `docs/MEASUREMENT.md`) |

## Docs

`docs/PRD.md` · `docs/ARCHITECTURE.md` · `docs/MVP_PLAN.md` · `docs/DATA_PIPELINE.md` · `docs/MEASUREMENT.md` · `docs/SEO_AUDIT.md`
