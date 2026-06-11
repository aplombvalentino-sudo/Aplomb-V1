"use client";

import { PageTransition } from "@/components/motion/PageTransition";

export default function ProAuthTemplate({ children }: { children: React.ReactNode }) {
  return <PageTransition variant="dolly">{children}</PageTransition>;
}
