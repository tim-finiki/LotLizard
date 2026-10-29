#!/usr/bin/env node
/**
 * Mobile smoke test for a deployed preview: homepage → search → venue parking map (real map tiles) →
 * parking filters → lot name search → lot details, on an emulated iPhone. Saves a screenshot of
 * each step.
 *
 *   node scripts/preview-smoke.mjs <https://deployment-url> [out-dir]
 *
 * A deployment behind Vercel Authentication needs either VERCEL_SHARE_TOKEN (the `_vercel_share` value
 * from a shareable link) or VERCEL_AUTOMATION_BYPASS_SECRET (the project's "Protection Bypass for
 * Automation" secret). Both are sent only to the deployment's own host and never printed.
 * Runs in GitHub Actions (see .github/workflows/preview-smoke.yml) because *.vercel.app and the tile
 * server may not be reachable from every build or agent environment.
 */
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";

const { chromium, devices } = createRequire(import.meta.url)("playwright");

const base = (process.argv[2] ?? "").replace(/\/$/, "");
const out = process.argv[3] ?? "preview-smoke";
if (!base) {
  console.error("Usage: preview-smoke.mjs <https://deployment-url> [out-dir]");
  process.exit(2);
}
mkdirSync(out, { recursive: true });

const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const shareToken = process.env.VERCEL_SHARE_TOKEN;
const browser = await chromium.launch();
// Clipboard access lets the test read the link "Share lot" copies (headless Chromium has no share sheet).
const context = await browser.newContext({ ...devices["iPhone 13"], permissions: ["clipboard-read", "clipboard-write"] });
const host = new URL(base).host;
// The bypass header goes to the deployment only, never to the tile server or other third parties.
if (bypass) {
  await context.route(
    (url) => url.host === host,
    (route) => route.continue({ headers: { ...route.request().headers(), "x-vercel-protection-bypass": bypass, "x-vercel-set-bypass-cookie": "true" } }),
  );
}
const page = await context.newPage();
// A shareable link sets an access cookie for this deployment on first visit.
if (shareToken) await page.goto(`${base}/?_vercel_share=${encodeURIComponent(shareToken)}`, { waitUntil: "domcontentloaded" });

const tiles = { ok: 0, failed: [] };
page.on("response", (res) => {
  if (!/\/\d+\/\d+\/\d+\.png/.test(res.url()) || !res.url().includes("tile")) return;
  if (res.ok()) tiles.ok++;
  else tiles.failed.push(`${res.status()} ${res.url()}`);
});
page.on("requestfailed", (req) => {
  // Requests cancelled by navigating away aren't failures.
  const error = req.failure()?.errorText ?? "";
  if (req.resourceType() === "image" && req.url().includes("tile") && !error.includes("ERR_ABORTED")) tiles.failed.push(`${error} ${req.url()}`);
});
const consoleErrors = [];
page.on("console", (m) => m.type() === "error" && !m.text().includes("/_vercel/") && consoleErrors.push(m.text()));

const steps = [];
async function step(name, fn) {
  try {
    await fn();
    steps.push(`PASS ${name}`);
  } catch (e) {
    steps.push(`FAIL ${name}: ${e.message.split("\n")[0]}`);
    throw e;
  } finally {
    await page.screenshot({ path: `${out}/${steps.length}-${name.replace(/\W+/g, "-")}.png`, fullPage: false }).catch(() => {});
  }
}

