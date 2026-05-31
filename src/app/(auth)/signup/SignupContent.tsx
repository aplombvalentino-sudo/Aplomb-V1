"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AudienceChooser } from "./AudienceChooser";
import { SignupForm } from "./SignupForm";

/**
 * Reads `?audience=` and `?plan=` from the URL, then either shows the
 * audience chooser (and lets the user flip state) or hands the choice off
 * to {@link SignupForm}.
 *
 * Lives in its own client file so `page.tsx` can stay a Server Component —
 * the only client surface in this route is what's strictly interactive.
 */
export function SignupContent() {
  const searchParams = useSearchParams();
  const initialAudience = searchParams.get("audience") as
    | "brand"
    | "client"
    | null;
  const plan = searchParams.get("plan");

  const [audience, setAudience] = useState<null | "brand" | "client">(initialAudience);

  // Keep state in sync if user navigates back/forward
  useEffect(() => {
    setAudience(initialAudience);
  }, [initialAudience]);

  // ─── Audience chooser (no query param) ──────────────────────────────────────
  if (audience === null) {
    return <AudienceChooser onChoose={setAudience} />;
  }

  // ─── Brand / client form ────────────────────────────────────────────────────
  return (
    <SignupForm
      kind={audience}
      plan={plan}
      onBack={initialAudience ? null : () => setAudience(null)}
    />
  );
}
