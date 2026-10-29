/**
 * Pure helpers for measurement. Kept free of browser APIs so they can be unit-tested; the client
 * listener in `AnalyticsEvents` feeds them real hrefs, referrers and URLs.
 */

/** AI assistants and answer engines whose visits we want to count separately. Host suffix → label. */
export const AI_REFERRERS: Record<string, string> = {
  "chatgpt.com": "ChatGPT",
  "chat.openai.com": "ChatGPT",
  "perplexity.ai": "Perplexity",
  "gemini.google.com": "Gemini",
  "copilot.microsoft.com": "Copilot",
  "claude.ai": "Claude",
  "you.com": "You.com",
  "phind.com": "Phind",
};

function hostOf(url: string): string | undefined {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return undefined;
  }
}

function matchAi(host: string | undefined): string | undefined {
  if (!host) return undefined;
  for (const [suffix, label] of Object.entries(AI_REFERRERS)) {
    if (host === suffix || host.endsWith(`.${suffix}`)) return label;
  }
  return undefined;
}

/**
 * The AI source of a visit, from the referrer or from `utm_source` (ChatGPT appends
 * `utm_source=chatgpt.com` to links it cites, which survives when the referrer is stripped).
 */
export function aiSource(referrer: string, pageUrl: string): string | undefined {
  const fromReferrer = matchAi(hostOf(referrer));
  if (fromReferrer) return fromReferrer;
  try {
    const utm = new URL(pageUrl).searchParams.get("utm_source");
    return utm ? matchAi(utm.toLowerCase().replace(/^https?:\/\//, "").split("/")[0]) : undefined;
  } catch {
    return undefined;
  }
}

export type OutboundEvent = { name: "Directions"; provider: "google" | "apple" } | { name: "Outbound click"; host: string };

/** Classifies an outbound click into a conversion event, or undefined for ordinary links. */
export function outboundEvent(href: string, siteHost: string): OutboundEvent | undefined {
  const host = hostOf(href);
  if (!host || host === siteHost) return undefined;
  if (host === "maps.apple.com") return { name: "Directions", provider: "apple" };
  if ((host === "www.google.com" || host === "google.com") && new URL(href).pathname.startsWith("/maps")) return { name: "Directions", provider: "google" };
  return { name: "Outbound click", host };
}
