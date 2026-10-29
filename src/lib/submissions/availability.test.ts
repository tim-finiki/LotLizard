import { afterEach, describe, expect, it, vi } from "vitest";
import { MIN_ADMIN_TOKEN_LENGTH, submissionsStatus } from "@/lib/submissions/availability";
import { sharedRateLimit } from "@/lib/submissions/rate-limit";

const STRONG_TOKEN = "x".repeat(MIN_ADMIN_TOKEN_LENGTH);
const FULL = {
  NODE_ENV: "production",
  VERCEL: "1",
  SUBMISSIONS_ENABLED: "true",
  UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
  UPSTASH_REDIS_REST_TOKEN: "t",
  ADMIN_TOKEN: STRONG_TOKEN,
};

describe("submissionsStatus", () => {
  it("is disabled by default in production", () => {
    const s = submissionsStatus({ NODE_ENV: "production" });
    expect(s.enabled).toBe(false);
    expect(s.missing).toEqual(["opt_in", "persistent_storage", "secure_moderation", "abuse_protection"]);
  });

  it("is disabled by default on any Vercel deployment, previews included", () => {
    expect(submissionsStatus({ VERCEL: "1", NODE_ENV: "production" }).enabled).toBe(false);
    expect(submissionsStatus({ VERCEL: "1" }).enabled).toBe(false);
  });

  it("stays disabled until every safeguard is configured", () => {
    for (const drop of Object.keys(FULL).filter((k) => k !== "NODE_ENV" && k !== "VERCEL")) {
      const env: Record<string, string | undefined> = { ...FULL, [drop]: undefined };
      expect(submissionsStatus(env).enabled, `missing ${drop}`).toBe(false);
    }
    expect(submissionsStatus({ ...FULL, SUBMISSIONS_ENABLED: "1" }).enabled).toBe(false);
    expect(submissionsStatus({ ...FULL, ADMIN_TOKEN: "short-token" }).missing).toEqual(["secure_moderation"]);
  });

  it("is enabled only with opt-in, persistent storage, a strong admin token and shared rate limiting", () => {
    expect(submissionsStatus(FULL)).toEqual({ enabled: true, missing: [] });
  });

  it("stays enabled in local development so the form can be built", () => {
    expect(submissionsStatus({ NODE_ENV: "development" }).enabled).toBe(true);
    expect(submissionsStatus({ NODE_ENV: "test" }).enabled).toBe(true);
  });
});

describe("sharedRateLimit", () => {
  afterEach(() => vi.unstubAllGlobals());
  const conf = { url: "https://example.upstash.io", token: "t" };

  it("allows requests under the limit and blocks above it", async () => {
    let count = 0;
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify([{ result: ++count }, { result: 1 }]))));
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await sharedRateLimit("k", conf, 3));
    expect(results).toEqual([true, true, true, false]);
  });

  it("fails closed when Redis is unreachable or errors", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("down"); }));
    expect(await sharedRateLimit("k", conf)).toBe(false);
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 500 })));
    expect(await sharedRateLimit("k", conf)).toBe(false);
  });
});
