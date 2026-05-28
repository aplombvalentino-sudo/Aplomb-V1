# Aplomb — Changes & Done Log

> Chronological record of what was built. The next conversation must NOT undo
> these or revert to older patterns. Phases are approximate.

## Phase 1 — Foundations & fixes
- Fixed Grammarly hydration mismatch (`suppressHydrationWarning` on html/body).
- Fixed broken account creation: Prisma was hitting a localhost placeholder →
  introduced `PRISMA_DATABASE_URL` (read first in `src/lib/db.ts`) pointing at
  the Supabase pooler.
- Migrated hosting Netlify → **Vercel**.

## Phase 2 — Pro/Client split
- Restructured routes into `(proAuth)/pro/*` (brands) and `(clientArea)/app/*`
  (shoppers). Middleware guards `/pro/*`; legacy `/dashboard/*` redirects to
  `/pro/*`.
- Built brand workspace (dashboard, catalogue, size-charts, sessions, settings,
  onboarding) and shopper discovery + scan wizard + wardrobe.

## Phase 3 — Dual pricing
- **Brand plans** (DB enum → label): `free`→**Listed €45/mo**,
  `pro`→**Featured €200/mo**, `enterprise`→**Premier (contact)**.
- **Client plans**: **Essential** (now FREE during launch, was €9.99),
  **Fashion €25.99**, **Model €29.99**.
- Plan enforcement, digital wardrobe gated on Model, upgrade prompts.
- Free Essential skips checkout; paid plans → `/checkout` (Shopify TODO).
- Signup reworked into a **brand-vs-shopper chooser**; auth side-panel swaps
  content per audience.

## Phase 4 — Pro plan rework (IMPORTANT — don't revert)
- Pro plans redefined from "personal AI credits" to **marketplace presence**:
  exposure quota (Listed 1,000 / Featured 10,000 / Premier custom scans/mo),
  collection limits, featured eligibility, analytics depth.
- New libs: `src/lib/plans/proPlans.ts`, `src/lib/discovery/brandRanking.ts`
  (completeness + discovery score + visibility status),
  `src/lib/analytics/brandMetrics.ts` (exposure, engagement, catalog snapshot).
- New pages: `/pro/discovery`, `/pro/analytics` (locked for Listed),
  `/pro/pricing` reframed as Billing. Side nav restructured.
- Customer scans consume the brand's exposure quota; exhaustion never hides a
  brand (only drops featured priority).

## Phase 5 — AI pipeline
- Added `@google/generative-ai`, `@fal-ai/client`.
- `src/lib/ai/*`: provider-agnostic `measurementProvider` (stub),
  deterministic `sizing/recommendSizes` (confidence levels), `gemini/*`
  (real outfit gen), `fal/*` (real try-on), `storage.ts` (private bucket).
- Schema: added `MeasurementMode` enum, `measurementMode`/`frontImagePath`/
  `sideImagePath` on `BodyProfile`, and `TryOnResult` table.
- Rewrote `/api/measurements` (multipart + photo upload + signed URLs),
  `/api/outfits` (Gemini), new `/api/tryon` (fal).
- Rebuilt the shopper wizard into 6 steps (consent → easy/advanced mode →
  photos+measurements → processing → sizes → outfits + try-on).
- Added `maxTryOnsPerMonth` to client plan limits.

## Phase 6 — Security hardening (multi-pass; don't revert)
- **Validation:** Zod `.strict()` on every endpoint; shared
  `src/lib/validate.ts` (`parseJsonBody/parseQuery/parseParam`, `zCuid/zSlug`).
- **Secrets:** removed committed `.claude/` + `.netlify/` + `encrypt-secret.js`;
  added `SECURITY.md`, `.gitleaks.toml`. (User still owes key rotation.)
- **Dependencies:** removed 8 dead/dup deps; bumped Next 16.2.4→16.2.6 (11
  advisories), `@auth/prisma-adapter`→2.11.2; pinned `next-auth` beta; added
  Dependabot + audit CI; `CONTRIBUTING.md`.
- **Auth/RLS:** `prisma/rls.sql` for all tables + body-scans bucket; ownership
  checks on `/api/outfits` + `/api/tryon` (`src/lib/ownership.ts`,
  `sessionToken.ts` with cookie + header); `requireBrandRole`
  (`src/lib/brandRole.ts`) on product/size-chart writes;
  `RecommendationSession.ownerTokenHash` added; `SECURITY_TESTS.md`;
  `security-smoke.yml`.
- **Rate limiting:** Upstash (`src/lib/rateLimit-upstash.ts`) on every endpoint
  — AI (per-min + per-day), auth (anti credential-stuffing/farming), writes,
  public reads.
