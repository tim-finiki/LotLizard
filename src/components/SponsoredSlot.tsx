import { connection } from "next/server";
import type { SponsorshipPlacement } from "@/lib/types";
import { getSponsorships } from "@/lib/data/repository";

/** Labelled sponsorship placement. Rendered at request time; never part of rankings. */
export async function SponsoredSlot({ placement, venueId }: { placement: SponsorshipPlacement; venueId?: string }) {
  await connection();
  const [s] = await getSponsorships(placement, venueId, new Date().toISOString());
  if (!s) return null;
  return (
    <aside className="rounded-2xl border border-dashed border-neutral-300 bg-white p-4 text-sm dark:border-neutral-700 dark:bg-ink-soft">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Sponsored</span>
      <p className="mt-1">{s.message}</p>
      <a href={s.url} target="_blank" rel="sponsored noopener" className="mt-2 inline-block font-semibold text-brand-700 underline dark:text-brand-100">
        {s.sponsorName}
      </a>
    </aside>
  );
}
