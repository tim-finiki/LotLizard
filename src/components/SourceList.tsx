import type { DataSource } from "@/lib/types";
import { publicCitations } from "@/lib/citations";
import { formatDate } from "@/lib/verification";

const TYPE_LABEL: Record<DataSource["type"], string> = {
  official: "Official",
  operator: "Operator",
  media: "Media",
  third_party: "Third party",
  user_report: "Community",
  lotlizard_field: "LotLizard field check",
  editorial_estimate: "LotLizard estimate",
};

/** Public citations only: official, operator and field sources with their dates. Other sources are counted, not listed. */
export function SourceList({ sources }: { sources: DataSource[] }) {
  const { cited, otherCount } = publicCitations(sources);
  return (
    <>
      <ul className="divide-y divide-black/5 dark:divide-white/10">
        {cited.map((s) => (
          <li key={s.id} className="py-2 text-sm">
            <span className="mr-2 rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
              {TYPE_LABEL[s.type]}
            </span>
            {s.url ? (
              <a href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="text-brand-700 underline-offset-2 hover:underline dark:text-brand-100">
                {s.name}
              </a>
            ) : (
              <span>{s.name}</span>
            )}
            <span className="text-neutral-500"> · accessed {formatDate(s.retrievedAt)}</span>
          </li>
        ))}
      </ul>
      {otherCount > 0 && (
        <p className="mt-2 text-xs text-neutral-500">
          {cited.length ? "Also" : "Based on"} {otherCount} other {otherCount === 1 ? "source" : "sources"}, such as news reports and parking listings.
        </p>
      )}
    </>
  );
}
