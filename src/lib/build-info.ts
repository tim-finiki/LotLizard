/**
 * Which commit this deployment was built from. Values come from Vercel's git variables, inlined at
 * build time via next.config `env`, so a stale page or bundle shows an old commit.
 */
export function buildInfo() {
  const sha = process.env.LOTLIZARD_BUILD_COMMIT;
  return {
    commit: sha ? sha.slice(0, 7) : "local",
    fullCommit: sha || null,
    branch: process.env.LOTLIZARD_BUILD_BRANCH || null,
    environment: process.env.LOTLIZARD_BUILD_ENV || "development",
  };
}
