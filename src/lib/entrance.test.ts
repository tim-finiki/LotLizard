import { describe, expect, it } from "vitest";
import type { VehicleEntrance } from "@/lib/types";
import { attr } from "@/lib/data/attr";
import { FACILITIES } from "@/lib/data/catalog";
import { directionsLinks, navigableEntrance } from "@/lib/directions";
import { submissionInputSchema } from "@/lib/submissions/schema";
import { preModerationFlags } from "@/lib/submissions/checks";
import { inventoryFacility } from "@/lib/inventory/to-domain";
import { validateInventory } from "@/lib/inventory/validate";
import type { VenueInventory } from "@/lib/inventory/schema";
import { approvedEntrance, prepareEntrance, triageEntrance, type Geocoder } from "@/lib/entrance";

const VENUE = { lat: 42.774, lng: -78.787 };
const DRIVEWAY = { lat: 42.7752, lng: -78.7871 };
/** ~30 m from the driveway. */
const NEARBY = { lat: 42.77545, lng: -78.7871 };
/** ~400 m away. */
const FAR = { lat: 42.7788, lng: -78.7871 };

const geocoder = (point: { lat: number; lng: number } | null, near = "1 Bills Dr"): Geocoder => ({
  geocode: async () => point,
  reverse: async () => near,
});

const entrance = (o: Partial<VehicleEntrance>): VehicleEntrance => ({ verification: "unverified", reportedAt: "2026-10-01", attribution: attr("medium", ["s"]), ...o });

describe("entrance reports: address, pin, or both", () => {
  it("accepts an address only, a pin only, or both, but not neither", () => {
    const base = { kind: "entrance", venueSlug: "v", facilitySlug: "lot", role: "community", observedDate: "2026-10-01" };
    expect(submissionInputSchema.safeParse({ ...base, address: "1 Bills Dr, Orchard Park, NY" }).success).toBe(true);
    expect(submissionInputSchema.safeParse({ ...base, pin: DRIVEWAY }).success).toBe(true);
    expect(submissionInputSchema.safeParse({ ...base, address: "1 Bills Dr, Orchard Park, NY", pin: DRIVEWAY, instructions: "Use the north gate." }).success).toBe(true);
    expect(submissionInputSchema.safeParse(base).success).toBe(false);
  });

  it("geocodes an address into an approximate suggestion only", async () => {
    const p = await prepareEntrance({ address: "1 Bills Dr" }, VENUE, geocoder(DRIVEWAY));
    expect(p.suggestedLocation).toEqual(DRIVEWAY);
    expect(p.pin).toBeUndefined();
    const published = approvedEntrance(p, "2026-10-02", attr("medium", ["s"]));
    expect(published.location?.method).toBe("geocoded");
    // Geocoded points are never navigated to, even once approved; the address is.
    expect(navigableEntrance(published)).toBeUndefined();
    expect(directionsLinks({ entrance: published })?.basis).toBe("entrance_address");
  });

  it("keeps a dropped pin exactly; reverse geocoding only adds context", async () => {
    const p = await prepareEntrance({ pin: DRIVEWAY }, VENUE, geocoder(null, "near 1 Bills Dr"));
    expect(p.pin).toEqual(DRIVEWAY);
    expect(p.nearestAddress).toBe("near 1 Bills Dr");
    const published = approvedEntrance(p, "2026-10-02", attr("high", ["s"]));
    expect(published.location).toEqual({ ...DRIVEWAY, method: "pin" });
  });

  it("keeps both and flags a significant discrepancy", async () => {
    const close = await prepareEntrance({ address: "1 Bills Dr", pin: DRIVEWAY }, VENUE, geocoder(NEARBY));
    expect(close.flags).toEqual([]);
    expect(close.addressPinDistanceM).toBeLessThan(50);
    const apart = await prepareEntrance({ address: "1 Bills Dr", pin: DRIVEWAY }, VENUE, geocoder(FAR));
    expect(apart.address).toBe("1 Bills Dr");
    expect(apart.pin).toEqual(DRIVEWAY);
    expect(apart.flags).toContain("address_pin_mismatch");
  });

  it("flags addresses that can't be found and reports far from the venue", async () => {
    expect((await prepareEntrance({ address: "nowhere" }, VENUE, geocoder(null))).flags).toContain("address_not_found");
    expect((await prepareEntrance({ pin: { lat: 42.9, lng: -78.87 } }, VENUE)).flags).toContain("far_from_venue");
  });
});

