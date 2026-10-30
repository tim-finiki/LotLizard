import { describe, expect, it } from "vitest";
import type { AvailabilityState, ParkingFacility, UniversalAmenity } from "@/lib/types";
import { attr, fact } from "@/lib/data/attr";
import { UNIVERSAL_AMENITIES, featureState, matchFeatures } from "@/lib/features";
import { applyDisplayFilters, buildMarkers } from "@/lib/explorer";
import { DEFAULT_PREFERENCES, normalizePreferences, rankFacilities } from "@/lib/ranking";
import { EMPTY_PAYMENT_FILTER } from "@/lib/payment";
import { HIGHMARK_FACILITIES } from "@/lib/data/facilities/highmark";
import { VENUES } from "@/lib/data/venues";
import { SOURCES } from "@/lib/data/sources";

function lot(id: string, features: Partial<Record<UniversalAmenity, AvailabilityState>> = {}, o: Partial<ParkingFacility> = {}): ParkingFacility {
  return {
    id,
    slug: id,
    venueId: "v",
    name: id,
    type: "private_lot",
    location: { lat: 42.77, lng: -78.79, precision: "approximate" },
    description: "",
    prices: [],
    amenities: fact([], "unverified", ["s"]),
    features: Object.fromEntries(
      Object.entries(features).map(([k, state]) => [k, { state, reportedAt: "2026-10-01", attribution: attr("medium", ["s"]) }]),
    ),
    tailgating: { allowed: fact<boolean | "unknown">("unknown", "unverified", ["s"]) },
    exit: {},
    vehicleTypes: ["car"],
    attribution: attr("low", ["s"]),
    ...o,
  };
}

const run = (lots: ParkingFacility[], features: UniversalAmenity[]) =>
  applyDisplayFilters(lots, { hiddenTypes: [], payment: EMPTY_PAYMENT_FILTER, features });

describe("universal amenity states", () => {
  it("treats a missing fact and an explicit 'unknown' the same", () => {
    expect(featureState(lot("a"), "covered")).toBe("unknown");
    expect(featureState(lot("b", { covered: "unknown" }), "covered")).toBe("unknown");
    expect(featureState(lot("c", { covered: "available" }), "covered")).toBe("available");
  });

  it("matches only confirmed availability, for every universal amenity", () => {
    for (const k of UNIVERSAL_AMENITIES) {
      expect(matchFeatures(lot("yes", { [k]: "available" }), [k])).toBe("match");
      expect(matchFeatures(lot("no", { [k]: "unavailable" }), [k])).toBe("excluded");
      expect(matchFeatures(lot("unknown"), [k])).toBe("unknown");
      expect(matchFeatures(lot("explicit-unknown", { [k]: "unknown" }), [k])).toBe("unknown");
    }
  });

  it("requires every selected amenity (AND); one unavailable excludes, one unknown withholds", () => {
    const both = lot("both", { covered: "available", ev_charging: "available" });
    const oneNo = lot("one-no", { covered: "available", ev_charging: "unavailable" });
    const oneUnknown = lot("one-unknown", { covered: "available" });
    expect(matchFeatures(both, ["covered", "ev_charging"])).toBe("match");
    expect(matchFeatures(oneNo, ["covered", "ev_charging"])).toBe("excluded");
    expect(matchFeatures(oneUnknown, ["covered", "ev_charging"])).toBe("unknown");
  });
});

