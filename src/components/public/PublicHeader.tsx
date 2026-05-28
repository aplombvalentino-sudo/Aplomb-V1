"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, useScroll, useMotionValueEvent, useReducedMotion } from "motion/react";
import { Logo } from "@/components/brand/Logo";

const ease = [0.32, 0.72, 0, 1] as const;

const navLinks = [
  { label: "Features", href: "/#features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Shop", href: "/app" },
];

export function PublicHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const { scrollY } = useScroll();
  const reduce = useReducedMotion();

  useMotionValueEvent(scrollY, "change", (y) => {
    setScrolled(y > 24);
  });

  function isActive(href: string) {
    if (href.includes("#")) return pathname === "/";
    return pathname === href;
  }

  // Lock body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  return (
    <>
      <motion.header
        initial={reduce ? false : { opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease }}
        className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-5 px-4"
      >
        <motion.nav
          animate={{
            backgroundColor: scrolled ? "rgba(247,246,243,0.88)" : "rgba(247,246,243,0.72)",
            boxShadow: scrolled
              ? "0 2px 32px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.6)"
              : "0 1px 16px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.5)",
          }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex items-center gap-1 rounded-full px-2 py-2 backdrop-blur-md
                     ring-1 ring-black/[0.07]"
          style={{ willChange: "box-shadow" }}
        >
          {/* Logo */}
          <Link
            href="/"
            aria-label="Aplomb — home"
            className="px-4 py-1.5 text-[17px] text-[#111010]
                       hover:opacity-70 transition-opacity duration-200"
          >
            <Logo />
          </Link>

          {/* Divider */}
          <div className="h-4 w-px bg-black/10 mx-1" />

          {/* Nav links */}
          <div className="hidden md:flex items-center">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-1.5 text-[13px] font-medium transition-colors duration-200
                            rounded-full hover:bg-black/[0.04]
                            ${isActive(link.href)
                              ? "text-[#111010] bg-black/[0.04]"
                              : "text-[#6B6965] hover:text-[#111010]"}`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Divider */}
          <div className="hidden md:block h-4 w-px bg-black/10 mx-1" />

          {/* Auth links */}
          <div className="hidden md:flex items-center gap-1">
            <Link
              href="/login"
              className="px-4 py-1.5 text-[13px] font-medium text-[#6B6965]
                         hover:text-[#111010] transition-colors duration-200 rounded-full
                         hover:bg-black/[0.04]"
            >
              Log in
            </Link>

            {/* CTA pill — button-in-button architecture */}
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/signup"
                className="group inline-flex items-center gap-2 rounded-full bg-[#111010] pl-4 pr-2 py-1.5
                           text-[13px] font-medium text-white
                           transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
                           hover:bg-[#2a2a2a]"
              >
                Get started
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10
                                 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
                                 group-hover:translate-x-0.5 group-hover:-translate-y-px">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 8L8 2M8 2H3M8 2V7" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              </Link>
            </motion.div>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden ml-2 mr-1 flex h-8 w-8 items-center justify-center rounded-full
                       hover:bg-black/[0.04] transition-colors"
            aria-label="Toggle menu"
          >
            <div className="relative h-4 w-4">
              <motion.span
                animate={menuOpen ? { rotate: 45, y: 5 } : { rotate: 0, y: 0 }}
                transition={{ duration: 0.3, ease }}
                className="absolute left-0 top-0 h-[1.5px] w-full bg-[#111010] origin-center block"
              />
              <motion.span
                animate={menuOpen ? { opacity: 0 } : { opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="absolute left-0 top-[6px] h-[1.5px] w-full bg-[#111010] block"
              />
              <motion.span
                animate={menuOpen ? { rotate: -45, y: -5 } : { rotate: 0, y: 0 }}
                transition={{ duration: 0.3, ease }}
                className="absolute left-0 bottom-0 h-[1.5px] w-full bg-[#111010] origin-center block"
              />
            </div>
          </button>
        </motion.nav>
      </motion.header>

      {/* Mobile full-screen menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed inset-0 z-40 flex flex-col bg-[#F7F6F3]/95 backdrop-blur-2xl pt-28 px-8"
          >
            <nav className="flex flex-col gap-2">
              {[...navLinks, { label: "Log in", href: "/login" }].map((link, i) => (
                <motion.div
                  key={link.href}
                  initial={reduce ? false : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? undefined : { opacity: 0, y: 10 }}
                  transition={{ duration: 0.35, delay: reduce ? 0 : i * 0.07, ease }}
                >
                  <Link
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="block py-4 text-3xl font-medium text-[#111010] border-b border-black/[0.07]
                               hover:opacity-60 transition-opacity"
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}

              <motion.div
                initial={reduce ? false : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: 10 }}
                transition={{ duration: 0.35, delay: reduce ? 0 : 0.28, ease }}
                className="mt-8"
              >
                <Link
                  href="/signup"
                  onClick={() => setMenuOpen(false)}
                  className="inline-flex items-center gap-3 rounded-full bg-[#111010] px-7 py-4
                             text-base font-medium text-white"
                >
                  Get started free
                </Link>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
