import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { listFacilities, listStatesWithVenues, listVenuesByState } from "@/lib/data/repository";
import { stateName, US_STATES } from "@/lib/states";
import { NOINDEX_FOLLOW, isIndexableVenue, statePath } from "@/lib/seo";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { VenueCard } from "@/components/VenueCard";

export async function generateStaticParams() {
  return (await listStatesWithVenues()).map((s) => ({ state: s.toLowerCase() }));
}

export async function generateMetadata({ params }: PageProps<"/states/[state]">): Promise<Metadata> {
  const code = (await params).state.toUpperCase();
  if (!US_STATES[code]) return {};
  const name = stateName(code);
  let indexable = false;
  for (const v of await listVenuesByState(code)) {
    if (isIndexableVenue(v, await listFacilities(v.id))) indexable = true;
  }
  return {
    title: `${name} stadium & event parking`,
    description: `Parking guides for stadiums, arenas and concert venues in ${name}. Compare lots, prices, tailgating and walking distance.`,
    alternates: { canonical: statePath(code) },
    // A state page that only lists directory venues is thin; keep it crawlable but out of the index.
    ...(indexable ? {} : { robots: NOINDEX_FOLLOW }),
  };
}

export default async function StatePage({ params }: PageProps<"/states/[state]">) {
  const code = (await params).state.toUpperCase();
  if (!US_STATES[code]) notFound();
  const venues = await listVenuesByState(code);
  if (venues.length === 0) notFound();
  const name = stateName(code);
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Breadcrumbs items={[{ name: "Venues", path: "/venues" }, { name, path: statePath(code) }]} />
      <h1 className="mt-2 text-2xl font-extrabold">{name} event parking</h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        {venues.length} {venues.length === 1 ? "venue" : "venues"} in {name}.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {venues.map((v) => (
          <VenueCard key={v.id} venue={v} />
        ))}
      </div>
    </div>
  );
}
