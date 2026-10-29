import type { Attribution, ConfidenceLevel, DataSource } from "@/lib/types";

/**
 * One consistent answer to "how fresh and how verified is this?", shown on every venue and lot page
 * and used for sitemap lastmod. Field verification means a LotLizard on-site check or an attribution
 * carrying lastVerifiedAt; reviewing published sources is not field verification.
 */
export interface VerificationSummary {
  fieldVerified: boolean;
  /** Most recent field-verification date, if any. */
  lastVerifiedAt?: string;
  /** Most recent date among the sources behind the facts (YYYY-MM-DD). */
  sourcesReviewedAt?: string;
  confidence: ConfidenceLevel;
}

const maxDate = (dates: (string | undefined)[]) => dates.filter((d): d is string => !!d).sort().at(-1);

export function verificationSummary(attributions: Attribution[], sources: DataSource[], confidence: ConfidenceLevel): VerificationSummary {
  const lastVerifiedAt = maxDate([
    ...attributions.map((a) => a.lastVerifiedAt),
    ...sources.filter((s) => s.type === "lotlizard_field").map((s) => s.retrievedAt),
  ]);
  return {
    fieldVerified: !!lastVerifiedAt,
    lastVerifiedAt,
    sourcesReviewedAt: maxDate(sources.map((s) => s.retrievedAt)),
    confidence,
  };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-10-29" → "Oct 29, 2026", independent of server timezone. */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}
