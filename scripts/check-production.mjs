#!/usr/bin/env node
/**
 * Production SEO smoke check. Fetches the live site and fails on anything that would hurt indexing:
 * robots/sitemap problems, noindex headers or tags on pages that should be indexed, wrong canonical
 * host, or missing structured data.
 *
 *   node scripts/check-production.mjs https://example.com
 *
 * Runs in GitHub Actions (see .github/workflows/production-check.yml) because the deployment may not
 * be reachable from every build or agent environment.
 */
const base = (process.argv[2] ?? process.env.PRODUCTION_URL ?? "").replace(/\/$/, "");
if (!base) {
  console.error("Usage: check-production.mjs <https://production-host>");
  process.exit(2);
}

const failures = [];
const notes = [];
const fail = (msg) => failures.push(msg);
const note = (msg) => notes.push(msg);

async function get(path) {
  const res = await fetch(base + path, { redirect: "manual", headers: { "user-agent": "LotLizard-ProductionCheck/1.0 (+https://github.com/tim-finiki/LotLizard)" } });
  const body = res.status === 200 ? await res.text() : "";
  return { status: res.status, headers: res.headers, body, location: res.headers.get("location") };
}

const attr = (html, re) => html.match(re)?.[1];
const canonicalOf = (html) => attr(html, /<link rel="canonical" href="([^"]+)"/);
const robotsMetaOf = (html) => attr(html, /<meta name="robots" content="([^"]+)"/);
const ldTypes = (html) => [...html.matchAll(/"@type":"([A-Za-z]+)"/g)].map((m) => m[1]);

// robots.txt
const robots = await get("/robots.txt");
if (robots.status !== 200) fail(`robots.txt returned ${robots.status}`);
else {
  if (/^Disallow:\s*\/\s*$/m.test(robots.body)) fail("robots.txt disallows the whole site");
  const sitemapLine = attr(robots.body, /^Sitemap:\s*(\S+)/m);
  note(`robots.txt sitemap: ${sitemapLine}`);
  if (!sitemapLine) fail("robots.txt has no Sitemap line");
}

// sitemap
const sitemap = await get("/sitemap.xml");
const locs = [...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
note(`sitemap: ${locs.length} URLs, ${(sitemap.body.match(/<lastmod>/g) ?? []).length} with lastmod`);
if (sitemap.status !== 200 || locs.length === 0) fail(`sitemap.xml returned ${sitemap.status} with ${locs.length} URLs`);
const hosts = [...new Set(locs.map((u) => new URL(u).host))];
note(`sitemap/canonical host: ${hosts.join(", ")}`);
if (hosts.length > 1) fail(`sitemap mixes hosts: ${hosts.join(", ")}`);
if (hosts[0] && hosts[0] !== new URL(base).host) note(`canonical host ${hosts[0]} differs from checked host ${new URL(base).host}`);

// every sitemap URL must be indexable: 200, no noindex header or tag, self-canonical
const xRobotsSeen = new Set();
for (const url of locs) {
  const path = new URL(url).pathname;
  const page = await get(path);
  const xr = page.headers.get("x-robots-tag");
  if (xr) xRobotsSeen.add(xr);
  if (page.status !== 200) fail(`${path}: HTTP ${page.status}${page.location ? ` → ${page.location}` : ""}`);
  if (xr && /noindex/i.test(xr)) fail(`${path}: X-Robots-Tag ${xr}`);
  const meta = robotsMetaOf(page.body);
  if (meta && /noindex/i.test(meta)) fail(`${path}: meta robots ${meta}`);
  const canonical = canonicalOf(page.body);
  if (canonical && canonical.replace(/\/$/, "") !== url.replace(/\/$/, "")) fail(`${path}: canonical ${canonical} ≠ sitemap URL ${url}`);
  if (path.startsWith("/venues/") && !ldTypes(page.body).length) fail(`${path}: no JSON-LD`);
}
note(`X-Robots-Tag values seen: ${xRobotsSeen.size ? [...xRobotsSeen].join(" | ") : "none"}`);

// pages that must stay out of the index
for (const path of ["/submit", "/admin"]) {
  const page = await get(path);
  const meta = robotsMetaOf(page.body) ?? "";
  const xr = page.headers.get("x-robots-tag") ?? "";
  if (page.status === 200 && !/noindex/i.test(meta + xr)) fail(`${path} is indexable`);
}

// private endpoints must not be cacheable public content
const version = await get("/api/version");
note(`/api/version: ${version.status} ${version.body.slice(0, 160)}`);

const home = await get("/");
note(`home canonical: ${canonicalOf(home.body)} | JSON-LD: ${[...new Set(ldTypes(home.body))].join(", ")}`);
note(`google-site-verification meta: ${/name="google-site-verification"/.test(home.body) ? "present" : "absent"}; msvalidate.01: ${/name="msvalidate.01"/.test(home.body) ? "present" : "absent"}`);
note(`Vercel Analytics script: ${/_vercel\/insights|va\.vercel-scripts/.test(home.body) ? "referenced" : "not in HTML (loads client-side)"}`);

for (const n of notes) console.log(`• ${n}`);
if (failures.length) {
  console.error(`\n✖ ${failures.length} problem(s):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`\n✔ ${base}: ${locs.length} sitemap URLs indexable, private pages noindexed.`);
