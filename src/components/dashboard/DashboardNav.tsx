"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import { Logo } from "@/components/brand/Logo";
import {
  LayoutDashboard,
  Package,
  Ruler,
  Code2,
  History,
  LogOut,
} from "lucide-react";
import { signOut } from "next-auth/react";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/products", label: "Products", icon: Package },
  { href: "/dashboard/size-charts", label: "Size Charts", icon: Ruler },
  { href: "/dashboard/integration", label: "Integration", icon: Code2 },
  { href: "/dashboard/sessions", label: "Fit Sessions", icon: History },
];

const ease = [0.16, 1, 0.3, 1] as const;

export function DashboardNav({ brandName }: { brandName: string }) {
  const pathname = usePathname();

  return (
    <motion.aside
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease }}
      className="flex h-full w-60 flex-col border-r border-black/[0.07] bg-[#F9F8F6]"
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-black/[0.07] px-6">
        <Link
          href="/"
          aria-label="Aplomb — home"
          className="text-[18px] text-[#111010] hover:opacity-60 transition-opacity duration-200"
        >
          <Logo />
        </Link>
      </div>

      {/* Brand label */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.12, duration: 0.4 }}
        className="border-b border-black/[0.07] px-6 py-3"
      >
        <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#7A7773]">
          Brand
        </p>
        <p className="mt-0.5 truncate text-[13px] font-medium text-[#111010]">
          {brandName}
        </p>
      </motion.div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
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
                transition={{ delay: 0.08 + i * 0.05, duration: 0.4, ease }}
              >
                <Link
                  href={item.href}
                  className={cn(
                    "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors duration-200",
                    active
                      ? "text-white"
                      : "text-[#6B6965] hover:text-[#111010] hover:bg-black/[0.04]"
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-active-pill"
                      className="absolute inset-0 rounded-xl bg-[#111010]"
                      transition={{ type: "spring", stiffness: 400, damping: 38 }}
                    />
                  )}
                  <item.icon
                    strokeWidth={1.5}
                    className="relative z-10 h-4 w-4 shrink-0"
                  />
                  <span className="relative z-10">{item.label}</span>
                </Link>
              </motion.li>
            );
          })}
        </ul>
      </nav>

      {/* Sign out */}
      <div className="border-t border-black/[0.07] px-3 py-4">
        <motion.button
          onClick={() => signOut({ callbackUrl: "/" })}
          whileHover={{ backgroundColor: "rgba(0,0,0,0.04)" }}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px]
                     font-medium text-[#7A7773] hover:text-[#111010] transition-colors duration-200"
        >
          <LogOut strokeWidth={1.5} className="h-4 w-4 shrink-0" />
          Sign out
        </motion.button>
      </div>
    </motion.aside>
  );
}
