import { Suspense } from "react";
import { SignupContent } from "./SignupContent";

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
