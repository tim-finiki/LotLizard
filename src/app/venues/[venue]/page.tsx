import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { collectSourceIds, getSourcesFor, getVenue, listEvents, listFacilities, listVenues } from "@/lib/data/repository";
import { getPredictor } from "@/lib/predictions/predictor";
import { COVERAGE_LABEL, VENUE_TYPE_LABEL } from "@/lib/labels";
import { stateName } from "@/lib/states";
import { statePath, venueJsonLd, venuePath } from "@/lib/seo";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { JsonLd } from "@/components/JsonLd";
import { FactCard, Section } from "@/components/Section";
import { SourceList } from "@/components/SourceList";
import { SponsoredSlot } from "@/components/SponsoredSlot";
import { VenueExplorer } from "@/components/VenueExplorer";

export async function generateStaticParams() {
  return (await listVenues()).map((v) => ({ venue: v.slug }));
}

export async function generateMetadata({ params }: PageProps<"/venues/[venue]">): Promise<Metadata> {
  const venue = await getVenue((await params).venue);
  if (!venue) return {};
  const where = `${venue.address.city}, ${venue.address.state}`;
  const team = venue.teams[0] ? `${venue.teams[0]} ` : "";
  const title = `${venue.name} Parking Guide — ${team}lots, prices & tailgating`;
  const description =
    venue.coverage === "pilot_detailed"
      ? `Compare ${venue.name} parking in ${where}: official and private lots, prices, walking distance, tailgating rules and exit routes — with sources and confidence levels.`
      : `${venue.name} parking in ${where}. Parking data is coming soon — help other fans by sharing what you know.`;
  return {
    title,
    description,
    alternates: { canonical: venuePath(venue) },
    openGraph: { title, description, url: venuePath(venue) },
  };
}

