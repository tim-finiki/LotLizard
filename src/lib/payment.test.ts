import { describe, expect, it } from "vitest";
import type { ParkingFacility, PaymentPolicy } from "@/lib/types";
import { attr, fact } from "@/lib/data/attr";
import { EMPTY_PAYMENT_FILTER, effectivePayment, matchPayment, methodStatus, type PaymentFilter } from "@/lib/payment";
import { applyDisplayFilters, buildMarkers } from "@/lib/explorer";
import { rankFacilities, DEFAULT_PREFERENCES } from "@/lib/ranking";
import { HIGHMARK_FACILITIES } from "@/lib/data/facilities/highmark";
import { VENUES } from "@/lib/data/venues";
import { submissionInputSchema } from "@/lib/submissions/schema";
import { preModerationFlags } from "@/lib/submissions/checks";

const policy = (o: Partial<PaymentPolicy> = {}): PaymentPolicy => ({ accepted: [], reportedAt: "2026-10-01", attribution: attr("low", ["s"]), ...o });
const filter = (o: Partial<PaymentFilter> = {}): PaymentFilter => ({ ...EMPTY_PAYMENT_FILTER, ...o });

function lot(id: string, o: Partial<ParkingFacility> = {}): ParkingFacility {
  return {
    id,
    slug: id,
    venueId: "v",
    name: id,
    type: "private_lot",
    location: { lat: 42.77, lng: -78.79, precision: "approximate" },
    description: "",
    prices: [],
    amenities: fact([], "unverified", ["s"]),
    tailgating: { allowed: fact<boolean | "unknown">("unknown", "unverified", ["s"]) },
    exit: {},
    vehicleTypes: ["car"],
    attribution: attr("low", ["s"]),
    ...o,
  };
}

describe("matchPayment", () => {
  it("matches methods with OR semantics", () => {
    const p = policy({ accepted: ["venmo"] });
    expect(matchPayment(p, filter({ methods: ["cash", "venmo"] }))).toBe("match");
    expect(matchPayment(p, filter({ methods: ["venmo"] }))).toBe("match");
  });

  it("treats methods with no evidence as unknown, never as accepted", () => {
    expect(methodStatus(policy({ accepted: ["cash"] }), "card")).toBe("unknown");
    expect(matchPayment(policy({ accepted: ["cash"] }), filter({ methods: ["card"] }))).toBe("unknown");
    expect(matchPayment(undefined, filter({ methods: ["cash"] }))).toBe("unknown");
  });

  it("excludes a lot only when every selected method is known to be refused", () => {
    const p = policy({ accepted: ["cash"], notAccepted: ["card", "paypal"] });
    expect(matchPayment(p, filter({ methods: ["card", "paypal"] }))).toBe("excluded");
    expect(matchPayment(p, filter({ methods: ["card", "zelle"] }))).toBe("unknown");
    expect(matchPayment(p, filter({ methods: ["card", "cash"] }))).toBe("match");
  });

  it("filters timing separately, with unknown timing reported as unknown", () => {
    expect(matchPayment(policy({ timing: "pay_on_arrival" }), filter({ timings: ["pay_on_arrival", "advance_optional"] }))).toBe("match");
    expect(matchPayment(policy({ timing: "prepay_required" }), filter({ timings: ["pay_on_arrival"] }))).toBe("excluded");
    expect(matchPayment(policy({}), filter({ timings: ["pay_on_arrival"] }))).toBe("unknown");
  });

  it("requires both method and timing filters when both are active", () => {
    const p = policy({ accepted: ["cash"], timing: "prepay_required" });
    expect(matchPayment(p, filter({ methods: ["cash"], timings: ["pay_on_arrival"] }))).toBe("excluded");
    expect(matchPayment(p, filter({ methods: ["cash"], timings: ["prepay_required"] }))).toBe("match");
    expect(matchPayment(policy({ timing: "prepay_required" }), filter({ methods: ["cash"], timings: ["prepay_required"] }))).toBe("unknown");
  });

  it("matches everything when no payment filter is active", () => {
    expect(matchPayment(undefined, EMPTY_PAYMENT_FILTER)).toBe("match");
  });
});

describe("event-specific payment policies", () => {
  const general = policy({ accepted: ["cash", "card"], timing: "pay_on_arrival" });
  const playoff = policy({ accepted: ["cash"], timing: "prepay_required" });
  const f = lot("a", { payment: general, paymentOverrides: [{ eventId: "playoff", policy: playoff }] });

  it("replaces the general policy for that event only", () => {
    expect(effectivePayment(f, "playoff")).toEqual({ policy: playoff, isEventOverride: true });
    expect(effectivePayment(f, "other-game")).toEqual({ policy: general, isEventOverride: false });
    expect(effectivePayment(f)).toEqual({ policy: general, isEventOverride: false });
  });

  it("filters using the event's policy", () => {
    const cardFilter = { hiddenTypes: [], payment: filter({ methods: ["card"] }) };
    expect(applyDisplayFilters([f], { ...cardFilter, eventId: "other-game" }).visible).toHaveLength(1);
    // The playoff override doesn't list card, so card becomes unknown for that game.
    expect(applyDisplayFilters([f], { ...cardFilter, eventId: "playoff" }).visible).toHaveLength(0);
  });
});

