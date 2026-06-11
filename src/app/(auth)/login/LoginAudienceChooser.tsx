"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ease } from "@/lib/motion";

/**
 * First step of login: pick "I'm a brand" or "I'm a shopper". Mirrors
 * `src/app/(auth)/signup/AudienceChooser.tsx` — same two tiles, same
 * accent / dark visual variants — so the signup ↔ login UX feels
 * consistent. Routes the choice up to the parent via `onChoose`.
 *
 * The choice only affects the form's COPY (subtitle, placeholder, "no
 * account?" link). The post-login destination is data-driven from the
 * user's actual account type (brand membership in DB), not from the
 * chooser — a shopper who clicks "I'm a brand" still ends up on /app,
 * not /pro/dashboard. The chooser is only there so the form shows the
 * right headline + email placeholder + signup link.
 */
export function LoginAudienceChooser({
  onChoose,
}: {
  onChoose: (audience: "brand" | "client") => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease }}
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.08, ease }}
      >
        <h1 className="font-serif text-[2.2rem] font-medium leading-[1.05] tracking-[-0.02em] text-ink">
          Welcome <em className="italic">back</em>
          <span className="text-accent">.</span>
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Pick the account you&apos;re signing into.
        </p>
      </motion.div>

      {/* perspective-stage: the two tiles share one vanishing point for the
          slight rotateY on hover — they're card-objects, not buttons. */}
      <div className="perspective-stage mt-8 grid gap-3">
        <ChooserButton
          onClick={() => onChoose("brand")}
          delay={0.16}
          iconBg="bg-ink text-on-ink"
          title="Brand account"
          body="Sign in to manage your store — catalogue, sizing widget, fit sessions."
          icon={
            <>
              <path d="M3 7l7-4 7 4v10H3V7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M8 17v-5h4v5" stroke="currentColor" strokeWidth="1.5" />
            </>
          }
          accent="dark"
        />
        <ChooserButton
          onClick={() => onChoose("client")}
          delay={0.23}
          // stays white: champagne is a warm midtone in both themes
          iconBg="bg-champagne text-[#1d1a16]" /* dark glyph: champagne is a theme-invariant midtone; white was ~2.2:1 */
          title="Shopper account"
          body="Sign in to your digital wardrobe, outfits, and AI assistant."
          icon={
            <path
              d="M10 3l2.5 6H18l-5 4 2 6-5-3.5L5 19l2-6-5-4h5.5L10 3z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          }
          accent="gold"
        />
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="mt-7 text-sm text-ink-muted"
      >
        New to Aplomb?{" "}
        <Link href="/signup" className="font-medium text-ink hover:underline underline-offset-2">
          Create an account
        </Link>
      </motion.p>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Co-located tile — same shape as the signup ChooserButton.
// ─────────────────────────────────────────────────────────────────────────────

function ChooserButton({
  onClick,
  delay,
  iconBg,
  title,
  body,
  icon,
  accent,
}: {
  onClick: () => void;
  delay: number;
  iconBg: string;
  title: string;
  body: string;
  icon: React.ReactNode;
  accent: "dark" | "gold";
}) {
  const reduce = useReducedMotion();
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease }}
      // Scale-up ONLY: whileHover listens on this same element, so any hover
      // motion that can move the hit area out from under a stationary cursor
      // (translate, rotate) makes enter/leave flap and the button vibrates.
      // Growth keeps the cursor inside — structurally flap-free.
      whileHover={reduce ? undefined : { scale: 1.015 }}
      className={`group relative overflow-hidden rounded-2xl border p-5 text-left transition-all duration-300
                  ${
                    accent === "gold"
                      ? "border-champagne/40 bg-[var(--champagne-tint)] hover:border-champagne hover:shadow-float"
                      : "border-hairline bg-surface hover:border-ink/20 hover:shadow-float"
                  }`}
    >
      <div className="flex items-start gap-4">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
            {icon}
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold text-ink">{title}</p>
          <p className="mt-1 text-[13px] text-ink-muted leading-relaxed">{body}</p>
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          className={`mt-1 shrink-0 transition-all duration-200 group-hover:translate-x-1
                      ${accent === "gold" ? "text-champagne-deep" : "text-ink-subtle group-hover:text-ink"}`}
          aria-hidden
        >
          <path d="M5 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </motion.button>
  );
}
