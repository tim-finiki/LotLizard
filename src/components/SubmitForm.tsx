"use client";

import { useEffect, useState } from "react";
import { SUBMISSION_KINDS, type SubmissionKind } from "@/lib/submissions/schema";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABEL, PAYMENT_TIMINGS, PAYMENT_TIMING_LABEL } from "@/lib/payment";

export interface VenueOption {
  slug: string;
  name: string;
  lots: { slug: string; name: string }[];
  events: { id: string; label: string }[];
}

const KIND_LABEL: Record<SubmissionKind, string> = {
  price: "Price I paid",
  payment: "Payment info",
  review: "Lot review",
  exit_time: "Time to get out",
  lot_info: "New lot",
  correction: "Correction",
};

const NEEDS_LOT: SubmissionKind[] = ["price", "review", "payment", "exit_time"];

const inputCls =
  "h-12 w-full rounded-xl border border-black/10 bg-white px-3 text-base outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-white/15 dark:bg-ink-soft";

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {label}
      {children}
      {hint && <span className="text-xs font-normal text-neutral-500">{hint}</span>}
    </label>
  );
}

export function SubmitForm({ venues }: { venues: VenueOption[] }) {
  const [kind, setKind] = useState<SubmissionKind>("price");
  const [venueSlug, setVenueSlug] = useState(venues[0]?.slug ?? "");
  const [lotSlug, setLotSlug] = useState("");
  const [state, setState] = useState<{ status: "idle" | "sending" | "done" | "error"; message?: string }>({ status: "idle" });
  // Set after mount so prerendered HTML doesn't bake in the build date.
  const [today, setToday] = useState<string>();

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const k = q.get("kind") as SubmissionKind | null;
    const v = q.get("venue");
    const l = q.get("lot");
    /* eslint-disable react-hooks/set-state-in-effect -- one-time prefill from URL */
    if (k && SUBMISSION_KINDS.includes(k)) setKind(k);
    if (v && venues.some((x) => x.slug === v)) setVenueSlug(v);
    if (l) setLotSlug(l);
    setToday(new Date().toISOString().slice(0, 10));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [venues]);

  const venue = venues.find((v) => v.slug === venueSlug);
  const lots = venue?.lots ?? [];
  const needsLot = NEEDS_LOT.includes(kind);
  const lotUnavailable = needsLot && lots.length === 0;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const str = (k: string) => {
      const v = fd.get(k);
      return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
    };
    const num = (k: string) => (str(k) !== undefined ? Number(str(k)) : undefined);
    const payload: Record<string, unknown> = {
      kind,
      venueSlug,
      facilitySlug: lotSlug || undefined,
      displayName: str("displayName"),
      email: str("email"),
      website: str("website"),
    };
    if (kind === "price") Object.assign(payload, { amount: num("amount"), vehicle: str("vehicle"), eventDate: str("eventDate"), notes: str("notes") });
    if (kind === "review") Object.assign(payload, { rating: num("rating"), tailgateRating: num("tailgateRating"), exitRating: num("exitRating"), body: str("body") });
    if (kind === "exit_time") Object.assign(payload, { minutes: num("minutes"), eventDate: str("eventDate"), notes: str("notes") });
    if (kind === "lot_info") Object.assign(payload, { lotName: str("lotName"), address: str("address"), body: str("body") });
    if (kind === "correction") Object.assign(payload, { body: str("body") });
    if (kind === "payment") {
      const methods = (k: string) => fd.getAll(k).filter((v): v is string => typeof v === "string");
      Object.assign(payload, {
        role: str("role") ?? "community",
        accepted: methods("accepted"),
        notAccepted: methods("notAccepted"),
        otherDescription: str("otherDescription"),
        timing: str("timing") ?? "unknown",
        eventId: str("eventId"),
        observedDate: str("observedDate"),
        notes: str("notes"),
      });
    }

    setState({ status: "sending" });
    try {
      const res = await fetch("/api/submissions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const issue = json.issues?.[0];
        setState({ status: "error", message: issue ? `${issue.path || "Form"}: ${issue.message}` : (json.message ?? json.error ?? "Something went wrong.") });
        return;
      }
      setState({ status: "done" });
    } catch {
      setState({ status: "error", message: "Network error — please try again." });
    }
  }

  if (state.status === "done") {
    return (
      <div className="rounded-2xl bg-brand-50 p-5 text-sm dark:bg-brand-900/40" role="status">
        <p className="text-lg font-bold">Thanks! 🦎</p>
        <p className="mt-1">Your report is in the moderation queue. Once approved it will appear as a community report.</p>
        <button type="button" onClick={() => setState({ status: "idle" })} className="mt-3 font-semibold text-brand-700 underline dark:text-brand-100">
          Submit another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate={false}>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">What are you reporting?</legend>
        <div className="flex flex-wrap gap-2">
          {SUBMISSION_KINDS.map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
              className={`h-10 rounded-full px-4 text-sm font-medium ring-1 ${kind === k ? "bg-brand-600 text-ink ring-brand-600" : "bg-white ring-black/10 dark:bg-ink-soft dark:ring-white/15"}`}
            >
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>
      </fieldset>

      <Field label="Venue">
        <select value={venueSlug} onChange={(e) => { setVenueSlug(e.target.value); setLotSlug(""); }} className={inputCls} required>
          {venues.map((v) => (
            <option key={v.slug} value={v.slug}>{v.name}</option>
          ))}
        </select>
      </Field>

      {lots.length > 0 && (
        <Field label={needsLot ? "Lot" : "Lot (optional)"}>
          <select value={lotSlug} onChange={(e) => setLotSlug(e.target.value)} className={inputCls} required={needsLot}>
            <option value="">{needsLot ? "Choose a lot" : "Not about a specific lot"}</option>
            {lots.map((l) => (
              <option key={l.slug} value={l.slug}>{l.name}</option>
            ))}
          </select>
        </Field>
      )}
      {lotUnavailable && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">
          We don&apos;t list lots for this venue yet. Use <strong>New lot</strong> to tell us about one.
        </p>
      )}

      {kind === "price" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount paid (USD)">
              <input name="amount" type="number" inputMode="numeric" min={0} max={2000} required className={inputCls} />
            </Field>
            <Field label="Vehicle">
              <select name="vehicle" defaultValue="car" className={inputCls}>
                <option value="car">Car / SUV</option>
                <option value="rv">RV</option>
                <option value="bus">Bus</option>
                <option value="limo">Limo</option>
                <option value="motorcycle">Motorcycle</option>
              </select>
            </Field>
          </div>
          <Field label="Event date">
            <input key={today} name="eventDate" type="date" max={today} defaultValue={today} required className={inputCls} />
          </Field>
          <Field label="Notes (optional)" hint="Cash only? Pre-paid? Price changed closer to kickoff?">
            <textarea name="notes" maxLength={500} rows={3} className={`${inputCls} h-auto py-2`} />
          </Field>
        </>
      )}

      {kind === "review" && (
        <>
          <div className="grid grid-cols-3 gap-3">
            {[
              ["rating", "Overall", true],
              ["tailgateRating", "Tailgate", false],
              ["exitRating", "Exit", false],
            ].map(([name, label, req]) => (
              <Field key={name as string} label={label as string}>
                <select name={name as string} required={req as boolean} defaultValue={req ? "5" : ""} className={inputCls}>
                  {!req && <option value="">—</option>}
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>{n}★</option>
                  ))}
                </select>
              </Field>
            ))}
          </div>
          <Field label="Your review" hint="At least 20 characters. No links, please.">
            <textarea name="body" minLength={20} maxLength={2000} rows={5} required className={`${inputCls} h-auto py-2`} />
          </Field>
        </>
      )}

      {kind === "exit_time" && (
        <>
          <Field label="Minutes from leaving your seat to reaching the highway">
            <input name="minutes" type="number" inputMode="numeric" min={1} max={300} required className={inputCls} />
          </Field>
          <Field label="Event date">
            <input key={today} name="eventDate" type="date" max={today} defaultValue={today} required className={inputCls} />
          </Field>
          <Field label="Notes (optional)" hint="Which way did you go? Did you wait for traffic to clear?">
            <textarea name="notes" maxLength={500} rows={3} className={`${inputCls} h-auto py-2`} />
          </Field>
        </>
      )}

      {kind === "lot_info" && (
        <>
          <Field label="Lot name">
            <input name="lotName" required minLength={2} maxLength={120} className={inputCls} />
          </Field>
          <Field label="Address or cross streets (optional)">
            <input name="address" maxLength={200} className={inputCls} />
          </Field>
          <Field label="What should fans know?" hint="Price, payment, tailgating, walk, exit…">
            <textarea name="body" minLength={10} maxLength={2000} rows={5} required className={`${inputCls} h-auto py-2`} />
          </Field>
        </>
      )}

      {kind === "payment" && (
        <>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">I am</legend>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="radio" name="role" value="community" defaultChecked className="h-5 w-5 accent-brand-600" /> A fan who parked here
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="role" value="lot_owner" className="h-5 w-5 accent-brand-600" /> The lot owner / operator
              </label>
            </div>
            <span className="text-xs text-neutral-500">Owner reports are verified by a moderator before they&apos;re published.</span>
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Accepted payment methods</legend>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {PAYMENT_METHODS.map((m) => (
                <label key={m} className="flex min-h-11 items-center gap-2 rounded-xl bg-white px-3 ring-1 ring-black/10 dark:bg-ink-soft dark:ring-white/15">
                  <input type="checkbox" name="accepted" value={m} className="h-5 w-5 accent-brand-600" />
                  {PAYMENT_METHOD_LABEL[m]}
                </label>
              ))}
            </div>
            <span className="mt-1 block text-xs text-neutral-500">Only tick what you saw or used. Leave the rest blank if you don&apos;t know.</span>
          </fieldset>
          <details className="text-sm">
            <summary className="cursor-pointer font-medium">Methods they definitely don&apos;t accept (optional)</summary>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map((m) => (
                <label key={m} className="flex min-h-11 items-center gap-2 rounded-xl bg-white px-3 ring-1 ring-black/10 dark:bg-ink-soft dark:ring-white/15">
                  <input type="checkbox" name="notAccepted" value={m} className="h-5 w-5 accent-brand-600" />
                  {PAYMENT_METHOD_LABEL[m]}
                </label>
              ))}
            </div>
          </details>
          <Field label="Other method (optional)" hint="e.g. Cash App, a parking app">
            <input name="otherDescription" maxLength={100} className={inputCls} />
          </Field>
          <Field label="When do you pay?">
            <select name="timing" defaultValue="unknown" className={inputCls}>
              <option value="unknown">Not sure</option>
              {PAYMENT_TIMINGS.map((t) => (
                <option key={t} value={t}>{PAYMENT_TIMING_LABEL[t]}</option>
              ))}
            </select>
          </Field>
          {venue && venue.events.length > 0 && (
            <Field label="Applies to" hint="Pick a game if the policy was different that day (e.g. cash only for a playoff game).">
              <select name="eventId" defaultValue="" className={inputCls}>
                <option value="">This lot in general</option>
                {venue.events.map((e) => (
                  <option key={e.id} value={e.id}>Only {e.label}</option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Date you saw this">
            <input key={today} name="observedDate" type="date" max={today} defaultValue={today} required className={inputCls} />
          </Field>
          <Field label="Notes (optional)" hint="Card minimum? Cash only after kickoff? Venmo handle posted at the gate?">
            <textarea name="notes" maxLength={500} rows={3} className={`${inputCls} h-auto py-2`} />
          </Field>
        </>
      )}

      {kind === "correction" && (
        <Field label="What's wrong, and how do you know?" hint="Links to official sources help us verify faster.">
          <textarea name="body" minLength={10} maxLength={2000} rows={5} required className={`${inputCls} h-auto py-2`} />
        </Field>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Display name (optional)">
          <input name="displayName" maxLength={40} autoComplete="nickname" className={inputCls} />
        </Field>
        <Field label="Email (optional, never shown)" hint="Only used if a moderator has a question.">
          <input name="email" type="email" maxLength={200} autoComplete="email" className={inputCls} />
        </Field>
      </div>

      {/* Honeypot */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {state.status === "error" && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">{state.message}</p>
      )}

      <button
        type="submit"
        disabled={state.status === "sending" || lotUnavailable}
        className="h-12 rounded-xl bg-brand-600 text-base font-semibold text-ink disabled:opacity-50"
      >
        {state.status === "sending" ? "Sending…" : "Submit for review"}
      </button>
    </form>
  );
}
