import type { ParkingFacility, PaymentMethod, Venue } from "@/lib/types";
import { isIndexableVenue } from "@/lib/seo";
import { isLotSpecific } from "@/lib/ranking";

/**
 * Metro hubs group venues that share a city (and often parking). A hub page exists only when at least
 * two venues there have parking guides, and is indexed only when at least two are indexable, so a hub
 * is never a one-venue doorway page. Everything shown is derived from venue and lot facts.
 */
export interface Metro {
  slug: string;
  name: string;
  /** Primary state, for breadcrumbs and titles. */
  state: string;
  /** City/state pairs that belong to this metro. */
  places: { city: string; state: string }[];
}

export const METROS: Metro[] = [
  { slug: "philadelphia-pa", name: "Philadelphia", state: "PA", places: [{ city: "Philadelphia", state: "PA" }] },
  { slug: "pittsburgh-pa", name: "Pittsburgh", state: "PA", places: [{ city: "Pittsburgh", state: "PA" }] },
  { slug: "kansas-city-mo", name: "Kansas City", state: "MO", places: [{ city: "Kansas City", state: "MO" }, { city: "Kansas City", state: "KS" }] },
  {
    slug: "new-york-city",
    name: "New York City area",
    state: "NY",
    places: [
      { city: "New York", state: "NY" },
      { city: "Bronx", state: "NY" },
      { city: "Brooklyn", state: "NY" },
      { city: "Queens", state: "NY" },
      { city: "East Rutherford", state: "NJ" },
      { city: "Elmont", state: "NY" },
    ],
  },
  { slug: "buffalo-ny", name: "Buffalo", state: "NY", places: [{ city: "Buffalo", state: "NY" }, { city: "Orchard Park", state: "NY" }] },
  { slug: "chicago-il", name: "Chicago", state: "IL", places: [{ city: "Chicago", state: "IL" }] },
  { slug: "los-angeles-ca", name: "Los Angeles", state: "CA", places: [{ city: "Los Angeles", state: "CA" }, { city: "Inglewood", state: "CA" }] },
  { slug: "las-vegas-nv", name: "Las Vegas", state: "NV", places: [{ city: "Las Vegas", state: "NV" }] },
];

export const MIN_VENUES_FOR_METRO = 2;

export const metroPath = (m: Metro) => `/cities/${m.slug}`;

export function metroOf(venue: Venue): Metro | undefined {
  const city = venue.address.city.toLowerCase();
  return METROS.find((m) => m.places.some((p) => p.state === venue.address.state && p.city.toLowerCase() === city));
}

export interface MetroVenue {
  venue: Venue;
  facilities: ParkingFacility[];
}

/** Venues in the metro that have parking data (directory-only listings don't count). */
export function guideVenues(metro: Metro, all: MetroVenue[]): MetroVenue[] {
  return all.filter((x) => x.venue.coverage !== "venue_only" && x.facilities.length > 0 && metroOf(x.venue)?.slug === metro.slug);
}

export function metroHasPage(metro: Metro, all: MetroVenue[]): boolean {
  return guideVenues(metro, all).length >= MIN_VENUES_FOR_METRO;
}

export function isIndexableMetro(metro: Metro, all: MetroVenue[]): boolean {
  return guideVenues(metro, all).filter((x) => isIndexableVenue(x.venue, x.facilities)).length >= MIN_VENUES_FOR_METRO;
}

export interface VenueComparison {
  lots: number;
  /** Car prices for the regular event type, lot-specific or area-wide, with the cheapest/dearest bound. */
  carPrice?: { min: number; max: number; lotSpecific: boolean; season?: string };
  /** Lots where cash is known not to be accepted, out of lots whose cash status is known. */
  cashless: { lots: number; known: number };
  /** Lots that require a prepaid pass, out of lots whose payment timing is known. */
  prepayRequired: { lots: number; known: number };
  tailgating: { allowed: number; notAllowed: number; unknown: number };
  lotOpenHoursBefore?: number;
  transit: string[];
  covered: number;
  accessible: number;
}

const CASH: PaymentMethod = "cash";

export function compareVenue({ venue, facilities }: MetroVenue): VenueComparison {
  const carPrices = facilities.flatMap((f) => f.prices.filter((p) => p.vehicle === "car").map((p) => ({ p, lotSpecific: isLotSpecific(p) })));
  const cashKnown = facilities.filter((f) => f.payment && (f.payment.accepted.includes(CASH) || f.payment.notAccepted?.includes(CASH)));
  const timingKnown = facilities.filter((f) => f.payment?.timing);
  const seasons = new Set(carPrices.map((x) => x.p.season ?? ""));
  return {
    lots: facilities.length,
    ...(carPrices.length
      ? {
          carPrice: {
            min: Math.min(...carPrices.map((x) => x.p.min)),
            max: Math.max(...carPrices.map((x) => x.p.max)),
            lotSpecific: carPrices.some((x) => x.lotSpecific),
            // A season label only when every price shares it; a mixed range is never labelled with one year.
            ...(seasons.size === 1 && [...seasons][0] ? { season: [...seasons][0] } : {}),
          },
        }
      : {}),
    cashless: { lots: cashKnown.filter((f) => f.payment!.notAccepted?.includes(CASH)).length, known: cashKnown.length },
    prepayRequired: { lots: timingKnown.filter((f) => f.payment!.timing === "prepay_required").length, known: timingKnown.length },
    tailgating: {
      allowed: facilities.filter((f) => f.tailgating.allowed.value === true).length,
      notAllowed: facilities.filter((f) => f.tailgating.allowed.value === false).length,
      unknown: facilities.filter((f) => f.tailgating.allowed.value === "unknown").length,
    },
    ...(venue.lotOpenHoursBefore ? { lotOpenHoursBefore: venue.lotOpenHoursBefore.value } : {}),
    transit: (venue.transit ?? []).map((t) => t.name),
    covered: facilities.filter((f) => f.features?.covered?.state === "available").length,
    accessible: facilities.filter((f) => f.type === "ada" || f.features?.ada?.state === "available").length,
  };
}

const normName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export interface SharedLot {
  name: string;
  /** The same facility as listed for each venue it serves. */
  at: { venue: Venue; facility: ParkingFacility }[];
}

/** Lots listed for more than one venue in the metro (same slug or same name). */
export function sharedLots(venues: MetroVenue[]): SharedLot[] {
  const groups = new Map<string, SharedLot>();
  for (const { venue, facilities } of venues) {
    for (const f of facilities) {
      const key = normName(f.name);
      const g = groups.get(key) ?? { name: f.name, at: [] };
      if (!g.at.some((x) => x.venue.id === venue.id)) g.at.push({ venue, facility: f });
      groups.set(key, g);
    }
  }
  return [...groups.values()].filter((g) => g.at.length > 1).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}
