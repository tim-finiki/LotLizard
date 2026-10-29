import type { AmenityFact, AvailabilityState, ParkingFacility, UniversalAmenity } from "@/lib/types";

/** Shown in this order in the Filters panel, on cards and on lot pages, for every venue. */
export const UNIVERSAL_AMENITIES = ["covered", "ev_charging", "ada", "restrooms"] as const satisfies readonly UniversalAmenity[];

export const UNIVERSAL_AMENITY_LABEL: Record<UniversalAmenity, string> = {
  covered: "Covered parking",
  ev_charging: "EV charging",
  ada: "Accessible (ADA) parking",
  restrooms: "On-site restrooms",
};

/** Short labels for compact card badges. */
export const UNIVERSAL_AMENITY_SHORT: Record<UniversalAmenity, string> = {
  covered: "Covered",
  ev_charging: "EV",
  ada: "ADA",
  restrooms: "Restrooms",
};

export const AVAILABILITY_LABEL: Record<AvailabilityState, string> = {
  available: "Available",
  unavailable: "Not available",
  unknown: "Unknown",
};

export function featureFact(f: ParkingFacility, key: UniversalAmenity): AmenityFact | undefined {
  return f.features?.[key];
}

export function featureState(f: ParkingFacility, key: UniversalAmenity): AvailabilityState {
  return f.features?.[key]?.state ?? "unknown";
}

/**
 * Required amenities (AND). "match" only when every one is confirmed available; "excluded" when any is
 * confirmed unavailable; otherwise "unknown". Unknown never counts as a match.
 */
export function matchFeatures(f: ParkingFacility, required: readonly UniversalAmenity[]): "match" | "unknown" | "excluded" {
  const states = required.map((k) => featureState(f, k));
  if (states.includes("unavailable")) return "excluded";
  if (states.includes("unknown")) return "unknown";
  return "match";
}
