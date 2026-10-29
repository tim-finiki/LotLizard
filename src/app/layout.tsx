import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Inter, Sora } from "next/font/google";
import "./globals.css";
import { SITE_NAME, siteUrl } from "@/lib/seo";
import { buildInfo } from "@/lib/build-info";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { AnalyticsEvents } from "@/components/AnalyticsEvents";
import { HeaderLogo, PrimaryLogo } from "@/components/Brand";

// Self-hosted at build time by next/font (SIL Open Font License); no runtime requests to Google.
const sora = Sora({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-sora", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: `${SITE_NAME} — Compare stadium & event parking`, template: `%s | ${SITE_NAME}` },
  description:
    "Independent parking intelligence for stadiums, arenas and concert venues. Compare official and private lots by price, walking distance, tailgating and exit — with sources and confidence on every fact.",
  applicationName: SITE_NAME,
  openGraph: { siteName: SITE_NAME, type: "website", locale: "en_US" },
  twitter: { card: "summary_large_image" },
  other: { "lotlizard-build": buildInfo().commit },
  // Search Console / Bing Webmaster ownership tokens, set per deployment (see .env.example).
  verification: {
    ...(process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : {}),
    ...(process.env.BING_SITE_VERIFICATION ? { other: { "msvalidate.01": process.env.BING_SITE_VERIFICATION } } : {}),
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1412" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`h-full antialiased ${sora.variable} ${inter.variable}`}>
      <body className="flex min-h-full flex-col bg-mist font-sans text-ink dark:bg-ink dark:text-neutral-100">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-black">
          Skip to content
        </a>
        <header className="sticky top-0 z-30 border-b border-line bg-white pt-[env(safe-area-inset-top)] dark:border-white/10 dark:bg-ink">
          <nav className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4" aria-label="Main">
            <Link href="/" aria-label="LotLizard home" className="shrink-0 rounded-lg">
              <HeaderLogo />
            </Link>
            <div className="flex items-center gap-1 text-sm font-medium">
              <Link href="/venues" className="rounded-lg px-2.5 py-2 hover:bg-mist sm:px-3 dark:hover:bg-white/10">Venues</Link>
              <Link href="/about/data" className="hidden rounded-lg px-3 py-2 hover:bg-mist sm:block dark:hover:bg-white/10">How we rate data</Link>
              {/* Hidden only on very narrow (<360px) phones; Report stays in the footer there. */}
              <Link href="/submit" className="rounded-lg bg-lizard px-3 py-2 font-semibold text-ink hover:bg-lizard-strong max-[359px]:hidden">Report</Link>
            </div>
          </nav>
        </header>
        <main id="main" className="flex-1">{children}</main>
        <footer className="bg-ink px-4 py-10 pb-[calc(2.5rem+env(safe-area-inset-bottom))] text-sm text-[#94a3b8]">
          <div className="mx-auto flex max-w-5xl flex-col gap-4">
            <PrimaryLogo className="h-auto w-40" sizes="160px" />
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-neutral-200">
              <Link href="/venues" className="hover:underline">Venue directory</Link>
              <Link href="/about/data" className="hover:underline">Data sources &amp; confidence</Link>
              <Link href="/submit" className="hover:underline">Submit parking info</Link>
            </div>
            <p>
              LotLizard is independent and not affiliated with any team, league, venue or parking operator. Information
              may be incomplete or out of date — always check official sources before you go.
            </p>
            <p className="flex flex-wrap justify-between gap-2">
              <span>© 2026 LotLizard</span>
              <span className="font-mono text-xs text-[#94a3b8]" data-build={buildInfo().commit}>
                Build {buildInfo().commit}
                {buildInfo().environment !== "production" && ` · ${buildInfo().environment}`}
              </span>
            </p>
          </div>
        </footer>
        {/* No-ops until Web Analytics / Speed Insights are enabled for the project in Vercel. */}
        <Analytics />
        <SpeedInsights />
        <AnalyticsEvents />
      </body>
    </html>
  );
}
