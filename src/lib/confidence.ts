import type { Attribution, ConfidenceLevel } from "@/lib/types";

export const CONFIDENCE_ORDER: ConfidenceLevel[] = ["unverified", "low", "medium", "high", "verified"];

export const CONFIDENCE_LABEL: Record<ConfidenceLevel, string> = {
  verified: "Verified",
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
  unverified: "Unverified",
};

export const CONFIDENCE_DESCRIPTION: Record<ConfidenceLevel, string> = {
  verified: "Confirmed with the operator or an official source and re-checked this season.",
  high: "Published by the venue, team or operator.",
  medium: "Reported by credible media, an official source seen indirectly, or several consistent community reports.",
  low: "A single report, a third-party guide, or a dated source.",
  unverified: "LotLizard estimate or placeholder. Help us verify it.",
};

export function confidenceRank(level: ConfidenceLevel): number {
  return CONFIDENCE_ORDER.indexOf(level);
}

export function atLeast(level: ConfidenceLevel, min: ConfidenceLevel): boolean {
  return confidenceRank(level) >= confidenceRank(min);
}

export function lowestConfidence(attributions: Attribution[]): ConfidenceLevel {
  if (attributions.length === 0) return "unverified";
  return attributions.reduce<ConfidenceLevel>(
    (lowest, a) => (confidenceRank(a.confidence) < confidenceRank(lowest) ? a.confidence : lowest),
    "verified",
  );
}

export interface CommunityPriceReport {
  amount: number;
  reportedAt: string;
}

/**
 * Confidence for approved community price reports. A single report is "low"; three or more
 * reports within 45 days whose spread is within 25% of the median are "medium". Community data
 * alone never reaches "high" or "verified".
 */
export function communityPriceConfidence(reports: CommunityPriceReport[], now: Date): ConfidenceLevel {
  if (reports.length === 0) return "unverified";
  const windowMs = 45 * 24 * 60 * 60 * 1000;
  const recent = reports.filter((r) => now.getTime() - new Date(r.reportedAt).getTime() <= windowMs);
  if (recent.length < 3) return "low";
  const sorted = recent.map((r) => r.amount).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const spread = sorted[sorted.length - 1] - sorted[0];
  return median > 0 && spread / median <= 0.25 ? "medium" : "low";
}
