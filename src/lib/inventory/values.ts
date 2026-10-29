import type { Amenity, EventKind, FacilityType, PaymentMethod, PaymentTiming, VehicleType, VenueType } from "@/lib/types";
import { US_STATES } from "@/lib/states";

/**
 * Typed readers for the string values stored in facts. Each throws a readable error on bad input, so
 * the same functions validate imports and convert inventory to the domain model.
 */

const FACILITY_TYPES: FacilityType[] = ["official_lot", "private_lot", "garage", "independent", "residential", "shuttle", "rideshare_zone", "ada"];
const VENUE_TYPES: VenueType[] = ["stadium", "arena", "ballpark", "amphitheater", "concert_venue", "speedway", "college_stadium"];
const VEHICLES: VehicleType[] = ["car", "rv", "bus", "limo", "motorcycle"];
const PAYMENT_METHODS: PaymentMethod[] = ["cash", "card", "venmo", "paypal", "zelle", "mobile_wallet", "other"];
const TIMINGS: PaymentTiming[] = ["pay_on_arrival", "advance_optional", "prepay_required"];
const AMENITIES: Amenity[] = ["lighting", "paved", "grass", "security", "shuttle_service", "food_vendors", "rv_friendly", "tailgate_area"];
const EVENT_KINDS: EventKind[] = ["nfl_regular", "nfl_playoff", "concert", "college", "other", "any"];

function oneOf<T extends string>(allowed: readonly T[], what: string) {
  return (v: string): T => {
    const t = v.trim() as T;
    if (!allowed.includes(t)) throw new Error(`${what} must be one of ${allowed.join(", ")} (got "${v}")`);
    return t;
  };
}

function listOf<T extends string>(allowed: readonly T[], what: string) {
  const one = oneOf(allowed, what);
  return (v: string): T[] => {
    const items = v.split(";").map((s) => s.trim()).filter(Boolean);
    if (items.length === 0) throw new Error(`${what} list is empty`);
    return [...new Set(items.map(one))];
  };
}

function number(min: number, max: number, what: string) {
  return (v: string): number => {
    const n = Number(v.trim());
    if (!Number.isFinite(n) || n < min || n > max) throw new Error(`${what} must be a number between ${min} and ${max} (got "${v}")`);
    return n;
  };
}

function text(what: string, maxLength = 2000) {
  return (v: string): string => {
    const t = v.trim();
    if (!t) throw new Error(`${what} is empty`);
    if (t.length > maxLength) throw new Error(`${what} is longer than ${maxLength} characters`);
    return t;
  };
}

export interface ParsedLocation {
  lat: number;
  lng: number;
  precision: "exact" | "approximate";
}

export function parseLocation(v: string): ParsedLocation {
  const [lat, lng, precision] = v.split(",").map((s) => s.trim());
  return {
    lat: number(18, 72, "latitude")(lat ?? ""),
    lng: number(-180, -64, "longitude")(lng ?? ""),
    precision: oneOf(["exact", "approximate"] as const, "location precision")(precision ?? ""),
  };
}

export interface ParsedPrice {
  min: number;
  max: number;
  vehicle: VehicleType;
  eventKind: EventKind;
  scope: "lot" | "area";
  season?: string;
}

/** `min=40;max=60;vehicle=car;scope=lot;event=nfl_regular;season=2026` */
export function parsePrice(v: string): ParsedPrice {
  const kv = Object.fromEntries(
    v.split(";").map((p) => {
      const [k, ...rest] = p.split("=");
      return [k.trim(), rest.join("=").trim()];
    }),
  );
  const known = new Set(["min", "max", "vehicle", "scope", "event", "season"]);
  for (const k of Object.keys(kv)) if (!known.has(k)) throw new Error(`unknown price attribute "${k}"`);
  const min = number(0, 500, "price min")(kv.min ?? "");
  const max = number(0, 500, "price max")(kv.max ?? kv.min ?? "");
  if (min > max) throw new Error(`price min ${min} is above max ${max}`);
  return {
    min,
    max,
    vehicle: oneOf(VEHICLES, "price vehicle")(kv.vehicle ?? "car"),
    eventKind: oneOf(EVENT_KINDS, "price event")(kv.event ?? "any"),
    scope: oneOf(["lot", "area"] as const, "price scope")(kv.scope ?? "lot"),
    ...(kv.season ? { season: kv.season } : {}),
  };
}

export const priceKey = (p: ParsedPrice) => [p.vehicle, p.eventKind, p.scope, p.season ?? ""].join("|");

const availability = oneOf(["available", "unavailable"] as const, "amenity state");

/** Field name → reader. Unknown field names are rejected by the importer. */
export const FIELD_READERS = {
  // venue
  venue_name: text("venue name", 200),
  venue_type: oneOf(VENUE_TYPES, "venue type"),
  teams: (v: string) => v.split(";").map((s) => s.trim()).filter(Boolean),
  street: text("street", 200),
  city: text("city", 100),
  state: (v: string) => {
    const s = v.trim().toUpperCase();
    if (!US_STATES[s]) throw new Error(`state must be a US state code (got "${v}")`);
    return s;
  },
  postal_code: (v: string) => {
    if (!/^\d{5}(-\d{4})?$/.test(v.trim())) throw new Error(`postal code must be a US ZIP (got "${v}")`);
    return v.trim();
  },
  lat: number(18, 72, "latitude"),
  lng: number(-180, -64, "longitude"),
  timezone: (v: string) => {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: v.trim() });
    } catch {
      throw new Error(`unknown time zone "${v}"`);
    }
    return v.trim();
  },
  summary: text("summary", 600),
  lot_open_hours_before: number(0, 24, "lot opening hours"),
  policy: text("policy body"),
  transit: text("transit description"),
  // lot
  name: text("name", 120),
  type: oneOf(FACILITY_TYPES, "lot type"),
  operator: text("operator", 120),
  address: text("address", 200),
  aliases: (v: string) => v.split(";").map((s) => s.trim()).filter(Boolean),
  description: text("description", 600),
  location: parseLocation,
  walk_minutes: number(0, 120, "walk minutes"),
  price: parsePrice,
  payment_timing: oneOf(TIMINGS, "payment timing"),
  payment_accepted: listOf(PAYMENT_METHODS, "payment method"),
  payment_not_accepted: listOf(PAYMENT_METHODS, "payment method"),
  tailgating: oneOf(["yes", "no"] as const, "tailgating"),
  tailgating_notes: text("tailgating notes", 600),
  ada: availability,
  covered: availability,
  ev_charging: availability,
  restrooms: availability,
  vehicle_types: listOf(VEHICLES, "vehicle type"),
  amenities: listOf(AMENITIES, "amenity"),
} as const;

export type FieldName = keyof typeof FIELD_READERS;

export function readField<F extends FieldName>(field: F, value: string): ReturnType<(typeof FIELD_READERS)[F]> {
  return FIELD_READERS[field](value) as ReturnType<(typeof FIELD_READERS)[F]>;
}
