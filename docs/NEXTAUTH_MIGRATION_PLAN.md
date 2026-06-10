# Migration plan — `next-auth` 5.0.0-beta.31 → stable

*Status: planned, not yet executed. Triage doc for the upgrade window.*

## Current state

```
package.json   "next-auth": "5.0.0-beta.31"
```

Every authenticated surface in the app — shopper signup/login, brand
signup/login, the `/api/auth/[...nextauth]` route, the middleware that
gates `/app/*` and `/pro/*`, session cookies, JWT shape, Prisma
adapter — rides on this single beta pin. Auth is the most critical
dependency we have a beta of in prod.

## Why this can't ship to launch as-is

1. **No semver contract.** Beta-to-beta upgrades have been silently
   breaking session shape, cookie names, and middleware signatures
   throughout the 5.0 prerelease cycle. We've already absorbed two
   such breaks since pinning .31 (committed in stripe-billing PR).
2. **No security backports to old betas.** A CVE landing on the
   stable line doesn't backport to .31. We'd have to chase the
   latest beta to get the fix — i.e. take an unknown set of other
   changes with it.
3. **Adapter coupling.** `@auth/prisma-adapter` ships its own
   prerelease line tracking next-auth v5. The two MUST move
   together or the adapter rejects the session callback shape.
4. **NextAuth 5 stable was tagged in early 2025.** As of late 2025
   the beta cadence has slowed; .31 is well behind current.
   Migrating later means more changes batched together.

## Trigger criteria (do the migration when ANY hits)

- First paying customer (Stripe webhook flips a Subscription to
  `active`).
- DAU > 1,000 sustained over a week.
- A 5.0 stable CVE published.
- Migration window scheduled regardless if 90 days pass since this
  doc was written.

## What touches next-auth in this codebase

```
src/lib/auth.ts                              NextAuth() config — providers,
                                             callbacks, session strategy.
                                             Custom credentials authorize().
src/middleware.ts                            auth() guard for /app/* + /pro/*.
src/app/api/auth/[...nextauth]/route.tsx     Default handler re-export.
src/app/(auth)/login/LoginContent.tsx        signIn("credentials") + signIn("google")
src/app/(auth)/signup/SignupForm.tsx         signIn("credentials") on success
src/components/client/ClientSignOutLink.tsx  signOut() trigger

Every API route + every server component                await auth() session check
                                                         (50+ call sites).

Tests:
  src/lib/auth.test.ts          unit tests for authorizeCredentialsLogin
  src/lib/sessionToken.test.ts  session cookie token logic
```

## Upgrade strategy — single PR, three commits

### Commit 1: dependency bump

```
"next-auth":              "^5.0.0"           // pin to the latest stable major
"@auth/prisma-adapter":   "^2.x"             // matching stable adapter
```

- Stay on `^` ranges only after the first successful deploy; pin
  exact (`5.0.x`) until then so a transitive bump doesn't surprise us.
- `npm install`, regenerate lockfile, do NOT touch any code yet.

### Commit 2: API surface migration

Map each beta-to-stable breaking change. Known ones to expect (verify
against the 5.0 release notes at PR-author time):

- **Session callback signature.** The `session({ session, token })`
  callback is the most-touched API. Stable consolidated the
  parameter shape. Update `src/lib/auth.ts`.
- **Middleware export.** `auth` is now imported from the NextAuth()
  factory return, not from `next-auth/middleware`. Update
  `src/middleware.ts` accordingly.
- **JWT cookie names.** Default cookie names changed once during
  beta. If stable changed them again, our current sessions invalidate
  on deploy — log every user out gracefully (don't 500). Add a
  pre-deploy notice on the login page or accept the one-time
  invalidation.
- **`getServerSession` removal.** If we still call it anywhere,
  replace with the universal `auth()` helper.

Each tsc error becomes a commit checklist item. Don't try to be clever
— let TypeScript drive the fix list.

### Commit 3: regression hardening

- Run `npx vitest run` — keep going until `src/lib/auth.test.ts`
  passes against the new API.
- Manually run the four critical paths in dev:
  1. Shopper signup (credentials)
  2. Brand signup (credentials)
  3. Login (credentials)
  4. Google OAuth signin
- Pull `await auth()` call sites that look stale.
- Update `src/lib/auth.ts` header comment to drop the "beta" warning.

## Rollback plan

NextAuth 5 stable doesn't have backwards-compatible cookies with
beta.31 in every configuration. Rollback means:

1. Revert the dependency bump commit + the API migration commit.
2. Redeploy.
3. ALL active sessions get logged out (cookie format mismatch
   either way).

This is fine — auth is stateless at the session level, no data is
lost, users sign back in. But it does mean we can't sneak the
migration in during peak traffic. Schedule for off-hours.

## Test plan additions

- Add a `lib/auth.contract.test.ts` that snapshots the EXACT session
  shape we return to consumers. Today the test only covers the
  credentials authorize path; a contract test catches future
  breaking changes from any next-auth version bump.
- Add a Playwright (or similar e2e) test for the four critical paths
  above so the manual smoke becomes automated. Worth doing BEFORE
  the migration so we have a baseline.

## Why not do it now

We're pre-launch. The trigger criteria are deliberate — the migration
needs a maintenance window, brings rollback complexity, and the
upside (security + semver) doesn't outweigh the schedule pressure
until launch readiness is locked. Once any trigger hits, this doc is
the playbook.

## Open questions to settle before executing

- Are we OK with a one-time forced log-out across all users at the
  cookie format change? If not, write a cookie migration shim
  (NextAuth's `jwt` decoder is pluggable; we could read the old
  cookie and reissue in the new format on first request after
  deploy).
- Are we sticking with JWT session strategy or moving to database
  sessions for the Stripe webhook → User row lookup? Stable supports
  both; we picked JWT because it sidesteps a session DB round-trip
  on every request. Decision stays unless we have a concrete reason
  to flip.
- `@auth/prisma-adapter` API surface — confirm `accounts`,
  `sessions`, `verificationToken` table shapes haven't diverged.
  Worst case is a small migration to add/remove a column.

## Time estimate

| Phase                  | Effort        |
|------------------------|---------------|
| Dependency bump        | 10 min        |
| API surface migration  | 90 min        |
| Regression + smoke     | 60 min        |
| Buffer for surprises   | 60 min        |
| **Total**              | **~4 hours**  |

Plus one off-hours maintenance window for the deploy.
