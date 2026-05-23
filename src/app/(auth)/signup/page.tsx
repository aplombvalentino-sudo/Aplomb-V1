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
        router.push("/dashboard");
      }
    } catch {
      setError("An unexpected error occurred.");
    }

    setLoading(false);
  }

  const fields = [
    {
      label: "Your name",
      type: "text",
      value: name,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value),
      placeholder: "Isabelle Marchand",
      required: true,
      minLength: undefined,
    },
    {
      label: "Brand name",
      type: "text",
      value: brandName,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setBrandName(e.target.value),
      placeholder: "Atelier Verdú",
      required: true,
      minLength: undefined,
    },
    {
      label: "Email",
      type: "email",
      value: email,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value),
      placeholder: "you@brand.com",
      required: true,
      minLength: undefined,
    },
    {
      label: "Password",
      type: "password",
      value: password,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value),
      placeholder: "••••••••",
      required: true,
      minLength: 8,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease }}
    >
      {/* Heading */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.08, ease }}
      >
        <h1 className="font-serif text-[2rem] font-semibold leading-[1.1] tracking-[-0.025em] text-[#111010]">
          Create your account
        </h1>
        <p className="mt-2 text-sm text-[#6B6965]">
          Start your free Aplomb merchant account today.
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
            Create account
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
