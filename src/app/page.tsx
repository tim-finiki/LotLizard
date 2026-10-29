import type { Metadata } from "next";
import Link from "next/link";
import { listVenues } from "@/lib/data/repository";
import { siteJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { VenueCard } from "@/components/VenueCard";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function Home() {
  const venues = await listVenues();
  const pilot = venues.filter((v) => v.coverage === "pilot_detailed");
  const guides = venues.filter((v) => v.coverage === "basic");
  const more = venues.filter((v) => v.coverage === "venue_only").slice(0, 6);

  return (
    <div>
      <JsonLd data={siteJsonLd()} />
      <section className="bg-brand-600 px-4 pb-10 pt-8 text-white dark:bg-brand-900">
        <div className="mx-auto flex max-w-5xl flex-col gap-4">
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Park smarter on event day.
          </h1>
          <p className="max-w-xl text-base text-white/90 sm:text-lg">
            Compare official lots, private lots, garages and shuttles by price, walk, tailgating and exit — with the
            source and confidence behind every number.
          </p>
          <form action="/venues" className="flex gap-2" role="search">
            <label htmlFor="home-search" className="sr-only">Search venues</label>
            <input
              id="home-search"
              name="q"
              type="search"
              placeholder="Stadium, team or city"
              className="h-12 min-w-0 flex-1 rounded-xl border-0 bg-white px-4 text-base text-neutral-900 shadow outline-none focus:ring-4 focus:ring-white/40"
            />
            <button className="h-12 shrink-0 rounded-xl bg-neutral-900 px-5 font-semibold text-white">Search</button>
          </form>
        </div>
      </section>

      <div className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-8">
        <section aria-labelledby="pilot-heading" className="flex flex-col gap-3">
          <h2 id="pilot-heading" className="text-xl font-bold">Pilot venue</h2>
          {pilot.map((v) => (
            <Link
              key={v.id}
              href={`/venues/${v.slug}`}
              className="flex flex-col gap-2 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10"
            >
              <span className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-100">Buffalo Bills · Orchard Park, NY</span>
              <span className="text-2xl font-extrabold">{v.name} parking guide</span>
              <span className="text-sm text-neutral-600 dark:text-neutral-400">{v.summary}</span>
              <span className="mt-1 inline-flex w-fit rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white">Compare lots →</span>
            </Link>
          ))}
        </section>

        {guides.length > 0 && (
          <section aria-labelledby="guides-heading" className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between">
              <h2 id="guides-heading" className="text-xl font-bold">More parking guides</h2>
              <Link href="/venues" className="text-sm font-semibold text-brand-700 dark:text-brand-100">All venues →</Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {guides.map((v) => (
                <VenueCard key={v.id} venue={v} />
              ))}
            </div>
          </section>
        )}

        <section aria-labelledby="how-heading" className="grid gap-3 sm:grid-cols-3">
          <h2 id="how-heading" className="sr-only">How LotLizard works</h2>
          {[
            ["Rank by what you care about", "Cheap, close, legendary tailgate or first out of the lot — set your priorities and we re-rank instantly."],
            ["See the source behind every fact", "Official, media, community or estimate — each price and rule carries a confidence badge and a citation."],
            ["Built by fans", "Report what you paid, how long it took to get out, and how the tailgate was. Every report is moderated."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-2xl bg-white p-4 ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10">
              <h3 className="font-bold">{t}</h3>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{d}</p>
            </div>
          ))}
        </section>

        <section aria-labelledby="more-heading" className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 id="more-heading" className="text-xl font-bold">Coming to more venues</h2>
            <Link href="/venues" className="text-sm font-semibold text-brand-700 dark:text-brand-100">All venues →</Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {more.map((v) => (
              <VenueCard key={v.id} venue={v} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
