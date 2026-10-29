import { describe, expect, it } from "vitest";
import { checkRows, mergeRows, parseCsv, rowsFromFile, sourceId, type FactRow } from "@/lib/inventory/import";
import { validateCatalog, validateInventory } from "@/lib/inventory/validate";
import { inventoryFacilities, inventoryVenue } from "@/lib/inventory/to-domain";
import { INVENTORY } from "@/data/inventory";
import { VENUES as SEED_VENUES } from "@/lib/data/venues";
import { FACILITIES, SOURCES, VENUES } from "@/lib/data/catalog";
import { collectSourceIds } from "@/lib/data/repository";
import type { VenueInventory } from "@/lib/inventory/schema";

const NOW = "2026-10-29";
const OFFICIAL = { source_url: "https://team.example/parking", source_name: "Team — Parking", source_type: "official", source_method: "page_review" };

function row(over: Partial<FactRow> & Pick<FactRow, "field" | "value">): FactRow {
  return { venue_slug: "test-stadium", lot_slug: "lot-a", ...OFFICIAL, observed_at: "2026-09-01", confidence: "medium", ...over };
}

const venueRows: FactRow[] = [
  row({ lot_slug: "", field: "venue_name", value: "Test Stadium" }),
  row({ lot_slug: "", field: "venue_type", value: "stadium" }),
  row({ lot_slug: "", field: "city", value: "Testville" }),
  row({ lot_slug: "", field: "state", value: "PA" }),
  row({ lot_slug: "", field: "lat", value: "40.0" }),
  row({ lot_slug: "", field: "lng", value: "-75.0" }),
];
const lotRows = (slug: string, name: string): FactRow[] => [
  row({ lot_slug: slug, field: "name", value: name }),
  row({ lot_slug: slug, field: "type", value: "official_lot" }),
];

function build(rows: FactRow[], existing: Record<string, VenueInventory> = {}) {
  return mergeRows(existing, rows, NOW)["test-stadium"];
}

describe("parseCsv", () => {
  it("handles quotes, escaped quotes, commas, newlines and CRLF", () => {
    const csv = 'a,b,c\r\n1,"x, ""y""",3\r\n"multi\nline",,\n';
    expect(parseCsv(csv)).toEqual([
      { a: "1", b: 'x, "y"', c: "3" },
      { a: "multi\nline", b: "", c: "" },
    ]);
  });

  it("rejects unterminated quotes and over-long rows", () => {
    expect(() => parseCsv('a\n"open')).toThrow(/quoted/);
    expect(() => parseCsv("a,b\n1,2,3")).toThrow(/3 fields/);
  });

  it("reads JSON arrays with the same keys", () => {
    expect(rowsFromFile("x.json", JSON.stringify([{ venue_slug: "v", field: "name" }]))[0].venue_slug).toBe("v");
  });
});

describe("checkRows: confidence caps and value rules", () => {
  const msgs = (r: FactRow) => checkRows([r], NOW).map((i) => i.message).join("\n");

  it("caps search snippets, media and editorial estimates", () => {
    expect(msgs(row({ field: "name", value: "Lot A", source_method: "search_snippet", evidence: "Lot A", confidence: "high" }))).toMatch(/exceeds the cap "medium"/);
    expect(msgs(row({ field: "name", value: "Lot A", source_type: "media", confidence: "high" }))).toMatch(/cap "medium"/);
    expect(msgs(row({ field: "name", value: "Lot A", source_type: "editorial_estimate", confidence: "medium" }))).toMatch(/cap "low"/);
  });

  it("only allows 'verified' from a LotLizard field visit", () => {
    expect(msgs(row({ field: "name", value: "Lot A", confidence: "verified" }))).toMatch(/cap "high"/);
    expect(msgs(row({ field: "name", value: "Lot A", confidence: "verified", source_type: "lotlizard_field", source_method: "field", source_url: "" }))).toBe("");
  });

  it("requires an official, operator or field source for exact coordinates", () => {
    expect(msgs(row({ field: "location", value: "40.001,-75.001,exact", source_type: "media" }))).toMatch(/exact locations/);
    expect(msgs(row({ field: "location", value: "40.001,-75.001,exact" }))).toBe("");
    expect(msgs(row({ field: "location", value: "40.001,-75.001,approximate", source_type: "third_party", confidence: "low" }))).toBe("");
  });

  it("rejects bad values, unknown fields, future dates and snippet rows without evidence", () => {
    expect(msgs(row({ field: "price", value: "min=60;max=40" }))).toMatch(/above max/);
    expect(msgs(row({ field: "price", value: "min=40;max=900" }))).toMatch(/between 0 and 500/);
    expect(msgs(row({ field: "tailgating", value: "maybe" }))).toMatch(/tailgating must be/);
    expect(msgs(row({ field: "rating", value: "5" }))).toMatch(/not a lot field/);
    expect(msgs(row({ field: "name", value: "Lot A", observed_at: "2027-01-01" }))).toMatch(/future/);
    expect(msgs(row({ field: "name", value: "Lot A", source_method: "search_snippet" }))).toMatch(/evidence/);
    expect(msgs(row({ lot_slug: "", field: "state", value: "XX" }))).toMatch(/US state/);
  });
});

