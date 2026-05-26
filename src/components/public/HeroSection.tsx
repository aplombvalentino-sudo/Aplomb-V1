"use client";

import Link from "next/link";
import { motion } from "motion/react";

const ease = [0.16, 1, 0.3, 1] as const;

export function HeroSection() {
  return (
    <section className="relative min-h-[100dvh] flex items-center bg-[#F7F6F3] overflow-hidden px-4 sm:px-6 lg:px-8">
      {/* Ambient radial glow — fixed, pointer-events-none */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 60% 40%, rgba(210,190,170,0.18) 0%, transparent 70%)",
        }}
      />

      <div className="mx-auto w-full max-w-7xl pt-28 pb-20 md:pt-36 md:pb-32">
        <div className="grid grid-cols-1 gap-16 md:grid-cols-[1fr_1fr] md:gap-12 lg:grid-cols-[5fr_4fr] lg:gap-20 items-center">

          {/* ── LEFT: editorial text block ── */}
          <div className="flex flex-col">

            {/* Eyebrow pill */}
            <motion.span
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease }}
              className="inline-flex self-start items-center rounded-full border border-black/10 bg-white/60
                         px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-[#6B6965]"
            >
              AI Fitting Room
            </motion.span>

            {/* H1 — serif editorial */}
            <motion.h1
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.08, ease }}
              className="mt-5 font-serif text-[clamp(2.6rem,5vw,4.5rem)] font-semibold leading-[1.08]
                         tracking-[-0.03em] text-[#111010]"
            >
              Your shoppers find{" "}
              <em className="not-italic text-[#4a3f35]">the perfect fit,</em>
              {" "}every time.
            </motion.h1>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease }}
              className="mt-7 max-w-[42ch] text-[17px] leading-[1.65] text-[#6B6965]"
            >
              Aplomb embeds an AI fitting room into your product pages.
              Shoppers get accurate size recommendations and complete outfit
              suggestions — reducing returns and increasing conversion.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.33, ease }}
              className="mt-10 flex flex-wrap items-center gap-3"
            >
              {/* Primary CTA — button-in-button */}
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href="/signup"
                  className="group inline-flex items-center gap-2.5 rounded-full bg-[#111010]
                             pl-6 pr-2.5 py-3 text-sm font-medium text-white
                             transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
                             hover:bg-[#2a2a2a]"
                >
                  Start for free
                  <span className="flex h-7 w-7 items-center justify-center rounded-full
                                   bg-white/[0.12] transition-all duration-500
                                   ease-[cubic-bezier(0.32,0.72,0,1)]
                                   group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:scale-105">
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                      <path d="M2.5 8.5L8.5 2.5M8.5 2.5H3.5M8.5 2.5V7.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                </Link>
              </motion.div>

              {/* Secondary CTA */}
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-2 rounded-full border border-black/[0.12]
                             bg-white/70 px-6 py-3 text-sm font-medium text-[#111010]
                             hover:bg-white transition-all duration-300"
                >
                  View pricing
                </Link>
              </motion.div>
            </motion.div>

            {/* Social proof micro-stat */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.55, ease }}
              className="mt-12 flex items-center gap-3"
            >
              <div className="flex -space-x-2">
                {[
                  { bg: "#C9A882", initials: "OM" },
                  { bg: "#8A7A6A", initials: "MT" },
                  { bg: "#6B5B4E", initials: "CB" },
                  { bg: "#4A3F35", initials: "HP" },
                ].map(({ bg, initials }, i) => (
                  <div
                    key={i}
                    className="h-7 w-7 rounded-full ring-2 ring-[#F7F6F3] flex items-center justify-center"
                    style={{ background: bg }}
                  >
                    <span className="text-[8px] font-semibold text-white/90 tracking-tight">{initials}</span>
                  </div>
                ))}
              </div>
              <p className="text-[12px] text-[#9C9894]">
                Trusted by <span className="text-[#6B6965] font-medium">147</span> fashion brands worldwide
              </p>
            </motion.div>
          </div>

          {/* ── RIGHT: widget mockup — double-bezel ── */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.18, ease }}
            className="hidden md:flex justify-center lg:justify-end"
          >
            {/* Outer shell */}
            <div className="relative rounded-[2rem] bg-black/[0.04] p-2 ring-1 ring-black/[0.06]
                            shadow-[0_8px_64px_-16px_rgba(0,0,0,0.12)]">
              {/* Inner core */}
              <div className="relative w-[320px] lg:w-[360px] overflow-hidden rounded-[calc(2rem-0.5rem)]
                              bg-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)]">

                {/* Mock header bar */}
                <div className="flex items-center justify-between border-b border-black/[0.06] px-5 py-4">
                  <span className="text-[13px] font-semibold text-[#111010]">AI Fitting Room</span>
                  <span className="rounded-full bg-[#EDF3EC] px-2.5 py-0.5 text-[10px] font-medium
                                   uppercase tracking-wide text-[#346538]">
                    Live
                  </span>
                </div>

                {/* Mock body */}
                <div className="px-5 py-5 space-y-4">
                  {/* Measurement progress */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-medium text-[#6B6965]">Body scan</span>
                      <span className="text-[11px] text-[#111010] font-semibold">94%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "94%" }}
                        transition={{ duration: 1.4, delay: 0.9, ease }}
                        className="h-full rounded-full bg-[#111010]"
                      />
                    </div>
                  </div>

                  {/* Measurement grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Chest", value: "92 cm" },
                      { label: "Waist", value: "74 cm" },
                      { label: "Hips", value: "98 cm" },
                      { label: "Inseam", value: "81 cm" },
                    ].map((m) => (
                      <div
                        key={m.label}
                        className="rounded-xl bg-[#F7F6F3] px-3.5 py-3"
                      >
                        <p className="text-[10px] text-[#9C9894] mb-0.5">{m.label}</p>
                        <p className="text-[14px] font-semibold text-[#111010]">{m.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Outfit recommendation */}
                  <div className="rounded-xl border border-black/[0.06] bg-[#F9F8F6] p-3.5">
                    <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#9C9894] mb-2.5">
                      Recommended outfit
                    </p>
                    <div className="flex items-center gap-3">
                      {/* Product swatch placeholders */}
                      <div className="flex gap-1.5">
                        {["#C9B8A8", "#8A7A6A", "#4A3F35"].map((c, i) => (
                          <div
                            key={i}
                            className="h-10 w-10 rounded-lg shadow-sm"
                            style={{ background: c }}
                          />
                        ))}
                      </div>
                      <div>
                        <p className="text-[12px] font-medium text-[#111010]">3-piece look</p>
                        <p className="text-[11px] text-[#9C9894]">Size M — 98% match</p>
                      </div>
                    </div>
                  </div>

                  {/* CTA */}
                  <button className="w-full rounded-xl bg-[#111010] py-3 text-[13px] font-medium
                                     text-white transition-opacity hover:opacity-80">
                    Shop this look
                  </button>
                </div>

                {/* Mock bottom bar */}
                <div className="border-t border-black/[0.06] px-5 py-3 flex items-center justify-center">
                  <span className="text-[10px] text-[#9C9894]">Powered by Aplomb AI</span>
                </div>
              </div>

              {/* Floating accent card — tucked at bottom-left of widget */}
              <motion.div
                initial={{ opacity: 0, x: 16, y: 8 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ duration: 0.8, delay: 0.65, ease }}
                className="absolute -bottom-4 -left-4 lg:-left-8 z-10 rounded-2xl bg-white
                           px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.1)] ring-1 ring-black/[0.05]"
              >
                <p className="text-[11px] font-medium text-[#111010]">Return rate</p>
                <p className="text-[22px] font-semibold text-[#111010] leading-tight">
                  −38%
                </p>
                <p className="text-[10px] text-[#9C9894]">avg. across brands</p>
              </motion.div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
