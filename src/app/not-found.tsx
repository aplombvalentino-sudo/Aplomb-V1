import Link from "next/link";

export default function NotFound() {
  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center
                    bg-canvas px-4 text-center overflow-hidden">
      {/* Large background numeral */}
      <span
        aria-hidden
        className="pointer-events-none absolute select-none font-serif font-semibold
                   text-[clamp(14rem,30vw,22rem)] leading-none tracking-[-0.06em]
                   text-ink/[0.04]"
      >
        404
      </span>

      {/* Content */}
      <div className="relative z-10 max-w-md">
        <span className="inline-flex items-center rounded-full border border-hairline bg-surface/60
                         px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-ink-subtle">
          Page not found
        </span>

        <h1 className="mt-6 font-serif text-[clamp(2rem,4vw,2.8rem)] font-semibold
                       leading-[1.1] tracking-[-0.03em] text-ink">
          This page doesn&apos;t <em className="italic">exist</em>
          <span className="text-accent">.</span>
        </h1>

        <p className="mt-4 text-[16px] leading-[1.65] text-ink-muted">
          The URL may have changed or the page was removed.
          Let&apos;s get you back to somewhere useful.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="group inline-flex items-center gap-2.5 rounded-full bg-ink
                       pl-6 pr-2.5 py-3 text-sm font-medium text-on-ink
                       transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
                       hover:bg-ink/90"
          >
            Back to home
            <span className="flex h-7 w-7 items-center justify-center rounded-full
                             bg-on-ink/[0.12] transition-all duration-500
                             group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none" className="text-on-ink">
                <path d="M2.5 8.5L8.5 2.5M8.5 2.5H3.5M8.5 2.5V7.5"
                      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          </Link>

          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 rounded-full border border-hairline-strong
                       bg-surface/70 px-6 py-3 text-sm font-medium text-ink
                       hover:bg-surface transition-all duration-300"
          >
            View pricing
          </Link>
        </div>
      </div>

      {/* Footer note */}
      <p className="absolute bottom-8 text-[12px] text-ink-subtle">
        Aplomb — your digital wardrobe
      </p>
    </div>
  );
}
