import type { MetadataRoute } from "next";
import { listAllFacilityParams, listStatesWithVenues, listVenues } from "@/lib/data/repository";
import { siteUrl, statePath } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const [venues, lots, states] = await Promise.all([listVenues(), listAllFacilityParams(), listStatesWithVenues()]);
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/venues`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/about/data`, changeFrequency: "monthly", priority: 0.3 },
    ...venues.map((v) => ({
      url: `${base}/venues/${v.slug}`,
      changeFrequency: "weekly" as const,
      priority: v.coverage === "pilot_detailed" ? 0.9 : 0.5,
    })),
    ...lots.map((l) => ({ url: `${base}/venues/${l.venue}/parking/${l.lot}`, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...states.map((s) => ({ url: `${base}${statePath(s)}`, changeFrequency: "monthly" as const, priority: 0.4 })),
  ];
}
