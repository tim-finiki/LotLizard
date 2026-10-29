"use client";

import { useState } from "react";

/**
 * Shares the lot's permanent page (/venues/<venue>/parking/<lot>). Uses the phone's share sheet when
 * there is one, otherwise copies the link; if neither works, shows the link to copy by hand.
 */
export function ShareLotButton({ path, title, className = "" }: { path: string; title: string; className?: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "manual">("idle");
  const [url, setUrl] = useState(path);

  async function share() {
    const full = new URL(path, window.location.origin).toString();
    setUrl(full);
    if (navigator.share) {
      try {
        await navigator.share({ title, url: full });
        return;
      } catch (e) {
        // The person closed the share sheet: nothing to do.
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(full);
      setStatus("copied");
      setTimeout(() => setStatus("idle"), 2500);
    } catch {
      setStatus("manual");
    }
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={share}
        className={`flex h-9 items-center gap-1.5 rounded-lg bg-neutral-100 px-3 text-xs font-semibold dark:bg-neutral-800 ${className}`}
      >
        <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 3v10M6 7l4-4 4 4M4 11v5h12v-5" />
        </svg>
        Share lot
      </button>
      <span role="status" className="text-[11px] text-neutral-500 empty:hidden">
        {status === "copied" ? "Link copied" : ""}
      </span>
      {status === "manual" && (
        <input readOnly value={url} aria-label="Lot link" onFocus={(e) => e.currentTarget.select()} className="h-8 rounded border border-black/10 px-2 text-xs dark:border-white/15 dark:bg-neutral-800" />
      )}
    </span>
  );
}
