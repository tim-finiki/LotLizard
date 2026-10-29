import type { ParkingFacility, PaymentMethod, PaymentPolicy, PaymentTiming } from "@/lib/types";

export const PAYMENT_METHODS = ["cash", "card", "venmo", "paypal", "zelle", "mobile_wallet", "other"] as const satisfies readonly PaymentMethod[];
export const PAYMENT_TIMINGS = ["pay_on_arrival", "advance_optional", "prepay_required"] as const satisfies readonly PaymentTiming[];

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: "Cash",
  card: "Credit/debit card",
  venmo: "Venmo",
  paypal: "PayPal",
  zelle: "Zelle",
  mobile_wallet: "Apple Pay / Google Pay",
  other: "Other",
};

/** Short labels for compact card badges. */
export const PAYMENT_METHOD_SHORT: Record<PaymentMethod, string> = {
  cash: "Cash",
  card: "Card",
  venmo: "Venmo",
  paypal: "PayPal",
  zelle: "Zelle",
  mobile_wallet: "Wallet",
  other: "Other",
};

export const PAYMENT_TIMING_LABEL: Record<PaymentTiming, string> = {
  pay_on_arrival: "Pay on arrival",
  advance_optional: "Reserve ahead (optional)",
  prepay_required: "Prepay required",
};

export interface PaymentFilter {
  /** OR-matched: a lot matches if it is known to accept any of these. Empty = no method filter. */
  methods: PaymentMethod[];
  /** OR-matched timing. Empty = no timing filter. */
  timings: PaymentTiming[];
  /** Keep lots whose payment info is unknown for the active filters (shown as unknown, never as a match). */
  includeUnknown: boolean;
}

export const EMPTY_PAYMENT_FILTER: PaymentFilter = { methods: [], timings: [], includeUnknown: false };

/** The policy in force for an event: an event-specific override replaces the general policy. */
export function effectivePayment(f: ParkingFacility, eventId?: string): { policy?: PaymentPolicy; isEventOverride: boolean } {
  const override = eventId ? f.paymentOverrides?.find((o) => o.eventId === eventId) : undefined;
  return override ? { policy: override.policy, isEventOverride: true } : { policy: f.payment, isEventOverride: false };
}

export type MethodStatus = "accepted" | "not_accepted" | "unknown";

export function methodStatus(policy: PaymentPolicy | undefined, method: PaymentMethod): MethodStatus {
  if (policy?.accepted.includes(method)) return "accepted";
  if (policy?.notAccepted?.includes(method)) return "not_accepted";
  return "unknown";
}

/**
 * Result of applying a payment filter to one lot:
 * - "match": known to satisfy every active filter
 * - "unknown": no evidence either way for at least one active filter (and nothing rules it out)
 * - "excluded": known not to satisfy an active filter
 */
export type PaymentMatch = "match" | "unknown" | "excluded";

export function matchPayment(policy: PaymentPolicy | undefined, filter: PaymentFilter): PaymentMatch {
  let unknown = false;

  if (filter.methods.length > 0) {
    const statuses = filter.methods.map((m) => methodStatus(policy, m));
    if (!statuses.includes("accepted")) {
      if (statuses.every((s) => s === "not_accepted")) return "excluded";
      unknown = true;
    }
  }

  if (filter.timings.length > 0) {
    if (!policy?.timing) unknown = true;
    else if (!filter.timings.includes(policy.timing)) return "excluded";
  }

  return unknown ? "unknown" : "match";
}

export function isPaymentFilterActive(filter: PaymentFilter): boolean {
  return filter.methods.length > 0 || filter.timings.length > 0;
}

/** Methods with no evidence either way, for "not reported" displays. */
export function unknownMethods(policy: PaymentPolicy | undefined): PaymentMethod[] {
  return PAYMENT_METHODS.filter((m) => methodStatus(policy, m) === "unknown");
}
