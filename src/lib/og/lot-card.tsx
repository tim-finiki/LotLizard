import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getFacility } from "@/lib/data/repository";
import { FACILITY_TYPE_LABEL } from "@/lib/labels";

/**
 * Social share card for a lot page: the lot name and venue in large type next to the approved A2 primary
 * logo, used unaltered (the same pre-sized PNG the site serves). Text stays big and short so it reads in
 * small mobile previews.
 */

export const LOT_CARD_SIZE = { width: 1200, height: 630 };
export const LOT_CARD_TYPE = "image/png";

const CHARCOAL = "#0f1412";
const LIME = "#7ed321";
const MUTED = "#94a3b8";

// Literal paths, so only these files are traced into the deployment.
const fonts = Promise.all([
  readFile(join(process.cwd(), "brand/fonts/Sora-ExtraBold.ttf")),
  readFile(join(process.cwd(), "brand/fonts/Inter-Medium.ttf")),
]);
const logo = readFile(join(process.cwd(), "public/brand/lotlizard-logo-full-520.png")).then((b) => `data:image/png;base64,${b.toString("base64")}`);

export async function lotCardAlt(venueSlug: string, lotSlug: string): Promise<string> {
  const found = await getFacility(venueSlug, lotSlug);
  return found ? `${found.facility.name} — ${found.venue.name} parking guide on LotLizard` : "LotLizard parking guide";
}

/** Long names get smaller type so they stay within two lines. */
function nameSize(name: string): number {
  if (name.length <= 18) return 84;
  if (name.length <= 28) return 70;
  if (name.length <= 40) return 58;
  return 48;
}

/**
 * The rendered PNG, cached: with Cache Components an image route may only do uncached IO (fonts, logo,
 * rendering) inside a `use cache` helper, so the route serves these bytes.
 */
export async function lotCardPng(venueSlug: string, lotSlug: string): Promise<Uint8Array> {
  "use cache";
  return new Uint8Array(await (await renderLotCard(venueSlug, lotSlug)).arrayBuffer());
}

/** Response for the opengraph-image / twitter-image routes. */
export async function lotCard(venueSlug: string, lotSlug: string): Promise<Response> {
  return new Response(Buffer.from(await lotCardPng(venueSlug, lotSlug)), { headers: { "Content-Type": LOT_CARD_TYPE } });
}

async function renderLotCard(venueSlug: string, lotSlug: string): Promise<ImageResponse> {
  const [found, [sora, inter], logoSrc] = await Promise.all([getFacility(venueSlug, lotSlug), fonts, logo]);
  const name = found?.facility.name ?? "Parking guide";
  const venue = found?.venue.name ?? "LotLizard";
  const place = found ? `${found.venue.address.city}, ${found.venue.address.state}` : "";
  const type = found ? FACILITY_TYPE_LABEL[found.facility.type] : "";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: CHARCOAL, fontFamily: "Inter", color: "white" }}>
        <div style={{ width: 400, height: "100%", display: "flex", alignItems: "center", justifyContent: "center", paddingLeft: 30 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders plain <img> */}
          <img src={logoSrc} width={360} height={284} alt="" />
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 64px 0 24px", gap: 18 }}>
          {type && (
            <div style={{ display: "flex" }}>
              <div style={{ display: "flex", border: `3px solid ${LIME}`, color: LIME, borderRadius: 999, padding: "6px 22px", fontSize: 28 }}>{type}</div>
            </div>
          )}
          <div style={{ display: "flex", fontFamily: "Sora", fontSize: nameSize(name), lineHeight: 1.05, letterSpacing: -1 }}>{name}</div>
          <div style={{ display: "flex", fontFamily: "Sora", fontSize: 40, lineHeight: 1.1, color: LIME }}>{venue}</div>
          {place && <div style={{ display: "flex", fontSize: 30, color: "#e2e8f0" }}>{place}</div>}
          <div style={{ display: "flex", fontSize: 26, color: MUTED, marginTop: 12 }}>Prices · payment · access · directions · sources</div>
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 12, background: LIME, display: "flex" }} />
      </div>
    ),
    {
      ...LOT_CARD_SIZE,
      fonts: [
        { name: "Sora", data: sora, style: "normal", weight: 800 },
        { name: "Inter", data: inter, style: "normal", weight: 500 },
      ],
    },
  );
}
