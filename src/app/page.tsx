import type { Metadata } from "next";
import Link from "next/link";
import { listVenues } from "@/lib/data/repository";
import { siteJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { VenueCard } from "@/components/VenueCard";
import { Mascot } from "@/components/Brand";

export const metadata: Metadata = { alternates: { canonical: "/" } };

const HOW_IT_WORKS = [
  ["Rank by what you care about", "Cheap, close, legendary tailgate or first out of the lot — set your priorities and we re-rank instantly."],
  ["See the source behind every fact", "Official, media, community or estimate — each price and rule carries a confidence badge and a citation."],
  ["Built by fans", "Report what you paid, how long it took to get out, and how the tailgate was. Every report is moderated."],
] as const;

export default async function Home() {
  const venues = await listVenues();
  const pilot = venues.filter((v) => v.coverage === "pilot_detailed");
  const guides = venues.filter((v) => v.coverage === "basic");
  const more = venues.filter((v) => v.coverage === "venue_only").slice(0, 6);
  // "Popular" = venues that actually have parking guides (no invented popularity data).
  const popular = [...pilot, ...guides].slice(0, 5);

  return (
    <div>
      <JsonLd data={siteJsonLd()} />
      <section className="relative overflow-hidden bg-ink px-4 pb-10 pt-9 text-white sm:pb-14 sm:pt-12">
        <div className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)] items-center gap-6 md:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex min-w-0 flex-col gap-5">
            <h1 className="text-[2.1rem] font-extrabold leading-[1.05] tracking-tight min-[400px]:text-4xl sm:text-5xl">
              Find the <span className="text-lizard">best parking</span> for every event.
            </h1>
            <p className="max-w-xl text-base text-neutral-300 sm:text-lg">
              Compare official lots, private lots, garages and shuttles by price, walk, tailgating and exit — with the
              source and confidence behind every number.
            </p>
            <form action="/venues" className="flex max-w-xl gap-2" role="search">
              <label htmlFor="home-search" className="sr-only">Search venues</label>
              <input
                id="home-search"
                name="q"
                type="search"
                placeholder="Stadium, team or city"
                className="h-12 min-w-0 flex-1 rounded-xl border-0 bg-white px-4 text-base text-ink shadow outline-none focus:ring-4 focus:ring-lizard/50"
              />
              <button className="flex h-12 shrink-0 items-center gap-2 rounded-xl bg-lizard px-5 font-semibold text-ink hover:bg-lizard-strong">
                <svg aria-hidden viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <circle cx="8.5" cy="8.5" r="5.5" />
                  <path d="m13 13 4 4" />
                </svg>
                Search
              </button>
            </form>
            {popular.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-semibold text-neutral-300">Popular:</span>
                {popular.map((v) => (
                  <Link
                    key={v.id}
                    href={`/venues/${v.slug}`}
                    className="rounded-full px-3 py-1.5 text-neutral-100 ring-1 ring-white/25 hover:bg-white/10 hover:ring-lizard"
                  >
                    {v.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <Mascot className="hidden h-auto w-full max-w-[320px] justify-self-end md:block" sizes="320px" />
        </div>
      </section>

      <div className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-8">
        <section aria-labelledby="pilot-heading" className="flex flex-col gap-3">
          <h2 id="pilot-heading" className="text-xl font-bold">Pilot venue</h2>
          {pilot.map((v) => (
            <Link
              key={v.id}
              href={`/venues/${v.slug}`}
              className="group flex flex-col gap-2 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-line transition hover:ring-lizard dark:bg-ink-soft dark:ring-white/10"
            >
              <span className="text-xs font-semibold uppercase tracking-wide text-forest dark:text-brand-100">Buffalo Bills · Orchard Park, NY</span>
              <span className="font-display text-2xl font-extrabold">{v.name} parking guide</span>
              <span className="text-sm text-neutral-600 dark:text-neutral-400">{v.summary}</span>
              <span className="mt-1 inline-flex w-fit rounded-lg bg-lizard px-4 py-2 text-sm font-semibold text-ink group-hover:bg-lizard-strong">Compare lots →</span>
            </Link>
          ))}
        </section>

        {guides.length > 0 && (
          <section aria-labelledby="guides-heading" className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between">
              <h2 id="guides-heading" className="text-xl font-bold">More parking guides</h2>
              <Link href="/venues" className="text-sm font-semibold text-forest dark:text-brand-100">All venues →</Link>
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
          {HOW_IT_WORKS.map(([t, d], i) => (
            <div key={t} className="flex gap-3 rounded-2xl bg-white p-4 ring-1 ring-line dark:bg-ink-soft dark:ring-white/10">
              <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-lizard font-display text-sm font-extrabold text-ink">
                {i + 1}
              </span>
              <div>
                <h3 className="font-bold">{t}</h3>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{d}</p>
              </div>
            </div>
          ))}
        </section>

        <section aria-labelledby="more-heading" className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 id="more-heading" className="text-xl font-bold">Coming to more venues</h2>
            <Link href="/venues" className="text-sm font-semibold text-forest dark:text-brand-100">All venues →</Link>
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
