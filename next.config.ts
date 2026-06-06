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

  // ─── Image optimization ──────────────────────────────────────────────────
  // Next/Image will only optimize remote URLs whose host matches one of
  // these patterns. Anything else needs `unoptimized` on the <Image> instance.
  //
  // SECURITY POSTURE: this allow-list is a tight bound on what Next's image
  // optimizer will fetch on our behalf. Previously this list ended with a
  // `**` wildcard, which turned the optimizer into an open HTTPS proxy / SSRF
  // surface — a brand operator (or anyone who poisoned a brand.logoUrl /
  // product.imageUrl row) could ask us to fetch arbitrary internal IPs,
  // metadata endpoints, etc.. Removed before launch.
  //
  // Categories:
  //   - First-party storage     →  *.supabase.co / *.supabase.in
  //   - AI provider outputs     →  *.fal.media / *.fal.ai / fal.media
  //   - Common brand CDN hosts  →  Shopify, Cloudinary, Imgix, AWS S3
  //
  // To onboard a brand whose images live on an un-listed host, either
  //   (a) add their specific CDN host below and ship a deploy, or
  //   (b) re-host the assets in our Supabase bucket on import.
  // Do NOT re-introduce a `**` wildcard.
  images: {
    remotePatterns: [
      // First-party storage (signed bucket URLs + future public assets).
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "**.supabase.in" },

      // AI provider outputs (virtual try-on).
      { protocol: "https", hostname: "**.fal.media" },
      { protocol: "https", hostname: "**.fal.ai" },
      { protocol: "https", hostname: "fal.media" },

      // Common brand-product CDN hosts. Keep this list narrow — each entry
      // is a host we explicitly trust to serve images. Avoid bare TLD
      // wildcards.
      { protocol: "https", hostname: "cdn.shopify.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "**.imgix.net" },
      // S3: the two canonical region-less and per-region forms. Anything
      // else (custom CNAME, CloudFront, etc.) must be added by host below.
      { protocol: "https", hostname: "**.s3.amazonaws.com" },
      { protocol: "https", hostname: "s3.amazonaws.com" },
      { protocol: "https", hostname: "**.s3.*.amazonaws.com" },
      // CloudFront distributions used by many brand CDNs.
      { protocol: "https", hostname: "**.cloudfront.net" },
    ],
    // Cache optimized responses for a day, then refresh.
    minimumCacheTTL: 60 * 60 * 24,
  },

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
