import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import { HeroSection } from "@/components/public/HeroSection";
import { SocialProofBar } from "@/components/public/SocialProofBar";
import { FeaturesSection } from "@/components/public/FeaturesSection";
import { CtaSection } from "@/components/public/CtaSection";

export default async function LandingPage() {
  const session = await auth();

  if (session?.user?.id) {
    // Authenticated: check if they have a brand
    const membership = await db.brandUser.findFirst({
      where: { userId: session.user.id },
    });
    redirect(membership ? "/pro/dashboard" : "/pro/onboarding");
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
