import Link from "next/link";

export default function NotFound() {
  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center
                    bg-[#F7F6F3] px-4 text-center overflow-hidden">
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 40%, rgba(210,190,170,0.20) 0%, transparent 70%)",
        }}
      />

      {/* Large background numeral */}
      <span
        aria-hidden
        className="pointer-events-none absolute select-none font-serif font-semibold
                   text-[clamp(14rem,30vw,22rem)] leading-none tracking-[-0.06em]
                   text-black/[0.035]"
      >
        404
      </span>

      {/* Content */}
      <div className="relative z-10 max-w-md">
        <span className="inline-flex items-center rounded-full border border-black/10 bg-white/60
                         px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-[#7A7773]">
          Page not found
        </span>

        <h1 className="mt-6 font-serif text-[clamp(2rem,4vw,2.8rem)] font-semibold
                       leading-[1.1] tracking-[-0.03em] text-[#111010]">
          This page doesn&apos;t exist.
        </h1>

        <p className="mt-4 text-[16px] leading-[1.65] text-[#6B6965]">
          The URL may have changed or the page was removed.
          Let&apos;s get you back to somewhere useful.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="group inline-flex items-center gap-2.5 rounded-full bg-[#111010]
                       pl-6 pr-2.5 py-3 text-sm font-medium text-white
                       transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
                       hover:bg-[#2a2a2a]"
          >
            Back to home
            <span className="flex h-7 w-7 items-center justify-center rounded-full
                             bg-white/[0.12] transition-all duration-500
                             group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path d="M2.5 8.5L8.5 2.5M8.5 2.5H3.5M8.5 2.5V7.5"
                      stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          </Link>

          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 rounded-full border border-black/[0.12]
                       bg-white/70 px-6 py-3 text-sm font-medium text-[#111010]
                       hover:bg-white transition-all duration-300"
          >
            View pricing
          </Link>
        </div>
      </div>

      {/* Footer note */}
      <p className="absolute bottom-8 text-[12px] text-[#7A7773]">
        Aplomb — AI Fitting Room for Fashion Brands
      </p>
    </div>
  );
}
