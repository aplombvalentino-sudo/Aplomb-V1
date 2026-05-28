"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { Logo } from "@/components/brand/Logo";

const ease = [0.16, 1, 0.3, 1] as const;

// ─── Brand panel content ────────────────────────────────────────────────────

const brandStats = [
  { n: "Fewer", l: "returns" },
  { n: "Higher", l: "conversion" },
  { n: "10 min", l: "to go live" },
];

const brandTestimonials = [
  {
    quote: "The fit recommendations are the closest we've seen to in-store accuracy.",
    author: "Léa Marchand",
    brand: "Forme Paris",
  },
  {
    quote: "Setup was genuinely fast — embedded and live the same afternoon.",
    author: "Tom Hirsch",
    brand: "Arc & Thread",
  },
];

// ─── Shopper panel content ──────────────────────────────────────────────────

const clientStats = [
  { n: "Your fit", l: "across brands" },
  { n: "60 sec", l: "to get your size" },
  { n: "0", l: "tape measures" },
];

const clientTestimonials = [
  {
    quote: "Finally found my actual size across brands — far fewer returns for me.",
    author: "Charlotte Rivière",
    brand: "Paris",
  },
  {
    quote: "The digital wardrobe is addictive — I see every look before buying.",
    author: "Noémie Tagaki",
    brand: "Lyon",
  },
];

// ─── Variants ───────────────────────────────────────────────────────────────

type PanelContent = {
  eyebrow: string;
  headline: string;
  subhead: string;
  stats: { n: string; l: string }[];
  testimonials: { quote: string; author: string; brand: string }[];
  glow: string;
};

const BRAND_PANEL: PanelContent = {
  eyebrow: "AI Fitting Room",
  headline: "The fitting room your brand always needed.",
  subhead:
    "AI body measurements, personalized outfit recommendations, and zero friction for your shoppers.",
  stats: brandStats,
  testimonials: brandTestimonials,
  glow: "rgba(160,120,80,0.15)",
};

const CLIENT_PANEL: PanelContent = {
  eyebrow: "Your AI Fitting Room",
  headline: "Find your perfect fit. Anywhere.",
  subhead:
    "One body scan. Every brand. Save the looks you love and shop with confidence — no more returns.",
  stats: clientStats,
  testimonials: clientTestimonials,
  glow: "rgba(201,168,130,0.22)",
};

// ─── Layout ─────────────────────────────────────────────────────────────────

function AuthLayoutContent({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const audience = searchParams.get("audience");
  const panel = audience === "client" ? CLIENT_PANEL : BRAND_PANEL;

  return (
    <div className="flex min-h-[100dvh] bg-[#F7F6F3]">
      {/* ── LEFT: editorial panel (desktop only) ── */}
      <div className="relative hidden lg:flex lg:w-[44%] xl:w-[40%] flex-col justify-between
                      bg-[#111010] px-12 py-12 overflow-hidden">
        {/* Ambient glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 80% 60% at 10% 80%, ${panel.glow} 0%, transparent 65%)`,
          }}
        />

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
        >
          <Link
            href="/"
            aria-label="Aplomb — home"
            className="text-[18px] text-white hover:opacity-70 transition-opacity"
          >
            <Logo />
          </Link>
        </motion.div>

        {/* Editorial text — keyed on audience so motion replays on switch */}
        <motion.div
          key={audience ?? "brand"}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease }}
          className="relative"
        >
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/40 mb-5">
            {panel.eyebrow}
          </p>
          <h2 className="font-serif text-[clamp(2rem,2.8vw,2.6rem)] font-semibold leading-[1.1]
                         tracking-[-0.03em] text-white">
            {panel.headline}
          </h2>
          <p className="mt-5 text-[15px] leading-[1.65] text-white/50 max-w-[36ch]">
            {panel.subhead}
          </p>

          {/* Stats row */}
          <div className="mt-10 grid grid-cols-3 gap-6">
            {panel.stats.map((s) => (
              <div key={s.l}>
                <p className="text-[1.6rem] font-semibold tracking-[-0.03em] text-white leading-none">
                  {s.n}
                </p>
                <p className="mt-1 text-[11px] text-white/40">{s.l}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Testimonials at bottom */}
        <motion.div
          key={`testimonials-${audience ?? "brand"}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.4, ease }}
          className="relative space-y-5"
        >
          {panel.testimonials.map((t) => (
            <div
              key={t.author}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5"
            >
              <p className="text-[13px] leading-[1.6] text-white/70 italic">
                &ldquo;{t.quote}&rdquo;
              </p>
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
          <Link href="/" aria-label="Aplomb — home" className="text-[18px] text-[#111010]">
            <Logo />
          </Link>
        </div>

        <div className="w-full max-w-[400px]">{children}</div>
      </div>
    </div>
  );
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center bg-[#F7F6F3]">
          <p className="text-sm text-[#7A7773]">Loading…</p>
        </div>
      }
    >
      <AuthLayoutContent>{children}</AuthLayoutContent>
    </Suspense>
  );
}
