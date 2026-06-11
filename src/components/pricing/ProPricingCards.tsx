"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";
import { ease, staggerContainer, depthItem } from "@/lib/motion";
import { TiltCard } from "@/components/fx/TiltCard";
import { Input } from "@/components/ui/Input";
import { TurnstileField, type TurnstileFieldHandle } from "@/components/security/TurnstileField";
import { TURNSTILE_ENABLED } from "@/components/security/TurnstileWidget";

// ─── Check icon ───────────────────────────────────────────────────────────────

function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 mt-0.5">
      <circle cx="7" cy="7" r="6.5" stroke="currentColor" strokeOpacity="0.2"/>
      <path d="M4.5 7l2 2 3-3" stroke="currentColor" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ─── Enterprise contact modal ─────────────────────────────────────────────────

function EnterpriseModal({ onClose }: { onClose: () => void }) {
  const [fields, setFields] = useState({ name: "", email: "", company: "", message: "" });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Turnstile state — single-use token from the widget. When the env var
  // NEXT_PUBLIC_TURNSTILE_SITE_KEY is unset (TURNSTILE_ENABLED === false),
  // the field renders nothing and the token stays null; the server skips
  // verification in that environment.
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileFieldHandle>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Persisted server-side to enterprise_enquiries (see
      // src/app/api/enquiry/enterprise/route.tsx). Replaces the previous
      // console.log placeholder which leaked submitted contact data to
      // server logs and never reached ops.
      const res = await fetch("/api/enquiry/enterprise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fields.name.trim(),
          email: fields.email.trim(),
          company: fields.company.trim(),
          message: fields.message.trim(),
          // Only include the token when Turnstile is enabled in this build
          // AND the widget produced one. Sending an empty string would fail
          // Zod's `.min(1)` and bounce the user with a confusing 400.
          ...(turnstileToken ? { turnstileToken } : {}),
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        setError(
          json?.error?.message ??
            "Could not send your message. Please try again in a moment.",
        );
        // Turnstile tokens are single-use — if the server rejected us for
        // any reason, mint a new token before the next attempt.
        turnstileRef.current?.reset();
        setLoading(false);
        return;
      }
      setSent(true);
    } catch {
      setError("Network error. Please try again.");
      turnstileRef.current?.reset();
    }
    setLoading(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-scrim/55
                 backdrop-blur-sm px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.35, ease }}
        className="w-full max-w-md rounded-2xl bg-surface border border-hairline
                   shadow-float p-8"
      >
        {sent ? (
          <div className="text-center py-4">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-stone
                             flex items-center justify-center text-ink">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M4 10l4 4 8-8" stroke="currentColor" strokeWidth="1.5"
                      strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="font-serif text-[1.4rem] font-semibold text-ink">
              Message sent.
            </h3>
            <p className="mt-2 text-sm text-ink-muted">
              Our team will reach out within 24 hours.
            </p>
            <button onClick={onClose}
              className="mt-6 rounded-full bg-ink px-6 py-2.5 text-sm
                         font-medium text-on-ink hover:bg-ink/90 transition-colors">
              Close
            </button>
          </div>
        ) : (
          <>
            <h3 className="font-serif text-[1.5rem] font-semibold text-ink mb-1">
              Contact our team.
            </h3>
            <p className="text-sm text-ink-muted mb-6">
              Tell us about your brand and we&apos;ll prepare a custom proposal.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input label="Name" type="text" required
                  value={fields.name} onChange={(e) => setFields(f => ({ ...f, name: e.target.value }))} />
                <Input label="Company" type="text" required
                  value={fields.company} onChange={(e) => setFields(f => ({ ...f, company: e.target.value }))} />
              </div>
              <Input label="Email" type="email" required
                value={fields.email} onChange={(e) => setFields(f => ({ ...f, email: e.target.value }))} />
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-ink">Message</label>
                <textarea
                  required rows={4}
                  value={fields.message}
                  onChange={(e) => setFields(f => ({ ...f, message: e.target.value }))}
                  placeholder="Tell us about your catalogue size, expected scan volume..."
                  className="rounded-xl border border-hairline-strong bg-surface px-3.5 py-2.5
                             text-[14px] text-ink placeholder:text-ink-subtle resize-none
                             focus:border-ink focus:outline-none focus:ring-1
                             focus:ring-ink transition-colors duration-200"
                />
              </div>
              {error && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                  {error}
                </div>
              )}
              {/* Turnstile field — renders nothing when not configured
                  (NEXT_PUBLIC_TURNSTILE_SITE_KEY unset); when configured,
                  the parent button stays disabled until the user solves
                  the challenge. */}
              <TurnstileField ref={turnstileRef} onChange={setTurnstileToken} />
              <div className="flex items-center gap-3 pt-1">
                <button type="button" onClick={onClose}
                  className="rounded-full border border-hairline-strong bg-surface px-5 py-2.5
                             text-sm font-medium text-ink-muted hover:bg-stone
                             transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={loading || (TURNSTILE_ENABLED && !turnstileToken)}
                  className="flex-1 rounded-full bg-ink py-2.5 text-sm font-medium
                             text-on-ink hover:bg-ink/90 transition-colors
                             disabled:opacity-50 disabled:cursor-wait">
                  {loading ? "Sending…" : "Send message"}
                </button>
              </div>
            </form>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Plan card ────────────────────────────────────────────────────────────────

type ProTier = {
  id: "free" | "pro" | "enterprise";
  name: string;
  price: string | null;
  period?: string;
  tagline: string;
  features: string[];
  cta: string;
  recommended?: boolean;
  dark?: boolean;
};

const TIERS: ProTier[] = [
  {
    id: "free",
    name: "Listed",
    price: "45",
    period: "/month",
    tagline: "Be present on the platform with a basic listing.",
    features: [
      "Up to 2 active collections",
      "1,000 shopper scans / month",
      "Brand profile page",
      "Catalog & size chart upload",
      "Standard search visibility",
      "Basic analytics",
    ],
    cta: "Choose Listed",
  },
  {
    id: "pro",
    name: "Featured",
    price: "200",
    period: "/month",
    tagline: "Strong visibility and marketplace growth.",
    features: [
      "Unlimited collections",
      "10,000 shopper scans / month",
      "Eligible for Top Brands placement",
      "Enhanced analytics dashboard",
      "Product & outfit insights",
      "Featured badge & priority ranking",
      "Priority support",
    ],
    cta: "Choose Featured",
    recommended: true,
    dark: true,
  },
  {
    id: "enterprise",
    name: "Premier",
    price: null,
    tagline: "Custom exposure and dedicated growth support.",
    features: [
      "Everything in Featured",
      "Custom monthly exposure quota",
      "Custom placement opportunities",
      "Dedicated onboarding & support",
      "Custom integrations",
      "Optional merchandising support",
    ],
    cta: "Contact team",
  },
];

export function ProPricingCards({
  currentPlan = "free",
}: {
  currentPlan?: "free" | "pro" | "enterprise";
}) {
  const reduce = useReducedMotion();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [enterpriseOpen, setEnterpriseOpen] = useState(false);
  const [activePlan, setActivePlan] = useState(currentPlan);

  async function choosePlan(id: "free" | "pro" | "enterprise") {
    if (id === "enterprise") { setEnterpriseOpen(true); return; }
    // Go to checkout — actual plan switch happens after Shopify payment webhook.
    // Map DB enum to display slug used in /checkout
    const planSlug = id === "free" ? "listed" : id === "pro" ? "featured" : "premier";
    setLoadingPlan(id);
    window.location.href = `/checkout?audience=brand&plan=${planSlug}`;
  }

  return (
    <>
      {/* perspective-stage: tier cards are objects — they share one vanishing
          point so the tilt reads as a coherent space. */}
      <motion.div
        variants={staggerContainer(0.07)}
        initial={reduce ? false : "hidden"}
        animate="show"
        className="perspective-stage grid grid-cols-1 md:grid-cols-3 gap-5"
      >
        {TIERS.map((tier) => {
          const isActive = activePlan === tier.id;
          return (
            <motion.div
              key={tier.id}
              variants={depthItem}
              className="h-full preserve-3d"
            >
              {/* Recommended tier sits deeper in the scene: floatier shadow +
                  the view's single sheen group. */}
              <TiltCard
                sheen={tier.recommended}
                className={cn(
                  "relative flex h-full flex-col rounded-2xl p-6 bg-surface",
                  tier.recommended
                    ? "ring-2 ring-accent/30 shadow-float"
                    : "border border-hairline shadow-card"
                )}
              >
                {/* Recommended badge */}
                {tier.recommended && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1
                                   text-[10px] font-semibold uppercase tracking-[0.16em] bg-accent text-white">
                    Recommended
                  </span>
                )}

                {/* Active indicator */}
                {isActive && (
                  <span className="absolute top-4 right-4 rounded-full px-2.5 py-0.5 text-[10px] font-medium
                                   bg-surface-raised text-ink-subtle">
                    Current plan
                  </span>
                )}

                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-subtle">
                    {tier.name}
                  </p>

                  {/* min-h keeps the €-price and "Custom" rows the same height
                      so feature lists start at the same Y across columns. */}
                  <div className="mt-2 flex min-h-[2.8rem] items-end gap-0.5">
                    {tier.price ? (
                      <>
                        <span className="text-[0.9rem] font-medium text-ink-subtle">€</span>
                        <span className="font-serif text-[2.8rem] font-medium leading-none tracking-tight nums text-ink">
                          {tier.price}
                        </span>
                        <span className="ml-1 self-end text-sm text-ink-subtle">
                          {tier.period}
                        </span>
                      </>
                    ) : (
                      <span className="font-serif text-[2rem] font-medium leading-none tracking-tight text-ink">
                        Custom
                      </span>
                    )}
                  </div>

                  <p className="mt-3 min-h-[2.6rem] text-[13px] leading-relaxed text-ink-muted">
                    {tier.tagline}
                  </p>
                </div>

                <ul className="mt-6 mb-8 space-y-2.5 flex-1">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[13px] text-ink-muted">
                      <Check />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => choosePlan(tier.id)}
                  disabled={loadingPlan === tier.id || (isActive && tier.id !== "enterprise")}
                  className={cn(
                    "w-full rounded-full py-3 text-sm font-medium transition-all duration-200",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    tier.recommended
                      ? "bg-accent text-white hover:bg-accent-bright"
                      : "bg-ink text-on-ink hover:bg-ink/90"
                  )}
                >
                  {loadingPlan === tier.id
                    ? "Updating…"
                    : isActive && tier.id !== "enterprise"
                    ? "Active"
                    : tier.cta}
                </button>
              </TiltCard>
            </motion.div>
          );
        })}
      </motion.div>

      <AnimatePresence>
        {enterpriseOpen && <EnterpriseModal onClose={() => setEnterpriseOpen(false)} />}
      </AnimatePresence>
    </>
  );
}
