"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { FacilityType, ParkingFacility, Venue, VehicleType } from "@/lib/types";
import { FACTORS, rankFacilities, walkInfo, type Factor, type RankedFacility, type RankingPreferences } from "@/lib/ranking";
import { AMENITY_LABEL, FACILITY_TYPE_COLOR, FACILITY_TYPE_LABEL } from "@/lib/labels";
import { formatDistance } from "@/lib/geo";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { ReferralLink } from "@/components/ReferralLink";
import { usePreferences } from "@/components/usePreferences";
import type { MapMarker } from "@/components/VenueMap";

const VenueMap = dynamic(() => import("@/components/VenueMap"), {
  ssr: false,
  loading: () => <div className="grid h-full w-full place-items-center bg-neutral-200 text-sm text-neutral-500 dark:bg-neutral-800">Loading map…</div>,
});

const FACTOR_LABEL: Record<Factor, string> = {
  cost: "Low cost",
  walk: "Short walk",
  tailgate: "Tailgating",
  exit: "Quick exit",
};

const NON_RANKED_INITIAL: Partial<Record<FacilityType, string>> = { shuttle: "S", rideshare_zone: "R", ada: "A" };

export interface VenueExplorerProps {
  venue: Venue;
  facilities: ParkingFacility[];
}

