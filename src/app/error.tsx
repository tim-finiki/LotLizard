"use client";

import Link from "next/link";
import { useEffect } from "react";

/** Branded error state for unexpected failures inside a page. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-20 text-center">
      <h1 className="text-2xl font-extrabold">Something went wrong</h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        This page didn&apos;t load properly. Your parking info is safe — try again, or browse venues instead.
      </p>
      <div className="flex gap-2">
        <button onClick={reset} className="h-11 rounded-lg bg-lizard px-4 text-sm font-semibold text-ink hover:bg-lizard-strong">
          Try again
        </button>
        <Link href="/venues" className="flex h-11 items-center rounded-lg px-4 text-sm font-semibold text-forest ring-1 ring-line hover:bg-white dark:text-brand-100">
          Browse venues
        </Link>
      </div>
    </div>
  );
}
