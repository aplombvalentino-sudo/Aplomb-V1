"use client";

import { motion, useReducedMotion } from "motion/react";
import { type ReactNode } from "react";

interface FadeUpProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

const ease = [0.16, 1, 0.3, 1] as const;

export function FadeUp({ children, delay = 0, className }: FadeUpProps) {
  const reduce = useReducedMotion();

  // When the user prefers reduced motion, render content in place with no
  // transform/opacity tween (WCAG 2.3.3).
  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.65, delay, ease }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
