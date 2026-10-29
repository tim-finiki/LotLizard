import { describe, expect, it } from "vitest";
import type { AccessLevel, ConfidenceLevel, FacilityType, Ownership, ParkingFacility } from "@/lib/types";
import { attr, fact } from "@/lib/data/attr";
import { FACILITIES, SOURCES, VENUES } from "@/lib/data/catalog";
import { DEFAULT_PREFERENCES, rankFacilities } from "@/lib/ranking";
import { activeFilterCount, applyDisplayFilters, buildMarkers } from "@/lib/explorer";
import { EMPTY_PAYMENT_FILTER } from "@/lib/payment";
import {
  EMPTY_PARKING_FILTER,
  accessDisplay,
  matchParkingFilter,
  ownershipDisplay,
  parkingFilterFromParams,
  writeParkingFilterParams,
  type ParkingFilter,
} from "@/lib/access";

function lot(
  id: string,
  o: { owner?: [Ownership, ConfidenceLevel]; access?: [AccessLevel, ConfidenceLevel]; type?: FacilityType; operator?: string } = {},
): ParkingFacility {
  return {
    id,
    slug: id,
    venueId: "v",
    name: id,
    type: o.type ?? "private_lot",
    ...(o.operator ? { operator: o.operator } : {}),
    ...(o.owner ? { ownership: fact(o.owner[0], o.owner[1], ["s"]) } : {}),
    ...(o.access ? { access: fact(o.access[0], o.access[1], ["s"]) } : {}),
    location: { lat: 42.77, lng: -78.79, precision: "approximate" },
    description: "",
    prices: [],
    amenities: fact([], "low", ["s"]),
    tailgating: { allowed: fact<boolean | "unknown">(true, "medium", ["s"]) },
    exit: {},
    vehicleTypes: ["car"],
    attribution: attr("low", ["s"]),
  };
}

const cityGarage = lot("city-garage", { type: "garage", owner: ["public", "medium"], access: ["public", "high"] });
const privateOpenLot = lot("private-open", { owner: ["private", "medium"], access: ["public", "medium"] });
const venuePassLot = lot("venue-pass", { type: "official_lot", owner: ["public", "high"], access: ["pass_required", "medium"] });
const teamRunGarage = lot("team-garage", { type: "garage", operator: "Home Team", access: ["pass_required", "medium"] });
const privatePassLot = lot("private-pass", { owner: ["private", "medium"], access: ["pass_required", "medium"] });
const restricted = lot("season-only", { owner: ["private", "medium"], access: ["restricted", "low"] });
const unknown = lot("unknown");
const reportedOnly = lot("reported", { owner: ["private", "low"], access: ["public", "low"] });
const yard = lot("yard", { type: "residential", owner: ["private", "medium"], access: ["public", "medium"] });
const shuttle = lot("shuttle", { type: "shuttle", owner: ["public", "high"], access: ["public", "high"] });
const ALL = [cityGarage, privateOpenLot, venuePassLot, teamRunGarage, privatePassLot, restricted, unknown, reportedOnly, yard, shuttle];
const VENUE_OPERATORS = ["Test Arena", "Home Team"];

const p = (o: Partial<ParkingFilter>): ParkingFilter => ({ ...EMPTY_PARKING_FILTER, ...o });
const shown = (parking: ParkingFilter, includeUnconfirmedAccess = false) =>
  applyDisplayFilters(ALL, { hiddenTypes: [], payment: EMPTY_PAYMENT_FILTER, parking, venueOperators: VENUE_OPERATORS, includeUnconfirmedAccess });
const ids = (fs: ParkingFacility[]) => fs.map((f) => f.id).sort();

