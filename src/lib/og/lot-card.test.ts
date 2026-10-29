import { describe, expect, it } from "vitest";
import { FACILITIES, VENUES } from "@/lib/data/catalog";
import { lotCardAlt } from "@/lib/og/lot-card";

describe("lot share cards", () => {
  it("describe each lot by its own name and venue", async () => {
    expect(await lotCardAlt("highmark-stadium", "blue-ada-lot")).toBe("Blue ADA Lot — Highmark Stadium parking guide on LotLizard");
    expect(await lotCardAlt("keybank-center", "adam-ramp")).toBe("Adam Ramp — KeyBank Center parking guide on LotLizard");
    expect(await lotCardAlt("nowhere", "nothing")).toBe("LotLizard parking guide");
  });

  it("are unique for every lot", async () => {
    const alts = await Promise.all(FACILITIES.map((f) => lotCardAlt(VENUES.find((v) => v.id === f.venueId)!.slug, f.slug)));
    expect(new Set(alts).size).toBe(alts.length);
  });
});
