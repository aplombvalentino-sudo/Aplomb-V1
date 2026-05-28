import Link from "next/link";
import { Metadata } from "next";
import { ClientSignOutLink } from "@/components/client/ClientSignOutLink";

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
    <div className="min-h-[100dvh] bg-[#F7F6F3]">
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 30%, rgba(210,190,170,0.16) 0%, transparent 70%)",
        }}
      />

      {/* Header */}
      <header className="border-b border-black/[0.07] bg-[#F7F6F3]/90 backdrop-blur-md
                          sticky top-0 z-10 px-6 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="text-[15px] font-semibold tracking-tight text-[#111010]
                     hover:opacity-60 transition-opacity duration-200"
        >
          Aplomb
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/app/wardrobe"
            className="text-[12px] text-[#7A7773] hover:text-[#111010] transition-colors duration-200
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
            className="text-[12px] text-[#7A7773] hover:text-[#111010] transition-colors duration-200"
          >
            Plans
          </Link>
          <span aria-hidden className="h-3 w-px bg-black/10" />
          <ClientSignOutLink />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-14">
        {/* Hero */}
        <div className="mb-12 text-center">
          <span className="inline-flex items-center rounded-full border border-black/10
                           bg-white/60 px-3 py-1 text-[10px] font-medium uppercase
                           tracking-[0.18em] text-[#6B6965]">
            Find your perfect fit
          </span>
          <h1 className="mt-5 font-serif text-[clamp(2rem,4vw,3rem)] font-semibold
                         leading-[1.08] tracking-[-0.03em] text-[#111010]">
            Choose a brand to get started.
          </h1>
          <p className="mt-4 text-[16px] leading-relaxed text-[#6B6965] max-w-[44ch] mx-auto">
            Enter your measurements once. Get accurate size recommendations and
            complete outfit suggestions.
          </p>
        </div>

        {/* Brand grid */}
        {brands.length === 0 ? (
          <div className="rounded-2xl border border-black/[0.06] bg-white py-20 text-center">
            <p className="text-[#6B6965] font-medium">No brands available yet.</p>
            <p className="mt-2 text-sm text-[#7A7773]">
              Check back soon or{" "}
              <Link href="/signup" className="text-[#111010] underline underline-offset-2">
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
                className="group relative overflow-hidden rounded-2xl bg-white
                           border border-black/[0.06] p-6
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
                               ring-1 ring-black/[0.07] overflow-hidden mb-4"
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

                <p className="text-[15px] font-semibold text-[#111010] leading-tight">
                  {brand.name}
                </p>
                <p className="mt-1 text-[12px] text-[#7A7773]">
                  {brand._count.products} product{brand._count.products !== 1 ? "s" : ""}
                </p>

                <div className="mt-4 flex items-center gap-1.5 text-[12px] font-medium
                                 text-[#4a3f35] group-hover:gap-2 transition-all duration-200">
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
