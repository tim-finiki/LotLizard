import { describe, expect, it } from "vitest";
import { VENUES } from "@/lib/data/venues";
import { HIGHMARK_FACILITIES } from "@/lib/data/facilities/highmark";
import { SOURCES } from "@/lib/data/sources";
import { collectSourceIds } from "@/lib/data/repository";
import { isStreetAddress } from "@/lib/directions";

const sourceIds = new Set(SOURCES.map((s) => s.id));

describe("seed data integrity", () => {
  it("has unique venue and facility slugs", () => {
    expect(new Set(VENUES.map((v) => v.slug)).size).toBe(VENUES.length);
    expect(new Set(HIGHMARK_FACILITIES.map((f) => f.slug)).size).toBe(HIGHMARK_FACILITIES.length);
  });

  it("references only registered sources", () => {
    for (const venue of VENUES) {
      const facilities = HIGHMARK_FACILITIES.filter((f) => f.venueId === venue.id);
      for (const id of collectSourceIds(venue, facilities)) expect(sourceIds, `unknown source ${id}`).toContain(id);
    }
  });

  it("never marks pilot facts as verified without field verification", () => {
    // Nothing in the pilot has been field-checked yet; "verified" requires a lastVerifiedAt date.
    const all = HIGHMARK_FACILITIES.flatMap((f) => [f.attribution, ...f.prices.map((p) => p.attribution)]);
    for (const a of all) if (a.confidence === "verified") expect(a.lastVerifiedAt).toBeTruthy();
  });

  it("never lets editorial estimates rise above low confidence on their own", () => {
    for (const f of HIGHMARK_FACILITIES) {
      for (const a of [f.attribution, f.tailgating.allowed.attribution, f.amenities.attribution, ...f.prices.map((p) => p.attribution)]) {
        if (a.sourceIds.length === 1 && a.sourceIds[0] === "lotlizard-editorial") expect(["low", "unverified"]).toContain(a.confidence);
      }
    }
  });

  it("only maps facilities that belong to a known venue", () => {
    const ids = new Set(VENUES.map((v) => v.id));
    for (const f of HIGHMARK_FACILITIES) expect(ids).toContain(f.venueId);
  });
});

describe("Highmark private lots", () => {
  const privateLots = HIGHMARK_FACILITIES.filter((f) => f.type === "private_lot");
  const sourceType = new Map(SOURCES.map((s) => [s.id, s.type]));

  it("lists the nine published private lots", () => {
    expect(privateLots.map((f) => f.slug).sort()).toEqual([
      "big-g-lot",
      "big-tree-lot",
      "bills-parking-big-tree-rd",
      "dannys-south",
      "gorilla-parking",
      "hammers-lot",
      "yellow-brick-parking",
      "yellow-brick-parking-lot-2",
      "yellow-brick-parking-lot-3",
    ]);
  });

  it("gives every private lot a street address and a non-editorial source", () => {
    for (const f of privateLots) {
      expect(f.address && isStreetAddress(f.address), `${f.slug} address`).toBe(true);
      expect(f.attribution.sourceIds.some((id) => sourceType.get(id) !== "editorial_estimate"), `${f.slug} source`).toBe(true);
    }
  });

  it("has no duplicate addresses", () => {
    const addresses = privateLots.map((f) => f.address);
    expect(new Set(addresses).size).toBe(addresses.length);
  });

  it("doesn't pin, rate the exit of, or invent a lot-level price for the lots added from 2026-10-30 research", () => {
    for (const slug of ["big-g-lot", "yellow-brick-parking-lot-2", "yellow-brick-parking-lot-3", "big-tree-lot", "bills-parking-big-tree-rd"]) {
      const f = HIGHMARK_FACILITIES.find((x) => x.slug === slug)!;
      expect(f.location, slug).toBeUndefined();
      expect(f.entrance, slug).toBeUndefined();
      expect(f.exit, slug).toEqual({});
      // Only the operator's own advertised starting price, marked as not lot-specific.
      for (const p of f.prices) expect(p.scope, slug).toBe("area");
    }
  });
});

