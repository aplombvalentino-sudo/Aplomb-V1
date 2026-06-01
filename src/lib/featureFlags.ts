import "server-only";

/**
 * Runtime feature flags + safety gates for placeholder/stub providers.
 *
 * Several lib modules (measurementProvider, outfitGenerator stylist LLM, etc.)
 * return deterministic stub data for local development. Without a hard gate,
 * a Vercel production deploy could silently serve that stub data to real
 * users — bad for them, bad for our credibility.
 *
 * `assertStubAllowed()` is the seam: it throws unless we're explicitly in a
 * non-production environment OR the operator has set the override flag.
 */

/**
 * True in environments where stub providers are acceptable: local dev, preview
 * deployments, CI. Vercel sets `VERCEL_ENV=preview` for preview branches, so
 * branch deploys keep working without an explicit override.
 */
function isStubFriendlyEnv(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") return true;
  return false;
}

/**
 * Throw a loud, actionable error when a stub provider is invoked in production
 * without explicit consent. Use at the top of any function that returns
 * placeholder data the user shouldn't see.
 *
 * Override in Vercel by setting ALLOW_STUB_PROVIDERS=true (use sparingly —
 * meant for staging-grade demos, never paying users).
 */
export function assertStubAllowed(featureName: string): void {
  if (isStubFriendlyEnv()) return;
  if (process.env.ALLOW_STUB_PROVIDERS === "true") return;

  throw new Error(
    `[${featureName}] Stub provider is disabled in production. ` +
      `Either wire a real provider (see the module's TODO comments) or set ` +
      `ALLOW_STUB_PROVIDERS=true to acknowledge that placeholder data is being ` +
      `served. This guard exists so real shoppers never receive made-up data.`,
  );
}
