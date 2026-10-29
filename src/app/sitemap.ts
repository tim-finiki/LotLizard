import type { MetadataRoute } from "next";
import { collectSourceIds, facilityAttributions, facilitySourceIds, getSourcesFor, listFacilities, listVenues } from "@/lib/data/repository";
import { facilityPath, isIndexableVenue, siteUrl, statePath, venuePath } from "@/lib/seo";
import { verificationSummary } from "@/lib/verification";
import { METROS, isIndexableMetro, metroPath } from "@/lib/metro";
import { listVenuesWithFacilities } from "@/lib/data/repository";

/**
 * Only pages we want indexed: venues with real parking data, their lots, and states that contain
 * at least one such venue. Directory-only venues stay reachable but are `noindex` and left out here.
 * `lastModified` comes from the data itself (latest source review or field check), never build time.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const entries: MetadataRoute.Sitemap = [];
  const states = new Set<string>();
  let latest: string | undefined;
  const all = await listVenuesWithFacilities();

  for (const venue of await listVenues()) {
    const facilities = await listFacilities(venue.id);
    if (!isIndexableVenue(venue, facilities)) continue;
    states.add(venue.address.state);
    const sources = await getSourcesFor(collectSourceIds(venue, facilities));
    const summary = verificationSummary([venue.attribution, ...facilities.flatMap(facilityAttributions)], sources, venue.attribution.confidence);
    const modified = summary.sourcesReviewedAt ?? summary.lastVerifiedAt;
    if (modified && (!latest || modified > latest)) latest = modified;
    entries.push({ url: base + venuePath(venue), lastModified: modified, changeFrequency: "weekly", priority: 0.9 });
    for (const f of facilities) {
      const s = verificationSummary(facilityAttributions(f), await getSourcesFor([...new Set(facilitySourceIds(f))]), f.attribution.confidence);
      entries.push({ url: base + facilityPath(venue, f), lastModified: s.sourcesReviewedAt ?? s.lastVerifiedAt, changeFrequency: "weekly", priority: 0.7 });
    }
  }

  return [
    { url: `${base}/`, lastModified: latest, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/venues`, lastModified: latest, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/about/data`, changeFrequency: "monthly", priority: 0.3 },
    ...entries,
    ...METROS.filter((m) => isIndexableMetro(m, all)).map((m) => ({ url: base + metroPath(m), lastModified: latest, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...[...states].sort().map((s) => ({ url: base + statePath(s), lastModified: latest, changeFrequency: "monthly" as const, priority: 0.5 })),
  ];
}
