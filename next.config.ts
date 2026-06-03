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
  // Why each entry:
  //   - *.supabase.co + *.supabase.in
  //     Private body-scan bucket signed URLs and any future public asset
  //     URLs we serve from Supabase Storage.
  //   - *.fal.media + *.fal.ai
  //     Virtual try-on outputs come from fal.media (CDN) or fal.ai paths.
  //   - hostname: '**'
  //     Brand-uploaded logos and product images can point at any HTTPS host
  //     (S3, Shopify CDN, Cloudinary, the brand's own server, etc.). We
  //     cannot enumerate them ahead of time. Accepted risk: brands with
  //     write access to brand.logoUrl could ask our optimizer to fetch from
  //     a malicious host. Mitigation: Next limits image size + processing
  //     budget; routes are gated by requireBrandRole; pre-launch scale.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "**.supabase.in" },
      { protocol: "https", hostname: "**.fal.media" },
      { protocol: "https", hostname: "**.fal.ai" },
      { protocol: "https", hostname: "fal.media" },
      // Wildcard for brand-uploaded URLs — see note above. Must stay last
      // so the more specific patterns above are matched first in code review.
      { protocol: "https", hostname: "**" },
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
