import { cn } from "@/lib/cn";

/**
 * Aplomb logo system.
 *
 *  <Logo />                 → wordmark: "aplomb" (Fraunces italic) + the period
 *  <Logo variant="mark" />  → just the period as a standalone mark (compact)
 *
 * The wordmark text uses `currentColor`, so the parent controls its colour via
 * a text-* class. The period is always crisp terracotta — it is the signature,
 * and the brief asks for it sharp: no glow, no gradient.
 */

type LogoProps = {
  variant?: "wordmark" | "mark";
  className?: string;
  /** Accessible label for the standalone mark. Defaults to "Aplomb". */
  label?: string;
};

export function Logo({ variant = "wordmark", className, label = "Aplomb" }: LogoProps) {
  if (variant === "mark") {
    return (
      <span
        role="img"
        aria-label={label}
        className={cn("inline-flex items-center justify-center", className)}
      >
        <span aria-hidden className="block h-3 w-3 rounded-full aplomb-dot aplomb-glow" />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-baseline font-serif italic font-semibold leading-none tracking-[-0.01em] select-none",
        className,
      )}
    >
      {/* Real text so screen readers announce the brand name */}
      <span>aplomb</span>
      {/* The period — a crisp terracotta dot. Scales with font size. */}
      <span
        aria-hidden
        className="ml-[0.05em] inline-block h-[0.16em] w-[0.16em] translate-y-[-0.01em] rounded-full aplomb-dot aplomb-glow"
      />
    </span>
  );
}
