import type { GeoPoint } from "@/lib/types";

export interface DirectionsLinks {
  google: string;
  apple: string;
  /** What the link navigates to — shown to users so they know how precise it is. */
  basis: "exact_pin" | "street_address";
}

/**
 * Navigation links only when the destination is reliable: an exact (surveyed) pin, or a sourced
 * street address. Approximate editorial pins never produce directions.
 */
export function directionsLinks(target: { location?: GeoPoint; address?: string }): DirectionsLinks | null {
  if (target.location?.precision === "exact") {
    const ll = `${target.location.lat},${target.location.lng}`;
    return {
      google: `https://www.google.com/maps/dir/?api=1&destination=${ll}`,
      apple: `https://maps.apple.com/?daddr=${ll}`,
      basis: "exact_pin",
    };
  }
  if (target.address && isStreetAddress(target.address)) {
    const q = encodeURIComponent(target.address);
    return {
      google: `https://www.google.com/maps/dir/?api=1&destination=${q}`,
      apple: `https://maps.apple.com/?daddr=${q}`,
      basis: "street_address",
    };
  }
  return null;
}

/** A house number followed by a street name, and not flagged as unconfirmed. */
export function isStreetAddress(address: string): boolean {
  return /^\d+\s+\S+/.test(address.trim()) && !/unconfirmed/i.test(address);
}
