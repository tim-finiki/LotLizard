# Parking inventory pipeline

How venue and parking-lot data gets into LotLizard without hand-editing TypeScript seed files.

```
facts CSV / JSON  ──►  npm run inventory -- import <file>  ──►  src/data/inventory/<venue>.json  ──►  site, API, sitemap
                         (parse → validate → dedupe → merge,                (normalized, reviewed in PRs)
                          old values kept as dated history)
```

- `src/data/inventory/<venue-slug>.json` is the reviewed source of truth for every imported venue. One file per venue keeps PR diffs readable.
- `npm run inventory -- import <file.csv|file.json>` merges new facts into those files. It never deletes a fact; a replaced value moves to that fact's `history` with the date and reason.
- `npm run inventory -- validate` checks every file. The same checks run in `npm test`, so bad data cannot ship.
- `npm run inventory -- report` prints counts by confidence and indexability, plus stale prices.

## Facts CSV (long format: one row per fact)

| column | required | meaning |
|---|---|---|
| `venue_slug` | yes | e.g. `acrisure-stadium`. Must match an existing venue, or the rows must create it (`venue_name`, `city`, `state`, `lat`, `lng`, `venue_type`). |
| `lot_slug` | for lot facts | e.g. `gold-lot`. Empty for venue-level facts. |
| `field` | yes | See the field list below. |
| `value` | yes | Format depends on the field. |
| `source_url` | yes* | Where the fact comes from. *Not needed for `field` method rows (see `source_method`). |
| `source_name` | yes | e.g. "Pittsburgh Steelers — Parking". |
| `source_type` | yes | `official` `operator` `media` `third_party` `lotlizard_field` `editorial_estimate` |
| `source_method` | yes | `page_review` (someone read the page), `search_snippet` (seen in a search result only), `field` (LotLizard on site), `operator_update` (operator-supplied, pending confirmation) |
| `observed_at` | yes | YYYY-MM-DD the source said this (or it was observed). |
| `confidence` | yes | `verified` `high` `medium` `low` `unverified`, capped by the rules below. |
| `evidence` | recommended | Verbatim quote supporting the value. Required for `search_snippet`. |
| `notes` | no | Shown to users next to the fact. |
| `reason` | no | Why this row replaces an earlier value (corrections). |

### Fields

**Venue level** (`lot_slug` empty):
- identity: `venue_name`, `venue_type`, `teams` (`;`-separated), `street`, `city`, `state`, `postal_code`, `lat`, `lng`, `timezone`, `summary`;
- `lot_open_hours_before` (number);
- `policy`: `Title: body`. Each distinct title is its own policy.
- `transit`: `Name: description`.

**Lot level:**

| field | value |
|---|---|
| `name` | Display name |
| `type` | `official_lot` `private_lot` `garage` `independent` `residential` `shuttle` `rideshare_zone` `ada` |
| `operator` | Operator name |
| `address` | Street address as published |
| `aliases` | `;`-separated |
| `description` | One or two factual sentences |
| `location` | `lat,lng,exact` or `lat,lng,approximate`. Exact requires a surveyed or operator/official coordinate. |
| `walk_minutes` | Number, as published |
| `price` | `min=40;max=60;vehicle=car;scope=lot;event=nfl_regular;season=2026` (`scope=area` for ranges not specific to this lot) |
| `payment_timing` | `pay_on_arrival` `advance_optional` `prepay_required` |
| `payment_accepted` / `payment_not_accepted` | `;`-separated: `cash` `card` `venmo` `paypal` `zelle` `mobile_wallet` `other` |
| `tailgating` | `yes` `no` |
| `tailgating_notes` | Rules as published |
| `ada` `covered` `ev_charging` `restrooms` | `available` or `unavailable` (omit the row when unknown) |
| `vehicle_types` | `;`-separated: `car` `rv` `bus` `limo` `motorcycle` |
| `amenities` | `;`-separated: `lighting` `paved` `grass` `security` `shuttle_service` `food_vendors` `rv_friendly` `tailgate_area` |

Anything without a row is **unknown**, and the site says so. Never add a row to fill a gap.

## Confidence rules (enforced by the validator)

| Situation | Highest allowed confidence |
|---|---|
| `verified` | Only with `source_method=field` and `source_type=lotlizard_field` |
| `search_snippet` method | `medium` (direct page review pending) |
| `media` or `third_party` source | `medium` |
| `operator_update` | `high` until LotLizard confirms it in the field |
| `editorial_estimate` | `low` |
| `location` with `exact` precision | requires `field`, `operator_update`, or an `official`/`operator` source |

Validation also fails on:
- unknown fields, bad enum values, malformed numbers and dates, or future dates;
- duplicate lot slugs, duplicate lot names, or two lots at the same address within one venue;
- lots placed more than 8 km from their venue (shuttle lots: 40 km);
- a venue whose coordinates are outside the US, or whose state code isn't a US state;
- `price` with `min > max`, prices above $500 or below $0.

## Indexing

Importing data never makes a page indexable by itself. A venue is indexed only when it has at least **3 substantive parking options**. A substantive option has a non-editorial source and at least two known decision facts among location or address, price, payment (timing or methods), tailgating and walking time. Everything else stays reachable but `noindex`, and out of the sitemap (`src/lib/seo.ts`).

## Venue pages without map pins

Most imported lots have no trusted coordinates. A venue with fewer than three mapped lots gets a list-first page (every option with its facts and sources) instead of the map explorer, so nothing is ever pinned on a guess. Adding `location` rows later switches the page to the map automatically.

A blank `docs/templates/facts.csv` has the header row.

## Workflows

- **New venue:** add rows (venue identity plus at least three sourced lots), `import`, review the JSON diff, open a PR.
- **Price check:** add `price` rows with today's `observed_at`. The older price moves to history. `report` lists prices older than 180 days, and prices older than two years are kept in history but no longer published or ranked.
- **Exact entrance:** a LotLizard field visit adds a `location` row (`lat,lng,exact`, `source_type=lotlizard_field`, `source_method=field`, `confidence=verified`). This enables directions to the pin and `geo` in structured data.
- **Correction:** add the corrected row with a `reason`. The previous value and its sources stay in history.
- **Operator update:** rows with `source_type=operator`, `source_method=operator_update`, capped at `high`. They become `verified` only after a field check. Nothing is published without review: the import produces a diff that goes through a PR.
