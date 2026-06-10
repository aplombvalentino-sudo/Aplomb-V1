import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginContent } from "./LoginContent";

// Login is for existing users — we don't want it ranking instead of the
// homepage for branded searches. `noindex, follow` keeps the link equity
// flowing without surfacing the auth form in SERPs.
export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Aplomb account.",
  alternates: { canonical: "/login" },
  robots: { index: false, follow: true },
};

// LoginContent now uses useSearchParams (to read `?audience=…` and any
// `?callbackUrl=…`), which requires a Suspense boundary at the page
// level so the static shell can prerender. Mirrors the signup page.
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-sm text-ink-subtle">Loading…</div>}>
      <LoginContent />
    </Suspense>
  );
}
