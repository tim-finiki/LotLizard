import type { Attribution, VehicleEntrance } from "@/lib/types";
import { haversineMeters, type LatLng } from "@/lib/geo";

/**
 * Vehicle-entrance reports: an address, a map pin, or both. Pure functions, so the rules are testable
 * and the same whichever geocoding provider is plugged in later.
 *
 * - An address is geocoded to an *approximate* suggested location, never treated as the driveway.
 * - A pin is kept exactly as dropped; reverse geocoding only adds context.
 * - When both are given, both are kept and a large gap between them is flagged for review.
 * - Review is exception-based: routine, corroborated updates are approved by rule; anything unusual
 *   goes to a person.
 */

/** Address and pin further apart than this are flagged as a discrepancy. */
export const ENTRANCE_MISMATCH_M = 150;
/** Independent pins within this distance of each other corroborate one another. */
export const CORROBORATION_RADIUS_M = 50;
/** Entrance reports further than this from the venue are flagged. */
export const MAX_ENTRANCE_DISTANCE_M = 5_000;
/** Matching independent reports needed (besides the new one) to approve a community pin by rule. */
export const CORROBORATIONS_NEEDED = 2;

export interface Geocoder {
  /** Approximate point for an address, or null when it can't be found. */
  geocode(address: string): Promise<LatLng | null>;
  /** Nearest street address to a point, for context only. */
  reverse?(point: LatLng): Promise<string | null>;
}

export type EntranceFlag = "address_pin_mismatch" | "address_not_found" | "far_from_venue";

export interface EntranceReport {
  address?: string;
  pin?: LatLng;
  instructions?: string;
}

export interface EntranceProposal extends EntranceReport {
  /** Approximate location geocoded from the address: a suggestion for the map, never a navigation target. */
  suggestedLocation?: LatLng;
  /** Reverse-geocoded context for the pin. */
  nearestAddress?: string;
  /** Distance between the geocoded address and the pin, when both exist. */
  addressPinDistanceM?: number;
  flags: EntranceFlag[];
}

export async function prepareEntrance(report: EntranceReport, venue: LatLng, geocoder?: Geocoder): Promise<EntranceProposal> {
  if (!report.address && !report.pin) throw new Error("An entrance report needs an address, a pin, or both");
  const flags: EntranceFlag[] = [];
  const proposal: EntranceProposal = { ...report, flags };

  if (report.address && geocoder) {
    const point = await geocoder.geocode(report.address);
    if (point) proposal.suggestedLocation = point;
    else flags.push("address_not_found");
  }
  if (report.pin && geocoder?.reverse) {
    const near = await geocoder.reverse(report.pin);
    if (near) proposal.nearestAddress = near;
  }
  if (report.pin && proposal.suggestedLocation) {
    proposal.addressPinDistanceM = Math.round(haversineMeters(report.pin, proposal.suggestedLocation));
    if (proposal.addressPinDistanceM > ENTRANCE_MISMATCH_M) flags.push("address_pin_mismatch");
  }
  const where = report.pin ?? proposal.suggestedLocation;
  if (where && haversineMeters(where, venue) > MAX_ENTRANCE_DISTANCE_M) flags.push("far_from_venue");
  return proposal;
}

export type Submitter = "community" | "unverified_owner" | "verified_owner";

export interface TriageContext {
  submitter: Submitter;
  /** Pins from other, independent reports for the same lot. */
  otherPins?: LatLng[];
  /** The entrance currently published, if any. */
  current?: VehicleEntrance;
}

export interface TriageResult {
  decision: "approve" | "review";
  /** Why it went to review, or what justified approval. */
  reasons: string[];
}

/**
 * Exception-based review. Approves by rule only when nothing is unusual and the report is trustworthy:
 * from a verified owner, or a community pin corroborated by independent reports. Everything else
 * (flags, address-only community reports, unverified owners, moving a verified entrance) goes to review.
 */
export function triageEntrance(p: EntranceProposal, ctx: TriageContext): TriageResult {
  const review: string[] = [...p.flags];
  const current = ctx.current?.verification === "verified" ? ctx.current.location : undefined;
  if (current && p.pin && current.method !== "geocoded" && haversineMeters(current, p.pin) > CORROBORATION_RADIUS_M) {
    review.push("moves_verified_entrance");
  }
  if (ctx.submitter === "unverified_owner") review.push("owner_not_verified");
  if (review.length) return { decision: "review", reasons: review };

  if (ctx.submitter === "verified_owner") return { decision: "approve", reasons: ["verified_owner"] };
  if (!p.pin) return { decision: "review", reasons: ["address_only_community_report"] };
  const agreeing = (ctx.otherPins ?? []).filter((o) => haversineMeters(o, p.pin!) <= CORROBORATION_RADIUS_M).length;
  if (agreeing >= CORROBORATIONS_NEEDED) return { decision: "approve", reasons: [`corroborated_by_${agreeing}`] };
  return { decision: "review", reasons: ["needs_corroboration"] };
}

/**
 * The entrance to publish once a proposal is approved (by rule or by a person). A pin becomes the
 * verified navigation target; an address-only report keeps its geocoded point as an approximate
 * location, which is shown on the map but never navigated to.
 */
export function approvedEntrance(p: EntranceProposal, approvedOn: string, attribution: Attribution): VehicleEntrance {
  const location = p.pin
    ? { ...p.pin, method: "pin" as const }
    : p.suggestedLocation
      ? { ...p.suggestedLocation, method: "geocoded" as const }
      : undefined;
  return {
    ...(p.address ? { address: p.address } : {}),
    ...(location ? { location } : {}),
    ...(p.nearestAddress ? { nearestAddress: p.nearestAddress } : {}),
    ...(p.instructions ? { instructions: p.instructions } : {}),
    verification: "verified",
    verifiedAt: approvedOn,
    reportedAt: approvedOn,
    attribution,
  };
}
