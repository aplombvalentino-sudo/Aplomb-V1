/**
 * Stripe product/price seed.
 *
 * Creates the four recurring subscription products in YOUR Stripe account, then
 * prints the STRIPE_PRICE_* env lines to paste into .env.local and Vercel.
 *
 * Run (key stays in your env — never commit it):
 *   npm run stripe:seed                 # reads STRIPE_SECRET_KEY from .env.local
 *   # or:
 *   STRIPE_SECRET_KEY=sk_live_... npx tsx scripts/stripe-seed.ts
 *
 * Idempotent: products/prices are tagged with metadata.aplomb_plan, so re-runs
 * reuse the existing product and matching monthly price instead of duplicating.
 */
import Stripe from "stripe";

const CURRENCY = "eur";

const PLANS = [
  { slug: "listed", env: "STRIPE_PRICE_LISTED", name: "Aplomb — Listed (Brand)", amount: 4500 },
  { slug: "featured", env: "STRIPE_PRICE_FEATURED", name: "Aplomb — Featured (Brand)", amount: 20000 },
  { slug: "fashion", env: "STRIPE_PRICE_FASHION", name: "Aplomb — Fashion (Shopper)", amount: 2599 },
  { slug: "model", env: "STRIPE_PRICE_MODEL", name: "Aplomb — Model (Shopper)", amount: 2999 },
] as const;

async function main() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.error(
      "STRIPE_SECRET_KEY is not set. Add it to .env.local (or pass it inline) and re-run.",
    );
    process.exit(1);
  }

  const stripe = new Stripe(key);
  const mode = key.startsWith("sk_live") ? "LIVE" : "TEST";
  console.log(`\nSeeding Aplomb products in Stripe (${mode} mode)…\n`);

  const envLines: string[] = [];

  for (const plan of PLANS) {
    // Find or create the product (tagged so re-runs don't duplicate).
    const found = await stripe.products.search({
      query: `metadata['aplomb_plan']:'${plan.slug}'`,
    });
    let product = found.data[0];
    if (!product) {
      product = await stripe.products.create({
        name: plan.name,
        metadata: { aplomb_plan: plan.slug },
      });
      console.log(`+ product ${plan.slug.padEnd(9)} created  ${product.id}`);
    } else {
      console.log(`= product ${plan.slug.padEnd(9)} reused    ${product.id}`);
    }

    // Find or create a matching active monthly price.
    const prices = await stripe.prices.list({ product: product.id, active: true, limit: 100 });
    let price = prices.data.find(
      (p) =>
        p.unit_amount === plan.amount &&
        p.currency === CURRENCY &&
        p.recurring?.interval === "month",
    );
    if (!price) {
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.amount,
        currency: CURRENCY,
        recurring: { interval: "month" },
        metadata: { aplomb_plan: plan.slug },
      });
      console.log(`  + price created  ${price.id}  (${(plan.amount / 100).toFixed(2)} ${CURRENCY.toUpperCase()}/mo)`);
    } else {
      console.log(`  = price reused   ${price.id}`);
    }

    envLines.push(`${plan.env}=${price.id}`);
  }

  console.log("\n────────────────────────────────────────────────────────────");
  console.log("Add these to .env.local and to Vercel → Environment Variables:");
  console.log("────────────────────────────────────────────────────────────");
  console.log(envLines.join("\n"));
  console.log("");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
