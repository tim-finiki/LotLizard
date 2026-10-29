import { describe, expect, it } from "vitest";
import { directionsLinks, isStreetAddress } from "@/lib/directions";

describe("directionsLinks", () => {
  it("uses exact pins", () => {
    const d = directionsLinks({ location: { lat: 42.1, lng: -78.2, precision: "exact" } });
    expect(d?.basis).toBe("exact_pin");
    expect(d?.google).toContain("destination=42.1,-78.2");
    expect(d?.apple).toContain("daddr=42.1,-78.2");
  });

  it("never routes to approximate pins", () => {
    expect(directionsLinks({ location: { lat: 42.1, lng: -78.2, precision: "approximate" } })).toBeNull();
  });

  it("falls back to a sourced street address", () => {
    const d = directionsLinks({ location: { lat: 42.1, lng: -78.2, precision: "approximate" }, address: "4170 Abbott Rd, Orchard Park, NY 14127" });
    expect(d?.basis).toBe("street_address");
    expect(d?.google).toContain(encodeURIComponent("4170 Abbott Rd"));
  });

  it("rejects vague or unconfirmed addresses", () => {
    expect(isStreetAddress("Southwestern Blvd, Orchard Park, NY (exact address unconfirmed)")).toBe(false);
    expect(isStreetAddress("Southwestern Blvd, Orchard Park")).toBe(false);
    expect(isStreetAddress("10 Bills Plaza, Orchard Park, NY")).toBe(true);
  });
});
