// NOTE: This file uses the .ts extension intentionally.
// Next.js middleware resolution is NOT affected by pageExtensions config —
// it always looks for middleware.(ts|js) specifically.

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // /pro/* requires an active session — layout guards handle BrandUser check
  if (pathname.startsWith("/pro")) {
    if (!req.auth) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Legacy /dashboard/* redirect to new /pro/* URLs
  if (pathname.startsWith("/dashboard")) {
    const newPath = pathname.replace("/dashboard", "/pro/dashboard");
    return NextResponse.redirect(new URL(newPath, req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/pro/:path*", "/dashboard/:path*"],
};
