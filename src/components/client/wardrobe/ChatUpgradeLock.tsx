import Link from "next/link";
import type { ClientPlan } from "@/lib/planLimits";

/**
 * Locked-state card shown on /app/chat when the user's plan doesn't
 * include the AI Outfit Assistant (Essential = locked). Pure server
 * component — no client interactivity beyond the upgrade link.
 *
 * Copy follows the brief verbatim:
 *   "AI Outfit Assistant is available on plans 25.99 and above."
 *   "Upgrade to unlock AI outfit recommendations from your wardrobe."
 *   "Get personalised outfit suggestions from your saved pieces with Premium."
 */
export function ChatUpgradeLock({ currentPlan }: { currentPlan: ClientPlan }) {
  void currentPlan; // referenced for analytics later; kept on the signature now.
  return (
    <div className="mt-6 space-y-8">
      {/* Title */}
      <div>
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-subtle">
          AI Outfit Assistant
        </p>
        <h1 className="mt-2 font-serif text-[clamp(2rem,4vw,2.6rem)] font-medium leading-[1.05] tracking-[-0.02em] text-ink">
          Ask your <em className="italic">wardrobe</em>
          <span className="text-accent">.</span>
        </h1>
        <p className="mt-3 text-[14px] text-ink-muted max-w-[52ch]">
          A personal stylist that knows every piece you&apos;ve saved. Ask it
          to mix outfits from your closet, suggest combinations, or solve
          &ldquo;what should I wear with this?&rdquo; — all from the clothes
          you already own.
        </p>
      </div>

      {/* Premium lock card */}
      <div className="relative overflow-hidden rounded-3xl border border-hairline bg-surface p-8 shadow-[0_4px_32px_rgba(0,0,0,0.04)]">
        <span className="inline-flex items-center rounded-full border border-accent/30 bg-accent/[0.07]
                         px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
          Premium feature
        </span>

        <h2 className="mt-5 font-serif text-[1.6rem] font-semibold text-ink leading-snug">
          AI Outfit Assistant is available on plans 25.99 and above.
        </h2>
        <p className="mt-3 text-[14px] text-ink-muted max-w-[48ch]">
          Upgrade to unlock AI outfit recommendations from your wardrobe.
          Get personalised outfit suggestions from your saved pieces with Premium.
        </p>

        <ul className="mt-6 space-y-2.5 text-[13px] text-ink-muted">
          <FeatureLi>
            Ask anything: &ldquo;What matches best with this top?&rdquo;
          </FeatureLi>
          <FeatureLi>3 outfit ideas in one prompt, from your real wardrobe</FeatureLi>
          <FeatureLi>Reasons every combination — colour, material, silhouette</FeatureLi>
          <FeatureLi>Surfaces specific pieces by name, with thumbnails</FeatureLi>
        </ul>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/app/pricing"
            className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[13px]
                       font-medium text-white hover:bg-[#2a2622] transition-colors"
          >
            See upgrade options
          </Link>
          <Link
            href="/app/wardrobe"
            className="text-[12px] text-ink-subtle hover:text-ink underline underline-offset-2"
          >
            Back to wardrobe
          </Link>
        </div>
      </div>
    </div>
  );
}

function FeatureLi({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 leading-relaxed">
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        className="mt-0.5 shrink-0 text-accent"
        aria-hidden
      >
        <circle cx="7" cy="7" r="6.5" stroke="currentColor" strokeOpacity="0.4" />
        <path d="M4.5 7l2 2 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>{children}</span>
    </li>
  );
}
