"use client";

import { useCallback, useEffect, useState } from "react";
import type { Submission, SubmissionStatus } from "@/lib/submissions/schema";

const TOKEN_KEY = "lotlizard:admin-token";

export function ModerationQueue() {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<SubmissionStatus>("pending");
  const [items, setItems] = useState<Submission[]>([]);
  const [store, setStore] = useState<{ kind: string; durable: boolean }>();
  const [error, setError] = useState<string>();
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(TOKEN_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore session token once
      if (saved) setToken(saved);
    } catch {
      // ignore
    }
  }, []);

  const load = useCallback(async () => {
    if (!token) return;
    setError(undefined);
    const res = await fetch(`/api/admin/submissions?status=${status}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      setError(res.status === 401 ? "Invalid token (or ADMIN_TOKEN is not configured)." : `Error ${res.status}`);
      setItems([]);
      return;
    }
    const json = await res.json();
    setItems(json.submissions);
    setStore(json.store);
    try {
      sessionStorage.setItem(TOKEN_KEY, token);
    } catch {
      // ignore
    }
  }, [token, status]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on filter change
    void load();
  }, [load]);

  async function decide(id: string, decision: "approved" | "rejected") {
    const res = await fetch(`/api/admin/submissions/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status: decision, note: notes[id] || undefined }),
    });
    if (!res.ok) {
      setError(`Could not update (${res.status})`);
      return;
    }
    setItems((xs) => xs.filter((x) => x.id !== id));
  }

  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
      >
        <input
          type="password"
          placeholder="Admin token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="h-11 min-w-0 flex-1 rounded-lg border border-black/10 bg-white px-3 dark:border-white/15 dark:bg-neutral-900"
          autoComplete="current-password"
        />
        <button className="h-11 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white">Load</button>
      </form>

      <div className="flex gap-2" role="tablist">
        {(["pending", "approved", "rejected"] as const).map((s) => (
          <button
            key={s}
            role="tab"
            aria-selected={status === s}
            onClick={() => setStatus(s)}
            className={`h-9 rounded-full px-3 text-sm capitalize ${status === s ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "bg-white ring-1 ring-black/10 dark:bg-neutral-900"}`}
          >
            {s}
          </button>
        ))}
      </div>

      {store && !store.durable && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">
          Using the in-memory store: submissions are lost on restart or redeploy. Set UPSTASH_REDIS_REST_URL and
          UPSTASH_REDIS_REST_TOKEN for persistence.
        </p>
      )}
      {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}

      {items.length === 0 && token && !error && <p className="text-sm text-neutral-500">Nothing here.</p>}

      <ul className="flex flex-col gap-3">
        {items.map((s) => {
           
          const { kind, venueSlug, facilitySlug, displayName, email, ...rest } = s.input;
          return (
            <li key={s.id} className="rounded-2xl bg-white p-4 text-sm ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-neutral-900 px-1.5 py-0.5 text-xs font-semibold uppercase text-white dark:bg-white dark:text-neutral-900">{kind}</span>
                <span className="font-semibold">{venueSlug}{facilitySlug && ` / ${facilitySlug}`}</span>
                <span className="text-xs text-neutral-500">{new Date(s.createdAt).toLocaleString()}</span>
              </div>
              {s.flags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {s.flags.map((f) => (
                    <span key={f} className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/40 dark:text-red-200">{f}</span>
                  ))}
                </div>
              )}
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg bg-neutral-50 p-2 text-xs dark:bg-neutral-950">{JSON.stringify(rest, null, 2)}</pre>
              <p className="mt-1 text-xs text-neutral-500">
                By {displayName || "anonymous"}
                {email && ` · ${email}`}
              </p>
              {s.moderationNote && <p className="mt-1 text-xs">Note: {s.moderationNote}</p>}
              {status === "pending" && (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    placeholder="Moderator note (optional)"
                    value={notes[s.id] ?? ""}
                    onChange={(e) => setNotes((n) => ({ ...n, [s.id]: e.target.value }))}
                    className="h-10 flex-1 rounded-lg border border-black/10 bg-white px-3 dark:border-white/15 dark:bg-neutral-950"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => decide(s.id, "approved")} className="h-10 flex-1 rounded-lg bg-brand-600 px-4 font-semibold text-white">Approve</button>
                    <button onClick={() => decide(s.id, "rejected")} className="h-10 flex-1 rounded-lg bg-red-600 px-4 font-semibold text-white">Reject</button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
