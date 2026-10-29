import { z } from "zod";

/**
 * Normalized inventory format: one JSON file per venue under `src/data/inventory/`. Every value is a
 * Fact carrying its own sources, observation date, confidence and how it was collected, plus the
 * dated history of values it replaced. See docs/DATA_PIPELINE.md.
 */

export const CONFIDENCE = ["verified", "high", "medium", "low", "unverified"] as const;
export const SOURCE_TYPES = ["official", "operator", "media", "third_party", "lotlizard_field", "editorial_estimate"] as const;
export const METHODS = ["page_review", "search_snippet", "field", "operator_update"] as const;

export const VENUE_FIELDS = [
  "venue_name",
  "venue_type",
  "teams",
  "street",
  "city",
  "state",
  "postal_code",
  "lat",
  "lng",
  "timezone",
  "summary",
  "lot_open_hours_before",
] as const;
export const VENUE_LIST_FIELDS = ["policy", "transit"] as const;

export const LOT_FIELDS = [
  "name",
  "type",
  "operator",
  "address",
  "aliases",
  "description",
  "location",
  "walk_minutes",
  "payment_timing",
  "payment_accepted",
  "payment_not_accepted",
  "tailgating",
  "tailgating_notes",
  "ada",
  "covered",
  "ev_charging",
  "restrooms",
  "vehicle_types",
  "amenities",
] as const;

export type VenueField = (typeof VENUE_FIELDS)[number];
export type VenueListField = (typeof VENUE_LIST_FIELDS)[number];
export type LotField = (typeof LOT_FIELDS)[number];

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

const factMeta = {
  sources: z.array(z.string().min(1)).min(1),
  confidence: z.enum(CONFIDENCE),
  observedAt: isoDate,
  method: z.enum(METHODS),
  evidence: z.string().optional(),
  notes: z.string().optional(),
  /** Set when this value replaced an earlier one. */
  reason: z.string().optional(),
  /** LotLizard field-verification date (only with method "field"). */
  verifiedAt: isoDate.optional(),
};

export const historyEntrySchema = z.object({ value: z.string(), ...factMeta, replacedAt: isoDate });
export const factSchema = z.object({ value: z.string(), ...factMeta, history: z.array(historyEntrySchema).optional() });
export type Fact = z.infer<typeof factSchema>;
export type HistoryEntry = z.infer<typeof historyEntrySchema>;

export const sourceSchema = z.object({
  type: z.enum(SOURCE_TYPES),
  name: z.string().min(1),
  url: z.string().url().optional(),
  /** Latest date we looked at this source. */
  retrievedAt: isoDate,
  method: z.enum(METHODS),
});
export type InventorySource = z.infer<typeof sourceSchema>;

export const lotSchema = z.object({
  fields: z.record(z.string(), factSchema),
  /** Keyed by `vehicle|event|scope|season` so a newer observation replaces the older one. */
  prices: z.record(z.string(), factSchema).default({}),
});
export type InventoryLot = z.infer<typeof lotSchema>;

export const venueInventorySchema = z.object({
  version: z.literal(1),
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  venue: z.object({
    fields: z.record(z.string(), factSchema),
    /** Keyed by policy title / transit option name. */
    policy: z.record(z.string(), factSchema).default({}),
    transit: z.record(z.string(), factSchema).default({}),
  }),
  sources: z.record(z.string(), sourceSchema),
  lots: z.record(z.string(), lotSchema),
});
export type VenueInventory = z.infer<typeof venueInventorySchema>;

/** Confidence ranks, higher is stronger. */
export const CONFIDENCE_RANK: Record<(typeof CONFIDENCE)[number], number> = { unverified: 0, low: 1, medium: 2, high: 3, verified: 4 };
