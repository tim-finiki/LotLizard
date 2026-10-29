import { describe, expect, it } from "vitest";
import type { ParkingFacility, Venue } from "@/lib/types";
import { attr, fact } from "@/lib/data/attr";
import { DEFAULT_PREFERENCES, EXIT_DATA_UNAVAILABLE, bestPrice, exitDirectionDataAvailable, rankFacilities, type RankingPreferences } from "@/lib/ranking";

const venue: Venue = {
  id: "v",
  slug: "v",
  name: "Test Stadium",
  type: "stadium",
  teams: [],
  address: { city: "X", state: "NY" },
  location: { lat: 42.77, lng: -78.79, precision: "exact" },
  coverage: "pilot_detailed",
  attribution: attr("high", ["s"]),
};

function lot(id: string, o: Partial<ParkingFacility> = {}): ParkingFacility {
  return {
    id,
    slug: id,
    venueId: "v",
    name: id,
    type: "private_lot",
    location: { lat: 42.771, lng: -78.79, precision: "exact" },
    description: "",
    prices: [],
    amenities: fact([], "unverified", ["s"]),
    tailgating: { allowed: fact<boolean | "unknown">("unknown", "unverified", ["s"]) },
    exit: {},
    vehicleTypes: ["car"],
    attribution: attr("low", ["s"]),
    ...o,
  };
}

const price = (min: number, max = min, confidence: "low" | "high" = "low", observedAt = "2026-01-01") => ({
  id: `${min}-${confidence}-${observedAt}`,
  min,
  max,
  vehicle: "car" as const,
  eventKind: "nfl_regular" as const,
  observedAt,
  attribution: attr(confidence, ["s"]),
});

const prefs = (o: Partial<RankingPreferences> = {}): RankingPreferences => ({ ...DEFAULT_PREFERENCES, ...o });

