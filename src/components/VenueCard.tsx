import Link from "next/link";
import type { Venue } from "@/lib/types";
import { COVERAGE_LABEL, VENUE_TYPE_LABEL } from "@/lib/labels";
import { venuePath } from "@/lib/seo";

export function VenueCard({ venue }: { venue: Venue }) {
  const detailed = venue.coverage !== "venue_only";
  return (
    <Link
      href={venuePath(venue)}
      className="flex flex-col gap-1 rounded-2xl border border-black/5 bg-white p-4 shadow-sm transition active:scale-[0.99] hover:border-brand-500/40 dark:border-white/10 dark:bg-neutral-900"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-bold leading-tight">{venue.name}</h3>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            detailed ? "bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-100" : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
          }`}
        >
          {venue.coverage === "pilot_detailed" ? "Pilot" : detailed ? "Guide" : "Soon"}
        </span>
      </div>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        {VENUE_TYPE_LABEL[venue.type]} · {venue.address.city}, {venue.address.state}
      </p>
      {venue.teams.length > 0 && <p className="text-sm text-neutral-500">{venue.teams.join(" · ")}</p>}
      <p className={`mt-1 text-xs font-medium ${detailed ? "text-brand-700 dark:text-brand-100" : "text-neutral-500"}`}>{COVERAGE_LABEL[venue.coverage]}</p>
    </Link>
  );
}
