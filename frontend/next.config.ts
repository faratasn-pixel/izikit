import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

// Static security headers applied to every response.
// Set via next.config.ts (not middleware.ts) so Vercel's edge can serve them
// from the CDN cache without invoking a function — zero per-request latency.
//
// CSP is intentionally NOT included here. App Router pages need a per-request
// nonce (server-rendered) for inline scripts; ship CSP via middleware.ts when
// the first frontend page lands. For now, the API-only surface doesn't render
// HTML and doesn't need CSP.
const securityHeaders = [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
];

const config: NextConfig = {
  reactStrictMode: true,
  // Standalone output bundles a self-contained server.js + minimal node_modules
  // into .next/standalone. Consumed by the PlanetHoster N0C deployment: the
  // Passenger entrypoint (repo-root app.js) requires ./frontend/server.js from
  // this bundle. No impact on `next dev` / `next start`.
  output: 'standalone',
  eslint: {
    // Lint already runs via the husky pre-commit hook (lint-staged) and
    // `pnpm lint` in CI. Next's build-time lint step loads the repo-root
    // flat config (eslint.config.mjs), whose deps (@eslint/js,
    // typescript-eslint, globals) live only in the root package.json —
    // unreachable from a Vercel build scoped to the `frontend` Root
    // Directory, which breaks `next build` with ERR_MODULE_NOT_FOUND.
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

// Sentry build-time wrapper. Uploads source maps when SENTRY_AUTH_TOKEN +
// SENTRY_ORG + SENTRY_PROJECT are present (typically only in CI). Without
// those env vars the wrapper still works — it just skips the upload step.
// silent:true keeps the build log clean when nothing is configured.
export default withSentryConfig(config, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  // Tunnel client requests through a Next.js route to bypass ad-blockers
  // that filter direct Sentry calls. Off by default — turn on if your
  // user base has heavy ad-blocker usage.
  // tunnelRoute: '/monitoring',
  hideSourceMaps: true,
  disableLogger: true,
});
