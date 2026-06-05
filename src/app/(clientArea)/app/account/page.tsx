import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Logo } from "@/components/brand/Logo";
import { ClientSignOutLink } from "@/components/client/ClientSignOutLink";
import { AccountPanel } from "@/components/client/AccountPanel";

export const metadata = { title: "Your account — Aplomb" };

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/app/account");
  }

  // One query for the user shell; a second for the latest body profile so
  // the Fit Insights section can show real numbers when they exist. Both
  // run in parallel — the profile join is small (1 row + brand name).
  const [user, latestBodyProfile] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        clientPlan: true,
        createdAt: true,
        _count: {
          select: {
            bodyProfiles: true,
            recommendationSessions: true,
            legalAcceptances: true,
          },
        },
      },
    }),
    db.bodyProfile.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        rawMeasurementsJson: true,
        bodyShapeSummary: true,
        measurementMode: true,
        createdAt: true,
        brand: { select: { name: true, slug: true } },
      },
    }),
  ]);

  if (!user) {
    redirect("/signup");
  }

  // The measurements JSON is the NormalizedMeasurements shape (server-only
  // type). Map down to the small subset the UI uses so the component
  // doesn't need that type at the client boundary.
  type Measurements = {
    heightCm?: number;
    weightKg?: number;
    chestCm?: number;
    waistCm?: number;
    hipsCm?: number;
    shouldersCm?: number;
    inseamCm?: number;
  };
  const m = (latestBodyProfile?.rawMeasurementsJson ?? null) as Measurements | null;
  const fitInsights = latestBodyProfile
    ? {
        scannedAt: latestBodyProfile.createdAt.toISOString(),
        mode: latestBodyProfile.measurementMode,
        brandName: latestBodyProfile.brand.name,
        brandSlug: latestBodyProfile.brand.slug,
        shapeSummary: latestBodyProfile.bodyShapeSummary,
        measurements: {
          height: m?.heightCm ?? null,
          weight: m?.weightKg ?? null,
          chest: m?.chestCm ?? null,
          waist: m?.waistCm ?? null,
          hips: m?.hipsCm ?? null,
          shoulders: m?.shouldersCm ?? null,
          inseam: m?.inseamCm ?? null,
        },
      }
    : null;

  return (
    <div className="min-h-[100dvh] bg-canvas">
      {/* Header — wardrobe-first nav, consistent with /app/wardrobe + /app/outfits */}
      <header className="border-b border-hairline bg-canvas/90 backdrop-blur-md
                          sticky top-0 z-10 px-6 py-4 flex items-center justify-between">
        <Link href="/app/wardrobe" aria-label="Aplomb — wardrobe" className="text-ink hover:opacity-60 transition-opacity duration-200">
          <Logo className="text-[17px]" />
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/app/wardrobe" className="text-[12px] text-ink-subtle hover:text-ink transition-colors duration-200">Wardrobe</Link>
          <Link href="/app/outfits" className="text-[12px] text-ink-subtle hover:text-ink transition-colors duration-200">Outfits</Link>
          <Link href="/app/discover" className="text-[12px] text-ink-subtle hover:text-ink transition-colors duration-200">Discover</Link>
          <Link href="/app/account" className="text-[12px] font-medium text-ink transition-colors">Profile</Link>
          <span aria-hidden className="h-3 w-px bg-hairline-strong" />
          <ClientSignOutLink />
        </nav>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-12">
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-subtle">
          Profile
        </p>
        <h1 className="mt-3 font-serif text-[2.2rem] font-medium leading-[1.05] tracking-[-0.02em] text-ink">
          Your <em className="italic">data</em>, your rules
          <span className="text-accent">.</span>
        </h1>
        <p className="mt-3 text-[14px] text-ink-muted max-w-[52ch]">
          Manage your account, fit insights, and the GDPR controls you have over
          your personal data.
        </p>

        <AccountPanel
          initialName={user.name ?? ""}
          email={user.email}
          plan={user.clientPlan}
          memberSince={user.createdAt.toISOString()}
          counts={{
            bodyProfiles: user._count.bodyProfiles,
            recommendationSessions: user._count.recommendationSessions,
            legalAcceptances: user._count.legalAcceptances,
          }}
          fitInsights={fitInsights}
        />
      </main>
    </div>
  );
}
