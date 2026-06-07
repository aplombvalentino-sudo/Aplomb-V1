import type { Metadata } from "next";
import { Suspense } from "react";
import { SignupContent } from "./SignupContent";

// Signup IS the conversion page — keep it indexable so branded searches
// ("aplomb signup", "aplomb sign up free") land here.
export const metadata: Metadata = {
  title: "Sign up — start your wardrobe free",
  description:
    "Create your free Aplomb account. Build your digital wardrobe, add the clothes you already own, mix them with certified brand pieces, and test new outfits on yourself.",
  alternates: { canonical: "/signup" },
  robots: { index: true, follow: true },
};

// Server Component. `SignupContent` is the only client island this route
// renders, and useSearchParams there mandates a Suspense boundary at the
// page level so the static shell can be prerendered.
export default function SignupPage() {
  return (
    <Suspense fallback={<div className="text-sm text-ink-subtle">Loading…</div>}>
      <SignupContent />
    </Suspense>
  );
}
