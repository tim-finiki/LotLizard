import type { PaymentPolicy } from "@/lib/types";
import { PAYMENT_METHOD_LABEL, PAYMENT_METHOD_SHORT, PAYMENT_TIMING_LABEL, type PaymentMatch, unknownMethods } from "@/lib/payment";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";

const TIMING_STYLE = {
  prepay_required: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
  advance_optional: "bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100",
  pay_on_arrival: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100",
} as const;

/** Compact one-line payment badges for result cards. Unknown is shown as unknown, never as accepted. */
export function PaymentBadges({ policy, isEventOverride, match }: { policy?: PaymentPolicy; isEventOverride?: boolean; match?: PaymentMatch }) {
  const methods = policy?.accepted ?? [];
  const shown = methods.slice(0, 3);
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-1 text-[11px]">
      {policy?.timing ? (
        <span className={`rounded px-1.5 py-0.5 font-semibold ${TIMING_STYLE[policy.timing]}`}>{PAYMENT_TIMING_LABEL[policy.timing].replace(" (optional)", "")}</span>
      ) : (
        <span className="rounded px-1.5 py-0.5 italic text-neutral-500 ring-1 ring-inset ring-neutral-300 dark:ring-neutral-700">Timing unknown</span>
      )}
      {shown.length > 0 ? (
        <>
          {shown.map((m) => (
            <span key={m} className="rounded bg-neutral-100 px-1.5 py-0.5 font-medium dark:bg-neutral-800">
              {PAYMENT_METHOD_SHORT[m]}
            </span>
          ))}
          {methods.length > 3 && <span className="text-neutral-500">+{methods.length - 3}</span>}
        </>
      ) : (
        <span className="rounded px-1.5 py-0.5 italic text-neutral-500 ring-1 ring-inset ring-neutral-300 dark:ring-neutral-700">Methods unknown</span>
      )}
      {policy && <ConfidenceBadge level={policy.attribution.confidence} compact />}
      {isEventOverride && <span className="font-semibold text-brand-700 dark:text-brand-100">Game-day policy</span>}
      {match === "unknown" && <span className="font-semibold text-amber-700 dark:text-amber-300">Unconfirmed for your filter</span>}
    </span>
  );
}

/** Full payment detail for lot pages and expanded cards. */
export function PaymentDetails({ policy, heading }: { policy?: PaymentPolicy; heading?: string }) {
  if (!policy) {
    return (
      <div className="text-sm">
        {heading && <p className="font-semibold">{heading}</p>}
        <p className="text-neutral-500">No payment information yet. We don&apos;t assume any method is accepted.</p>
      </div>
    );
  }
  const unknown = unknownMethods(policy);
  return (
    <div className="flex flex-col gap-2 text-sm">
      {heading && <p className="font-semibold">{heading}</p>}
      <dl className="grid grid-cols-[7.5rem_1fr] gap-x-3 gap-y-1.5">
        <dt className="text-neutral-500">When you pay</dt>
        <dd className="font-medium">{policy.timing ? PAYMENT_TIMING_LABEL[policy.timing] : <span className="italic text-neutral-500">Unknown</span>}</dd>
        <dt className="text-neutral-500">Accepted</dt>
        <dd className="font-medium">
          {policy.accepted.length
            ? policy.accepted.map((m) => (m === "other" && policy.otherDescription ? policy.otherDescription : PAYMENT_METHOD_LABEL[m])).join(", ")
            : <span className="italic text-neutral-500">None confirmed</span>}
        </dd>
        {policy.notAccepted && policy.notAccepted.length > 0 && (
          <>
            <dt className="text-neutral-500">Not accepted</dt>
            <dd className="font-medium">{policy.notAccepted.map((m) => PAYMENT_METHOD_LABEL[m]).join(", ")}</dd>
          </>
        )}
        {unknown.length > 0 && (
          <>
            <dt className="text-neutral-500">Not reported</dt>
            <dd className="text-neutral-500">{unknown.map((m) => PAYMENT_METHOD_LABEL[m]).join(", ")}</dd>
          </>
        )}
        <dt className="text-neutral-500">Reported</dt>
        <dd>
          {policy.reportedAt}
          {policy.attribution.lastVerifiedAt ? ` · verified ${policy.attribution.lastVerifiedAt}` : " · not yet verified"}
        </dd>
      </dl>
      <div className="flex items-start gap-2">
        <ConfidenceBadge level={policy.attribution.confidence} />
      </div>
      {policy.notes && <p className="text-xs text-neutral-600 dark:text-neutral-400">{policy.notes}</p>}
      {policy.attribution.notes && <p className="text-xs text-neutral-500">{policy.attribution.notes}</p>}
    </div>
  );
}
