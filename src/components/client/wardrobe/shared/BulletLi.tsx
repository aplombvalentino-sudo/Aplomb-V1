import type { ReactNode } from "react";

/**
 * Small `<li>` with a champagne dot bullet — used in wardrobe flow
 * helper-text lists (capture intro tips, selfie pose hints, etc.).
 *
 * Replaces the duplicated `Bullet` (capture flow) and `BulletLi`
 * (outfit builder) components — same markup, same class names, two
 * names. Picked `BulletLi` because it makes the element semantics
 * explicit at the call site ("this lives inside a `<ul>`").
 */
export function BulletLi({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 leading-relaxed">
      <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-champagne" />
      <span>{children}</span>
    </li>
  );
}
