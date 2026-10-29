import { describe, expect, it } from "vitest";
import { EVENTS } from "@/lib/data/events";
import { FACILITIES, VENUES } from "@/lib/data/catalog";
import { DEFAULT_PREFERENCES, rankFacilities } from "@/lib/ranking";
import { directionsLabel, directionsLinks } from "@/lib/directions";
import { FEATURED_VENUES, venueHighlights, venueProfile } from "@/lib/featured";

const venue = (slug: string) => VENUES.find((v) => v.slug === slug)!;
const lots = (slug: string) => FACILITIES.filter((f) => f.venueId === venue(slug).id);
const events = (slug: string) => EVENTS.filter((e) => e.venueId === venue(slug).id);

describe("featured pilot venues", () => {
  it("feature Highmark Stadium and KeyBank Center, both with parking data", () => {
    expect(FEATURED_VENUES.map((p) => p.slug)).toEqual(["highmark-stadium", "keybank-center"]);
    for (const p of FEATURED_VENUES) expect(lots(p.slug).length).toBeGreaterThan(0);
    expect(venueProfile("highmark-stadium")?.eventTypes).toEqual(["NFL"]);
    expect(venueProfile("keybank-center")?.eventTypes).toEqual(["NHL", "Concerts"]);
  });

  it("highlight what matters at each venue, counted from the data", () => {
    const hm = venueHighlights(venueProfile("highmark-stadium")!, venue("highmark-stadium"), lots("highmark-stadium"), events("highmark-stadium"));
    expect(hm.join(" | ")).toMatch(/Tailgating rules for \d+ lots/);
    expect(hm).toContain("Postgame traffic plan");
    expect(hm).toContain(`${events("highmark-stadium").length} games with sourced dates`);

    const kb = venueHighlights(venueProfile("keybank-center")!, venue("keybank-center"), lots("keybank-center"), events("keybank-center"));
    const garages = lots("keybank-center").filter((f) => f.type === "garage");
    expect(kb).toEqual([
      `${garages.length} garages and ramps compared`,
      `Estimated walk from ${garages.filter((f) => f.location).length} mapped ramps`,
      "Accessible parking confirmed at 1 ramp",
      "Event dates not listed yet",
    ]);
  });

  it("leave weakly sourced facts out of the headline", () => {
    // KeyBank's Metro Rail note comes from a low-confidence guide, so it isn't a card highlight.
    expect(venue("keybank-center").transit?.[0].attribution.confidence).toBe("low");
    const kb = venueHighlights(venueProfile("keybank-center")!, venue("keybank-center"), lots("keybank-center"), events("keybank-center"));
    expect(kb.join(" ")).not.toMatch(/Transit/);
  });

  it("don't invent KeyBank events or prices", () => {
    expect(events("keybank-center")).toEqual([]);
    for (const f of lots("keybank-center")) expect(f.prices).toEqual([]);
  });

  it("rank KeyBank's ramps by walking distance by default, where the balanced sort can't rank any", () => {
    const kb = venue("keybank-center");
    expect(rankFacilities(kb, lots("keybank-center"), DEFAULT_PREFERENCES).filter((r) => r.rank !== null)).toEqual([]);
    const walkFirst = rankFacilities(kb, lots("keybank-center"), { ...DEFAULT_PREFERENCES, weights: venueProfile("keybank-center")!.defaultWeights! });
    const ranked = walkFirst.filter((r) => r.rank !== null);
    expect(ranked.length).toBeGreaterThanOrEqual(3);
    const walks = ranked.map((r) => r.walk!.minutes);
    expect(walks).toEqual([...walks].sort((a, b) => a - b));
    // Unmapped lots stay unranked rather than guessed.
    for (const r of walkFirst.filter((x) => !x.facility.location)) expect(r.rank).toBeNull();
    // Highmark keeps the balanced default.
    expect(venueProfile("highmark-stadium")?.defaultWeights).toBeUndefined();
  });
});

describe("KeyBank addresses and entrances", () => {
  it("routes to third-party addresses only with an 'unverified' label", () => {
    for (const f of lots("keybank-center").filter((x) => x.address)) {
      expect(f.addressAttribution?.confidence).toBe("low");
      const d = directionsLinks(f);
      if (d) expect(directionsLabel(d)).toMatch(/not yet verified/);
    }
  });

  it("gives the arena ramp its sourced entrance instruction, with no invented driveway", () => {
    const ramp = lots("keybank-center").find((f) => f.slug === "keybank-center-ramp")!;
    expect(ramp.entrance).toMatchObject({ instructions: expect.stringMatching(/Illinois Street/), verification: "unverified" });
    expect(ramp.entrance?.location).toBeUndefined();
    expect(ramp.entrance?.address).toBeUndefined();
  });
});
