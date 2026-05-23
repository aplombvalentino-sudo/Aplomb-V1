import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ProSideNav } from "@/components/pro/ProSideNav";

/** Inner guard: BrandUser required. Shows sidebar layout. */
export default async function ProWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await db.brandUser.findFirst({
    where: { userId: session.user.id },
    include: { brand: true },
    orderBy: { brand: { createdAt: "asc" } },
  });

  if (!membership) redirect("/pro/onboarding");

  const { brand } = membership;

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[#F5F4F1]">
      <ProSideNav
        brandName={brand.name}
        brandLogoUrl={brand.logoUrl}
        plan={brand.plan}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl px-8 py-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
