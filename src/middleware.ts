// NOTE: This file uses the .ts extension intentionally.
// Next.js middleware resolution is NOT affected by pageExtensions config —
// it always looks for middleware.(ts|js) specifically.

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const isDev = process.env.NODE_ENV !== "production";

// Generate a fresh CSP nonce per request. Edge runtime has Web Crypto so this
// is cheap. Base64-encoded 16-byte random gives ~24 chars of opacity.
function makeNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin);
}

// Build the CSP for this specific request.
//   - `script-src` is strict: only same-origin, our nonce, Turnstile, and
//     `'strict-dynamic'` so legit framework scripts can load their chunks.
//     NO `'unsafe-inline'` — this is the key security upgrade.
//   - `'unsafe-eval'` only in dev (Next's HMR + react-refresh need it).
//   - `style-src` keeps `'unsafe-inline'` because Tailwind injects style tags;
//     forcing it through nonces would break the design system.
//   - `frame-ancestors` is permissive for /widget (must embed cross-origin),
//     locked for every other route.
function buildCsp(nonce: string, pathname: string): string {
  const frameAncestors = pathname === "/widget" ? "*" : "'none'";
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    // Strict-dynamic + nonce: only scripts trusted by their nonce can run,
    // and they can only load further scripts via JS APIs (no <script src=...>
    // injection from untrusted DOM). Modern browsers respect this; older
    // ones fall back to ignoring the directive and we lose nothing.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""} https://challenges.cloudflare.com`,
    // Styles: Tailwind needs unsafe-inline. Documented trade-off; revisit
    // if/when we have time to ship a build-time style-extraction pass.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co https://challenges.cloudflare.com",
    "frame-src 'self' https://challenges.cloudflare.com",
    "form-action 'self'",
    "worker-src 'self' blob:",
    `frame-ancestors ${frameAncestors}`,
  ].join("; ");
}

// Attach CSP + XFO + the nonce passthrough header to every outgoing response.
// XFO is route-specific (widget must be embeddable, everything else: DENY).
function withSecurityHeaders(
  response: NextResponse,
  nonce: string,
  pathname: string,
): NextResponse {
  response.headers.set("Content-Security-Policy", buildCsp(nonce, pathname));
  if (pathname !== "/widget") {
    response.headers.set("X-Frame-Options", "DENY");
  }
  // Echo the nonce so Server Components can read it via headers().get('x-nonce').
  response.headers.set("x-nonce", nonce);
  return response;
}

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Per-request nonce — fresh for every page render, defeats replay.
  const nonce = makeNonce();

  // /pro/* requires an active session — layout guards handle BrandUser check
  if (pathname.startsWith("/pro")) {
    if (!req.auth) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return withSecurityHeaders(NextResponse.redirect(loginUrl), nonce, pathname);
    }
  }

  // Legacy /dashboard/* redirect to new /pro/* URLs
  if (pathname.startsWith("/dashboard")) {
    const newPath = pathname.replace("/dashboard", "/pro/dashboard");
    return withSecurityHeaders(
      NextResponse.redirect(new URL(newPath, req.url)),
      nonce,
      pathname,
    );
  }

  // Propagate the nonce into the *request* so Next.js's framework code
  // picks it up and applies it to its own injected <script> tags.
  // Without this, Next's own scripts would be blocked by our strict CSP.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);

  return withSecurityHeaders(
    NextResponse.next({ request: { headers: requestHeaders } }),
    nonce,
    pathname,
  );
});

// Run on every page-render path. Skip:
//   - /api/*       (no HTML response — CSP irrelevant)
//   - /_next/*     (Next's own asset routes)
//   - /favicon.ico (static)
//   - /widget.js   (the embeddable JS payload from public/ — not a document)
//   - any *.svg, *.png, *.jpg, etc. (static assets — CSP doesn't apply to them)
export const config = {
  matcher: [
    "/((?!api/|_next/static|_next/image|favicon.ico|widget\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf|map|css|js)).*)",
  ],
};
