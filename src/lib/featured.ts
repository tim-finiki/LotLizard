import type { ParkingFacility, Venue, VenueEvent } from "@/lib/types";
import type { Factor } from "@/lib/ranking";
import { factState } from "@/lib/access";

/**
 * Featured pilot venues and what matters most at each. A stadium game is about tailgating and getting
 * out afterwards; a downtown arena (hockey, concerts) is about garages and the walk. The profile shapes
 * presentation and the default sort; it never adds facts. Highlights are computed from the data.
 */

export type VenueFocus = "tailgate_exit" | "downtown";

export interface VenueProfile {
  slug: string;
  /** Kinds of events held there, for the event-type chips (not a schedule). */
  eventTypes: string[];
  focus: VenueFocus;
  /** One line on what to compare there. */
  tagline: string;
  /** Default sort priorities when the person hasn't set their own. */
  defaultWeights?: Record<Factor, number>;
}

export const FEATURED_VENUES: VenueProfile[] = [
  {
    slug: "highmark-stadium",
    eventTypes: ["NFL"],
    focus: "tailgate_exit",
    tagline: "Tailgating lots, prepaid passes and the postgame exit.",
  },
  {
    slug: "keybank-center",
    eventTypes: ["NHL", "Concerts"],
    focus: "downtown",
    tagline: "Downtown garages and ramps, and how far you'll walk.",
    // Tailgating isn't allowed at the arena's lots, and walking distance is what separates downtown ramps.
    defaultWeights: { cost: 2, walk: 5, tailgate: 0, exit: 1 },
  },
];

export const venueProfile = (slug: string) => FEATURED_VENUES.find((p) => p.slug === slug);
export const isFeatured = (slug: string) => FEATURED_VENUES.some((p) => p.slug === slug);

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Short, data-backed highlights for a featured venue's card. Only facts we hold are counted. */
export function venueHighlights(profile: VenueProfile, venue: Venue, facilities: ParkingFacility[], events: VenueEvent[]): string[] {
  const mapped = facilities.filter((f) => f.location).length;
  const out: string[] = [];
  if (profile.focus === "tailgate_exit") {
    out.push(`${plural(mapped, "lot")} and options on the map`);
    const tailgate = facilities.filter((f) => f.tailgating.allowed.value !== "unknown").length;
    if (tailgate) out.push(`Tailgating rules for ${plural(tailgate, "lot")}`);
    if (venue.trafficNotes?.length) out.push("Postgame traffic plan");
  } else {
    const garages = facilities.filter((f) => f.type === "garage");
    out.push(`${plural(garages.length, "garage")} and ramps compared`);
    const mappedGarages = garages.filter((f) => f.location).length;
    if (mappedGarages) out.push(`Estimated walk from ${plural(mappedGarages, "mapped ramp")}`);
    // Only confirmed facts make a headline; weaker ones stay on the venue page with their confidence.
    const accessible = facilities.filter((f) => f.features?.ada?.state === "available" && factState({ value: null, attribution: f.features.ada.attribution }) === "confirmed").length;
    if (accessible) out.push(`Accessible parking confirmed at ${plural(accessible, "ramp")}`);
    const transit = (venue.transit ?? []).filter((t) => factState({ value: null, attribution: t.attribution }) === "confirmed");
    if (transit.length) out.push(`Transit: ${transit.map((t) => t.name).join(", ")}`);
  }
  out.push(events.length ? `${plural(events.length, "game")} with sourced dates` : "Event dates not listed yet");
  return out;
}

export const FOCUS_SEO: Record<VenueFocus, string> = {
  tailgate_exit: "lots, prices & tailgating",
  downtown: "garages, ramps & walking distance",
};
