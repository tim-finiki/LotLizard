import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

/**
 * All crawlers, including AI search and assistant crawlers, may read public pages and the
 * read-only data API (/api/v1), which carries the same facts with sources and confidence.
 * Moderation, submission and diagnostic endpoints stay out.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/api/v1/"],
      disallow: ["/admin", "/api/admin", "/api/submissions", "/api/version"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
