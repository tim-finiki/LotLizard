import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/submissions/route";
import { getSubmissionStore } from "@/lib/submissions/store";

const valid = { kind: "price", venueSlug: "highmark-stadium", facilitySlug: "hammers-lot", amount: 50, vehicle: "car", eventDate: "2026-10-04" };

function post(body: string | object, headers: Record<string, string> = {}) {
  return POST(
    new Request("http://localhost/api/submissions", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": `203.0.113.${Math.floor(Math.random() * 250)}`, ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

function resetStore() {
  delete (globalThis as { __lotlizardStore?: unknown }).__lotlizardStore;
}

describe("POST /api/submissions when submissions are disabled (production default)", () => {
  beforeEach(() => {
    resetStore();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL", "1");
    for (const k of ["SUBMISSIONS_ENABLED", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "ADMIN_TOKEN"]) vi.stubEnv(k, "");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("rejects a valid direct API request with 503 and stores nothing", async () => {
    const res = await post(valid);
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ error: "submissions_disabled" });
    expect(await getSubmissionStore().list()).toEqual([]);
  });

  it("rejects every kind of request before parsing, including honeypot and malformed bodies", async () => {
    for (const body of [{ ...valid, website: "spam" }, "{not json", { kind: "review", venueSlug: "x" }, {}]) {
      const res = await post(body);
      expect(res.status).toBe(503);
    }
    expect(await getSubmissionStore().list()).toEqual([]);
  });

  it("stays disabled when only some safeguards are configured", async () => {
    vi.stubEnv("SUBMISSIONS_ENABLED", "true");
    vi.stubEnv("ADMIN_TOKEN", "x".repeat(40));
    // No persistent storage / shared rate limiting.
    const res = await post(valid);
    expect(res.status).toBe(503);
    expect(await getSubmissionStore().list()).toEqual([]);
  });

  it("does not cache the refusal", async () => {
    const res = await post(valid);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });
});

describe("POST /api/submissions in local development", () => {
  beforeEach(() => {
    resetStore();
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("accepts and queues a valid submission for moderation", async () => {
    const res = await post(valid);
    expect(res.status).toBe(201);
    const [s] = await getSubmissionStore().list();
    expect(s.status).toBe("pending");
  });
});
