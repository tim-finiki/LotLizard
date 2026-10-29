/**
 * Audit tests against the real Highmark Stadium seed data: different preference profiles must
 * produce different rankings where — and only where — the underlying data supports it.
 */
import { describe, expect, it } from "vitest";
import { VENUES } from "@/lib/data/venues";
import { HIGHMARK_FACILITIES } from "@/lib/data/facilities/highmark";
import { EVENTS } from "@/lib/data/events";
import { DEFAULT_PREFERENCES, EXIT_DATA_UNAVAILABLE, bestPrice, exitDirectionDataAvailable, rankFacilities, type RankingPreferences } from "@/lib/ranking";
import { buildMarkers } from "@/lib/explorer";

const venue = VENUES.find((v) => v.id === "highmark-stadium")!;
const W = (cost: number, walk: number, tailgate: number, exit: number) => ({ cost, walk, tailgate, exit });
const rank = (p: Partial<RankingPreferences> = {}, eventKind?: "nfl_regular" | "concert") =>
  rankFacilities(venue, HIGHMARK_FACILITIES, { ...DEFAULT_PREFERENCES, ...p }, { eventKind });
const order = (r: ReturnType<typeof rank>) => r.filter((x) => x.rank !== null).map((x) => x.facility.slug);

describe("Highmark ranking responds to priorities", () => {
  it("re-orders lots when priorities change", () => {
    const walk = order(rank({ weights: W(0, 5, 0, 0) }));
    const tailgate = order(rank({ weights: W(0, 0, 5, 0) }));
    const balanced = order(rank());
    expect(walk).not.toEqual(tailgate);
    expect(walk).not.toEqual(balanced);
    // Walk-first puts the closest official lots on top; tailgating-first puts the rated tailgate lot on top.
    expect(["gold-lot", "platinum-lot"]).toContain(walk[0]);
    expect(tailgate[0]).toBe("hammers-lot");
  });

  it("orders walk-first rankings by estimated walking time", () => {
    const r = rank({ weights: W(0, 5, 0, 0) }).filter((x) => x.rank !== null);
    for (let i = 1; i < r.length; i++) expect(r[i - 1].walk!.minutes).toBeLessThanOrEqual(r[i].walk!.minutes);
  });

  it("recalculates the displayed score for the same lot under different priorities", () => {
    const gold = (p: Partial<RankingPreferences>) => rank(p).find((x) => x.facility.slug === "gold-lot")!;
    expect(gold({ weights: W(0, 5, 0, 0) }).score).not.toBe(gold({ weights: W(0, 0, 5, 0) }).score);
  });

  it("ranks on cost only where lot-specific prices exist", () => {
    const r = rank({ weights: W(5, 0, 0, 0) });
    // Only Hammer's Lot and Danny's South have lot-specific prices; official lots share an area-wide range.
    expect(order(r)).toEqual(["hammers-lot", "dannys-south"]);
    const gold = r.find((x) => x.facility.slug === "gold-lot")!;
    expect(gold.rank).toBeNull();
    expect(gold.factors.cost.known).toBe(false);
  });

  it("every eligible lot gets a score, a rank and a recommendation", () => {
    const r = rank();
    const ranked = r.filter((x) => x.rank !== null);
    expect(ranked.length).toBeGreaterThan(5);
    expect(ranked.map((x) => x.rank)).toEqual(ranked.map((_, i) => i + 1));
    expect(ranked.filter((x) => x.recommendation === "top_pick").length).toBeLessThanOrEqual(1);
    for (const x of r.filter((y) => y.rank === null)) expect(x.recommendation).toBe("limited_data");
  });
});

describe("Highmark exit direction", () => {
  it("has no documented lot-level exit routing yet, so direction never changes the ranking", () => {
    for (const d of ["north", "south", "west"]) {
      expect(exitDirectionDataAvailable(HIGHMARK_FACILITIES, d)).toBe(false);
      expect(order(rank({ direction: d }))).toEqual(order(rank()));
    }
  });

  it("says exit data is not yet available instead of personalising", () => {
    const r = rank({ direction: "north", weights: W(0, 0, 0, 5) });
    expect(order(r)).toEqual([]);
    for (const x of r) expect(x.factors.exit.detail).toBe(EXIT_DATA_UNAVAILABLE);
  });
});

describe("Highmark events", () => {
  it("does not invent event-specific prices: every game resolves to the same season-level observation", () => {
    for (const f of HIGHMARK_FACILITIES) {
      const base = bestPrice(f, "car");
      for (const e of EVENTS) expect(bestPrice(f, "car", e.kind)?.id).toBe(base?.id);
    }
  });

  it("produces the same ranking for every NFL game, since no data differs by game", () => {
    const base = order(rank({}, "nfl_regular"));
    expect(order(rank({}))).toEqual(base);
  });
});

describe("map pins stay in sync with the current ranking", () => {
  it("labels each pin with its card's current rank after re-ranking", () => {
    for (const p of [{}, { weights: W(0, 5, 0, 0) }, { weights: W(0, 0, 5, 0) }, { weights: W(5, 0, 0, 0) }]) {
      const r = rank(p);
      const markers = buildMarkers(HIGHMARK_FACILITIES, r);
      for (const x of r) {
        const m = markers.find((mk) => mk.id === x.facility.id);
        if (!m) continue; // unmapped lot
        expect(m.label).toBe(x.rank !== null ? String(x.rank) : "?");
      }
    }
  });

  it("hides pins for filtered-out types", () => {
    const visible = HIGHMARK_FACILITIES.filter((f) => f.type !== "private_lot");
    const markers = buildMarkers(visible, rank());
    expect(markers.some((m) => m.type === "private_lot")).toBe(false);
  });
});
