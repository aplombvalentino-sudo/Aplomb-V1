import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { CopyButton } from "@/components/dashboard/CopyButton";

export default async function IntegrationPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await db.brandUser.findFirst({
    where: { userId: session.user.id },
    include: { brand: true },
  });
  if (!membership) redirect("/login");

  const { brand } = membership;
  const baseUrl =
    process.env.NEXTAUTH_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const scriptSnippet = `<!-- Aplomb Fit Widget -->
<script
  src="${baseUrl}/widget.js"
  data-brand="${brand.slug}"
  data-product="{{product.id}}"
  async
></script>`;

  const iframeSnippet = `<iframe
  src="${baseUrl}/widget?brand=${brand.slug}&product={{product.id}}"
  style="border:none;width:100%;height:600px;"
  title="Aplomb Fit & Style"
></iframe>`;

  const apiExample = `// POST ${baseUrl}/api/measurements
{
  "brandSlug": "${brand.slug}",
  "mediaUrl": "https://your-cdn.com/user-photo.jpg",
  "heightCm": 170,
  "userId": "optional-user-id",
  "context": "PDP"
}`;

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-ink">
        Your <em className="italic">integration</em>
        <span className="text-accent">.</span>
      </h1>
      <p className="mt-1 text-sm text-ink-muted">
        Embed the Aplomb widget into your storefront in minutes.
      </p>

      <div className="mt-8 space-y-6">
        {/* Brand info */}
        <Card>
          <CardHeader>
            <CardTitle>Your Brand</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-ink-subtle">
                  Brand slug
                </dt>
                <dd className="mt-1 flex items-center gap-2">
                  <code className="rounded bg-surface-raised px-2 py-0.5 text-sm nums">
                    {brand.slug}
                  </code>
                  <CopyButton text={brand.slug} />
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-ink-subtle">
                  Plan
                </dt>
                <dd className="mt-1 text-sm capitalize text-ink">{brand.plan}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Script embed */}
        <Card>
          <CardHeader>
            <CardTitle>Option 1 — Script tag (recommended)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-ink-muted">
              Paste this snippet into your product page HTML, just before{" "}
              <code className="rounded bg-surface-raised px-1 text-xs">&lt;/body&gt;</code>.
              Replace <code className="rounded bg-surface-raised px-1 text-xs">{"{{product.id}}"}</code>{" "}
              with your product&apos;s ID.
            </p>
            <div className="relative">
              <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-xs text-gray-200">
                {scriptSnippet}
              </pre>
              <CopyButton
                text={scriptSnippet}
                className="absolute right-2 top-2"
                dark
              />
            </div>
          </CardContent>
        </Card>

        {/* iFrame embed */}
        <Card>
          <CardHeader>
            <CardTitle>Option 2 — iframe</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-ink-muted">
              Use an iframe to embed the widget inline on your page.
            </p>
            <div className="relative">
              <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-xs text-gray-200">
                {iframeSnippet}
              </pre>
              <CopyButton
                text={iframeSnippet}
                className="absolute right-2 top-2"
                dark
              />
            </div>
          </CardContent>
        </Card>

        {/* API reference */}
        <Card>
          <CardHeader>
            <CardTitle>API reference</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-ink-muted">
              You can call the Aplomb API directly from your backend if you prefer
              a fully custom integration.
            </p>
            <div className="space-y-4">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  1. Get measurements
                </p>
                <div className="relative">
                  <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-xs text-gray-200">
                    {apiExample}
                  </pre>
                  <CopyButton
                    text={apiExample}
                    className="absolute right-2 top-2"
                    dark
                  />
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  2. Generate outfits
                </p>
                <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-xs text-gray-200">
                  {`// POST ${baseUrl}/api/outfits\n{\n  "brandSlug": "${brand.slug}",\n  "recommendationSessionId": "<id from step 1>",\n  "context": { "occasion": "casual", "maxItems": 4 }\n}`}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
