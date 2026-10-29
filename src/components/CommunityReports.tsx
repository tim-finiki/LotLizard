import { connection } from "next/server";
import { getCommunitySummary } from "@/lib/submissions/community";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";

function median(xs: number[]) {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

/** Approved community reports for a lot. Request-time; render inside <Suspense>. */
export async function CommunityReports({ venueSlug, facilitySlug }: { venueSlug: string; facilitySlug: string }) {
  await connection();
  const c = await getCommunitySummary(venueSlug, facilitySlug);
  const carPrices = c.prices.filter((p) => p.vehicle === "car").map((p) => p.amount);

  if (c.reviews.length === 0 && c.prices.length === 0 && c.exitTimes.length === 0) {
    return <p className="text-sm text-neutral-500">No approved community reports yet. Be the first.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {carPrices.length > 0 && (
        <div className="flex items-center justify-between rounded-xl bg-white p-3 text-sm ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10">
          <span>
            Fans reported paying <strong>${median(carPrices)}</strong> (median of {carPrices.length})
          </span>
          <ConfidenceBadge level={c.priceConfidence} />
        </div>
      )}
      {c.exitTimes.length > 0 && (
        <div className="flex items-center justify-between rounded-xl bg-white p-3 text-sm ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10">
          <span>
            Reported time to get out: <strong>{median(c.exitTimes.map((e) => e.minutes))} min</strong> (median of {c.exitTimes.length})
          </span>
          <ConfidenceBadge level={c.exitTimes.length >= 3 ? "medium" : "low"} />
        </div>
      )}
      {c.reviews.map((r) => (
        <article key={r.id} className="rounded-xl bg-white p-3 text-sm ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10">
          <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-semibold">{"★".repeat(r.rating)}<span className="text-neutral-300">{"★".repeat(5 - r.rating)}</span></span>
            {r.tailgateRating && <span className="text-xs text-neutral-500">Tailgate {r.tailgateRating}/5</span>}
            {r.exitRating && <span className="text-xs text-neutral-500">Exit {r.exitRating}/5</span>}
          </header>
          <p className="mt-1 whitespace-pre-line">{r.body}</p>
          <p className="mt-1 text-xs text-neutral-500">
            {r.author} · {r.createdAt.slice(0, 10)} · Community report
          </p>
        </article>
      ))}
    </div>
  );
}
