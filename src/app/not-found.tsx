import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-20 text-center">
      <h1 className="text-2xl font-extrabold">We couldn&apos;t find that spot</h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">The page may have moved, or we don&apos;t cover this venue yet.</p>
      <Link href="/venues" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white">Browse venues</Link>
    </div>
  );
}
