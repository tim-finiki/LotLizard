import type { Metadata } from "next";
import type { ConfidenceLevel } from "@/lib/types";
import { CONFIDENCE_DESCRIPTION, CONFIDENCE_ORDER } from "@/lib/confidence";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";

export const metadata: Metadata = {
  title: "Data sources, confidence levels & methodology",
  description: "How LotLizard sources, rates and moderates parking data — and why we never present estimates as verified.",
  alternates: { canonical: "/about/data" },
};

export default function DataPage() {
  const levels = [...CONFIDENCE_ORDER].reverse() as ConfidenceLevel[];
  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 text-sm leading-relaxed">
      <h1 className="text-2xl font-extrabold">How LotLizard rates parking data</h1>
      <p>
        Every price, rule and rating on LotLizard has a source and a confidence level. We would rather show
        &ldquo;unknown&rdquo; than guess, and we never label an estimate as verified.
      </p>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">Confidence levels</h2>
        <ul className="flex flex-col gap-2">
          {levels.map((l) => (
            <li key={l} className="flex flex-col gap-1 rounded-xl bg-white p-3 ring-1 ring-black/5 dark:bg-ink-soft dark:ring-white/10">
              <ConfidenceBadge level={l} />
              <span className="text-neutral-600 dark:text-neutral-400">{CONFIDENCE_DESCRIPTION[l]}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-bold">Where data comes from</h2>
        <ul className="list-disc pl-5">
          <li><strong>Official:</strong> team, venue and transit agency publications.</li>
          <li><strong>Operators:</strong> lot owners and parking companies.</li>
          <li><strong>Media:</strong> local news coverage, such as published traffic plans.</li>
          <li><strong>Third party:</strong> parking guides, aggregators and resale listings. These are useful but often dated.</li>
          <li><strong>Community:</strong> moderated reports from fans. One report is low confidence; several consistent recent reports raise it to medium.</li>
          <li><strong>LotLizard estimates:</strong> map pins and derived values, such as walking time, that our team computed. They are always labelled.</li>
        </ul>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-bold">Walking times</h2>
        <p>
          Unless a source gives a walking time, we estimate it from the straight-line distance between the lot pin
          and the stadium. We multiply that by 1.3 to allow for real walking routes, then assume a crowd pace of about
          3 mph. Approximate pins make these estimates rougher, so they are always marked with &ldquo;~&rdquo;.
        </p>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-bold">Rankings</h2>
        <p>
          Personalized rankings weight cost, walking distance, tailgating and exit convenience by your priorities.
          We show three separate numbers: the <strong>match</strong> score, the share of your priorities backed by{" "}
          <strong>data</strong>, and the <strong>confidence</strong> of the weakest evidence used. The match averages
          only what we know, so missing data is neither a plus nor a minus. Lots with less than half the data your
          priorities need aren&apos;t ranked at all. Area-wide price ranges (such as a range for all official lots) are
          shown but don&apos;t count as a lot&apos;s price. Your departure direction only affects rankings when a lot&apos;s
          exit routing is documented by an official or credible media source. Until then we say &ldquo;Exit data not
          yet available&rdquo;. Sponsorships and referral partnerships never change rankings, and sponsored content is
          always labelled.
        </p>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-bold">Parking amenities</h2>
        <p>
          Every lot at every venue is described by the same four amenities: covered parking, EV charging, accessible
          (ADA) parking and on-site restrooms. Each is <em>available</em>, <em>not available</em> or <em>unknown</em>, with
          a source and date. Amenity filters only match confirmed availability. A lot we know nothing about is hidden
          from a filtered view, never shown as a match.
        </p>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-bold">Payment information</h2>
        <p>
          We record <em>how</em> you can pay (cash, card, Venmo, PayPal, Zelle, Apple Pay/Google Pay, other) separately
          from <em>when</em> (pay on arrival, optional reservation, or prepay required). A method is only shown as accepted
          when a source says so. Anything not reported is &ldquo;unknown&rdquo;, never assumed. When you filter by payment,
          lots with unknown payment info are hidden unless you choose to see them, and then they&apos;re labelled
          &ldquo;unconfirmed&rdquo;. A game-day policy replaces a lot&apos;s general policy for that game. Lot owners and
          fans can send updates. Owner claims are checked by a moderator before they appear.
        </p>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-bold">Moderation</h2>
        <p>
          Every community submission goes to a moderation queue. Automated checks flag links, price outliers and
          spam patterns, and a person approves or rejects each one. We never publish reporters&apos; email addresses.
        </p>
      </section>
      <p className="text-neutral-500">
        LotLizard is independent and not affiliated with any team, league, venue or parking operator.
      </p>
    </article>
  );
}