- **Backups/migrations:** Prisma 5.22→**6.19.3** (v7 deferred), moved CLI to
  devDeps, switched to **versioned migrations** (baseline `init` includes
  schema + RLS), `prisma migrate deploy` in build, `BACKUPS_AND_MIGRATIONS.md`,
  `STAGING.md`, `SECURITY_INCIDENTS.md`, tagged **v0.1.0**.

## Phase 7 — Widget brand-lock
- `BrandScanWizard` got a `widgetMode` prop hiding all cross-brand links.
- `/widget` rewritten to render the wizard in `widgetMode`; marked noindex.
- `public/widget.js`: restylable trigger (`[data-aplomb="trigger"]` + CSS vars,
  focus-visible, hover, reduced-motion). `WIDGET.md` integrator guide.

## Phase 8 — Design / accessibility audit (don't revert)
- Reduced motion: `useReducedMotion()` in HeroSection/FadeUp/PublicHeader +
  global CSS block in `globals.css`.
- Contrast: global `#9C9894`→`#7A7773` (125 usages).
- `aria-hidden` on decorative SVGs/avatars/hero mockup; focus rings on CTAs.
- Marketing claims softened (removed −38%, +22%, 147, 92%); `CLAIMS.md`.
  **Testimonials still placeholder — replace before US launch.**
- Mobile hero now shows the widget mockup (was `hidden md:flex`).
- Safari ITP fix: session token via body + `X-Aplomb-Session` header.

## Phase 9 — New brand logo
- `src/components/brand/Logo.tsx`: serif italic **"aplomb"** wordmark + glowing
  orange dot (`--accent #D9542C`); `mark` variant = standalone dot. Glow pulse
  respects reduced motion. `src/app/icon.svg` favicon (glowing dot).
- Wordmark swapped in every header/footer/sidebar.

## Phase 10 — Art Direction remake (2026-05-28, don't revert)
Full visual/motion remake to the "Direction Artistique". Logic/routes/data
untouched — presentation only.
- **Palette**: warm surfaces (canvas `#F6F3EE`, surface `#FFFFFF`, raised
  `#FBFAF7`, new stone `#ECE6DC`/`#E3DCD0`); ink `#111010` demoted to text/
  buttons/accents (no black surfaces). Signature accent changed orange `#D9542C`
  → **terracotta `#C9653B`**; champagne kept as second warm accent. All
  decorative gradients/glows removed. Tokens centralized in `globals.css`
  `@theme` (`bg-canvas`, `bg-stone`, `text-ink`, `text-accent`, `border-hairline`…);
  old hex migrated repo-wide.
- **Type**: Playfair → **Fraunces** (variable italic serif) + Geist; **Geist Mono
  removed** (numbers use `.nums` tabular utility). `layout.tsx` updated.
- **Logo**: period is a solid terracotta dot with a glowing, pulsing `box-shadow`
  halo on every dot (`.aplomb-dot`); pulse freezes to a static glow under
  reduced-motion. Favicon (`icon.svg`) glows via SVG blur. (Glow/pulse restored
  at user request 2026-05-28 — earlier crisp version was reverted.)
- **Motion**: new `src/lib/motion.ts` (durations/easings/variants),
  `components/motion/{PageTransition,Reveal}.tsx`, route-group `template.tsx`
  page transitions, distinct button vocabulary (primary press-in + terracotta
  bar), card hover lift, layout-animated nav pills.
- **Surfaces re-skinned**: primitives (Button/Card/Input/Badge/Logo), shells
  (PublicHeader de-glassed, auth panel → warm stone, footer key bug fixed),
  marketing (hero/features/cta/pricing — dark cards → stone, featured plan →
  terracotta-ringed light card), auth pages, pro workspace, client/shopper area,
  legacy admin, widget, checkout (last four via parallel passes).

## Outstanding (user actions, not code)
- Rotate Supabase DB password, `NEXTAUTH_SECRET`, `GEMINI_API_KEY`, `FAL_KEY`
  (pasted in chat / once committed).
- Run `prisma/rls.sql` in Supabase; verify body-scans bucket is private.
- Confirm Upstash env vars set in Vercel + redeploy.
- Upgrade Supabase to Pro for backups/PITR before any destructive migration.
- Real-device Safari test of the embedded widget.

## Outstanding (future code work)
- 3DLOOK wiring (replace stub).
- Shopify checkout wire-up (`SHOPIFY_PRODUCT_URLS`).
- `Collection`/`CollectionProduct` tables + `/pro/collections`.
- Event-tracking table for real analytics (saves/clicks).
- Prisma 7 upgrade (needs `prisma.config.ts` + adapter).
- Real testimonials; `/public/og-image.png`.
