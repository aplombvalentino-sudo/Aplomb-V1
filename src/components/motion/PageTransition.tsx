"use client";

import { motion, useReducedMotion } from "motion/react";
import { type ReactNode } from "react";
import { pageVariants, type PageVariant } from "@/lib/motion";

/**
 * Wraps a route's content so it animates in on navigation. Dropped into a
 * route group's `template.tsx`, which Next.js re-mounts on every navigation —
 * so the entrance replays while the surrounding layout (header / sidebar)
 * stays anchored. Enter-only by design; App Router unmounts the old tree
 * before the new one mounts, so exit choreography isn't reliable here.
 */
export function PageTransition({
  children,
  variant = "shift",
  className,
}: {
  children: ReactNode;
  variant?: PageVariant;
  className?: string;
}) {
  const reduce = useReducedMotion();

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={pageVariants[variant]}
      className={className}
      style={{ willChange: "opacity, transform" }}
    >
      {children}
    </motion.div>
  );
}
