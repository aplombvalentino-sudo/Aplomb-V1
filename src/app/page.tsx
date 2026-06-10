import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import { HeroSection } from "@/components/public/HeroSection";
import { SocialProofBar } from "@/components/public/SocialProofBar";
import { FeaturesSection } from "@/components/public/FeaturesSection";
import { CtaSection } from "@/components/public/CtaSection";

// The homepage takes the strongest title — no template suffix. Inherits the
// description / OG / Twitter / robots from the root layout, which is already
// wardrobe-first.
export const metadata: Metadata = {
  title: "Aplomb — Digital Wardrobe & Outfit Tester",
  description:
    "Build your digital wardrobe. Add the clothes you already own, mix them with certified brand pieces, and try new outfits on yourself before you change.",
  alternates: { canonical: "/" },
};

export default async function LandingPage() {
  const session = await auth();

  if (session?.user?.id) {
    // 1) Brand membership IS the brand signal — owners + staff land on the
    //    pro dashboard. This branch covers the "logged into the brand
    //    workspace" case regardless of how they got here (login, signup,
    //    homepage visit).
    const membership = await db.brandUser.findFirst({
      where: { userId: session.user.id },
    });
    if (membership) redirect("/pro/dashboard");

    // 2) Anyone authenticated without a brand membership is a shopper.
    //    Go straight to /app. Previously this branch was guarded by
    //    the client-plan cookie and fell through to /pro/onboarding
    //    when absent — which is what sent freshly-logged-in shoppers
    //    (cookie not yet rehydrated) into the brand workspace. The
    //    cookie is still set by other surfaces as a fast plan-tier
    //    hint, but routing is now data-driven from brand membership
    //    alone.
    redirect("/app");
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