describe("exception-based review", () => {
  it("approves routine reports by rule", async () => {
    const p = await prepareEntrance({ pin: DRIVEWAY }, VENUE);
    expect(triageEntrance(p, { submitter: "verified_owner" }).decision).toBe("approve");
    expect(triageEntrance(p, { submitter: "community", otherPins: [NEARBY, DRIVEWAY] })).toEqual({ decision: "approve", reasons: ["corroborated_by_2"] });
  });

  it("sends exceptions to a person", async () => {
    const pin = await prepareEntrance({ pin: DRIVEWAY }, VENUE);
    expect(triageEntrance(pin, { submitter: "community" }).reasons).toEqual(["needs_corroboration"]);
    expect(triageEntrance(pin, { submitter: "community", otherPins: [NEARBY, FAR] }).decision).toBe("review");
    expect(triageEntrance(pin, { submitter: "unverified_owner" }).reasons).toContain("owner_not_verified");
    const addressOnly = await prepareEntrance({ address: "1 Bills Dr" }, VENUE, geocoder(DRIVEWAY));
    expect(triageEntrance(addressOnly, { submitter: "community", otherPins: [DRIVEWAY, DRIVEWAY] }).reasons).toEqual(["address_only_community_report"]);
    const mismatch = await prepareEntrance({ address: "1 Bills Dr", pin: DRIVEWAY }, VENUE, geocoder(FAR));
    expect(triageEntrance(mismatch, { submitter: "verified_owner" }).reasons).toContain("address_pin_mismatch");
  });

  it("never silently moves a verified entrance", async () => {
    const current = entrance({ location: { ...FAR, method: "pin" }, verification: "verified", verifiedAt: "2026-09-01" });
    const p = await prepareEntrance({ pin: DRIVEWAY }, VENUE);
    expect(triageEntrance(p, { submitter: "verified_owner", current }).reasons).toContain("moves_verified_entrance");
  });

  it("flags owner claims and address-only reports for moderators", () => {
    const flags = preModerationFlags({ kind: "entrance", venueSlug: "v", facilitySlug: "lot", role: "lot_owner", address: "1 Bills Dr", observedDate: "2026-10-01" });
    expect(flags).toEqual(expect.arrayContaining(["owner_claim_unverified", "address_only"]));
  });
});

describe("navigation", () => {
  const lot = { address: "4170 Abbott Rd, Orchard Park, NY 14127", location: { lat: 42.77, lng: -78.79, precision: "exact" as const } };

  it("uses verified entrance-pin coordinates first", () => {
    const d = directionsLinks({ ...lot, entrance: entrance({ address: "10 Gate Rd, Orchard Park, NY", location: { ...DRIVEWAY, method: "pin" }, verification: "verified" }) });
    expect(d?.basis).toBe("verified_entrance");
    expect(d?.google).toContain(`destination=${DRIVEWAY.lat},${DRIVEWAY.lng}`);
  });

  it("never navigates to unverified pins or geocoded points", () => {
    const unverified = entrance({ location: { ...DRIVEWAY, method: "pin" } });
    expect(directionsLinks({ ...lot, entrance: unverified })?.basis).toBe("exact_pin");
    const geocoded = entrance({ location: { ...DRIVEWAY, method: "geocoded" }, verification: "verified" });
    expect(navigableEntrance(geocoded)).toBeUndefined();
  });

  it("prefers the entrance address to the lot's own address, unless it's under review", () => {
    const e = entrance({ address: "10 Gate Rd, Orchard Park, NY" });
    expect(directionsLinks({ address: lot.address, entrance: e })).toMatchObject({ basis: "entrance_address" });
    expect(directionsLinks({ address: lot.address, entrance: { ...e, verification: "needs_review" } })?.basis).toBe("street_address");
  });

  it("keeps the lot's official address separate from the entrance", () => {
    const blue = FACILITIES.find((f) => f.id === "highmark-blue-ada")!;
    expect(blue.entrance?.instructions).toMatch(/Fieldhouse Dr/);
    expect(blue.entrance?.verification).toBe("unverified");
    expect(blue.entrance?.location).toBeUndefined();
  });
});

describe("inventory entrance facts", () => {
  const fact = (value: string, extra: object = {}) => ({ value, sources: ["s"], confidence: "medium" as const, observedAt: "2026-10-01", method: "page_review" as const, ...extra });
  const inv = (fields: Record<string, ReturnType<typeof fact>>): VenueInventory => ({
    version: 1,
    slug: "test-venue",
    venue: { fields: { venue_name: fact("Test Venue"), venue_type: fact("stadium"), city: fact("Buffalo"), state: fact("NY"), lat: fact("42.875"), lng: fact("-78.876") }, policy: {}, transit: {} },
    sources: { s: { type: "official", name: "Test", url: "https://example.com", retrievedAt: "2026-10-01", method: "page_review" } },
    lots: { gate: { fields: { name: fact("Gate Lot"), type: fact("official_lot"), ...fields }, prices: {} } },
  });

  it("stores the entrance separately from the lot address", () => {
    const f = inventoryFacility(
      inv({}),
      "gate",
      inv({
        address: fact("1 Main St, Buffalo, NY"),
        entrance_address: fact("5 Side St, Buffalo, NY"),
        entrance_location: fact("42.876,-78.877,pin"),
        entrance_instructions: fact("Turn in at the yellow sign."),
      }).lots.gate,
    );
    expect(f.address).toBe("1 Main St, Buffalo, NY");
    expect(f.entrance).toMatchObject({ address: "5 Side St, Buffalo, NY", location: { lat: 42.876, lng: -78.877, method: "pin" }, verification: "unverified" });
  });

  it("only accepts 'verified' from a LotLizard field check, never on geocoded points", () => {
    const fromSnippet = validateInventory(inv({ entrance_location: fact("42.876,-78.877,pin"), entrance_verification: fact("verified") }));
    expect(fromSnippet.join(" ")).toMatch(/needs a field verification/);
    const geocoded = validateInventory(
      inv({ entrance_location: fact("42.876,-78.877,geocoded"), entrance_verification: fact("verified", { method: "field", verifiedAt: "2026-10-02" }) }),
    );
    expect(geocoded.join(" ")).toMatch(/geocoded entrance location cannot be verified/);
  });
});
