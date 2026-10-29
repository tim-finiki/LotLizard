import type { Attribution, ConfidenceLevel, EventKind, FacilityType, ParkingFacility, PriceObservation, Venue, VehicleType } from "@/lib/types";
import { confidenceRank, lowestConfidence } from "@/lib/confidence";
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
  /** Approach ID the user leaves toward after the event ("any" = no preference). */
  direction: string;
}

export const DEFAULT_PREFERENCES: RankingPreferences = {
  weights: { cost: 3, walk: 3, tailgate: 2, exit: 2 },
  vehicle: "car",
  requireTailgating: false,
  needsAda: false,
  direction: "any",
};

/** Per-request context that is not a saved preference. */
export interface RankingContext {
  eventKind?: EventKind;
}

/**
 * How strongly we recommend a lot, kept separate from how much we know about it.
 * "limited_data" means we can't make a recommendation either way.
 */
export type Recommendation = "top_pick" | "good_match" | "fair_match" | "limited_data";

/** Below this share of weighted factors backed by data, we decline to recommend. */
export const MIN_COMPLETENESS_TO_RECOMMEND = 0.5;

/** Facility types that are places to leave a vehicle — the only ones we rank. */
const PARKABLE: FacilityType[] = ["official_lot", "private_lot", "garage", "independent", "residential", "ada"];

export interface FactorScore {
  /** 0–1 when known. Unknown factors contribute nothing to the match score. */
  score: number;
  known: boolean;
  detail: string;
  /** Attributions behind a known score, used for the confidence summary. */
  evidence: Attribution[];
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
  /**
   * 0–100 match score built only from known factors: missing data adds nothing, so it can
   * never push a lot up. Read it together with completeness and confidence.
   */
  score: number;
  /** Share (0–1) of the user's weighting backed by actual data. */
  completeness: number;
  /** Weakest confidence among the evidence the score used ("unverified" when there is none). */
  confidence: ConfidenceLevel;
  recommendation: Recommendation;
  factors: Record<Factor, FactorScore>;
  price?: PriceObservation;
  walk?: WalkInfo;
}

const UNKNOWN = 0;
const WALK_BEST_MIN = 5;
const WALK_WORST_MIN = 35;

/**
 * The most relevant price for a vehicle: observations for the selected event kind first (or
 * "any"), then most trustworthy, then most recent.
 */
export function bestPrice(facility: ParkingFacility, vehicle: VehicleType, eventKind?: EventKind): PriceObservation | undefined {
  const relevant = (p: PriceObservation) => (!eventKind || p.eventKind === eventKind || p.eventKind === "any" ? 1 : 0);
  return facility.prices
    .filter((p) => p.vehicle === vehicle)
    .sort(
      (a, b) =>
        relevant(b) - relevant(a) ||
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
  const allowed = f.tailgating.allowed;
  if (allowed.value === false) return { score: 0, known: true, detail: "Tailgating not allowed", evidence: [allowed.attribution] };
  if (f.tailgating.atmosphere) {
    const a = f.tailgating.atmosphere.value;
    return { score: (a - 1) / 4, known: true, detail: `Atmosphere ${a}/5`, evidence: [f.tailgating.atmosphere.attribution] };
  }
  if (allowed.value === true) return { score: 0.6, known: true, detail: "Tailgating allowed", evidence: [allowed.attribution] };
  return { score: UNKNOWN, known: false, detail: "Tailgating rules unknown", evidence: [] };
}

/** Score for a lot whose exit route doesn't lead toward the user's direction. */
const WRONG_DIRECTION = 0.25;

function exitScore(f: ParkingFacility, direction: string): FactorScore {
  const parts: { score: number; detail: string; evidence: Attribution }[] = [];
  if (f.exit.rating) {
    const r = f.exit.rating.value;
    parts.push({ score: (r - 1) / 4, detail: `Exit ${r}/5`, evidence: f.exit.rating.attribution });
  }
  if (direction !== "any" && f.exit.directions) {
    const toward = f.exit.directions.value.includes(direction);
    parts.push({
      score: toward ? 1 : WRONG_DIRECTION,
      detail: toward ? "Exits toward your direction" : "Exit route heads elsewhere",
      evidence: f.exit.directions.attribution,
    });
  }
  if (parts.length === 0) {
    return { score: UNKNOWN, known: false, detail: direction === "any" ? "No exit data yet" : "No route data for your direction", evidence: [] };
  }
  return {
    score: parts.reduce((s, p) => s + p.score, 0) / parts.length,
    known: true,
    detail: parts.map((p) => p.detail).join(" · "),
    evidence: parts.map((p) => p.evidence),
  };
}

function walkScore(walk: WalkInfo | undefined, attribution: Attribution | undefined): FactorScore {
  if (!walk) return { score: UNKNOWN, known: false, detail: "Location unknown", evidence: [] };
  const s = 1 - (walk.minutes - WALK_BEST_MIN) / (WALK_WORST_MIN - WALK_BEST_MIN);
  return {
    score: Math.min(1, Math.max(0, s)),
    known: true,
    detail: `${walk.estimated ? "~" : ""}${walk.minutes} min walk`,
    // An estimated walk inherits the pin's confidence, which we report as the walk confidence.
    evidence: [attribution ?? { sourceIds: [], confidence: walk.confidence }],
  };
}

export function rankFacilities(
  venue: Venue,
  facilities: ParkingFacility[],
  prefs: RankingPreferences = DEFAULT_PREFERENCES,
  context: RankingContext = {},
): RankedFacility[] {
  const candidates = facilities.filter((f) => isRankable(f, prefs));
  const prices = candidates.map((f) => bestPrice(f, prefs.vehicle, context.eventKind));
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
          evidence: [price.attribution],
        }
      : { score: UNKNOWN, known: false, detail: "No price data", evidence: [] };
    const factors: Record<Factor, FactorScore> = {
      cost,
      walk: walkScore(walk, facility.walkMinutes?.attribution),
      tailgate: tailgateScore(facility),
      exit: exitScore(facility, prefs.direction),
    };
    // Unknown factors contribute 0: missing data is never evidence in a lot's favour.
    const score = FACTORS.reduce((sum, k) => sum + weights[k] * (factors[k].known ? factors[k].score : 0), 0) / weightSum;
    const completeness = FACTORS.reduce((sum, k) => sum + (factors[k].known ? weights[k] : 0), 0) / weightSum;
    const evidence = FACTORS.filter((k) => weights[k] > 0).flatMap((k) => factors[k].evidence);
    return {
      facility,
      rank: 0,
      score: Math.round(score * 100),
      completeness,
      confidence: lowestConfidence(evidence),
      recommendation: "limited_data" as Recommendation,
      factors,
      price,
      walk,
    };
  });

  ranked.sort(
    (a, b) => b.score - a.score || b.completeness - a.completeness || a.facility.name.localeCompare(b.facility.name),
  );
  let topAssigned = false;
  ranked.forEach((r, i) => {
    r.rank = i + 1;
    r.recommendation = recommend(r, topAssigned);
    if (r.recommendation === "top_pick") topAssigned = true;
  });
  return ranked;
}

/** Recommendation tier. Lots without enough data are never recommended, however they score. */
function recommend(r: Pick<RankedFacility, "score" | "completeness">, topAssigned: boolean): Recommendation {
  if (r.completeness < MIN_COMPLETENESS_TO_RECOMMEND) return "limited_data";
  if (!topAssigned && r.score >= 50) return "top_pick";
  return r.score >= 50 ? "good_match" : "fair_match";
}
