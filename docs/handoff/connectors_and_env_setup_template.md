# Aplomb — Connectors & Env Setup Template

> Integration map. **Placeholders only — no real secret values.**
> The new conversation should know what exists and how it's wired; the user
> supplies the actual values in `.env.local` (gitignored) and Vercel.
>
> Full template lives in `.env.example` at the repo root.

## Supabase (Auth + Postgres + Storage)

**What it does:** Primary database (via Prisma), user authentication (password
validation through Supabase Auth), and private storage for body-scan photos.

**Env vars:**
```
DATABASE_URL=postgresql://...            # pooled (pgbouncer:6543)
DIRECT_URL=postgresql://...              # direct (5432) — migrations
PRISMA_DATABASE_URL=postgresql://...     # READ FIRST by lib/db.ts (pooled)
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=sb_publishable_YOUR_KEY_HERE
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_HERE   # server-only
```

**Used in:** `src/lib/db.ts` (Prisma client), `src/lib/supabase.ts` (anon +
service-role clients), `src/lib/ai/storage.ts` (body-scans bucket),
`src/lib/auth.ts` (signInWithPassword).

**Structure:**
- Tables (Prisma): `User`, `Account`, `Session`, `VerificationToken`, `Brand`,
  `BrandUser`, `Product`, `ProductVariant`, `SizeChart`, `BodyProfile`,
  `RecommendationSession`, `Outfit`, `OutfitItem`, `TryOnResult`.
- RLS policies: `prisma/rls.sql` (idempotent; also bundled in the init
  migration). **Must be run in the Supabase SQL editor.**
- Storage: private bucket **`body-scans`** (Public = OFF). Service role only.

**Notes:** Free tier = **no managed backups** (see `BACKUPS_AND_MIGRATIONS.md`).
`PRISMA_DATABASE_URL` exists to dodge a preview-runner placeholder that pins
`DATABASE_URL` to localhost.

## NextAuth v5 (authentication)

**What it does:** Session management (JWT strategy). Credentials provider
validates against Supabase Auth; Google OAuth optional.

**Env vars:**
```
NEXTAUTH_URL=http://localhost:3000        # prod: the deployed URL
NEXTAUTH_SECRET=YOUR_LONG_RANDOM_STRING   # openssl rand -base64 32
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID           # optional
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET   # optional
```

**Used in:** `src/lib/auth.ts`, `src/middleware.ts` (guards `/pro/*`),
layout-level guards. Login rate-limit lives inside `Credentials.authorize`.

## Gemini (outfit generation)

**What it does:** Generates 1–3 catalog-constrained outfits per recommendation
session (JSON mode, productIds validated against the brand catalog).

**Env vars:**
```
GEMINI_API_KEY=YOUR_KEY_HERE
GEMINI_MODEL=gemini-2.5-flash             # optional override
```

**Used in:** `src/lib/ai/gemini/client.ts` + `outfits.ts`, called by
`POST /api/outfits`. Server-only.

## fal.ai / FASHN (virtual try-on)

**What it does:** Renders try-on imagery (user front photo + garment image).

**Env vars:**
```
FAL_KEY=YOUR_KEY_ID:YOUR_KEY_SECRET
FAL_FASHN_MODEL=fashn/tryon/v1.6          # optional override
```

**Used in:** `src/lib/ai/fal/client.ts` + `tryon.ts`, called by
`POST /api/tryon`. Result cached in `TryOnResult`. Server-only. Most expensive
endpoint — strictest rate limit.

## 3DLOOK (body measurement) — NOT WIRED YET

**What it does:** Will replace the stub measurement heuristic.

**Env vars (reserved):**
```
THREEDLOOK_API_KEY=YOUR_KEY_HERE          # placeholder — not used yet
MEASUREMENT_PROVIDER=stub                 # switch to "3dlook" when wired
```

**Used in:** `src/lib/ai/measurementProvider.ts` — `runMeasurement()` currently
returns a heuristic. Drop the 3DLOOK call into the marked TODO; the rest of the
app consumes `NormalizedMeasurements` unchanged.

## Upstash Redis (rate limiting)

**What it does:** Distributed sliding-window rate limits across Vercel instances.

**Env vars:**
```
UPSTASH_REDIS_REST_URL=https://YOUR-DB.upstash.io
UPSTASH_REDIS_REST_TOKEN=YOUR_TOKEN_HERE
```

**Used in:** `src/lib/rateLimit-upstash.ts` (the `LIMITS` registry). Falls back
to an in-memory limiter if unset (single-instance, dev only). Recommended
region: **eu-west-1** (matches Supabase).

## Vercel (hosting / CI-deploy)

**What it does:** Builds + hosts. `npm run build` runs
`prisma migrate deploy && prisma generate && next build`. Auto-deploys on push
to `main`.

**Env vars:** all of the above, set in Project → Settings → Environment
Variables (mark secrets "Sensitive"). `VERCEL_URL` is auto-injected and used as
a fallback base URL.

## GitHub

- Repo: `aplombvalentino-sudo/Aplomb-V1`, default branch `main`.
- `.github/dependabot.yml` — weekly grouped dependency PRs.
- `.github/workflows/audit.yml` — advisory `npm audit --audit-level=high`.
- `.github/workflows/security-smoke.yml` — post-deploy fail-closed check on
  anonymous `/api/outfits` + `/api/tryon`.
- `.github/PULL_REQUEST_TEMPLATE.md` — enforces the destructive-migration checklist.
- Recommended: enable Secret scanning + Push protection in repo settings.

## Shopify (billing) — PLACEHOLDER

**What it does (future):** Hosted checkout for paid plans.

**Wiring point:** `src/app/checkout/page.tsx` — fill `SHOPIFY_PRODUCT_URLS` and
uncomment the redirect. Free Essential plan skips checkout entirely. No env
vars defined yet.
