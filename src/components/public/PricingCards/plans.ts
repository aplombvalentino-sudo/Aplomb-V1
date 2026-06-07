/**
 * Public marketing plan catalog (shown on /pricing).
 *
 * NOT the source of truth for Stripe — that lives in `lib/stripe.ts`
 * (`PLAN_CATALOG`). The paid slugs here MUST exist in PLAN_CATALOG so the
 * checkout flow can resolve them; the unpaid slugs (`premier` = custom sales,
 * `essential` = free) intentionally don't appear in Stripe. This invariant
 * is enforced by `plans.test.ts`.
 */

export type Plan = {
  name: string;
  price: string;
  /** Optional strikethrough price (promotional display) */
  originalPrice?: string;
  /** Optional label that replaces the numeric price, e.g. "FREE" */
  priceBadge?: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  href: string;
  highlight?: boolean;
};

export const brandPlans: Plan[] = [
  {
    name: "Listed",
    price: "45",
    period: "/mo",
    description: "Be present on the platform with a basic listing.",
    features: [
      "Up to 2 active collections",
      "1,000 shopper scans / month",
      "Brand profile page",
      "Catalog & size chart upload",
      "Standard search visibility",
      "Basic analytics",
    ],
    cta: "Get Listed",
    href: "/signup?audience=brand&plan=listed",
  },
  {
    name: "Featured",
    price: "200",
    period: "/mo",
    description: "Strong visibility and marketplace growth.",
    features: [
      "Unlimited collections",
      "10,000 shopper scans / month",
      "Eligible for Top Brands placement",
      "Enhanced analytics dashboard",
      "Product & outfit insights",
      "Priority ranking & featured badge",
    ],
    cta: "Get Featured",
    href: "/signup?audience=brand&plan=featured",
    highlight: true,
  },
  {
    name: "Premier",
    price: "Custom",
    period: "",
    description: "Custom exposure and dedicated growth support.",
    features: [
      "Everything in Featured",
      "Custom monthly exposure quota",
      "Custom placement opportunities",
      "Dedicated onboarding & support",
      "Custom integrations",
      "Optional merchandising support",
    ],
    cta: "Contact team",
    href: "/signup?audience=brand&plan=premier",
  },
];

// Shopper plans — wardrobe-first, restructured around the three core
// differentiators (try-on quota / AI recommendations quota / cross-brand
// search). The Model plan's headline advantage is the cross-brand
// assistant: it can recommend pieces from EVERY active brand on the
// platform, not just the user's own wardrobe.
export const clientPlans: Plan[] = [
  {
    name: "Essential",
    price: "0",
    originalPrice: "9.99",
    priceBadge: "FREE",
    period: "/mo",
    description: "Start your digital wardrobe — free during launch.",
    features: [
      "10 wardrobe slots",
      "Up to 3 of your own clothing items",
      "5 AI outfit try-ons per month",
      "Build and save outfits from your wardrobe",
      "Mix your clothes with certified brand pieces",
    ],
    cta: "Start my wardrobe — free",
    href: "/signup?audience=client&plan=essential",
  },
  {
    name: "Fashion",
    price: "25.99",
    period: "/mo",
    description: "Your AI stylist working from your saved wardrobe.",
    features: [
      "40 wardrobe slots",
      "Up to 15 of your own clothing items",
      "50 AI outfit try-ons per month",
      "50 AI outfit recommendations per month",
      "Recommendations from your wardrobe only",
      "Custom occasions & moods",
    ],
    cta: "Choose Fashion",
    href: "/signup?audience=client&plan=fashion",
  },
  {
    name: "Model",
    price: "29.99",
    period: "/mo",
    description: "Cross-brand AI styling across every Aplomb brand.",
    features: [
      "Unlimited wardrobe slots",
      "Unlimited personal clothing items",
      "200 AI outfit try-ons per month",
      "Unlimited AI outfit recommendations",
      "Cross-brand recommendations across all brands",
      "Best-match product discovery from the full catalogue",
    ],
    cta: "Choose Model",
    href: "/signup?audience=client&plan=model",
    highlight: true,
  },
];
