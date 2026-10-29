import { NextResponse } from "next/server";
import { listVenues } from "@/lib/data/repository";

/** Public read API (v1). Includes coverage and attribution so consumers can respect confidence. */
export async function GET() {
  const venues = await listVenues();
  return NextResponse.json({
    data: venues.map((v) => ({
      slug: v.slug,
      name: v.name,
      type: v.type,
      teams: v.teams,
      address: v.address,
      location: v.location,
      coverage: v.coverage,
      attribution: v.attribution,
    })),
    meta: { license: "Contact LotLizard for commercial data licensing.", generatedFrom: "curated" },
  });
}
