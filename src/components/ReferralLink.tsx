import type { BookingLink } from "@/lib/types";

/** Outbound booking link. Affiliate links are disclosed and marked rel="sponsored". */
export function ReferralLink({ booking, className = "" }: { booking: BookingLink; className?: string }) {
  return (
    <span className="inline-flex flex-col">
      <a
        href={booking.url}
        target="_blank"
        rel={booking.isAffiliate ? "sponsored noopener" : "noopener noreferrer"}
        className={`inline-flex h-10 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 ${className}`}
      >
        Reserve on {booking.partner}
      </a>
      {booking.isAffiliate && <span className="mt-1 text-[11px] text-neutral-500">LotLizard may earn a referral fee. Rankings are never affected.</span>}
    </span>
  );
}
