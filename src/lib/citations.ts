import type { DataSource } from "@/lib/types";

/**
 * Source types cited publicly: official (team, venue, government), the operator, and LotLizard's own field
 * checks. News, listing sites and aggregators back facts internally but aren't listed on public pages.
 */
const PUBLIC_TYPES = new Set<DataSource["type"]>(["official", "operator", "lotlizard_field"]);

export function publicCitations(sources: DataSource[]): { cited: DataSource[]; otherCount: number } {
  const cited = sources.filter((s) => PUBLIC_TYPES.has(s.type));
  return { cited, otherCount: sources.length - cited.length };
}