describe("parking filter dimensions", () => {
  it("filter each dimension on its own", () => {
    expect(ids(shown(p({ access: ["public"] })).visible)).toEqual(["city-garage", "private-open", "yard"]);
    expect(ids(shown(p({ access: ["pass_required"] })).visible)).toEqual(["private-pass", "team-garage", "venue-pass"]);
    expect(ids(shown(p({ owner: ["public"] })).visible)).toEqual(["city-garage", "venue-pass"]);
    expect(ids(shown(p({ owner: ["private"] })).visible)).toEqual(["private-open", "private-pass", "yard"]);
    expect(ids(shown(p({ owner: ["venue"] })).visible)).toEqual(["team-garage", "venue-pass"]);
    expect(ids(shown(p({ form: ["garage"] })).visible)).toEqual(["city-garage", "team-garage"]);
    expect(ids(shown(p({ form: ["surface"] })).visible)).toEqual(["private-open", "private-pass", "reported", "unknown", "venue-pass"]);
    expect(shown(p({ form: ["street"] })).visible).toEqual([]);
  });

  it("combine across dimensions (AND) and within a dimension (OR)", () => {
    expect(ids(shown(p({ owner: ["public"], access: ["pass_required"] })).visible)).toEqual(["venue-pass"]);
    expect(ids(shown(p({ owner: ["private"], access: ["public"] })).visible)).toEqual(["private-open", "yard"]);
    expect(ids(shown(p({ owner: ["private"], access: ["public"], form: ["surface"] })).visible)).toEqual(["private-open"]);
    expect(ids(shown(p({ owner: ["venue"], form: ["garage"] })).visible)).toEqual(["team-garage"]);
    expect(ids(shown(p({ owner: ["public", "venue"], access: ["pass_required"] })).visible)).toEqual(["team-garage", "venue-pass"]);
    expect(ids(shown(p({ form: ["garage", "surface"], access: ["public"] })).visible)).toEqual(["city-garage", "private-open"]);
  });

  it("keep ownership separate from access", () => {
    // A publicly owned lot can be pass-only; a private lot can be open to anyone.
    expect(matchParkingFilter(venuePassLot, p({ owner: ["public"], access: ["public"] }))).toBe("excluded");
    expect(matchParkingFilter(privateOpenLot, p({ owner: ["private"], access: ["public"] }))).toBe("match");
  });

  it("show all eligible parking with no filter, never restricted lots", () => {
    const r = shown(EMPTY_PARKING_FILTER);
    expect(ids(r.visible)).toEqual(ids(ALL.filter((f) => f !== restricted)));
    expect(ids(r.restricted)).toEqual(["season-only"]);
    for (const f of [p({ access: ["public"] }), p({ owner: ["private"] }), p({ form: ["surface"] })]) expect(shown(f).visible).not.toContain(restricted);
  });

  it("never treat unknown or weakly reported facts as confirmed", () => {
    for (const f of [p({ access: ["public"] }), p({ access: ["pass_required"] }), p({ owner: ["public"] }), p({ owner: ["private"] })]) {
      expect(matchParkingFilter(unknown, f)).toBe("unknown");
      expect(matchParkingFilter(reportedOnly, f)).toBe("unknown");
    }
    // Venue-operated is decided by the lot's type or documented operator, so it's never "unknown".
    expect(matchParkingFilter(unknown, p({ owner: ["venue"] }), VENUE_OPERATORS)).toBe("excluded");
    expect(shown(p({ access: ["public"] })).hiddenUnknownAccess).toBe(2);
    expect(ownershipDisplay(unknown)).toMatchObject({ state: "unknown", text: "Ownership unknown" });
    expect(accessDisplay(unknown)).toMatchObject({ state: "unknown", text: "Access unknown" });
    expect(ownershipDisplay(reportedOnly).text).toMatch(/unconfirmed/);
    expect(accessDisplay(reportedOnly).state).toBe("reported");
  });

  it("show unconfirmed lots only on request, flagged as unconfirmed", () => {
    const r = shown(p({ access: ["public"] }), true);
    expect(ids(r.visible)).toEqual(["city-garage", "private-open", "reported", "unknown", "yard"]);
    expect(r.accessMatch.get("unknown")).toBe("unknown");
    expect(r.accessMatch.get("city-garage")).toBe("match");
    expect(r.hiddenUnknownAccess).toBe(0);
  });

  it("don't apply parking filters to shuttles and rideshare", () => {
    expect(shown(EMPTY_PARKING_FILTER).visible).toContain(shuttle);
    expect(shown(p({ owner: ["public"] })).visible).not.toContain(shuttle);
  });

  it("count one active filter per selected option", () => {
    expect(activeFilterCount(DEFAULT_PREFERENCES, [], EMPTY_PARKING_FILTER)).toBe(0);
    expect(activeFilterCount(DEFAULT_PREFERENCES, [], p({ owner: ["private"], access: ["public"], form: ["garage"] }))).toBe(3);
  });

  it("round-trip through the URL", () => {
    const url = new URL("https://x.test/venues/v");
    const f = p({ access: ["pass_required"], owner: ["public", "venue"], form: ["garage"] });
    writeParkingFilterParams(url, f);
    expect(url.search).toBe("?access=pass_required&owner=public%2Cvenue&form=garage");
    expect(parkingFilterFromParams(url.searchParams)).toEqual(f);
    expect(parkingFilterFromParams(new URLSearchParams("owner=bogus,private&form=moon"))).toEqual(p({ owner: ["private"] }));
    writeParkingFilterParams(url, EMPTY_PARKING_FILTER);
    expect(url.search).toBe("");
  });
});

