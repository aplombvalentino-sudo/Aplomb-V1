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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // TODO: replace with real endpoint / CRM webhook
    console.log("[Enterprise enquiry]", fields);
    await new Promise((r) => setTimeout(r, 600));
    setSent(true);
    setLoading(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40
                 backdrop-blur-sm px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.35, ease }}
        className="w-full max-w-md rounded-2xl bg-white border border-black/[0.06]
                   shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] p-8"
      >
        {sent ? (
          <div className="text-center py-4">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-[#F7F6F3]
                             flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M4 10l4 4 8-8" stroke="#111010" strokeWidth="1.5"
                      strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="font-serif text-[1.4rem] font-semibold text-[#111010]">
              Message sent.
            </h3>
            <p className="mt-2 text-sm text-[#6B6965]">
              Our team will reach out within 24 hours.
            </p>
            <button onClick={onClose}
              className="mt-6 rounded-full bg-[#111010] px-6 py-2.5 text-sm
                         font-medium text-white hover:bg-[#2a2a2a] transition-colors">
              Close
            </button>
          </div>
        ) : (
          <>
            <h3 className="font-serif text-[1.5rem] font-semibold text-[#111010] mb-1">
              Contact our team.
            </h3>
            <p className="text-sm text-[#6B6965] mb-6">
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
                <label className="text-[13px] font-medium text-[#111010]">Message</label>
                <textarea
                  required rows={4}
                  value={fields.message}
                  onChange={(e) => setFields(f => ({ ...f, message: e.target.value }))}
                  placeholder="Tell us about your catalogue size, expected scan volume..."
                  className="rounded-xl border border-black/[0.12] bg-white px-3.5 py-2.5
                             text-[14px] text-[#111010] placeholder:text-[#9C9894] resize-none
                             focus:border-[#111010] focus:outline-none focus:ring-1
                             focus:ring-[#111010] transition-colors duration-200"
                />
              </div>
              <div className="flex items-center gap-3 pt-1">
                <button type="button" onClick={onClose}
                  className="rounded-full border border-black/[0.12] bg-white px-5 py-2.5
                             text-sm font-medium text-[#6B6965] hover:bg-[#F7F6F3]
                             transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 rounded-full bg-[#111010] py-2.5 text-sm font-medium
                             text-white hover:bg-[#2a2a2a] transition-colors
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
    name: "Starter",
    price: "45",
    period: "/month",
    tagline: "For brands just getting started.",
    features: [
      "Up to 2 active collections",
      "50 scans per month",
      "Standard widget embed",
      "Basic size chart editor",
      "Email support",
    ],
    cta: "Choose Starter",
  },
  {
    id: "pro",
    name: "Pro",
    price: "200",
    period: "/month",
    tagline: "Full power for growing brands.",
    features: [
      "Unlimited collections",
      "Unlimited scans",
      "Custom widget branding",
      "Webhooks & API access",
      "Analytics dashboard",
      "Priority support",
    ],
    cta: "Choose Pro",
    recommended: true,
    dark: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: null,
    tagline: "Everything in Pro, plus dedicated support.",
    features: [
      "Everything in Pro",
      "Dedicated account manager",
      "Custom integrations",
      "SLA guarantee",
      "Onboarding & migration",
    ],
    cta: "Contact our team",
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
    setLoadingPlan(id);
    try {
      await fetch("/api/brand/plan", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: id }),
      });
      setActivePlan(id);
    } finally {
      setLoadingPlan(null);
    }
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
                "relative flex flex-col rounded-2xl p-6 transition-shadow duration-300",
                tier.dark
                  ? "bg-[#111010] text-white ring-1 ring-white/10 shadow-[0_8px_48px_-8px_rgba(0,0,0,0.35)]"
                  : "bg-white border border-black/[0.06] shadow-[0_2px_16px_rgba(0,0,0,0.04)]",
                tier.recommended && !tier.dark &&
                  "ring-2 ring-[#C9A882]"
              )}
            >
              {/* Recommended badge */}
              {tier.recommended && (
                <span className={cn(
                  "absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1",
                  "text-[10px] font-semibold uppercase tracking-[0.16em]",
                  tier.dark
                    ? "bg-[#C9A882] text-[#2a1f14]"
                    : "bg-[#111010] text-white"
                )}>
                  Recommended
                </span>
              )}

              {/* Active indicator */}
              {isActive && (
                <span className={cn(
                  "absolute top-4 right-4 rounded-full px-2.5 py-0.5 text-[10px] font-medium",
                  tier.dark
                    ? "bg-white/10 text-white/60"
                    : "bg-[#F7F6F3] text-[#9C9894]"
                )}>
                  Current plan
                </span>
              )}

              <div>
                <p className={cn(
                  "text-[11px] font-medium uppercase tracking-[0.16em]",
                  tier.dark ? "text-white/40" : "text-[#9C9894]"
                )}>
                  {tier.name}
                </p>

                <div className="mt-2 flex items-baseline gap-0.5">
                  {tier.price ? (
                    <>
                      <span className={cn(
                        "text-[0.9rem] font-medium",
                        tier.dark ? "text-white/50" : "text-[#9C9894]"
                      )}>€</span>
                      <span className={cn(
                        "font-serif text-[2.8rem] font-semibold leading-none tracking-tight tabular-nums",
                        tier.dark ? "text-white" : "text-[#111010]"
                      )}>
                        {tier.price}
                      </span>
                      <span className={cn(
                        "ml-1 self-end text-sm",
                        tier.dark ? "text-white/40" : "text-[#9C9894]"
                      )}>
                        {tier.period}
                      </span>
                    </>
                  ) : (
                    <span className={cn(
                      "font-serif text-[2rem] font-semibold leading-none tracking-tight",
                      tier.dark ? "text-white" : "text-[#111010]"
                    )}>
                      Custom
                    </span>
                  )}
                </div>

                <p className={cn(
                  "mt-3 text-[13px] leading-relaxed",
                  tier.dark ? "text-white/50" : "text-[#6B6965]"
                )}>
                  {tier.tagline}
                </p>
              </div>

              <ul className="mt-6 mb-8 space-y-2.5 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className={cn(
                    "flex items-start gap-2 text-[13px]",
                    tier.dark ? "text-white/70" : "text-[#6B6965]"
                  )}>
                    <Check />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => choosePlan(tier.id)}
                disabled={loadingPlan === tier.id || (isActive && tier.id !== "enterprise")}
                className={cn(
                  "w-full rounded-xl py-3 text-sm font-medium transition-all duration-200",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  tier.dark
                    ? "bg-[#C9A882] text-[#111010] hover:bg-[#d4b48e]"
                    : "bg-[#111010] text-white hover:bg-[#2a2a2a]"
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
