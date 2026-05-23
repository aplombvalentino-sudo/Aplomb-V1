import type { Metadata } from "next";
import { PricingPageContent } from "@/components/public/PricingPageContent";

export const metadata: Metadata = { title: "Pricing" };

export default function PricingPage() {
  return <PricingPageContent />;
}
