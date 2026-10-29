import type { ConfidenceLevel, FacilityType, ParkingFacility, PriceObservation, Venue, VehicleType } from "@/lib/types";
import { confidenceRank } from "@/lib/confidence";
import { estimateWalk } from "@/lib/geo";

export type Factor = "cost" | "walk" | "tailgate" | "exit";
export const FACTORS: Factor[] = ["cost", "walk", "tailgate", "exit"];

export interface RankingPreferences {
  /** 0 (don't care) – 5 (most important). */
  weights: Record<Factor, number>;
  vehicle: VehicleType;
  requireTailgating: boolean;
  needsAda: boolean;
  maxPrice?: number;
}

export const DEFAULT_PREFERENCES: RankingPreferences = {
  weights: { cost: 3, walk: 3, tailgate: 2, exit: 2 },
  vehicle: "car",
  requireTailgating: false,
  needsAda: false,
};

/** Facility types that are places to leave a vehicle — the only ones we rank. */
const PARKABLE: FacilityType[] = ["official_lot", "private_lot", "garage", "independent", "residential", "ada"];

export interface FactorScore {
  /** 0–1. Unknown factors score a neutral 0.5 and are flagged. */
  score: number;
  known: boolean;
  detail: string;
}

export interface WalkInfo {
  minutes: number;
  meters?: number;
  /** True when derived from coordinates rather than a sourced walking time. */
  estimated: boolean;
  confidence: ConfidenceLevel;
}

export interface RankedFacility {
  facility: ParkingFacility;
  rank: number;
  /** 0–100 */
  score: number;
  /** Share (0–1) of the user's weighting backed by actual data. */
  completeness: number;
  factors: Record<Factor, FactorScore>;
  price?: PriceObservation;
  walk?: WalkInfo;
}

const NEUTRAL = 0.5;
const WALK_BEST_MIN = 5;
const WALK_WORST_MIN = 35;

/** The most trustworthy, then most recent, price observation for a vehicle type. */
export function bestPrice(facility: ParkingFacility, vehicle: VehicleType): PriceObservation | undefined {
  return facility.prices
    .filter((p) => p.vehicle === vehicle)
    .sort(
      (a, b) =>
        confidenceRank(b.attribution.confidence) - confidenceRank(a.attribution.confidence) ||
        b.observedAt.localeCompare(a.observedAt),
    )[0];
}

export function walkInfo(facility: ParkingFacility, venue: Venue): WalkInfo | undefined {
  if (facility.walkMinutes) {
    return { minutes: facility.walkMinutes.value, estimated: false, confidence: facility.walkMinutes.attribution.confidence };
  }
  if (!facility.location) return undefined;
  const est = estimateWalk(facility.location, venue.location);
  const precise = facility.location.precision === "exact" && venue.location.precision === "exact";
  return { ...est, estimated: true, confidence: precise ? "medium" : "low" };
}

function midpoint(p: PriceObservation): number {
  return (p.min + p.max) / 2;
}

export function isRankable(facility: ParkingFacility, prefs: RankingPreferences): boolean {
  if (!PARKABLE.includes(facility.type)) return false;
  if (facility.type === "ada" && !prefs.needsAda) return false;
  if (!facility.vehicleTypes.includes(prefs.vehicle)) return false;
  if (prefs.requireTailgating && facility.tailgating.allowed.value === false) return false;
  if (prefs.maxPrice !== undefined) {
    const price = bestPrice(facility, prefs.vehicle);
    if (price && price.min > prefs.maxPrice) return false;
  }
  return true;
}

function tailgateScore(f: ParkingFacility): FactorScore {
  const allowed = f.tailgating.allowed.value;
  if (allowed === false) return { score: 0, known: true, detail: "Tailgating not allowed" };
  if (f.tailgating.atmosphere) {
    const a = f.tailgating.atmosphere.value;
    return { score: (a - 1) / 4, known: true, detail: `Atmosphere ${a}/5` };
  }
  if (allowed === true) return { score: 0.6, known: true, detail: "Tailgating allowed; atmosphere not rated" };
  return { score: NEUTRAL, known: false, detail: "Tailgating rules unknown" };
}

function exitScore(f: ParkingFacility): FactorScore {
  if (f.exit.rating) {
    const r = f.exit.rating.value;
    return { score: (r - 1) / 4, known: true, detail: `Exit ${r}/5` };
  }
  return { score: NEUTRAL, known: false, detail: "No exit-time data yet" };
}

function walkScore(walk: WalkInfo | undefined): FactorScore {
  if (!walk) return { score: NEUTRAL, known: false, detail: "Location unknown" };
  const s = 1 - (walk.minutes - WALK_BEST_MIN) / (WALK_WORST_MIN - WALK_BEST_MIN);
  return {
    score: Math.min(1, Math.max(0, s)),
    known: true,
    detail: `${walk.estimated ? "~" : ""}${walk.minutes} min walk`,
  };
}

export function rankFacilities(
  venue: Venue,
  facilities: ParkingFacility[],
  prefs: RankingPreferences = DEFAULT_PREFERENCES,
): RankedFacility[] {
  const candidates = facilities.filter((f) => isRankable(f, prefs));
  const prices = candidates.map((f) => bestPrice(f, prefs.vehicle));
  const mids = prices.filter((p): p is PriceObservation => !!p).map(midpoint);
  const minMid = Math.min(...mids);
  const maxMid = Math.max(...mids);

  const totalWeight = FACTORS.reduce((sum, k) => sum + prefs.weights[k], 0);
  const weights = totalWeight > 0 ? prefs.weights : { cost: 1, walk: 1, tailgate: 1, exit: 1 };
  const weightSum = totalWeight > 0 ? totalWeight : FACTORS.length;

  const ranked = candidates.map((facility, i) => {
    const price = prices[i];
    const walk = walkInfo(facility, venue);
    const cost: FactorScore = price
      ? {
          score: maxMid === minMid ? 1 : (maxMid - midpoint(price)) / (maxMid - minMid),
          known: true,
          detail: price.min === price.max ? `$${price.min}` : `$${price.min}–$${price.max}`,
        }
      : { score: NEUTRAL, known: false, detail: "No price data" };
    const factors: Record<Factor, FactorScore> = {
      cost,
      walk: walkScore(walk),
      tailgate: tailgateScore(facility),
      exit: exitScore(facility),
    };
    const score = FACTORS.reduce((sum, k) => sum + weights[k] * factors[k].score, 0) / weightSum;
    const completeness = FACTORS.reduce((sum, k) => sum + (factors[k].known ? weights[k] : 0), 0) / weightSum;
    return { facility, rank: 0, score: Math.round(score * 100), completeness, factors, price, walk };
  });

  ranked.sort(
    (a, b) => b.score - a.score || b.completeness - a.completeness || a.facility.name.localeCompare(b.facility.name),
  );
  ranked.forEach((r, i) => (r.rank = i + 1));
  return ranked;
}
