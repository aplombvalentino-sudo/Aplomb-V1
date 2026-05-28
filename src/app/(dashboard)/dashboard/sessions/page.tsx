import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { format } from "date-fns";

export default async function SessionsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await db.brandUser.findFirst({
    where: { userId: session.user.id },
    include: { brand: true },
  });
  if (!membership) redirect("/login");

  const brandId = membership.brand.id;

  const sessions = await db.recommendationSession.findMany({
    where: { brandId },
    include: {
      bodyProfile: true,
      outfits: {
        include: {
          items: {
            include: { product: { select: { name: true } } },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-ink">
        Fit <em className="italic">sessions</em>
        <span className="text-accent">.</span>
      </h1>
      <p className="mt-1 text-sm text-ink-muted">
        Recent recommendation sessions for debugging and review.
      </p>

      <div className="mt-8">
        {sessions.length === 0 ? (
          <div className="rounded-xl border border-hairline bg-surface py-16 text-center">
            <p className="text-ink-muted">No sessions yet.</p>
            <p className="mt-2 text-sm text-ink-subtle">
              Sessions appear here once shoppers use your widget.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-hairline bg-surface">
            <table className="w-full text-sm">
              <thead className="border-b border-hairline bg-surface-raised">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-ink-muted">Session ID</th>
                  <th className="px-4 py-3 text-left font-medium text-ink-muted">Context</th>
                  <th className="px-4 py-3 text-left font-medium text-ink-muted">Outfits</th>
                  <th className="px-4 py-3 text-left font-medium text-ink-muted">Measurements</th>
                  <th className="px-4 py-3 text-left font-medium text-ink-muted">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {sessions.map((s) => {
                  const measurements = s.bodyProfile?.rawMeasurementsJson as
                    | Record<string, number>
                    | null;
                  return (
                    <tr key={s.id} className="hover:bg-surface-raised">
                      <td className="px-4 py-3">
                        <code className="text-xs text-ink-muted nums">{s.id.slice(0, 12)}…</code>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="info">{s.context}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        {s.outfits.length > 0 ? (
                          <div className="space-y-1">
                            {s.outfits.map((o) => (
                              <div key={o.id} className="text-xs text-ink-muted">
                                {o.title} ({o.items.length} items)
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-ink-subtle">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {measurements ? (
                          <details className="cursor-pointer">
                            <summary className="text-xs text-accent hover:underline">
                              View
                            </summary>
                            <pre className="mt-1 max-h-40 overflow-auto rounded bg-surface-raised p-2 text-xs nums">
                              {JSON.stringify(measurements, null, 2)}
                            </pre>
                          </details>
                        ) : (
                          <span className="text-ink-subtle">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-muted nums">
                        {format(new Date(s.createdAt), "MMM d, yyyy HH:mm")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
