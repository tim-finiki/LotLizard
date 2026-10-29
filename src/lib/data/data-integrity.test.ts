import { describe, expect, it } from "vitest";
import { VENUES } from "@/lib/data/venues";
import { HIGHMARK_FACILITIES } from "@/lib/data/facilities/highmark";
import { SOURCES } from "@/lib/data/sources";
import { collectSourceIds } from "@/lib/data/repository";

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
