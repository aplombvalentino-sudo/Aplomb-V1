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

// TODO: implement using @shopify/shopify-api when adding Shopify app
export async function syncShopifyProducts(
  _brandId: string,
  _shopDomain: string,
  _accessToken: string
): Promise<ShopifySyncResult> {
  throw new Error("Shopify sync not yet implemented");
}

// TODO: implement webhook handler for product/update, product/delete
export async function handleShopifyWebhook(
  _topic: string,
  _shopDomain: string,
  _payload: unknown
): Promise<void> {
  throw new Error("Shopify webhooks not yet implemented");
}

// TODO: implement OAuth flow for Shopify app installation
export function getShopifyAuthUrl(_shop: string, _state: string): string {
  throw new Error("Shopify OAuth not yet implemented");
}
