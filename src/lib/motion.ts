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
  /** Camera-dolly page entrance (pageVariants.dolly). */
  dolly: 0.42,
  /** Detail-zoom entrance for hero objects (dollyDetail). */
  detail: 0.5,
  entrance: 0.6,
  reveal: 0.7,
} as const;

/** Standard decelerating ease. Used everywhere unless noted. */
export const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];
/** Gentle overshoot — modals, badges, small affordances that should feel alive. */
export const easeOvershoot: [number, number, number, number] = [0.34, 1.56, 0.64, 1];
/** Swift settle — the chrome curve (header pill, CTA arrows). Faster initial
 *  velocity than `ease`; reserved for navigation chrome, not content. */
export const easeSwift: [number, number, number, number] = [0.32, 0.72, 0, 1];

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
  /** Camera dolly — content starts a half-step back in Z (scale proxy) and
   *  settles forward. The default page entrance for the 3D-language app. */
  dolly: {
    hidden: { opacity: 0, scale: 0.988, y: 10 },
    show: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { duration: duration.dolly, ease },
    },
  },
} satisfies Record<string, Variants>;

export type PageVariant = keyof typeof pageVariants;

// ── Interaction transitions (hover / tap), referenced by primitives ───────────

export const tapScale = 0.97;
export const hoverLift = -2;

export const overshoot: Transition = { duration: duration.base, ease: easeOvershoot };

// ── 3D / perspective vocabulary ───────────────────────────────────────────────
//
// One shared set of numbers so every tilted card in the app moves in the same
// space. Tilt belongs on objects that map to "cards" in the user's mental
// model (wardrobe items, outfits, pricing tiers, try-on frames) — never on
// text blocks, nav, or form fields.

export const tilt = {
  /** Max rotation in degrees at the pointer extremes. Subtle by design —
   *  beyond ~7° cards read as toys, not objects. */
  max: 5,
  /** Hover scale paired with the tilt — the "lift toward the eye". */
  hoverScale: 1.02,
  /** MINIMUM hover Z-translate (px). TiltCard raises it per-card to clear the
   *  worst-case tilt excursion — required so the tilted card stays in front of
   *  its static listener plane and content remains clickable (3D hit-testing
   *  is depth-sorted in preserve-3d contexts). Needs a `perspective-stage`
   *  parent to read visually. */
  hoverZ: 24,
  /** Spring for pointer-tracked rotation. Slightly softer than `spring.gentle`
   *  so the card trails the cursor like a physical object with mass. */
  spring: { stiffness: 260, damping: 22, mass: 0.6 },
} as const;

/** Detail-zoom: a card "comes forward" into a detail view. Pair `dollyDetail`
 *  on the destination hero with reduced-opacity surroundings. The page-level
 *  dolly entrance lives in `pageVariants.dolly` (used by template.tsx files). */
export const dollyDetail: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 16 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: duration.detail, ease },
  },
};

/** Depth stagger for grids of tilted cards — children rise from a step back
 *  in Z with a per-index delay. Use with `staggerContainer()`. */
export const depthItem: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: duration.slow, ease },
  },
};
