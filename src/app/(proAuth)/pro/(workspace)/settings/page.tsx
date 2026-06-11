import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { CopyButton } from "@/components/dashboard/CopyButton";
import { SettingsClient } from "@/components/pro/SettingsClient";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Settings" };

export default async function ProSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await db.brandUser.findFirst({
    where: { userId: session.user.id },
    include: { brand: true },
  });
  if (!membership) redirect("/pro/onboarding");

  const { brand } = membership;
  const config = (brand.configuration ?? {}) as Record<string, unknown>;
  const baseUrl =
    process.env.NEXTAUTH_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const embedSnippet = `<!-- Aplomb Fit Widget -->
<script
  src="${baseUrl}/widget.js"
  data-brand="${brand.slug}"
  data-product="{{product.id}}"
  async
></script>`;

  return (
    <div>
      <div className="mb-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-subtle">
          Settings
        </p>
        <h1 className="mt-1 font-serif text-[1.8rem] font-semibold leading-tight
                       tracking-[-0.025em] text-ink">
          Brand <em className="italic">settings</em><span className="text-accent">.</span>
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Manage your brand profile, appearance and widget integration.
        </p>
      </div>

      <div className="space-y-6">
        {/* Editable fields */}
        <SettingsClient
          brand={{
            id: brand.id,
            name: brand.name,
            slug: brand.slug,
            logoUrl: brand.logoUrl ?? "",
            primaryColor: brand.primaryColor,
            websiteUrl: (config.websiteUrl as string) ?? "",
          }}
        />

        {/* Read-only info */}
        <section className="rounded-2xl bg-surface border border-hairline
                             shadow-card p-6">
          <h2 className="text-[13px] font-semibold text-ink mb-4">Plan</h2>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center rounded-full border border-hairline
                             bg-canvas px-3 py-1 text-[11px] font-medium uppercase
                             tracking-[0.14em] text-ink-muted">
              {brand.plan}
            </span>
            <span className="text-sm text-ink-subtle">
              {brand.plan === "free"
                ? "Up to 100 sessions/month"
                : brand.plan === "pro"
                ? "Up to 5 000 sessions/month"
                : "Unlimited sessions"}
            </span>
          </div>
        </section>

        {/* Widget embed */}
        <section className="rounded-2xl bg-surface border border-hairline
                             shadow-card p-6">
          <h2 className="text-[13px] font-semibold text-ink mb-1">Widget embed</h2>
          <p className="text-sm text-ink-muted mb-4">
            Paste this into your product page HTML just before{" "}
            <code className="rounded bg-canvas px-1 text-[12px]">&lt;/body&gt;</code>.
          </p>
          <div className="relative">
            <pre className="overflow-x-auto rounded-xl bg-ink p-4 text-[12px]
                            text-on-ink/80 leading-relaxed">
              {embedSnippet}
            </pre>
            <CopyButton text={embedSnippet} className="absolute right-3 top-3" dark />
          </div>
        </section>

        {/* Client link */}
        <section className="rounded-2xl bg-surface border border-hairline
                             shadow-card p-6">
          <h2 className="text-[13px] font-semibold text-ink mb-1">Client fit link</h2>
          <p className="text-sm text-ink-muted mb-4">
            Share this URL directly with your customers for a standalone fit experience.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-xl bg-canvas px-4 py-2.5 text-[13px]
                             text-ink truncate">
              {baseUrl}/app/{brand.slug}
            </code>
            <CopyButton text={`${baseUrl}/app/${brand.slug}`} />
          </div>
        </section>
      </div>
    </div>
  );
}