export function VenueExplorer({ venue, facilities }: VenueExplorerProps) {
  const [prefs, setPrefs] = usePreferences();
  const [hiddenTypes, setHiddenTypes] = useState<FacilityType[]>([]);
  const [activeId, setActiveId] = useState<string>();
  const [compare, setCompare] = useState<string[]>([]);
  const [sheet, setSheet] = useState<"prefs" | "compare" | null>(null);

  const ranked = useMemo(() => rankFacilities(venue, facilities, prefs), [venue, facilities, prefs]);
  const rankById = useMemo(() => new Map(ranked.map((r) => [r.facility.id, r])), [ranked]);
  const presentTypes = useMemo(() => [...new Set(facilities.map((f) => f.type))], [facilities]);
  const visible = (f: ParkingFacility) => !hiddenTypes.includes(f.type);

  const others = facilities.filter((f) => !rankById.has(f.id) && visible(f));
  const unmapped = facilities.filter((f) => !f.location).length;

  const markers: MapMarker[] = facilities
    .filter((f) => f.location && visible(f))
    .map((f) => ({
      id: f.id,
      name: f.name,
      type: f.type,
      lat: f.location!.lat,
      lng: f.location!.lng,
      label: rankById.get(f.id)?.rank.toString() ?? NON_RANKED_INITIAL[f.type] ?? "•",
    }));

  const toggleType = (t: FacilityType) =>
    setHiddenTypes((h) => (h.includes(t) ? h.filter((x) => x !== t) : [...h, t]));
  const toggleCompare = (id: string) =>
    setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length >= 3 ? c : [...c, id]));

  const select = (id: string) => {
    setActiveId(id);
    document.getElementById(`lot-${id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  return (
    <div className="lg:grid lg:grid-cols-[1fr_420px] lg:gap-6">
      {/* Map: top on mobile, sticky right column on desktop */}
      <div className="lg:order-2">
        <div className="sticky top-14 z-10 -mx-4 lg:mx-0 lg:top-20">
          <div className="h-[32vh] min-h-[220px] w-full overflow-hidden bg-neutral-200 lg:h-[calc(100vh-7rem)] lg:rounded-2xl dark:bg-neutral-800">
            <VenueMap
              venue={{ name: venue.name, lat: venue.location.lat, lng: venue.location.lng }}
              markers={markers}
              activeId={activeId}
              onSelect={select}
            />
          </div>
        </div>
        <p className="mt-2 text-xs text-neutral-500">
          Pins are approximate unless marked exact.{unmapped > 0 && ` ${unmapped} option${unmapped > 1 ? "s" : ""} without a confirmed location ${unmapped > 1 ? "are" : "is"} listed but not mapped.`}
        </p>
      </div>

      <div className="flex flex-col gap-4 lg:order-1">
        {/* Type filter chips double as the map legend */}
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 pt-3 [scrollbar-width:none]" role="group" aria-label="Filter by parking type">
          {presentTypes.map((t) => {
            const on = !hiddenTypes.includes(t);
            return (
              <button
                key={t}
                type="button"
                aria-pressed={on}
                onClick={() => toggleType(t)}
                className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition ${
                  on ? "border-transparent bg-white shadow-sm dark:bg-neutral-800" : "border-black/10 text-neutral-400 line-through dark:border-white/10"
                }`}
              >
                <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: FACILITY_TYPE_COLOR[t] }} />
                {FACILITY_TYPE_LABEL[t]}
              </button>
            );
          })}
        </div>

        <PreferenceSummary prefs={prefs} onEdit={() => setSheet("prefs")} />

        <section aria-labelledby="ranked-heading" className="flex flex-col gap-3">
          <h2 id="ranked-heading" className="text-lg font-bold">
            Ranked for you <span className="text-sm font-normal text-neutral-500">({ranked.filter((r) => visible(r.facility)).length})</span>
          </h2>
          {ranked.filter((r) => visible(r.facility)).map((r) => (
            <LotCard
              key={r.facility.id}
              venue={venue}
              ranked={r}
              active={activeId === r.facility.id}
              compared={compare.includes(r.facility.id)}
              compareDisabled={compare.length >= 3 && !compare.includes(r.facility.id)}
              onSelect={() => setActiveId(r.facility.id)}
              onToggleCompare={() => toggleCompare(r.facility.id)}
            />
          ))}
          {ranked.length === 0 && (
            <p className="rounded-xl bg-white p-4 text-sm dark:bg-neutral-900">No lots match your filters. Try relaxing the max price or vehicle type.</p>
          )}
        </section>

        {others.length > 0 && (
          <section aria-labelledby="other-heading" className="flex flex-col gap-2">
            <h2 id="other-heading" className="text-lg font-bold">Other options</h2>
            <p className="text-sm text-neutral-500">Shuttles, rideshare and options that don&apos;t match your vehicle or accessibility settings.</p>
            {others.map((f) => (
              <OtherCard key={f.id} venue={venue} facility={f} active={activeId === f.id} onSelect={() => setActiveId(f.id)} />
            ))}
          </section>
        )}
      </div>

      {/* Bottom action bar */}
      {compare.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-black/10 bg-white/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur dark:border-white/10 dark:bg-neutral-900/95">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            <span className="text-sm">{compare.length} selected <span className="text-neutral-500">(max 3)</span></span>
            <div className="flex gap-2">
              <button type="button" onClick={() => setCompare([])} className="h-11 rounded-lg px-3 text-sm font-medium text-neutral-600 dark:text-neutral-300">Clear</button>
              <button type="button" onClick={() => setSheet("compare")} disabled={compare.length < 2} className="h-11 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-50">
                Compare
              </button>
            </div>
          </div>
        </div>
      )}

      {sheet === "prefs" && (
        <Sheet title="Your priorities" onClose={() => setSheet(null)}>
          <PreferencesForm prefs={prefs} onChange={setPrefs} />
        </Sheet>
      )}
      {sheet === "compare" && (
        <Sheet title="Compare lots" onClose={() => setSheet(null)}>
          <CompareTable venue={venue} items={compare.map((id) => rankById.get(id)).filter((r): r is RankedFacility => !!r)} />
        </Sheet>
      )}
    </div>
  );
}

