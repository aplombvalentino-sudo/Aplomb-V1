"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import {
  LayoutDashboard,
  Package,
  Ruler,
  Settings,
  Sparkles,
  BarChart3,
  LogOut,
  ChevronRight,
  CreditCard,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const navItems = [
  { href: "/pro/dashboard",   label: "Overview",    icon: LayoutDashboard, exact: true },
  { href: "/pro/catalogue",   label: "Catalog",     icon: Package },
  { href: "/pro/size-charts", label: "Size Charts", icon: Ruler },
  { href: "/pro/discovery",   label: "Discovery",   icon: Sparkles },
  { href: "/pro/analytics",   label: "Analytics",   icon: BarChart3 },
  { href: "/pro/pricing",     label: "Billing",     icon: CreditCard },
  { href: "/pro/settings",    label: "Settings",    icon: Settings },
];

const ease = [0.16, 1, 0.3, 1] as const;

export function ProSideNav({
  brandName,
  brandLogoUrl,
  plan,
}: {
  brandName: string;
  brandLogoUrl?: string | null;
  plan?: string;
}) {
  const pathname = usePathname();

  return (
    <motion.aside
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease }}
      className="flex h-full w-[220px] flex-col border-r border-hairline bg-surface-raised shrink-0"
    >
      {/* Wordmark */}
      <div className="flex h-14 items-center border-b border-hairline px-5">
        <Link
          href="/"
          aria-label="Aplomb — home"
          className="text-[16px] text-ink hover:opacity-60 transition-opacity duration-200"
        >
          <Logo />
        </Link>
        <ChevronRight strokeWidth={1.5} className="ml-1 h-3 w-3 text-ink-subtle" />
        <span className="ml-1 text-[13px] text-ink-subtle font-medium">Pro</span>
      </div>

      {/* Brand identity */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="flex items-center gap-2.5 border-b border-hairline px-5 py-3.5"
      >
        {/* Logo or initial */}
        <div
          className="h-8 w-8 rounded-lg bg-ink flex items-center justify-center shrink-0
                     overflow-hidden ring-1 ring-ink/10"
        >
          {brandLogoUrl ? (
            <Image
              src={brandLogoUrl}
              alt={brandName}
              width={32}
              height={32}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-[11px] font-semibold text-on-ink">
              {brandName.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-ink leading-tight">
            {brandName}
          </p>
          {plan && (
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-subtle">
              {plan}
            </p>
          )}
        </div>
      </motion.div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-3">
        <ul className="space-y-0.5">
          {navItems.map((item, i) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <motion.li
                key={item.href}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.07 + i * 0.05, duration: 0.35, ease }}
              >
                <Link
                  href={item.href}
                  className={cn(
                    "relative flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors duration-200",
                    active
                      ? "text-on-ink"
                      : "text-ink-muted hover:text-ink hover:bg-ink/5"
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="pro-nav-pill"
                      className="absolute inset-0 rounded-xl bg-ink"
                      transition={{ type: "spring", stiffness: 420, damping: 40 }}
                    />
                  )}
                  <item.icon strokeWidth={1.5} className="relative z-10 h-4 w-4 shrink-0" />
                  <span className="relative z-10">{item.label}</span>
                </Link>
              </motion.li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-hairline px-3 py-3 space-y-0.5">
        {/* Theme preference — mounted once for the whole pro shell. */}
        <div className="px-3 pb-1.5">
          <ThemeToggle />
        </div>
        <Link
          href="/app"
          className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[12px]
                     font-medium text-ink-subtle hover:text-ink hover:bg-ink/5
                     transition-colors duration-200"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
            <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M7 4.5v3l1.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Client view
        </Link>

        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[12px]
                     font-medium text-ink-subtle hover:text-ink hover:bg-ink/5
                     transition-colors duration-200"
        >
          <LogOut strokeWidth={1.5} className="h-3.5 w-3.5 shrink-0" />
          Sign out
        </button>
      </div>
    </motion.aside>
  );
}
