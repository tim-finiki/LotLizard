/**
 * Brand guardrails: the approved original artwork is never modified, and every brand asset the site,
 * manifest and structured data point to exists.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";
import { siteJsonLd, siteUrl } from "@/lib/seo";

const root = process.cwd();
const sha256 = (p: string) => createHash("sha256").update(readFileSync(join(root, p))).digest("hex");

describe("brand assets", () => {
  it("keeps the approved original artwork byte-for-byte", () => {
    expect(sha256("brand/source/ORIGINAL_APPROVED_MASCOT.png")).toBe("fc6d3e9c2e9f0e361a32fd4cc8b7b3f8dcda45fe1308a50117ff69b2ed90402a");
  });

  it("ships every asset the site, manifest and metadata reference", () => {
    const files = [
      "public/brand/lotlizard-logo-full.png",
      "public/brand/lotlizard-logo-compact.png",
      "public/brand/lotlizard-mascot.png",
      "public/brand/lotlizard-mascot-head.png",
      "src/app/favicon.ico",
      "src/app/icon.png",
      "src/app/apple-icon.png",
      "src/app/opengraph-image.png",
      "src/app/twitter-image.png",
      ...(manifest().icons ?? []).map((i) => `public${i.src}`),
    ];
    for (const f of files) expect(existsSync(join(root, f)), f).toBe(true);
  });

  it("favicon.ico carries its own 16px image (not just a downscale of the 32px one)", () => {
    const ico = readFileSync(join(root, "src/app/favicon.ico"));
    const count = ico.readUInt16LE(4);
    const sizes = Array.from({ length: count }, (_, i) => ico[6 + i * 16] || 256);
    expect(sizes.sort((a, b) => a - b)).toEqual([16, 32, 48]);
  });

  it("names the approved logo in Organization structured data", () => {
    const org = siteJsonLd().find((x) => x["@type"] === "Organization") as { logo?: string };
    expect(org.logo).toBe(`${siteUrl()}/brand/lotlizard-logo-full.png`);
  });

  it("uses the brand charcoal for the installed app", () => {
    const m = manifest();
    expect(m.theme_color).toBe("#0f1412");
    expect(m.icons?.some((i) => i.purpose === "maskable")).toBe(true);
  });
});
