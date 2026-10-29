import type { FacilityType, ParkingFacility, Venue } from "@/lib/types";
import { normalize } from "@/lib/search";
import { isRestricted } from "@/lib/access";

/**
 * Lot and garage search, separate from venue search. Matches only sourced text: the lot's name, its
 * documented aliases (e.g. "Lot 1") and its operator. Venue words (name, city, state) can narrow a
 * query ("gold lot highmark") but never match a lot on their own.
 */

export interface LotSearchEntry {
  venueSlug: string;
  venueName: string;
  venueCity: string;
  venueState: string;
  lotSlug: string;
  name: string;
  aliases: string[];
  operator?: string;
  type: FacilityType;
  restricted: boolean;
}

export type LotMatchField = "name" | "alias" | "operator";

export interface LotMatch {
  entry: LotSearchEntry;
  matchedOn: LotMatchField;
  /** The alias or operator that matched (the name is always shown anyway). */
  matchedText: string;
  score: number;
}

export function lotSearchEntry(venue: Venue, f: ParkingFacility): LotSearchEntry {
  return {
    venueSlug: venue.slug,
    venueName: venue.name,
    venueCity: venue.address.city,
    venueState: venue.address.state,
    lotSlug: f.slug,
    name: f.name,
    aliases: f.aliases ?? [],
    ...(f.operator ? { operator: f.operator } : {}),
    type: f.type,
    restricted: isRestricted(f),
  };
}

export const lotPath = (e: Pick<LotSearchEntry, "venueSlug" | "lotSlug">) => `/venues/${e.venueSlug}/parking/${e.lotSlug}`;
/** The venue map with this lot selected and its pin focused. */
export const lotOnMapPath = (e: Pick<LotSearchEntry, "venueSlug" | "lotSlug">) => `/venues/${e.venueSlug}?lot=${encodeURIComponent(e.lotSlug)}`;

const words = (s: string) => normalize(s).split(" ").filter(Boolean);

/**
 * A token matches a word by prefix ("harbor" → "harborcenter"), or anywhere inside it once it is at
 * least 3 characters ("center" → "harborcenter"). Numbers must match exactly, and so do single letters
 * after another word, so "lot 1" never finds "Lot 10" and "lot p" never finds "Lot … Parking".
 */
function tokenMatches(token: string, word: string, exactLetters: boolean): boolean {
  if (/^\d+$/.test(token) || (exactLetters && token.length === 1)) return word === token;
  return word.startsWith(token) || (token.length >= 3 && word.includes(token));
}

const FIELD_WEIGHT: Record<LotMatchField, number> = { name: 30, alias: 25, operator: 10 };

function fieldScore(tokens: string[], field: string, context: string[], kind: LotMatchField): number | null {
  const fw = words(field);
  const exact = tokens.length > 1;
  const inField = tokens.filter((t) => fw.some((w) => tokenMatches(t, w, exact)));
  if (inField.length === 0) return null;
  // Tokens the field doesn't explain must be explained by the venue (e.g. "gold lot highmark").
  if (!tokens.every((t) => inField.includes(t) || context.some((w) => tokenMatches(t, w, exact)))) return null;
  const q = tokens.join(" ");
  const f = fw.join(" ");
  let score = FIELD_WEIGHT[kind] + inField.length * 3;
  if (f === q) score += 40;
  else if (f.startsWith(q)) score += 15;
  if (tokens.every((t) => fw.some((w) => w.startsWith(t)))) score += 5;
  return score;
}

export function searchLots(entries: LotSearchEntry[], query: string, limit = Infinity): LotMatch[] {
  const tokens = words(query);
  if (tokens.length === 0) return [];
  const out: LotMatch[] = [];
  for (const entry of entries) {
    const context = words([entry.venueName, entry.venueCity, entry.venueState].join(" "));
    const candidates: { kind: LotMatchField; text: string }[] = [
      { kind: "name", text: entry.name },
      ...entry.aliases.map((a) => ({ kind: "alias" as const, text: a })),
      ...(entry.operator ? [{ kind: "operator" as const, text: entry.operator }] : []),
    ];
    let best: LotMatch | null = null;
    for (const c of candidates) {
      const score = fieldScore(tokens, c.text, context, c.kind);
      if (score !== null && (!best || score > best.score)) best = { entry, matchedOn: c.kind, matchedText: c.text, score };
    }
    if (best) out.push(best);
  }
  return out
    .sort((a, b) => b.score - a.score || a.entry.name.localeCompare(b.entry.name) || a.entry.venueName.localeCompare(b.entry.venueName))
    .slice(0, limit);
}
