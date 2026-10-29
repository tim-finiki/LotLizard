import type { Amenity, FacilityType, ParkingFacility, UniversalAmenity } from "@/lib/types";
import { matchFeatures } from "@/lib/features";
import { DEFAULT_PREFERENCES, type RankedFacility, type RankingPreferences } from "@/lib/ranking";
import { effectivePayment, isPaymentFilterActive, matchPayment, type PaymentFilter, type PaymentMatch } from "@/lib/payment";

export interface DisplayFilters {
  hiddenTypes: FacilityType[];
  payment: PaymentFilter;
  /** Required amenities (AND). Only *reported* amenities count; unreported is not assumed present. */
  amenities?: Amenity[];
  /** Universal amenities that must be confirmed available (AND). Unknown never matches. */
  features?: UniversalAmenity[];
  /** Selected event, so event-specific payment policies apply. */
  eventId?: string;
}

export interface FilterResult {
  /** Facilities to show on BOTH the map and the list, in input order. */
  visible: ParkingFacility[];
  /** Payment match per visible facility (all "match" when no payment filter is active). */
  paymentMatch: Map<string, PaymentMatch>;
  /** Lots hidden only because their payment info is unknown (offer "show them"). */
  hiddenUnknownPayment: number;
  /** Lots hidden because a required universal amenity isn't confirmed there (never shown as a match). */
  hiddenUnknownFeatures: number;
}

/**
 * Single source of truth for what is displayed. The explorer ranks `visible`, draws pins from
 * `visible` and lists `visible`, so the map and results can never disagree.
 */
export function applyDisplayFilters(facilities: ParkingFacility[], filters: DisplayFilters): FilterResult {
  const active = isPaymentFilterActive(filters.payment);
  const visible: ParkingFacility[] = [];
  const paymentMatch = new Map<string, PaymentMatch>();
  let hiddenUnknownPayment = 0;
  let hiddenUnknownFeatures = 0;
  const amenities = filters.amenities ?? [];
  const features = filters.features ?? [];
  for (const f of facilities) {
    if (filters.hiddenTypes.includes(f.type)) continue;
    if (amenities.some((a) => !f.amenities.value.includes(a))) continue;
    if (features.length > 0) {
      const fm = matchFeatures(f, features);
      if (fm !== "match") {
        if (fm === "unknown") hiddenUnknownFeatures++;
        continue;
      }
    }
    const match = active ? matchPayment(effectivePayment(f, filters.eventId).policy, filters.payment) : "match";
    if (match === "excluded") continue;
    if (match === "unknown" && !filters.payment.includeUnknown) {
      hiddenUnknownPayment++;
      continue;
    }
    visible.push(f);
    paymentMatch.set(f.id, match);
  }
  return { visible, paymentMatch, hiddenUnknownPayment, hiddenUnknownFeatures };
}

export interface MarkerSpec {
  id: string;
  name: string;
  type: FacilityType;
  lat: number;
  lng: number;
  /** Rank number for ranked lots, "?" for parking we can't rank yet, a letter for shuttles/rideshare/ADA. */
  label: string;
}

const NON_PARKING_LABEL: Partial<Record<FacilityType, string>> = { shuttle: "S", rideshare_zone: "R", ada: "A" };

/**
 * Map pins for the displayed facilities, labelled from the *current* ranking so pin labels always
 * match card ranks after re-ranking. Pass `applyDisplayFilters(...).visible`.
 */
export function buildMarkers(visible: ParkingFacility[], ranked: RankedFacility[]): MarkerSpec[] {
  const byId = new Map(ranked.map((r) => [r.facility.id, r]));
  return visible
    .filter((f) => f.location)
    .map((f) => {
      const r = byId.get(f.id);
      const label = r ? (r.rank !== null ? String(r.rank) : "?") : (NON_PARKING_LABEL[f.type] ?? "•");
      return { id: f.id, name: f.name, type: f.type, lat: f.location!.lat, lng: f.location!.lng, label };
    });
}

/**
 * Number of active eligibility filters, shown on the Filters button. Sort priorities and the
 * "include unknown payment" option don't count: they never narrow the results on their own.
 */
export function activeFilterCount(prefs: RankingPreferences, hiddenTypes: FacilityType[]): number {
  return (
    prefs.payment.methods.length +
    prefs.payment.timings.length +
    prefs.amenities.length +
    prefs.features.length +
    hiddenTypes.length +
    (prefs.vehicle !== DEFAULT_PREFERENCES.vehicle ? 1 : 0) +
    (prefs.requireTailgating ? 1 : 0) +
    (prefs.maxPrice !== undefined ? 1 : 0)
  );
}

/** Reset every eligibility filter while keeping sort priorities and departure direction. */
export function clearFilters(prefs: RankingPreferences): RankingPreferences {
  return {
    ...prefs,
    vehicle: DEFAULT_PREFERENCES.vehicle,
    features: [],
    requireTailgating: false,
    maxPrice: undefined,
    payment: DEFAULT_PREFERENCES.payment,
    amenities: [],
  };
}
