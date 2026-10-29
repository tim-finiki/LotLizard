import type { ConfidenceLevel } from "@/lib/types";
import { CONFIDENCE_DESCRIPTION, CONFIDENCE_LABEL } from "@/lib/confidence";

const STYLES: Record<ConfidenceLevel, string> = {
  verified: "bg-emerald-100 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-900/40 dark:text-emerald-200",
  high: "bg-sky-100 text-sky-800 ring-sky-600/20 dark:bg-sky-900/40 dark:text-sky-200",
  medium: "bg-amber-100 text-amber-800 ring-amber-600/20 dark:bg-amber-900/40 dark:text-amber-200",
  low: "bg-orange-100 text-orange-800 ring-orange-600/20 dark:bg-orange-900/40 dark:text-orange-200",
  unverified: "bg-neutral-200 text-neutral-700 ring-neutral-500/20 dark:bg-neutral-800 dark:text-neutral-300",
};

const DOT: Record<ConfidenceLevel, string> = {
  verified: "●●●●",
  high: "●●●○",
  medium: "●●○○",
  low: "●○○○",
  unverified: "○○○○",
};

export function ConfidenceBadge({ level, compact = false }: { level: ConfidenceLevel; compact?: boolean }) {
  return (
    <span
      title={CONFIDENCE_DESCRIPTION[level]}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${STYLES[level]}`}
    >
      <span aria-hidden className="tracking-[-0.15em]">{DOT[level]}</span>
      <span className={compact ? "sr-only" : undefined}>{CONFIDENCE_LABEL[level]}</span>
    </span>
  );
}
