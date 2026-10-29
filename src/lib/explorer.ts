import type { FacilityType, ParkingFacility } from "@/lib/types";
import type { RankedFacility } from "@/lib/ranking";
import { effectivePayment, isPaymentFilterActive, matchPayment, type PaymentFilter, type PaymentMatch } from "@/lib/payment";

export interface DisplayFilters {
  hiddenTypes: FacilityType[];
  payment: PaymentFilter;
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
  for (const f of facilities) {
    if (filters.hiddenTypes.includes(f.type)) continue;
    const match = active ? matchPayment(effectivePayment(f, filters.eventId).policy, filters.payment) : "match";
    if (match === "excluded") continue;
    if (match === "unknown" && !filters.payment.includeUnknown) {
      hiddenUnknownPayment++;
      continue;
    }
    visible.push(f);
    paymentMatch.set(f.id, match);
  }
  return { visible, paymentMatch, hiddenUnknownPayment };
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
