import { describe, expect, it } from "vitest";
import { FACILITIES, VENUES } from "@/lib/data/catalog";
import { METROS, compareVenue, guideVenues, isIndexableMetro, metroHasPage, metroOf, sharedLots, type MetroVenue } from "@/lib/metro";
import { metroJsonLd, siteUrl } from "@/lib/seo";
import sitemap from "@/app/sitemap";

const all: MetroVenue[] = VENUES.map((venue) => ({ venue, facilities: FACILITIES.filter((f) => f.venueId === venue.id) }));
const metro = (slug: string) => METROS.find((m) => m.slug === slug)!;

describe("metro hubs", () => {
  it("map venues to metros by city and state", () => {
    expect(metroOf(VENUES.find((v) => v.slug === "lincoln-financial-field")!)?.slug).toBe("philadelphia-pa");
    expect(metroOf(VENUES.find((v) => v.slug === "highmark-stadium")!)?.slug).toBe("buffalo-ny");
    expect(metroOf(VENUES.find((v) => v.slug === "metlife-stadium")!)?.slug).toBe("new-york-city");
  });

  it("publish a hub only with two venue guides, and index it only with two indexable venues", () => {
    for (const m of METROS) {
      const guides = guideVenues(m, all);
      expect(metroHasPage(m, all)).toBe(guides.length >= 2);
      if (isIndexableMetro(m, all)) expect(metroHasPage(m, all)).toBe(true);
    }
    expect(isIndexableMetro(metro("philadelphia-pa"), all)).toBe(true);
    expect(isIndexableMetro(metro("kansas-city-mo"), all)).toBe(true);
    // One-venue metros never get a page: it would duplicate the venue guide.
    expect(metroHasPage(metro("buffalo-ny"), all)).toBe(false);
    expect(metroHasPage(metro("new-york-city"), all)).toBe(false);
  });

  it("list lots shared between venues", () => {
    const shared = sharedLots(guideVenues(metro("kansas-city-mo"), all));
    expect(shared.map((s) => s.name)).toEqual(expect.arrayContaining(["Lot C", "Lot G"]));
    for (const s of shared) expect(new Set(s.at.map((x) => x.venue.id)).size).toBeGreaterThan(1);
  });

  it("compare only what the facts say", () => {
    const [linc] = guideVenues(metro("philadelphia-pa"), all).filter((x) => x.venue.slug === "lincoln-financial-field");
    const c = compareVenue(linc);
    expect(c.lots).toBe(linc.facilities.length);
    expect(c.tailgating.allowed + c.tailgating.notAllowed + c.tailgating.unknown).toBe(c.lots);
    // Counts only cover lots where that specific fact is known — never "0 of N" from missing data.
    expect(c.prepayRequired.known).toBe(linc.facilities.filter((f) => f.payment?.timing).length);
    expect(c.cashless.known).toBe(linc.facilities.filter((f) => f.payment?.accepted.includes("cash") || f.payment?.notAccepted?.includes("cash")).length);
    const mixed = compareVenue({
      venue: linc.venue,
      facilities: [
        { ...linc.facilities[0], prices: [{ ...linc.facilities[0].prices[0], min: 50, max: 50, season: "2026", vehicle: "car" }] },
        { ...linc.facilities[0], id: "x", prices: [{ ...linc.facilities[0].prices[0], min: 60, max: 60, season: "2025", vehicle: "car" }] },
      ],
    });
    expect(mixed.carPrice).toMatchObject({ min: 50, max: 60 });
    expect(mixed.carPrice?.season).toBeUndefined();
    const bare = compareVenue({ venue: { ...linc.venue, transit: undefined, lotOpenHoursBefore: undefined }, facilities: [] });
    expect(bare).toMatchObject({ lots: 0, cashless: { lots: 0, known: 0 }, transit: [], covered: 0, accessible: 0 });
    expect(bare.carPrice).toBeUndefined();
    expect(bare.lotOpenHoursBefore).toBeUndefined();
  });

  it("sitemap lists exactly the indexable hubs", async () => {
    const urls = (await sitemap()).map((e) => e.url).filter((u) => u.includes("/cities/"));
    expect(urls.sort()).toEqual(METROS.filter((m) => isIndexableMetro(m, all)).map((m) => `${siteUrl()}/cities/${m.slug}`).sort());
  });

  it("structured data lists the compared venues as an ItemList", () => {
    const venues = guideVenues(metro("philadelphia-pa"), all).map((x) => x.venue);
    const ld = metroJsonLd(metro("philadelphia-pa"), venues) as { "@type": string; itemListElement: { item: { url: string } }[] };
    expect(ld["@type"]).toBe("ItemList");
    expect(ld.itemListElement.map((i) => i.item.url)).toEqual(venues.map((v) => `${siteUrl()}/venues/${v.slug}`));
  });
});
