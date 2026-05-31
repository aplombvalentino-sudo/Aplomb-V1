import { describe, it, expect } from "vitest";
import { brandPlans, clientPlans, type Plan } from "./plans";
import { PLAN_CATALOG } from "@/lib/stripe";

const ALL_PLANS: Array<{ side: "brand" | "client"; plan: Plan }> = [
  ...brandPlans.map((plan) => ({ side: "brand" as const, plan })),
  ...clientPlans.map((plan) => ({ side: "client" as const, plan })),
];

// ── href shape ───────────────────────────────────────────────────────────────

describe("plan hrefs — the contract with /signup", () => {
  // The signup page reads ?audience= and ?plan= via useSearchParams. If a href
  // doesn't carry both, the user lands on the audience chooser with no plan
  // pre-selected — silently degrading the funnel.
  it.each(ALL_PLANS)(
    "$side plan '$plan.name' has href /signup?audience=$side&plan=<slug>",
    ({ side, plan }) => {
      const re = new RegExp(`^/signup\\?audience=${side}&plan=[a-z][a-z0-9_-]*$`);
      expect(plan.href).toMatch(re);
    },
  );
});

// ── Cross-file invariant with Stripe catalog ────────────────────────────────

describe("paid plans MUST exist in lib/stripe PLAN_CATALOG", () => {
  // Anything not in this list is intentionally outside Stripe: `premier`
  // sends users to manual contact, `essential` is free (no checkout).
  const NON_CHECKOUT_SLUGS = new Set(["premier", "essential"]);

  it.each(ALL_PLANS)(
    "$side plan '$plan.name' has a slug that's either in PLAN_CATALOG or whitelisted",
    ({ plan }) => {
      const slug = plan.href.split("plan=")[1];
      expect(slug, "href must end with plan=<slug>").toBeTruthy();
      if (NON_CHECKOUT_SLUGS.has(slug!)) return;
      // Paid slug: must exist in the Stripe catalog so /api/checkout can resolve it.
      expect(
        slug! in PLAN_CATALOG,
        `slug '${slug}' is in a marketing card but missing from PLAN_CATALOG`,
      ).toBe(true);
    },
  );

  it("every PLAN_CATALOG paid slug has a matching marketing card (no orphaned Stripe products)", () => {
    const marketingSlugs = new Set(
      ALL_PLANS.map(({ plan }) => plan.href.split("plan=")[1]),
    );
    for (const stripeSlug of Object.keys(PLAN_CATALOG)) {
      expect(
        marketingSlugs.has(stripeSlug),
        `PLAN_CATALOG has '${stripeSlug}' but no pricing card surfaces it`,
      ).toBe(true);
    }
  });
});

// ── Visual invariants ────────────────────────────────────────────────────────

describe("highlight & FREE badge are exclusive UI signals", () => {
  it("exactly one brand plan is highlighted (the 'most chosen' pill)", () => {
    expect(brandPlans.filter((p) => p.highlight).length).toBe(1);
  });

  it("exactly one client plan is highlighted", () => {
    expect(clientPlans.filter((p) => p.highlight).length).toBe(1);
  });

  it("only Essential carries the FREE priceBadge (and only it has originalPrice)", () => {
    const withBadge = clientPlans.filter((p) => p.priceBadge);
    expect(withBadge).toHaveLength(1);
    expect(withBadge[0]!.name).toBe("Essential");
    expect(withBadge[0]!.priceBadge).toBe("FREE");
    expect(withBadge[0]!.originalPrice).toBe("9.99");

    // Brand side has no FREE tier — guard against accidental copy/paste.
    expect(brandPlans.filter((p) => p.priceBadge)).toHaveLength(0);
  });
});

// ── Rendering safety ─────────────────────────────────────────────────────────

describe("plan data shape — non-empty UI surfaces", () => {
  it.each(ALL_PLANS)("$side plan '$plan.name' has the fields PlanCard renders", ({ plan }) => {
    expect(plan.name).toBeTruthy();
    expect(plan.price).toBeTruthy();
    expect(plan.description).toBeTruthy();
    expect(plan.cta).toBeTruthy();
    expect(plan.features.length).toBeGreaterThan(0);
    expect(plan.features.every((f) => f.length > 0)).toBe(true);
  });
});
