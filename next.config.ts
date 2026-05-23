import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Exclude plain .ts extension so that the legacy src/middleware.ts file
  // (which cannot be deleted) is not detected as a Next.js middleware handler.
  // The actual auth proxy is in src/proxy.tsx, and API routes use route.tsx.
  pageExtensions: ["tsx", "jsx", "js"],
};

export default nextConfig;
