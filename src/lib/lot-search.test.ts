import { describe, expect, it } from "vitest";
import { FACILITIES, VENUES } from "@/lib/data/catalog";
import { listAllFacilityParams } from "@/lib/data/repository";
import { facilityPath } from "@/lib/seo";
import { searchVenues } from "@/lib/search";
import { lotOnMapPath, lotPath, lotSearchEntry, searchLots } from "@/lib/lot-search";

const venueBySlug = new Map(VENUES.map((v) => [v.slug, v]));
const ENTRIES = FACILITIES.map((f) => lotSearchEntry(VENUES.find((v) => v.id === f.venueId)!, f));
const at = (venue: string) => ENTRIES.filter((e) => e.venueSlug === venue);
const found = (q: string, entries = ENTRIES) => searchLots(entries, q).map((m) => `${m.entry.venueSlug}/${m.entry.lotSlug}`);

describe("lot name search", () => {
  it("matches official names partially and case-insensitively", () => {
    expect(found("gold", at("highmark-stadium"))[0]).toBe("highmark-stadium/gold-lot");
    expect(found("GOLD LOT")[0]).toBe("highmark-stadium/gold-lot");
    expect(found("harbor")).toContain("keybank-center/lecom-harborcenter-ramp");
    // Inside a word, from 3 characters.
    expect(found("center ramp", at("keybank-center"))).toEqual(expect.arrayContaining(["keybank-center/keybank-center-ramp", "keybank-center/lecom-harborcenter-ramp"]));
  });

  it("matches documented aliases and says so", () => {
    const [m] = searchLots(at("highmark-stadium"), "lot 1");
    expect(m.entry.lotSlug).toBe("yellow-brick-parking");
    const [adams] = searchLots(ENTRIES, "adams ramp");
    expect(adams).toMatchObject({ matchedOn: "alias", matchedText: "Adams Ramp" });
    expect(adams.entry.lotSlug).toBe("adam-ramp");
    expect(found("seneca one")).toContain("keybank-center/one-seneca-ramp");
  });

  it("keeps numbers and letters exact, so similar lot names don't collide", () => {
    expect(found("lot 10", at("highmark-stadium"))).toEqual([]);
    expect(found("lot p", at("highmark-stadium"))).toEqual([]);
  });

  it("matches documented operators", () => {
    expect(found("bcar")).toEqual(["keybank-center/adam-ramp"]);
    expect(searchLots(ENTRIES, "buffalo civic auto")[0]).toMatchObject({ matchedOn: "operator" });
    expect(found("buffalo bills", at("highmark-stadium"))).toContain("highmark-stadium/gold-lot");
  });

  it("uses venue context to tell identically named lots apart", () => {
    const all = searchLots(ENTRIES, "lot p");
    expect(new Set(all.map((m) => m.entry.venueSlug)).size).toBeGreaterThan(1);
    for (const m of all) expect(m.entry.venueName).toBe(venueBySlug.get(m.entry.venueSlug)!.name);
    expect(found("lot p citizens bank")).toEqual(["citizens-bank-park/lot-p"]);
  });

  it("never matches a lot on venue words alone", () => {
    expect(found("highmark")).toEqual([]);
    expect(found("keybank center", at("highmark-stadium"))).toEqual([]);
    expect(found("")).toEqual([]);
  });

  it("is separate from venue search, which is unchanged", () => {
    expect(searchVenues(VENUES, "gold lot")).toEqual([]);
    expect(searchVenues(VENUES, "sabres").map((v) => v.slug)).toEqual(["keybank-center"]);
    expect(searchVenues(VENUES, "bills")[0].slug).toBe("highmark-stadium");
  });

  it("flags restricted lots so they open their own page", () => {
    for (const e of ENTRIES) expect(e.restricted).toBe(FACILITIES.find((f) => f.slug === e.lotSlug && f.venueId === venueBySlug.get(e.venueSlug)!.id)!.access?.value === "restricted");
  });
});

describe("direct lot links", () => {
  it("give every lot a stable, prerendered page", async () => {
    const params = await listAllFacilityParams();
    for (const f of FACILITIES) {
      const venue = VENUES.find((v) => v.id === f.venueId)!;
      const entry = lotSearchEntry(venue, f);
      expect(lotPath(entry)).toBe(facilityPath(venue, f));
      expect(lotPath(entry)).toMatch(/^\/venues\/[a-z0-9-]+\/parking\/[a-z0-9-]+$/);
      expect(params).toContainEqual({ venue: venue.slug, lot: f.slug });
    }
  });

  it("link to the venue map with the lot selected", () => {
    expect(lotOnMapPath({ venueSlug: "keybank-center", lotSlug: "adam-ramp" })).toBe("/venues/keybank-center?lot=adam-ramp");
  });

  it("include the Bills and KeyBank Center lots", async () => {
    const params = await listAllFacilityParams();
    expect(params).toContainEqual({ venue: "highmark-stadium", lot: "gold-lot" });
    expect(params).toContainEqual({ venue: "keybank-center", lot: "keybank-center-ramp" });
  });
});
