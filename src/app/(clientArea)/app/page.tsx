import Link from "next/link";
import { Metadata } from "next";
import { ClientSignOutLink } from "@/components/client/ClientSignOutLink";
import { Logo } from "@/components/brand/Logo";

export const metadata: Metadata = { title: "Find your fit — Aplomb" };

async function getBrands() {
  const base =
    process.env.NEXTAUTH_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  try {
    const res = await fetch(`${base}/api/brands`, { cache: "no-store" });
    const json = await res.json();
    return json.data?.brands ?? [];
  } catch {
    return [];
  }
}

type Brand = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string;
  _count: { products: number };
};

export default async function ClientDiscoveryPage() {
  const brands: Brand[] = await getBrands();

  return (
    <div className="min-h-[100dvh] bg-canvas">
      {/* Header */}
      <header className="border-b border-hairline bg-canvas/90 backdrop-blur-md
                          sticky top-0 z-10 px-6 py-4 flex items-center justify-between">
        <Link
          href="/"
          aria-label="Aplomb — home"
          className="text-[17px] text-ink hover:opacity-60 transition-opacity duration-200"
        >
          <Logo />
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/app/wardrobe"
            className="text-[12px] text-ink-subtle hover:text-ink transition-colors duration-200
                       flex items-center gap-1.5"
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden>
              <path d="M6.5 1.5l1.5 4.5H12L8.5 8.5l1.5 4L6.5 10 3 12.5l1.5-4L1 6h4L6.5 1.5z"
                    stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
            </svg>
            Wardrobe
          </Link>
          <Link
            href="/app/pricing"
            className="text-[12px] text-ink-subtle hover:text-ink transition-colors duration-200"
          >
            Plans
          </Link>
          <span aria-hidden className="h-3 w-px bg-hairline-strong" />
          <ClientSignOutLink />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-14">
        {/* Hero */}
        <div className="mb-12 text-center">
          <span className="inline-flex items-center rounded-full border border-hairline-strong
                           bg-surface-raised px-3 py-1 text-[10px] font-medium uppercase
                           tracking-[0.18em] text-ink-muted">
            Find your fit
          </span>
          <h1 className="mt-5 font-serif text-[clamp(2rem,4vw,3rem)] font-semibold
                         leading-[1.08] tracking-[-0.03em] text-ink">
            Choose a <em className="italic">brand</em> to get started
            <span className="text-accent">.</span>
          </h1>
          <p className="mt-4 text-[16px] leading-relaxed text-ink-muted max-w-[44ch] mx-auto">
            Enter your measurements once. Get size recommendations and
            complete outfit suggestions.
          </p>
        </div>

        {/* Brand grid */}
        {brands.length === 0 ? (
          <div className="rounded-2xl border border-hairline bg-surface py-20 text-center">
            <p className="text-ink-muted font-medium">No brands available yet.</p>
            <p className="mt-2 text-sm text-ink-subtle">
              Check back soon or{" "}
              <Link href="/signup" className="text-ink underline underline-offset-2">
                create your brand
              </Link>
              .
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
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={brand.logoUrl} alt={brand.name} className="h-full w-full object-cover" />
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
                  Start fit session
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