let ok = true;
try {
  await step("homepage", async () => {
    const res = await page.goto(base + "/", { waitUntil: "domcontentloaded" });
    if (!res || res.status() !== 200 || !page.url().startsWith(base)) {
      const at = new URL(page.url());
      // Origin and path only: query strings can carry access tokens and logs may be public.
      throw new Error(`got ${res?.status()} at ${at.origin}${at.pathname} — the deployment is protected (Vercel Authentication) or down`);
    }
    await page.getByRole("heading", { level: 1 }).waitFor();
    await page.locator('img[alt="LotLizard"]').first().waitFor();
  });
  await step("search", async () => {
    await page.fill("#home-search", "Highmark");
    await Promise.all([page.waitForURL(/\/venues\?q=/), page.getByRole("button", { name: "Search" }).click()]);
    await page.locator('a[href="/venues/highmark-stadium"]').first().waitFor();
  });
  await step("parking map", async () => {
    await Promise.all([page.waitForURL(/\/venues\/highmark-stadium$/), page.locator('a[href="/venues/highmark-stadium"]').first().click()]);
    const map = page.locator(".leaflet-container").first();
    await map.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelectorAll("img.leaflet-tile-loaded").length >= 4, null, { timeout: 30_000 });
    if (tiles.failed.length) throw new Error(`tile errors: ${tiles.failed.slice(0, 3).join(", ")}`);
    if ((await page.locator(".leaflet-marker-icon").count()) === 0) throw new Error("no lot markers on the map");
  });
  await step("parking filters", async () => {
    const before = await page.locator(".ll-marker").count();
    // Two dimensions combined: who can park + structure.
    const pass = page.getByRole("group", { name: "Access" }).getByRole("button", { name: "Pass/permit required" });
    const surface = page.getByRole("group", { name: "Facility type" }).getByRole("button", { name: "Surface lot" });
    await pass.click();
    await surface.click();
    await page.waitForFunction((n) => document.querySelectorAll(".ll-marker").length !== n, before, { timeout: 10_000 });
    await pass.click();
    await surface.click();
  });
  await step("lot name search", async () => {
    await page.getByRole("combobox", { name: /Find a lot/ }).fill("gold");
    await page.getByRole("listbox", { name: "Matching lots" }).getByRole("option", { name: /Gold Lot/ }).click();
    await page.waitForURL(/[?&]lot=gold-lot/);
    await page.locator(".ll-marker--active").waitFor();
    await page.locator("#lot-highmark-gold-lot button[aria-expanded=true]").waitFor();
  });
  await step("lot details", async () => {
    // Tapping the top-ranked card opens it (and highlights its map marker); its link leads to the lot page.
    await page.getByRole("button", { name: /^Rank 1:/ }).first().click();
    const lot = page.getByRole("link", { name: /Details, sources/ }).first();
    await Promise.all([page.waitForURL(/\/parking\/[^/]+$/), lot.click()]);
    await page.getByRole("heading", { level: 1 }).waitFor();
  });
  await step("share lot link", async () => {
    const lotName = await page.getByRole("heading", { level: 1 }).textContent();
    await page.getByRole("button", { name: "Share lot" }).first().click();
    await page.getByText("Link copied").waitFor();
    const shared = await page.evaluate(() => navigator.clipboard.readText());
    const u = new URL(shared);
    if (u.host !== host || !/^\/venues\/[a-z0-9-]+\/parking\/[a-z0-9-]+$/.test(u.pathname) || u.search) {
      throw new Error(`share link isn't a clean direct lot URL: ${u.origin}${u.pathname}${u.search ? " (has a query string)" : ""}`);
    }
    // A friend opening the link: a fresh tab lands on the same lot page.
    const friend = await context.newPage();
    const res = await friend.goto(shared, { waitUntil: "domcontentloaded" });
    if (res?.status() !== 200) throw new Error(`shared link returned ${res?.status()}`);
    const heading = await friend.getByRole("heading", { level: 1 }).textContent();
    if (heading !== lotName) throw new Error(`shared link opened "${heading}", expected "${lotName}"`);
    await friend.close();
    // The map link from the lot page selects the lot and its pin.
    await Promise.all([page.waitForURL(/[?&]lot=/), page.getByRole("link", { name: "Show on the parking map" }).click()]);
    // Its pin is highlighted, or the page says it has no confirmed location to pin.
    await page.locator(".ll-marker--active").or(page.getByText("no confirmed location")).first().waitFor();
  });
} catch {
  ok = false;
}
await browser.close();

console.log(steps.join("\n"));
console.log(`Map tiles: ${tiles.ok} loaded, ${tiles.failed.length} failed`);
if (consoleErrors.length) console.log(`Console errors:\n  ${consoleErrors.slice(0, 10).join("\n  ")}`);
console.log(`Screenshots: ${out}/`);
process.exit(ok ? 0 : 1);
