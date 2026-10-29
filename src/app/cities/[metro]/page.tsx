import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { collectSourceIds, facilityAttributions, getSourcesFor, listVenuesWithFacilities } from "@/lib/data/repository";
import { METROS, compareVenue, metroOf, guideVenues, isIndexableMetro, metroHasPage, metroPath, sharedLots, type VenueComparison } from "@/lib/metro";
import { NOINDEX_FOLLOW, facilityPath, metroJsonLd, statePath, venuePath } from "@/lib/seo";
import { stateName } from "@/lib/states";
import { FACILITY_TYPE_LABEL, VENUE_TYPE_LABEL } from "@/lib/labels";
import { verificationSummary } from "@/lib/verification";
import { lowestConfidence } from "@/lib/confidence";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { Section } from "@/components/Section";
import { SourceList } from "@/components/SourceList";
import { VerificationStatus } from "@/components/VerificationStatus";

export async function generateStaticParams() {
  const all = await listVenuesWithFacilities();
  return METROS.filter((m) => metroHasPage(m, all)).map((m) => ({ metro: m.slug }));
}

async function load(slug: string) {
  const metro = METROS.find((m) => m.slug === slug);
  if (!metro) return undefined;
  const all = await listVenuesWithFacilities();
  if (!metroHasPage(metro, all)) return undefined;
  return { metro, all, venues: guideVenues(metro, all) };
}

export async function generateMetadata({ params }: PageProps<"/cities/[metro]">): Promise<Metadata> {
  const found = await load((await params).metro);
  if (!found) return {};
  const { metro, all, venues } = found;
  const names = venues.map((v) => v.venue.name);
  const lots = venues.reduce((n, v) => n + v.facilities.length, 0);
  const title = `${metro.name} stadium parking: ${names.join(" vs. ")}`;
  const description = `Compare parking at ${names.join(", ")} in ${metro.name}: ${lots} lots and garages side by side — prices, cashless and prepaid rules, tailgating and transit, with sources.`;
  return {
    title,
    description,
    alternates: { canonical: metroPath(metro) },
    openGraph: { title, description, url: metroPath(metro) },
    ...(isIndexableMetro(metro, all) ? {} : { robots: NOINDEX_FOLLOW }),
  };
}

function priceText(c: VenueComparison) {
  if (!c.carPrice) return "No price reported";
  const { min, max, lotSpecific, season } = c.carPrice;
  const range = min === max ? `$${min}` : `$${min}–$${max}`;
  return `${range}${season ? ` (${season})` : ""}${lotSpecific ? "" : ", venue-wide rate"}`;
}

function countText(n: number, known: number, total: number, what: string) {
  if (known === 0) return "Unknown";
  return `${n} of ${known} lots ${what}${known < total ? ` (unknown for ${total - known})` : ""}`;
}

function tailgateText(c: VenueComparison) {
  const { allowed, notAllowed, unknown } = c.tailgating;
  const parts = [allowed && `allowed in ${allowed}`, notAllowed && `not allowed in ${notAllowed}`, unknown && `unknown for ${unknown}`].filter(Boolean);
  return parts.length ? `${parts.join(", ")} of ${c.lots} options` : "Unknown";
}

