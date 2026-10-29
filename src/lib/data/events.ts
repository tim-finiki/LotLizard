import type { VenueEvent } from "@/lib/types";
import { attr } from "@/lib/data/attr";

/**
 * Event schedule. Only games with a public source are listed; start times are omitted
 * when not announced. Future: ingest from an official schedule feed.
 */
export const EVENTS: VenueEvent[] = [
  { id: "2026-09-17-lions", venueId: "highmark-stadium", name: "Bills vs. Lions", kind: "nfl_regular", date: "2026-09-17", startLocal: "20:15", attribution: attr("medium", ["wxxi-first-game"]) },
  { id: "2026-10-04-patriots", venueId: "highmark-stadium", name: "Bills vs. Patriots", kind: "nfl_regular", date: "2026-10-04", attribution: attr("low", ["prked-patriots"]) },
  { id: "2026-11-22-dolphins", venueId: "highmark-stadium", name: "Bills vs. Dolphins", kind: "nfl_regular", date: "2026-11-22", attribution: attr("medium", ["13wham-schedule"], "Kickoff time not yet confirmed.") },
  { id: "2026-11-26-chiefs", venueId: "highmark-stadium", name: "Bills vs. Chiefs (Thanksgiving)", kind: "nfl_regular", date: "2026-11-26", startLocal: "20:20", attribution: attr("medium", ["13wham-schedule", "wivb-schedule"]) },
  { id: "2026-12-19-bears", venueId: "highmark-stadium", name: "Bills vs. Bears", kind: "nfl_regular", date: "2026-12-19", startLocal: "20:20", attribution: attr("medium", ["13wham-schedule"]) },
];
