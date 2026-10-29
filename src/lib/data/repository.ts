import type { ParkingFacility, Sponsorship, SponsorshipPlacement, Venue, VenueEvent } from "@/lib/types";
import { EVENTS } from "@/lib/data/events";
import { VENUES } from "@/lib/data/venues";
import { HIGHMARK_FACILITIES } from "@/lib/data/facilities/highmark";
import { SOURCES } from "@/lib/data/sources";

/**
 * Repository over curated data. Every page and API reads through these functions so the
 * backing store (today: typed seed files; later: Postgres/PostGIS) can change in one place.
 */

const FACILITIES: ParkingFacility[] = [...HIGHMARK_FACILITIES];
/** Sponsorships are always labelled and never affect ranking. None are active in the pilot. */
const SPONSORSHIPS: Sponsorship[] = [];

export async function listVenues(): Promise<Venue[]> {
  "use cache";
  return [...VENUES].sort(
    (a, b) => Number(b.coverage === "pilot_detailed") - Number(a.coverage === "pilot_detailed") || a.name.localeCompare(b.name),
  );
}

export async function getVenue(slug: string): Promise<Venue | undefined> {
  "use cache";
  return VENUES.find((v) => v.slug === slug);
}

export async function listFacilities(venueId: string): Promise<ParkingFacility[]> {
  "use cache";
  return FACILITIES.filter((f) => f.venueId === venueId);
}

export async function listEvents(venueId: string): Promise<VenueEvent[]> {
  "use cache";
  return EVENTS.filter((e) => e.venueId === venueId).sort((a, b) => a.date.localeCompare(b.date));
}

export async function getFacility(venueSlug: string, facilitySlug: string) {
  "use cache";
  const venue = VENUES.find((v) => v.slug === venueSlug);
  if (!venue) return undefined;
  const facility = FACILITIES.find((f) => f.venueId === venue.id && f.slug === facilitySlug);
  return facility ? { venue, facility } : undefined;
}

export async function listAllFacilityParams(): Promise<{ venue: string; lot: string }[]> {
  "use cache";
  return FACILITIES.map((f) => ({ venue: VENUES.find((v) => v.id === f.venueId)!.slug, lot: f.slug }));
}

export async function listStatesWithVenues(): Promise<string[]> {
  "use cache";
  return [...new Set(VENUES.map((v) => v.address.state))].sort();
}

export async function listVenuesByState(state: string): Promise<Venue[]> {
  "use cache";
  return (await listVenues()).filter((v) => v.address.state === state.toUpperCase());
}

export async function getSourcesFor(ids: string[]) {
  "use cache";
  const wanted = new Set(ids);
  return SOURCES.filter((s) => wanted.has(s.id));
}

export async function getSponsorships(placement: SponsorshipPlacement, venueId?: string, now = new Date().toISOString()) {
  return SPONSORSHIPS.filter(
    (s) => s.placement === placement && (!s.venueId || s.venueId === venueId) && s.startsAt <= now && now <= s.endsAt,
  );
}

/** Facility IDs that exist, for validating submissions. */
export function facilityExists(venueSlug: string, facilitySlug?: string): boolean {
  const venue = VENUES.find((v) => v.slug === venueSlug);
  if (!venue) return false;
  return !facilitySlug || FACILITIES.some((f) => f.venueId === venue.id && f.slug === facilitySlug);
}

/** Every source ID referenced by one facility. */
export function facilitySourceIds(f: ParkingFacility): string[] {
  return [
    f.attribution,
    f.amenities.attribution,
    f.payment?.attribution,
    ...Object.values(f.features ?? {}).map((x) => x?.attribution),
    ...(f.paymentOverrides ?? []).map((o) => o.policy.attribution),
    f.tailgating.allowed.attribution,
    f.tailgating.atmosphere?.attribution,
    f.exit.rating?.attribution,
    f.exit.directions?.attribution,
    f.walkMinutes?.attribution,
    ...f.prices.map((p) => p.attribution),
  ].flatMap((a) => a?.sourceIds ?? []);
}

/** Every source ID referenced by a venue and its facilities, deduplicated. */
export function collectSourceIds(venue: Venue, facilities: ParkingFacility[]): string[] {
  const venueAttributions = [
    venue.attribution,
    venue.capacity?.attribution,
    ...(venue.policies ?? []).map((p) => p.attribution),
    ...(venue.transit ?? []).map((t) => t.attribution),
    ...(venue.trafficNotes ?? []).map((t) => t.attribution),
    venue.lotOpenHoursBefore?.attribution,
    ...EVENTS.filter((e) => e.venueId === venue.id).map((e) => e.attribution),
  ];
  return [...new Set([...venueAttributions.flatMap((a) => a?.sourceIds ?? []), ...facilities.flatMap(facilitySourceIds)])];
}
