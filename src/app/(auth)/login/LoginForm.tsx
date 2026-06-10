"use client";

import Link from "next/link";
import { useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { motion, AnimatePresence } from "motion/react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  TurnstileField,
  type TurnstileFieldHandle,
} from "@/components/security/TurnstileField";
import { TURNSTILE_ENABLED } from "@/components/security/TurnstileWidget";

const ease = [0.16, 1, 0.3, 1] as const;

/**
 * Credentials login form, split out from the old monolithic
 * `LoginContent.tsx` so the audience chooser can flip between two
 * copy variants without duplicating the form code.
 *
 * `kind` controls ONLY the copy (subtitle, email placeholder, "no
 * account?" link target). The post-login redirect is data-driven from
 * the user's actual account type — a shopper who clicked "Brand
 * account" by accident still lands on /app, not /pro/dashboard,
 * because the homepage `/` reads the user's brand membership before
 * routing.
 *
 * Default `callbackUrl` is `/`. The homepage's existing auth-check
 * branch picks the right destination:
 *   - brand membership in DB → /pro/dashboard
 *   - no brand membership    → /app
 * If a caller passes `?callbackUrl=…` (e.g. middleware bounced them
 * from a deeplink), we honour it.
 *
 * The previous version hardcoded `callbackUrl = "/pro/dashboard"`
 * which sent every successful login — including shoppers — to the
 * brand workspace. That was the bug this refactor fixes.
 */
export function LoginForm({
  kind,
  onBack,
}: {
  kind: "brand" | "client";
  /** Lets the parent let the user step back to the chooser. Null hides
   *  the back arrow (used when the audience is fixed by ?audience=). */
  onBack: (() => void) | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileFieldHandle>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isBrand = kind === "brand";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      turnstileToken: turnstileToken ?? "",
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password.");
      // Single-use Turnstile — mint a fresh challenge for the retry.
      turnstileRef.current?.reset();
      return;
    }
    router.push(callbackUrl);
  }

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

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.08, ease }}
      >
        <h1 className="font-serif italic text-[2.2rem] font-medium leading-[1.05] tracking-[-0.02em] text-ink">
          Welcome back<span className="not-italic text-accent">.</span>
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          {isBrand
            ? "Sign in to your Aplomb brand account."
            : "Sign in to your Aplomb shopper account."}
        </p>
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.3, ease }}
            className="mt-5 overflow-hidden rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700
                       border border-red-100"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.22, ease }}
        >
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder={isBrand ? "you@brand.com" : "you@email.com"}
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.3, ease }}
        >
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
          />
        </motion.div>

        {TURNSTILE_ENABLED && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.36, ease }}
          >
            <TurnstileField ref={turnstileRef} onChange={setTurnstileToken} />
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.4, ease }}
        >
          <Button
            type="submit"
            loading={loading}
            disabled={TURNSTILE_ENABLED && !turnstileToken}
            className="mt-1 w-full"
          >
            Sign in
          </Button>
        </motion.div>
      </form>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.5 }}
      >
        <div className="mt-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-hairline" />
          <span className="text-[12px] text-ink-subtle">or</span>
          <div className="h-px flex-1 bg-hairline" />
        </div>

        <motion.button
          type="button"
          onClick={() => signIn("google", { callbackUrl })}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="mt-4 flex w-full items-center justify-center gap-2.5 rounded-full border
                     border-hairline-strong bg-surface px-4 py-2.5 text-sm font-medium text-ink
                     hover:bg-surface-raised transition-colors duration-200"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continue with Google
        </motion.button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.55 }}
        className="mt-7 text-sm text-ink-muted"
      >
        <p>
          {isBrand
            ? "Don't have a brand account yet? "
            : "Don't have an account? "}
          <Link
            href={`/signup?audience=${isBrand ? "brand" : "client"}`}
            className="font-medium text-ink hover:underline underline-offset-2"
          >
            Sign up free
          </Link>
        </p>
      </motion.div>
    </motion.div>
  );
}
