import { NextResponse } from "next/server";
import { collectSourceIds, getSourcesFor, getVenue, listFacilities, listVenues } from "@/lib/data/repository";

export async function generateStaticParams() {
  return (await listVenues()).map((v) => ({ venue: v.slug }));
}

export async function GET(_request: Request, ctx: RouteContext<"/api/v1/venues/[venue]">) {
  const venue = await getVenue((await ctx.params).venue);
  if (!venue) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const facilities = await listFacilities(venue.id);
  const sources = await getSourcesFor(collectSourceIds(venue, facilities));
  return NextResponse.json({
    data: { venue, facilities },
    sources,
    meta: { note: "Every fact includes an attribution with source IDs and a confidence level. Do not present low/unverified data as verified." },
  });
}
