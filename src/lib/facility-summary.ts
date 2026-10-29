import type { ParkingFacility, Venue } from "@/lib/types";
import { CONFIDENCE_LABEL } from "@/lib/confidence";
import { bestPrice, isLotSpecific, walkInfo } from "@/lib/ranking";
import { PAYMENT_METHOD_LABEL, PAYMENT_TIMING_LABEL } from "@/lib/payment";
import { UNIVERSAL_AMENITIES, UNIVERSAL_AMENITY_LABEL, featureState } from "@/lib/features";

/**
 * Plain-text facts for one parking option, rendered on the server so crawlers and AI systems can
 * read them without running the map. Unknowns are stated as unknown; nothing is inferred.
 */
export interface FacilitySummary {
  price: string;
  walk: string;
  payment: string;
  amenities: string;
  tailgating: string;
}

export function summarizeFacility(f: ParkingFacility, venue: Venue): FacilitySummary {
  const p = bestPrice(f, "car");
  const range = p ? (p.min === p.max ? `$${p.min}` : `$${p.min}–$${p.max}`) : undefined;
  const price = p
    ? `${range}${isLotSpecific(p) ? "" : " (area-wide range, not specific to this lot)"}, ${CONFIDENCE_LABEL[p.attribution.confidence].toLowerCase()}`
    : "Not reported";

  const w = walkInfo(f, venue);
  const walk = !w ? "Location not confirmed" : w.estimated ? `About ${w.minutes} min to the stadium (estimate)` : `${w.minutes} min to the stadium`;

  const pay = f.payment;
  const methods = pay?.accepted.length
    ? pay.accepted.map((m) => (m === "other" && pay.otherDescription ? pay.otherDescription : PAYMENT_METHOD_LABEL[m])).join(", ")
    : "methods not reported";
  const payment = pay ? `${pay.timing ? PAYMENT_TIMING_LABEL[pay.timing] : "Timing unknown"}; ${methods}` : "Unknown";

  const confirmed = UNIVERSAL_AMENITIES.filter((k) => featureState(f, k) !== "unknown").map(
    (k) => `${UNIVERSAL_AMENITY_LABEL[k]}: ${featureState(f, k) === "available" ? "available" : "not available"}`,
  );
  const amenities = confirmed.length ? confirmed.join("; ") : "None confirmed yet";

  const allowed = f.tailgating.allowed.value;
  const tailgating =
    allowed === "unknown" ? "Unknown" : allowed ? (f.tailgating.atmosphere ? `Allowed (atmosphere ${f.tailgating.atmosphere.value}/5)` : "Allowed") : "Not allowed";

  return { price, walk, payment, amenities, tailgating };
}
