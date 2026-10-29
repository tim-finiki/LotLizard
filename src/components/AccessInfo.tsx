import type { ParkingFacility } from "@/lib/types";
import { accessDisplay, ownershipDisplay, type FactDisplay } from "@/lib/access";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";

const CHIP: Record<FactDisplay["state"], string> = {
  confirmed: "bg-brand-50 text-brand-700 ring-brand-500/30 dark:bg-brand-900 dark:text-brand-100",
  reported: "bg-amber-50 text-amber-900 ring-amber-300 dark:bg-amber-900/30 dark:text-amber-100 dark:ring-amber-700",
  unknown: "bg-neutral-100 italic text-neutral-500 ring-transparent dark:bg-neutral-800 dark:text-neutral-400",
};

function Chip({ d }: { d: FactDisplay }) {
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${CHIP[d.state]}`}>{d.text}</span>;
}

/** Access then ownership, each confirmed, reported (unconfirmed) or unknown — never assumed. */
export function AccessBadges({ facility }: { facility: ParkingFacility }) {
  return (
    <span className="flex flex-wrap gap-1">
      <Chip d={accessDisplay(facility)} />
      <Chip d={ownershipDisplay(facility)} />
    </span>
  );
}

function Detail({ label, d }: { label: string; d: FactDisplay }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-neutral-500">{label}</span>
        <Chip d={d} />
        {d.attribution && <ConfidenceBadge level={d.attribution.confidence} compact />}
      </div>
      {d.attribution?.notes && <p className="text-xs text-neutral-500">{d.attribution.notes}</p>}
    </div>
  );
}

export function AccessDetails({ facility }: { facility: ParkingFacility }) {
  return (
    <div className="flex flex-col gap-2">
      <Detail label="Who can park" d={accessDisplay(facility)} />
      <Detail label="Ownership" d={ownershipDisplay(facility)} />
    </div>
  );
}
