import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-20 text-center">
      <h1 className="text-2xl font-extrabold">We couldn&apos;t find that spot</h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">The page may have moved, or we don&apos;t cover this venue yet.</p>
      <Link href="/venues" className="flex h-11 items-center rounded-lg bg-lizard px-4 text-sm font-semibold text-ink hover:bg-lizard-strong">Browse venues</Link>
    </div>
  );
}
