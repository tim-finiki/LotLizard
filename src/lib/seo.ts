import type { ParkingFacility, Venue, VenueEvent } from "@/lib/types";
import { UNIVERSAL_AMENITIES, UNIVERSAL_AMENITY_LABEL, featureState } from "@/lib/features";

export const SITE_NAME = "LotLizard";
export const SITE_DESCRIPTION =
  "Independent parking intelligence for stadiums, arenas and concert venues. Compare official and private lots by price, walking distance, tailgating and exit, with sources and confidence on every fact.";

export function siteUrl(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined);
  return (env ?? "http://localhost:3000").replace(/\/$/, "");
}

export const venuePath = (v: Venue) => `/venues/${v.slug}`;
export const facilityPath = (v: Venue, f: ParkingFacility) => `/venues/${v.slug}/parking/${f.slug}`;
export const statePath = (code: string) => `/states/${code.toLowerCase()}`;

/**
 * A venue page is worth indexing only when it carries real parking information. Directory-only
 * venues stay reachable (and followable) but `noindex` until parking data exists, so we never
 * publish thin, near-duplicate pages at scale.
 */
export const MIN_FACILITIES_TO_INDEX = 3;

/**
 * A parking option that tells a visitor something: backed by a non-editorial source and with at
 * least two known decision facts (where it is, price, how or when you pay, tailgating, walk time).
 */
export function isSubstantiveFacility(f: ParkingFacility): boolean {
  const sourced = f.attribution.sourceIds.some((id) => id !== "lotlizard-editorial");
  const known = [
    !!f.location || (!!f.address && /\d/.test(f.address)),
    f.prices.length > 0,
    !!f.payment && (!!f.payment.timing || f.payment.accepted.length > 0 || (f.payment.notAccepted?.length ?? 0) > 0),
    f.tailgating.allowed.value !== "unknown",
    !!f.walkMinutes,
  ].filter(Boolean).length;
  return sourced && known >= 2;
}

export function substantiveFacilities(facilities: ParkingFacility[]): ParkingFacility[] {
  return facilities.filter(isSubstantiveFacility);
}

export function isIndexableVenue(venue: Venue, facilities: ParkingFacility[]): boolean {
  return venue.coverage !== "venue_only" && substantiveFacilities(facilities).length >= MIN_FACILITIES_TO_INDEX;
}

/** Robots metadata for pages that should be crawled for links but kept out of the index. */
export const NOINDEX_FOLLOW = { index: false, follow: true } as const;

function absolute(path: string) {
  return siteUrl() + path;
}

function postalAddress(venue: Venue) {
  return {
    "@type": "PostalAddress",
    ...(venue.address.street ? { streetAddress: venue.address.street } : {}),
    addressLocality: venue.address.city,
    addressRegion: venue.address.state,
    ...(venue.address.postalCode ? { postalCode: venue.address.postalCode } : {}),
    addressCountry: "US",
  };
}

/** "2026-11-26" + "20:20" in America/New_York → "2026-11-26T20:20:00-05:00". */
export function zonedDateTime(date: string, hhmm: string, timeZone: string): string {
  const probe = new Date(`${date}T${hhmm}:00Z`);
  const part = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" })
    .formatToParts(probe)
    .find((p) => p.type === "timeZoneName")?.value;
  const offset = part === "GMT" || !part ? "+00:00" : part.replace("GMT", "");
  return `${date}T${hhmm}:00${offset}`;
}

/**
 * Venue structured data. Lists only parking options we actually publish (containsPlace) and events
 * from the sourced schedule. No ratings, offers or prices: we don't sell tickets or parking, and
 * none of our prices is verified enough for markup.
 */
export function venueJsonLd(venue: Venue, facilities: ParkingFacility[] = [], events: VenueEvent[] = []) {
  const place = {
    "@type": "StadiumOrArena",
    name: venue.name,
    url: absolute(venuePath(venue)),
    address: postalAddress(venue),
  };
  return {
    "@context": "https://schema.org",
    ...place,
    // Venue coordinates are well established even when lot pins are approximate.
    geo: { "@type": "GeoCoordinates", latitude: venue.location.lat, longitude: venue.location.lng },
    ...(facilities.length > 0
      ? {
          containsPlace: facilities.map((f) => ({
            "@type": "ParkingFacility",
            name: f.name,
            url: absolute(facilityPath(venue, f)),
          })),
        }
      : {}),
    ...(events.length > 0
      ? {
          event: events.map((e) => ({
            "@type": "SportsEvent",
            name: e.name,
            startDate: e.startLocal && venue.timezone ? zonedDateTime(e.date, e.startLocal, venue.timezone) : e.date,
            eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
            location: place,
          })),
        }
      : {}),
  };
}

/**
 * Lot structured data, limited to what the page shows and the data supports:
 * - `geo` only for surveyed (exact) entrances, never approximate editorial pins;
 * - `amenityFeature` only for confirmed available/unavailable universal amenities;
 * - no price, rating or availability claims (ParkingFacility has no priceRange property, and we
 *   don't mark up unverified prices).
 */
export function facilityJsonLd(venue: Venue, facility: ParkingFacility) {
  const amenityFeature = UNIVERSAL_AMENITIES.filter((k) => featureState(facility, k) !== "unknown").map((k) => ({
    "@type": "LocationFeatureSpecification",
    name: UNIVERSAL_AMENITY_LABEL[k],
    value: featureState(facility, k) === "available",
  }));
  return {
    "@context": "https://schema.org",
    "@type": "ParkingFacility",
    name: facility.name,
    url: absolute(facilityPath(venue, facility)),
    description: facility.description,
    ...(facility.address ? { address: facility.address } : {}),
    ...(facility.location?.precision === "exact"
      ? { geo: { "@type": "GeoCoordinates", latitude: facility.location.lat, longitude: facility.location.lng } }
      : {}),
    ...(amenityFeature.length > 0 ? { amenityFeature } : {}),
    containedInPlace: { "@type": "StadiumOrArena", name: venue.name, url: absolute(venuePath(venue)) },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: absolute(it.path) })),
  };
}

/** Site identity for the home page. Logo is added once the approved mascot asset exists. */
export function siteJsonLd() {
  const url = absolute("/");
  return [
    { "@context": "https://schema.org", "@type": "WebSite", name: SITE_NAME, url, description: SITE_DESCRIPTION },
    { "@context": "https://schema.org", "@type": "Organization", name: SITE_NAME, url },
  ];
}
