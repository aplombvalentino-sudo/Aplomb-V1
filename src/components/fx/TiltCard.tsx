"use client";

import { useRef, useCallback } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from "motion/react";
import { tilt } from "@/lib/motion";
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
 * Structural invariant — LISTENER ≠ TRANSFORMER:
 *   The outer wrapper owns every pointer event and NEVER transforms; the
 *   inner element does all the visuals (tilt, lift scale, shadow, sheen).
 *   If one element does both, its hit geometry shifts as it tilts/scales
 *   and the browser fires pointerleave under a stationary cursor →
 *   leave resets the card → cursor is back inside → pointerenter → the
 *   card vibrates forever near edges and never holds a tilt. For the same
 *   reason, never reintroduce `whileHover` here — it listens on the
 *   transforming element. The lift scale is driven from the wrapper's
 *   enter/leave instead.
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
  // The static listening surface. Its hit geometry never changes, so the
  // rect below stays valid for a whole hover session — caching it is a
  // perf nicety here (one layout query per hover), not a correctness fix.
  const wrapRef = useRef<HTMLDivElement>(null);
  const rectRef = useRef<DOMRect | null>(null);

  // Normalised pointer position over the card: -0.5 … 0.5 on both axes.
  const px = useMotionValue(0);
  const py = useMotionValue(0);

  const sx = useSpring(px, tilt.spring);
  const sy = useSpring(py, tilt.spring);

  const rotateY = useTransform(sx, [-0.5, 0.5], [-maxTilt, maxTilt]);
  const rotateX = useTransform(sy, [-0.5, 0.5], [maxTilt, -maxTilt]);

  // Hover lift, spring-driven from the wrapper's enter/leave — replaces
  // `whileHover`, which would listen on the transforming element (see the
  // structural invariant in the header comment).
  const scale = useSpring(1, tilt.spring);

  // Hover Z-lift. Load-bearing for CLICKS, not just looks: in a preserve-3d
  // context the browser hit-tests in 3D depth order, and the tilt is a
  // "press down" — the region under the cursor rotates BEHIND the static
  // wrapper's z=0 plane, so the transparent wrapper would swallow every
  // click on the card's content. Lifting the card further forward than its
  // worst-case tilt excursion (set per-card in handleEnter) keeps all of it
  // in front of the listener plane, so buttons/links inside stay clickable.
  const z = useSpring(0, tilt.spring);

  const zLiftFor = useCallback(
    (rect: DOMRect) =>
      Math.max(
        tilt.hoverZ,
        // Max corner excursion: both axes at maxTilt, corner at (w/2, h/2).
        Math.sin((maxTilt * Math.PI) / 180) * ((rect.width + rect.height) / 2) + 6,
      ),
    [maxTilt],
  );

  // Sheen position tracks the raw (unsprung) pointer for immediacy.
  const sheenX = useTransform(px, [-0.5, 0.5], ["20%", "80%"]);
  const sheenY = useTransform(py, [-0.5, 0.5], ["20%", "80%"]);
  const sheenOpacity = useMotionValue(0);
  const smoothSheenOpacity = useSpring(sheenOpacity, { stiffness: 320, damping: 34 });

  // True between pointerdown and pointerup. While pressed we FREEZE the tilt
  // so the click target can't move — see handlePress.
  const pressedRef = useRef(false);

  const handleEnter = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType !== "mouse") return; // coarse pointers: skip tilt
      const rect = wrapRef.current?.getBoundingClientRect() ?? null;
      rectRef.current = rect;
      if (rect) z.set(zLiftFor(rect));
      if (liftScale !== 1) scale.set(liftScale);
    },
    [liftScale, scale, z, zLiftFor],
  );

  // On press, settle every spring to its CURRENT on-screen value and stop
  // tracking the pointer until release. Why this is load-bearing for clicks:
  // a browser only fires a `click` if pointerdown and pointerup land on the
  // same element. While the card is springing toward the cursor, the button
  // under the finger keeps moving, so a real (mid-animation) left-click lands
  // its down and up on different elements → NO click fires and the button
  // silently does nothing, even though right-click → "open link" works (that
  // reads the <a href> directly). Freezing the transform for the ~100ms of a
  // press holds the target still so the click registers.
  const handlePress = useCallback(() => {
    pressedRef.current = true;
    px.set(sx.get());
    py.set(sy.get());
    scale.set(scale.get());
    z.set(z.get());
  }, [px, py, sx, sy, scale, z]);

  const endPress = useCallback(() => {
    pressedRef.current = false;
  }, []);

  const clamp = (v: number) => Math.max(-0.5, Math.min(0.5, v));

  const handleMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType !== "mouse") return;
      if (pressedRef.current) return; // frozen during a press so clicks land
      // Late-cache for the edge case where enter fired before hydration.
      if (!rectRef.current) {
        rectRef.current = wrapRef.current?.getBoundingClientRect() ?? null;
        if (!rectRef.current) return;
        z.set(zLiftFor(rectRef.current)); // keep clicks alive on this path too
      }
      const rect = rectRef.current;
      px.set(clamp((e.clientX - rect.left) / rect.width - 0.5));
      py.set(clamp((e.clientY - rect.top) / rect.height - 0.5));
      sheenOpacity.set(1);
    },
    [px, py, sheenOpacity, z, zLiftFor],
  );

  const handleLeave = useCallback(() => {
    rectRef.current = null; // re-measure next session (layout may shift)
    pressedRef.current = false;
    px.set(0);
    py.set(0);
    scale.set(1);
    z.set(0);
    sheenOpacity.set(0);
  }, [px, py, scale, z, sheenOpacity]);

  if (reduce || disabled) {
    // Keep positioning parity with the animated path: callers rely on the
    // wrapper being `relative` for absolutely-positioned badges/chips.
    return <div className={cn("relative", className)}>{children}</div>;
  }

  return (
    <div
      ref={wrapRef}
      onPointerEnter={handleEnter}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      onPointerDown={handlePress}
      onPointerUp={endPress}
      onPointerCancel={endPress}
      // preserve-3d: keep the ancestor stage's perspective flowing through
      // this extra layer to the transforming child. h-full: stretch in
      // equal-height columns (resolves to auto elsewhere — harmless).
      className="group/tilt preserve-3d relative h-full"
    >
      <motion.div
        style={{ rotateX, rotateY, scale, z }}
        className={cn(
          "preserve-3d relative h-full will-change-transform",
          "transition-shadow duration-300 group-hover/tilt:shadow-tilt",
          className,
        )}
      >
        {children}
        {sheen && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[inherit]"
            style={{
              opacity: smoothSheenOpacity,
              background: `radial-gradient(280px circle at ${"var(--sx)"} ${"var(--sy)"}, rgba(255,255,255,0.10), transparent 65%)`,
              // motion templates aren't string-interpolable into background
              // shorthand cleanly — drive via CSS vars instead:
              ["--sx" as string]: sheenX,
              ["--sy" as string]: sheenY,
            }}
          />
        )}
      </motion.div>
    </div>
  );
}
