"use client";

import Link from "next/link";
import { motion } from "motion/react";

const ease = [0.16, 1, 0.3, 1] as const;

export function CtaSection() {
  return (
    <section className="relative overflow-hidden bg-[#1C1915] px-4 py-28 sm:px-6 lg:px-8">
      {/* Gradient bridge — fades from canvas into the dark section */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-20"
        style={{ background: "linear-gradient(to bottom, #F7F6F3, transparent)" }}
      />
      {/* Radial glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 80% at 20% 50%, rgba(180,140,100,0.10) 0%, transparent 65%)",
        }}
      />

      <div className="relative mx-auto max-w-6xl">
        <div className="max-w-2xl">
          {/* Eyebrow */}
          <motion.span
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, ease }}
            className="inline-flex items-center rounded-full border border-white/[0.12]
                       px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-white/40"
          >
            147 brands already live
          </motion.span>

          {/* Heading */}
          <motion.h2
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.75, delay: 0.07, ease }}
            className="mt-5 font-serif text-[clamp(2rem,3.8vw,3.2rem)] font-semibold leading-[1.08]
                       tracking-[-0.03em] text-white"
          >
            Ready to reduce returns and boost conversion?
          </motion.h2>

          {/* Sub-copy */}
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, delay: 0.15, ease }}
            className="mt-5 text-[17px] leading-[1.6] text-white/50"
          >
            Set up Aplomb in under 30 minutes.
            No engineering team required.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.26, ease }}
            className="mt-10 flex flex-wrap items-center gap-3"
          >
            {/* Primary */}
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/signup"
                className="group inline-flex items-center gap-2.5 rounded-full bg-white
                           pl-6 pr-2.5 py-3 text-sm font-medium text-[#111010]
                           transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
                           hover:bg-[#F7F6F3]"
              >
                Start for free
                <span className="flex h-7 w-7 items-center justify-center rounded-full
                                 bg-black/[0.06] transition-all duration-500
                                 ease-[cubic-bezier(0.32,0.72,0,1)]
                                 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                    <path d="M2.5 8.5L8.5 2.5M8.5 2.5H3.5M8.5 2.5V7.5" stroke="#111010" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              </Link>
            </motion.div>

            {/* Secondary */}
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-full border border-white/[0.14]
                         px-6 py-3 text-sm font-medium text-white/70
                         hover:text-white hover:border-white/25 transition-all duration-300"
            >
              View pricing
            </Link>
          </motion.div>
        </div>

        {/* Decorative right stats */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.75, delay: 0.3, ease }}
          className="absolute right-0 top-1/2 -translate-y-1/2 hidden lg:flex flex-col gap-4"
        >
          {[
            { stat: "−38%", label: "avg. return rate" },
            { stat: "+22%", label: "conversion uplift" },
            { stat: "10 min", label: "to go live" },
          ].map((s) => (
            <div key={s.stat} className="text-right">
              <p className="text-[2rem] font-semibold tracking-[-0.03em] text-white leading-none">
                {s.stat}
              </p>
              <p className="mt-1 text-[12px] text-white/40">{s.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
