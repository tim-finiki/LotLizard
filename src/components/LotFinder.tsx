"use client";

import { useId, useMemo, useState } from "react";
import { FACILITY_TYPE_COLOR, FACILITY_TYPE_LABEL } from "@/lib/labels";
import { searchLots, type LotMatch, type LotSearchEntry } from "@/lib/lot-search";

const MATCH_LABEL = { alias: "also called", operator: "run by" } as const;

/** Find a lot or garage at this venue by name, alias or operator. Picking one focuses its pin and card. */
export function LotFinder({ entries, onPick }: { entries: LotSearchEntry[]; onPick: (lotSlug: string) => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const id = useId();
  const results = useMemo(() => searchLots(entries, query, 8), [entries, query]);
  const showList = open && query.trim().length > 0;

  const pick = (m: LotMatch) => {
    onPick(m.entry.lotSlug);
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="relative w-full lg:max-w-md">
      <label htmlFor={`${id}-input`} className="sr-only">Find a lot or garage by name</label>
      <input
        id={`${id}-input`}
        type="search"
        role="combobox"
        aria-expanded={showList}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={showList && results[cursor] ? `${id}-opt-${cursor}` : undefined}
        autoComplete="off"
        placeholder="Find a lot by name"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setCursor(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (!showList) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setCursor((c) => Math.min(c + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setCursor((c) => Math.max(c - 1, 0));
          } else if (e.key === "Enter" && results[cursor]) {
            e.preventDefault();
            pick(results[cursor]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className="h-10 w-full rounded-full border-0 bg-white px-4 text-base shadow-md outline-none ring-1 ring-black/5 focus:ring-2 focus:ring-lizard sm:text-sm dark:bg-ink-soft dark:ring-white/10"
      />
      {showList && (
        <ul id={`${id}-list`} role="listbox" aria-label="Matching lots" className="absolute inset-x-0 top-11 z-10 max-h-72 overflow-y-auto rounded-2xl bg-white py-1 shadow-xl ring-1 ring-black/5 dark:bg-ink-soft dark:ring-white/10">
          {results.length === 0 && <li className="px-4 py-3 text-sm text-neutral-500">No lot or garage here matches &ldquo;{query.trim()}&rdquo;.</li>}
          {results.map((m, i) => (
            <li
              key={m.entry.lotSlug}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={i === cursor}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(m)}
              className={`flex cursor-pointer items-center gap-2 px-4 py-2 text-sm ${i === cursor ? "bg-mist dark:bg-neutral-800" : ""}`}
            >
              <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10 dark:ring-white/40" style={{ background: FACILITY_TYPE_COLOR[m.entry.type] }} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{m.entry.name}</span>
                <span className="block truncate text-xs text-neutral-500">
                  {FACILITY_TYPE_LABEL[m.entry.type]}
                  {m.matchedOn !== "name" && ` · ${MATCH_LABEL[m.matchedOn]} “${m.matchedText}”`}
                  {m.entry.restricted && " · restricted"}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
