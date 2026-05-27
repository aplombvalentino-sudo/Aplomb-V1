# Staging environment setup

This file documents how to set up a **second Supabase project** + a Vercel
preview branch to test destructive migrations and risky changes without
touching production data.

The whole setup is one-time, takes ~10 minutes, and is free (Supabase free
tier × 2 projects is allowed). After it exists, destructive changes go through
this loop:

```
local branch → push → Vercel preview deploys against staging Supabase →
verify → merge to main → Vercel prod deploys against production Supabase
```

---

## 1. Create the staging Supabase project

1. Go to https://supabase.com/dashboard → **New project**.
2. Name it `aplomb-staging`, **same region as production (eu-west-1)** so
   latency parity is realistic.
3. Pick a separate, strong DB password. Save it to your password manager.
4. Free tier is fine.
5. Wait for provisioning (~2 minutes).

## 2. Apply the schema to staging

From your local machine:

```bash
cd C:\Users\Utilisateur\aplomb

# Point a local one-shot deploy at the staging DB. DON'T put these in .env.local.
export DATABASE_URL="postgresql://postgres:<STAGING_PASSWORD>@<staging-host>:6543/postgres?pgbouncer=true"
export DIRECT_URL="postgresql://postgres:<STAGING_PASSWORD>@<staging-host>:5432/postgres"

npm run db:deploy      # applies prisma/migrations/* to staging
npm run db:seed        # seeds the demo brand + products
```

Then **immediately unset those vars** so you don't accidentally hit staging
from later commands:

```bash
unset DATABASE_URL DIRECT_URL
```

## 3. Apply the RLS policies to staging

Open the staging Supabase SQL editor and paste the contents of
`prisma/rls.sql`. Run it.

## 4. Create the body-scans bucket on staging

Same as prod:

- Storage → **New bucket** → `body-scans` → Public: **OFF**.

## 5. Wire a Vercel preview environment to staging

In Vercel → Project → **Settings → Environment Variables**:

For each variable that points at the DB or Supabase, **add a "Preview" scope
override** with the staging values:

| Variable | Production value | Preview value |
|---|---|---|
| `DATABASE_URL` | prod pooler URL | **staging pooler URL** |
| `DIRECT_URL` | prod direct URL | **staging direct URL** |
| `PRISMA_DATABASE_URL` | prod pooler URL | **staging pooler URL** |
| `SUPABASE_URL` | `https://<prod>.supabase.co` | `https://<staging>.supabase.co` |
| `SUPABASE_ANON_KEY` | prod anon | **staging anon** |
| `SUPABASE_SERVICE_ROLE_KEY` | prod service role | **staging service role** |

Leave everything else (AI keys, NEXTAUTH_SECRET, Upstash) unchanged — those can be
shared between environments unless you have a specific reason to isolate.

**Mark the override scope explicitly as "Preview" only** so production keeps using prod values.

## 6. Trigger a preview deploy

Push a branch to GitHub:

```bash
git checkout -b staging-test
git push -u origin staging-test
```

Vercel creates a preview URL like `https://aplomb-v1-staging-test-<hash>.vercel.app`.
That deploy uses the staging Supabase project.

Verify the deploy is healthy:

- Sign up a test account
- Run a fake scan
- Check that nothing showed up in production Supabase

## 7. Going forward — destructive-migration dry run

```bash
git checkout -b db/some-destructive-change
# edit prisma/schema.prisma
npm run db:migrate -- --name some_destructive_change
# commit, push -> Vercel deploys this branch to staging
# Run real-data verification against staging
# If OK, merge to main -> prod deploys
```

---

## Anti-patterns to avoid

- ❌ Putting staging env vars in `.env.local` — confuses local dev which
  Supabase project is "real."
- ❌ Sharing the production `SUPABASE_SERVICE_ROLE_KEY` with staging Supabase.
  These are different projects with different keys.
- ❌ Running `prisma db push` against staging. Use `db:deploy` (versioned
  migrations) so staging applies the exact SQL prod will see.
- ❌ Treating staging as long-lived state. Wipe and reseed periodically so
  you don't get gradual drift between staging and a fresh prod restore.

## Reseeding staging

```bash
export DATABASE_URL=... DIRECT_URL=...  # staging
npx prisma migrate reset --force        # wipes + re-applies all migrations
npm run db:seed
unset DATABASE_URL DIRECT_URL
```

`migrate reset` is destructive on staging — that's the whole point. Never run
it against production. The `--force` flag skips the interactive confirmation.
