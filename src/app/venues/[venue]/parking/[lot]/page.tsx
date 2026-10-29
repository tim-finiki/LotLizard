import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { Attribution } from "@/lib/types";
import {
  facilityAttributions,
  facilitySourceIds,
  getFacility,
  getSourcesFor,
  listAllFacilityParams,
  listEvents,
  listFacilities,
} from "@/lib/data/repository";
import { walkInfo } from "@/lib/ranking";
import { directionsLinks } from "@/lib/directions";
import { formatDistance } from "@/lib/geo";
import { AMENITY_LABEL, FACILITY_TYPE_COLOR, FACILITY_TYPE_LABEL } from "@/lib/labels";
import { NOINDEX_FOLLOW, facilityJsonLd, facilityPath, isIndexableVenue, venuePath } from "@/lib/seo";
import { verificationSummary } from "@/lib/verification";
import { VerificationStatus } from "@/components/VerificationStatus";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CommunityReports } from "@/components/CommunityReports";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { JsonLd } from "@/components/JsonLd";
import { ReferralLink } from "@/components/ReferralLink";
import { Section } from "@/components/Section";
import { PaymentDetails } from "@/components/PaymentInfo";
import { FeatureDetails } from "@/components/AmenityInfo";
import { eventLabel } from "@/lib/events";
import { submissionsStatus } from "@/lib/submissions/availability";
import { SourceList } from "@/components/SourceList";

export async function generateStaticParams() {
  return listAllFacilityParams();
}

export async function generateMetadata({ params }: PageProps<"/venues/[venue]/parking/[lot]">): Promise<Metadata> {
  const { venue: v, lot } = await params;
  const found = await getFacility(v, lot);
  if (!found) return {};
  const { venue, facility } = found;
  const title = `${facility.name} — ${venue.name} parking`;
  const description = `${facility.name} (${FACILITY_TYPE_LABEL[facility.type].toLowerCase()}) at ${venue.name}: prices, walking distance, tailgating and exit info with sources. ${facility.description}`.slice(0, 300);
  const siblings = await listFacilities(venue.id);
  return {
    title,
    description,
    alternates: { canonical: facilityPath(venue, facility) },
    openGraph: { title, description, url: facilityPath(venue, facility) },
    ...(isIndexableVenue(venue, siblings) ? {} : { robots: NOINDEX_FOLLOW }),
  };
}

function Row({ label, children, attribution }: { label: string; children: React.ReactNode; attribution?: Attribution }) {
  return (
    <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:gap-4">
      <dt className="w-40 shrink-0 text-sm text-neutral-500">{label}</dt>
      <dd className="flex-1 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{children}</span>
          {attribution && <ConfidenceBadge level={attribution.confidence} />}
        </div>
        {attribution?.notes && <p className="mt-0.5 text-xs text-neutral-500">{attribution.notes}</p>}
      </dd>
    </div>
  );
}

