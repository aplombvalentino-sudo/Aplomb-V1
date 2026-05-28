import "server-only";
import { db } from "@/lib/db";
import { getOutstandingDocs, type LegalDocType } from "./legalVersions";

/**
 * Server helper: which required legal documents does this user still need to
 * (re-)accept? Empty array = up to date. Use this to gate access and force
 * re-acceptance after a version bump — e.g. in a layout/middleware guard:
 *
 *   const outstanding = await getOutstandingLegalDocs(session.user.id);
 *   if (outstanding.length) redirect("/legal/re-accept");
 */
export async function getOutstandingLegalDocs(userId: string): Promise<LegalDocType[]> {
  const rows = await db.legalAcceptance.findMany({
    where: { userId },
    select: { documentType: true, documentVersion: true },
  });
  return getOutstandingDocs(rows);
}
