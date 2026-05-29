import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ok, err } from "@/lib/api";
import { parseJsonBody } from "@/lib/validate";
import { LIMITS, enforceLimits, tooManyRequests } from "@/lib/rateLimit-upstash";
import { getStripe, isStripeConfigured, PLAN_CATALOG, priceIdForPlan } from "@/lib/stripe";

const bodySchema = z
  .object({
    plan: z.enum(["listed", "featured", "fashion", "model"]),
  })
  .strict();

/**
 * POST /api/checkout — start a Stripe Checkout Session (subscription mode) for
 * the signed-in user. Brand plans require a brand owner/admin; shopper plans are
 * tied to the user. Returns { url } for a client-side redirect to Stripe.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return err("UNAUTHORIZED", "You must be signed in to subscribe.", 401);

  const parsed = await parseJsonBody(req, bodySchema);
  if (!parsed.ok) return parsed.response;
  const { plan } = parsed.data;

  const guard = await enforceLimits(`checkout:${userId}`, [LIMITS.brand_writes]);
  if (!guard.allowed) return tooManyRequests(guard.retryAfterSeconds);

  if (!isStripeConfigured()) {
    return err("BILLING_UNAVAILABLE", "Billing is not configured.", 503);
  }
  const priceId = priceIdForPlan(plan);
  if (!priceId) {
    return err("PRICE_NOT_CONFIGURED", `No Stripe price configured for "${plan}".`, 503);
  }

  const def = PLAN_CATALOG[plan];
  const stripe = getStripe();
  const origin = req.nextUrl.origin;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, stripeCustomerId: true },
  });
  if (!user) return err("NOT_FOUND", "User not found.", 404);

  const metadata: Record<string, string> = { side: def.side, plan, userId };
  let customerId: string | null;

  if (def.side === "brand") {
    // The brand subscription belongs to a brand the user owns or admins.
    const membership = await db.brandUser.findFirst({
      where: { userId, role: { in: ["owner", "admin"] } },
      select: { brand: { select: { id: true, name: true, stripeCustomerId: true } } },
    });
    if (!membership?.brand) {
      return err("FORBIDDEN", "You must be a brand owner or admin to manage billing.", 403);
    }
    const brand = membership.brand;
    metadata.brandId = brand.id;
    customerId = brand.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        name: brand.name,
        metadata: { aplomb_brand_id: brand.id },
      });
      customerId = customer.id;
      await db.brand.update({ where: { id: brand.id }, data: { stripeCustomerId: customerId } });
    }
  } else {
    // Shopper subscription tied to the user.
    customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        name: user.name ?? undefined,
        metadata: { aplomb_user_id: userId },
      });
      customerId = customer.id;
      await db.user.update({ where: { id: userId }, data: { stripeCustomerId: customerId } });
    }
  }

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/pricing`,
    metadata,
    // Mirror metadata onto the subscription so the webhook can resolve it even
    // for events that don't carry the original Checkout Session.
    subscription_data: { metadata },
  });

  if (!checkout.url) return err("CHECKOUT_ERROR", "Could not start checkout.", 500);
  return ok({ url: checkout.url });
}
