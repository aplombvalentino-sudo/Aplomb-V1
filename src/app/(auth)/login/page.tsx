import type { Metadata } from "next";
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

export default function LoginPage() {
  return <LoginContent />;
}
