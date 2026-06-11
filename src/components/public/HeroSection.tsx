"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { TiltCard } from "@/components/fx/TiltCard";
import { ease } from "@/lib/motion";

export function HeroSection() {
  // Respect the OS "reduce motion" setting (WCAG 2.3.3). When true, we skip
  // every enter animation by passing initial={false} so content renders in
  // its final position with no transform/opacity tween.
  const reduce = useReducedMotion();

  /** Helper: returns the `initial` prop, or `false` to disable the animation. */
  const enter = (value: Record<string, number>) => (reduce ? false : value);

  return (
    <section className="relative min-h-[100dvh] flex items-center bg-canvas overflow-hidden px-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl pt-28 pb-20 md:pt-36 md:pb-32">
        <div className="grid grid-cols-1 gap-16 md:grid-cols-[1fr_1fr] md:gap-12 lg:grid-cols-[5fr_4fr] lg:gap-20 items-center">

          {/* ── LEFT: editorial text block ── */}
          <div className="flex flex-col">

            {/* Eyebrow pill — wardrobe-first positioning */}
            <motion.span
              initial={enter({ opacity: 0, y: 16 })}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease }}
              className="inline-flex self-start items-center rounded-full border border-hairline bg-surface/60
                         px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-ink-muted"
            >
              Digital Wardrobe
            </motion.span>

            {/* H1 — digital wardrobe + try-outfits-on-yourself promise */}
            <motion.h1
              initial={enter({ opacity: 0, y: 32 })}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.08, ease }}
              className="mt-5 font-serif text-[clamp(2.6rem,5.2vw,4.6rem)] font-medium leading-[1.06]
                         tracking-[-0.02em] text-ink"
            >
              Build your digital <em className="italic">wardrobe</em> and try new outfits on yourself<span className="text-accent">.</span>
            </motion.h1>

            {/* Subhero — broad wardrobe vocabulary */}
            <motion.p
              initial={enter({ opacity: 0, y: 20 })}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease }}
              className="mt-7 max-w-[46ch] text-[17px] leading-[1.65] text-ink-muted"
            >
              Add the clothes you already own, mix them with certified brand
              pieces, and explore new combinations without changing.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={enter({ opacity: 0, y: 16 })}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.33, ease }}
              className="mt-10 flex flex-wrap items-center gap-3"
            >
              {/* Primary CTA — "Start my wardrobe" */}
              <motion.div whileHover={reduce ? undefined : { scale: 1.02 }} whileTap={reduce ? undefined : { scale: 0.97 }}>
                <Link
                  href="/signup?audience=client"
                  className="group inline-flex items-center gap-2.5 rounded-full bg-ink
                             pl-6 pr-2.5 py-3 text-sm font-medium text-on-ink
                             transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
                             hover:bg-ink/90
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
                >
                  Start my wardrobe
                  <span className="flex h-7 w-7 items-center justify-center rounded-full
                                   bg-accent aplomb-glow transition-all duration-500
                                   ease-[cubic-bezier(0.32,0.72,0,1)]
                                   group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:scale-105">
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
                      <path d="M2.5 8.5L8.5 2.5M8.5 2.5H3.5M8.5 2.5V7.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                </Link>
              </motion.div>

              {/* Secondary CTA */}
              <motion.div whileHover={reduce ? undefined : { scale: 1.02 }} whileTap={reduce ? undefined : { scale: 0.97 }}>
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-2 rounded-full border border-hairline-strong
                             bg-surface/70 px-6 py-3 text-sm font-medium text-ink
                             hover:bg-surface transition-all duration-300
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
                >
                  View pricing
                </Link>
              </motion.div>
            </motion.div>

            {/* Social proof micro-stat — repositioned for shopper-first */}
            <motion.div
              initial={enter({ opacity: 0 })}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.55, ease }}
              className="mt-12 flex items-center gap-3"
            >
              {/* Decorative avatar cluster — not announced to screen readers */}
              <div className="flex -space-x-2" aria-hidden="true">
                {[
                  { bg: "#C9A882", initials: "OM" },
                  { bg: "#8A7A6A", initials: "MT" },
                  { bg: "#6B5B4E", initials: "CB" },
                  { bg: "#4A3F35", initials: "HP" },
                ].map(({ bg, initials }, i) => (
                  <div
                    key={i}
                    className="h-7 w-7 rounded-full ring-2 ring-canvas flex items-center justify-center"
                    style={{ background: bg }}
                  >
                    <span className="text-[8px] font-semibold text-white/90 tracking-tight">{initials}</span>
                  </div>
                ))}
              </div>
              <p className="text-[12px] text-ink-muted">
                Your clothes and certified brand pieces, all in one digital closet.
              </p>
            </motion.div>
          </div>

          {/* ── RIGHT: wardrobe mockup — reframed around the new product ── */}
          {/* Replaces the prior body-scan/measurements mock. Shows a personal
              digital closet: mix of personal photo items + certified brand
              items + a "Build outfit" CTA. */}
          <motion.div
            initial={enter({ opacity: 0, y: 40 })}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.18, ease }}
            className="perspective-stage flex justify-center lg:justify-end"
            aria-hidden="true"
          >
            <div className="relative preserve-3d">
              {/* Soft background plane — a step back in Z so the mock reads as a
                  physical object floating over the canvas. */}
              <div
                aria-hidden
                className="absolute -right-5 -bottom-4 left-8 top-10 rounded-[2.5rem]
                           bg-stone/60 rotate-[1.5deg]"
              />

              {/* The mock is the page's single sheen group. */}
              <TiltCard sheen className="rounded-[2rem] shadow-card">
            {/* Outer shell */}
            <div className="relative rounded-[2rem] bg-ink/[0.04] p-2 ring-1 ring-ink/[0.06]">
              {/* Inner core */}
              <div className="relative w-[min(320px,80vw)] sm:w-[320px] lg:w-[360px] overflow-hidden rounded-[calc(2rem-0.5rem)]
                              bg-surface">

                {/* Mock header bar */}
                <div className="flex items-center justify-between border-b border-ink/[0.06] px-5 py-4">
                  <span className="text-[13px] font-semibold text-ink">My wardrobe</span>
                  <span className="text-[10px] font-medium text-ink-muted">
                    7 / 10 items
                  </span>
                </div>

                {/* Mock body — wardrobe grid */}
                <div className="px-5 py-5 space-y-4">
                  {/* Two-row 3-col mini grid representing the closet. Each tile
                      is either a CERTIFIED swatch (with brand stripe) or a
                      PERSONAL photo item (with "Mine" pill in the corner). */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { bg: "#C9B8A8", kind: "certified" },
                      { bg: "#4A3F35", kind: "mine" },
                      { bg: "#8A7A6A", kind: "certified" },
                      { bg: "#D9CFC2", kind: "mine" },
                      { bg: "#6B5B4E", kind: "certified" },
                      { bg: "#A89888", kind: "mine" },
                    ].map((tile, i) => (
                      <div
                        key={i}
                        className="relative aspect-square rounded-lg shadow-sm overflow-hidden"
                        style={{ background: tile.bg }}
                      >
                        {tile.kind === "mine" && (
                          // stays white: sits on imagery (tile swatch), not on a theme surface
                          <span
                            className="absolute top-1 right-1 rounded-full bg-white/95 px-1.5 py-0.5
                                       text-[8px] font-semibold uppercase tracking-[0.08em] text-[#111010]"
                          >
                            Mine
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Today's-outfit strip — composed from items above */}
                  <div className="rounded-xl border border-ink/[0.06] bg-surface-raised p-3.5">
                    <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-ink-muted mb-2.5">
                      Today&apos;s outfit
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-1.5">
                        {["#C9B8A8", "#4A3F35", "#8A7A6A"].map((c, i) => (
                          <div
                            key={i}
                            className="h-9 w-9 rounded-lg ring-2 ring-surface-raised shadow-sm"
                            style={{ background: c }}
                          />
                        ))}
                      </div>
                      <div>
                        <p className="text-[12px] font-medium text-ink">Sunday brunch</p>
                        <p className="text-[11px] text-ink-muted">Mine + Atelier Verdú</p>
                      </div>
                    </div>
                  </div>

                  {/* CTA — sends visitors into the shopper signup flow */}
                  <Link
                    href="/signup?audience=client"
                    className="block text-center w-full rounded-xl bg-ink py-3 text-[13px] font-medium
                               text-on-ink transition-opacity hover:opacity-80"
                    tabIndex={-1}
                  >
                    Try this outfit on me
                  </Link>
                </div>

                {/* Mock bottom bar */}
                <div className="border-t border-ink/[0.06] px-5 py-3 flex items-center justify-center">
                  <span className="text-[10px] text-ink-muted">Powered by Aplomb</span>
                </div>
              </div>

            </div>
              </TiltCard>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
