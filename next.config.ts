import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Inlined at build time so every render (prerender, runtime, client) reports the same build.
  env: {
    LOTLIZARD_BUILD_COMMIT: process.env.VERCEL_GIT_COMMIT_SHA ?? "",
    LOTLIZARD_BUILD_BRANCH: process.env.VERCEL_GIT_COMMIT_REF ?? "",
    LOTLIZARD_BUILD_ENV: process.env.VERCEL_ENV ?? "development",
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
