"use client";

import Link from "next/link";
import { motion } from "motion/react";

const ease = [0.16, 1, 0.3, 1] as const;

const testimonials = [
  {
    quote: "Aplomb cut our return rate in half within the first month.",
    author: "Léa Marchand",
    brand: "Forme Paris",
  },
  {
    quote: "Setup took 8 minutes. Our conversion went up 19% the same week.",
    author: "Tom Hirsch",
    brand: "Arc & Thread",
  },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] bg-[#F7F6F3]">

      {/* ── LEFT: brand panel (desktop only) ── */}
      <div className="relative hidden lg:flex lg:w-[44%] xl:w-[40%] flex-col justify-between
                      bg-[#111010] px-12 py-12 overflow-hidden">
        {/* Ambient glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 10% 80%, rgba(160,120,80,0.15) 0%, transparent 65%)",
          }}
        />

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
        >
          <Link href="/" className="text-[16px] font-semibold tracking-tight text-white hover:opacity-70 transition-opacity">
            Aplomb
          </Link>
        </motion.div>

        {/* Center editorial text */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease }}
          className="relative"
        >
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/40 mb-5">
            AI Fitting Room
          </p>
          <h2 className="font-serif text-[clamp(2rem,2.8vw,2.6rem)] font-semibold leading-[1.1]
                         tracking-[-0.03em] text-white">
            The fitting room your brand always needed.
          </h2>
          <p className="mt-5 text-[15px] leading-[1.65] text-white/50 max-w-[36ch]">
            AI body measurements, personalized outfit recommendations, and zero friction for your shoppers.
          </p>

          {/* Stats row */}
          <div className="mt-10 grid grid-cols-3 gap-6">
            {[
              { n: "−38%", l: "return rate" },
              { n: "+22%", l: "conversion" },
              { n: "10 min", l: "to go live" },
            ].map((s) => (
              <div key={s.n}>
                <p className="text-[1.6rem] font-semibold tracking-[-0.03em] text-white leading-none">{s.n}</p>
                <p className="mt-1 text-[11px] text-white/40">{s.l}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Testimonials at bottom */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.4, ease }}
          className="relative space-y-5"
        >
          {testimonials.map((t) => (
            <div key={t.author} className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5">
              <p className="text-[13px] leading-[1.6] text-white/70 italic">&ldquo;{t.quote}&rdquo;</p>
              <p className="mt-3 text-[11px] text-white/40">
                {t.author} — <span className="text-white/30">{t.brand}</span>
              </p>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── RIGHT: form area ── */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-8">
        {/* Mobile logo */}
        <div className="mb-8 self-start lg:hidden">
          <Link href="/" className="text-[16px] font-semibold tracking-tight text-[#111010]">
            Aplomb
          </Link>
        </div>

        <div className="w-full max-w-[400px]">
          {children}
        </div>
      </div>
    </div>
  );
}
