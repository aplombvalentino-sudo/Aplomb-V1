"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, MotionConfig } from "motion/react";
import { Logo } from "@/components/brand/Logo";
import { TiltCard } from "@/components/fx/TiltCard";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { ease } from "@/lib/motion";

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
};

const BRAND_PANEL: PanelContent = {
  eyebrow: "AI Fitting Room",
  headline: "The fitting room your brand always needed.",
  subhead:
    "AI body measurements, personalized outfit recommendations, and zero friction for your shoppers.",
  stats: brandStats,
  testimonials: brandTestimonials,
};

const CLIENT_PANEL: PanelContent = {
  eyebrow: "Your AI Fitting Room",
  headline: "Find your perfect fit. Anywhere.",
  subhead:
    "One body scan. Every brand. Save the looks you love and shop with confidence — no more returns.",
  stats: clientStats,
  testimonials: clientTestimonials,
};

// ─── Layout ─────────────────────────────────────────────────────────────────

function AuthLayoutContent({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const audience = searchParams.get("audience");
  const panel = audience === "client" ? CLIENT_PANEL : BRAND_PANEL;

  return (
    <div className="flex min-h-[100dvh] bg-canvas">
      {/* ── LEFT: editorial panel (desktop only) ── */}
      <div className="relative hidden lg:flex lg:w-[44%] xl:w-[40%] flex-col justify-between
                      border-r border-hairline bg-stone px-12 py-12 overflow-hidden">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
        >
          <Link
            href="/"
            aria-label="Aplomb — home"
            className="text-[18px] text-ink hover:opacity-70 transition-opacity"
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
          <p className="mb-5 text-[10px] font-medium uppercase tracking-[0.2em] text-accent">
            {panel.eyebrow}
          </p>
          <h2 className="font-serif italic text-[clamp(2.1rem,3vw,2.9rem)] font-medium leading-[1.08]
                         tracking-[-0.02em] text-ink">
            {panel.headline}
          </h2>
          <p className="mt-5 max-w-[36ch] text-[15px] leading-[1.65] text-ink-muted">
            {panel.subhead}
          </p>

          {/* Stats row */}
          <div className="mt-10 grid grid-cols-3 gap-6">
            {panel.stats.map((s) => (
              <div key={s.l}>
                <p className="nums text-[1.6rem] font-semibold tracking-[-0.03em] text-ink leading-none">
                  {s.n}
                </p>
                <p className="mt-1 text-[11px] text-ink-subtle">{s.l}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Testimonials at bottom — a layered paper stack. The lead card is
            the ONE 3D object on the auth screen (TiltCard, subtle, no sheen);
            offset stone-deep planes behind it give the panel real depth. */}
        <motion.div
          key={`testimonials-${audience ?? "brand"}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.4, ease }}
          className="perspective-stage relative space-y-5"
        >
          {panel.testimonials.map((t, i) =>
            i === 0 ? (
              <div key={t.author} className="relative preserve-3d">
                {/* Offset planes — two quiet steps back into the page */}
                <div
                  aria-hidden
                  className="absolute -left-2.5 top-2.5 h-full w-full rounded-2xl bg-stone-deep/60"
                />
                <div
                  aria-hidden
                  className="absolute -left-1 top-1 h-full w-full rounded-2xl bg-stone-deep"
                />
                <TiltCard
                  maxTilt={3}
                  className="rounded-2xl border border-hairline bg-surface p-5 shadow-card"
                >
                  <p className="font-serif text-[14px] italic leading-[1.6] text-ink/80">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <p className="mt-3 text-[11px] text-ink-subtle">
                    {t.author} — <span className="text-ink-subtle/70">{t.brand}</span>
                  </p>
                </TiltCard>
              </div>
            ) : (
              <div
                key={t.author}
                className="rounded-2xl border border-hairline bg-surface/70 p-5"
              >
                <p className="font-serif text-[14px] italic leading-[1.6] text-ink/80">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <p className="mt-3 text-[11px] text-ink-subtle">
                  {t.author} — <span className="text-ink-subtle/70">{t.brand}</span>
                </p>
              </div>
            ),
          )}
        </motion.div>
      </div>

      {/* ── RIGHT: form area ── */}
      <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-8">
        {/* Theme preference — quiet, top-right of the form column */}
        <div className="absolute right-4 top-4 sm:right-8 sm:top-8">
          <ThemeToggle />
        </div>

        {/* Mobile logo */}
        <div className="mb-8 self-start lg:hidden">
          <Link href="/" aria-label="Aplomb — home" className="text-[18px] text-ink">
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
    // `reducedMotion="user"` makes every motion/react animation in the login
    // and signup flows honour prefers-reduced-motion without per-component
    // useReducedMotion() guards. The CSS catch-all in globals.css can't reach
    // JS-driven motion, so this is the one place that does for this subtree.
    <MotionConfig reducedMotion="user">
      <Suspense
      fallback={
        // Skeleton mirrors the real layout: stone panel left, form column right.
        <div className="flex min-h-[100dvh] bg-canvas">
          <span className="sr-only">Loading…</span>
          <div
            aria-hidden
            className="hidden lg:block lg:w-[44%] xl:w-[40%] border-r border-hairline bg-stone"
          />
          <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-8">
            <div aria-hidden className="w-full max-w-[400px]">
              <div className="h-10 w-3/4 animate-pulse rounded-lg bg-stone" />
              <div className="mt-3 h-4 w-1/2 animate-pulse rounded bg-stone" />
              <div className="mt-8 space-y-4">
                <div className="h-12 animate-pulse rounded-xl bg-stone" />
                <div className="h-12 animate-pulse rounded-xl bg-stone" />
                <div className="mt-2 h-11 animate-pulse rounded-full bg-stone-deep" />
              </div>
            </div>
          </div>
        </div>
      }
    >
        <AuthLayoutContent>{children}</AuthLayoutContent>
      </Suspense>
    </MotionConfig>
  );
}
