"use client";

import { motion, useReducedMotion } from "motion/react";
import { type ReactNode } from "react";
import {
  clipReveal,
  fadeIn,
  fadeUp,
  scaleIn,
  staggerContainer,
  staggerItem,
} from "@/lib/motion";

const variantMap = {
  fadeUp,
  fadeIn,
  scaleIn,
  clipReveal,
} as const;

type RevealVariant = keyof typeof variantMap;

/**
 * Scroll-triggered entrance. Animates once when it enters the viewport.
 * Collapses to a plain wrapper under prefers-reduced-motion.
 */
export function Reveal({
  children,
  variant = "fadeUp",
  delay = 0,
  once = true,
  className,
}: {
  children: ReactNode;
  variant?: RevealVariant;
  delay?: number;
  once?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      variants={variantMap[variant]}
      initial="hidden"
      whileInView="show"
      viewport={{ once, margin: "-60px" }}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Sequences its children as they enter the viewport. Wrap each child in
 * <StaggerItem> (or supply elements that read the `show`/`hidden` variants).
 */
export function Stagger({
  children,
  gap = 0.08,
  delayChildren = 0,
  once = true,
  className,
}: {
  children: ReactNode;
  gap?: number;
  delayChildren?: number;
  once?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      variants={staggerContainer(gap, delayChildren)}
      initial="hidden"
      whileInView="show"
      viewport={{ once, margin: "-60px" }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div className={className} variants={staggerItem}>
      {children}
    </motion.div>
  );
}
