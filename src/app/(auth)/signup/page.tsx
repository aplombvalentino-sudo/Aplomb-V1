"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { motion, AnimatePresence } from "motion/react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const ease = [0.16, 1, 0.3, 1] as const;

// Post-signup destination — if a paid plan was selected, go to checkout.
// Essential is free (no payment) so it skips checkout entirely.
function buildDestination(audience: "brand" | "client", plan: string | null): string {
  if (audience === "client") {
    // Free Essential path — no checkout, just the app.
    if (!plan || plan === "essential") return "/app";
    return `/checkout?audience=client&plan=${plan}`;
  }
  // Brand: any specific plan goes to checkout, otherwise dashboard.
  if (plan) return `/checkout?audience=brand&plan=${plan}`;
  return "/pro/dashboard";
}

// ─────────────────────────────────────────────────────────────────────────────

function SignupContent() {
  const router = useRouter();
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
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease }}
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08, ease }}
        >
          <h1 className="font-serif text-[2rem] font-semibold leading-[1.1] tracking-[-0.025em] text-[#111010]">
            How will you use Aplomb?
          </h1>
          <p className="mt-2 text-sm text-[#6B6965]">
            Choose the right path — you can switch later.
          </p>
        </motion.div>

        <div className="mt-8 grid gap-3">
          <ChooserButton
            onClick={() => setAudience("brand")}
            delay={0.16}
            iconBg="bg-[#111010]"
            title="I'm a brand"
            body="Add Aplomb to your store. Upload size charts, embed the widget, see fit sessions."
            icon={
              <>
                <path d="M3 7l7-4 7 4v10H3V7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M8 17v-5h4v5" stroke="currentColor" strokeWidth="1.5" />
              </>
            }
            accent="dark"
          />
          <ChooserButton
            onClick={() => setAudience("client")}
            delay={0.23}
            iconBg="bg-[#C9A882]"
            title="I'm a shopper"
            body="Find your perfect fit across brands, build your digital wardrobe."
            icon={
              <path
                d="M10 3l2.5 6H18l-5 4 2 6-5-3.5L5 19l2-6-5-4h5.5L10 3z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            }
            accent="gold"
          />
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="mt-7 text-sm text-[#6B6965]"
        >
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-[#111010] hover:underline underline-offset-2">
            Sign in
          </Link>
        </motion.p>
      </motion.div>
    );
  }

  // ─── Brand form ─────────────────────────────────────────────────────────────
  if (audience === "brand") {
    return (
      <SignupForm
        kind="brand"
        plan={plan}
        router={router}
        onBack={initialAudience ? null : () => setAudience(null)}
      />
    );
  }

  // ─── Client form ────────────────────────────────────────────────────────────
  return (
    <SignupForm
      kind="client"
      plan={plan}
      router={router}
      onBack={initialAudience ? null : () => setAudience(null)}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Audience chooser tile
// ─────────────────────────────────────────────────────────────────────────────

function ChooserButton({
  onClick,
  delay,
  iconBg,
  title,
  body,
  icon,
  accent,
}: {
  onClick: () => void;
  delay: number;
  iconBg: string;
  title: string;
  body: string;
  icon: React.ReactNode;
  accent: "dark" | "gold";
}) {
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease }}
      whileHover={{ y: -2 }}
      className={`group relative overflow-hidden rounded-2xl border p-5 text-left transition-all duration-300
                  ${
                    accent === "gold"
                      ? "border-[#C9A882]/30 bg-[#FDF8F3] hover:border-[#C9A882] hover:shadow-[0_8px_32px_rgba(201,168,130,0.18)]"
                      : "border-black/[0.08] bg-white hover:border-black/20 hover:shadow-[0_8px_32px_rgba(0,0,0,0.06)]"
                  }`}
    >
      <div className="flex items-start gap-4">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white ${iconBg}`}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
            {icon}
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold text-[#111010]">{title}</p>
          <p className="mt-1 text-[13px] text-[#6B6965] leading-relaxed">{body}</p>
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          className={`mt-1 shrink-0 transition-all duration-200 group-hover:translate-x-1
                      ${accent === "gold" ? "text-[#C9A882]" : "text-[#C9C5C0] group-hover:text-[#111010]"}`}
          aria-hidden
        >
          <path d="M5 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </motion.button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Signup form (brand OR client)
// ─────────────────────────────────────────────────────────────────────────────

function SignupForm({
  kind,
  plan,
  router,
  onBack,
}: {
  kind: "brand" | "client";
  plan: string | null;
  router: ReturnType<typeof useRouter>;
  onBack: (() => void) | null;
}) {
  const [name, setName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload: Record<string, string> = { name, email, password };
      if (kind === "brand") payload.brandName = brandName;

      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!json.success) {
        setError(json.error?.message ?? "Signup failed.");
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
          className="mb-4 inline-flex items-center gap-1.5 text-[12px] text-[#7A7773]
                     hover:text-[#111010] transition-colors duration-200"
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
                      ${isBrand ? "bg-black/[0.04] text-[#6B6965]" : "bg-[#FDF8F3] text-[#C9A882]"}`}
        >
          {plan} plan
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.08, ease }}
      >
        <h1 className="font-serif text-[2rem] font-semibold leading-[1.1] tracking-[-0.025em] text-[#111010]">
          {isBrand ? "Create your brand account" : "Create your shopper account"}
        </h1>
        <p className="mt-2 text-sm text-[#6B6965]">
          {plan
            ? "Quick setup — you'll be redirected to checkout next."
            : isBrand
            ? "Start your Aplomb merchant account in under a minute."
            : "Find your perfect fit and build your digital wardrobe."}
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
        <FormField label="Your name" delay={0.14}>
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
          <FormField label="Brand name" delay={0.21}>
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

        <FormField label="Email" delay={isBrand ? 0.28 : 0.21}>
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder={isBrand ? "you@brand.com" : "you@email.com"}
          />
        </FormField>

        <FormField label="Password" delay={isBrand ? 0.35 : 0.28}>
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

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.46, ease }}
        >
          <Button type="submit" loading={loading} className="mt-1 w-full">
            {plan ? "Continue to checkout" : isBrand ? "Create brand account" : "Create account"}
          </Button>
        </motion.div>
      </form>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.56 }}
        className="mt-7 text-sm text-[#6B6965]"
      >
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-[#111010] hover:underline underline-offset-2">
          Sign in
        </Link>
      </motion.p>
    </motion.div>
  );
}

function FormField({
  delay,
  children,
}: {
  label: string;
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

// ─────────────────────────────────────────────────────────────────────────────

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="text-sm text-[#7A7773]">Loading…</div>}>
      <SignupContent />
    </Suspense>
  );
}
