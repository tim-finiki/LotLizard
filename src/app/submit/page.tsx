import type { Metadata } from "next";
import { listEvents, listFacilities, listVenues } from "@/lib/data/repository";
import { eventLabel } from "@/lib/events";
import { SubmitForm, type VenueOption } from "@/components/SubmitForm";

export const metadata: Metadata = {
  title: "Report parking prices, reviews & lot info",
  description: "Share what you paid, how the tailgate was and how long it took to get out. Every report is moderated.",
  alternates: { canonical: "/submit" },
};

export default async function SubmitPage() {
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
