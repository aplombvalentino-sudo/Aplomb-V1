"use client";

import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";

/**
 * Aplomb logo system.
 *
 *  <Logo />                 → wordmark: "aplomb" (serif italic) + glowing dot
 *  <Logo variant="mark" />  → just the glowing accent dot (compact / loading)
 *
 * The wordmark text uses `currentColor`, so the parent controls its colour via
 * a text-* class. The dot is always the brand accent orange. This lets the same
 * component sit on light (#F7F6F3) or dark (#111010) surfaces unchanged.
 *
 * The dot keeps a static glow always; the pulse animation only runs when the
 * user hasn't requested reduced motion (WCAG 2.3.3).
 */

type LogoProps = {
  variant?: "wordmark" | "mark";
  /** Disable the pulsing glow (e.g. dense UI where motion would distract). */
  animated?: boolean;
  className?: string;
  /** Accessible label for the standalone mark. Defaults to "Aplomb". */
  label?: string;
};

export function Logo({
  variant = "wordmark",
  animated = true,
  className,
  label = "Aplomb",
}: LogoProps) {
  const reduce = useReducedMotion();
  const pulse = animated && !reduce;

  if (variant === "mark") {
    return (
      <span
        role="img"
        aria-label={label}
        className={cn("inline-flex items-center justify-center", className)}
      >
        <span
          aria-hidden
          className={cn(
            "block h-3 w-3 rounded-full aplomb-dot",
            pulse && "aplomb-dot--animated",
          )}
        />
      </span>
    );
  }

  // Wordmark
  return (
    <span
      className={cn(
        "inline-flex items-baseline font-serif italic font-semibold leading-none tracking-[-0.01em] select-none",
        className,
      )}
    >
      {/* Real text so screen readers announce the brand name */}
      <span>aplomb</span>
      {/* The period — rendered as the glowing accent dot. Scales with font size. */}
      <span
        aria-hidden
        className={cn(
          "ml-[0.06em] inline-block h-[0.18em] w-[0.18em] translate-y-[-0.02em] rounded-full aplomb-dot",
          pulse && "aplomb-dot--animated",
        )}
      />
    </span>
  );
}
