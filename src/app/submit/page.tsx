import type { Metadata } from "next";
import { listEvents, listFacilities, listVenues } from "@/lib/data/repository";
import { eventLabel } from "@/lib/events";
import { SubmitForm, type VenueOption } from "@/components/SubmitForm";
import { SUBMISSIONS_DISABLED_REASON, submissionsStatus } from "@/lib/submissions/availability";
import Link from "next/link";

export function generateMetadata(): Metadata {
  return {
    title: "Report parking prices, reviews & lot info",
    description: "Share what you paid, how the tailgate was and how long it took to get out. Every report is moderated.",
    alternates: { canonical: "/submit" },
    // The form page has no standalone search value, and while reporting is off it's just a placeholder.
    robots: { index: false, follow: true },
  };
}

export default async function SubmitPage() {
  // The API enforces this on every request; the page just avoids showing a form that can't be sent.
  if (!submissionsStatus().enabled) return <ComingSoon />;

  const venues = await listVenues();
  const options: VenueOption[] = await Promise.all(
    venues.map(async (v) => ({
      slug: v.slug,
      name: v.name,
      lots: (await listFacilities(v.id)).map((f) => ({ slug: f.slug, name: f.name })),
      events: (await listEvents(v.id)).map((e) => ({ id: e.id, label: eventLabel(e) })),
    })),
  );
  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <h1 className="text-2xl font-extrabold">Share parking intel</h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Your report goes to a moderator before it appears. Approved reports show as <em>community-reported</em>, and
        their confidence rises as other fans confirm them.
      </p>
      <div className="mt-6">
        <SubmitForm venues={options} />
      </div>
    </div>
  );
}

function ComingSoon() {
  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <div className="rounded-3xl bg-white p-6 text-center ring-1 ring-black/5 dark:bg-ink-soft dark:ring-white/10">
        <p aria-hidden className="text-4xl">🦎</p>
        <h1 className="mt-2 text-2xl font-extrabold">Community reporting coming soon</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{SUBMISSIONS_DISABLED_REASON}</p>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          Soon you&apos;ll be able to share what you paid, how you paid, how the tailgate was and how long it took to get out.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link href="/venues/highmark-stadium" className="flex h-11 items-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-ink">
            Explore Highmark parking
          </Link>
          <Link href="/about/data" className="flex h-11 items-center rounded-xl px-4 text-sm font-semibold text-brand-700 ring-1 ring-brand-500/40 dark:text-brand-100">
            How we source data
          </Link>
        </div>
      </div>
    </div>
  );
}