function PreferenceSummary({ prefs, onEdit }: { prefs: RankingPreferences; onEdit: () => void }) {
  const top = [...FACTORS].sort((a, b) => prefs.weights[b] - prefs.weights[a]).filter((f) => prefs.weights[f] > 0);
  return (
    <button
      type="button"
      onClick={onEdit}
      className="flex items-center justify-between gap-3 rounded-2xl border border-brand-500/30 bg-brand-50 p-3 text-left dark:bg-brand-900/40"
    >
      <span className="flex flex-col">
        <span className="text-sm font-semibold text-brand-700 dark:text-brand-100">Your priorities</span>
        <span className="text-xs text-neutral-600 dark:text-neutral-300">
          {top.length ? top.map((f) => FACTOR_LABEL[f]).join(" › ") : "Balanced"} · {prefs.vehicle.toUpperCase()}
          {prefs.requireTailgating && " · Tailgating only"}
          {prefs.maxPrice !== undefined && ` · ≤ $${prefs.maxPrice}`}
          {prefs.needsAda && " · ADA"}
        </span>
      </span>
      <span className="shrink-0 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white">Adjust</span>
    </button>
  );
}

function PreferencesForm({ prefs, onChange }: { prefs: RankingPreferences; onChange: (p: RankingPreferences) => void }) {
  const setWeight = (f: Factor, v: number) => onChange({ ...prefs, weights: { ...prefs.weights, [f]: v } });
  return (
    <div className="flex flex-col gap-5">
      {FACTORS.map((f) => (
        <label key={f} className="flex flex-col gap-1">
          <span className="flex justify-between text-sm font-medium">
            {FACTOR_LABEL[f]}
            <span className="text-neutral-500">{["Don't care", "A little", "Some", "Matters", "A lot", "Most"][prefs.weights[f]]}</span>
          </span>
          <input
            type="range"
            min={0}
            max={5}
            step={1}
            value={prefs.weights[f]}
            onChange={(e) => setWeight(f, Number(e.target.value))}
            className="h-8 w-full accent-brand-600"
          />
        </label>
      ))}
      <label className="flex items-center justify-between gap-3 text-sm font-medium">
        Vehicle
        <select
          value={prefs.vehicle}
          onChange={(e) => onChange({ ...prefs, vehicle: e.target.value as VehicleType })}
          className="h-10 rounded-lg border border-black/10 bg-white px-2 dark:border-white/15 dark:bg-neutral-800"
        >
          <option value="car">Car / SUV</option>
          <option value="rv">RV</option>
          <option value="bus">Bus</option>
          <option value="limo">Limo</option>
          <option value="motorcycle">Motorcycle</option>
        </select>
      </label>
      <label className="flex items-center justify-between gap-3 text-sm font-medium">
        Max price (USD)
        <input
          type="number"
          inputMode="numeric"
          min={0}
          placeholder="Any"
          value={prefs.maxPrice ?? ""}
          onChange={(e) => onChange({ ...prefs, maxPrice: e.target.value === "" ? undefined : Math.max(0, Number(e.target.value)) })}
          className="h-10 w-28 rounded-lg border border-black/10 bg-white px-2 text-right dark:border-white/15 dark:bg-neutral-800"
        />
      </label>
      <Toggle label="Must allow tailgating" checked={prefs.requireTailgating} onChange={(v) => onChange({ ...prefs, requireTailgating: v })} />
      <Toggle label="I need ADA parking" checked={prefs.needsAda} onChange={(v) => onChange({ ...prefs, needsAda: v })} />
      <p className="text-xs text-neutral-500">
        Saved on this device. Unknown data scores neutral and is flagged — we never assume a lot is good when we don&apos;t know.
      </p>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm font-medium">
      {label}
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-6 w-6 accent-brand-600" />
    </label>
  );
}

function ScorePill({ score, completeness }: { score: number; completeness: number }) {
  return (
    <div className="flex flex-col items-end" title={`${Math.round(completeness * 100)}% of this score is based on real data`}>
      <span className="text-xl font-extrabold tabular-nums leading-none">{score}</span>
      <span className="text-[10px] uppercase tracking-wide text-neutral-500">match</span>
      <span className="mt-1 h-1 w-12 overflow-hidden rounded bg-neutral-200 dark:bg-neutral-700" aria-hidden>
        <span className="block h-full bg-brand-500" style={{ width: `${Math.round(completeness * 100)}%` }} />
      </span>
      <span className="text-[10px] text-neutral-500">{Math.round(completeness * 100)}% data</span>
    </div>
  );
}

