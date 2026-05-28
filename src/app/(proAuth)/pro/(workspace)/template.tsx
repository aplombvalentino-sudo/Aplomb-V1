"use client";

import { PageTransition } from "@/components/motion/PageTransition";

// Re-mounts on navigation between workspace pages; the sidebar in the
// workspace layout stays anchored.
export default function WorkspaceTemplate({ children }: { children: React.ReactNode }) {
  return <PageTransition variant="shift">{children}</PageTransition>;
}
