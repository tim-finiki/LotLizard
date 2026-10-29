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
            <li key={l} className="flex flex-col gap-1 rounded-xl bg-white p-3 ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10">
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
          When we have no data for a factor, it scores neutral and lowers the &ldquo;data&rdquo; meter shown with
          each score. Sponsorships and referral partnerships never change rankings, and sponsored content is
          always labelled.
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
