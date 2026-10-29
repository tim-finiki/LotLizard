import Link from "next/link";
import type { ParkingFacility, Venue } from "@/lib/types";
import type { VerificationSummary } from "@/lib/verification";
import { FACILITY_TYPE_LABEL } from "@/lib/labels";
import { facilityPath } from "@/lib/seo";
import { summarizeFacility } from "@/lib/facility-summary";
import { VerificationStatus } from "@/components/VerificationStatus";

/** Server-rendered index of every parking option, with links and key facts as text. */
export function ParkingOptionsList({
  venue,
  facilities,
  verification,
}: {
  venue: Venue;
  facilities: ParkingFacility[];
  verification: Record<string, VerificationSummary>;
}) {
  return (
    <ul className="flex flex-col gap-3">
      {facilities.map((f) => {
        const s = summarizeFacility(f, venue);
        return (
          <li key={f.id} className="rounded-2xl bg-white p-4 ring-1 ring-black/5 dark:bg-ink-soft dark:ring-white/10">
            <h3 className="font-bold leading-tight">
              <Link href={facilityPath(venue, f)} className="text-brand-700 hover:underline dark:text-brand-100">
                {f.name}
              </Link>
            </h3>
            <p className="text-xs text-neutral-500">
              {FACILITY_TYPE_LABEL[f.type]}
              {f.operator ? ` · ${f.operator}` : ""}
              {f.address ? ` · ${f.address}` : ""}
            </p>
            <dl className="mt-2 grid grid-cols-[6.5rem_1fr] gap-x-3 gap-y-1 text-sm">
              <dt className="text-neutral-500">Price</dt>
              <dd>{s.price}</dd>
              <dt className="text-neutral-500">Walk</dt>
              <dd>{s.walk}</dd>
              <dt className="text-neutral-500">Payment</dt>
              <dd>{s.payment}</dd>
              <dt className="text-neutral-500">Amenities</dt>
              <dd>{s.amenities}</dd>
              <dt className="text-neutral-500">Tailgating</dt>
              <dd>{s.tailgating}</dd>
            </dl>
            <div className="mt-2">
              <VerificationStatus summary={verification[f.id]} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
