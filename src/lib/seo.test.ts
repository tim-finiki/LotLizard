/**
 * SEO and machine-readability guardrails: only data-backed pages are indexed, structured data never
 * claims more than the data supports, and the plain-text summaries state unknowns as unknown.
 */
import { describe, expect, it } from "vitest";
import { VENUES } from "@/lib/data/venues";
import { HIGHMARK_FACILITIES } from "@/lib/data/facilities/highmark";
import { EVENTS } from "@/lib/data/events";
import { SOURCES } from "@/lib/data/sources";
import { facilityAttributions } from "@/lib/data/repository";
import { MIN_FACILITIES_TO_INDEX, facilityJsonLd, isIndexableVenue, siteJsonLd, siteUrl, venueJsonLd, zonedDateTime } from "@/lib/seo";
import { summarizeFacility } from "@/lib/facility-summary";
import { formatDate, verificationSummary } from "@/lib/verification";
import { featureState } from "@/lib/features";
import type { Attribution, DataSource, ParkingFacility } from "@/lib/types";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";

const highmark = VENUES.find((v) => v.id === "highmark-stadium")!;
const directory = VENUES.filter((v) => v.coverage === "venue_only");
const events = EVENTS.filter((e) => e.venueId === highmark.id);
const facility = (slug: string) => HIGHMARK_FACILITIES.find((f) => f.slug === slug)!;

describe("indexability", () => {
  it("indexes the pilot venue and no directory-only venue", () => {
    expect(isIndexableVenue(highmark, HIGHMARK_FACILITIES.length)).toBe(true);
    expect(directory.length).toBeGreaterThan(0);
    for (const v of directory) expect(isIndexableVenue(v, 0)).toBe(false);
  });

  it("requires a minimum number of parking options", () => {
    expect(isIndexableVenue(highmark, MIN_FACILITIES_TO_INDEX - 1)).toBe(false);
    expect(isIndexableVenue({ ...highmark, coverage: "venue_only" }, 50)).toBe(false);
  });
});