describe("mergeRows", () => {
  it("creates facts with their own sources and dates", () => {
    const { inventory, changes } = build([...venueRows, ...lotRows("lot-a", "Lot A"), row({ field: "price", value: "min=40;max=40;event=nfl_regular" })]);
    expect(changes.length).toBeGreaterThan(0);
    const price = Object.values(inventory.lots["lot-a"].prices)[0];
    expect(price).toMatchObject({ value: "min=40;max=40;event=nfl_regular", observedAt: "2026-09-01", confidence: "medium", sources: [sourceId(OFFICIAL)] });
  });

  it("combines sources when a second source reports the same value", () => {
    const second = { source_url: "https://news.example/a", source_name: "News", source_type: "media" };
    const first = build([...venueRows, ...lotRows("lot-a", "Lot A")]).inventory;
    const merged = build([row({ field: "name", value: "Lot A", ...second, confidence: "low", observed_at: "2026-10-01" })], { "test-stadium": first }).inventory;
    expect(merged.lots["lot-a"].fields.name.sources).toHaveLength(2);
    expect(merged.lots["lot-a"].fields.name.confidence).toBe("medium");
    expect(merged.lots["lot-a"].fields.name.observedAt).toBe("2026-10-01");
  });

  it("replaces with a newer value and keeps the old one in dated history", () => {
    const first = build([...venueRows, ...lotRows("lot-a", "Lot A"), row({ field: "price", value: "min=40;max=40" })]).inventory;
    const { inventory, changes } = build([row({ field: "price", value: "min=45;max=45", observed_at: "2026-10-20", reason: "2026 rate increase" })], { "test-stadium": first });
    const fact = Object.values(inventory.lots["lot-a"].prices)[0];
    expect(fact.value).toBe("min=45;max=45");
    expect(fact.history).toEqual([expect.objectContaining({ value: "min=40;max=40", replacedAt: NOW })]);
    expect(changes.join()).toMatch(/2026 rate increase/);
  });

  it("never lets an older observation overwrite a newer one", () => {
    const first = build([...venueRows, ...lotRows("lot-a", "Lot A"), row({ field: "tailgating", value: "yes", observed_at: "2026-10-01" })]).inventory;
    const { inventory, warnings } = build([row({ field: "tailgating", value: "no", observed_at: "2024-01-01" })], { "test-stadium": first });
    expect(inventory.lots["lot-a"].fields.tailgating.value).toBe("yes");
    expect(inventory.lots["lot-a"].fields.tailgating.history?.[0].value).toBe("no");
    expect(warnings).toHaveLength(1);
  });

  it("refuses the whole batch when any row is invalid", () => {
    expect(() => build([...venueRows, row({ field: "tailgating", value: "maybe" })])).toThrow(/row 8/);
  });
});

