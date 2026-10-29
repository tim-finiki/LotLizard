import { describe, expect, it } from "vitest";
import { aiSource, outboundEvent } from "@/lib/analytics";

describe("aiSource", () => {
  it("recognises AI assistants by referrer host, including subdomains", () => {
    expect(aiSource("https://chatgpt.com/", "https://site.test/")).toBe("ChatGPT");
    expect(aiSource("https://www.perplexity.ai/search?q=x", "https://site.test/")).toBe("Perplexity");
    expect(aiSource("https://gemini.google.com/app", "https://site.test/")).toBe("Gemini");
    expect(aiSource("https://copilot.microsoft.com/", "https://site.test/")).toBe("Copilot");
  });

  it("falls back to utm_source when the referrer is stripped", () => {
    expect(aiSource("", "https://site.test/venues/x?utm_source=chatgpt.com")).toBe("ChatGPT");
  });

  it("ignores ordinary search and social referrers", () => {
    expect(aiSource("https://www.google.com/", "https://site.test/")).toBeUndefined();
    expect(aiSource("https://notchatgpt.com/", "https://site.test/")).toBeUndefined();
    expect(aiSource("", "https://site.test/?utm_source=newsletter")).toBeUndefined();
    expect(aiSource("not a url", "also not")).toBeUndefined();
  });
});

describe("outboundEvent", () => {
  it("classifies map directions as conversions", () => {
    expect(outboundEvent("https://www.google.com/maps/dir/?api=1&destination=1,2", "site.test")).toEqual({ name: "Directions", provider: "google" });
    expect(outboundEvent("https://maps.apple.com/?daddr=1,2", "site.test")).toEqual({ name: "Directions", provider: "apple" });
  });

  it("records other outbound links by host and ignores internal links", () => {
    expect(outboundEvent("https://www.spothero.com/x", "site.test")).toEqual({ name: "Outbound click", host: "www.spothero.com" });
    expect(outboundEvent("https://site.test/venues", "site.test")).toBeUndefined();
    expect(outboundEvent("https://www.google.com/search?q=x", "site.test")).toEqual({ name: "Outbound click", host: "www.google.com" });
  });
});
