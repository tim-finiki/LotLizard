import { describe, expect, it } from "vitest";
import type { ParkingFacility, Venue } from "@/lib/types";
import { attr, fact } from "@/lib/data/attr";
import { DEFAULT_PREFERENCES, bestPrice, rankFacilities, type RankingPreferences } from "@/lib/ranking";

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
    expect(r.completeness).toBe(0.5);
    expect(r.score).toBe(50);
    expect(r.confidence).toBe("high");
  });

  it("assigns a single top pick and never recommends low-completeness lots", () => {
    const strong = lot("strong", { prices: [price(20)], tailgating: { allowed: fact<boolean | "unknown">(true, "medium", ["s"]) } });
    const alsoStrong = lot("also", { prices: [price(25)], tailgating: { allowed: fact<boolean | "unknown">(true, "medium", ["s"]) } });
    const thin = lot("thin", { location: undefined, prices: [price(10)] });
    const r = rankFacilities(venue, [thin, strong, alsoStrong]);
    expect(r.filter((x) => x.recommendation === "top_pick")).toHaveLength(1);
    expect(r.find((x) => x.facility.id === "thin")?.recommendation).toBe("limited_data");
  });

  it("scores exit by direction of travel when route data exists", () => {
    const north = lot("north", { exit: { directions: fact(["north"], "low", ["s"]) } });
    const west = lot("west", { exit: { directions: fact(["west"], "low", ["s"]) } });
    const none = lot("none");
    const r = rankFacilities(venue, [none, west, north], prefs({ direction: "north", weights: { cost: 0, walk: 0, tailgate: 0, exit: 5 } }));
    expect(r.map((x) => x.facility.id)).toEqual(["north", "west", "none"]);
    expect(r[2].factors.exit.known).toBe(false);
    // With no direction chosen, route data alone is not an exit score.
    expect(rankFacilities(venue, [north], prefs({ weights: { cost: 0, walk: 0, tailgate: 0, exit: 5 } }))[0].factors.exit.known).toBe(false);
  });

  it("excludes lots that forbid tailgating when required, but keeps unknowns", () => {
    const no = lot("no", { tailgating: { allowed: fact<boolean | "unknown">(false, "high", ["s"]) } });
    const unknown = lot("unknown");
    const r = rankFacilities(venue, [no, unknown], prefs({ requireTailgating: true }));
    expect(r.map((x) => x.facility.id)).toEqual(["unknown"]);
  });

  it("applies max price, vehicle and ADA filters, and never ranks shuttles", () => {
    const pricey = lot("pricey", { prices: [price(100)] });
    const rv = lot("rv", { vehicleTypes: ["rv"] });
    const ada = lot("ada", { type: "ada" });
    const shuttle = lot("shuttle", { type: "shuttle" });
    const ok = lot("ok", { prices: [price(30)] });
    expect(rankFacilities(venue, [pricey, rv, ada, shuttle, ok], prefs({ maxPrice: 50 })).map((x) => x.facility.id)).toEqual(["ok"]);
    expect(rankFacilities(venue, [ada], prefs({ needsAda: true }))).toHaveLength(1);
  });

  it("treats all-zero weights as balanced instead of dividing by zero", () => {
    const [r] = rankFacilities(venue, [lot("a", { prices: [price(10)] })], prefs({ weights: { cost: 0, walk: 0, tailgate: 0, exit: 0 } }));
    expect(Number.isFinite(r.score)).toBe(true);
  });

  it("uses atmosphere rating for tailgate score", () => {
    const legendary = lot("legendary", {
      tailgating: { allowed: fact<boolean | "unknown">(true, "medium", ["s"]), atmosphere: fact(5, "low", ["s"]) },
    });
    const plain = lot("plain", { tailgating: { allowed: fact<boolean | "unknown">(true, "medium", ["s"]) } });
    const r = rankFacilities(venue, [plain, legendary], prefs({ weights: { cost: 0, walk: 0, tailgate: 5, exit: 0 } }));
    expect(r[0].facility.id).toBe("legendary");
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
