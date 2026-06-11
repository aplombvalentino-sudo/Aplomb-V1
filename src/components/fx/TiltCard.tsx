"use client";

import { useRef, useCallback } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from "motion/react";
import { tilt, ease, duration } from "@/lib/motion";
import { cn } from "@/lib/cn";

/**
 * TiltCard — the app's single 3D-perspective primitive.
 *
 * Pointer-tracked rotateX/rotateY with spring smoothing, a soft lift shadow,
 * and an optional sheen sweep. Used for objects that map to "cards" in the
 * user's mental model: wardrobe items, outfit covers, pricing tiers, try-on
 * frames. NOT for nav, text blocks, or form fields — 3D is hierarchy, not
 * decoration.
 *
 * Usage:
 *   <div className="perspective-stage">       ← parent owns the vanishing point
 *     <TiltCard className="rounded-2xl …">…</TiltCard>
 *     <TiltCard …>…</TiltCard>
 *   </div>
 *
 * The parent-level perspective means sibling cards share one camera — tilting
 * reads as a coherent space instead of per-card gimmicks. When no
 * `perspective-stage` ancestor exists the rotation still renders (flat-ish);
 * add the stage class for full depth.
 *
 * Accessibility / perf:
 *   - `useReducedMotion()` disables ALL tilt + sheen (renders a plain div).
 *   - Pointer-only effect — touch devices never see half-stuck tilt states
 *     because we reset on pointer leave and ignore coarse pointers.
 *   - transform + opacity only; no layout-triggering properties.
 */
export function TiltCard({
  children,
  className,
  maxTilt = tilt.max,
  liftScale = tilt.hoverScale,
  sheen = false,
  disabled = false,
}: {
  children: React.ReactNode;
  className?: string;
  /** Max degrees of rotation at the card edges. Keep ≤ 7. */
  maxTilt?: number;
  /** Scale on hover — the lift toward the eye. 1 disables. */
  liftScale?: number;
  /** Adds a moving light sweep that follows the pointer. Use sparingly —
   *  at most one sheen group per view. */
  sheen?: boolean;
  /** Force-disable (e.g. while a card is in a selected/zoomed state). */
  disabled?: boolean;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  // Normalised pointer position over the card: -0.5 … 0.5 on both axes.
  const px = useMotionValue(0);
  const py = useMotionValue(0);

  const sx = useSpring(px, tilt.spring);
  const sy = useSpring(py, tilt.spring);

  const rotateY = useTransform(sx, [-0.5, 0.5], [-maxTilt, maxTilt]);
  const rotateX = useTransform(sy, [-0.5, 0.5], [maxTilt, -maxTilt]);

  // Sheen position tracks the raw (unsprung) pointer for immediacy.
  const sheenX = useTransform(px, [-0.5, 0.5], ["20%", "80%"]);
  const sheenY = useTransform(py, [-0.5, 0.5], ["20%", "80%"]);
  const sheenOpacity = useMotionValue(0);

  const handleMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType !== "mouse") return; // coarse pointers: skip tilt
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      px.set((e.clientX - rect.left) / rect.width - 0.5);
      py.set((e.clientY - rect.top) / rect.height - 0.5);
      sheenOpacity.set(1);
    },
    [px, py, sheenOpacity],
  );

  const handleLeave = useCallback(() => {
    px.set(0);
    py.set(0);
    sheenOpacity.set(0);
  }, [px, py, sheenOpacity]);

  if (reduce || disabled) {
    // Keep positioning parity with the animated path: callers rely on the
    // wrapper being `relative` for absolutely-positioned badges/chips.
    return <div className={cn("relative", className)}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      style={{ rotateX, rotateY }}
      whileHover={liftScale !== 1 ? { scale: liftScale } : undefined}
      transition={{ scale: { duration: duration.base, ease } }}
      className={cn(
        "preserve-3d relative will-change-transform",
        "hover:shadow-tilt transition-shadow duration-300",
        className,
      )}
    >
      {children}
      {sheen && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit]"
          style={{
            opacity: sheenOpacity,
            background: `radial-gradient(280px circle at ${"var(--sx)"} ${"var(--sy)"}, rgba(255,255,255,0.10), transparent 65%)`,
            // motion templates aren't string-interpolable into background
            // shorthand cleanly — drive via CSS vars instead:
            ["--sx" as string]: sheenX,
            ["--sy" as string]: sheenY,
            transition: `opacity ${duration.base * 1000}ms cubic-bezier(${ease.join(",")})`,
          }}
        />
      )}
    </motion.div>
  );
}
