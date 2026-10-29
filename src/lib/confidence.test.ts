import { describe, expect, it } from "vitest";
import { atLeast, communityPriceConfidence, lowestConfidence } from "@/lib/confidence";
import { attr } from "@/lib/data/attr";

const now = new Date("2026-10-29T12:00:00Z");

describe("confidence", () => {
  it("orders levels", () => {
    expect(atLeast("high", "medium")).toBe(true);
    expect(atLeast("unverified", "low")).toBe(false);
  });

  it("finds the lowest confidence", () => {
    expect(lowestConfidence([attr("high", []), attr("low", [])])).toBe("low");
    expect(lowestConfidence([])).toBe("unverified");
  });

  it("single community report is low; consistent recent reports are medium; never higher", () => {
    expect(communityPriceConfidence([], now)).toBe("unverified");
    expect(communityPriceConfidence([{ amount: 40, reportedAt: "2026-10-20" }], now)).toBe("low");
    const consistent = [40, 42, 45].map((amount) => ({ amount, reportedAt: "2026-10-20" }));
    expect(communityPriceConfidence(consistent, now)).toBe("medium");
    const spread = [20, 40, 80].map((amount) => ({ amount, reportedAt: "2026-10-20" }));
    expect(communityPriceConfidence(spread, now)).toBe("low");
    const stale = [40, 42, 45].map((amount) => ({ amount, reportedAt: "2026-01-01" }));
    expect(communityPriceConfidence(stale, now)).toBe("low");
  });
});
