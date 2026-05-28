import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { OverviewCharts } from "@/components/dashboard/OverviewCharts";

export default async function DashboardOverviewPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await db.brandUser.findFirst({
    where: { userId: session.user.id },
    include: { brand: true },
  });
  if (!membership) redirect("/login");

  const brandId = membership.brand.id;

  const [productCount, sessionCount, outfitCount] = await Promise.all([
    db.product.count({ where: { brandId, isActive: true } }),
    db.recommendationSession.count({ where: { brandId } }),
    db.outfit.count({
      where: { recommendationSession: { brandId } },
    }),
  ]);

  // Recent sessions for chart (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentSessions = await db.recommendationSession.findMany({
    where: { brandId, createdAt: { gte: sevenDaysAgo } },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });

  const stats = [
    { label: "Active Products", value: productCount },
    { label: "Fit Sessions", value: sessionCount },
    { label: "Outfits Generated", value: outfitCount },
  ];

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-ink">
        Your <em className="italic">overview</em>
        <span className="text-accent">.</span>
      </h1>
      <p className="mt-1 text-sm text-ink-muted">
        Welcome back, {session.user.name ?? session.user.email}
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader>
              <CardTitle>{s.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-ink nums">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Fit Sessions — last 7 days</CardTitle>
          </CardHeader>
          <CardContent>
            <OverviewCharts
              sessions={recentSessions.map((s) => ({
                date: s.createdAt.toISOString(),
              }))}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
