import { CONFIDENCE_RANK, venueInventorySchema, type Fact, type VenueInventory } from "@/lib/inventory/schema";
import { confidenceCap } from "@/lib/inventory/import";
import { readField, type FieldName } from "@/lib/inventory/values";
import { inventoryFacilities, inventoryVenue } from "@/lib/inventory/to-domain";
import { haversineMeters } from "@/lib/geo";
import type { Venue } from "@/lib/types";

/** Lots further than this from the venue are almost certainly misplaced (shuttle lots get more room). */
export const MAX_LOT_DISTANCE_M = 8_000;
export const MAX_SHUTTLE_DISTANCE_M = 40_000;

const normName = (s: string) =>
  s
    .toLowerCase()
    .replace(/\b(the|lot|lots|parking|garage|area)\b/g, "")
    .replace(/[^a-z0-9]/g, "");

const normAddress = (s: string) => s.toLowerCase().replace(/\b(street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr)\b\.?/g, "").replace(/[^a-z0-9]/g, "");

/**
 * Every check a normalized inventory file must pass before it can ship. Returns problems as strings
 * (empty = valid). `base` is the directory venue with the same slug, if any.
 */
export function validateInventory(raw: unknown, base?: Venue, now = new Date().toISOString().slice(0, 10)): string[] {
  const parsed = venueInventorySchema.safeParse(raw);
  if (!parsed.success) return parsed.error.issues.map((i) => `schema: ${i.path.join(".")}: ${i.message}`);
  const inv: VenueInventory = parsed.data;
  const errors: string[] = [];
  const at = (where: string, msg: string) => errors.push(`${inv.slug}${where ? `/${where}` : ""}: ${msg}`);

  const checkFact = (where: string, field: FieldName, f: Fact) => {
    for (const sid of f.sources) if (!inv.sources[sid]) at(where, `${field} cites unknown source "${sid}"`);
    const sources = f.sources.map((s) => inv.sources[s]).filter(Boolean);
    // The cap comes from the strongest source behind the fact.
    const cap = sources.reduce<keyof typeof CONFIDENCE_RANK>((best, s) => {
      const c = confidenceCap(s.type, f.method === "field" ? "field" : s.method);
      return CONFIDENCE_RANK[c] > CONFIDENCE_RANK[best] ? c : best;
    }, "unverified");
    if (CONFIDENCE_RANK[f.confidence] > CONFIDENCE_RANK[cap]) at(where, `${field} confidence "${f.confidence}" exceeds "${cap}" allowed by its sources`);
    if (f.confidence === "verified" && !f.verifiedAt) at(where, `${field} is "verified" without a verifiedAt date`);
    if (f.observedAt > now) at(where, `${field} observedAt ${f.observedAt} is in the future`);
    if (f.method === "search_snippet" && !f.evidence) at(where, `${field} from a search snippet has no evidence quote`);
    try {
      const v = readField(field, f.value);
      if (field === "location" && (v as { precision: string }).precision === "exact") {
        const ok = f.method === "field" || f.method === "operator_update" || sources.some((s) => s.type === "official" || s.type === "operator");
        if (!ok) at(where, "exact location without a field, operator or official source");
      }
    } catch (e) {
      at(where, `${field}: ${(e as Error).message}`);
    }
  };

  for (const [field, f] of Object.entries(inv.venue.fields)) checkFact("", field as FieldName, f);
  for (const f of Object.values(inv.venue.policy)) checkFact("", "policy", f);
  for (const f of Object.values(inv.venue.transit)) checkFact("", "transit", f);

  let venue: Venue;
  try {
    venue = inventoryVenue(inv, base);
  } catch (e) {
    return [...errors, (e as Error).message];
  }

  const names = new Map<string, string>();
  const addresses = new Map<string, string>();
  for (const [slug, lot] of Object.entries(inv.lots)) {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) at(slug, "bad lot slug");
    for (const [field, f] of Object.entries(lot.fields)) checkFact(slug, field as FieldName, f);
    for (const f of Object.values(lot.prices)) checkFact(slug, "price", f);
    if (!lot.fields.name) at(slug, "missing name");
    if (!lot.fields.type) at(slug, "missing type");
    if (lot.fields.name?.method === "search_snippet" && lot.fields.name.confidence === "verified") at(slug, "a search result cannot verify a lot");

    const n = lot.fields.name ? normName(lot.fields.name.value) : "";
    if (n && names.has(n)) at(slug, `duplicate of lot "${names.get(n)}" (same name)`);
    else if (n) names.set(n, slug);
    const a = lot.fields.address ? normAddress(lot.fields.address.value) : "";
    if (a && addresses.has(a)) at(slug, `duplicate of lot "${addresses.get(a)}" (same address)`);
    else if (a) addresses.set(a, slug);

    // Entrance coordinates are navigated to only once verified, so "verified" must mean LotLizard checked
    // it on site (or confirmed an operator's pin), and can never rest on geocoded coordinates.
    const ev = lot.fields.entrance_verification;
    if (ev?.value === "verified") {
      if (ev.method !== "field" || !ev.verifiedAt) at(slug, 'entrance_verification "verified" needs a field verification with verifiedAt');
      if (lot.fields.entrance_location?.value.trim().endsWith("geocoded")) at(slug, "a geocoded entrance location cannot be verified");
    }

    if (lot.fields.location) {
      try {
        const loc = readField("location", lot.fields.location.value);
        const type = lot.fields.type ? lot.fields.type.value : "";
        const max = type === "shuttle" ? MAX_SHUTTLE_DISTANCE_M : MAX_LOT_DISTANCE_M;
        const d = haversineMeters(loc, venue.location);
        if (d > max) at(slug, `location is ${(d / 1000).toFixed(1)} km from the venue (max ${max / 1000} km)`);
      } catch {
        /* reported by checkFact */
      }
    }
  }

  try {
    inventoryFacilities(inv);
  } catch (e) {
    errors.push((e as Error).message);
  }
  return errors;
}

/** Cross-file checks: one file per slug, no venue listed twice under different slugs. */
export function validateCatalog(inventories: VenueInventory[], directory: Venue[]): string[] {
  const errors: string[] = [];
  const slugs = new Set<string>();
  for (const inv of inventories) {
    if (slugs.has(inv.slug)) errors.push(`${inv.slug}: more than one inventory file`);
    slugs.add(inv.slug);
    const name = inv.venue.fields.venue_name?.value;
    if (name) {
      const clash = directory.find((v) => v.slug !== inv.slug && normName(v.name) === normName(name));
      if (clash) errors.push(`${inv.slug}: "${name}" is already listed as "${clash.slug}"; use that slug`);
    }
  }
  return errors;
}
