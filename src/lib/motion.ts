/**
 * Aplomb motion vocabulary — the single source of truth for animation.
 *
 * Pure presentation: no business logic, no data. Every consumer gates its
 * own motion on `useReducedMotion()`; these are the shared curves, durations
 * and variants so the whole app moves with one hand.
 *
 * Feel: calm, decelerating, editorial. Nothing jumps. Durations sit in the
 * 180–340ms band for interactions; entrances may run a touch longer.
 */
import type { Variants, Transition } from "motion/react";

export const duration = {
  fast: 0.18,
  base: 0.28,
  slow: 0.34,
  entrance: 0.6,
  reveal: 0.7,
} as const;

/** Standard decelerating ease. Used everywhere unless noted. */
export const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];
/** Gentle overshoot — modals, badges, small affordances that should feel alive. */
export const easeOvershoot: [number, number, number, number] = [0.34, 1.56, 0.64, 1];

export const spring = {
  gentle: { type: "spring", stiffness: 320, damping: 30 },
  snappy: { type: "spring", stiffness: 440, damping: 34 },
  soft: { type: "spring", stiffness: 210, damping: 24 },
} as const;

export const transition = {
  fast: { duration: duration.fast, ease },
  base: { duration: duration.base, ease },
  slow: { duration: duration.slow, ease },
} as const;

// ── Reusable entrance variants ──────────────────────────────────────────────

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: duration.slow, ease } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: duration.slow, ease } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: { duration: duration.base, ease } },
};

/** Editorial wipe — content reveals upward from a clipped baseline. */
export const clipReveal: Variants = {
  hidden: { opacity: 0, clipPath: "inset(100% 0% 0% 0%)", y: 14 },
  show: {
    opacity: 1,
    clipPath: "inset(0% 0% 0% 0%)",
    y: 0,
    transition: { duration: duration.reveal, ease },
  },
};

/** Container that sequences its children. Pair with a child variant below. */
export const staggerContainer = (
  staggerChildren = 0.08,
  delayChildren = 0,
): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren, delayChildren } },
});

/** Default child for a stagger container. */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: duration.slow, ease } },
};

// ── Page transitions (used by route-group template.tsx) ──────────────────────

export const pageVariants = {
  fade: {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: duration.slow, ease } },
  },
  shift: {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: duration.slow, ease } },
  },
  reveal: {
    hidden: { opacity: 0, clipPath: "inset(0% 0% 100% 0%)" },
    show: {
      opacity: 1,
      clipPath: "inset(0% 0% 0% 0%)",
      transition: { duration: duration.reveal, ease },
    },
  },
} satisfies Record<string, Variants>;

export type PageVariant = keyof typeof pageVariants;

// ── Interaction transitions (hover / tap), referenced by primitives ───────────

export const tapScale = 0.97;
export const hoverLift = -2;

export const overshoot: Transition = { duration: duration.base, ease: easeOvershoot };
