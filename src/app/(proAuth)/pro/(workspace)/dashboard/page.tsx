import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { OverviewCharts } from "@/components/dashboard/OverviewCharts";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };

export default async function ProDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await db.brandUser.findFirst({
    where: { userId: session.user.id },
    include: { brand: true },
  });
  if (!membership) redirect("/pro/onboarding");

  const { brand } = membership;

  const [productCount, sessionCount, outfitCount] = await Promise.all([
    db.product.count({ where: { brandId: brand.id, isActive: true } }),
    db.recommendationSession.count({ where: { brandId: brand.id } }),
    db.outfit.count({ where: { recommendationSession: { brandId: brand.id } } }),
  ]);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentSessions = await db.recommendationSession.findMany({
    where: { brandId: brand.id, createdAt: { gte: sevenDaysAgo } },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });

  const stats = [
    { label: "Active products",    value: productCount,  note: "in catalogue" },
    { label: "Fit sessions",        value: sessionCount,  note: "all time" },
    { label: "Outfits generated",   value: outfitCount,   note: "all time" },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#9C9894]">
          Overview
        </p>
        <h1 className="mt-1 font-serif text-[1.8rem] font-semibold leading-tight
                       tracking-[-0.025em] text-[#111010]">
          {brand.name}
        </h1>
        <p className="mt-1 text-sm text-[#6B6965]">
          Welcome back, {session.user.name ?? session.user.email}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl bg-white border border-black/[0.06]
                       shadow-[0_2px_16px_rgba(0,0,0,0.04)] px-6 py-5"
          >
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#9C9894]">
              {s.label}
            </p>
            <p className="mt-1.5 font-serif text-[2.4rem] font-semibold leading-none
                          tracking-tight text-[#111010] tabular-nums">
              {s.value}
            </p>
            <p className="mt-1 text-[11px] text-[#C9C5C0]">{s.note}</p>
          </div>
        ))}
      </div>

      {/* Sessions chart */}
      <div className="rounded-2xl bg-white border border-black/[0.06]
                      shadow-[0_2px_16px_rgba(0,0,0,0.04)] px-6 py-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#9C9894] mb-4">
          Fit sessions — last 7 days
        </p>
        <OverviewCharts
          sessions={recentSessions.map((s) => ({ date: s.createdAt.toISOString() }))}
        />
      </div>
    </div>
  );
}
