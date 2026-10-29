import { connection } from "next/server";
import { getCommunitySummary } from "@/lib/submissions/community";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { PAYMENT_METHOD_LABEL, PAYMENT_TIMING_LABEL } from "@/lib/payment";
import { getVenue, listEvents } from "@/lib/data/repository";
import { eventLabel } from "@/lib/events";

function median(xs: number[]) {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

/** Approved community reports for a lot. Request-time; render inside <Suspense>. */
export async function CommunityReports({ venueSlug, facilitySlug }: { venueSlug: string; facilitySlug: string }) {
  await connection();
  const c = await getCommunitySummary(venueSlug, facilitySlug);
  const venue = await getVenue(venueSlug);
  const events = venue ? await listEvents(venue.id) : [];
  const carPrices = c.prices.filter((p) => p.vehicle === "car").map((p) => p.amount);

  if (c.reviews.length === 0 && c.prices.length === 0 && c.exitTimes.length === 0 && c.payments.length === 0) {
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
      {c.payments.map((p) => (
        <div key={p.id} className="rounded-xl bg-white p-3 text-sm ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold">
              Payment report
              {p.eventId && ` · only for ${(() => { const e = events.find((x) => x.id === p.eventId); return e ? eventLabel(e) : "one game"; })()}`}
            </span>
            <ConfidenceBadge level="low" />
          </div>
          <p className="mt-1">
            {p.accepted.length > 0 && <>Accepts {p.accepted.map((m) => (m === "other" && p.otherDescription ? p.otherDescription : PAYMENT_METHOD_LABEL[m])).join(", ")}. </>}
            {p.notAccepted.length > 0 && <>Doesn&apos;t accept {p.notAccepted.map((m) => PAYMENT_METHOD_LABEL[m]).join(", ")}. </>}
            {p.timing && <>{PAYMENT_TIMING_LABEL[p.timing]}.</>}
          </p>
          {p.notes && <p className="mt-1 text-neutral-600 dark:text-neutral-400">{p.notes}</p>}
          <p className="mt-1 text-xs text-neutral-500">
            {p.role === "lot_owner" ? "Lot owner report, approved by a moderator" : "Community report"} · seen {p.observedDate}
          </p>
        </div>
      ))}
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
