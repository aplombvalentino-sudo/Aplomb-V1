"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { TiltCard } from "@/components/fx/TiltCard";
import { ease } from "@/lib/motion";
import type { Plan } from "./plans";

/**
 * One plan tile. Three rendering modes for the price slot:
 *   - "Custom"            → "Custom" wordmark (no €, no period)
 *   - priceBadge present  → big badge in #346538 (the FREE green — see CLAUDE.md;
 *                           do not "correct" this to ink), optional strikethrough
 *   - numeric             → €{price}{period}
 *
 * Layout invariants (anti-slop): the price slot and description carry
 * min-heights so the feature lists start at the same Y across all three
 * tiers, and the CTA is pinned to the card bottom via mt-auto.
 */
export function PlanCard({ plan, i }: { plan: Plan; i: number }) {
  return (
    <motion.div
      custom={i}
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: i * 0.08, ease }}
      className="group h-full preserve-3d"
    >
      {/* Pricing tiers are objects → they tilt. No sheen on pricing tiers. Highlighted tier rests a step closer
          to the eye: shadow-float at rest + a slightly stronger lift. */}
      <TiltCard
        liftScale={plan.highlight ? 1.025 : undefined}
        className={`h-full rounded-[2rem] ${plan.highlight ? "shadow-float" : ""}`}
      >
        <div
          className={`h-full rounded-[2rem] p-2 ring-1
                      ${plan.highlight
                        ? "bg-[var(--accent-tint)] ring-accent/30"
                        : "bg-ink/[0.02] ring-hairline"
                      }`}
        >
          <div className="h-full rounded-[calc(2rem-0.5rem)] p-7 flex flex-col bg-surface">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-subtle">
                {plan.name}
              </span>
              {plan.highlight && (
                <span className="font-serif text-[12px] italic tracking-[0.02em] text-accent">
                  most chosen
                </span>
              )}
            </div>

            {/* Price slot — min-h equalises the three render modes so the
                description (and the feature list below) starts at one Y. */}
            <div className="mt-5 flex min-h-[3.5rem] items-baseline gap-2 flex-wrap">
              {plan.price === "Custom" ? (
                <span className="font-serif text-4xl font-medium tracking-[-0.02em] text-ink">
                  Custom
                </span>
              ) : plan.priceBadge ? (
                <>
                  {plan.originalPrice && (
                    <span className="font-serif text-[1.8rem] font-medium tracking-tight nums
                                     line-through decoration-[1.5px] text-ink-subtle/60 decoration-ink-subtle/50">
                      €{plan.originalPrice}
                    </span>
                  )}
                  <span className="font-serif text-[3.2rem] font-medium leading-none tracking-[-0.03em]
                                   text-[#346538] dark:text-[#4E9D59]">
                    {plan.priceBadge}
                  </span>
                </>
              ) : (
                <>
                  <span className="self-start mt-2 text-[1.1rem] font-medium nums text-ink-subtle">
                    €
                  </span>
                  <span className="font-serif text-[3.5rem] font-medium leading-none tracking-[-0.03em] nums text-ink">
                    {plan.price}
                  </span>
                  <span className="mb-1 self-end text-sm text-ink-subtle">
                    {plan.period}
                  </span>
                </>
              )}
            </div>

            <p className="mt-3 min-h-[2.875rem] text-sm leading-relaxed text-ink-muted">
              {plan.description}
            </p>

            <div className="my-6 h-px bg-hairline" />

            <ul className="space-y-3">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm">
                  <svg
                    className={`mt-0.5 h-4 w-4 flex-shrink-0 ${plan.highlight ? "text-accent" : "text-ink-subtle"}`}
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden
                  >
                    <path
                      d="M3 8l3.5 3.5L13 5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="text-ink-muted">{f}</span>
                </li>
              ))}
            </ul>

            {/* CTA — pinned to the card bottom so the three tiers' buttons
                share one baseline regardless of feature-list length.

                NO hover/tap SCALE here: this button lives inside a TiltCard,
                which continuously repositions it under the cursor as the card
                tilts. A hover-scale on the button (the element that also
                listens for the hover) would toggle on/off as the tilt slides
                its edge past a stationary cursor — the button vibrates and
                eats clicks. The card's tilt+lift is the hover feedback; the
                button keeps its colour-shift + arrow-slide. Press feedback is
                a CSS `active:` scale, which can't flap (the pointer is held
                down while it applies). */}
            <div className="mt-auto pt-8">
              <Link
                href={plan.href}
                className={`group/btn inline-flex w-full items-center justify-between
                            rounded-full px-5 py-3 text-sm font-medium
                            transition-all duration-300 active:scale-[0.98]
                            ${plan.highlight
                              ? "bg-accent text-white hover:bg-accent-bright"
                              : "bg-ink text-on-ink hover:bg-ink/90"
                            }`}
              >
                {plan.cta}
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full
                              transition-all duration-300
                              group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5
                              ${plan.highlight ? "bg-white/20" : "bg-accent aplomb-glow"}`}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
                    <path
                      d="M2 8L8 2M8 2H3M8 2V7"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </Link>
            </div>
          </div>
        </div>
      </TiltCard>
    </motion.div>
  );
}
