import type { Metadata } from "next";
import { listVenuesWithFacilities } from "@/lib/data/repository";
import { lotSearchEntry } from "@/lib/lot-search";
import { VenueDirectory } from "@/components/VenueDirectory";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SOURCES } from "@/lib/data/catalog";
import { publicSources, publicVenue } from "@/lib/public-data";

export const metadata: Metadata = {
  title: "Stadium, arena & concert venue parking directory",
  description: "Find parking guides for stadiums, arenas, ballparks and amphitheaters across the United States.",
  alternates: { canonical: "/venues" },
};

export default async function VenuesPage() {
  const withLots = await listVenuesWithFacilities();
  // VenueDirectory is a client component, so it gets the public view of each venue.
  const publicIds = new Set(publicSources(SOURCES).map((s) => s.id));
  const venues = withLots.map((x) => publicVenue(x.venue, publicIds));
  const lots = withLots.flatMap(({ venue, facilities }) => facilities.map((f) => lotSearchEntry(venue, f)));
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Venues", path: "/venues" }]} />
      <h1 className="mt-2 text-2xl font-extrabold">Venue directory</h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Venues with a parking guide come first. The rest are listed until we have sourced parking data for them —
        we never fill pages with made-up lots.
      </p>
      <div className="mt-2">
        <VenueDirectory venues={venues} lots={lots} />
      </div>
    </div>
  );
}
