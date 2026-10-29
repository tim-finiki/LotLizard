import type { ConfidenceLevel, PaymentMethod, PaymentTiming } from "@/lib/types";
import { communityPriceConfidence } from "@/lib/confidence";
import { getSubmissionStore } from "@/lib/submissions/store";

export interface CommunitySummary {
  reviews: { id: string; rating: number; tailgateRating?: number; exitRating?: number; body: string; author: string; createdAt: string }[];
  prices: { amount: number; vehicle: string; eventDate: string }[];
  priceConfidence: ConfidenceLevel;
  exitTimes: { minutes: number; eventDate: string }[];
  payments: {
    id: string;
    role: "community" | "lot_owner";
    accepted: PaymentMethod[];
    notAccepted: PaymentMethod[];
    otherDescription?: string;
    timing?: PaymentTiming;
    eventId?: string;
    observedDate: string;
    notes?: string;
  }[];
}

/** Approved community data for one facility. Request-time data — render inside <Suspense>. */
export async function getCommunitySummary(venueSlug: string, facilitySlug: string): Promise<CommunitySummary> {
  const approved = await getSubmissionStore().list({ status: "approved", venueSlug, facilitySlug });
  const summary: CommunitySummary = { reviews: [], prices: [], priceConfidence: "unverified", exitTimes: [], payments: [] };
  for (const s of approved) {
    const i = s.input;
    if (i.kind === "review") {
      summary.reviews.push({
        id: s.id,
        rating: i.rating,
        tailgateRating: i.tailgateRating,
        exitRating: i.exitRating,
        body: i.body,
        author: i.displayName || "LotLizard fan",
        createdAt: s.createdAt,
      });
    } else if (i.kind === "price") {
      summary.prices.push({ amount: i.amount, vehicle: i.vehicle, eventDate: i.eventDate });
    } else if (i.kind === "payment") {
      summary.payments.push({
        id: s.id,
        role: i.role,
        accepted: i.accepted as PaymentMethod[],
        notAccepted: i.notAccepted as PaymentMethod[],
        otherDescription: i.otherDescription,
        timing: i.timing === "unknown" ? undefined : (i.timing as PaymentTiming),
        eventId: i.eventId,
        observedDate: i.observedDate,
        notes: i.notes,
      });
    } else if (i.kind === "exit_time") {
      summary.exitTimes.push({ minutes: i.minutes, eventDate: i.eventDate });
    }
  }
  summary.priceConfidence = communityPriceConfidence(
    summary.prices.filter((p) => p.vehicle === "car").map((p) => ({ amount: p.amount, reportedAt: p.eventDate })),
    new Date(),
  );
  return summary;
}
