import type { NextConfig } from "next";

// Static security headers that are the same on every response.
// The CSP + X-Frame-Options are dynamic (per-request nonce, per-route
// frame-ancestors) and live in `src/middleware.ts` — see that file for the
// strict-dynamic + nonce scheme that replaces the old 'unsafe-inline' script-src.
const commonSecurityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The fitting room captures/uploads photos; allow camera for our own origin
  // (and, when embedded, via the iframe `allow="camera"` attribute).
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // The legacy src/middleware.ts is the active auth middleware (Next.js only
  // auto-loads middleware.(ts|js), regardless of pageExtensions). Excluding the
  // bare "ts" extension keeps middleware.ts from being mistaken for a page, and
  // forces app pages / API route handlers to use the .tsx extension.
  pageExtensions: ["tsx", "jsx", "js"],

  async headers() {
    return [
      // Static headers on every route. CSP + X-Frame-Options live in
      // src/middleware.ts because they need per-request nonces + per-route
      // frame-ancestors.
      {
        source: "/(.*)",
        headers: commonSecurityHeaders,
      },
    ];
  },
};

export default nextConfig;
