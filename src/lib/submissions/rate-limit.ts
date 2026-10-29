/** Best-effort per-instance sliding window. Use a shared store (e.g. Upstash) for real enforcement. */
const hits = new Map<string, number[]>();

export function rateLimit(key: string, limit = 10, windowMs = 60 * 60 * 1000, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}

/**
 * Rate limit shared across all server instances via Upstash Redis (fixed window: INCR + EXPIRE).
 * Fails closed: if Redis can't be reached the request is refused.
 */
export async function sharedRateLimit(
  key: string,
  { url, token }: { url: string; token: string },
  limit = 10,
  windowSeconds = 60 * 60,
): Promise<boolean> {
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["INCR", `lotlizard:ratelimit:${key}`],
        ["EXPIRE", `lotlizard:ratelimit:${key}`, String(windowSeconds), "NX"],
      ]),
      cache: "no-store",
    });
    if (!res.ok) return false;
    const [incr] = (await res.json()) as { result?: number }[];
    return typeof incr?.result === "number" && incr.result <= limit;
  } catch {
    return false;
  }
}
