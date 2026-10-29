import { describe, expect, it } from "vitest";
import { boundsOf, estimateWalk, formatDistance, haversineMeters } from "@/lib/geo";

describe("geo", () => {
  it("computes haversine distance", () => {
    // ~111.2 km per degree of latitude
    expect(haversineMeters({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(111_195, -2);
  });

  it("estimates walk with route factor and pace", () => {
    const w = estimateWalk({ lat: 42.77, lng: -78.79 }, { lat: 42.775, lng: -78.79 });
    expect(w.meters).toBeGreaterThan(556 * 1.29);
    expect(w.minutes).toBe(Math.round(w.meters / 80));
  });

  it("never estimates less than one minute", () => {
    expect(estimateWalk({ lat: 1, lng: 1 }, { lat: 1, lng: 1 }).minutes).toBe(1);
  });

  it("formats distances", () => {
    expect(formatDistance(100)).toBe("328 ft");
    expect(formatDistance(1609.344)).toBe("1.0 mi");
  });

  it("computes bounds", () => {
    expect(boundsOf([])).toBeNull();
    expect(boundsOf([{ lat: 1, lng: 5 }, { lat: -2, lng: 3 }])).toEqual([[-2, 3], [1, 5]]);
  });
});
