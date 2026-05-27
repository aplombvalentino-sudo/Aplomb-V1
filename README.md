# Aplomb

AI fitting room for fashion brands. Shoppers get accurate size recommendations,
personalised outfit suggestions, and virtual try-on imagery; brands get a
marketplace presence with catalog, size charts, and analytics.

- **Brand side** (`/pro/*`) — catalog manager, size charts, marketplace presence
  dashboard, discovery + analytics consoles.
- **Shopper side** (`/app/*`) — brand discovery, AI fit wizard (Easy/Advanced
  modes), outfit ideas, virtual try-on, digital wardrobe.

## Stack

- Next.js 16 (App Router, Turbopack) · React 19 · TypeScript
- Supabase Auth + Postgres · Prisma
- NextAuth v5 (JWT session strategy)
- Tailwind v4 · `motion` (animations) · `lucide-react` (icons)
- Gemini 2.5 Flash (outfit generation) · fal.ai FASHN (virtual try-on)
- Zod (strict input validation on every endpoint)

---

## Running locally

### 1. Install

```bash
npm install
```

### 2. Set up environment variables

Copy the template **but never commit the resulting file**:

```bash
cp .env.example .env.local
```

`.env.local` is already in `.gitignore`. Fill in real values. Required vars:

| Variable | Where to get it |
|---|---|
| `DATABASE_URL`, `DIRECT_URL`, `PRISMA_DATABASE_URL` | Supabase → Project Settings → Database |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API |
| `NEXTAUTH_URL` | `http://localhost:3000` (local) / your domain (prod) |
| `NEXTAUTH_SECRET` | Generate: `openssl rand -base64 32` |
| `GEMINI_API_KEY` | https://aistudio.google.com/apikey |
| `FAL_KEY` | https://fal.ai/dashboard/keys (format: `<id>:<secret>`) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google Cloud Console (optional — only if Google OAuth is enabled) |

> ⚠️ See [SECURITY.md](./SECURITY.md) for the rules on handling secrets. Never
> put real values in tracked files.

### 3. Set up the database schema

```bash
npm run db:deploy      # apply pending migrations to Supabase
npm run db:generate    # generate the Prisma client
```

This repo uses **versioned Prisma migrations** under `prisma/migrations/`.
Every schema change MUST be a new migration committed to git.

#### Making a schema change

```bash
# 1. Edit prisma/schema.prisma
# 2. Generate a new migration interactively (runs against your DB)
npm run db:migrate -- --name describe_the_change

# 3. The new SQL appears in prisma/migrations/<timestamp>_describe_the_change/
# 4. Review the SQL, commit + push. Vercel runs `prisma migrate deploy` on every build.
```

#### Status / drift check

```bash
npm run db:status
```

Production deploys run `prisma migrate deploy` automatically as part of the
build script (`package.json`).

### 4. Create the body-scans bucket (one-time)

In the Supabase dashboard → Storage → **New bucket** → `body-scans` →
**Public toggle = OFF**. The service role inserts/reads/deletes via our
server-only client (`src/lib/supabase.ts → getSupabaseServiceClient()`).

### 5. Run the dev server

```bash
npm run dev
```

Open http://localhost:3000.

---

## Deployment (Vercel)

1. Push to GitHub. Vercel auto-detects the Next.js app.
2. In Vercel → Project Settings → Environment Variables, add every variable
   from `.env.example`. Mark each as **"Sensitive"** so the value can't be
   re-read from the dashboard.
3. First deploy. Copy the resulting `*.vercel.app` URL and set it as
   `NEXTAUTH_URL`, then redeploy once.
4. Build command (already set in `package.json`): `prisma generate && next build`.

---

## Architecture

```
src/
  app/
    (public)/             # Marketing pages (landing, pricing, etc.)
    (auth)/               # /login, /signup (brand vs shopper split)
    (proAuth)/pro/        # Authenticated brand workspace
      (workspace)/        # Sidebar shell: dashboard, catalog, size-charts,
                          #                discovery, analytics, billing, settings
      onboarding/         # Brand creation flow
    (clientArea)/app/     # Public shopper experience (brand discovery,
                          # fit wizard, wardrobe, pricing)
    widget/               # Embeddable iframe for brand product pages
    api/                  # REST endpoints (Zod-validated, rate-limited)
    checkout/             # Plan checkout placeholder (Shopify integration TODO)
  lib/
    auth.ts               # NextAuth v5 config
    db.ts                 # Prisma singleton
    supabase.ts           # anon + service-role clients
    validate.ts           # Shared Zod helpers (parseJsonBody / parseQuery / parseParam)
    planLimits.ts         # Client plan tiers (Essential / Fashion / Model)
    plans/proPlans.ts     # Pro plan tiers (Listed / Featured / Premier)
    discovery/            # Brand visibility / completeness / discovery score
    analytics/            # Monthly exposure quota, engagement metrics
    ai/
      measurementProvider.ts  # Easy/Advanced body measurement (stub → 3DLOOK)
      sizing/recommendSizes.ts # Deterministic size engine with confidence
      gemini/                  # Outfit generation
      fal/                     # Virtual try-on
      storage.ts               # Private body-scans bucket helpers
  components/
    public/                # Landing / pricing / hero
    pro/                   # Brand workspace UI
    client/                # Shopper experience UI (wizard, wardrobe, etc.)
    pricing/               # Brand + client pricing card variants
    dashboard/             # Charts, copy buttons, etc.
    ui/                    # Button, Input, Card, Badge
```

---

## Security

Aplomb handles paid AI integrations, user body imagery, and brand commercial
data. Security expectations are tracked in [SECURITY.md](./SECURITY.md).

DB safety, backup, and migration rules are tracked in
[BACKUPS_AND_MIGRATIONS.md](./BACKUPS_AND_MIGRATIONS.md). Read it before
touching `prisma/`.

Highlights:
- Every API endpoint validates inputs with **Zod `.strict()` schemas** via the
  shared helpers in `src/lib/validate.ts`.
- Every authenticated endpoint checks **`auth()` + ownership** before touching
  the database.
- Body-scan photos go to a **private Supabase Storage bucket**; only the
  service role can read or write. Signed URLs are short-lived (30 min) and
  never returned to the browser.
- See `SECURITY.md` for the full policy on secrets, rotation, and reporting.

---

## License

MIT
