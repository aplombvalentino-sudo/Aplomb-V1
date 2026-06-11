"use client";

import { motion, useReducedMotion } from "motion/react";
import { dollyDetail } from "@/lib/motion";

/**
 * Confirmation card for /checkout/success — the one piece of motion on the
 * page: a single dollyDetail entrance (card settles forward from a half-step
 * back in Z). Reduced-motion users get the card with no animation.
 */
export function SuccessCard({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  const className =
    "rounded-3xl border border-hairline bg-surface px-8 py-12 shadow-card text-center";

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      variants={dollyDetail}
      initial="hidden"
      animate="show"
      className={className}
    >
      {children}
    </motion.div>
  );
}
