"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Venue, VenueType } from "@/lib/types";
import { searchVenues } from "@/lib/search";
import { VENUE_TYPE_LABEL } from "@/lib/labels";
import { stateName } from "@/lib/states";
import { VenueCard } from "@/components/VenueCard";
import { FACILITY_TYPE_COLOR, FACILITY_TYPE_LABEL } from "@/lib/labels";
import { lotOnMapPath, lotPath, searchLots, type LotSearchEntry } from "@/lib/lot-search";

const MATCH_LABEL = { alias: "also called", operator: "run by" } as const;
const MAX_LOT_RESULTS = 8;

export function VenueDirectory({ venues, lots = [] }: { venues: Venue[]; lots?: LotSearchEntry[] }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<VenueType | "all">("all");
  const [state, setState] = useState("all");

  // Read ?q= after hydration so the full list stays in the prerendered HTML for crawlers.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from URL
    if (q) setQuery(q);
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (query) url.searchParams.set("q", query);
    else url.searchParams.delete("q");
    window.history.replaceState(null, "", url);
  }, [query]);

  const types = useMemo(() => [...new Set(venues.map((v) => v.type))], [venues]);
  const states = useMemo(() => [...new Set(venues.map((v) => v.address.state))].sort(), [venues]);
  const results = useMemo(
    () => searchVenues(venues, query).filter((v) => (type === "all" || v.type === type) && (state === "all" || v.address.state === state)),
    [venues, query, type, state],
  );

  // Lot matches are a separate list so a lot name never reorders or hides venue results.
  const lotResults = useMemo(
    () =>
      query.trim().length >= 2
        ? searchLots(
            lots.filter((l) => (type === "all" || venues.find((v) => v.slug === l.venueSlug)?.type === type) && (state === "all" || l.venueState === state)),
            query,
            MAX_LOT_RESULTS,
          )
        : [],
    [lots, venues, query, type, state],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-14 z-20 -mx-4 flex flex-col gap-2 bg-mist/95 px-4 py-3 backdrop-blur dark:bg-ink/95">
        <label className="sr-only" htmlFor="venue-search">Search venues</label>
        <input
          id="venue-search"
          type="search"
          inputMode="search"
          autoComplete="off"
          placeholder="Search venues, teams, cities or lot names"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-12 w-full rounded-xl border border-black/10 bg-white px-4 text-base shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-white/15 dark:bg-ink-soft"
        />
        <div className="flex gap-2">
          <select
            aria-label="Venue type"
            value={type}
            onChange={(e) => setType(e.target.value as VenueType | "all")}
            className="h-10 flex-1 rounded-lg border border-black/10 bg-white px-2 text-sm dark:border-white/15 dark:bg-ink-soft"
          >
            <option value="all">All types</option>
            {types.map((t) => (
              <option key={t} value={t}>{VENUE_TYPE_LABEL[t]}</option>
            ))}
          </select>
          <select
            aria-label="State"
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="h-10 flex-1 rounded-lg border border-black/10 bg-white px-2 text-sm dark:border-white/15 dark:bg-ink-soft"
          >
            <option value="all">All states</option>
            {states.map((s) => (
              <option key={s} value={s}>{stateName(s)}</option>
            ))}
          </select>
        </div>
      </div>
      <p className="text-sm text-neutral-500" aria-live="polite">
        {results.length} {results.length === 1 ? "venue" : "venues"}
        {lotResults.length > 0 && ` · ${lotResults.length} ${lotResults.length === 1 ? "lot" : "lots"}`}
      </p>
      {results.length === 0 && lotResults.length === 0 && (
        <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-line dark:bg-ink-soft dark:ring-white/10">
          <p className="font-display font-bold">No venues match that search</p>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">Try a team, city or state — or clear the filters.</p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setType("all");
              setState("all");
            }}
            className="mt-3 h-10 rounded-lg bg-lizard px-4 text-sm font-semibold text-ink hover:bg-lizard-strong"
          >
            Clear search
          </button>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((v) => (
          <VenueCard key={v.id} venue={v} />
        ))}
      </div>
      {lotResults.length > 0 && (
        <section aria-labelledby="lot-results-heading" className="flex flex-col gap-2">
          <h2 id="lot-results-heading" className="text-sm font-bold">
            Parking lots &amp; garages matching &ldquo;{query.trim()}&rdquo;
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {lotResults.map((m) => (
              <li key={`${m.entry.venueSlug}/${m.entry.lotSlug}`} className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-line dark:bg-ink-soft dark:ring-white/10">
                <span aria-hidden className="h-3 w-3 shrink-0 rounded-full ring-1 ring-black/10 dark:ring-white/40" style={{ background: FACILITY_TYPE_COLOR[m.entry.type] }} />
                <span className="min-w-0 flex-1">
                  <Link href={m.entry.restricted ? lotPath(m.entry) : lotOnMapPath(m.entry)} className="block truncate font-semibold hover:underline">
                    {m.entry.name}
                  </Link>
                  <span className="block truncate text-xs text-neutral-500">
                    {FACILITY_TYPE_LABEL[m.entry.type]} at {m.entry.venueName}, {m.entry.venueCity}
                    {m.matchedOn !== "name" && ` · ${MATCH_LABEL[m.matchedOn]} “${m.matchedText}”`}
                  </span>
                </span>
                <Link href={lotPath(m.entry)} className="shrink-0 text-xs font-semibold text-brand-700 underline dark:text-brand-100">
                  Details<span className="sr-only"> for {m.entry.name}, {m.entry.venueName}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {results.length === 0 && lotResults.length === 0 && (
        <p className="rounded-xl bg-white p-4 text-sm dark:bg-ink-soft">
          No venues match. Missing a venue? <a href="/submit" className="font-semibold text-brand-700 underline dark:text-brand-100">Tell us about it</a>.
        </p>
      )}
    </div>
  );
}
