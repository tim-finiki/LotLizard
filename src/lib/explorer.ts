import type { FacilityType, ParkingFacility } from "@/lib/types";
import type { RankedFacility } from "@/lib/ranking";

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
 * Map pins derived from the *current* ranking, so pin labels always match card ranks after re-ranking.
 * Pure so the card/pin contract can be unit-tested.
 */
export function buildMarkers(facilities: ParkingFacility[], ranked: RankedFacility[], hiddenTypes: FacilityType[] = []): MarkerSpec[] {
  const byId = new Map(ranked.map((r) => [r.facility.id, r]));
  return facilities
    .filter((f) => f.location && !hiddenTypes.includes(f.type))
    .map((f) => {
      const r = byId.get(f.id);
      const label = r ? (r.rank !== null ? String(r.rank) : "?") : (NON_PARKING_LABEL[f.type] ?? "•");
      return { id: f.id, name: f.name, type: f.type, lat: f.location!.lat, lng: f.location!.lng, label };
    });
}
