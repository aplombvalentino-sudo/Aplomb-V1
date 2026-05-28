"use client";

import { PageTransition } from "@/components/motion/PageTransition";

export default function ClientAreaTemplate({ children }: { children: React.ReactNode }) {
  return <PageTransition variant="shift">{children}</PageTransition>;
}
