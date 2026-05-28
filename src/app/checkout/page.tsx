import Link from "next/link";
import { redirect } from "next/navigation";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Checkout — Aplomb" };

// ─────────────────────────────────────────────────────────────────────────────
// SHOPIFY INTEGRATION — TODO
// ─────────────────────────────────────────────────────────────────────────────
// When the user is ready to wire Shopify in, replace `SHOPIFY_PRODUCT_URLS`
// with real Shopify checkout URLs (variant IDs work too via
// `https://<store>.myshopify.com/cart/<variantId>:1`).
//
// Then, in the server-side `CheckoutPage` component below:
//   1. Read the `plan` query param.
//   2. Look up the matching URL in SHOPIFY_PRODUCT_URLS.
//   3. Call `redirect(url)` from `next/navigation` to hand the user off to
//      Shopify's hosted checkout. Their hosted page handles payment + email
//      receipt, then Shopify can webhook us on completion to update Brand.plan
//      or the client cookie.
//
// For now this page just shows a "demo" success screen so the flow is
// click-through-able end to end.
// ─────────────────────────────────────────────────────────────────────────────

const SHOPIFY_PRODUCT_URLS: Record<string, string> = {
  // Brand plans
  // "starter": "https://yourstore.myshopify.com/products/aplomb-starter",
  // "pro": "https://yourstore.myshopify.com/products/aplomb-pro",
  // Client plans
  // "essential": "https://yourstore.myshopify.com/products/aplomb-essential",
  // "fashion":   "https://yourstore.myshopify.com/products/aplomb-fashion",
  // "model":     "https://yourstore.myshopify.com/products/aplomb-model",
};

const PLAN_LABELS: Record<string, string> = {
  // Brand plans (new naming)
  listed: "Listed",
  featured: "Featured",
  premier: "Premier",
  // Legacy/internal brand slugs (kept for backwards compat)
  starter: "Listed",
  pro: "Featured",
  enterprise: "Premier",
  // Shopper plans
  essential: "Essential",
  fashion: "Fashion",
  model: "Model",
};

const PLAN_PRICES: Record<string, string> = {
  listed: "€45 / mo",
  featured: "€200 / mo",
  premier: "Custom",
  starter: "€45 / mo",
  pro: "€200 / mo",
  enterprise: "Custom",
  essential: "€9.99 / mo",
  fashion: "€25.99 / mo",
  model: "€29.99 / mo",
};

type Props = {
  searchParams: Promise<{ audience?: string; plan?: string }>;
};

export default async function CheckoutPage({ searchParams }: Props) {
  const params = await searchParams;
  const audience = params.audience === "brand" ? "brand" : "client";
  const plan = params.plan ?? null;

  // Essential is free — never reaches Stripe. Send the user straight to the app.
  if (audience === "client" && (!plan || plan === "essential")) {
    redirect("/app");
  }

  const planLabel = plan && PLAN_LABELS[plan] ? PLAN_LABELS[plan] : "your plan";
  const planPrice = plan && PLAN_PRICES[plan] ? PLAN_PRICES[plan] : "";

  // TODO: when Shopify is live, do:
  //   if (plan && SHOPIFY_PRODUCT_URLS[plan]) redirect(SHOPIFY_PRODUCT_URLS[plan]);

  const continueHref = audience === "brand" ? "/pro/dashboard" : "/app";

  return (
    <div className="min-h-[100dvh] bg-[#F7F6F3]">
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 50% 40% at 50% 20%, rgba(201,168,130,0.16) 0%, transparent 70%)",
        }}
      />

      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-black/[0.07] bg-[#F7F6F3]/90
                          backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="text-[15px] font-semibold tracking-tight text-[#111010]
                     hover:opacity-60 transition-opacity duration-200"
        >
          Aplomb
        </Link>
        <span className="text-[12px] text-[#7A7773]">Checkout</span>
      </header>

      <main className="mx-auto max-w-md px-6 py-20">
        {/* Champagne ring icon */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full
                        ring-2 ring-[#C9A882]/40">
          <div className="flex h-11 w-11 items-center justify-center rounded-full
                          ring-2 ring-[#C9A882]">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
              <path
                d="M11 3l2.5 6.5H20l-5.5 4 2 6.5L11 16l-5.5 4 2-6.5L2 9.5h6.5L11 3z"
                stroke="#C9A882"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        <div className="text-center">
          <span className="inline-flex items-center rounded-full border border-black/10
                           bg-white/60 px-3 py-1 text-[10px] font-medium uppercase
                           tracking-[0.18em] text-[#6B6965]">
            {audience === "brand" ? "Brand plan" : "Shopper plan"}
          </span>
          <h1 className="mt-5 font-serif text-[2rem] font-semibold leading-[1.1]
                         tracking-[-0.025em] text-[#111010]">
            You&apos;re ready for {planLabel}.
          </h1>
          {planPrice && (
            <p className="mt-2 font-serif text-[1.2rem] text-[#6B6965] tabular-nums">
              {planPrice}
            </p>
          )}
          <p className="mt-4 text-sm leading-relaxed text-[#6B6965] max-w-[34ch] mx-auto">
            Your account has been created. Payments through Shopify
            will be enabled soon — for now your plan is reserved.
          </p>
        </div>

        {/* Continue CTA */}
        <div className="mt-10 flex flex-col items-center gap-3">
          <Link
            href={continueHref}
            className="group inline-flex items-center gap-2.5 rounded-full bg-[#111010]
                       pl-6 pr-2.5 py-3 text-sm font-medium text-white
                       hover:bg-[#2a2a2a] transition-all duration-300"
          >
            {audience === "brand" ? "Go to dashboard" : "Start fitting"}
            <span className="flex h-7 w-7 items-center justify-center rounded-full
                             bg-white/[0.12] transition-transform duration-300
                             group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden>
                <path
                  d="M2.5 8.5L8.5 2.5M8.5 2.5H3.5M8.5 2.5V7.5"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </Link>

          <Link
            href="/pricing"
            className="text-[12px] text-[#7A7773] hover:text-[#111010] transition-colors duration-200"
          >
            ← Change plan
          </Link>
        </div>
      </main>
    </div>
  );
}