export default async function LotPage({ params }: PageProps<"/venues/[venue]/parking/[lot]">) {
  const { venue: v, lot } = await params;
  const found = await getFacility(v, lot);
  if (!found) notFound();
  const { venue, facility: f } = found;
  const sources = await getSourcesFor([...new Set(facilitySourceIds(f))]);
  const walk = walkInfo(f, venue);
  const allowed = f.tailgating.allowed.value;
  const directions = directionsLinks(f);
  const events = await listEvents(venue.id);
  const others = (await listFacilities(venue.id)).filter((o) => o.id !== f.id);
  const verification = verificationSummary(facilityAttributions(f), sources, f.attribution.confidence);
  const crumbs = [
    { name: "Venues", path: "/venues" },
    { name: venue.name, path: venuePath(venue) },
    { name: f.name, path: facilityPath(venue, f) },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-4">
      <JsonLd data={facilityJsonLd(venue, f)} />
      <Breadcrumbs items={crumbs} />
      <header className="mt-2 flex flex-col gap-2">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-semibold ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10">
          <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: FACILITY_TYPE_COLOR[f.type] }} />
          {FACILITY_TYPE_LABEL[f.type]}
        </span>
        <h1 className="text-2xl font-extrabold leading-tight">{f.name}</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {venue.name} · {f.address ?? `${venue.address.city}, ${venue.address.state}`}
        </p>
        <VerificationStatus summary={verification} />
        <p className="text-sm">{f.description}</p>
        {f.booking && <ReferralLink booking={f.booking} />}
        {directions ? (
          <div className="flex flex-wrap items-center gap-2">
            <a href={directions.google} target="_blank" rel="noopener noreferrer" className="flex h-10 items-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white">
              Google Maps directions
            </a>
            <a href={directions.apple} target="_blank" rel="noopener noreferrer" className="flex h-10 items-center rounded-lg bg-neutral-900 px-4 text-sm font-semibold text-white dark:bg-white dark:text-neutral-900">
              Apple Maps
            </a>
            <span className="text-xs text-neutral-500">{directions.basis === "street_address" ? "Routes to the listed street address." : "Routes to the verified entrance."}</span>
          </div>
        ) : (
          <p className="text-xs text-neutral-500">No turn-by-turn directions yet: this lot&apos;s entrance hasn&apos;t been verified, and we won&apos;t route you to an approximate pin.</p>
        )}
      </header>

      <div className="mt-8 flex flex-col gap-10">
        <Section id="pricing" title="Pricing">
          {f.prices.length === 0 ? (
            <p className="text-sm text-neutral-500">No price data yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {f.prices.map((p) => (
                <li key={p.id} className="rounded-xl bg-white p-3 ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-lg font-bold">
                      {p.min === p.max ? `$${p.min}` : `$${p.min}–$${p.max}`}
                      <span className="ml-2 text-xs font-normal text-neutral-500">
                        {p.vehicle} · {p.season ?? p.observedAt}
                      </span>
                    </span>
                    <ConfidenceBadge level={p.attribution.confidence} />
                  </div>
                  {p.paymentNotes && <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{p.paymentNotes}</p>}
                  {p.attribution.notes && <p className="mt-1 text-xs text-neutral-500">{p.attribution.notes}</p>}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section
          id="payment"
          title="Payment"
          aside={<Link href={`/submit?venue=${venue.slug}&lot=${f.slug}&kind=payment`} className="text-sm font-semibold text-brand-700 dark:text-brand-100">Update</Link>}
        >
          <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10">
            <PaymentDetails policy={f.payment} heading="General policy" />
          </div>
          {f.paymentOverrides?.map((o) => {
            const ev = events.find((e) => e.id === o.eventId);
            return (
              <div key={o.eventId} className="rounded-2xl bg-white p-4 ring-1 ring-brand-500/30 dark:bg-neutral-900">
                <PaymentDetails policy={o.policy} heading={`Game-day policy: ${ev ? eventLabel(ev) : o.eventId} (replaces the general policy for this game)`} />
              </div>
            );
          })}
        </Section>

        <Section id="amenities" title="Parking amenities">
          <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10">
            <FeatureDetails facility={f} />
          </div>
          <p className="text-xs text-neutral-500">
            &ldquo;Unknown&rdquo; means no source has confirmed it either way. We never assume an amenity is there.
          </p>
        </Section>

        <Section id="details" title="Details">
          <dl className="divide-y divide-black/5 rounded-2xl bg-white px-4 ring-1 ring-black/5 dark:divide-white/10 dark:bg-neutral-900 dark:ring-white/10">
            <Row label="Walk to stadium" attribution={walk && !walk.estimated ? f.walkMinutes?.attribution : undefined}>
              {walk ? (
                <>
                  {walk.estimated ? "~" : ""}
                  {walk.minutes} min{walk.meters !== undefined && ` (${formatDistance(walk.meters)})`}
                  {walk.estimated && <span className="ml-1 text-xs font-normal text-neutral-500">estimated from an approximate pin</span>}
                </>
              ) : (
                "Unknown — location not confirmed"
              )}
            </Row>
            <Row label="Tailgating" attribution={f.tailgating.allowed.attribution}>
              {allowed === "unknown" ? "Unknown" : allowed ? "Allowed" : "Not allowed"}
            </Row>
            {f.tailgating.atmosphere && (
              <Row label="Tailgate atmosphere" attribution={f.tailgating.atmosphere.attribution}>
                {f.tailgating.atmosphere.value}/5
              </Row>
            )}
            {f.tailgating.notes && <Row label="Tailgate rules">{f.tailgating.notes}</Row>}
            <Row label="Exit" attribution={f.exit.rating?.attribution}>
              {f.exit.rating ? `${f.exit.rating.value}/5` : "No exit-time data yet"}
            </Row>
            {f.exit.routes && f.exit.routes.length > 0 && <Row label="Exit routes">{f.exit.routes.join("; ")}</Row>}
            <Row label="Other extras" attribution={f.amenities.attribution}>
              {f.amenities.value.length ? f.amenities.value.map((a) => AMENITY_LABEL[a]).join(", ") : "Unknown"}
            </Row>
            <Row label="Vehicles">{f.vehicleTypes.length ? f.vehicleTypes.join(", ") : "—"}</Row>
            {f.operator && <Row label="Operator">{f.operator}</Row>}
            <Row label="Map pin">{f.location ? (f.location.precision === "exact" ? "Exact" : "Approximate") : "Not mapped"}</Row>
          </dl>
          <p className="text-xs text-neutral-500">{f.attribution.notes}</p>
        </Section>

        <Section
          id="community"
          title="Community reports"
          aside={<Link href={`/submit?venue=${venue.slug}&lot=${f.slug}`} className="text-sm font-semibold text-brand-700 dark:text-brand-100">Add yours</Link>}
        >
          {/* While reporting is off there is nothing to read at request time, so the page stays static. */}
          {submissionsStatus().enabled ? (
            <Suspense fallback={<p className="text-sm text-neutral-500">Loading community reports…</p>}>
              <CommunityReports venueSlug={venue.slug} facilitySlug={f.slug} />
            </Suspense>
          ) : (
            <p className="text-sm text-neutral-500">Community reporting is coming soon.</p>
          )}
        </Section>

        <Section id="sources" title="Sources">
          <div className="rounded-2xl bg-white px-4 ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10">
            <SourceList sources={sources} />
          </div>
        </Section>

        <div className="flex flex-wrap gap-2">
          <Link href={`/submit?venue=${venue.slug}&lot=${f.slug}&kind=price`} className="flex h-11 items-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white">Report a price</Link>
          <Link href={`/submit?venue=${venue.slug}&lot=${f.slug}&kind=review`} className="flex h-11 items-center rounded-lg bg-neutral-900 px-4 text-sm font-semibold text-white dark:bg-white dark:text-neutral-900">Write a review</Link>
          <Link href={`/submit?venue=${venue.slug}&lot=${f.slug}&kind=correction`} className="flex h-11 items-center rounded-lg px-4 text-sm font-semibold text-brand-700 ring-1 ring-brand-500/40 dark:text-brand-100">Suggest a correction</Link>
        </div>
        {others.length > 0 && (
          <Section id="other-parking" title={`Other parking at ${venue.name}`}>
            <ul className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
              {others.map((o) => (
                <li key={o.id}>
                  <Link href={facilityPath(venue, o)} className="font-medium text-brand-700 underline-offset-2 hover:underline dark:text-brand-100">
                    {o.name}
                  </Link>
                  <span className="text-neutral-500"> · {FACILITY_TYPE_LABEL[o.type]}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}
        <Link href={venuePath(venue)} className="text-sm font-semibold text-brand-700 dark:text-brand-100">← All {venue.name} parking</Link>
      </div>
    </div>
  );
}
