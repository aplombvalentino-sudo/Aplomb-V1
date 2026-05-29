import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { getStripe, planForPriceId, PLAN_CATALOG, type CheckoutPlanSlug } from "@/lib/stripe";

// Stripe signature verification uses Node crypto; force the Node.js runtime.
export const runtime = "nodejs";

const ENTITLING_STATUSES = ["active", "trialing", "past_due"];

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[stripe webhook] STRIPE_WEBHOOK_SECRET not set");
    return new NextResponse("Webhook not configured", { status: 503 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) return new NextResponse("Missing signature", { status: 400 });

  const body = await req.text(); // raw body required for signature verification

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, secret);
  } catch {
    console.warn("[stripe webhook] signature verification failed");
    return new NextResponse("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscription(event);
        break;
      default:
        break; // ignore other events
    }
  } catch (e) {
    console.error("[stripe webhook] handler error", e);
    return new NextResponse("Handler error", { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function syncSubscription(event: Stripe.Event) {
  const stripe = getStripe();

  // Resolve the Subscription object (checkout.session.completed carries only an id).
  let subscription: Stripe.Subscription;
  if (event.type === "checkout.session.completed") {
    const checkoutSession = event.data.object as Stripe.Checkout.Session;
    if (checkoutSession.mode !== "subscription" || !checkoutSession.subscription) return;
    const subId =
      typeof checkoutSession.subscription === "string"
        ? checkoutSession.subscription
        : checkoutSession.subscription.id;
    subscription = await stripe.subscriptions.retrieve(subId);
  } else {
    subscription = event.data.object as Stripe.Subscription;
  }

  const meta = subscription.metadata ?? {};
  const priceId = subscription.items?.data?.[0]?.price?.id ?? "";

  // Resolve plan: prefer metadata, fall back to price-id lookup.
  let planSlug = meta.plan as CheckoutPlanSlug | undefined;
  if (!planSlug || !PLAN_CATALOG[planSlug]) {
    planSlug = planForPriceId(priceId)?.slug;
  }
  if (!planSlug || !PLAN_CATALOG[planSlug]) {
    console.warn("[stripe webhook] could not resolve plan", { priceId, sub: subscription.id });
    return;
  }
  const def = PLAN_CATALOG[planSlug];

  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

  // current_period_end has lived on the subscription and (newer APIs) the item.
  const anySub = subscription as unknown as {
    current_period_end?: number;
    items?: { data?: Array<{ current_period_end?: number }> };
  };
  const periodEndUnix = anySub.current_period_end ?? anySub.items?.data?.[0]?.current_period_end ?? null;
  const currentPeriodEnd = periodEndUnix ? new Date(periodEndUnix * 1000) : null;

  const status = subscription.status; // matches our SubscriptionStatus enum 1:1
  const isDelete = event.type === "customer.subscription.deleted";
  const ended =
    isDelete ||
    status === "canceled" ||
    status === "incomplete_expired" ||
    status === "unpaid";
  const entitled = !ended && ENTITLING_STATUSES.includes(status);

  const baseData = {
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
    plan: planSlug,
    status,
    currentPeriodEnd,
    cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
  };

  if (def.side === "brand") {
    let brandId = meta.brandId as string | undefined;
    if (!brandId) {
      const brand = await db.brand.findFirst({
        where: { stripeCustomerId: customerId },
        select: { id: true },
      });
      brandId = brand?.id;
    }
    if (!brandId) {
      console.warn("[stripe webhook] no brand for subscription", subscription.id);
      return;
    }

    // Ignore a stale cancel for a subscription that was already replaced.
    if (isDelete) {
      const existing = await db.subscription.findUnique({ where: { brandId } });
      if (existing && existing.stripeSubscriptionId !== subscription.id) return;
    }

    await db.subscription.upsert({
      where: { brandId },
      create: { brandId, ...baseData },
      update: baseData,
    });

    await db.brand.update({
      where: { id: brandId },
      data: { plan: entitled ? def.brandPlan ?? "free" : "free" },
    });
  } else {
    let userId = meta.userId as string | undefined;
    if (!userId) {
      const u = await db.user.findFirst({
        where: { stripeCustomerId: customerId },
        select: { id: true },
      });
      userId = u?.id;
    }
    if (!userId) {
      console.warn("[stripe webhook] no user for subscription", subscription.id);
      return;
    }

    if (isDelete) {
      const existing = await db.subscription.findUnique({ where: { userId } });
      if (existing && existing.stripeSubscriptionId !== subscription.id) return;
    }

    await db.subscription.upsert({
      where: { userId },
      create: { userId, ...baseData },
      update: baseData,
    });

    await db.user.update({
      where: { id: userId },
      data: { clientPlan: entitled ? def.clientPlan ?? "essential" : "essential" },
    });
  }
}
