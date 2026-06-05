/**
 * Post-signup destination resolver.
 *
 * - Client + Essential (or no plan) → /app/wardrobe   (wardrobe is the
 *                                                      new product centre)
 * - Client + paid plan              → /checkout?audience=client&plan=…
 * - Brand  + any plan               → /checkout?audience=brand&plan=…
 * - Brand  + no plan                → /pro/dashboard   (free trial)
 *
 * Kept pure (no React, no router) so it can be unit-tested in isolation.
 */
export function buildDestination(
  audience: "brand" | "client",
  plan: string | null,
): string {
  if (audience === "client") {
    if (!plan || plan === "essential") return "/app/wardrobe";
    return `/checkout?audience=client&plan=${plan}`;
  }
  // Brand
  if (plan) return `/checkout?audience=brand&plan=${plan}`;
  return "/pro/dashboard";
}