describe("applyDisplayFilters keeps map and results consistent", () => {
  const cash = lot("cash", { payment: policy({ accepted: ["cash"], timing: "pay_on_arrival" }) });
  const venmo = lot("venmo", { payment: policy({ accepted: ["venmo"], notAccepted: ["cash"] }) });
  const unknown = lot("unknown");
  const unmapped = lot("unmapped", { location: undefined, payment: policy({ accepted: ["cash"] }) });
  const all = [cash, venmo, unknown, unmapped];

  it("hides unknown-payment lots by default and counts them", () => {
    const r = applyDisplayFilters(all, { hiddenTypes: [], payment: filter({ methods: ["cash"] }) });
    expect(r.visible.map((f) => f.id)).toEqual(["cash", "unmapped"]);
    expect(r.hiddenUnknownPayment).toBe(1); // "unknown"; "venmo" is excluded outright (refuses cash)
  });

  it("can include unknown lots, labelled as unknown rather than matching", () => {
    const r = applyDisplayFilters(all, { hiddenTypes: [], payment: filter({ methods: ["cash"], includeUnknown: true }) });
    expect(r.visible.map((f) => f.id)).toEqual(["cash", "unknown", "unmapped"]);
    expect(r.paymentMatch.get("unknown")).toBe("unknown");
    expect(r.paymentMatch.get("cash")).toBe("match");
  });

  it("draws pins for exactly the visible, mapped lots, labelled with their current rank", () => {
    const venue = VENUES[0];
    for (const p of [filter(), filter({ methods: ["cash"] }), filter({ methods: ["venmo"] }), filter({ timings: ["pay_on_arrival"], includeUnknown: true })]) {
      const { visible } = applyDisplayFilters(all, { hiddenTypes: [], payment: p });
      const ranked = rankFacilities(venue, visible, { ...DEFAULT_PREFERENCES, payment: p });
      const markers = buildMarkers(visible, ranked);
      expect(markers.map((m) => m.id)).toEqual(visible.filter((f) => f.location).map((f) => f.id));
      for (const m of markers) {
        const r = ranked.find((x) => x.facility.id === m.id);
        if (r) expect(m.label).toBe(r.rank !== null ? String(r.rank) : "?");
      }
      // Every ranked card is a visible lot.
      for (const r of ranked) expect(visible).toContain(r.facility);
    }
  });
});

describe("Highmark payment data", () => {
  const slugs = (p: PaymentFilter) => applyDisplayFilters(HIGHMARK_FACILITIES, { hiddenTypes: [], payment: p }).visible.map((f) => f.slug).sort();

  it("only claims methods that a source reports", () => {
    const claims = Object.fromEntries(HIGHMARK_FACILITIES.filter((f) => f.payment?.accepted.length).map((f) => [f.slug, f.payment!.accepted]));
    // Snapshot of every accepted-method claim in the pilot; changing it must be a deliberate, sourced edit.
    expect(claims).toEqual({ "hammers-lot": ["cash", "venmo"], "nfta-game-day-express": ["cash", "other"] });
    for (const f of HIGHMARK_FACILITIES) {
      if (!f.payment?.accepted.length) continue;
      expect(f.payment.attribution.sourceIds.some((id) => id !== "lotlizard-editorial")).toBe(true);
    }
  });

  it("filters by method with OR matching and hides unknowns", () => {
    expect(slugs(filter({ methods: ["venmo"] }))).toEqual(["hammers-lot"]);
    expect(slugs(filter({ methods: ["cash", "venmo"] }))).toEqual(["hammers-lot", "nfta-game-day-express"]);
    // Nobody is documented to take PayPal, so nothing matches; nothing is assumed.
    expect(slugs(filter({ methods: ["paypal"] }))).toEqual([]);
  });

  it("filters by timing", () => {
    expect(slugs(filter({ timings: ["pay_on_arrival"] }))).toEqual(["hammers-lot", "nfta-game-day-express"]);
    const prepay = slugs(filter({ timings: ["prepay_required"] }));
    expect(prepay).toContain("gold-lot");
    expect(prepay).toContain("bus-limo-lot");
    expect(prepay).not.toContain("hammers-lot");
  });

  it("keeps ADA lots' payment timing unknown rather than guessing", () => {
    const ada = HIGHMARK_FACILITIES.find((f) => f.slug === "blue-ada-lot")!;
    expect(ada.payment?.timing).toBeUndefined();
    expect(ada.payment?.accepted).toEqual([]);
  });
});

describe("payment submissions", () => {
  const base = { kind: "payment", venueSlug: "highmark-stadium", facilitySlug: "gorilla-parking", role: "community", observedDate: "2026-10-04" };

  it("accepts a payment report and requires some content", () => {
    expect(submissionInputSchema.safeParse({ ...base, accepted: ["cash", "zelle"], timing: "pay_on_arrival" }).success).toBe(true);
    expect(submissionInputSchema.safeParse({ ...base, timing: "unknown" }).success).toBe(false);
    expect(submissionInputSchema.safeParse({ ...base, accepted: ["bitcoin"], timing: "unknown" }).success).toBe(false);
  });

  it("rejects a method reported as both accepted and refused", () => {
    expect(submissionInputSchema.safeParse({ ...base, accepted: ["cash"], notAccepted: ["cash"], timing: "unknown" }).success).toBe(false);
  });

  it("flags owner claims, event-specific reports and contradictions for moderators", () => {
    const hammers = HIGHMARK_FACILITIES.find((f) => f.slug === "hammers-lot")!;
    const parsed = submissionInputSchema.parse({ ...base, facilitySlug: "hammers-lot", role: "lot_owner", accepted: ["card"], notAccepted: ["venmo"], timing: "prepay_required", eventId: "2026-11-26-chiefs" });
    const flags = preModerationFlags(parsed, hammers);
    expect(flags).toContain("owner_claim_unverified");
    expect(flags).toContain("event_specific");
    expect(flags).toContain("contradicts_curated_methods");
  });
});
