"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { Amenity, FacilityType, ParkingFacility, Venue, VehicleType, VenueEvent } from "@/lib/types";
import {
  DEFAULT_PREFERENCES,
  EXIT_DATA_UNAVAILABLE,
  FACTORS,
  exitDirectionDataAvailable,
  hasRankableExitDirections,
  rankFacilities,
  walkInfo,
  type Factor,
  type RankedFacility,
  type RankingPreferences,
  type Recommendation,
} from "@/lib/ranking";
import { AMENITY_LABEL, FACILITY_TYPE_COLOR, FACILITY_TYPE_LABEL } from "@/lib/labels";
import { CONFIDENCE_LABEL } from "@/lib/confidence";
import { directionsLinks, type DirectionsLinks } from "@/lib/directions";
import { eventShortLabel, formatClock, formatEventDate, lotOpenTime, upcomingEvents } from "@/lib/events";
import { formatDistance } from "@/lib/geo";
import { activeFilterCount, applyDisplayFilters, buildMarkers, clearFilters } from "@/lib/explorer";
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABEL,
  PAYMENT_TIMINGS,
  PAYMENT_TIMING_LABEL,
  effectivePayment,
  type PaymentFilter,
  type PaymentMatch,
} from "@/lib/payment";
import { PaymentBadges, PaymentDetails } from "@/components/PaymentInfo";
import { FeatureBadges, FeatureDetails } from "@/components/AmenityInfo";
import { UNIVERSAL_AMENITIES, UNIVERSAL_AMENITY_LABEL, featureState } from "@/lib/features";
import { BottomSheet, snapHeight, type SheetSnap } from "@/components/BottomSheet";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { ReferralLink } from "@/components/ReferralLink";
import { usePreferences } from "@/components/usePreferences";

const VenueMap = dynamic(() => import("@/components/VenueMap"), {
  ssr: false,
  loading: () => (
    <div role="status" className="grid h-full w-full place-items-center bg-line text-sm text-neutral-600 dark:bg-ink-soft dark:text-neutral-300">
      <span className="flex items-center gap-2">
        <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-lizard border-t-transparent" />
        Loading map…
      </span>
    </div>
  ),
});

const FACTOR_LABEL: Record<Factor, string> = { cost: "Low cost", walk: "Short walk", tailgate: "Tailgating", exit: "Quick exit" };
const NO_EVENT = "none";

const REC_STYLE: Record<Recommendation, { label: string; className: string }> = {
  top_pick: { label: "Top pick", className: "bg-brand-600 text-ink" },
  good_match: { label: "Good match", className: "bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-100" },
  fair_match: { label: "Fair match", className: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200" },
  limited_data: { label: "Limited data", className: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-300 dark:bg-amber-900/30 dark:text-amber-200 dark:ring-amber-700" },
};

export interface VenueExplorerProps {
  venue: Venue;
  facilities: ParkingFacility[];
  events: VenueEvent[];
}

const DESKTOP_QUERY = "(min-width: 1024px)";

/** Matches Tailwind's lg breakpoint, where the sheet becomes a side panel. Server snapshot is mobile. */
function useIsDesktop() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(DESKTOP_QUERY);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false,
  );
}

