import type { AccessLevel, Attributed, Attribution, FacilityType, Ownership, ParkingFacility } from "@/lib/types";
import { effectivePayment } from "@/lib/payment";

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

/**
 * Independent filter dimensions inside the normal parking search. Options within a dimension are
 * alternatives (OR); dimensions combine (AND), e.g. "publicly owned" + "pass required" + "garage".
 * An empty dimension doesn't filter.
 * - access: who may park (open to anyone, or a pass/permit issued in advance)
 * - reservation: whether you must book or prepay before arriving (separate from passes)
 * - owner ("lot type"): publicly owned, privately owned, venue-operated
 * - form ("facility type"): surface lot, garage, street
 */
export type AccessOption = "public" | "pass_required";
export type ReservationOption = "required" | "not_required";
export type OwnerOption = "public" | "private" | "venue";
export type FormOption = "surface" | "garage" | "street";

export interface ParkingFilter {
  access: AccessOption[];
  reservation: ReservationOption[];
  owner: OwnerOption[];
  form: FormOption[];
}

export const EMPTY_PARKING_FILTER: ParkingFilter = { access: [], reservation: [], owner: [], form: [] };

export const ACCESS_OPTIONS: AccessOption[] = ["public", "pass_required"];
export const RESERVATION_OPTIONS: ReservationOption[] = ["required", "not_required"];
export const OWNER_OPTIONS: OwnerOption[] = ["public", "private", "venue"];
export const FORM_OPTIONS: FormOption[] = ["surface", "garage", "street"];

export const ACCESS_OPTION_LABEL: Record<AccessOption, string> = { public: "Open to public", pass_required: "Pass/permit required" };
export const RESERVATION_OPTION_LABEL: Record<ReservationOption, string> = { required: "Reservation required", not_required: "No reservation needed" };
export const OWNER_OPTION_LABEL: Record<OwnerOption, string> = { public: "Publicly owned", private: "Privately owned", venue: "Venue-operated" };
export const FORM_OPTION_LABEL: Record<FormOption, string> = { surface: "Surface lot", garage: "Garage", street: "Street" };

export const parkingFilterCount = (p: ParkingFilter) => p.access.length + p.reservation.length + p.owner.length + p.form.length;

/** URL form: `access=pass_required&reservation=not_required&owner=venue&form=garage`. Unknown values are dropped. */
export function parkingFilterFromParams(q: URLSearchParams): ParkingFilter {
  const read = <T extends string>(key: string, allowed: T[]) =>
    (q.get(key) ?? "").split(",").filter((v): v is T => (allowed as string[]).includes(v));
  return {
    access: read("access", ACCESS_OPTIONS),
    reservation: read("reservation", RESERVATION_OPTIONS),
    owner: read("owner", OWNER_OPTIONS),
    form: read("form", FORM_OPTIONS),
  };
}

export function writeParkingFilterParams(url: URL, p: ParkingFilter) {
  for (const [key, values] of Object.entries(p) as [keyof ParkingFilter, string[]][]) {
    if (values.length) url.searchParams.set(key, values.join(","));
    else url.searchParams.delete(key);
  }
}

/** Shuttles and rideshare zones aren't parking, so these filters don't apply to them. */
const NOT_PARKING: FacilityType[] = ["shuttle", "rideshare_zone"];

/**
 * Structure, derived from the lot's sourced type: garages are garages, and lots (official, private,
 * independent, ADA) are surface lots. Residential spots (driveways, yards) are neither. No street
 * parking is listed yet, so "street" matches nothing until street facilities exist.
 */
export function parkingForm(f: ParkingFacility): FormOption | undefined {
  if (f.type === "garage") return "garage";
  if (f.type === "official_lot" || f.type === "private_lot" || f.type === "independent" || f.type === "ada") return "surface";
  return undefined;
}

/** Run by the venue or its team: an official lot, or a lot whose documented operator is the venue or a home team. */
export function isVenueOperated(f: ParkingFacility, venueOperators: string[] = []): boolean {
  return f.type === "official_lot" || (!!f.operator && venueOperators.includes(f.operator));
}

/**
 * Whether you must book or prepay before arriving, from the lot's sourced payment timing (for the
 * selected event when it has its own policy): "prepay required" means yes; "pay on arrival" and
 * "advance optional" mean no. Undefined when timing is unknown. Carries the timing's attribution.
 */
export function reservationRequired(f: ParkingFacility, eventId?: string): Attributed<boolean> | undefined {
  const policy = effectivePayment(f, eventId).policy;
  if (!policy?.timing) return undefined;
  return { value: policy.timing === "prepay_required", attribution: policy.attribution };
}

export type AccessMatch = "match" | "excluded" | "unknown";

/** "unknown" means the lot could match but a deciding fact isn't confirmed (so it's hidden, and counted). */
export function matchParkingFilter(f: ParkingFacility, p: ParkingFilter, venueOperators: string[] = [], eventId?: string): AccessMatch {
  if (isRestricted(f)) return "excluded";
  if (parkingFilterCount(p) === 0) return "match";
  if (NOT_PARKING.includes(f.type)) return "excluded";
  const results: AccessMatch[] = [];

  if (p.access.length) {
    const access = confirmed(f.access);
    results.push(access === undefined ? "unknown" : (p.access as string[]).includes(access) ? "match" : "excluded");
  }
  if (p.reservation.length) {
    const required = confirmed(reservationRequired(f, eventId));
    results.push(required === undefined ? "unknown" : p.reservation.includes(required ? "required" : "not_required") ? "match" : "excluded");
  }
  if (p.owner.length) {
    const owner = confirmed(f.ownership);
    const venue = p.owner.includes("venue") && isVenueOperated(f, venueOperators);
    const byOwner = owner !== undefined && (p.owner as string[]).includes(owner);
    const ownerQuestion = p.owner.some((o) => o !== "venue");
    results.push(venue || byOwner ? "match" : ownerQuestion && owner === undefined ? "unknown" : "excluded");
  }
  if (p.form.length) {
    const form = parkingForm(f);
    results.push(form && p.form.includes(form) ? "match" : "excluded");
  }
  return results.includes("excluded") ? "excluded" : results.includes("unknown") ? "unknown" : "match";
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
