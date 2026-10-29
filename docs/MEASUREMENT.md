# Measurement and search-engine setup

What is already in the code, and the owner steps that need account access.

## In the code

| Piece | Where | Behavior |
|---|---|---|
| Vercel Web Analytics | `<Analytics />` in `src/app/layout.tsx` | Page views, referrers, countries, devices. No cookies, no consent banner needed. Inactive until enabled for the project in Vercel. |
| Vercel Speed Insights | `<SpeedInsights />` | Real-user Core Web Vitals (LCP, INP, CLS) per route. Inactive until enabled. |
| Conversion events | `src/components/AnalyticsEvents.tsx`, `src/lib/analytics.ts` | `Directions` (`provider`: google/apple), `Outbound click` (`host`). The main LotLizard conversion is a directions click. |
| AI referrals | same | `AI referral` (`source`: ChatGPT, Perplexity, Gemini, Copilot, Claude…) from the referrer, or from `utm_source` (ChatGPT adds `utm_source=chatgpt.com`). |
| Google / Bing verification | `metadata.verification` in `src/app/layout.tsx` | Meta tags from `GOOGLE_SITE_VERIFICATION` and `BING_SITE_VERIFICATION`. |
| Production SEO check | `scripts/check-production.mjs`, `.github/workflows/production-check.yml` | Daily and after each push to `main`: robots.txt, sitemap, every sitemap URL is 200 / not noindexed / self-canonical, private pages noindexed, JSON-LD present. |

Custom events (`track()`) are recorded only on Vercel plans that include them. Page views and referrers work on every plan.

## Owner steps

1. **Choose the canonical domain.**
   - If you keep `lotlizard.vercel.app`, nothing to do.
   - For a custom domain, add it in Vercel → Project → Domains, set it as the production domain, and redirect the `vercel.app` alias to it.
   - Then set `NEXT_PUBLIC_SITE_URL=https://<domain>` (Production) and the GitHub repository variable `PRODUCTION_URL`.
2. **Vercel:** Project → Analytics → Enable, and Project → Speed Insights → Enable. Redeploy.
3. **Google Search Console:**
   - Add a URL-prefix property for the canonical URL.
   - Choose "HTML tag" verification and copy the `content` value into the Vercel env var `GOOGLE_SITE_VERIFICATION` (Production). Redeploy, then click Verify.
   - Submit `https://<domain>/sitemap.xml`.
   - A Domain property, which verifies by DNS TXT, also works if the domain is custom.
4. **Bing Webmaster Tools:**
   - Either "Import from Google Search Console", or add the site with the meta-tag method: copy the `msvalidate.01` value into `BING_SITE_VERIFICATION`.
   - Submit the sitemap. Bing's index also feeds Copilot and ChatGPT search.
5. **GitHub:** Actions must be enabled for the production check. Its first run happens on the PR that adds it.

## What to watch

- **Search Console:** indexed pages vs. the sitemap (expected count in `docs/SEO_AUDIT.md`), queries and CTR for `<venue> parking`, Core Web Vitals.
- **Vercel Analytics:**
  - referrers, with `chatgpt.com`, `perplexity.ai`, `gemini.google.com` and `copilot.microsoft.com` as AI search;
  - `AI referral` and `Directions` events;
  - top pages.
- **Conversion rate:** `Directions` events per venue or lot page view.
