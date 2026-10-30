import { describe, expect, it } from "vitest";
import { FACILITIES, SOURCES, VENUES } from "@/lib/data/catalog";
import { collectSourceIds } from "@/lib/data/repository";
import { isPublicSource, publicSources, publicVenue, publicVenueData } from "@/lib/public-data";
import { GET as getVenueApi } from "@/app/api/v1/venues/[venue]/route";
import { GET as listVenuesApi } from "@/app/api/v1/venues/route";

/**
 * Guards the boundary between internal research and anything sent to browsers or API clients. If a new
 * field is added to the domain model, it stays out of public payloads until it's added to the allowlist in
 * src/lib/public-data.ts and to PUBLIC_KEYS below.
 */

const PUBLIC_KEYS = new Set([
  // envelopes
  "data", "sources", "meta", "note", "license", "generatedFrom", "venue", "facilities",
  // venue
  "id", "slug", "name", "formerNames", "type", "teams", "address", "street", "city", "state", "postalCode", "location",
  "lat", "lng", "precision", "timezone", "coverage", "capacity", "summary", "gates", "policies", "title", "body",
  "transit", "description", "trafficNotes", "approaches", "label", "lotOpenHoursBefore",
  // facility
  "venueId", "aliases", "aliasesAttribution", "operator", "ownership", "access", "addressAttribution", "entrance",
  "method", "nearestAddress", "instructions", "verification", "verifiedAt", "reportedAt", "walkMinutes", "prices",
  "min", "max", "vehicle", "eventKind", "season", "observedAt", "paymentNotes", "scope", "payment", "accepted",
  "notAccepted", "otherDescription", "timing", "paymentOverrides", "eventId", "policy", "amenities", "features",
  "covered", "ev_charging", "ada", "restrooms", "state", "tailgating", "allowed", "atmosphere", "exit", "rating",
  "routes", "directions", "vehicleTypes", "booking", "url", "partner", "isAffiliate",
  // facts and citations
  "value", "attribution", "sourceIds", "confidence", "lastVerifiedAt", "notes", "retrievedAt",
]);

/** Phrases and identifiers that belong to internal research and must never be served. */
const FORBIDDEN = [/search results/i, /re-?check pending/i, /search_snippet/, /page_review/, /"evidence"/, /lotlizard-editorial/, /Matwijow/];

function keysOf(value: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(value)) value.forEach((v) => keysOf(v, out));
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      out.add(k);
      keysOf(v, out);
    }
  }
  return out;
}

function sourceIdsIn(value: unknown, out: string[] = []): string[] {
  if (Array.isArray(value)) value.forEach((v) => sourceIdsIn(v, out));
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (k === "sourceIds" && Array.isArray(v)) out.push(...(v as string[]));
      else sourceIdsIn(v, out);
    }
  }
  return out;
}

function expectPublic(payload: unknown, where: string) {
  const json = JSON.stringify(payload);
  for (const re of FORBIDDEN) expect(json, `${where} leaks ${re}`).not.toMatch(re);
  const extra = [...keysOf(payload)].filter((k) => !PUBLIC_KEYS.has(k));
  expect(extra, `${where} has non-allowlisted keys`).toEqual([]);
  const byId = new Map(SOURCES.map((s) => [s.id, s]));
  for (const id of sourceIdsIn(payload)) expect(isPublicSource(byId.get(id)!), `${where} cites non-public source ${id}`).toBe(true);
}

const venuesWithLots = VENUES.filter((v) => FACILITIES.some((f) => f.venueId === v.id));

describe("public data boundary", () => {
  it("lists only official, operator and field citations, without source notes", () => {
    const cited = publicSources(SOURCES);
    expect(cited.length).toBeGreaterThan(0);
    for (const s of cited) {
      expect(["official", "operator", "lotlizard_field"]).toContain(s.type);
      expect(Object.keys(s).sort()).toEqual(expect.arrayContaining(["id", "name", "retrievedAt", "type"]));
      expect(s).not.toHaveProperty("notes");
    }
  });

  it("keeps internal research out of every venue's client props", () => {
    for (const v of venuesWithLots) {
      const facilities = FACILITIES.filter((f) => f.venueId === v.id);
      const sources = SOURCES.filter((s) => new Set(collectSourceIds(v, facilities)).has(s.id));
      expectPublic(publicVenueData(v, facilities, sources), v.slug);
    }
  });

  it("keeps internal research out of the /api/v1 venue responses", async () => {
    for (const v of venuesWithLots) {
      const res = await getVenueApi(new Request(`http://test/api/v1/venues/${v.slug}`), { params: Promise.resolve({ venue: v.slug }) });
      expectPublic(await res.json(), `/api/v1/venues/${v.slug}`);
    }
    expectPublic(await (await listVenuesApi()).json(), "/api/v1/venues");
  });

  it("still publishes the facts, confidence and citations customers rely on", async () => {
    const res = await getVenueApi(new Request("http://test/api/v1/venues/keybank-center"), { params: Promise.resolve({ venue: "keybank-center" }) });
    const body = (await res.json()) as { data: { facilities: { slug: string; description: string; attribution: { confidence: string } }[] }; sources: { name: string }[] };
    const adam = body.data.facilities.find((f) => f.slug === "adam-ramp")!;
    expect(adam.description).toMatch(/clearance is 6'9"/);
    expect(adam.attribution.confidence).toBeTruthy();
    expect(body.data.facilities).toHaveLength(FACILITIES.filter((f) => f.venueId.includes("keybank")).length);
    expect(body.sources.map((s) => s.name)).toContain("KeyBank Center — Directions & Parking");
  });

  it("keeps the directory's venue list public-only", () => {
    const ids = new Set(publicSources(SOURCES).map((s) => s.id));
    expectPublic(venuesWithLots.map((v) => publicVenue(v, ids)), "venue directory");
  });
});
