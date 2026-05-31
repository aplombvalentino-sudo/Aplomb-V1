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

export const clientPlans: Plan[] = [
  {
    name: "Essential",
    price: "0",
    originalPrice: "9.99",
    priceBadge: "FREE",
    period: "/mo",
    description: "Free during launch — try Aplomb across your favourite brands.",
    features: [
      "5 body scans / month",
      "Save up to 4 looks",
      "Preset occasions",
      "Per-brand sizing",
      "No payment required",
    ],
    cta: "Get Essential — free",
    href: "/signup?audience=client&plan=essential",
  },
  {
    name: "Fashion",
    price: "25.99",
    period: "/mo",
    description: "For active shoppers who care about fit.",
    features: [
      "15 body scans / month",
      "Save up to 10 looks",
      "Custom occasions",
      "Extended preset library",
    ],
    cta: "Get Fashion",
    href: "/signup?audience=client&plan=fashion",
  },
  {
    name: "Model",
    price: "29.99",
    period: "/mo",
    description: "Unlimited scans and full digital wardrobe.",
    features: [
      "Unlimited body scans",
      "Unlimited wardrobe",
      "Cross-brand outfit composer",
      "Mobile wardrobe sync",
      "Custom colour picker",
    ],
    cta: "Get Model",
    href: "/signup?audience=client&plan=model",
    highlight: true,
  },
];
