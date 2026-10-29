import type { AccessLevel, Attributed, Attribution, FacilityType, Ownership, ParkingFacility } from "@/lib/types";

/**
 * Ownership (who owns the lot) and access (who may park) are separate facts: a private lot can sell
 * to anyone, and a publicly owned lot can be pass-only. Each is confirmed only at medium confidence or
 * better; a weaker source is shown as "reported" and never satisfies a filter.
 */

export const OWNERSHIP_LABEL: Record<Ownership, string> = { public: "Publicly owned", private: "Privately owned" };
export const ACCESS_LABEL: Record<AccessLevel, string> = {
  public: "Open to the public",
  pass_required: "Pass or permit required",
  restricted: "Restricted",
};

export type ParkingTypeFilter = "all" | "open_to_public" | "public_owned" | "private_open" | "pass_required";

export const PARKING_TYPE_FILTERS: ParkingTypeFilter[] = ["all", "open_to_public", "public_owned", "private_open", "pass_required"];

export const PARKING_TYPE_FILTER_LABEL: Record<ParkingTypeFilter, string> = {
  all: "All eligible parking",
  open_to_public: "Open to public",
  public_owned: "Publicly owned",
  private_open: "Private, open to public",
  pass_required: "Pass/permit required",
};

export const PARKING_TYPE_FILTER_HINT: Record<ParkingTypeFilter, string> = {
  all: "Everything you can use, except lots reserved for specific people.",
  open_to_public: "Confirmed open to anyone, whoever owns it.",
  public_owned: "Confirmed owned by a city, county, state or public authority.",
  private_open: "Confirmed privately owned and open to anyone.",
  pass_required: "Confirmed to need a pass or permit issued in advance.",
};

export function isParkingTypeFilter(v: string | null | undefined): v is ParkingTypeFilter {
  return !!v && (PARKING_TYPE_FILTERS as string[]).includes(v);
}

const CONFIRMED = new Set<Attribution["confidence"]>(["verified", "high", "medium"]);

export type FactState = "confirmed" | "reported" | "unknown";

export function factState(f: Attributed<unknown> | undefined): FactState {
  if (!f) return "unknown";
  return CONFIRMED.has(f.attribution.confidence) ? "confirmed" : "reported";
}

/** The confirmed value, or undefined when unknown or only weakly reported. */
function confirmed<T>(f: Attributed<T> | undefined): T | undefined {
  return factState(f) === "confirmed" ? f!.value : undefined;
}

/**
 * Restricted lots (season-ticket holders, staff, residents) never appear in normal results or rankings.
 * A weak report is enough to keep a lot out: sending a fan to a lot they can't use is worse than omitting it.
 */
export function isRestricted(f: ParkingFacility): boolean {
  return f.access?.value === "restricted";
}

/** Shuttles and rideshare zones aren't parking, so ownership/access filters don't apply to them. */
const NOT_PARKING: FacilityType[] = ["shuttle", "rideshare_zone"];

export type AccessMatch = "match" | "excluded" | "unknown";

/** "unknown" means the lot could match but the deciding fact isn't confirmed (so it's hidden, and counted). */
export function matchParkingType(f: ParkingFacility, filter: ParkingTypeFilter): AccessMatch {
  if (isRestricted(f)) return "excluded";
  if (filter === "all") return "match";
  if (NOT_PARKING.includes(f.type)) return "excluded";
  const owner = confirmed(f.ownership);
  const access = confirmed(f.access);
  switch (filter) {
    case "open_to_public":
      return access === undefined ? "unknown" : access === "public" ? "match" : "excluded";
    case "pass_required":
      return access === undefined ? "unknown" : access === "pass_required" ? "match" : "excluded";
    case "public_owned":
      return owner === undefined ? "unknown" : owner === "public" ? "match" : "excluded";
    case "private_open":
      if (owner === "public" || (access !== undefined && access !== "public")) return "excluded";
      return owner === "private" && access === "public" ? "match" : "unknown";
  }
}

export interface FactDisplay {
  state: FactState;
  text: string;
  attribution?: Attribution;
}

export function ownershipDisplay(f: ParkingFacility): FactDisplay {
  const state = factState(f.ownership);
  if (state === "unknown" || !f.ownership) return { state, text: "Ownership unknown" };
  const label = OWNERSHIP_LABEL[f.ownership.value];
  return { state, text: state === "confirmed" ? label : `Reported ${label.toLowerCase()} (unconfirmed)`, attribution: f.ownership.attribution };
}

export function accessDisplay(f: ParkingFacility): FactDisplay {
  const state = factState(f.access);
  if (state === "unknown" || !f.access) return { state, text: "Access unknown" };
  const label = ACCESS_LABEL[f.access.value];
  return { state, text: state === "confirmed" ? label : `Reported: ${label.toLowerCase()} (unconfirmed)`, attribution: f.access.attribution };
}