describe("sitemap", () => {
  it("lists only indexable venues, their lots and states, each venue/lot with lastmod", async () => {
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls).toContain(`${siteUrl()}/venues/highmark-stadium`);
    for (const f of HIGHMARK_FACILITIES) expect(urls).toContain(`${siteUrl()}/venues/highmark-stadium/parking/${f.slug}`);
    for (const v of directory) expect(urls).not.toContain(`${siteUrl()}/venues/${v.slug}`);
    expect(urls.some((u) => u.endsWith("/submit"))).toBe(false);
    expect(urls.filter((u) => u.includes("/states/"))).toEqual([`${siteUrl()}/states/ny`]);
    for (const e of entries.filter((e) => e.url.includes("/venues/"))) {
      expect(e.lastModified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

describe("robots", () => {
  it("allows public pages and the data API, blocks private endpoints, points to the sitemap", () => {
    const r = robots();
    const rule = Array.isArray(r.rules) ? r.rules[0] : r.rules;
    expect(rule.userAgent).toBe("*");
    expect(rule.allow).toEqual(expect.arrayContaining(["/", "/api/v1/"]));
    expect(rule.disallow).toEqual(expect.arrayContaining(["/admin", "/api/admin", "/api/submissions", "/api/version"]));
    expect(rule.disallow).not.toContain("/api/");
    expect(r.sitemap).toBe(`${siteUrl()}/sitemap.xml`);
  });
});

/** Walk any JSON-LD tree and collect every @type and key. */
function walk(node: unknown, types: Set<string>, keys: Set<string>) {
  if (Array.isArray(node)) return node.forEach((n) => walk(n, types, keys));
  if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      keys.add(k);
      if (k === "@type") types.add(String(v));
      walk(v, types, keys);
    }
  }
}

const ALLOWED_TYPES = new Set([
  "StadiumOrArena",
  "ParkingFacility",
  "PostalAddress",
  "GeoCoordinates",
  "SportsEvent",
  "LocationFeatureSpecification",
  "WebSite",
  "Organization",
  "BreadcrumbList",
  "ListItem",
]);
const FORBIDDEN_KEYS = ["priceRange", "aggregateRating", "review", "offers", "openingHoursSpecification"];

describe("structured data", () => {
  const all = [venueJsonLd(highmark, HIGHMARK_FACILITIES, events), ...HIGHMARK_FACILITIES.map((f) => facilityJsonLd(highmark, f)), ...siteJsonLd()];

  it("uses only expected schema.org types and makes no rating, price or offer claims", () => {
    const types = new Set<string>();
    const keys = new Set<string>();
    walk(all, types, keys);
    for (const t of types) expect(ALLOWED_TYPES.has(t), t).toBe(true);
    for (const k of FORBIDDEN_KEYS) expect(keys.has(k), k).toBe(false);
  });

  it("uses absolute URLs", () => {
    const urls: string[] = [];
    const collect = (n: unknown): void => {
      if (Array.isArray(n)) return n.forEach(collect);
      if (n && typeof n === "object") for (const [k, v] of Object.entries(n)) {
        if (k === "url") urls.push(String(v));
        else collect(v);
      }
    };
    collect(all);
    expect(urls.length).toBeGreaterThan(0);
    for (const u of urls) expect(u.startsWith(siteUrl())).toBe(true);
  });

  it("venue lists every published lot and every sourced event", () => {
    const ld = venueJsonLd(highmark, HIGHMARK_FACILITIES, events) as { containsPlace?: unknown[]; event?: { startDate: string }[] };
    expect(ld.containsPlace).toHaveLength(HIGHMARK_FACILITIES.length);
    expect(ld.event).toHaveLength(events.length);
    for (const [i, e] of events.entries()) {
      expect(ld.event![i].startDate).toBe(e.startLocal ? zonedDateTime(e.date, e.startLocal, highmark.timezone!) : e.date);
    }
  });

  it("directory venues carry no parking or events", () => {
    const ld = venueJsonLd(directory[0]) as Record<string, unknown>;
    expect(ld.containsPlace).toBeUndefined();
    expect(ld.event).toBeUndefined();
  });

  it("lot geo is published only for exact pins", () => {
    for (const f of HIGHMARK_FACILITIES) {
      const ld = facilityJsonLd(highmark, f) as Record<string, unknown>;
      expect("geo" in ld).toBe(f.location?.precision === "exact");
    }
  });

  it("lot amenityFeature lists only confirmed amenities with the confirmed value", () => {
    for (const f of HIGHMARK_FACILITIES) {
      const ld = facilityJsonLd(highmark, f) as { amenityFeature?: { name: string; value: boolean }[] };
      const confirmed = (["covered", "ev_charging", "ada", "restrooms"] as const).filter((k) => featureState(f, k) !== "unknown");
      expect(ld.amenityFeature?.length ?? 0).toBe(confirmed.length);
      for (const [i, k] of confirmed.entries()) expect(ld.amenityFeature![i].value).toBe(featureState(f, k) === "available");
    }
  });
});

describe("zonedDateTime", () => {
  it("applies the venue's UTC offset including DST", () => {
    expect(zonedDateTime("2026-11-26", "20:20", "America/New_York")).toBe("2026-11-26T20:20:00-05:00");
    expect(zonedDateTime("2026-09-13", "13:00", "America/New_York")).toBe("2026-09-13T13:00:00-04:00");
    expect(zonedDateTime("2026-09-13", "13:00", "UTC")).toBe("2026-09-13T13:00:00+00:00");
  });
});

const attr = (over: Partial<Attribution> = {}): Attribution => ({ sourceIds: [], confidence: "medium", ...over });
const src = (id: string, type: DataSource["type"], retrievedAt: string) => ({ ...SOURCES[0], id, type, retrievedAt });

describe("verificationSummary", () => {
  it("does not treat reviewed published sources as field verification", () => {
    const s = verificationSummary([attr()], [src("a", "official", "2026-08-01"), src("b", "media", "2026-09-15")], "medium");
    expect(s).toEqual({ fieldVerified: false, lastVerifiedAt: undefined, sourcesReviewedAt: "2026-09-15", confidence: "medium" });
  });

  it("counts lastVerifiedAt and LotLizard field sources as field verification", () => {
    expect(verificationSummary([attr({ lastVerifiedAt: "2026-10-01" })], [], "high").lastVerifiedAt).toBe("2026-10-01");
    const s = verificationSummary([attr({ lastVerifiedAt: "2026-10-01" })], [src("f", "lotlizard_field", "2026-10-20")], "verified");
    expect(s.fieldVerified).toBe(true);
    expect(s.lastVerifiedAt).toBe("2026-10-20");
  });

  it("formats dates without timezone drift", () => {
    expect(formatDate("2026-10-29")).toBe("Oct 29, 2026");
    expect(formatDate("2027-01-01")).toBe("Jan 1, 2027");
  });

  it("the pilot data reports honestly on its field-verification state", () => {
    for (const f of HIGHMARK_FACILITIES) {
      const ids = new Set(facilityAttributions(f).flatMap((a) => a.sourceIds));
      const sources = SOURCES.filter((s) => ids.has(s.id));
      const s = verificationSummary(facilityAttributions(f), sources, f.attribution.confidence);
      expect(s.fieldVerified).toBe(sources.some((x) => x.type === "lotlizard_field") || facilityAttributions(f).some((a) => !!a.lastVerifiedAt));
      expect(s.sourcesReviewedAt).toBeDefined();
    }
  });
});

describe("summarizeFacility", () => {
  const base = facility("gold-lot");
  const blank: ParkingFacility = {
    ...base,
    prices: [],
    location: undefined,
    walkMinutes: undefined,
    payment: undefined,
    features: undefined,
    tailgating: { allowed: { value: "unknown", attribution: attr() } },
  };

  it("states unknowns as unknown rather than inferring", () => {
    const s = summarizeFacility(blank, highmark);
    expect(s).toEqual({
      price: "Not reported",
      walk: "Location not confirmed",
      payment: "Unknown",
      amenities: "None confirmed yet",
      tailgating: "Unknown",
    });
  });

  it("labels area-wide prices and estimated walks", () => {
    const s = summarizeFacility(
      {
        ...blank,
        location: { ...highmark.location, precision: "approximate" },
        prices: [{ id: "p", vehicle: "car", min: 40, max: 60, eventKind: "nfl_regular", scope: "area", observedAt: "2026-09-01", attribution: attr({ confidence: "low" }) }],
      } as ParkingFacility,
      highmark,
    );
    expect(s.price).toMatch(/^\$40–\$60 \(area-wide range, not specific to this lot\), /);
    expect(s.walk).toMatch(/^About \d+ min to the stadium \(estimate\)$/);
  });

  it("reports tailgating and confirmed amenities from the data", () => {
    const s = summarizeFacility(
      {
        ...blank,
        tailgating: { allowed: { value: true, attribution: attr() }, atmosphere: { value: 5, attribution: attr() } },
        features: { ada: { state: "available", attribution: attr() }, ev_charging: { state: "unavailable", attribution: attr() } },
      } as ParkingFacility,
      highmark,
    );
    expect(s.tailgating).toBe("Allowed (atmosphere 5/5)");
    expect(s.amenities).toContain("not available");
    expect(s.amenities).not.toContain("Covered");
  });
});
