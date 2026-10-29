import { describe, expect, it } from "vitest";
import type { AccessLevel, ConfidenceLevel, FacilityType, Ownership, ParkingFacility } from "@/lib/types";
import { attr, fact } from "@/lib/data/attr";
import { FACILITIES, SOURCES, VENUES } from "@/lib/data/catalog";
import { DEFAULT_PREFERENCES, rankFacilities } from "@/lib/ranking";
import { activeFilterCount, applyDisplayFilters, buildMarkers } from "@/lib/explorer";
import { EMPTY_PAYMENT_FILTER } from "@/lib/payment";
import { accessDisplay, matchParkingType, ownershipDisplay, PARKING_TYPE_FILTERS, type ParkingTypeFilter } from "@/lib/access";

function lot(
  id: string,
  o: { owner?: [Ownership, ConfidenceLevel]; access?: [AccessLevel, ConfidenceLevel]; type?: FacilityType; walk?: number } = {},
): ParkingFacility {
  return {
    id,
    slug: id,
    venueId: "v",
    name: id,
    type: o.type ?? "private_lot",
    ...(o.owner ? { ownership: fact(o.owner[0], o.owner[1], ["s"]) } : {}),
    ...(o.access ? { access: fact(o.access[0], o.access[1], ["s"]) } : {}),
    location: { lat: 42.77, lng: -78.79, precision: "approximate" },
    description: "",
    ...(o.walk !== undefined ? { walkMinutes: fact(o.walk, "medium", ["s"]) } : {}),
    prices: [],
    amenities: fact([], "low", ["s"]),
    tailgating: { allowed: fact<boolean | "unknown">(true, "medium", ["s"]) },
    exit: {},
    vehicleTypes: ["car"],
    attribution: attr("low", ["s"]),
  };
}

const publicCity = lot("city-ramp", { owner: ["public", "medium"], access: ["public", "high"] });
const privateOpen = lot("private-open", { owner: ["private", "medium"], access: ["public", "medium"] });
const publicPassOnly = lot("public-pass", { owner: ["public", "high"], access: ["pass_required", "medium"] });
const privatePass = lot("private-pass", { owner: ["private", "medium"], access: ["pass_required", "medium"] });
const restricted = lot("season-only", { owner: ["private", "medium"], access: ["restricted", "low"] });
const unknown = lot("unknown");
const reportedOnly = lot("reported", { owner: ["private", "low"], access: ["public", "low"] });
const shuttle = lot("shuttle", { type: "shuttle", owner: ["public", "high"], access: ["public", "high"] });
const ALL = [publicCity, privateOpen, publicPassOnly, privatePass, restricted, unknown, reportedOnly, shuttle];

const shown = (filter: ParkingTypeFilter, includeUnconfirmedAccess = false) =>
  applyDisplayFilters(ALL, { hiddenTypes: [], payment: EMPTY_PAYMENT_FILTER, parkingType: filter, includeUnconfirmedAccess });
const ids = (fs: ParkingFacility[]) => fs.map((f) => f.id).sort();

