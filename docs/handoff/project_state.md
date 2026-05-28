# Aplomb — Project State

> Briefing doc for a fresh Claude Code conversation. Read this first.
> Repo: `aplombvalentino-sudo/Aplomb-V1` · Local: `C:\Users\Utilisateur\aplomb`

## Summary

Aplomb is an **AI fitting room + fashion marketplace**. Shoppers get accurate
size recommendations, AI-generated outfits, and virtual try-on imagery. Brands
pay for marketplace presence (catalog, visibility, analytics) and can embed the
fitting room on their own store via a widget. Two clearly separated sides:
**`/pro/*`** (brands) and **`/app/*`** (shoppers).

## What Aplomb is

- **Consumer (shopper) app** — `/app`: brand discovery → fit wizard
  (consent → easy/advanced mode → 2 photos + measurements → processing →
  size results with confidence → AI outfits → virtual try-on) → digital wardrobe.
- **Professional (brand) dashboard** — `/pro`: marketplace-presence console
  (dashboard, catalog, size charts, discovery, analytics, billing, settings,
  onboarding).
- **Embeddable widget** — `public/widget.js` injects a button on a brand's
  product page that opens `/widget?brand=<slug>` in an iframe. Brand-locked:
  the shopper only ever sees that brand's catalog.
- **AI pipeline** — measurement (provider-agnostic, stubbed), deterministic
  sizing, Gemini outfit generation, fal/FASHN try-on rendering.

## Tech stack

- **Next.js 16** (App Router, Turbopack) · **React 19** · TypeScript
- **Tailwind v4** · `motion` (framer-motion successor) · `lucide-react`
- **Supabase** Auth + Postgres + Storage (private body-scans bucket)
- **Prisma 6.19.3** with versioned migrations (`prisma/migrations/`)
- **NextAuth v5** (JWT session strategy; Credentials → Supabase Auth + Google OAuth)
- **Gemini 2.5 Flash** (`@google/generative-ai`) — outfit generation
- **fal FASHN v1.6** (`@fal-ai/client`) — virtual try-on
- **Upstash Redis** (`@upstash/ratelimit`) — distributed rate limiting
- **Zod v4** — strict input validation on every endpoint
- Deployed on **Vercel** (auto-deploy on push to `main`)

## Core modules / routes

| Area | Route group | Notes |
|---|---|---|
| Marketing | `(public)` | landing, pricing |
| Auth | `(auth)` | `/login`, `/signup` (brand vs shopper chooser) |
| Brand workspace | `(proAuth)/pro/(workspace)` | dashboard, catalogue, size-charts, discovery, analytics, pricing(billing), settings |
| Brand onboarding | `(proAuth)/pro/onboarding` | brand creation |
| Shopper app | `(clientArea)/app` | discovery, `[brandSlug]` wizard, wardrobe, pricing |
| Widget | `/widget` | iframe, `widgetMode` brand-locked |
| Checkout | `/checkout` | placeholder — Shopify TODO |
| API | `/api/*` | see connectors doc |

Key libs: `src/lib/ai/*` (measurement, sizing, gemini, fal, storage),
`src/lib/plans/proPlans.ts`, `src/lib/planLimits.ts`,
`src/lib/discovery/brandRanking.ts`, `src/lib/analytics/brandMetrics.ts`,
`src/lib/validate.ts`, `src/lib/ownership.ts`, `src/lib/brandRole.ts`,
`src/lib/sessionToken.ts`, `src/lib/rateLimit-upstash.ts`,
`src/components/brand/Logo.tsx`.

## Current implementation status

### ✅ Done
- Auth (NextAuth + Supabase), brand/shopper signup split, sign-out everywhere
- Pro workspace: all pages built; marketplace-presence model
  (completeness score, discovery score, visibility status, exposure quota)
- Shopper fit wizard, 6 steps, with try-on modal + wardrobe (localStorage)
- Brand-locked embeddable widget
- AI: Gemini outfits (**real call**), fal try-on (**real call**),
  deterministic sizing with confidence levels
- Dual pricing; Essential plan FREE during launch; `/checkout` placeholder
- Security: Zod `.strict()` validation on all routes; auth + ownership checks;
  brand roles (owner/admin/editor/viewer); Upstash rate limiting; RLS SQL
  prepared; secrets policy; dependency hardening; Prisma versioned migrations;
  backup playbook
- New brand logo (serif "aplomb" wordmark + glowing orange dot); SVG favicon
- Accessibility: reduced-motion, AA contrast, aria-hidden on decorative
- Marketing claims softened (FTC)

### 🟡 Partial / stubbed
- **Measurement = stub.** `src/lib/ai/measurementProvider.ts` returns a
  heuristic from height/weight/gender. 3DLOOK not wired.
- **Shopify checkout = placeholder.** `/checkout` shows a confirmation;
  `SHOPIFY_PRODUCT_URLS` in `src/app/checkout/page.tsx` is empty.
- **Analytics derived live** from `RecommendationSession`/`Outfit`. No
  dedicated event table; saves/clicks counts are 0.
- **Collections not built.** No `Collection` table; `/pro/collections` doesn't
  exist; `getCatalogSnapshot` returns `activeCollectionCount: 0`.

### 🔴 Planned / not started
- `Collection` + `CollectionProduct` tables and `/pro/collections` page
- Event-tracking table (e.g. `BrandAnalyticsDaily`) for real save/click metrics
- Separate `/pro/brand` identity page (identity currently under `/pro/settings`)
- Real, consented testimonials (current ones are placeholders — see CLAIMS.md)
- `/public/og-image.png` (referenced in metadata, missing)
- Stripe/Shopify billing wire-up

## Key architectural decisions

- **DB plan enum stays `free | pro | enterprise`**, mapped in UI to
  **Listed / Featured / Premier**. Never rename the enum.
- **Pro plans = marketplace presence, NOT personal AI credits.** Brands pay for
  exposure quota, collections, analytics depth, featured eligibility. Customer
  scans consume the brand's monthly exposure quota; exhausting it never hides
  the brand — only drops featured priority.
- **All AI calls are server-side** (`/api/*` + `src/lib/ai/*`). Keys never reach
  the browser.
- **Anonymous shopper ownership** via a session token: minted by
  `/api/measurements`, stored hashed on `RecommendationSession.ownerTokenHash`,
  returned both as an httpOnly cookie AND in the body. The wizard echoes it via
  `X-Aplomb-Session` header (Safari ITP blocks the iframe cookie).
- **Body photos** live in a private Supabase `body-scans` bucket; only signed
  URLs (30-min TTL) are passed to AI providers; never returned to clients.
- **Client plan stored in cookie** `aplomb_client_plan` (no schema change);
  brand plan in `Brand.plan`.
- **Versioned Prisma migrations** + `prisma migrate deploy` in the build. Never
  `prisma db push`.
- **Measurement provider is an abstraction** — swap stub → 3DLOOK by editing
  one function; the rest of the app consumes `NormalizedMeasurements`.
