import type { VerificationSummary } from "@/lib/verification";
import { formatDate } from "@/lib/verification";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";

/** The same freshness/verification line on every venue and lot page. */
export function VerificationStatus({ summary, label = "Data status" }: { summary: VerificationSummary; label?: string }) {
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-600 dark:text-neutral-400">
      <span className="font-semibold">{label}:</span>{" "}
      <span>{summary.fieldVerified && summary.lastVerifiedAt ? `Field-verified ${formatDate(summary.lastVerifiedAt)}` : "Not yet field-verified"}</span>{" "}
      {summary.sourcesReviewedAt && (
        <span>
          · Sources reviewed through <time dateTime={summary.sourcesReviewedAt}>{formatDate(summary.sourcesReviewedAt)}</time>
        </span>
      )}{" "}
      <ConfidenceBadge level={summary.confidence} />
    </p>
  );
}