describe("validateInventory", () => {
  it("accepts a well-formed venue", () => {
    expect(validateInventory(build([...venueRows, ...lotRows("lot-a", "Lot A")]).inventory, undefined, NOW)).toEqual([]);
  });

  it("flags duplicate lots by name and by address", () => {
    const inv = build([
      ...venueRows,
      ...lotRows("lot-a", "Lot A"),
      ...lotRows("a-lot", "The A Lot"),
      ...lotRows("garage-1", "Garage One"),
      ...lotRows("garage-2", "Garage Two"),
      row({ lot_slug: "garage-1", field: "address", value: "100 Main Street" }),
      row({ lot_slug: "garage-2", field: "address", value: "100 Main St." }),
    ]).inventory;
    const errors = validateInventory(inv, undefined, NOW).join("\n");
    expect(errors).toMatch(/a-lot: duplicate of lot "lot-a" \(same name\)/);
    expect(errors).toMatch(/garage-2: duplicate of lot "garage-1" \(same address\)/);
  });

  it("flags lots placed implausibly far from the venue", () => {
    const inv = build([...venueRows, ...lotRows("lot-a", "Lot A"), row({ field: "location", value: "40.5,-75.0,approximate", source_type: "third_party", confidence: "low" })]).inventory;
    expect(validateInventory(inv, undefined, NOW).join()).toMatch(/km from the venue/);
  });

  it("flags facts that cite missing sources or exceed their sources' cap", () => {
    const inv = structuredClone(build([...venueRows, ...lotRows("lot-a", "Lot A")]).inventory);
    inv.lots["lot-a"].fields.name.sources = ["nope"];
    inv.lots["lot-a"].fields.type.confidence = "verified";
    const errors = validateInventory(inv, undefined, NOW).join("\n");
    expect(errors).toMatch(/unknown source "nope"/);
    expect(errors).toMatch(/exceeds "high"/);
  });

  it("refuses a venue already listed under another slug", () => {
    const inv = build([...venueRows]).inventory;
    inv.venue.fields.venue_name.value = "Lambeau Field";
    expect(validateCatalog([inv], SEED_VENUES).join()).toMatch(/already listed as "lambeau-field"/);
  });
});

describe("to-domain conversion keeps unknowns unknown", () => {
  const inv = build([...venueRows, ...lotRows("lot-a", "Lot A"), row({ lot_slug: "zone", field: "name", value: "Rideshare zone" }), row({ lot_slug: "zone", field: "type", value: "rideshare_zone" })]).inventory;
  const [lot, zone] = inventoryFacilities(inv);

  it("does not invent payment, amenities, tailgating, prices or locations", () => {
    expect(lot.payment).toBeUndefined();
    expect(lot.features).toBeUndefined();
    expect(lot.tailgating.allowed.value).toBe("unknown");
    expect(lot.prices).toEqual([]);
    expect(lot.location).toBeUndefined();
    expect(lot.amenities.value).toEqual([]);
  });

  it("assumes only that parking lots take cars", () => {
    expect(lot.vehicleTypes).toEqual(["car"]);
    expect(zone.vehicleTypes).toEqual([]);
  });

  it("marks imported venues as basic coverage, never pilot", () => {
    expect(inventoryVenue(inv).coverage).toBe("basic");
  });
});

describe("committed inventory", () => {
  const seed = new Map(SEED_VENUES.map((v) => [v.slug, v]));

  it("every file passes validation", () => {
    for (const inv of INVENTORY) expect(validateInventory(inv, seed.get(inv.slug)), inv.slug).toEqual([]);
    expect(validateCatalog(INVENTORY, SEED_VENUES)).toEqual([]);
  });

  it("is represented as research, not field verification", () => {
    for (const inv of INVENTORY) {
      for (const lot of Object.values(inv.lots)) {
        for (const f of [...Object.values(lot.fields), ...Object.values(lot.prices)]) {
          expect(f.confidence).not.toBe("verified");
          if (f.method === "search_snippet") expect(["medium", "low", "unverified"]).toContain(f.confidence);
        }
      }
    }
  });

  it("the catalog has unique slugs and only registered sources", () => {
    expect(new Set(VENUES.map((v) => v.slug)).size).toBe(VENUES.length);
    const ids = new Set(SOURCES.map((s) => s.id));
    expect(ids.size).toBe(SOURCES.length);
    for (const v of VENUES) {
      const lots = FACILITIES.filter((f) => f.venueId === v.id);
      expect(new Set(lots.map((f) => f.slug)).size, v.slug).toBe(lots.length);
      for (const id of collectSourceIds(v, lots)) expect(ids, `${v.slug}: ${id}`).toContain(id);
    }
    for (const f of FACILITIES) expect(VENUES.some((v) => v.id === f.venueId)).toBe(true);
  });
});
