import { describe, expect, it } from "vitest";
import type { ParkingFacility } from "@/lib/types";
import { attr, fact } from "@/lib/data/attr";
import { DEFAULT_PREFERENCES, rankFacilities, type RankingPreferences } from "@/lib/ranking";
import { activeFilterCount, applyDisplayFilters, buildMarkers, clearFilters } from "@/lib/explorer";
import { EMPTY_PAYMENT_FILTER } from "@/lib/payment";
import { HIGHMARK_FACILITIES } from "@/lib/data/facilities/highmark";
import { VENUES } from "@/lib/data/venues";

const prefs = (o: Partial<RankingPreferences> = {}): RankingPreferences => ({ ...DEFAULT_PREFERENCES, ...o });

function lot(id: string, amenities: ParkingFacility["amenities"]["value"]): ParkingFacility {
  return {
    id,
    slug: id,
    venueId: "v",
    name: id,
    type: "private_lot",
    location: { lat: 42.77, lng: -78.79, precision: "approximate" },
    description: "",
    prices: [],
    amenities: fact(amenities, "low", ["s"]),
    tailgating: { allowed: fact<boolean | "unknown">("unknown", "unverified", ["s"]) },
    exit: {},
    vehicleTypes: ["car"],
    attribution: attr("low", ["s"]),
  };
}

describe("activeFilterCount", () => {
  it("is zero for defaults and ignores sort priorities and the include-unknown option", () => {
    expect(activeFilterCount(DEFAULT_PREFERENCES, [])).toBe(0);
    expect(activeFilterCount(prefs({ weights: { cost: 5, walk: 0, tailgate: 0, exit: 0 }, direction: "north" }), [])).toBe(0);
    expect(activeFilterCount(prefs({ payment: { ...EMPTY_PAYMENT_FILTER, includeUnknown: true } }), [])).toBe(0);
  });

  it("counts every eligibility filter", () => {
    const p = prefs({
      payment: { methods: ["cash", "venmo"], timings: ["pay_on_arrival"], includeUnknown: false },
      amenities: ["tailgate_area"],
      vehicle: "rv",
      needsAda: true,
      requireTailgating: true,
      maxPrice: 50,
    });
    expect(activeFilterCount(p, ["shuttle"])).toBe(9);
  });
});

describe("clearFilters", () => {
  it("resets filters but keeps sort priorities and direction", () => {
    const weights = { cost: 5, walk: 1, tailgate: 0, exit: 2 };
    const cleared = clearFilters(
      prefs({ weights, direction: "west", vehicle: "rv", needsAda: true, requireTailgating: true, maxPrice: 20, amenities: ["paved"], payment: { methods: ["cash"], timings: [], includeUnknown: true } }),
    );
    expect(activeFilterCount(cleared, [])).toBe(0);
    expect(cleared.weights).toEqual(weights);
    expect(cleared.direction).toBe("west");
    expect(cleared.payment).toEqual(EMPTY_PAYMENT_FILTER);
  });
});

describe("amenity filter", () => {
  const a = lot("a", ["tailgate_area", "paved"]);
  const b = lot("b", ["tailgate_area"]);
  const unknown = lot("unknown", []);

  it("requires every selected amenity to be reported (AND), never assuming unreported ones", () => {
    const run = (amenities: ParkingFacility["amenities"]["value"]) =>
      applyDisplayFilters([a, b, unknown], { hiddenTypes: [], payment: EMPTY_PAYMENT_FILTER, amenities }).visible.map((f) => f.id);
    expect(run([])).toEqual(["a", "b", "unknown"]);
    expect(run(["tailgate_area"])).toEqual(["a", "b"]);
    expect(run(["tailgate_area", "paved"])).toEqual(["a"]);
  });

  it("keeps map pins and ranked cards in sync on the Highmark data", () => {
    const { visible } = applyDisplayFilters(HIGHMARK_FACILITIES, { hiddenTypes: [], payment: EMPTY_PAYMENT_FILTER, amenities: ["tailgate_area"] });
    const ranked = rankFacilities(VENUES[0], visible, prefs({ amenities: ["tailgate_area"] }));
    expect(buildMarkers(visible, ranked).map((m) => m.id)).toEqual(visible.filter((f) => f.location).map((f) => f.id));
    for (const f of visible) expect(f.amenities.value).toContain("tailgate_area");
  });
});