export default async function VenuePage({ params }: PageProps<"/venues/[venue]">) {
  const venue = await getVenue((await params).venue);
  if (!venue) notFound();
  const facilities = await listFacilities(venue.id);
  const events = await listEvents(venue.id);
  const sources = await getSourcesFor(collectSourceIds(venue, facilities));
  const prediction = await getPredictor().predict({ venueSlug: venue.slug, facilitySlug: "*" });
  const detailed = facilities.length > 0;

  const breadcrumbs = (
    <Breadcrumbs
      items={[
        { name: "Venues", path: "/venues" },
        { name: stateName(venue.address.state), path: statePath(venue.address.state) },
        { name: venue.name, path: venuePath(venue) },
      ]}
    />
  );
  const overview = (
    <div className="flex flex-col gap-1">
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        {VENUE_TYPE_LABEL[venue.type]}
        {venue.teams.length > 0 && ` · ${venue.teams.join(", ")}`} · {venue.address.street ? `${venue.address.street}, ` : ""}
        {venue.address.city}, {venue.address.state} {venue.address.postalCode}
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-brand-100 px-2 py-0.5 font-semibold text-brand-700 dark:bg-brand-900 dark:text-brand-100">{COVERAGE_LABEL[venue.coverage]}</span>
        <ConfidenceBadge level={venue.attribution.confidence} />
      </div>
      {venue.summary && <p className="mt-2 text-sm">{venue.summary}</p>}
    </div>
  );

  return (
    <>
      <JsonLd data={venueJsonLd(venue)} />
      {detailed ? (
        // Map-first layout: compact title bar + full-height explorer; details follow below.
        <div className="flex h-[calc(100dvh-3.5rem)] min-h-[520px] flex-col">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-black/5 bg-white px-4 py-2 dark:border-white/10 dark:bg-neutral-900">
            <div className="min-w-0">
              <h1 className="truncate text-base font-extrabold leading-tight">{venue.name} parking</h1>
              <p className="truncate text-xs text-neutral-500">
                {venue.teams[0] ? `${venue.teams[0]} · ` : ""}
                {venue.address.city}, {venue.address.state}
              </p>
            </div>
            <a href="#venue-info" className="flex h-9 shrink-0 items-center rounded-full bg-neutral-100 px-3 text-xs font-semibold dark:bg-neutral-800">
              Info &amp; sources
            </a>
          </div>
          <div className="min-h-0 flex-1">
            <VenueExplorer venue={venue} facilities={facilities} events={events} />
          </div>
        </div>
      ) : null}

      <div id="venue-info" className="mx-auto max-w-5xl scroll-mt-16 px-4 pb-16 pt-4">
        {breadcrumbs}
        {detailed ? (
          <h2 className="mt-2 text-xl font-extrabold">About {venue.name} parking</h2>
        ) : (
          <h1 className="mt-2 text-2xl font-extrabold leading-tight sm:text-3xl">{venue.name} parking</h1>
        )}
        <div className="mt-1">{overview}</div>

        {!detailed && (
          <div className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10">
            <h2 className="text-lg font-bold">Parking data coming soon</h2>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              We haven&apos;t verified parking for {venue.name} yet, so we&apos;re not showing any. Know a lot, a price or a
              tailgate spot? Your report goes to our moderators and helps launch this guide.
            </p>
            <Link href={`/submit?venue=${venue.slug}`} className="mt-3 inline-flex h-11 items-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white">
              Share parking info
            </Link>
          </div>
        )}

        <div className="mt-10 flex flex-col gap-10">
          {venue.policies && venue.policies.length > 0 && (
            <Section id="policies" title="Rules & policies">
              <div className="grid gap-3 sm:grid-cols-2">
                {venue.policies.map((p) => (
                  <FactCard key={p.id} title={p.title} body={p.body} badge={<ConfidenceBadge level={p.attribution.confidence} compact />} />
                ))}
              </div>
            </Section>
          )}

          {(venue.transit?.length || venue.trafficNotes?.length) && (
            <Section id="getting-there" title="Getting there & getting out">
              <div className="grid gap-3 sm:grid-cols-2">
                {venue.transit?.map((t) => (
                  <FactCard key={t.id} title={t.name} body={t.description} badge={<ConfidenceBadge level={t.attribution.confidence} compact />} />
                ))}
                {venue.trafficNotes?.map((t) => (
                  <FactCard key={t.id} title={t.title} body={t.body} badge={<ConfidenceBadge level={t.attribution.confidence} compact />} />
                ))}
              </div>
            </Section>
          )}

          {detailed && (
            <Section id="predictions" title="Arrival & exit time predictions">
              <div className="rounded-2xl border border-dashed border-brand-500/40 bg-brand-50 p-4 text-sm dark:bg-brand-900/30">
                <p className="font-semibold">Coming soon</p>
                <p className="mt-1 text-neutral-700 dark:text-neutral-300">{prediction.status === "unavailable" ? prediction.reason : "Predictions available."}</p>
                <Link href={`/submit?venue=${venue.slug}&kind=exit_time`} className="mt-2 inline-block font-semibold text-brand-700 underline dark:text-brand-100">
                  Report how long it took you to get out →
                </Link>
              </div>
            </Section>
          )}

          <Suspense fallback={null}>
            <SponsoredSlot placement="venue_page" venueId={venue.id} />
          </Suspense>

          <Section
            id="sources"
            title="Sources & confidence"
            aside={<Link href="/about/data" className="text-sm font-semibold text-brand-700 dark:text-brand-100">How we rate data</Link>}
          >
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {venue.attribution.notes} Information reflects sources listed below as of their dates. Always confirm with
              official sources before you go.
            </p>
            <div className="rounded-2xl bg-white px-4 ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10">
              <SourceList sources={sources} />
            </div>
            <Link href={`/submit?venue=${venue.slug}&kind=correction`} className="text-sm font-semibold text-brand-700 underline dark:text-brand-100">
              Spot something wrong? Suggest a correction
            </Link>
          </Section>
        </div>
      </div>
    </>
  );
}
