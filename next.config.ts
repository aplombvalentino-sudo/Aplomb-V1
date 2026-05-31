import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Content-Security-Policy directives shared by every route. `frame-ancestors`
// is appended per-route below (the app is frame-locked; /widget is embeddable).
// `'unsafe-eval'` is only added in development, where Next's HMR/react-refresh
// needs it; production stays without it.
const cspDirectives = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://challenges.cloudflare.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co https://challenges.cloudflare.com",
  "frame-src 'self' https://challenges.cloudflare.com",
  "form-action 'self'",
  "worker-src 'self' blob:",
];

function csp(frameAncestors: string): string {
  return [...cspDirectives, `frame-ancestors ${frameAncestors}`].join("; ");
}

// Headers sent on every response. Frame protection is route-specific.
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
      // The embeddable widget must be iframe-able by any brand store, so it
      // gets a permissive frame-ancestors and no X-Frame-Options.
      {
        source: "/widget",
        headers: [
          ...commonSecurityHeaders,
          { key: "Content-Security-Policy", value: csp("*") },
        ],
      },
      // Everything else: deny framing entirely (clickjacking protection).
      {
        source: "/((?!widget$).*)",
        headers: [
          ...commonSecurityHeaders,
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: csp("'none'") },
        ],
      },
    ];
  },
};

export default nextConfig;
