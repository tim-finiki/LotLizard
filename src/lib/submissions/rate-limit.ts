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