describe("amenity filtering keeps map, list and rankings in sync", () => {
  const lots = [
    lot("ev", { ev_charging: "available", restrooms: "unavailable" }),
    lot("restrooms", { restrooms: "available" }),
    lot("unknown"),
    lot("no-ev", { ev_charging: "unavailable" }),
  ];

  it("never shows unknown or unavailable lots, and counts the unknown ones", () => {
    const r = run(lots, ["ev_charging"]);
    expect(r.visible.map((f) => f.id)).toEqual(["ev"]);
    expect(r.hiddenUnknownFeatures).toBe(2); // "restrooms" and "unknown"; "no-ev" is excluded outright
  });

  it("feeds the same visible set to the ranking and the map pins", () => {
    for (const features of [[], ["ev_charging"], ["restrooms"], ["covered"]] as UniversalAmenity[][]) {
      const { visible } = run(lots, features);
      const ranked = rankFacilities(VENUES[0], visible, { ...DEFAULT_PREFERENCES, features });
      expect(buildMarkers(visible, ranked).map((m) => m.id)).toEqual(visible.filter((f) => f.location).map((f) => f.id));
      for (const r of ranked) expect(visible).toContain(r.facility);
    }
  });

  it("brings dedicated ADA lots into the ranking only when ADA parking is requested", () => {
    const adaLot = lot("ada-lot", { ada: "available" }, { type: "ada" });
    const plain = lot("plain");
    expect(rankFacilities(VENUES[0], [adaLot, plain], DEFAULT_PREFERENCES).map((r) => r.facility.id)).toEqual(["plain"]);
    const { visible } = run([adaLot, plain], ["ada"]);
    expect(rankFacilities(VENUES[0], visible, { ...DEFAULT_PREFERENCES, features: ["ada"] }).map((r) => r.facility.id)).toEqual(["ada-lot"]);
  });
});

describe("Highmark universal amenity data", () => {
  const slugs = (features: UniversalAmenity[]) => run(HIGHMARK_FACILITIES, features).visible.map((f) => f.slug).sort();

  it("claims only what a source confirms: ADA at the ADA lots, restrooms and no EV charging at the operator-documented private lots", () => {
    const claims = HIGHMARK_FACILITIES.flatMap((f) =>
      UNIVERSAL_AMENITIES.filter((k) => featureState(f, k) !== "unknown").map((k) => `${f.slug}:${k}:${featureState(f, k)}`),
    );
    expect(claims.sort()).toEqual([
      "big-g-lot:restrooms:available",
      "blue-ada-lot:ada:available",
      "white-ada-lot:ada:available",
      "yellow-brick-parking-lot-2:ev_charging:unavailable",
      "yellow-brick-parking-lot-2:restrooms:available",
      "yellow-brick-parking:ev_charging:unavailable",
      "yellow-brick-parking:restrooms:available",
    ]);
  });

  it("returns only confirmed lots: none for covered parking or EV charging, operator-documented lots for restrooms", () => {
    expect(slugs(["covered"])).toEqual([]);
    expect(slugs(["ev_charging"])).toEqual([]);
    expect(slugs(["restrooms"])).toEqual(["big-g-lot", "yellow-brick-parking", "yellow-brick-parking-lot-2"]);
    expect(slugs(["ada"])).toEqual(["blue-ada-lot", "white-ada-lot"]);
  });

  it("backs every confirmed state with a registered, non-editorial source", () => {
    const ids = new Set(SOURCES.map((s) => s.id));
    for (const f of HIGHMARK_FACILITIES) {
      for (const fct of Object.values(f.features ?? {})) {
        if (!fct || fct.state === "unknown") continue;
        for (const id of fct.attribution.sourceIds) expect(ids).toContain(id);
        expect(fct.attribution.sourceIds.some((id) => id !== "lotlizard-editorial")).toBe(true);
      }
    }
  });
});

describe("saved preferences from earlier versions", () => {
  it("migrates the old ADA toggle to the ADA amenity filter", () => {
    expect(normalizePreferences({ needsAda: true }).features).toEqual(["ada"]);
    expect(normalizePreferences({ needsAda: false }).features).toEqual([]);
    expect("needsAda" in normalizePreferences({ needsAda: true })).toBe(false);
  });

  it("keeps newer saved features and fills missing fields", () => {
    const p = normalizePreferences({ features: ["ev_charging"], weights: { cost: 5 } });
    expect(p.features).toEqual(["ev_charging"]);
    expect(p.weights).toEqual({ ...DEFAULT_PREFERENCES.weights, cost: 5 });
    expect(p.payment).toEqual(DEFAULT_PREFERENCES.payment);
    expect(normalizePreferences(null)).toEqual(DEFAULT_PREFERENCES);
  });
});
