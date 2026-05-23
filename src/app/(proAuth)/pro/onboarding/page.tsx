"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const ease = [0.16, 1, 0.3, 1] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const [brandName, setBrandName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!brandName.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/brand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: brandName.trim() }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "Failed to create brand.");
        setLoading(false);
        return;
      }
      router.push("/pro/dashboard");
    } catch {
      setError("An unexpected error occurred.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[100dvh] bg-[#F7F6F3] flex items-center justify-center px-4">
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 40%, rgba(210,190,170,0.18) 0%, transparent 70%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease }}
        className="w-full max-w-sm"
      >
        {/* Eyebrow */}
        <span className="inline-flex items-center rounded-full border border-black/10 bg-white/60
                         px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-[#6B6965]">
          Welcome to Aplomb
        </span>

        <h1 className="mt-5 font-serif text-[2rem] font-semibold leading-[1.1]
                       tracking-[-0.025em] text-[#111010]">
          Set up your brand.
        </h1>
        <p className="mt-2.5 text-sm leading-relaxed text-[#6B6965]">
          Give your brand a name. You can change this later in settings.
        </p>

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-4">
          <Input
            label="Brand name"
            type="text"
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            placeholder="Atelier Lumière"
            required
          />
          <Button type="submit" loading={loading} className="mt-1 w-full">
            Create brand
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
