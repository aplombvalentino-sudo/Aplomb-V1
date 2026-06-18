"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LoginAudienceChooser } from "./LoginAudienceChooser";
import { LoginForm } from "./LoginForm";

/**
 * Login flow with an audience chooser, mirroring
 * `src/app/(auth)/signup/SignupContent.tsx`:
 *
 *   1. With NO `?audience=`, show the chooser (Brand vs Shopper).
 *   2. With `?audience=brand` or `?audience=client`, jump straight to
 *      the form with the matching copy. Used by deep links from
 *      marketing surfaces and by the signup ↔ login cross-links.
 *
 * The chooser is purely a UI affordance — it controls form copy
 * (subtitle, placeholder, "no account?" link) only. The post-login
 * destination is data-driven from the user's actual account type
 * (brand membership in DB), so a shopper who picks "Brand account"
 * still ends up on /app.
 */
export function LoginContent() {
  const searchParams = useSearchParams();
  // Validate, don't blind-cast: `?audience=junk` must fall through to the
  // chooser, not skip it and render a mislabeled form.
  const rawAudience = searchParams.get("audience");
  const initialAudience =
    rawAudience === "brand" || rawAudience === "client" ? rawAudience : null;

  const [audience, setAudience] = useState<null | "brand" | "client">(
    initialAudience,
  );

  // Keep state in sync if the user navigates back/forward.
  useEffect(() => {
    setAudience(initialAudience);
  }, [initialAudience]);

  if (audience === null) {
    return <LoginAudienceChooser onChoose={setAudience} />;
  }

  return (
    <LoginForm
      kind={audience}
      // Allow the user to flip back to the chooser only if they got
      // here without the URL param locking the choice in.
      onBack={initialAudience ? null : () => setAudience(null)}
    />
  );
}
