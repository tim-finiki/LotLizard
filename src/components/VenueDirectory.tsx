"use client";

import { useEffect, useMemo, useState } from "react";
import type { Venue, VenueType } from "@/lib/types";
import { searchVenues } from "@/lib/search";
import { VENUE_TYPE_LABEL } from "@/lib/labels";
import { stateName } from "@/lib/states";
import { VenueCard } from "@/components/VenueCard";

export function VenueDirectory({ venues }: { venues: Venue[] }) {
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

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-14 z-20 -mx-4 flex flex-col gap-2 bg-neutral-50/95 px-4 py-3 backdrop-blur dark:bg-neutral-950/95">
        <label className="sr-only" htmlFor="venue-search">Search venues</label>
        <input
          id="venue-search"
          type="search"
          inputMode="search"
          autoComplete="off"
          placeholder="Search by venue, team, city or state"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-12 w-full rounded-xl border border-black/10 bg-white px-4 text-base shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-white/15 dark:bg-neutral-900"
        />
        <div className="flex gap-2">
          <select
            aria-label="Venue type"
            value={type}
            onChange={(e) => setType(e.target.value as VenueType | "all")}
            className="h-10 flex-1 rounded-lg border border-black/10 bg-white px-2 text-sm dark:border-white/15 dark:bg-neutral-900"
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
            className="h-10 flex-1 rounded-lg border border-black/10 bg-white px-2 text-sm dark:border-white/15 dark:bg-neutral-900"
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
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((v) => (
          <VenueCard key={v.id} venue={v} />
        ))}
      </div>
      {results.length === 0 && (
        <p className="rounded-xl bg-white p-4 text-sm dark:bg-neutral-900">
          No venues match. Missing a venue? <a href="/submit" className="font-semibold text-brand-700 underline dark:text-brand-100">Tell us about it</a>.
        </p>
      )}
    </div>
  );
}
