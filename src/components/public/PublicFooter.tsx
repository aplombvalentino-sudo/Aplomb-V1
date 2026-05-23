import Link from "next/link";

const productLinks = [
  { label: "Features", href: "/#features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Widget demo", href: "/widget?brand=demo-brand" },
];

const companyLinks = [
  { label: "About", href: "#" },
  { label: "Blog", href: "#" },
  { label: "Careers", href: "#" },
];

const legalLinks = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Cookie policy", href: "#" },
];

export function PublicFooter() {
  return (
    <footer className="border-t border-black/[0.07] bg-[#F7F6F3]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Top row */}
        <div className="grid grid-cols-2 gap-10 py-16 md:grid-cols-[2fr_1fr_1fr_1fr]">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <span className="text-[15px] font-semibold tracking-tight text-[#111010]">Aplomb</span>
            <p className="mt-2 max-w-[28ch] text-[13px] leading-[1.65] text-[#9C9894]">
              Size intelligence and outfit styling for fashion brands that care about the fitting room.
            </p>
            {/* Social */}
            <div className="mt-6 flex items-center gap-3">
              {[
                {
                  label: "Twitter / X",
                  href: "#",
                  icon: (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
                    </svg>
                  ),
                },
                {
                  label: "LinkedIn",
                  href: "#",
                  icon: (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                  ),
                },
              ].map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="flex h-8 w-8 items-center justify-center rounded-full
                             bg-black/[0.04] text-[#9C9894] ring-1 ring-black/[0.07]
                             transition-all duration-200 hover:bg-black/[0.08] hover:text-[#111010]"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Product */}
          <div>
            <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.15em] text-[#9C9894]">
              Product
            </p>
            <ul className="space-y-3">
              {productLinks.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-[13px] text-[#6B6965] transition-colors duration-200 hover:text-[#111010]"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.15em] text-[#9C9894]">
              Company
            </p>
            <ul className="space-y-3">
              {companyLinks.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-[13px] text-[#6B6965] transition-colors duration-200 hover:text-[#111010]"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.15em] text-[#9C9894]">
              Legal
            </p>
            <ul className="space-y-3">
              {legalLinks.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-[13px] text-[#6B6965] transition-colors duration-200 hover:text-[#111010]"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-start justify-between gap-3 border-t border-black/[0.06]
                        py-6 text-[12px] text-[#9C9894] sm:flex-row sm:items-center">
          <p>© 2026 Aplomb. Built for fashion brands that care.</p>
          <p>Made in Paris &amp; Montreal</p>
        </div>
      </div>
    </footer>
  );
}
