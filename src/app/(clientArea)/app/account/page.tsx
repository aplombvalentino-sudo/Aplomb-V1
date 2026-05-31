import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Logo } from "@/components/brand/Logo";
import { AccountPanel } from "@/components/client/AccountPanel";

export const metadata = { title: "Your account — Aplomb" };

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/app/account");
  }

  const user = await db.user.findUnique({
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
  });

  if (!user) {
    // Authed but no row — orphan auth user; force re-signup.
    redirect("/signup");
  }

  return (
    <div className="min-h-[100dvh] bg-canvas">
      <header className="border-b border-hairline px-6 py-5 flex items-center justify-between">
        <Link href="/app" className="flex items-center gap-3 text-ink">
          <Logo className="text-[1.05rem]" />
          <span className="text-[12px] text-ink-subtle hover:text-ink transition-colors">
            ← Back to brands
          </span>
        </Link>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-12">
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-subtle">
          Account
        </p>
        <h1 className="mt-3 font-serif text-[2.2rem] font-medium leading-[1.05] tracking-[-0.02em] text-ink">
          Your <em className="italic">data</em>, your rules
          <span className="text-accent">.</span>
        </h1>
        <p className="mt-3 text-[14px] text-ink-muted max-w-[52ch]">
          Under GDPR, you can access, rectify, export, or erase every piece of personal
          data we hold about you. The buttons below trigger those actions directly.
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
        />
      </main>
    </div>
  );
}
