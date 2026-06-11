import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { ClientSignOutLink } from "@/components/client/ClientSignOutLink";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

/**
 * Shared shopper-area top nav. Replaces the inline <header> blocks that were
 * copy-pasted across /app/wardrobe, /app/outfits, /app/chat, /app/discover,
 * /app/account, /app/pricing, etc. — one source of truth for links, the
 * active state, the theme toggle, and sign-out.
 *
 * Server component (Logo + links are static); ThemeToggle and
 * ClientSignOutLink are client islands inside it.
 *
 * `active` highlights the current section. `leading` lets detail pages slot
 * a contextual back-link next to the logo (e.g. "← All outfits").
 */

export type ClientNavTab =
  | "wardrobe"
  | "outfits"
  | "assistant"
  | "discover"
  | "profile"
  | "none";

const TABS: Array<{ id: ClientNavTab; label: string; href: string }> = [
  { id: "wardrobe", label: "Wardrobe", href: "/app/wardrobe" },
  { id: "outfits", label: "Outfits", href: "/app/outfits" },
  { id: "assistant", label: "Assistant", href: "/app/chat" },
  { id: "discover", label: "Discover", href: "/app/discover" },
  { id: "profile", label: "Profile", href: "/app/account" },
];

export function ClientNav({
  active,
  leading,
}: {
  active: ClientNavTab;
  leading?: React.ReactNode;
}) {
  return (
    <header
      className="sticky top-0 z-10 flex items-center justify-between border-b border-hairline
                 bg-canvas/90 px-6 py-4 backdrop-blur-md"
    >
      <div className="flex items-center gap-3">
        <Link
          href="/app/wardrobe"
          aria-label="Aplomb — wardrobe"
          className="text-ink transition-opacity duration-200 hover:opacity-60"
        >
          <Logo className="text-[17px]" />
        </Link>
        {leading}
      </div>
      <nav className="flex items-center gap-4">
        {TABS.map((tab) => (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={active === tab.id ? "page" : undefined}
            className={
              active === tab.id
                ? "text-[12px] font-medium text-ink transition-colors"
                : "text-[12px] text-ink-subtle transition-colors duration-200 hover:text-ink"
            }
          >
            {tab.label}
          </Link>
        ))}
        <span aria-hidden className="h-3 w-px bg-hairline-strong" />
        <ThemeToggle />
        <ClientSignOutLink />
      </nav>
    </header>
  );
}
