import type { Attribution, GeoPoint, VehicleEntrance } from "@/lib/types";
import { factState } from "@/lib/access";

export type DirectionsBasis = "verified_entrance" | "entrance_address" | "exact_pin" | "street_address";

export interface DirectionsLinks {
  google: string;
  apple: string;
  /** What the link navigates to — shown to users so they know how precise it is. */
  basis: DirectionsBasis;
  /** True when the address routed to comes from a source below medium confidence. */
  unverifiedAddress?: boolean;
}

/** "to the lot's street address (not yet verified)" etc. */
export function directionsLabel(l: DirectionsLinks): string {
  return `${DIRECTIONS_BASIS_LABEL[l.basis]}${l.unverifiedAddress ? " (address not yet verified)" : ""}`;
}

const weak = (a?: Attribution) => !!a && factState({ value: null, attribution: a }) !== "confirmed";

/** Plain-language destination for each basis, shown next to the links. */
export const DIRECTIONS_BASIS_LABEL: Record<DirectionsBasis, string> = {
  verified_entrance: "to the verified vehicle entrance",
  entrance_address: "to the vehicle entrance address",
  exact_pin: "to the lot's surveyed location",
  street_address: "to the lot's street address",
};

function links(destination: string, basis: DirectionsBasis): DirectionsLinks {
  return {
    google: `https://www.google.com/maps/dir/?api=1&destination=${destination}`,
    apple: `https://maps.apple.com/?daddr=${destination}`,
    basis,
  };
}

/**
 * Coordinates that may be used for turn-by-turn navigation: a verified entrance that was pinned or
 * surveyed. Geocoded coordinates are approximate (an address's centroid, not the driveway) and
 * unverified pins aren't confirmed, so neither is ever routed to.
 */
export function navigableEntrance(entrance?: VehicleEntrance): { lat: number; lng: number } | undefined {
  const loc = entrance?.location;
  if (!loc || entrance.verification !== "verified" || loc.method === "geocoded") return undefined;
  return { lat: loc.lat, lng: loc.lng };
}

/**
 * Navigation links only when the destination is reliable, in this order:
 * 1. a verified vehicle-entrance pin;
 * 2. the vehicle entrance's street address (unless it's flagged for review);
 * 3. an exact (surveyed) pin for the lot itself;
 * 4. the lot's official street address.
 * Approximate editorial pins, geocoded coordinates and unverified pins never produce directions.
 */
export function directionsLinks(target: {
  location?: GeoPoint;
  address?: string;
  addressAttribution?: Attribution;
  entrance?: VehicleEntrance;
}): DirectionsLinks | null {
  const entrancePin = navigableEntrance(target.entrance);
  if (entrancePin) return links(`${entrancePin.lat},${entrancePin.lng}`, "verified_entrance");
  // A sourced entrance address is usable even before LotLizard verifies it, unless it's under review.
  if (target.entrance?.address && target.entrance.verification !== "needs_review" && isStreetAddress(target.entrance.address)) {
    return { ...links(encodeURIComponent(target.entrance.address), "entrance_address"), ...(weak(target.entrance.attribution) ? { unverifiedAddress: true } : {}) };
  }
  if (target.location?.precision === "exact") return links(`${target.location.lat},${target.location.lng}`, "exact_pin");
  if (target.address && isStreetAddress(target.address)) {
    return { ...links(encodeURIComponent(target.address), "street_address"), ...(weak(target.addressAttribution) ? { unverifiedAddress: true } : {}) };
  }
  return null;
}

/** A house number followed by a street name, and not flagged as unconfirmed. */
export function isStreetAddress(address: string): boolean {
  return /^\d+\s+\S+/.test(address.trim()) && !/unconfirmed/i.test(address);
}
