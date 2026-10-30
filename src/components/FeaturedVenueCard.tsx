import Link from "next/link";
import type { ParkingFacility, Venue, VenueEvent } from "@/lib/types";
import { venueHighlights, type VenueProfile } from "@/lib/featured";
import { venuePath } from "@/lib/seo";

/** A featured pilot venue on the homepage: event types, what to compare there and data-backed highlights. */
export function FeaturedVenueCard({
  venue,
  profile,
  facilities,
  events,
}: {
  venue: Venue;
  profile: VenueProfile;
  facilities: ParkingFacility[];
  events: VenueEvent[];
}) {
  const highlights = venueHighlights(profile, venue, facilities, events);
  return (
    <Link
      href={venuePath(venue)}
      className="group flex h-full flex-col gap-3 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-line transition hover:ring-lizard dark:bg-ink-soft dark:ring-white/10"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {profile.eventTypes.map((t) => (
          <span key={t} className="rounded-full bg-ink px-2.5 py-0.5 text-xs font-bold text-lizard dark:bg-ink dark:ring-1 dark:ring-white/15">
            {t}
          </span>
        ))}
        <span className="text-xs font-semibold uppercase tracking-wide text-forest dark:text-brand-100">
          {venue.teams[0] ? `${venue.teams[0]} · ` : ""}
          {venue.address.city}, {venue.address.state}
        </span>
      </div>
      <div>
        <h3 className="font-display text-2xl font-extrabold leading-tight">{venue.name}</h3>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{profile.tagline}</p>
      </div>
      <ul className="flex flex-col gap-1.5 text-sm">
        {highlights.map((h) => (
          <li key={h} className="flex items-start gap-2">
            <span aria-hidden className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-lizard" />
            {h}
          </li>
        ))}
      </ul>
      <span className="mt-auto inline-flex w-fit rounded-lg bg-lizard px-4 py-2 text-sm font-semibold text-ink group-hover:bg-lizard-strong">
        Compare parking →
      </span>
    </Link>
  );
}
