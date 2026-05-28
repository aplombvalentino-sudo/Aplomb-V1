"use client";

import { PageTransition } from "@/components/motion/PageTransition";

// Gentle fade so it composes with the hero's own entrance choreography.
export default function PublicTemplate({ children }: { children: React.ReactNode }) {
  return <PageTransition variant="fade">{children}</PageTransition>;
}