const COMBOS: [string, ParkingFilter][] = [
  ["no filter", EMPTY_PARKING_FILTER],
  ["open to public", p({ access: ["public"] })],
  ["public + pass", p({ owner: ["public"], access: ["pass_required"] })],
  ["private + open + surface", p({ owner: ["private"], access: ["public"], form: ["surface"] })],
  ["venue + garage", p({ owner: ["venue"], form: ["garage"] })],
];

describe("map, cards and ranking stay in sync under parking filter combinations", () => {
  const venue = { ...VENUES.find((v) => v.slug === "highmark-stadium")!, location: { lat: 42.77, lng: -78.79, precision: "approximate" as const } };
  it.each(COMBOS)("%s", (_name, parking) => {
    const { visible } = shown(parking);
    const ranked = rankFacilities(venue, visible, DEFAULT_PREFERENCES);
    const markers = buildMarkers(visible, ranked);
    const visibleIds = new Set(visible.map((f) => f.id));
    expect(markers.every((m) => visibleIds.has(m.id))).toBe(true);
    expect(ranked.every((r) => visibleIds.has(r.facility.id))).toBe(true);
    expect(markers.map((m) => m.id).sort()).toEqual(ids(visible.filter((f) => f.location)));
  });

  it("never ranks a restricted lot, even if passed in directly", () => {
    const ranked = rankFacilities(venue, ALL, DEFAULT_PREFERENCES);
    expect(ranked.map((r) => r.facility.id)).not.toContain("season-only");
  });
});

describe("published ownership and access data", () => {
  const sourceIds = new Set(SOURCES.map((s) => s.id));
  const at = (venue: string) => FACILITIES.filter((f) => f.venueId === venue);
  const visible = (slug: string, parking: ParkingFilter) => {
    const v = VENUES.find((x) => x.slug === slug)!;
    return applyDisplayFilters(at(v.id), { hiddenTypes: [], payment: EMPTY_PAYMENT_FILTER, parking, venueOperators: [v.name, ...v.teams] })
      .visible.map((f) => f.slug)
      .sort();
  };

  it("cites a real source for every ownership and access fact", () => {
    for (const f of FACILITIES) {
      for (const x of [f.ownership, f.access]) {
        if (!x) continue;
        expect(x.attribution.sourceIds.length, f.id).toBeGreaterThan(0);
        for (const id of x.attribution.sourceIds) expect(sourceIds.has(id), `${f.id}: ${id}`).toBe(true);
      }
    }
  });

  it("Bills: official lots are venue-operated and pass-only; public ownership isn't confirmed", () => {
    const officialPass = ["blue-lot", "bronze-lot", "bus-limo-lot", "gold-lot", "gray-lot", "green-lot", "orange-lot", "platinum-lot", "white-lot"];
    expect(visible("highmark-stadium", p({ access: ["pass_required"] }))).toEqual(officialPass);
    expect(visible("highmark-stadium", p({ owner: ["venue"], access: ["pass_required"], form: ["surface"] }))).toEqual(officialPass);
    expect(visible("highmark-stadium", p({ owner: ["public"] }))).toEqual([]);
    // Private lots are reported private and open, but not confirmed open, so they aren't a match yet.
    expect(visible("highmark-stadium", p({ owner: ["private"], access: ["public"] }))).toEqual([]);
    expect(visible("highmark-stadium", p({ form: ["garage"] }))).toEqual([]);
  });

  it("KeyBank Center: garages vs surface lot, city ramp publicly owned, disputed ownership left unconfirmed", () => {
    expect(visible("keybank-center", p({ access: ["public"] }))).toEqual(["adam-ramp", "keybank-center-ramp", "keybank-center-surface-lot", "lecom-harborcenter-ramp"]);
    expect(visible("keybank-center", p({ access: ["public"], form: ["garage"] }))).toEqual(["adam-ramp", "keybank-center-ramp", "lecom-harborcenter-ramp"]);
    expect(visible("keybank-center", p({ owner: ["public"], form: ["garage"] }))).toEqual(["adam-ramp"]);
    expect(visible("keybank-center", p({ owner: ["venue"] }))).toEqual(["keybank-center-surface-lot"]);
    expect(visible("keybank-center", p({ owner: ["private"] }))).toEqual([]);
    const oneSeneca = at("keybank-center").find((f) => f.slug === "one-seneca-ramp")!;
    expect(ownershipDisplay(oneSeneca).state).toBe("reported");
    expect(accessDisplay(oneSeneca).state).toBe("unknown");
  });
});
