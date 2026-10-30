import { NextResponse } from "next/server";
import { collectSourceIds, getSourcesFor, getVenue, listFacilities, listVenues } from "@/lib/data/repository";
import { publicVenueData } from "@/lib/public-data";

export async function generateStaticParams() {
  return (await listVenues()).map((v) => ({ venue: v.slug }));
}

export async function GET(_request: Request, ctx: RouteContext<"/api/v1/venues/[venue]">) {
  const venue = await getVenue((await ctx.params).venue);
  if (!venue) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const facilities = await listFacilities(venue.id);
  // Public view only: an explicit allowlist of fields and citations (src/lib/public-data.ts).
  const pub = publicVenueData(venue, facilities, await getSourcesFor(collectSourceIds(venue, facilities)));
  return NextResponse.json({
    data: { venue: pub.venue, facilities: pub.facilities },
    sources: pub.sources,
    meta: { note: "Every fact includes a confidence level, and source IDs for its public citations. Do not present low/unverified data as verified." },
  });
}
