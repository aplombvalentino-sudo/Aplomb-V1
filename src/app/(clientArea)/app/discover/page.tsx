import Link from "next/link";
import Image from "next/image";
import { Metadata } from "next";
import { ClientSignOutLink } from "@/components/client/ClientSignOutLink";
import { Logo } from "@/components/brand/Logo";
import { listActiveBrands } from "@/lib/brands";

export const metadata: Metadata = {
  title: "Discover brands — Aplomb",
  description: "Browse certified brands and add pieces to your wardrobe.",
};

/**
 * The brand-discovery surface — moved from /app to /app/discover so the
 * primary /app entry can be wardrobe-first. Tapping a brand still drops
 * the shopper into the per-brand wizard (which today is the fitting-room
 * flow); future iterations will surface a brand-catalog browser that
 * lets you add items to your wardrobe directly.
 */
export default async function DiscoverPage() {
  const brands = await listActiveBrands().catch(() => []);

  return (
    <div className="min-h-[100dvh] bg-canvas">
      {/* Header — same wardrobe-first nav as /app/wardrobe */}
      <header className="border-b border-hairline bg-canvas/90 backdrop-blur-md
                          sticky top-0 z-10 px-6 py-4 flex items-center justify-between">
        <Link href="/app/wardrobe" aria-label="Aplomb — wardrobe" className="text-ink hover:opacity-60 transition-opacity duration-200">
          <Logo className="text-[17px]" />
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            href="/app/wardrobe"
            className="text-[12px] text-ink-subtle hover:text-ink transition-colors duration-200"
          >
            Wardrobe
          </Link>
          <Link
            href="/app/outfits"
            className="text-[12px] text-ink-subtle hover:text-ink transition-colors duration-200"
          >
            Outfits
          </Link>
          <Link
            href="/app/discover"
            className="text-[12px] font-medium text-ink transition-colors"
          >
            Discover
          </Link>
          <Link
            href="/app/account"
            className="text-[12px] text-ink-subtle hover:text-ink transition-colors duration-200"
          >
            Profile
          </Link>
          <span aria-hidden className="h-3 w-px bg-hairline-strong" />
          <ClientSignOutLink />
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-14">
        <div className="mb-10">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-subtle">
            Discover
          </p>
          <h1 className="mt-2 font-serif text-[clamp(2rem,4vw,2.6rem)] font-medium leading-[1.05] tracking-[-0.02em] text-ink">
            Certified <em className="italic">brands</em>
            <span className="text-accent">.</span>
          </h1>
          <p className="mt-3 max-w-[50ch] text-[15px] leading-relaxed text-ink-muted">
            Browse certified brands and drop new pieces straight into your
            wardrobe. Mix them with the clothes you already own.
          </p>
        </div>

        {brands.length === 0 ? (
          <div className="rounded-2xl border border-hairline bg-surface py-20 text-center">
            <p className="text-ink-muted font-medium">No brands onboard yet.</p>
            <p className="mt-2 text-sm text-ink-subtle">
              Check back soon — or{" "}
              <Link href="/app/wardrobe/add" className="text-ink underline underline-offset-2">
                add a clothing item you already own
              </Link>{" "}
              to start your wardrobe.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {brands.map((brand) => (
              <Link
                key={brand.id}
                href={`/app/${brand.slug}`}
                className="group relative overflow-hidden rounded-2xl bg-surface
                           border border-hairline p-6
                           shadow-[0_2px_16px_rgba(0,0,0,0.04)]
                           hover:shadow-[0_4px_32px_rgba(0,0,0,0.09)]
                           transition-all duration-300"
              >
                {/* Colour accent */}
                <div
                  className="absolute top-0 right-0 h-24 w-24 rounded-full opacity-10
                               -translate-y-1/2 translate-x-1/2 transition-opacity
                               duration-300 group-hover:opacity-20"
                  style={{ background: brand.primaryColor }}
                />

                {/* Logo / initial */}
                <div
                  className="h-12 w-12 rounded-xl flex items-center justify-center
                               ring-1 ring-hairline overflow-hidden mb-4"
                  style={{ background: brand.primaryColor + "22" }}
                >
                  {brand.logoUrl ? (
                    <Image
                      src={brand.logoUrl}
                      alt={brand.name}
                      width={48}
                      height={48}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span
                      className="text-[15px] font-semibold"
                      style={{ color: brand.primaryColor }}
                    >
                      {brand.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>

                <p className="text-[15px] font-semibold text-ink leading-tight">
                  {brand.name}
                </p>
                <p className="mt-1 text-[12px] text-ink-subtle">
                  {brand._count.products} product{brand._count.products !== 1 ? "s" : ""}
                </p>

                <div className="mt-4 flex items-center gap-1.5 text-[12px] font-medium
                                 text-accent group-hover:gap-2 transition-all duration-200">
                  Browse brand
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 8L8 2M8 2H3M8 2V7" stroke="currentColor" strokeWidth="1.5"
                          strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