describe("rankFacilities", () => {
  it("ranks cheaper lots higher when cost is the only priority", () => {
    const r = rankFacilities(venue, [lot("a", { prices: [price(60)] }), lot("b", { prices: [price(20)] })], prefs({ weights: { cost: 5, walk: 0, tailgate: 0, exit: 0 } }));
    expect(r.map((x) => x.facility.id)).toEqual(["b", "a"]);
    expect(r[0].rank).toBe(1);
  });

  it("ranks closer lots higher when walking is the only priority", () => {
    const far = lot("far", { location: { lat: 42.79, lng: -78.79, precision: "exact" } });
    const near = lot("near");
    const r = rankFacilities(venue, [far, near], prefs({ weights: { cost: 0, walk: 5, tailgate: 0, exit: 0 } }));
    expect(r[0].facility.id).toBe("near");
  });

  it("gives no credit for unknown data and declines to recommend", () => {
    const [r] = rankFacilities(venue, [lot("a", { location: undefined })], prefs({ weights: { cost: 1, walk: 1, tailgate: 1, exit: 1 } }));
    expect(r.score).toBe(0);
    expect(r.completeness).toBe(0);
    expect(r.confidence).toBe("unverified");
    expect(r.recommendation).toBe("limited_data");
    expect(r.factors.cost.known).toBe(false);
  });

  it("never ranks missing data above known-but-mediocre data", () => {
    const farKnown = lot("far", { location: { lat: 42.785, lng: -78.79, precision: "exact" } });
    const unknown = lot("unknown", { location: undefined });
    const r = rankFacilities(venue, [unknown, farKnown], prefs({ weights: { cost: 0, walk: 5, tailgate: 0, exit: 0 } }));
    expect(r[0].facility.id).toBe("far");
    expect(r[0].factors.walk.score).toBeLessThan(0.5);
  });

  it("keeps the match score separate from completeness and confidence", () => {
    const a = lot("a", { prices: [price(20, 20, "high")] });
    const [r] = rankFacilities(venue, [a], prefs({ weights: { cost: 5, walk: 0, tailgate: 0, exit: 5 } }));
    // Score averages known factors only; the missing exit factor shows up in completeness, not the score.
    expect(r.score).toBe(100);
    expect(r.completeness).toBe(0.5);
    expect(r.confidence).toBe("high");
  });

  it("treats missing data as neutral: neither a bonus nor a penalty", () => {
    const good = { tailgating: { allowed: fact<boolean | "unknown">(true, "medium", ["s"]), atmosphere: fact(5, "low", ["s"]) } };
    const withPrice = lot("with-price", { ...good, prices: [price(40)] });
    const noPrice = lot("no-price", { ...good });
    const r = rankFacilities(venue, [withPrice, noPrice], prefs({ weights: { cost: 1, walk: 0, tailgate: 5, exit: 0 } }));
    const byId = Object.fromEntries(r.map((x) => [x.facility.id, x]));
    // Same known tailgate evidence → same score; the unknown price only lowers completeness.
    expect(byId["no-price"].score).toBe(byId["with-price"].score);
    expect(byId["no-price"].completeness).toBeLessThan(byId["with-price"].completeness);
    // Equal scores: the better-documented lot wins the tie.
    expect(r[0].facility.id).toBe("with-price");
  });

  it("does not rank lots with too little data", () => {
    const [r] = rankFacilities(venue, [lot("thin", { location: undefined, prices: [price(10)] })]);
    expect(r.rank).toBeNull();
    expect(r.recommendation).toBe("limited_data");
  });

  it("never uses area-wide price ranges as cost evidence", () => {
    const area = lot("area", { prices: [{ ...price(35, 90), scope: "area" as const }] });
    const specific = lot("specific", { prices: [price(60)] });
    const r = rankFacilities(venue, [area, specific], prefs({ weights: { cost: 5, walk: 0, tailgate: 0, exit: 0 } }));
    expect(r.find((x) => x.facility.id === "area")?.factors.cost.known).toBe(false);
    expect(r.find((x) => x.facility.id === "area")?.factors.cost.detail).toContain("area estimate only");
    expect(r.find((x) => x.facility.id === "specific")?.factors.cost.known).toBe(true);
    // An area range never rules a lot out on max price either.
    expect(rankFacilities(venue, [area], prefs({ maxPrice: 30 }))).toHaveLength(1);
  });

  it("assigns a single top pick and never recommends low-completeness lots", () => {
    const strong = lot("strong", { prices: [price(20)], tailgating: { allowed: fact<boolean | "unknown">(true, "medium", ["s"]) } });
    const alsoStrong = lot("also", { prices: [price(25)], tailgating: { allowed: fact<boolean | "unknown">(true, "medium", ["s"]) } });
    const thin = lot("thin", { location: undefined, prices: [price(10)] });
    const r = rankFacilities(venue, [thin, strong, alsoStrong]);
    expect(r.filter((x) => x.recommendation === "top_pick")).toHaveLength(1);
    expect(r.find((x) => x.facility.id === "thin")?.recommendation).toBe("limited_data");
  });

  it("scores exit direction only from documented (medium+) routing", () => {
    const documented = (ids: string[]) => ({ directions: fact(ids, "medium", ["s"]) });
    const north = lot("north", { exit: documented(["north"]) });
    const west = lot("west", { exit: documented(["west"]) });
    const inferred = lot("inferred", { exit: { directions: fact(["north"], "low", ["s"]) } });
    const exitOnly = prefs({ direction: "north", weights: { cost: 0, walk: 0, tailgate: 0, exit: 5 } });
    const r = rankFacilities(venue, [inferred, west, north], exitOnly);
    expect(r.map((x) => x.facility.id)).toEqual(["north", "west", "inferred"]);
    // A low-confidence inference is not used: the lot is unranked with an explicit message.
    expect(r[2].rank).toBeNull();
    expect(r[2].factors.exit.detail).toBe(EXIT_DATA_UNAVAILABLE);
    expect(exitDirectionDataAvailable([inferred], "north")).toBe(false);
    expect(exitDirectionDataAvailable([north], "north")).toBe(true);
    // With no direction chosen, routing data alone is not an exit score.
    expect(rankFacilities(venue, [north], prefs({ weights: { cost: 0, walk: 0, tailgate: 0, exit: 5 } }))[0].factors.exit.known).toBe(false);
  });
});

describe("bestPrice", () => {
  it("prefers prices for the selected event kind", () => {
    const concert = { ...price(80, 80, "high"), id: "concert", eventKind: "concert" as const };
    const f = lot("a", { prices: [concert, price(40)] });
    expect(bestPrice(f, "car", "nfl_regular")?.min).toBe(40);
    expect(bestPrice(f, "car", "concert")?.min).toBe(80);
  });

  it("prefers higher confidence, then recency", () => {
    const f = lot("a", { prices: [price(10, 10, "low", "2026-10-01"), price(20, 20, "high", "2025-01-01"), price(30, 30, "low", "2026-10-20")] });
    expect(bestPrice(f, "car")?.min).toBe(20);
    const g = lot("b", { prices: [price(10, 10, "low", "2026-10-01"), price(30, 30, "low", "2026-10-20")] });
    expect(bestPrice(g, "car")?.min).toBe(30);
  });
});
