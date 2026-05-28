"use client";

import { cn } from "@/lib/cn";
import { forwardRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import { spring, tapScale } from "@/lib/motion";

type ButtonVariant = "primary" | "accent" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
};

const variantClasses: Record<ButtonVariant, string> = {
  // Ink ground with a terracotta bar that grows from centre on hover.
  primary: "bg-ink text-white hover:bg-[#2a2622]",
  // Full terracotta — reserved for the single most important action on a view.
  accent: "bg-accent text-white hover:bg-accent-bright",
  secondary:
    "bg-surface text-ink border border-hairline-strong hover:bg-surface-raised hover:border-ink/30",
  ghost: "bg-transparent text-ink-muted hover:text-ink hover:bg-ink/5",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-4 py-1.5 text-[13px]",
  md: "px-5 py-2.5 text-[14px]",
  lg: "px-7 py-3 text-[15px]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "md", loading, children, disabled, ...props },
    ref,
  ) => {
    const reduce = useReducedMotion();
    const interactive = !disabled && !loading;
    const lift = interactive && !reduce && (variant === "primary" || variant === "accent");

    return (
      <motion.button
        ref={ref}
        disabled={disabled || loading}
        whileHover={lift ? { scale: 1.02 } : undefined}
        whileTap={interactive && !reduce ? { scale: tapScale } : undefined}
        transition={spring.snappy}
        className={cn(
          "group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full font-medium",
          "focus:outline-none",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "transition-colors duration-200",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...(props as React.ComponentProps<typeof motion.button>)}
      >
        {loading && (
          <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-70" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
        {variant === "primary" && !reduce && (
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-0 left-1/2 h-[2px] w-1/2 -translate-x-1/2 origin-center scale-x-0 rounded-full bg-accent transition-transform duration-300 ease-out group-hover:scale-x-100"
          />
        )}
      </motion.button>
    );
  },
);
Button.displayName = "Button";
