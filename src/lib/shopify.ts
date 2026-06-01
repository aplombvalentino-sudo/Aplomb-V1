/**
 * Shopify integration — placeholder module.
 *
 * Product.externalId and ProductVariant.externalId map to Shopify product/variant IDs.
 * Wire up these stubs when implementing the Shopify app or sync webhook.
 *
 * Environment variables needed (add when implementing):
 *   SHOPIFY_API_KEY=<key>
 *   SHOPIFY_API_SECRET=<secret>
 *   SHOPIFY_APP_URL=<url>
 *
 * SAFETY: every public function in this module throws unconditionally — they
 * are NOT no-ops. Calling them from production code will fail loudly so the
 * bug is caught at deploy time rather than silently dropping data.
 */

export type ShopifyProduct = {
  id: string;
  title: string;
  body_html: string;
  vendor: string;
  product_type: string;
  tags: string;
  images: Array<{ src: string }>;
  variants: Array<{
    id: string;
    sku: string;
    title: string;
    price: string;
    inventory_quantity: number;
  }>;
};

export type ShopifySyncResult = {
  created: number;
  updated: number;
  errors: string[];
};

const NOT_IMPLEMENTED =
  "[shopify] Not implemented. The Shopify integration is a placeholder — " +
  "wire @shopify/shopify-api before invoking. If you reached this from a " +
  "production code path, that's a bug: either remove the call or implement " +
  "the integration. See module-level comment for required env vars.";

// TODO: implement using @shopify/shopify-api when adding Shopify app
export async function syncShopifyProducts(
  _brandId: string,
  _shopDomain: string,
  _accessToken: string
): Promise<ShopifySyncResult> {
  throw new Error(`${NOT_IMPLEMENTED} (syncShopifyProducts)`);
}

// TODO: implement webhook handler for product/update, product/delete
export async function handleShopifyWebhook(
  _topic: string,
  _shopDomain: string,
  _payload: unknown
): Promise<void> {
  throw new Error(`${NOT_IMPLEMENTED} (handleShopifyWebhook)`);
}

// TODO: implement OAuth flow for Shopify app installation
export function getShopifyAuthUrl(_shop: string, _state: string): string {
  throw new Error(`${NOT_IMPLEMENTED} (getShopifyAuthUrl)`);
}
