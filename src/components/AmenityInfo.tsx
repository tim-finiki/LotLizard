import type { ParkingFacility } from "@/lib/types";
import { AVAILABILITY_LABEL, UNIVERSAL_AMENITIES, UNIVERSAL_AMENITY_LABEL, UNIVERSAL_AMENITY_SHORT, featureFact, featureState } from "@/lib/features";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";

/** Compact badges for confirmed universal amenities. Unknown ones are omitted rather than implied. */
export function FeatureBadges({ facility }: { facility: ParkingFacility }) {
  const known = UNIVERSAL_AMENITIES.filter((k) => featureState(facility, k) !== "unknown");
  if (known.length === 0) return null;
  return (
    <span className="flex flex-wrap items-center gap-1 text-[11px]">
      {known.map((k) =>
        featureState(facility, k) === "available" ? (
          <span key={k} className="rounded bg-emerald-100 px-1.5 py-0.5 font-semibold text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100">
            ✓ {UNIVERSAL_AMENITY_SHORT[k]}
          </span>
        ) : (
          <span key={k} className="rounded bg-neutral-100 px-1.5 py-0.5 text-neutral-500 line-through dark:bg-neutral-800">
            {UNIVERSAL_AMENITY_SHORT[k]}
          </span>
        ),
      )}
    </span>
  );
}

const STATE_STYLE = {
  available: "font-semibold text-emerald-800 dark:text-emerald-200",
  unavailable: "font-semibold text-neutral-700 dark:text-neutral-200",
  unknown: "italic text-neutral-500",
} as const;

/** All four universal amenities with their state, source confidence and reported date. */
export function FeatureDetails({ facility }: { facility: ParkingFacility }) {
  return (
    <dl className="flex flex-col gap-2 text-sm">
      {UNIVERSAL_AMENITIES.map((k) => {
        const fact = featureFact(facility, k);
        const state = featureState(facility, k);
        return (
          <div key={k} className="flex flex-col gap-0.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <dt className="text-neutral-600 dark:text-neutral-300">{UNIVERSAL_AMENITY_LABEL[k]}</dt>
              <dd className="flex items-center gap-2">
                <span className={STATE_STYLE[state]}>{AVAILABILITY_LABEL[state]}</span>
                {fact && state !== "unknown" && <ConfidenceBadge level={fact.attribution.confidence} compact />}
              </dd>
            </div>
            {fact && state !== "unknown" && (
              <p className="text-xs text-neutral-500">
                {fact.notes ? `${fact.notes} · ` : ""}Reported {fact.reportedAt}
                {fact.attribution.lastVerifiedAt ? ` · verified ${fact.attribution.lastVerifiedAt}` : " · not yet verified"}
              </p>
            )}
          </div>
        );
      })}
    </dl>
  );
}