function LotCard({
  venue,
  ranked: r,
  active,
  compared,
  compareDisabled,
  onSelect,
  onToggleCompare,
}: {
  venue: Venue;
  ranked: RankedFacility;
  active: boolean;
  compared: boolean;
  compareDisabled: boolean;
  onSelect: () => void;
  onToggleCompare: () => void;
}) {
  const f = r.facility;
  return (
    <article
      id={`lot-${f.id}`}
      onClick={onSelect}
      className={`scroll-mt-[calc(32vh+4rem)] rounded-2xl border bg-white p-4 shadow-sm transition dark:bg-neutral-900 lg:scroll-mt-24 ${
        active ? "border-brand-500 ring-2 ring-brand-500/30" : "border-black/5 dark:border-white/10"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
          style={{ background: FACILITY_TYPE_COLOR[f.type] }}
        >
          {r.rank}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold leading-tight">
            <Link href={`/venues/${venue.slug}/parking/${f.slug}`} className="hover:underline">
              <span className="sr-only">#{r.rank} </span>
              {f.name}
            </Link>
          </h3>
          <p className="text-xs text-neutral-500">
            {FACILITY_TYPE_LABEL[f.type]}
            {f.operator && ` · ${f.operator}`}
          </p>
        </div>
        <ScorePill score={r.score} completeness={r.completeness} />
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
        <div>
          <dt className="text-xs text-neutral-500">Price</dt>
          <dd className="flex flex-wrap items-center gap-1 font-semibold">
            {r.price ? (
              <>
                {r.price.min === r.price.max ? `$${r.price.min}` : `$${r.price.min}–$${r.price.max}`}
                <ConfidenceBadge level={r.price.attribution.confidence} compact />
              </>
            ) : (
              <span className="font-normal text-neutral-500">Unknown</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-neutral-500">Walk to stadium</dt>
          <dd className="font-semibold">
            {r.walk ? (
              <>
                {r.walk.estimated && "~"}
                {r.walk.minutes} min
                {r.walk.meters !== undefined && <span className="font-normal text-neutral-500"> · {formatDistance(r.walk.meters)}</span>}
                {r.walk.estimated && <span className="block text-[11px] font-normal text-neutral-500">estimate</span>}
              </>
            ) : (
              <span className="font-normal text-neutral-500">Unknown</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-neutral-500">Tailgating</dt>
          <dd className={r.factors.tailgate.known ? "font-semibold" : "text-neutral-500"}>{r.factors.tailgate.detail}</dd>
        </div>
        <div>
          <dt className="text-xs text-neutral-500">Exit</dt>
          <dd className={r.factors.exit.known ? "font-semibold" : "text-neutral-500"}>{r.factors.exit.detail}</dd>
        </div>
      </dl>

      {f.prepaidRequired?.value && (
        <p className="mt-2 rounded-lg bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">Pre-paid pass required</p>
      )}
      {f.amenities.value.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1" aria-label="Amenities">
          {f.amenities.value.map((a) => (
            <li key={a} className="rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] dark:bg-neutral-800">{AMENITY_LABEL[a]}</li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          Overall <ConfidenceBadge level={f.attribution.confidence} />
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <label className={`flex h-10 items-center gap-2 rounded-lg border border-black/10 px-3 text-sm dark:border-white/15 ${compareDisabled ? "opacity-50" : ""}`}>
            <input type="checkbox" checked={compared} disabled={compareDisabled} onChange={onToggleCompare} className="h-5 w-5 accent-brand-600" />
            Compare
          </label>
          <Link href={`/venues/${venue.slug}/parking/${f.slug}`} className="flex h-10 items-center rounded-lg bg-neutral-900 px-3 text-sm font-semibold text-white dark:bg-white dark:text-neutral-900">
            Details
          </Link>
        </div>
      </div>
      {f.booking && (
        <div className="mt-3">
          <ReferralLink booking={f.booking} />
        </div>
      )}
    </article>
  );
}

function OtherCard({ venue, facility: f, active, onSelect }: { venue: Venue; facility: ParkingFacility; active: boolean; onSelect: () => void }) {
  const walk = walkInfo(f, venue);
  return (
    <article
      id={`lot-${f.id}`}
      onClick={onSelect}
      className={`flex items-center gap-3 rounded-xl border bg-white p-3 dark:bg-neutral-900 ${active ? "border-brand-500" : "border-black/5 dark:border-white/10"}`}
    >
      <span aria-hidden className="h-3 w-3 shrink-0 rounded-full" style={{ background: FACILITY_TYPE_COLOR[f.type] }} />
      <div className="min-w-0 flex-1">
        <Link href={`/venues/${venue.slug}/parking/${f.slug}`} className="font-semibold hover:underline">{f.name}</Link>
        <p className="truncate text-xs text-neutral-500">
          {FACILITY_TYPE_LABEL[f.type]}
          {walk && ` · ~${walk.minutes} min walk (est.)`}
          {f.prices[0] && ` · $${f.prices[0].min}${f.prices[0].max !== f.prices[0].min ? `–$${f.prices[0].max}` : ""}`}
        </p>
      </div>
      <ConfidenceBadge level={f.attribution.confidence} compact />
    </article>
  );
}

function CompareTable({ venue, items }: { venue: Venue; items: RankedFacility[] }) {
  const rows: { label: string; render: (r: RankedFacility) => React.ReactNode }[] = [
    { label: "Match", render: (r) => <strong>{r.score}</strong> },
    { label: "Data behind score", render: (r) => `${Math.round(r.completeness * 100)}%` },
    { label: "Type", render: (r) => FACILITY_TYPE_LABEL[r.facility.type] },
    {
      label: "Price",
      render: (r) =>
        r.price ? (
          <span className="flex flex-col items-start gap-1">
            {r.price.min === r.price.max ? `$${r.price.min}` : `$${r.price.min}–$${r.price.max}`}
            <ConfidenceBadge level={r.price.attribution.confidence} />
          </span>
        ) : (
          "Unknown"
        ),
    },
    { label: "Walk", render: (r) => (r.walk ? `${r.walk.estimated ? "~" : ""}${r.walk.minutes} min` : "Unknown") },
    { label: "Tailgating", render: (r) => r.factors.tailgate.detail },
    { label: "Exit", render: (r) => r.factors.exit.detail },
    { label: "Pre-pay", render: (r) => (r.facility.prepaidRequired ? (r.facility.prepaidRequired.value ? "Required" : "No") : "Unknown") },
    { label: "Amenities", render: (r) => r.facility.amenities.value.map((a) => AMENITY_LABEL[a]).join(", ") || "—" },
    { label: "Exit routes", render: (r) => r.facility.exit.routes?.join("; ") ?? "—" },
  ];
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <table className="w-full min-w-[480px] border-collapse text-sm">
        <thead>
          <tr>
            <th className="w-28" />
            {items.map((r) => (
              <th key={r.facility.id} scope="col" className="p-2 text-left align-bottom">
                <Link href={`/venues/${venue.slug}/parking/${r.facility.slug}`} className="font-bold hover:underline">
                  #{r.rank} {r.facility.name}
                </Link>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-t border-black/5 dark:border-white/10">
              <th scope="row" className="p-2 text-left text-xs font-medium text-neutral-500">{row.label}</th>
              {items.map((r) => (
                <td key={r.facility.id} className="p-2 align-top">{row.render(r)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div
        className="max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-white p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-xl sm:max-w-2xl sm:rounded-3xl dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button type="button" onClick={onClose} className="h-10 rounded-lg px-3 text-sm font-semibold text-brand-700 dark:text-brand-100" autoFocus>
            Done
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
