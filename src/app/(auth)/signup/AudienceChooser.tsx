"use client";

import Link from "next/link";
import { motion } from "motion/react";

const ease = [0.16, 1, 0.3, 1] as const;

/**
 * First step of signup: pick "I'm a brand" or "I'm a shopper". Routes the
 * choice up to the parent via `onChoose` — no internal navigation, so the
 * page can decide whether to flip state or push a query param.
 */
export function AudienceChooser({
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
          How will you <em className="italic">use</em> Aplomb<span className="text-accent">?</span>
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Choose the right path — you can switch later.
        </p>
      </motion.div>

      <div className="mt-8 grid gap-3">
        <ChooserButton
          onClick={() => onChoose("brand")}
          delay={0.16}
          iconBg="bg-[#111010]"
          title="I'm a brand"
          body="Add Aplomb to your store. Upload size charts, embed the widget, see fit sessions."
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
          iconBg="bg-[#C9A882]"
          title="I'm a shopper"
          body="Find your perfect fit across brands, build your digital wardrobe."
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
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-ink hover:underline underline-offset-2">
          Sign in
        </Link>
      </motion.p>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Co-located tile used only by AudienceChooser above. Kept here (not exported)
// because it's a presentational helper, not a shared primitive.
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
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease }}
      whileHover={{ y: -2 }}
      className={`group relative overflow-hidden rounded-2xl border p-5 text-left transition-all duration-300
                  ${
                    accent === "gold"
                      ? "border-champagne/40 bg-[var(--champagne-tint)] hover:border-champagne hover:shadow-[0_10px_34px_-12px_rgba(182,146,106,0.30)]"
                      : "border-hairline bg-surface hover:border-ink/20 hover:shadow-[0_10px_34px_-16px_rgba(17,16,16,0.16)]"
                  }`}
    >
      <div className="flex items-start gap-4">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white ${iconBg}`}>
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
