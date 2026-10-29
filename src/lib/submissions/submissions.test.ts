import { describe, expect, it } from "vitest";
import { submissionInputSchema, toPublic, type Submission } from "@/lib/submissions/schema";
import { preModerationFlags } from "@/lib/submissions/checks";
import { MemorySubmissionStore } from "@/lib/submissions/store";
import { rateLimit } from "@/lib/submissions/rate-limit";
import { HIGHMARK_FACILITIES } from "@/lib/data/facilities/highmark";

const hammers = HIGHMARK_FACILITIES.find((f) => f.slug === "hammers-lot")!;

describe("submission schema", () => {
  it("accepts a valid price report", () => {
    const r = submissionInputSchema.safeParse({ kind: "price", venueSlug: "highmark-stadium", facilitySlug: "hammers-lot", amount: 50, vehicle: "car", eventDate: "2026-10-04" });
    expect(r.success).toBe(true);
  });

  it("requires a lot for price reports and a minimum review length", () => {
    expect(submissionInputSchema.safeParse({ kind: "price", venueSlug: "x", amount: 50, vehicle: "car", eventDate: "2026-10-04" }).success).toBe(false);
    expect(submissionInputSchema.safeParse({ kind: "review", venueSlug: "x", facilitySlug: "y", rating: 5, body: "short" }).success).toBe(false);
  });

  it("rejects a filled honeypot", () => {
    expect(submissionInputSchema.safeParse({ kind: "correction", venueSlug: "x", body: "This lot closed in 2026.", website: "spam" }).success).toBe(false);
  });
});

describe("pre-moderation flags", () => {
  it("flags price outliers relative to known prices", () => {
    expect(preModerationFlags({ kind: "price", venueSlug: "v", facilitySlug: "hammers-lot", amount: 500, vehicle: "car", eventDate: "2026-10-04" }, hammers)).toContain("price_outlier");
    expect(preModerationFlags({ kind: "price", venueSlug: "v", facilitySlug: "hammers-lot", amount: 50, vehicle: "car", eventDate: "2026-10-04" }, hammers)).toEqual([]);
  });

  it("flags links and shouting", () => {
    const flags = preModerationFlags({ kind: "correction", venueSlug: "v", body: "BEST PARKING EVER VISIT https://spam.example NOW" });
    expect(flags).toContain("contains_link");
    expect(flags).toContain("shouting");
  });
});

describe("MemorySubmissionStore", () => {
  it("adds, filters and updates submissions", async () => {
    const store = new MemorySubmissionStore();
    const s: Submission = {
      id: "1",
      createdAt: "2026-10-29T00:00:00Z",
      status: "pending",
      flags: [],
      input: { kind: "correction", venueSlug: "v", body: "Gate moved", email: "a@b.co" },
    };
    await store.add(s);
    expect(await store.list({ status: "pending" })).toHaveLength(1);
    await store.update({ ...s, status: "approved" });
    expect(await store.list({ status: "pending" })).toHaveLength(0);
    expect((await store.get("1"))?.status).toBe("approved");
  });

  it("public projection hides email", () => {
    const pub = toPublic({ id: "1", createdAt: "", status: "approved", flags: [], input: { kind: "correction", venueSlug: "v", body: "x".repeat(10), email: "a@b.co" } });
    expect(JSON.stringify(pub)).not.toContain("a@b.co");
  });
});

describe("rateLimit", () => {
  it("blocks after the limit within the window", () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 3; i++) expect(rateLimit(key, 3, 1000, 0)).toBe(true);
    expect(rateLimit(key, 3, 1000, 10)).toBe(false);
    expect(rateLimit(key, 3, 1000, 2000)).toBe(true);
  });
});
