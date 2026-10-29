import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { SITE_NAME, siteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: `${SITE_NAME} — Compare stadium & event parking`, template: `%s | ${SITE_NAME}` },
  description:
    "Independent parking intelligence for stadiums, arenas and concert venues. Compare official and private lots by price, walking distance, tailgating and exit — with sources and confidence on every fact.",
  applicationName: SITE_NAME,
  openGraph: { siteName: SITE_NAME, type: "website", locale: "en_US" },
  twitter: { card: "summary" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#16834a" },
    { media: "(prefers-color-scheme: dark)", color: "#0b3d24" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-black">
          Skip to content
        </a>
        <header className="sticky top-0 z-30 border-b border-black/5 bg-brand-600 text-white pt-[env(safe-area-inset-top)] dark:border-white/10 dark:bg-brand-900">
          <nav className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4" aria-label="Main">
            <Link href="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
              <span aria-hidden className="grid h-8 w-8 place-items-center rounded-lg bg-white/15 text-sm">LL</span>
              LotLizard
            </Link>
            <div className="flex items-center gap-1 text-sm font-medium">
              <Link href="/venues" className="rounded-lg px-3 py-2 hover:bg-white/10">Venues</Link>
              <Link href="/submit" className="rounded-lg bg-white px-3 py-2 text-brand-700 hover:bg-brand-50">Report</Link>
            </div>
          </nav>
        </header>
        <main id="main" className="flex-1">{children}</main>
        <footer className="border-t border-black/5 bg-white px-4 py-8 pb-[calc(2rem+env(safe-area-inset-bottom))] text-sm text-neutral-600 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-400">
          <div className="mx-auto flex max-w-5xl flex-col gap-3">
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <Link href="/venues" className="hover:underline">Venue directory</Link>
              <Link href="/about/data" className="hover:underline">Data sources &amp; confidence</Link>
              <Link href="/submit" className="hover:underline">Submit parking info</Link>
            </div>
            <p>
              LotLizard is independent and not affiliated with any team, league, venue or parking operator. Information
              may be incomplete or out of date — always check official sources before you go.
            </p>
            <p>© 2026 LotLizard</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
