import { describe, expect, it } from "vitest";
import { publicCitations } from "@/lib/citations";
import { FACILITIES, SOURCES } from "@/lib/data/catalog";
import { facilitySourceIds } from "@/lib/data/repository";
import type { DataSource } from "@/lib/types";

const src = (id: string, type: DataSource["type"]): DataSource => ({ id, type, name: id, retrievedAt: "2026-10-30" });

describe("public citations", () => {
  it("lists official, operator and field sources and only counts the rest", () => {
    const { cited, otherCount } = publicCitations([
      src("team", "official"),
      src("ramp-operator", "operator"),
      src("field", "lotlizard_field"),
      src("news", "media"),
      src("marketplace", "third_party"),
      src("estimate", "editorial_estimate"),
      src("report", "user_report"),
    ]);
    expect(cited.map((s) => s.id)).toEqual(["team", "ramp-operator", "field"]);
    expect(otherCount).toBe(4);
  });

  it("cites the arena's own page and the Adam Ramp operator on KeyBank lot pages", () => {
    const byId = new Map(SOURCES.map((s) => [s.id, s]));
    const cited = (slug: string) =>
      publicCitations([...new Set(facilitySourceIds(FACILITIES.find((f) => f.slug === slug && f.venueId.includes("keybank"))!))].map((id) => byId.get(id)!).filter(Boolean)).cited.map((s) => s.name);
    expect(cited("keybank-center-ramp")).toContain("KeyBank Center — Directions & Parking");
    expect(cited("adam-ramp")).toContain("Buffalo Civic Auto Ramps — Locations");
  });

  it("keeps how facts were collected out of customer-facing notes", () => {
    for (const f of FACILITIES) {
      for (const a of [f.attribution, f.addressAttribution, f.access?.attribution, f.ownership?.attribution]) {
        expect(a?.notes ?? "", f.slug).not.toMatch(/search results/i);
      }
    }
  });
});
