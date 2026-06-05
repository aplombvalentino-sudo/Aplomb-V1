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

// Shopper plans — framed for streetwear rotation building. Each plan sells
// on (a) how many pieces fit in your rotation, (b) how many of those can
// be your own photographed pieces, (c) how deep the fit-building toolkit
// goes. Sizing features (scans, try-ons) appear as a single optional line
// at the bottom of each card — fit support is secondary to the rotation.
export const clientPlans: Plan[] = [
  {
    name: "Essential",
    price: "0",
    originalPrice: "9.99",
    priceBadge: "FREE",
    period: "/mo",
    description: "Save your core rotation — free while we launch.",
    features: [
      "10 rotation slots",
      "Up to 3 pieces from your real closet",
      "Mix your own pieces with certified streetwear",
      "Build and test essential fits",
      "Optional fit insights",
    ],
    cta: "Start my rotation — free",
    href: "/signup?audience=client&plan=essential",
  },
  {
    name: "Fashion",
    price: "25.99",
    period: "/mo",
    description: "Bigger rotation, full fit-building toolkit.",
    features: [
      "40 rotation slots",
      "Up to 15 pieces from your real closet",
      "Layer outerwear, sneakers, caps and bags",
      "Cross-brand mixing for every fit",
      "Custom occasions & moods",
      "Fit insights when you want them",
    ],
    cta: "Choose Fashion",
    href: "/signup?audience=client&plan=fashion",
  },
  {
    name: "Model",
    price: "29.99",
    period: "/mo",
    description: "Unlimited rotation. The full styling rig.",
    features: [
      "Unlimited rotation slots",
      "Unlimited pieces from your closet",
      "Full outfit experimentation",
      "Mobile rotation sync",
      "Custom colour picker",
      "Priority fit recommendations",
    ],
    cta: "Choose Model",
    href: "/signup?audience=client&plan=model",
    highlight: true,
  },
];
