# Data Retention Policy — Aplomb

*Last reviewed: 2026-05-31. Owner: Aplomb SAS founder. Reviewed yearly + on any new data category.*

Per GDPR Art 5 §1.e ("storage limitation"), each data category is kept only as long as needed for its purpose. This policy is the single source of truth for those durations and is the contract that the retention cron enforces.

## Per-category retention table

| Data category | Retention | Reason | Enforcement |
|---|---|---|---|
| Side body-scan photo | Until measurement derivation completes (seconds) | Data minimisation — only needed for sizing | Inline `deleteBodyScan(sidePath)` in `/api/measurements/route.tsx`. Locked by `route.test.ts` |
| Front body-scan photo | 30 days from last try-on | Cache the photo so repeat try-ons don't re-upload, but bounded | **TODO: weekly cron at `/api/admin/retention-sweep`** |
| `BodyProfile.rawMeasurementsJson` | Account lifetime + 30 days | Audit trail of measurement drift across account lifecycle | Deleted via `eraseUser()` on account deletion |
| `BodyProfile.sideImagePath` | n/a — always null post-derivation | Already deleted | `/api/measurements` sets to `null` at persistence |
| `BodyProfile.frontImagePath` | Synced with front-photo deletion | Reflects storage state | Cron nulls the path when the bucket object is purged |
| `RecommendationSession` | Min(13 months from creation, account deletion) | CNIL's general session-data guidance | **TODO: cron purge** |
| `Outfit` + `OutfitItem` | Same as parent `RecommendationSession` | Cascade | DB FK CASCADE |
| `TryOnResult` (image URLs) | Same as parent `BodyProfile` | Cascade | DB FK CASCADE; storage objects auto-cleaned by fal (their CDN expires) |
| `User` row | Until user deletes account | Service-essential | `eraseUser()` |
| `User.email` + `User.name` | Same as User | PII — part of the row | `eraseUser()` |
| `Account`, `Session` (NextAuth) | CASCADE on User delete | Auth glue | CASCADE FK |
| `Subscription` (Stripe IDs) | 10 years from creation | French Code de commerce art. L123-22 (commercial bookkeeping) | **TODO: subscription rows kept post-deletion; flag `Subscription.userId` to null when User deleted instead of cascading. Migration needed.** |
| `LegalAcceptance` (clickwrap proof) | Account lifetime + 5 years | French Code civil art. 2224 (general prescription) | Currently CASCADE on User delete; **TODO: switch to SET NULL + IP truncation for the extra 5 years** |
| Anonymous shopper data (no userId) | 13 months from last activity | CNIL guidance + cookie max-age | **TODO: cron purge by `RecommendationSession.createdAt + ownerTokenHash != null`** |
| Server logs (Vercel + Supabase) | ~30 days | Operational + security | Auto by provider; documented here |
| Rate-limit state (Upstash Redis) | TTL-bound by limit window | Auto by Redis TTLs | n/a |

## Implementation roadmap

### Already enforced (in code)
- Side photo immediate delete (`/api/measurements`)
- Anonymous session cookie has 7-day max-age + httpOnly + same-site=lax
- `client_plan` cookie has 1-year max-age

### Cron — to implement (Phase 6 of GDPR roadmap)

A single Vercel cron at `/api/admin/retention-sweep` running weekly:

```ts
// Pseudo-code
export async function GET() {
  await purgeOldFrontPhotos(30);          // days since last tryOnResult on the bodyProfile
  await purgeOldAnonymousData(13 * 30);   // days since RecommendationSession.createdAt for ownerTokenHash != null
  await purgeOldRecommendationSessions(13 * 30); // for signed-in users; non-cascading delete
}
```

Authenticated via a `X-CRON-SECRET` header that only Vercel knows. No human ever calls this endpoint.

### Migration — to implement
- Switch `Subscription.userId` and `LegalAcceptance.userId` FKs from CASCADE to SET NULL so they survive User deletion for the legally required retention period (10 years and 5 years respectively).
- Add `LegalAcceptance.ipAddressTruncated` column populated by a one-off migration that truncates `ipAddress` after 24 months (anonymisation while keeping proof).

## Manual deletion paths

Documented so support can answer the question "how do I delete X?":

- **Whole user account**: `/app/account` → Danger zone → type DELETE. Triggers `eraseUser()`.
- **Single try-on result**: Not exposed today. Workaround: delete account, recreate. (TODO: per-tryon delete in `/app/account`.)
- **Brand catalogue**: Brand owner can delete a product / size chart via the pro console.

## Audit trail

This file's git history is the audit trail. Every change to retention durations should:

1. Update the table above.
2. Update `/privacy` §2 table to match.
3. Bump `LEGAL_DOCS.privacy.version` if the change is material.
4. Update the cron implementation.