export default async function MetroPage({ params }: PageProps<"/cities/[metro]">) {
  const found = await load((await params).metro);
  if (!found) notFound();
  const { metro, all, venues } = found;
  const shared = sharedLots(venues);
  const comparisons = venues.map((v) => ({ ...v, c: compareVenue(v) }));
  const others = all.filter((x) => x.venue.coverage === "venue_only" && metroOf(x.venue)?.slug === metro.slug);
  const sources = await getSourcesFor([...new Set(venues.flatMap((v) => collectSourceIds(v.venue, v.facilities)))]);
  const summary = verificationSummary(
    venues.flatMap((v) => [v.venue.attribution, ...v.facilities.flatMap(facilityAttributions)]),
    sources,
    lowestConfidence(venues.map((v) => v.venue.attribution)),
  );

  const rows: [string, (c: VenueComparison) => string][] = [
    ["Parking options tracked", (c) => String(c.lots)],
    ["Car parking price", priceText],
    ["Cashless", (c) => countText(c.cashless.lots, c.cashless.known, c.lots, "with known cash rules are cashless")],
    ["Prepaid pass required", (c) => countText(c.prepayRequired.lots, c.prepayRequired.known, c.lots, "with known payment timing need a prepaid pass")],
    ["Tailgating", tailgateText],
    ["Official lots open", (c) => (c.lotOpenHoursBefore !== undefined ? `${c.lotOpenHoursBefore} hours before the event` : "Not published")],
    ["Covered garages", (c) => (c.covered ? `${c.covered} confirmed` : "None confirmed")],
    ["Accessible parking", (c) => (c.accessible ? `${c.accessible} options confirmed` : "None confirmed")],
    ["Transit", (c) => (c.transit.length ? c.transit.join("; ") : "None listed")],
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-4">
      <JsonLd data={metroJsonLd(metro, venues.map((v) => v.venue))} />
      <Breadcrumbs
        items={[
          { name: "Venues", path: "/venues" },
          { name: stateName(metro.state), path: statePath(metro.state) },
          { name: metro.name, path: metroPath(metro) },
        ]}
      />
      <h1 className="mt-2 text-2xl font-extrabold leading-tight sm:text-3xl">{metro.name} stadium &amp; event parking</h1>
      <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">
        Parking compared across {venues.length} {metro.name} venues with LotLizard guides:{" "}
        {venues.map((v, i) => (
          <span key={v.venue.id}>
            {i > 0 && (i === venues.length - 1 ? " and " : ", ")}
            <Link href={venuePath(v.venue)} className="font-semibold text-brand-700 underline-offset-2 hover:underline dark:text-brand-100">
              {v.venue.name}
            </Link>
          </span>
        ))}
        . Every number below comes from the lots and sources on each venue&apos;s guide; unknowns are shown as unknown.
      </p>
      <div className="mt-2">
        <VerificationStatus summary={summary} />
      </div>

      <div className="mt-8 flex flex-col gap-10">
        <Section id="compare" title={`${metro.name} venues side by side`}>
          <div className="grid gap-3 md:grid-cols-2">
            {comparisons.map(({ venue, c }) => (
              <div key={venue.id} className="rounded-2xl bg-white p-4 ring-1 ring-black/5 dark:bg-ink-soft dark:ring-white/10">
                <h3 className="text-base font-bold">
                  <Link href={venuePath(venue)} className="text-brand-700 underline-offset-2 hover:underline dark:text-brand-100">
                    {venue.name}
                  </Link>
                </h3>
                <p className="text-xs text-neutral-500">
                  {VENUE_TYPE_LABEL[venue.type]}
                  {venue.teams.length > 0 && ` · ${venue.teams.join(", ")}`}
                </p>
                <dl className="mt-3 grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm">
                  {rows.map(([label, fn]) => (
                    <div key={label} className="contents">
                      <dt className="text-neutral-500">{label}</dt>
                      <dd className="min-w-0 break-words">{fn(c)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </Section>

        {shared.length > 0 && (
          <Section id="shared" title="Lots that serve more than one venue">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              These lots and garages are listed for more than one {metro.name} venue. Rules and prices can differ by event, so
              each link goes to that venue&apos;s version.
            </p>
            <ul className="flex flex-col gap-2">
              {shared.map((s) => (
                <li key={s.name} className="rounded-xl bg-white px-4 py-3 text-sm ring-1 ring-black/5 dark:bg-ink-soft dark:ring-white/10">
                  <span className="font-semibold">{s.name}</span>
                  <span className="text-neutral-500"> · </span>
                  {s.at.map((x, i) => (
                    <span key={x.venue.id}>
                      {i > 0 && " · "}
                      <Link href={facilityPath(x.venue, x.facility)} className="text-brand-700 underline-offset-2 hover:underline dark:text-brand-100">
                        for {x.venue.name}
                      </Link>
                    </span>
                  ))}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {venues.map(({ venue, facilities }) => (
          <Section key={venue.id} id={`lots-${venue.slug}`} title={`${venue.name} parking options`}>
            <ul className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
              {facilities.map((f) => (
                <li key={f.id}>
                  <Link href={facilityPath(venue, f)} className="font-medium text-brand-700 underline-offset-2 hover:underline dark:text-brand-100">
                    {f.name}
                  </Link>
                  <span className="text-neutral-500"> · {FACILITY_TYPE_LABEL[f.type]}</span>
                </li>
              ))}
            </ul>
            <Link href={venuePath(venue)} className="text-sm font-semibold text-brand-700 dark:text-brand-100">
              Full {venue.name} parking guide →
            </Link>
          </Section>
        ))}

        {others.length > 0 && (
          <Section id="more" title={`More ${metro.name} venues`}>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">Listed, but no sourced parking data yet:</p>
            <ul className="flex flex-wrap gap-2 text-sm">
              {others.map(({ venue }) => (
                <li key={venue.id}>
                  <Link href={venuePath(venue)} className="rounded-full bg-white px-3 py-1 ring-1 ring-black/5 dark:bg-ink-soft dark:ring-white/10">
                    {venue.name}
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <Section
          id="sources"
          title="Sources & confidence"
          aside={<Link href="/about/data" className="text-sm font-semibold text-brand-700 dark:text-brand-100">How we rate data</Link>}
        >
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Compiled from the sources below as of their dates. Always confirm with the venue or operator before you go.
          </p>
          <div className="rounded-2xl bg-white px-4 ring-1 ring-black/5 dark:bg-ink-soft dark:ring-white/10">
            <SourceList sources={sources} />
          </div>
        </Section>
      </div>
    </div>
  );
}
