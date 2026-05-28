import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { format } from "date-fns";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Fit Sessions" };

export default async function ProSessionsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await db.brandUser.findFirst({
    where: { userId: session.user.id },
    include: { brand: true },
  });
  if (!membership) redirect("/pro/onboarding");

  const sessions = await db.recommendationSession.findMany({
    where: { brandId: membership.brand.id },
    include: {
      bodyProfile: true,
      outfits: {
        include: {
          items: { include: { product: { select: { name: true } } } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div>
      <div className="mb-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#7A7773]">
          Fit Sessions
        </p>
        <h1 className="mt-1 font-serif text-[1.8rem] font-semibold leading-tight
                       tracking-[-0.025em] text-[#111010]">
          Session log
        </h1>
        <p className="mt-1 text-sm text-[#6B6965]">
          Read-only view of shopper sessions, measurements and generated outfits.
        </p>
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-2xl border border-black/[0.06] bg-white py-20 text-center">
          <p className="text-[#6B6965] font-medium">No sessions yet.</p>
          <p className="mt-2 text-sm text-[#7A7773]">
            Sessions appear once shoppers use your widget or client link.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white
                        shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
          <table className="w-full text-sm">
            <thead className="border-b border-black/[0.06] bg-[#F9F8F6]">
              <tr>
                {["Session", "Context", "Outfits", "Measurements", "Date"].map((h) => (
                  <th key={h} className="px-5 py-3.5 text-left text-[11px] font-medium
                                         uppercase tracking-[0.12em] text-[#7A7773]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04]">
              {sessions.map((s) => {
                const measurements = s.bodyProfile?.rawMeasurementsJson as
                  | Record<string, number>
                  | null;
                return (
                  <tr key={s.id} className="hover:bg-[#FAFAF8] transition-colors duration-150">
                    <td className="px-5 py-3.5">
                      <code className="text-[11px] text-[#7A7773] font-mono">
                        {s.id.slice(0, 14)}…
                      </code>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant="info">{s.context}</Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      {s.outfits.length > 0 ? (
                        <div className="space-y-0.5">
                          {s.outfits.map((o) => (
                            <div key={o.id} className="text-xs text-[#6B6965]">
                              {o.title}{" "}
                              <span className="text-[#7A7773]">({o.items.length} items)</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[#C9C5C0]">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {measurements ? (
                        <details className="cursor-pointer">
                          <summary className="text-xs text-[#4a3f35] hover:underline underline-offset-2">
                            View
                          </summary>
                          <pre className="mt-1.5 max-h-40 overflow-auto rounded-lg
                                          bg-[#F7F6F3] p-2.5 text-[11px] text-[#6B6965]">
                            {JSON.stringify(measurements, null, 2)}
                          </pre>
                        </details>
                      ) : (
                        <span className="text-[#C9C5C0]">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[#7A7773] tabular-nums">
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
  );
}