describe("parking type filters", () => {
  it("keep ownership separate from access", () => {
    expect(ids(shown("public_owned").visible)).toEqual(["city-ramp", "public-pass"]);
    expect(ids(shown("open_to_public").visible)).toEqual(["city-ramp", "private-open"]);
    expect(ids(shown("private_open").visible)).toEqual(["private-open"]);
    expect(ids(shown("pass_required").visible)).toEqual(["private-pass", "public-pass"]);
  });

  it("show all eligible parking by default, never restricted lots", () => {
    const r = shown("all");
    expect(ids(r.visible)).toEqual(ids(ALL.filter((f) => f !== restricted)));
    expect(ids(r.restricted)).toEqual(["season-only"]);
    for (const f of PARKING_TYPE_FILTERS) expect(shown(f).visible).not.toContain(restricted);
  });

  it("never treat unknown or weakly reported facts as confirmed", () => {
    for (const f of PARKING_TYPE_FILTERS.filter((x) => x !== "all")) {
      expect(matchParkingType(unknown, f)).toBe("unknown");
      expect(matchParkingType(reportedOnly, f)).not.toBe("match");
    }
    expect(shown("open_to_public").hiddenUnknownAccess).toBe(2);
    expect(ownershipDisplay(unknown)).toMatchObject({ state: "unknown", text: "Ownership unknown" });
    expect(accessDisplay(unknown)).toMatchObject({ state: "unknown", text: "Access unknown" });
    expect(ownershipDisplay(reportedOnly).text).toMatch(/unconfirmed/);
    expect(accessDisplay(reportedOnly).state).toBe("reported");
  });

  it("show unconfirmed lots only on request, flagged as unconfirmed", () => {
    const r = shown("open_to_public", true);
    expect(ids(r.visible)).toEqual(["city-ramp", "private-open", "reported", "unknown"]);
    expect(r.accessMatch.get("unknown")).toBe("unknown");
    expect(r.accessMatch.get("city-ramp")).toBe("match");
    expect(r.hiddenUnknownAccess).toBe(0);
  });

  it("don't apply ownership or access filters to shuttles and rideshare", () => {
    expect(shown("all").visible).toContain(shuttle);
    expect(shown("public_owned").visible).not.toContain(shuttle);
  });

  it("count as one active filter", () => {
    expect(activeFilterCount(DEFAULT_PREFERENCES, [], "all")).toBe(0);
    expect(activeFilterCount(DEFAULT_PREFERENCES, [], "private_open")).toBe(1);
  });
});

describe("map, cards and ranking stay in sync under parking type filters", () => {
  const venue = { ...VENUES.find((v) => v.slug === "highmark-stadium")!, location: { lat: 42.77, lng: -78.79, precision: "approximate" as const } };
  it.each(PARKING_TYPE_FILTERS)("%s", (filter) => {
    const { visible } = shown(filter);
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
  const visible = (venue: string, parkingType: ParkingTypeFilter) =>
    applyDisplayFilters(at(venue), { hiddenTypes: [], payment: EMPTY_PAYMENT_FILTER, parkingType }).visible.map((f) => f.slug).sort();

  it("cites a real source for every ownership and access fact", () => {
    for (const f of FACILITIES) {
      for (const x of [f.ownership, f.access]) {
        if (!x) continue;
        expect(x.attribution.sourceIds.length, f.id).toBeGreaterThan(0);
        for (const id of x.attribution.sourceIds) expect(sourceIds.has(id), `${f.id}: ${id}`).toBe(true);
      }
    }
  });

  it("Bills: official lots are pass-only; their public ownership isn't confirmed", () => {
    expect(visible("highmark-stadium", "pass_required")).toEqual(
      ["blue-lot", "bronze-lot", "bus-limo-lot", "gold-lot", "gray-lot", "green-lot", "orange-lot", "platinum-lot", "white-lot"],
    );
    expect(visible("highmark-stadium", "public_owned")).toEqual([]);
    // Private lots are reported private and open, but not confirmed open, so they aren't a match yet.
    expect(visible("highmark-stadium", "private_open")).toEqual([]);
  });

  it("KeyBank Center: open lots by source, city ramp publicly owned, disputed ownership left unconfirmed", () => {
    expect(visible("keybank-center", "open_to_public")).toEqual(["adam-ramp", "keybank-center-ramp", "keybank-center-surface-lot", "lecom-harborcenter-ramp"]);
    expect(visible("keybank-center", "public_owned")).toEqual(["adam-ramp"]);
    expect(visible("keybank-center", "private_open")).toEqual([]);
    const oneSeneca = at("keybank-center").find((f) => f.slug === "one-seneca-ramp")!;
    expect(ownershipDisplay(oneSeneca).state).toBe("reported");
    expect(accessDisplay(oneSeneca).state).toBe("unknown");
  });
});
