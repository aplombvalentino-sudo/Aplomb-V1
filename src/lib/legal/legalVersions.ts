/**
 * Single source of truth for legal-document versions (clickwrap acceptance).
 *
 * Bump a `version` here whenever the corresponding document materially changes,
 * and update the matching "Last updated" copy on /cgu or /privacy. Because every
 * acceptance row stores the version that was accepted, bumping a version makes
 * prior acceptances "stale" — use `getOutstandingDocs()` / `isAcceptanceCurrent()`
 * to detect users who must re-accept, and gate them as needed.
 *
 * Versions are date-stamped (YYYY-MM-DD) so they are human-auditable and always
 * increase lexicographically.
 */

export const LEGAL_DOCS = {
  terms: {
    version: "2026-05-28",
    path: "/cgu",
    label: "Terms of Use",
  },
  privacy: {
    version: "2026-05-28",
    path: "/privacy",
    label: "Privacy Policy",
  },
} as const;

export type LegalDocType = keyof typeof LEGAL_DOCS; // "terms" | "privacy"

export const LEGAL_DOC_TYPES = Object.keys(LEGAL_DOCS) as LegalDocType[];

export const CURRENT_TERMS_VERSION = LEGAL_DOCS.terms.version;
export const CURRENT_PRIVACY_VERSION = LEGAL_DOCS.privacy.version;

/** The version the app currently requires for a given document. */
export function currentVersion(type: LegalDocType): string {
  return LEGAL_DOCS[type].version;
}

type AcceptanceLike = { documentType: LegalDocType; documentVersion: string };

/**
 * Given a user's acceptance records, return the document types whose most-recent
 * accepted version is missing or older than the current version — i.e. the
 * documents the user must (re-)accept. An empty array means fully up to date.
 */
export function getOutstandingDocs(accepted: AcceptanceLike[]): LegalDocType[] {
  const latest = new Map<LegalDocType, string>();
  for (const a of accepted) {
    const prev = latest.get(a.documentType);
    // Date-stamped versions sort lexicographically, so keep the highest seen.
    if (!prev || a.documentVersion > prev) latest.set(a.documentType, a.documentVersion);
  }
  return LEGAL_DOC_TYPES.filter((type) => latest.get(type) !== currentVersion(type));
}

/** True when the user has accepted the current version of every required document. */
export function isAcceptanceCurrent(accepted: AcceptanceLike[]): boolean {
  return getOutstandingDocs(accepted).length === 0;
}
