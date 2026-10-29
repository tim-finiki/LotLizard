import type { Venue } from "@/lib/types";
import { stateName } from "@/lib/states";

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function haystack(v: Venue): string {
  return normalize([v.name, ...(v.formerNames ?? []), ...v.teams, v.address.city, v.address.state, stateName(v.address.state)].join(" "));
}

/** Every query token must prefix-match some word. Ranked: name-start > parking coverage > alphabetical. */
export function searchVenues(venues: Venue[], query: string): Venue[] {
  const tokens = normalize(query).split(" ").filter(Boolean);
  if (tokens.length === 0) return venues;
  const scored = venues
    .map((v) => {
      const words = haystack(v).split(" ");
      const ok = tokens.every((t) => words.some((w) => w.startsWith(t)));
      if (!ok) return null;
      const nameStarts = normalize(v.name).startsWith(tokens[0]) ? 2 : 0;
      const coverage = v.coverage === "pilot_detailed" ? 1 : v.coverage === "basic" ? 0.5 : 0;
      return { v, score: nameStarts + coverage };
    })
    .filter((x): x is { v: Venue; score: number } => x !== null);
  return scored.sort((a, b) => b.score - a.score || a.v.name.localeCompare(b.v.name)).map((x) => x.v);
}
