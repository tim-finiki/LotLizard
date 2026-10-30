import { NextResponse } from "next/server";
import { listVenues } from "@/lib/data/repository";
import { SOURCES } from "@/lib/data/catalog";
import { publicAttribution, publicSources } from "@/lib/public-data";

/** Public read API (v1). Includes coverage and attribution so consumers can respect confidence. */
export async function GET() {
  const venues = await listVenues();
  const publicIds = new Set(publicSources(SOURCES).map((s) => s.id));
  return NextResponse.json({
    data: venues.map((v) => ({
      slug: v.slug,
      name: v.name,
      type: v.type,
      teams: v.teams,
      address: v.address,
      location: v.location,
      coverage: v.coverage,
      attribution: publicAttribution(v.attribution, publicIds),
    })),
    meta: { license: "Contact LotLizard for commercial data licensing.", generatedFrom: "curated" },
  });
}
