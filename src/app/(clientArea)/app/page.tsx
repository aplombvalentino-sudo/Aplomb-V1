import { redirect } from "next/navigation";

/**
 * The shopper landing inside the app shell is now the wardrobe. The brand
 * grid that used to live here moved to /app/discover. Anyone hitting /app
 * directly (signup redirect, deep-link from marketing) lands on their
 * wardrobe — the new product centre.
 */
export default function ClientAppRoot() {
  redirect("/app/wardrobe");
}