export function VenueExplorer({ venue, facilities, events }: VenueExplorerProps) {
  const [prefs, setPrefs] = usePreferences();
  const [eventId, setEventId] = useState<string>(NO_EVENT);
  const [today, setToday] = useState<string>();
  const [hiddenTypes, setHiddenTypes] = useState<FacilityType[]>([]);
  const [selectedId, setActiveId] = useState<string>();
  const [compare, setCompare] = useState<string[]>([]);
  const [modal, setModal] = useState<"filters" | "compare" | null>(null);
  const [snap, setSnap] = useState<SheetSnap>("peek");
  const [containerHeight, setContainerHeight] = useState(640);
  const [controlsHeight, setControlsHeight] = useState(120);
  const controlsRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const pendingScroll = useRef<string | null>(null);
  const isDesktop = useIsDesktop();

  const approaches = venue.approaches ?? [];
  const direction = approaches.some((a) => a.id === prefs.direction) ? prefs.direction : "any";
  const event = events.find((e) => e.id === eventId);

  // One-time setup after mount: today's date (never baked into prerendered HTML) and URL state.
  useEffect(() => {
    const now = new Date();
    const local = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const q = new URLSearchParams(window.location.search);
    const fromUrl = q.get("event");
    /* eslint-disable react-hooks/set-state-in-effect -- one-time sync from clock and URL */
    setToday(local);
    if (fromUrl && (fromUrl === NO_EVENT || events.some((e) => e.id === fromUrl))) setEventId(fromUrl);
    else setEventId(upcomingEvents(events, local)[0]?.id ?? NO_EVENT);
    /* eslint-enable react-hooks/set-state-in-effect */
    const dir = q.get("dir");
    if (dir && (dir === "any" || approaches.some((a) => a.id === dir))) setPrefs({ ...prefs, direction: dir });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  // Keep shareable URL state in sync.
  useEffect(() => {
    if (!today) return;
    const url = new URL(window.location.href);
    url.searchParams.set("event", eventId);
    if (direction === "any") url.searchParams.delete("dir");
    else url.searchParams.set("dir", direction);
    window.history.replaceState(null, "", url);
  }, [eventId, direction, today]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setContainerHeight(entry.contentRect.height));
    ro.observe(el);
    // The floating controls wrap onto more rows on narrow phones; keep pins clear of them.
    const controls = controlsRef.current;
    const ro2 = new ResizeObserver(([entry]) => setControlsHeight(entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height));
    if (controls) ro2.observe(controls);
    return () => {
      ro.disconnect();
      ro2.disconnect();
    };
  }, []);

  // One filter pass feeds the ranking, the list AND the map, so they always agree.
  const filtered = useMemo(
    () =>
      applyDisplayFilters(facilities, { hiddenTypes, payment: prefs.payment, amenities: prefs.amenities, features: prefs.features, eventId: event?.id }),
    [facilities, hiddenTypes, prefs.payment, prefs.amenities, prefs.features, event?.id],
  );
  const ranked = useMemo(
    () => rankFacilities(venue, filtered.visible, { ...prefs, direction }, { eventKind: event?.kind }),
    [venue, filtered.visible, prefs, direction, event?.kind],
  );
  const rankById = useMemo(() => new Map(ranked.map((r) => [r.facility.id, r])), [ranked]);
  const presentTypes = useMemo(() => [...new Set(facilities.map((f) => f.type))], [facilities]);
  const rankedList = ranked.filter((r) => r.rank !== null);
  const unrankedList = ranked.filter((r) => r.rank === null);
  const others = filtered.visible.filter((f) => !rankById.has(f.id));
  const unmapped = filtered.visible.filter((f) => !f.location).length;
  const eventChoices = today ? upcomingEvents(events, today) : events;
  const markers = buildMarkers(filtered.visible, ranked);
  // A selection hidden by a filter is dropped, so the pin and card highlights never go stale.
  const activeId = selectedId && filtered.visible.some((f) => f.id === selectedId) ? selectedId : undefined;
  const setPayment = (payment: PaymentFilter) => setPrefs({ ...prefs, payment });
  const filterCount = activeFilterCount(prefs, hiddenTypes);
  const resetFilters = () => {
    setPrefs(clearFilters(prefs));
    setHiddenTypes([]);
  };
  const shownCount = filtered.visible.length;
  // Only offer amenities that some lot here actually reports.
  const reportedAmenities = useMemo(() => [...new Set(facilities.flatMap((f) => f.amenities.value))], [facilities]);
  const directionLabel = approaches.find((a) => a.id === direction)?.label;
  const exitDirectionsAvailable = exitDirectionDataAvailable(facilities, direction);
  const priorityOrder = [...FACTORS].filter((f) => prefs.weights[f] > 0).sort((a, b) => prefs.weights[b] - prefs.weights[a]);
  const rankingSummary = rankedList.slice(0, 3).map((r) => `${r.rank}. ${r.facility.name}`).join(", ");

  // After any re-rank, keep the selected lot's card in view (its position may have changed).
  useEffect(() => {
    if (activeId) pendingScroll.current = activeId;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the ranking itself changes
  }, [ranked]);

  // Scroll the selected card into view inside the sheet (not the page) once it has rendered.
  useEffect(() => {
    const id = pendingScroll.current;
    if (!id) return;
    pendingScroll.current = null;
    const frame = requestAnimationFrame(() => {
      const card = document.getElementById(`lot-${id}`);
      const scroller = listRef.current?.closest<HTMLElement>("[data-sheet-scroll]");
      if (card && scroller) scroller.scrollTo({ top: card.offsetTop - 8, behavior: "smooth" });
    });
    return () => cancelAnimationFrame(frame);
  });

  const selectFromMap = (id: string) => {
    setActiveId(id);
    if (snap === "peek") setSnap("half");
    pendingScroll.current = id;
  };

  const selectFromList = (id: string) => {
    setActiveId((cur) => (cur === id ? undefined : id));
    // Keep the map visible so the highlighted pin can be seen.
    if (snap === "full" && !isDesktop) setSnap("half");
  };

  const toggleCompare = (id: string) =>
    setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length >= 3 ? c : [...c, id]));

  const openHours = venue.lotOpenHoursBefore?.value;
  const opensAt = event && openHours !== undefined ? lotOpenTime(event, openHours) : undefined;
  const stadiumDirections = directionsLinks({ address: venue.address.street && `${venue.address.street}, ${venue.address.city}, ${venue.address.state} ${venue.address.postalCode ?? ""}`.trim() });
  const activeHasPin = !activeId || facilities.find((f) => f.id === activeId)?.location;

  const header = (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <h2 className="text-base font-bold leading-tight">
          {rankedList.length} ranked for you
          {unrankedList.length > 0 && <span className="font-normal text-neutral-500"> · {unrankedList.length} need more data</span>}
        </h2>
        <p className="truncate text-xs text-neutral-500">
          {event ? (
            <>
              {formatEventDate(event.date)} · {event.startLocal ? `Kickoff ${formatClock(event.startLocal)}` : "Kickoff time TBA"}
              {opensAt && ` · Official lots open ${opensAt}`}
            </>
          ) : (
            "No event selected"
          )}
        </p>
        <p className="truncate text-xs text-neutral-500">
          Sorted by {priorityOrder.length ? priorityOrder.map((f) => SORT_LABEL[f].toLowerCase()).join(" › ") : "all factors equally"}
          {event && " · Prices aren't game-specific yet"}
        </p>
        {filterCount > 0 && (
          <p className="text-xs text-neutral-500">
            {filterCount} {filterCount === 1 ? "filter" : "filters"} on · {shownCount} of {facilities.length} shown ·{" "}
            <button type="button" onClick={resetFilters} className="font-semibold text-brand-700 underline dark:text-brand-100">
              Clear filters
            </button>
          </p>
        )}
        <p className="sr-only" aria-live="polite">
          {rankingSummary ? `Ranking updated: ${rankingSummary}` : "No lots have enough data to rank"}
        </p>
      </div>
      {compare.length > 0 && (
        <button
          type="button"
          onClick={() => setModal("compare")}
          disabled={compare.length < 2}
          className="h-9 shrink-0 rounded-full bg-ink px-3 text-xs font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
        >
          Compare {compare.length}
        </button>
      )}
    </div>
  );

  return (
    <div ref={rootRef} className="relative h-full overflow-hidden bg-neutral-200 lg:grid lg:grid-cols-[400px_1fr] lg:grid-rows-[minmax(0,1fr)] dark:bg-neutral-800">
      {/* Map + floating controls */}
      <div className="absolute inset-0 lg:relative lg:order-2">
        <VenueMap
          venue={{ name: venue.name, lat: venue.location.lat, lng: venue.location.lng }}
          markers={markers}
          activeId={activeId}
          onSelect={selectFromMap}
          bottomInset={isDesktop ? 0 : snapHeight(snap, containerHeight)}
          topInset={controlsHeight}
        />
        <div ref={controlsRef} className="pointer-events-none absolute inset-x-0 top-0 z-[650] flex flex-col gap-2 p-3 pr-14">
          <div className="pointer-events-auto flex flex-wrap gap-2">
            <PillSelect label="Event" value={eventId} onChange={setEventId}>
              {eventChoices.map((e) => (
                <option key={e.id} value={e.id}>{eventShortLabel(e)}</option>
              ))}
              <option value={NO_EVENT}>No specific event</option>
            </PillSelect>
            {approaches.length > 0 && (
              <PillSelect label="Leaving toward" value={direction} onChange={(d) => setPrefs({ ...prefs, direction: d })}>
                <option value="any">Leaving: any way</option>
                {approaches.map((a) => (
                  <option key={a.id} value={a.id}>Leaving: {a.label}</option>
                ))}
              </PillSelect>
            )}
            <button
              type="button"
              onClick={() => setModal("filters")}
              aria-label={filterCount > 0 ? `Filters, ${filterCount} active` : "Filters"}
              className={`flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold shadow-md ${
                filterCount > 0 ? "bg-ink text-white dark:bg-white dark:text-neutral-900" : "bg-white dark:bg-ink-soft"
              }`}
            >
              Filters
              {filterCount > 0 && (
                <span aria-hidden className="grid h-5 min-w-5 place-items-center rounded-full bg-lizard px-1 text-[11px] text-ink">{filterCount}</span>
              )}
            </button>
          </div>
          {direction !== "any" && !exitDirectionsAvailable && (
            <p role="status" className="pointer-events-auto w-fit max-w-full rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900 shadow dark:bg-amber-900/80 dark:text-amber-50">
              {EXIT_DATA_UNAVAILABLE} for {directionLabel}. Rankings aren&apos;t adjusted for direction.{" "}
              <a href="#getting-there" className="underline">Traffic plan</a>
            </p>
          )}
          {activeId && !activeHasPin && (
            <p className="pointer-events-auto w-fit rounded-lg bg-white/95 px-3 py-1.5 text-xs shadow dark:bg-ink-soft/95">
              This option has no confirmed location, so it isn&apos;t on the map.
            </p>
          )}
        </div>
      </div>

      <BottomSheet snap={snap} onSnapChange={setSnap} containerHeight={containerHeight} header={header} label="Parking results">
        <div ref={listRef} className="relative flex flex-col gap-2">
          {filtered.hiddenUnknownFeatures > 0 && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">
              {filtered.hiddenUnknownFeatures} {filtered.hiddenUnknownFeatures === 1 ? "lot is" : "lots are"} hidden because we can&apos;t yet
              confirm {prefs.features.length === 1 ? "that amenity" : "those amenities"} there.
            </p>
          )}
          {filtered.hiddenUnknownPayment > 0 && (
            <p className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">
              <span>
                {filtered.hiddenUnknownPayment} {filtered.hiddenUnknownPayment === 1 ? "lot is" : "lots are"} hidden because their payment info is unknown.
              </span>
              <button type="button" onClick={() => setPayment({ ...prefs.payment, includeUnknown: true })} className="font-semibold underline">
                Show them
              </button>
            </p>
          )}
          {rankedList.map((r) => (
            <ResultCard
              key={r.facility.id}
              venue={venue}
              ranked={r}
              direction={direction}
              eventId={event?.id}
              paymentMatch={filtered.paymentMatch.get(r.facility.id)}
              active={activeId === r.facility.id}
              compared={compare.includes(r.facility.id)}
              compareDisabled={compare.length >= 3 && !compare.includes(r.facility.id)}
              onSelect={() => selectFromList(r.facility.id)}
              onToggleCompare={() => toggleCompare(r.facility.id)}
            />
          ))}
          {rankedList.length === 0 && (
            <p className="rounded-xl bg-mist p-3 text-sm dark:bg-neutral-800">
              {unrankedList.length > 0
                ? "No lot has enough data for these priorities to rank it honestly. Try weighting walk or tailgating, where we have more data."
                : "No lots match your filters. Try relaxing the max price or vehicle type."}
            </p>
          )}

          {unrankedList.length > 0 && (
            <>
              <h3 className="mt-3 text-sm font-bold">Not enough data to rank</h3>
              <p className="-mt-1 text-xs text-neutral-500">We know too little about these for your priorities, so we don&apos;t rank them either way.</p>
              {unrankedList.map((r) => (
                <ResultCard
                  key={r.facility.id}
                  venue={venue}
                  ranked={r}
                  direction={direction}
                  eventId={event?.id}
                  paymentMatch={filtered.paymentMatch.get(r.facility.id)}
                  active={activeId === r.facility.id}
                  compared={compare.includes(r.facility.id)}
                  compareDisabled={compare.length >= 3 && !compare.includes(r.facility.id)}
                  onSelect={() => selectFromList(r.facility.id)}
                  onToggleCompare={() => toggleCompare(r.facility.id)}
                />
              ))}
            </>
          )}

          {others.length > 0 && (
            <>
              <h3 className="mt-3 text-sm font-bold">Other ways in</h3>
              {others.map((f) => (
                <OtherCard key={f.id} venue={venue} facility={f} eventId={event?.id} active={activeId === f.id} onSelect={() => selectFromList(f.id)} />
              ))}
            </>
          )}

          <div className="mt-3 flex flex-col gap-2 rounded-xl bg-mist p-3 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
            <p>
              <strong>How to read this:</strong> the match averages only what we actually know about a lot. Missing data
              is neither a plus nor a minus, and lots with too little data aren&apos;t ranked. Official-lot prices are an
              area-wide range, so they don&apos;t count toward &ldquo;Low cost&rdquo;. Pins are approximate unless marked
              exact{unmapped > 0 && `, and ${unmapped} option${unmapped > 1 ? "s have" : " has"} no confirmed location`}.
            </p>
            {stadiumDirections && (
              <p>
                Stadium directions:{" "}
                <a href={stadiumDirections.google} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-700 underline dark:text-brand-100">Google Maps</a>{" · "}
                <a href={stadiumDirections.apple} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-700 underline dark:text-brand-100">Apple Maps</a>
              </p>
            )}
            <a href="#venue-info" className="font-semibold text-brand-700 underline dark:text-brand-100">Rules, transit, traffic &amp; sources ↓</a>
          </div>
        </div>
      </BottomSheet>

      {modal === "filters" && (
        <Modal
          title="Filters"
          onClose={() => setModal(null)}
          headerAction={
            <button
              type="button"
              onClick={resetFilters}
              disabled={filterCount === 0}
              className="h-10 rounded-lg px-3 text-sm font-semibold text-neutral-600 disabled:opacity-40 dark:text-neutral-300"
            >
              Clear all{filterCount > 0 ? ` (${filterCount})` : ""}
            </button>
          }
          footer={
            <button type="button" onClick={() => setModal(null)} className="h-12 w-full rounded-xl bg-brand-600 text-base font-semibold text-ink">
              Show {shownCount} {shownCount === 1 ? "option" : "options"}
            </button>
          }
        >
          <FiltersPanel
            prefs={prefs}
            onChange={setPrefs}
            presentTypes={presentTypes}
            hiddenTypes={hiddenTypes}
            onToggleType={(t) => setHiddenTypes((h) => (h.includes(t) ? h.filter((x) => x !== t) : [...h, t]))}
            reportedAmenities={reportedAmenities}
          />
        </Modal>
      )}
      {modal === "compare" && (
        <Modal title="Compare lots" onClose={() => setModal(null)}>
          <CompareTable venue={venue} items={compare.map((id) => rankById.get(id)).filter((r): r is RankedFacility => !!r)} />
        </Modal>
      )}
    </div>
  );
}

function PillSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <label className="relative flex h-10 min-w-0 max-w-[calc(50%-0.25rem)] shrink items-center rounded-full bg-white pl-3 pr-7 shadow-md min-[400px]:max-w-[13rem] min-[400px]:shrink-0 min-[400px]:pl-4 min-[400px]:pr-8 dark:bg-ink-soft lg:max-w-[22rem]">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full min-w-0 appearance-none truncate bg-transparent text-sm font-semibold outline-none">
        {children}
      </select>
      <span aria-hidden className="pointer-events-none absolute right-3 text-xs text-neutral-500">▾</span>
    </label>
  );
}

function RecBadge({ rec }: { rec: Recommendation }) {
  const s = REC_STYLE[rec];
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${s.className}`}>{s.label}</span>;
}

function Stat({ label, value, missing = "No data", note }: { label: string; value?: string; missing?: string; note?: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-wide text-neutral-500">{label}</div>
      <div className={value ? "truncate text-sm font-semibold" : "text-[11px] italic leading-tight text-neutral-400"}>{value ?? missing}</div>
      {note && value && <div className="truncate text-[10px] text-neutral-500">{note}</div>}
    </div>
  );
}

function priceText(r: RankedFacility) {
  return r.price ? (r.price.min === r.price.max ? `$${r.price.min}` : `$${r.price.min}–${r.price.max}`) : undefined;
}

function priceNote(r: RankedFacility) {
  return r.price && r.price.scope === "area" ? "area range" : undefined;
}

function tailgateText(f: ParkingFacility) {
  if (f.tailgating.allowed.value === false) return "Not allowed";
  if (f.tailgating.atmosphere) return `${f.tailgating.atmosphere.value}/5 vibe`;
  if (f.tailgating.allowed.value === true) return "Allowed";
  return undefined;
}

function exitText(r: RankedFacility, direction: string) {
  const f = r.facility;
  if (direction !== "any" && hasRankableExitDirections(f)) return f.exit.directions!.value.includes(direction) ? "Your way" : "Other way";
  if (f.exit.rating) return `${f.exit.rating.value}/5`;
  return undefined;
}

function DirectionsRow({ links }: { links: DirectionsLinks | null }) {
  if (!links) {
    return <p className="text-xs text-neutral-500">No directions yet — this lot&apos;s entrance hasn&apos;t been verified.</p>;
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <a href={links.google} target="_blank" rel="noopener noreferrer" className="flex h-9 items-center rounded-lg bg-neutral-100 px-3 text-xs font-semibold dark:bg-neutral-800">
        Google Maps
      </a>
      <a href={links.apple} target="_blank" rel="noopener noreferrer" className="flex h-9 items-center rounded-lg bg-neutral-100 px-3 text-xs font-semibold dark:bg-neutral-800">
        Apple Maps
      </a>
      <span className="text-[11px] text-neutral-500">{links.basis === "street_address" ? "to the listed street address" : "to the verified entrance"}</span>
    </div>
  );
}

function ResultCard({
  venue,
  ranked: r,
  direction,
  eventId,
  paymentMatch,
  active,
  compared,
  compareDisabled,
  onSelect,
  onToggleCompare,
}: {
  venue: Venue;
  ranked: RankedFacility;
  direction: string;
  eventId?: string;
  paymentMatch?: PaymentMatch;
  active: boolean;
  compared: boolean;
  compareDisabled: boolean;
  onSelect: () => void;
  onToggleCompare: () => void;
}) {
  const f = r.facility;
  const payment = effectivePayment(f, eventId);
  return (
    <article
      id={`lot-${f.id}`}
      className={`rounded-2xl border bg-white transition dark:bg-ink-soft ${
        active ? "border-brand-500 ring-2 ring-brand-500/30" : "border-black/5 dark:border-white/10"
      }`}
    >
      <button type="button" onClick={onSelect} aria-expanded={active} className="flex w-full gap-3 p-3 text-left">
        <span
          aria-hidden
          className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
          style={{ background: FACILITY_TYPE_COLOR[f.type] }}
        >
          {r.rank ?? "?"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-2">
            <span className="min-w-0">
              <span className="block truncate font-semibold leading-tight">
                <span className="sr-only">{r.rank !== null ? `Rank ${r.rank}: ` : "Not ranked: "}</span>
                {f.name}
              </span>
              <span className="block truncate text-xs text-neutral-500">{FACILITY_TYPE_LABEL[f.type]}</span>
            </span>
            <RecBadge rec={r.recommendation} />
          </span>
          <span className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1.5 min-[370px]:grid-cols-4">
            <Stat label="Price" value={priceText(r)} note={priceNote(r)} />
            <Stat label="Walk" value={r.walk ? `${r.walk.estimated ? "~" : ""}${r.walk.minutes} min` : undefined} />
            <Stat label="Tailgate" value={tailgateText(f)} />
            <Stat label="Exit" value={exitText(r, direction)} missing="Not yet available" />
          </span>
          <span className="mt-2 block">
            <span className="sr-only">Payment: </span>
            <PaymentBadges policy={payment.policy} isEventOverride={payment.isEventOverride} match={paymentMatch} />
          </span>
          <span className="mt-1 block empty:hidden">
            <FeatureBadges facility={f} />
          </span>
        </span>
      </button>

      {active && (
        <div className="flex flex-col gap-3 border-t border-black/5 px-3 pb-3 pt-3 text-sm dark:border-white/10">
          <dl className="grid grid-cols-3 gap-2 rounded-xl bg-mist p-2 text-center dark:bg-neutral-800">
            <div>
              <dt className="text-[10px] uppercase tracking-wide text-neutral-500">Match</dt>
              <dd className="text-lg font-extrabold tabular-nums">{r.rank !== null ? r.score : <span className="text-sm font-semibold text-neutral-400">Not ranked</span>}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-wide text-neutral-500">Data</dt>
              <dd className="text-lg font-extrabold tabular-nums">{Math.round(r.completeness * 100)}%</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-wide text-neutral-500">Confidence</dt>
              <dd className="pt-1 text-xs font-semibold">{CONFIDENCE_LABEL[r.confidence].replace(" confidence", "")}</dd>
            </div>
          </dl>
          <ul className="flex flex-col gap-1 text-xs text-neutral-600 dark:text-neutral-300">
            {FACTORS.map((k) => (
              <li key={k} className="flex justify-between gap-2">
                <span>{FACTOR_LABEL[k]}</span>
                <span className={r.factors[k].known ? "" : "italic text-neutral-400"}>{r.factors[k].detail}</span>
              </li>
            ))}
            {r.walk?.meters !== undefined && (
              <li className="flex justify-between gap-2">
                <span>Distance</span>
                <span>~{formatDistance(r.walk.meters)} (estimated)</span>
              </li>
            )}
          </ul>
          <div className="rounded-xl bg-mist p-2 dark:bg-neutral-800">
            <PaymentDetails policy={payment.policy} heading={payment.isEventOverride ? "Payment (game-day policy)" : "Payment"} />
          </div>
          <div className="rounded-xl bg-mist p-2 dark:bg-neutral-800">
            <p className="mb-1 text-sm font-semibold">Parking amenities</p>
            <FeatureDetails facility={f} />
          </div>
          {f.amenities.value.length > 0 && (
            <p className="text-xs text-neutral-500">{f.amenities.value.map((a) => AMENITY_LABEL[a]).join(" · ")}</p>
          )}
          {r.price?.attribution.notes && (
            <p className="flex items-start gap-2 text-xs text-neutral-500">
              <ConfidenceBadge level={r.price.attribution.confidence} compact />
              <span>Price: {r.price.attribution.notes}</span>
            </p>
          )}
          <DirectionsRow links={directionsLinks(f)} />
          <div className="flex flex-wrap items-center gap-2">
            <label className={`flex h-9 items-center gap-2 rounded-lg border border-black/10 px-3 text-xs font-medium dark:border-white/15 ${compareDisabled ? "opacity-50" : ""}`}>
              <input type="checkbox" checked={compared} disabled={compareDisabled} onChange={onToggleCompare} className="h-4 w-4 accent-brand-600" />
              Compare
            </label>
            <Link
              href={`/venues/${venue.slug}/parking/${f.slug}`}
              className="flex h-9 items-center rounded-lg bg-ink px-3 text-xs font-semibold text-white dark:bg-white dark:text-neutral-900"
            >
              Details, sources &amp; reviews
            </Link>
          </div>
          {f.booking && <ReferralLink booking={f.booking} />}
        </div>
      )}
    </article>
  );
}

function OtherCard({
  venue,
  facility: f,
  eventId,
  active,
  onSelect,
}: {
  venue: Venue;
  facility: ParkingFacility;
  eventId?: string;
  active: boolean;
  onSelect: () => void;
}) {
  const walk = walkInfo(f, venue);
  const payment = effectivePayment(f, eventId);
  const price = f.prices[0];
  return (
    <article id={`lot-${f.id}`} className={`rounded-xl border bg-white dark:bg-ink-soft ${active ? "border-brand-500 ring-2 ring-brand-500/30" : "border-black/5 dark:border-white/10"}`}>
      <button type="button" onClick={onSelect} aria-expanded={active} className="flex w-full items-center gap-3 p-3 text-left">
        <span aria-hidden className="h-3 w-3 shrink-0 rounded-full ring-1 ring-black/10 dark:ring-white/40" style={{ background: FACILITY_TYPE_COLOR[f.type] }} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{f.name}</span>
          <span className="block truncate text-xs text-neutral-500">
            {FACILITY_TYPE_LABEL[f.type]}
            {walk && ` · ~${walk.minutes} min walk`}
            {price && ` · $${price.min}${price.max !== price.min ? `–${price.max}` : ""}`}
          </span>
        </span>
        <ConfidenceBadge level={f.attribution.confidence} compact />
      </button>
      {active && (
        <div className="flex flex-col gap-2 border-t border-black/5 px-3 pb-3 pt-2 text-xs dark:border-white/10">
          <p className="text-neutral-600 dark:text-neutral-300">{f.description}</p>
          {payment.policy && <PaymentBadges policy={payment.policy} isEventOverride={payment.isEventOverride} />}
          <DirectionsRow links={directionsLinks(f)} />
          <Link href={`/venues/${venue.slug}/parking/${f.slug}`} className="font-semibold text-brand-700 underline dark:text-brand-100">
            Details &amp; sources
          </Link>
        </div>
      )}
    </article>
  );
}

function ChipToggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`h-9 rounded-full px-3 text-sm font-medium ring-1 ring-inset ${
        on ? "bg-brand-600 text-ink ring-brand-600" : "bg-white ring-black/10 dark:bg-ink-soft dark:ring-white/15"
      }`}
    >
      {children}
    </button>
  );
}

const VEHICLE_LABEL: Record<VehicleType, string> = { car: "Car / SUV", rv: "RV", bus: "Bus", limo: "Limo", motorcycle: "Motorcycle" };

/** Plain-language labels for the sort sliders (the factor names stay short on cards). */
const SORT_LABEL: Record<Factor, string> = {
  cost: "Lower price",
  walk: "Shorter walk",
  tailgate: "Better tailgate scene",
  exit: "Faster exit",
};
const WEIGHT_WORDS = ["Ignore", "A little", "Some", "Matters", "A lot", "Top priority"];

function FilterSection({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-t border-black/5 py-4 first:border-t-0 first:pt-0 dark:border-white/10">
      <legend className="sr-only">{title}</legend>
      <h4 aria-hidden className="text-sm font-bold">{title}</h4>
      {hint && <p className="mt-0.5 text-xs text-neutral-500">{hint}</p>}
      <div className="mt-3 flex flex-col gap-3">{children}</div>
    </fieldset>
  );
}

function ChipRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

function FiltersPanel({
  prefs,
  onChange,
  presentTypes,
  hiddenTypes,
  onToggleType,
  reportedAmenities,
}: {
  prefs: RankingPreferences;
  onChange: (p: RankingPreferences) => void;
  presentTypes: FacilityType[];
  hiddenTypes: FacilityType[];
  onToggleType: (t: FacilityType) => void;
  reportedAmenities: Amenity[];
}) {
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const payment = prefs.payment;
  const setPayment = (p: PaymentFilter) => onChange({ ...prefs, payment: p });
  const setWeight = (f: Factor, v: number) => onChange({ ...prefs, weights: { ...prefs.weights, [f]: v } });
  const balanced = FACTORS.every((f) => prefs.weights[f] === DEFAULT_PREFERENCES.weights[f]);

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="filter-results-heading">
        <h3 id="filter-results-heading" className="text-xs font-bold uppercase tracking-wide text-neutral-500">Filter results</h3>
        <p className="mb-3 text-xs text-neutral-500">These hide options that don&apos;t fit.</p>

        <FilterSection title="Payment methods" hint="Shows lots known to accept any of these.">
          <ChipRow>
            {PAYMENT_METHODS.map((m) => (
              <ChipToggle key={m} on={payment.methods.includes(m)} onClick={() => setPayment({ ...payment, methods: toggle(payment.methods, m) })}>
                {PAYMENT_METHOD_LABEL[m]}
              </ChipToggle>
            ))}
          </ChipRow>
        </FilterSection>

        <FilterSection title="Payment timing">
          <ChipRow>
            {PAYMENT_TIMINGS.map((t) => (
              <ChipToggle key={t} on={payment.timings.includes(t)} onClick={() => setPayment({ ...payment, timings: toggle(payment.timings, t) })}>
                {PAYMENT_TIMING_LABEL[t]}
              </ChipToggle>
            ))}
          </ChipRow>
          <Toggle
            label="Include lots with unknown payment info"
            checked={payment.includeUnknown}
            onChange={(v) => setPayment({ ...payment, includeUnknown: v })}
          />
          <p className="-mt-2 text-xs text-neutral-500">Shown as &ldquo;Unconfirmed for your filter&rdquo;. We never assume a lot accepts a method.</p>
        </FilterSection>

        <FilterSection title="Vehicle">
          <ChipRow>
            {(Object.keys(VEHICLE_LABEL) as VehicleType[]).map((v) => (
              <ChipToggle key={v} on={prefs.vehicle === v} onClick={() => onChange({ ...prefs, vehicle: v })}>
                {VEHICLE_LABEL[v]}
              </ChipToggle>
            ))}
          </ChipRow>
        </FilterSection>

        <FilterSection title="Parking amenities" hint="Shows only lots where each selected amenity is confirmed available.">
          <ChipRow>
            {UNIVERSAL_AMENITIES.map((k) => (
              <ChipToggle key={k} on={prefs.features.includes(k)} onClick={() => onChange({ ...prefs, features: toggle(prefs.features, k) })}>
                {UNIVERSAL_AMENITY_LABEL[k]}
              </ChipToggle>
            ))}
          </ChipRow>
        </FilterSection>

        <FilterSection title="Tailgating & extras" hint={reportedAmenities.length ? "Extras only match where they've been reported." : undefined}>
          <Toggle label="Allows tailgating" checked={prefs.requireTailgating} onChange={(v) => onChange({ ...prefs, requireTailgating: v })} />
          {reportedAmenities.length > 0 && (
            <ChipRow>
              {reportedAmenities.map((a) => (
                <ChipToggle key={a} on={prefs.amenities.includes(a)} onClick={() => onChange({ ...prefs, amenities: toggle(prefs.amenities, a) })}>
                  {AMENITY_LABEL[a]}
                </ChipToggle>
              ))}
            </ChipRow>
          )}
        </FilterSection>

        <FilterSection title="Price">
          <label className="flex items-center justify-between gap-3 text-sm font-medium">
            Max price per vehicle
            <span className="flex items-center gap-1">
              $
              <input
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="Any"
                value={prefs.maxPrice ?? ""}
                onChange={(e) => onChange({ ...prefs, maxPrice: e.target.value === "" ? undefined : Math.max(0, Number(e.target.value)) })}
                className="h-10 w-24 rounded-lg border border-black/10 bg-white px-2 text-right dark:border-white/15 dark:bg-neutral-800"
              />
            </span>
          </label>
        </FilterSection>

        <FilterSection title="Parking types" hint="Tap to hide a type from the map and list.">
          <ChipRow>
            {presentTypes.map((t) => {
              // Types are shown by default, so "on" is the neutral state; hidden types are struck through.
              const shown = !hiddenTypes.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={shown}
                  onClick={() => onToggleType(t)}
                  className={`flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium ring-1 ring-inset ${
                    shown ? "bg-white ring-black/10 dark:bg-ink-soft dark:ring-white/15" : "bg-neutral-100 text-neutral-400 line-through ring-transparent dark:bg-neutral-800"
                  }`}
                >
                  <span aria-hidden className="h-2.5 w-2.5 rounded-full ring-1 ring-black/10 dark:ring-white/40" style={{ background: shown ? FACILITY_TYPE_COLOR[t] : "#a3a3a3" }} />
                  {FACILITY_TYPE_LABEL[t]}
                </button>
              );
            })}
          </ChipRow>
        </FilterSection>
      </section>

      <section aria-labelledby="sort-results-heading" className="rounded-2xl bg-mist p-4 dark:bg-neutral-800/60">
        <div className="flex items-baseline justify-between gap-2">
          <h3 id="sort-results-heading" className="text-xs font-bold uppercase tracking-wide text-neutral-500">Sort results</h3>
          <button
            type="button"
            disabled={balanced}
            onClick={() => onChange({ ...prefs, weights: DEFAULT_PREFERENCES.weights })}
            className="text-xs font-semibold text-brand-700 underline disabled:no-underline disabled:opacity-40 dark:text-brand-100"
          >
            Reset to balanced
          </button>
        </div>
        <p className="mb-3 text-xs text-neutral-500">How much each matters to you. This changes the order, never what&apos;s shown.</p>
        <div className="flex flex-col gap-4">
          {FACTORS.map((f) => (
            <label key={f} className="flex flex-col gap-1">
              <span className="flex justify-between text-sm font-medium">
                {SORT_LABEL[f]}
                <span className="font-normal text-neutral-500">{WEIGHT_WORDS[prefs.weights[f]]}</span>
              </span>
              <input type="range" min={0} max={5} step={1} value={prefs.weights[f]} onChange={(e) => setWeight(f, Number(e.target.value))} className="h-8 w-full accent-brand-600" />
            </label>
          ))}
        </div>
        <p className="mt-3 text-xs text-neutral-500">Saved on this device. Missing data never counts in a lot&apos;s favour.</p>
      </section>
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

function CompareTable({ venue, items }: { venue: Venue; items: RankedFacility[] }) {
  const rows: { label: string; render: (r: RankedFacility) => React.ReactNode }[] = [
    { label: "Recommendation", render: (r) => <RecBadge rec={r.recommendation} /> },
    { label: "Match", render: (r) => (r.rank !== null ? <strong>{r.score}</strong> : "Not ranked") },
    { label: "Data / confidence", render: (r) => `${Math.round(r.completeness * 100)}% · ${CONFIDENCE_LABEL[r.confidence]}` },
    { label: "Type", render: (r) => FACILITY_TYPE_LABEL[r.facility.type] },
    {
      label: "Price",
      render: (r) =>
        r.price ? (
          <span className="flex flex-col items-start gap-1">
            {priceText(r)}
            <ConfidenceBadge level={r.price.attribution.confidence} />
          </span>
        ) : (
          <span className="italic text-neutral-400">No data</span>
        ),
    },
    { label: "Walk", render: (r) => (r.walk ? `${r.walk.estimated ? "~" : ""}${r.walk.minutes} min` : <span className="italic text-neutral-400">No data</span>) },
    { label: "Tailgating", render: (r) => r.factors.tailgate.detail },
    { label: "Exit", render: (r) => r.factors.exit.detail },
    { label: "Payment", render: (r) => <PaymentBadges policy={r.facility.payment} /> },
    {
      label: "Amenities",
      render: (r) =>
        UNIVERSAL_AMENITIES.some((k) => featureState(r.facility, k) !== "unknown") ? (
          <FeatureBadges facility={r.facility} />
        ) : (
          <span className="italic text-neutral-400">Unknown</span>
        ),
    },
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
                  {r.rank !== null ? `#${r.rank} ` : ""}{r.facility.name}
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

function Modal({
  title,
  onClose,
  children,
  headerAction,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/40 sm:items-center" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div
        className="flex max-h-[85dvh] w-full flex-col rounded-t-3xl bg-white shadow-xl sm:max-w-2xl sm:rounded-3xl dark:bg-ink-soft"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-black/5 px-4 py-2 dark:border-white/10">
          <h2 className="text-lg font-bold">{title}</h2>
          <div className="flex items-center gap-1">
            {headerAction}
            <button type="button" onClick={onClose} className="h-10 rounded-lg px-3 text-sm font-semibold text-brand-700 dark:text-brand-100" autoFocus>
              Done
            </button>
          </div>
        </div>
        <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-4 ${footer ? "pb-4" : "pb-[calc(1.5rem+env(safe-area-inset-bottom))]"}`}>{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-black/5 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 dark:border-white/10">{footer}</div>
        )}
      </div>
    </div>
  );
}
