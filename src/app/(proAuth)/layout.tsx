import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/** Outer guard: session required for all /pro/* routes. */
export default async function ProAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return <>{children}</>;
}
