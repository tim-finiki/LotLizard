import type { ParkingFacility, Venue } from "@/lib/types";
import { atLeast } from "@/lib/confidence";
import { bestPrice } from "@/lib/ranking";

export const SITE_NAME = "LotLizard";

export function siteUrl(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined);
  return (env ?? "http://localhost:3000").replace(/\/$/, "");
}

export const venuePath = (v: Venue) => `/venues/${v.slug}`;
export const facilityPath = (v: Venue, f: ParkingFacility) => `/venues/${v.slug}/parking/${f.slug}`;
export const statePath = (code: string) => `/states/${code.toLowerCase()}`;

export function venueJsonLd(venue: Venue) {
  return {
    "@context": "https://schema.org",
    "@type": "StadiumOrArena",
    name: venue.name,
    url: siteUrl() + venuePath(venue),
    address: {
      "@type": "PostalAddress",
      streetAddress: venue.address.street,
      addressLocality: venue.address.city,
      addressRegion: venue.address.state,
      postalCode: venue.address.postalCode,
      addressCountry: "US",
    },
    geo: { "@type": "GeoCoordinates", latitude: venue.location.lat, longitude: venue.location.lng },
  };
}

/** Structured data for a lot. Prices are only included when confidence is at least "high". */
export function facilityJsonLd(venue: Venue, facility: ParkingFacility) {
  const price = bestPrice(facility, "car");
  return {
    "@context": "https://schema.org",
    "@type": "ParkingFacility",
    name: facility.name,
    url: siteUrl() + facilityPath(venue, facility),
    description: facility.description,
    ...(facility.address ? { address: facility.address } : {}),
    ...(facility.location
      ? { geo: { "@type": "GeoCoordinates", latitude: facility.location.lat, longitude: facility.location.lng } }
      : {}),
    ...(price && atLeast(price.attribution.confidence, "high")
      ? { priceRange: price.min === price.max ? `$${price.min}` : `$${price.min}-$${price.max}` }
      : {}),
    containedInPlace: { "@type": "StadiumOrArena", name: venue.name },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: siteUrl() + it.path })),
  };
}
