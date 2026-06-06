"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/cn";
import { Input } from "@/components/ui/Input";

const ease = [0.16, 1, 0.3, 1] as const;

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
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        setError(
          json?.error?.message ??
            "Could not send your message. Please try again in a moment.",
        );
        setLoading(false);
        return;
      }
      setSent(true);
    } catch {
      setError("Network error. Please try again.");
    }
    setLoading(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40
                 backdrop-blur-sm px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.35, ease }}
        className="w-full max-w-md rounded-2xl bg-white border border-hairline
                   shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] p-8"
      >
        {sent ? (
          <div className="text-center py-4">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-[#F6F3EE]
                             flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M4 10l4 4 8-8" stroke="#111010" strokeWidth="1.5"
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
              className="mt-6 rounded-full bg-[#111010] px-6 py-2.5 text-sm
                         font-medium text-white hover:bg-[#2a2622] transition-colors">
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
                  className="rounded-xl border border-hairline-strong bg-white px-3.5 py-2.5
                             text-[14px] text-ink placeholder:text-ink-subtle resize-none
                             focus:border-[#111010] focus:outline-none focus:ring-1
                             focus:ring-[#111010] transition-colors duration-200"
                />
              </div>
              {error && (
                <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
              <div className="flex items-center gap-3 pt-1">
                <button type="button" onClick={onClose}
                  className="rounded-full border border-hairline-strong bg-white px-5 py-2.5
                             text-sm font-medium text-ink-muted hover:bg-[#F6F3EE]
                             transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 rounded-full bg-[#111010] py-2.5 text-sm font-medium
                             text-white hover:bg-[#2a2622] transition-colors
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {TIERS.map((tier, i) => {
          const isActive = activePlan === tier.id;
          return (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.07, ease }}
              className={cn(
                "relative flex flex-col rounded-2xl p-6 bg-surface transition-shadow duration-300",
                tier.recommended
                  ? "ring-2 ring-accent/30 shadow-[0_18px_56px_-20px_rgba(17,16,16,0.18)]"
                  : "border border-hairline shadow-[0_1px_2px_rgba(17,16,16,0.04)]"
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

                <div className="mt-2 flex items-baseline gap-0.5">
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

                <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">
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
                  "w-full rounded-full py-3 text-sm font-medium text-white transition-all duration-200",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  tier.recommended
                    ? "bg-accent hover:bg-accent-bright"
                    : "bg-ink hover:bg-[#2a2622]"
                )}
              >
                {loadingPlan === tier.id
                  ? "Updating…"
                  : isActive && tier.id !== "enterprise"
                  ? "Active"
                  : tier.cta}
              </button>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {enterpriseOpen && <EnterpriseModal onClose={() => setEnterpriseOpen(false)} />}
      </AnimatePresence>
    </>
  );
}
