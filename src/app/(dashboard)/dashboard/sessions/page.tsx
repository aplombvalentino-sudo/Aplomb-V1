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
      <h1 className="text-2xl font-bold text-gray-900">Fit Sessions</h1>
      <p className="mt-1 text-sm text-gray-500">
        Recent recommendation sessions for debugging and review.
      </p>

      <div className="mt-8">
        {sessions.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white py-16 text-center">
            <p className="text-gray-500">No sessions yet.</p>
            <p className="mt-2 text-sm text-gray-400">
              Sessions appear here once shoppers use your widget.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Session ID</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Context</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Outfits</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Measurements</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sessions.map((s) => {
                  const measurements = s.bodyProfile?.rawMeasurementsJson as
                    | Record<string, number>
                    | null;
                  return (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <code className="text-xs text-gray-500">{s.id.slice(0, 12)}…</code>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="info">{s.context}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        {s.outfits.length > 0 ? (
                          <div className="space-y-1">
                            {s.outfits.map((o) => (
                              <div key={o.id} className="text-xs text-gray-700">
                                {o.title} ({o.items.length} items)
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {measurements ? (
                          <details className="cursor-pointer">
                            <summary className="text-xs text-blue-600 hover:underline">
                              View
                            </summary>
                            <pre className="mt-1 max-h-40 overflow-auto rounded bg-gray-50 p-2 text-xs">
                              {JSON.stringify(measurements, null, 2)}
                            </pre>
                          </details>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
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
