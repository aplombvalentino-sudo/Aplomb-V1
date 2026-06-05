"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { motion, AnimatePresence } from "motion/react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { TurnstileField, type TurnstileFieldHandle } from "@/components/security/TurnstileField";
import { TURNSTILE_ENABLED } from "@/components/security/TurnstileWidget";
import { buildDestination } from "./buildDestination";

const ease = [0.16, 1, 0.3, 1] as const;

/**
 * The signup form itself — handles both brand and shopper signup paths.
 *
 * Submit flow: POST /api/signup → on success, NextAuth credentials signIn,
 * then (for free Essential shoppers) lock in the plan cookie, then redirect
 * via {@link buildDestination}.
 */
export function SignupForm({
  kind,
  plan,
  onBack,
}: {
  kind: "brand" | "client";
  plan: string | null;
  onBack: (() => void) | null;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [confirmAge, setConfirmAge] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileFieldHandle>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload: Record<string, unknown> = {
        name,
        email,
        password,
        acceptTerms,
        acceptPrivacy,
        confirmAge,
      };
      if (kind === "brand") payload.brandName = brandName;
      if (turnstileToken) payload.turnstileToken = turnstileToken;

      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!json.success) {
        setError(json.error?.message ?? "Signup failed.");
        // Turnstile tokens are single-use — refresh so the user can retry.
        turnstileRef.current?.reset();
        setLoading(false);
        return;
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Account created but sign-in failed. Please log in manually.");
        router.push("/login");
      } else {
        // For free Essential shoppers, lock in the plan cookie before redirect.
        if (kind === "client" && (!plan || plan === "essential")) {
          try {
            await fetch("/api/user/plan", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ plan: "essential" }),
            });
          } catch {}
        }
        router.push(buildDestination(kind, plan));
      }
    } catch {
      setError("An unexpected error occurred.");
      turnstileRef.current?.reset();
    }

    setLoading(false);
  }

  const isBrand = kind === "brand";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease }}
    >
      {onBack && (
        <button
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-1.5 text-[12px] text-ink-subtle
                     hover:text-ink transition-colors duration-200"
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden>
            <path d="M7 2L3 5.5l4 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </button>
      )}

      {/* Plan badge */}
      {plan && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease }}
          className={`mb-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1
                      text-[11px] font-medium uppercase tracking-[0.14em]
                      ${isBrand ? "bg-ink/5 text-ink-muted" : "bg-[var(--champagne-tint)] text-champagne-deep"}`}
        >
          {plan} plan
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.08, ease }}
      >
        <h1 className="font-serif text-[2.2rem] font-medium leading-[1.05] tracking-[-0.02em] text-ink">
          {isBrand ? (
            <>Create your <em className="italic">brand</em> account<span className="text-accent">.</span></>
          ) : (
            <>Create your <em className="italic">shopper</em> account<span className="text-accent">.</span></>
          )}
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          {plan
            ? "Quick setup — you'll be redirected to checkout next."
            : isBrand
            ? "Start your Aplomb merchant account in under a minute."
            : "Build your digital wardrobe and try outfits on yourself."}
        </p>
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.3, ease }}
            className="mt-5 overflow-hidden rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-100"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-4">
        <FormField delay={0.14}>
          <Input
            label="Your name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder={isBrand ? "Isabelle Marchand" : "Charlotte Rivière"}
          />
        </FormField>

        {isBrand && (
          <FormField delay={0.21}>
            <Input
              label="Brand name"
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              required
              placeholder="Atelier Verdú"
            />
          </FormField>
        )}

        <FormField delay={isBrand ? 0.28 : 0.21}>
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder={isBrand ? "you@brand.com" : "you@email.com"}
          />
        </FormField>

        <FormField delay={isBrand ? 0.35 : 0.28}>
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            minLength={8}
          />
        </FormField>

        {/* Clickwrap acceptance — unchecked by default, required, server-validated */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.43, ease }}
          className="mt-1 space-y-2.5"
        >
          <label className="flex items-start gap-2.5 cursor-pointer text-[13px] leading-snug text-ink-muted">
            <input
              type="checkbox"
              required
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded accent-[#C9653B]"
            />
            <span>
              I accept the{" "}
              <Link
                href="/cgu"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-ink underline underline-offset-2 hover:text-accent"
              >
                Terms of Use
              </Link>
              .
            </span>
          </label>
          <label className="flex items-start gap-2.5 cursor-pointer text-[13px] leading-snug text-ink-muted">
            <input
              type="checkbox"
              required
              checked={acceptPrivacy}
              onChange={(e) => setAcceptPrivacy(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded accent-[#C9653B]"
            />
            <span>
              I acknowledge the{" "}
              <Link
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-ink underline underline-offset-2 hover:text-accent"
              >
                Privacy Policy
              </Link>
              .
            </span>
          </label>
          {/* Age gate — French LIL art. 7-1: digital consent age = 15. */}
          <label className="flex items-start gap-2.5 cursor-pointer text-[13px] leading-snug text-ink-muted">
            <input
              type="checkbox"
              required
              checked={confirmAge}
              onChange={(e) => setConfirmAge(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded accent-[#C9653B]"
            />
            <span>I confirm I am 15 years old or older.</span>
          </label>
        </motion.div>

        {TURNSTILE_ENABLED && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.46, ease }}
          >
            <TurnstileField ref={turnstileRef} onChange={setTurnstileToken} />
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.5, ease }}
        >
          <Button
            type="submit"
            loading={loading}
            disabled={TURNSTILE_ENABLED && !turnstileToken}
            className="mt-1 w-full"
          >
            {plan ? "Continue to checkout" : isBrand ? "Create brand account" : "Create account"}
          </Button>
        </motion.div>
      </form>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.56 }}
        className="mt-7 text-sm text-ink-muted"
      >
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-ink hover:underline underline-offset-2">
          Sign in
        </Link>
      </motion.p>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Co-located motion wrapper used only by SignupForm above.
// ─────────────────────────────────────────────────────────────────────────────

function FormField({
  delay,
  children,
}: {
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease }}
    >
      {children}
    </motion.div>
  );
}
