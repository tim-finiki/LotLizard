/**
 * Server-side switch for public community submissions.
 *
 * Deployed (on Vercel, or any NODE_ENV=production server) submissions are OFF unless every
 * safeguard is configured. Local development keeps them on so the form can be built and tested.
 */

type Env = Record<string, string | undefined>;

/** Shortest ADMIN_TOKEN accepted as secure moderation. */
export const MIN_ADMIN_TOKEN_LENGTH = 32;

export type SubmissionsRequirement = "opt_in" | "persistent_storage" | "secure_moderation" | "abuse_protection";

export const REQUIREMENT_DESCRIPTION: Record<SubmissionsRequirement, string> = {
  opt_in: "SUBMISSIONS_ENABLED=true is set",
  persistent_storage: "Persistent storage is configured (UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN)",
  secure_moderation: `ADMIN_TOKEN is set and at least ${MIN_ADMIN_TOKEN_LENGTH} characters long`,
  abuse_protection: "Shared rate limiting is available across server instances (requires Upstash Redis)",
};

export interface SubmissionsStatus {
  enabled: boolean;
  /** Requirements not yet met. Empty when enabled. */
  missing: SubmissionsRequirement[];
}

export function isDeployed(env: Env): boolean {
  return env.VERCEL === "1" || env.NODE_ENV === "production";
}

function hasUpstash(env: Env): boolean {
  return !!env.UPSTASH_REDIS_REST_URL && !!env.UPSTASH_REDIS_REST_TOKEN;
}

export function submissionsStatus(env: Env = process.env): SubmissionsStatus {
  if (!isDeployed(env)) return { enabled: true, missing: [] };

  const missing: SubmissionsRequirement[] = [];
  if (env.SUBMISSIONS_ENABLED !== "true") missing.push("opt_in");
  if (!hasUpstash(env)) missing.push("persistent_storage");
  if ((env.ADMIN_TOKEN ?? "").length < MIN_ADMIN_TOKEN_LENGTH) missing.push("secure_moderation");
  // The shared rate limiter uses the same Upstash database; the per-instance fallback is not
  // real abuse protection on serverless, so it doesn't count.
  if (!hasUpstash(env)) missing.push("abuse_protection");
  return { enabled: missing.length === 0, missing };
}

/** Public-facing copy shared by the API and the submit page. */
export const SUBMISSIONS_DISABLED_REASON = "We're finishing moderation and spam protection before we open it up.";
export const SUBMISSIONS_DISABLED_MESSAGE = `Community reporting is coming soon. ${SUBMISSIONS_DISABLED_REASON}`;
