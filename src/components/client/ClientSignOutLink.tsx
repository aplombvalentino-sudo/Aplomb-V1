"use client";

import { signOut } from "next-auth/react";

/**
 * Sign-out link used across the shopper-facing /app pages.
 * Clears the client-plan cookie before signing out so the user doesn't get
 * auto-redirected back into /app from the landing page.
 */
export function ClientSignOutLink({
  className = "",
  label = "Sign out",
}: {
  className?: string;
  label?: string;
}) {
  async function handleSignOut() {
    // Clear the client-plan cookie (so the root router treats them as anonymous)
    document.cookie = "aplomb_client_plan=; path=/; max-age=0";
    await signOut({ callbackUrl: "/" });
  }

  return (
    <button
      onClick={handleSignOut}
      className={
        className ||
        "text-[12px] text-[#7A7773] hover:text-[#111010] transition-colors duration-200"
      }
    >
      {label}
    </button>
  );
}
