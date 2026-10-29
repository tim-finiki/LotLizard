import type { Metadata } from "next";
import { listVenues } from "@/lib/data/repository";
import { VenueDirectory } from "@/components/VenueDirectory";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const metadata: Metadata = {
  title: "Stadium, arena & concert venue parking directory",
  description: "Find parking guides for stadiums, arenas, ballparks and amphitheaters across the United States.",
  alternates: { canonical: "/venues" },
};

export default async function VenuesPage() {
  const venues = await listVenues();
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Venues", path: "/venues" }]} />
      <h1 className="mt-2 text-2xl font-extrabold">Venue directory</h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Detailed parking data is live for our pilot venue. Other venues are listed so fans can contribute — we never
        fill pages with made-up lots.
      </p>
      <div className="mt-2">
        <VenueDirectory venues={venues} />
      </div>
    </div>
  );
}
