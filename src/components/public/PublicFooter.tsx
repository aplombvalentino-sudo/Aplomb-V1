import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

// Trimmed during the SEO audit: removed the Company column (About / Blog /
// Careers all linked to `#`), the dead "Cookie policy" link in Legal (folded
// into /privacy), and the placeholder Twitter / LinkedIn icons. We'll add
// them back the moment they exist — dead trust signals are worse than missing
// ones.
const productLinks = [
  { label: "Features", href: "/#features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Widget demo", href: "/widget?brand=demo-brand" },
];

const legalLinks = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/cgu" },
];

export function PublicFooter() {
  return (
    <footer className="border-t border-ink/[0.07] bg-canvas">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Top row */}
        <div className="grid grid-cols-2 gap-10 py-16 md:grid-cols-[2fr_1fr_1fr]">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <span className="text-[18px] text-ink"><Logo /></span>
            <p className="mt-2 max-w-[32ch] text-[13px] leading-[1.65] text-ink-muted">
              A digital wardrobe shoppers actually use — mix the clothes you
              own with certified brand pieces, and try new outfits on yourself.
            </p>
          </div>

          {/* Product */}
          <div>
            <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.15em] text-ink-muted">
              Product
            </p>
            <ul className="space-y-3">
              {productLinks.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-[13px] text-ink-muted transition-colors duration-200 hover:text-ink"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.15em] text-ink-muted">
              Legal
            </p>
            <ul className="space-y-3">
              {legalLinks.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-[13px] text-ink-muted transition-colors duration-200 hover:text-ink"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-start justify-between gap-3 border-t border-ink/[0.06]
                        py-6 text-[12px] text-ink-muted sm:flex-row sm:items-center">
          <p>© 2026 Aplomb. Your digital wardrobe.</p>
          <p>Made in Paris &amp; Montreal</p>
        </div>
      </div>
    </footer>
  );
}
