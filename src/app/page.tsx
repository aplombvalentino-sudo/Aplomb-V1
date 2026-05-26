import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CLIENT_PLAN_COOKIE, isValidClientPlan } from "@/lib/planLimits";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import { HeroSection } from "@/components/public/HeroSection";
import { SocialProofBar } from "@/components/public/SocialProofBar";
import { FeaturesSection } from "@/components/public/FeaturesSection";
import { CtaSection } from "@/components/public/CtaSection";

export default async function LandingPage() {
  const session = await auth();

  if (session?.user?.id) {
    // 1) If they already manage a brand, go to the pro dashboard.
    const membership = await db.brandUser.findFirst({
      where: { userId: session.user.id },
    });
    if (membership) redirect("/pro/dashboard");

    // 2) If they signed up as a shopper (client plan cookie set), go to /app.
    const cookieStore = await cookies();
    const rawPlan = cookieStore.get(CLIENT_PLAN_COOKIE)?.value;
    if (isValidClientPlan(rawPlan)) redirect("/app");

    // 3) Otherwise it's a brand owner mid-signup — push them to onboarding.
    redirect("/pro/onboarding");
  }

  return (
    <>
      <PublicHeader />
      <main>
        <HeroSection />
        <SocialProofBar />
        <FeaturesSection />
        <CtaSection />
      </main>
      <PublicFooter />
    </>
  );
}
