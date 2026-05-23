"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { motion, AnimatePresence } from "motion/react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const ease = [0.16, 1, 0.3, 1] as const;

export default function SignupPage() {
  const router = useRouter();
  const [audience, setAudience] = useState<null | "brand" | "client">(null);

  // ─── Audience chooser (first screen) ────────────────────────────────────────
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
          {/* Brand option */}
          <motion.button
            onClick={() => setAudience("brand")}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.16, ease }}
            whileHover={{ y: -2 }}
            className="group relative overflow-hidden rounded-2xl border border-black/[0.08]
                       bg-white p-5 text-left transition-all duration-300
                       hover:border-black/20 hover:shadow-[0_8px_32px_rgba(0,0,0,0.06)]"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl
                              bg-[#111010] text-white">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <path d="M3 7l7-4 7 4v10H3V7z" stroke="currentColor" strokeWidth="1.5"
                        strokeLinejoin="round" />
                  <path d="M8 17v-5h4v5" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold text-[#111010]">I&apos;m a brand</p>
                <p className="mt-1 text-[13px] text-[#6B6965] leading-relaxed">
                  Add Aplomb to your store. Upload size charts, embed the widget,
                  see fit sessions.
                </p>
              </div>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
                   className="mt-1 shrink-0 text-[#C9C5C0] transition-all duration-200
                              group-hover:translate-x-1 group-hover:text-[#111010]" aria-hidden>
                <path d="M5 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5"
                      strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </motion.button>

          {/* Client option */}
          <motion.button
            onClick={() => setAudience("client")}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.23, ease }}
            whileHover={{ y: -2 }}
            className="group relative overflow-hidden rounded-2xl border border-[#C9A882]/30
                       bg-[#FDF8F3] p-5 text-left transition-all duration-300
                       hover:border-[#C9A882] hover:shadow-[0_8px_32px_rgba(201,168,130,0.18)]"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl
                              bg-[#C9A882] text-white">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <path d="M10 3l2.5 6H18l-5 4 2 6-5-3.5L5 19l2-6-5-4h5.5L10 3z"
                        stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold text-[#111010]">I&apos;m a shopper</p>
                <p className="mt-1 text-[13px] text-[#6B6965] leading-relaxed">
                  Find your perfect fit across brands, build your digital
                  wardrobe — no account required.
                </p>
              </div>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
                   className="mt-1 shrink-0 text-[#C9A882] transition-all duration-200
                              group-hover:translate-x-1" aria-hidden>
                <path d="M5 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5"
                      strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </motion.button>
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

  // ─── Client path: redirect directly to /app ─────────────────────────────────
  if (audience === "client") {
    if (typeof window !== "undefined") router.push("/app");
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-center py-16"
      >
        <p className="text-sm text-[#6B6965]">Loading your fit experience…</p>
      </motion.div>
    );
  }

  // ─── Brand signup form ──────────────────────────────────────────────────────
  return <BrandSignupForm router={router} onBack={() => setAudience(null)} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Brand signup form (extracted)
// ─────────────────────────────────────────────────────────────────────────────

function BrandSignupForm({
  router,
  onBack,
}: {
  router: ReturnType<typeof useRouter>;
  onBack: () => void;
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
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, brandName, email, password }),
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
        router.push("/pro/dashboard");
      }
    } catch {
      setError("An unexpected error occurred.");
    }

    setLoading(false);
  }

  const fields = [
    { label: "Your name", type: "text", value: name,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value),
      placeholder: "Isabelle Marchand", required: true, minLength: undefined },
    { label: "Brand name", type: "text", value: brandName,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setBrandName(e.target.value),
      placeholder: "Atelier Verdú", required: true, minLength: undefined },
    { label: "Email", type: "email", value: email,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value),
      placeholder: "you@brand.com", required: true, minLength: undefined },
    { label: "Password", type: "password", value: password,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value),
      placeholder: "••••••••", required: true, minLength: 8 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease }}
    >
      <button
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 text-[12px] text-[#9C9894]
                   hover:text-[#111010] transition-colors duration-200"
      >
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden>
          <path d="M7 2L3 5.5l4 3.5" stroke="currentColor" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back
      </button>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.08, ease }}
      >
        <h1 className="font-serif text-[2rem] font-semibold leading-[1.1] tracking-[-0.025em] text-[#111010]">
          Create your brand account
        </h1>
        <p className="mt-2 text-sm text-[#6B6965]">
          Start your Aplomb merchant account in under a minute.
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
        {fields.map((field, i) => (
          <motion.div
            key={field.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.14 + i * 0.07, ease }}
          >
            <Input
              label={field.label}
              type={field.type}
              value={field.value}
              onChange={field.onChange}
              required={field.required}
              placeholder={field.placeholder}
              minLength={field.minLength}
            />
          </motion.div>
        ))}

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.46, ease }}
        >
          <Button type="submit" loading={loading} className="mt-1 w-full">
            Create brand account
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
