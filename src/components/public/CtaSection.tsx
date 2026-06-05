"use client";

import Link from "next/link";
import { motion } from "motion/react";

const ease = [0.16, 1, 0.3, 1] as const;

export function CtaSection() {
  return (
    <section className="relative overflow-hidden border-t border-hairline bg-stone-deep px-4 py-28 sm:px-6 lg:px-8">
      <div className="relative mx-auto max-w-6xl">
        <div className="max-w-2xl">
          {/* Eyebrow */}
          <motion.span
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, ease }}
            className="inline-flex items-center rounded-full border border-hairline-strong
                       px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-ink-subtle"
          >
            Start your rotation
          </motion.span>

          {/* Heading */}
          <motion.h2
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.75, delay: 0.07, ease }}
            className="mt-5 font-serif text-[clamp(2rem,3.8vw,3.2rem)] font-medium leading-[1.08]
                       tracking-[-0.02em] text-ink"
          >
            Put your sneakers, hoodies and <em className="italic">fits</em> in one closet
            <span className="text-accent">.</span>
          </motion.h2>

          {/* Sub-copy */}
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, delay: 0.15, ease }}
            className="mt-5 text-[17px] leading-[1.6] text-ink-muted"
          >
            Free to start. Add 10 pieces, build your first fit, see your outfit
            before you change.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.26, ease }}
            className="mt-10 flex flex-wrap items-center gap-3"
          >
            {/* Primary — ink pill with terracotta arrow */}
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/signup?audience=client"
                className="group inline-flex items-center gap-2.5 rounded-full bg-ink
                           pl-6 pr-2.5 py-3 text-sm font-medium text-white
                           transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
                           hover:bg-[#2a2622]"
              >
                Start my rotation
                <span className="flex h-7 w-7 items-center justify-center rounded-full
                                 bg-accent aplomb-glow transition-all duration-500
                                 ease-[cubic-bezier(0.32,0.72,0,1)]
                                 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                    <path d="M2.5 8.5L8.5 2.5M8.5 2.5H3.5M8.5 2.5V7.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              </Link>
            </motion.div>

            {/* Secondary */}
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-full border border-hairline-strong
                         px-6 py-3 text-sm font-medium text-ink-muted
                         hover:text-ink hover:border-ink/30 transition-all duration-300"
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
          aria-hidden="true"
        >
          {[
            { stat: "10", label: "pieces free" },
            { stat: "5", label: "fit slots" },
            { stat: "0", label: "fitting rooms" },
          ].map((s) => (
            <div key={s.stat} className="text-right">
              <p className="font-serif text-[2rem] font-medium tracking-[-0.02em] text-ink leading-none">
                {s.stat}
              </p>
              <p className="mt-1 text-[12px] text-ink-subtle">{s.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
