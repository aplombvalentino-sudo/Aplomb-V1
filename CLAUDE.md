# CLAUDE.md — Aplomb

> Auto-loaded by Claude Code at the start of every conversation in this repo.
> **Before doing any work, read the handoff docs in `docs/handoff/`.**

## Read these first (in order)

1. `docs/handoff/skills_and_custom_instructions.md` — binding rules. Apply from message one.
2. `docs/handoff/project_state.md` — what Aplomb is, stack, module map, status.
3. `docs/handoff/changes_and_done_log.md` — what's already built (don't redo/revert).
4. `docs/handoff/mistakes_and_decisions.md` — dead-ends to avoid.
5. `docs/handoff/connectors_and_env_setup_template.md` — integrations + env var names.

Also: `SECURITY.md`, `BACKUPS_AND_MIGRATIONS.md`, `CONTRIBUTING.md`, `CLAIMS.md`,
`WIDGET.md`, `STAGING.md`, `SECURITY_TESTS.md`.

## What Aplomb is

AI fitting room + fashion marketplace. `/pro/*` = brands (marketplace presence:
catalog, exposure quota, analytics, featured visibility). `/app/*` = shoppers
(AI fit wizard → outfits → try-on → wardrobe). Embeddable widget at `/widget`
+ `public/widget.js`, brand-locked.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript (strict), React 19 |
| Styling | Tailwind CSS 4 (tokens in `globals.css`) · `motion` (centralized in `lib/motion.ts`) · `lucide-react` |
| Fonts | Fraunces (variable italic serif, `font-serif`) + Geist (sans). No mono — use `nums`. Never Inter |
| Database | PostgreSQL via Prisma **6.19.3** (versioned migrations) |
| Auth | NextAuth v5 (JWT) → Supabase Auth + Google OAuth |
| Storage | Supabase private `body-scans` bucket |
| AI | Gemini 2.5 Flash (outfits) · fal FASHN (try-on) · 3DLOOK (measurement, stubbed) |
| Rate limit | Upstash Redis |
| Validation | Zod v4 |
| Deploy | Vercel (auto-deploy on push to `main`) |

## Folder map (current)

```
src/app/
  (public)/            # landing, pricing
  (auth)/              # login, signup (brand vs shopper chooser)
  (proAuth)/pro/(workspace)/   # dashboard, catalogue, size-charts,
                               # discovery, analytics, pricing(billing), settings
  (proAuth)/pro/onboarding/
  (clientArea)/app/    # discovery, [brandSlug] wizard, wardrobe, pricing
  widget/              # iframe (widgetMode, brand-locked)
  checkout/            # placeholder (Shopify TODO)
  api/                 # route.tsx handlers
src/lib/
  ai/                  # measurementProvider, sizing, gemini, fal, storage
  plans/proPlans.ts    # Listed/Featured/Premier (brand)
  planLimits.ts        # Essential/Fashion/Model (client)
  discovery/brandRanking.ts · analytics/brandMetrics.ts
  validate.ts · ownership.ts · brandRole.ts · sessionToken.ts
  rateLimit-upstash.ts · db.ts · auth.ts · supabase.ts
src/components/brand/Logo.tsx
prisma/  schema.prisma · migrations/ · rls.sql
```

## Non-negotiable rules

**Security**
- Never inline secrets — `process.env.X`, document in `.env.example`.
- Every endpoint: Zod `.strict()` via `src/lib/validate.ts` + `await auth()` +
  ownership check (`src/lib/ownership.ts`) + rate limit (`src/lib/rateLimit-upstash.ts`).
- Brand-scoped writes → `requireBrandRole` (`src/lib/brandRole.ts`):
  delete = admin+, write = editor+, read = any member.
- RLS is defense-in-depth; server checks still mandatory.
- Versioned Prisma migrations only — never `prisma db push`. Flag destructive
  migrations; follow `BACKUPS_AND_MIGRATIONS.md` (snapshot first, rollback plan).

**Architecture**
- API handlers are `route.tsx` (pageExtensions excludes `.ts` for pages;
  `middleware.ts` stays `.ts`).
- Brand plan enum `free|pro|enterprise` ⇒ Listed/Featured/Premier. NEVER rename.
- All AI calls server-side only.
- `PRISMA_DATABASE_URL` read first in `src/lib/db.ts`.
- Serialize Prisma `Decimal` (`.toString()`) before client components; cast JSON
  writes with `Prisma.InputJsonValue`.
- Anonymous shopper ownership via session token (cookie + `X-Aplomb-Session` header).
- Multi-tenancy: resolve `brandId` from session (`BrandUser`), never trust the
  request body for writes.

**Design (anti-AI-slop) — "Direction Artistique" (current)**
- **Surfaces are warm, never black.** Canvas `#F6F3EE`, surface `#FFFFFF`,
  raised `#FBFAF7`, stone `#ECE6DC` / stone-deep `#E3DCD0` for editorial blocks.
  Ink `#111010` is for text, buttons, and small accents — NOT for page surfaces.
- **Terracotta `#C9653B` is THE signature accent** (`--accent`), used ≤5%:
  primary-CTA arrow, active states, key links, and the logo period. Champagne
  `#C9A882` is a quiet second warm accent. **No background gradients, anywhere**
  (decorative radial/linear glows removed; only the marquee edge-mask remains).
  No glassmorphism, no neon. (The logo dot's glow is a `box-shadow` halo, not a
  background gradient — see below.)
- **Two type families only.** `font-serif` = **Fraunces** (variable italic
  editorial serif — headlines/brand voice, often italic with a terracotta
  signature period). Body/UI = **Geist** sans. Mono is REMOVED — use the `nums`
  utility (tabular figures) for numeric/data text. Never Inter.
- **Tokens, not hex.** Use Tailwind classes mapped in `globals.css`: `bg-canvas`,
  `bg-surface`, `bg-stone`/`bg-stone-deep`, `text-ink`/`text-ink-muted`/
  `text-ink-subtle`, `text-accent`/`bg-accent`, `text-champagne`, `border-hairline`.
- **Terracotta circles glow and pulse.** The reusable `.aplomb-glow` class
  (`globals.css`) adds a soft terracotta `box-shadow` halo + slow pulse; it's on
  the logo period (`.aplomb-dot`) AND every round terracotta circle (CTA arrow
  buttons, etc. — add `aplomb-glow` to any new `bg-accent` circle). The pulse
  freezes to a static glow under `prefers-reduced-motion`. **Exception:** the
  terracotta punctuation signatures (the `.` / `?` in headlines) are plain text
  and must NOT glow. Favicon (`icon.svg`) carries the glow via SVG blur (no pulse).
- Muted text `#7A7773`/`#6B6965` (AA); never `#9C9894`.
- **Intentional color exception:** the "FREE" price badge on the Essential plan
  is green `#346538` (semantic = no cost) in `PricingCards.tsx` +
  `ClientPricingCards.tsx`. Keep it — don't "correct" it to ink.
- **Motion is centralized** in `src/lib/motion.ts` (durations 180/280/340ms,
  shared easings + variants). Page transitions via route-group `template.tsx`
  + `<PageTransition>`; scroll entrances via `<Reveal>`/`<Stagger>`. All motion
  respects `useReducedMotion()`; decorative `aria-hidden`; interactive
  `focus-visible` rings.
- Honest AI UX: show confidence levels. No fabricated stats/testimonials (FTC) —
  see `CLAIMS.md`.

## API response format

```ts
{ success: true, data: T }                                  // success
{ success: false, error: { code: string, message: string } } // error
```
Use `ok()` / `err()` from `@/lib/api`.

## Workflow

edit → `npx tsc --noEmit` (ignore stale `.next/dev` stub errors) → `npm run build`
→ `git add <files>` → commit → `git push`. Vercel auto-deploys.
The user runs all provider-dashboard actions (Supabase SQL, key rotation, Vercel
env vars, billing) — give exact click-paths, never assume done. Windows machine.

## DO NOT

- No secrets in source. No `any` (use `unknown`/proper types). No untyped JSON.
- No `console.log` in production paths. No hardcoded brand IDs.
- No skipping brand-scope/ownership checks. No `import *`. No class components.
- No `prisma db push`. No fabricated marketing numbers.

## Outstanding

User owes: rotate keys, run `prisma/rls.sql`, set Upstash env in Vercel, upgrade
Supabase to Pro for backups, Safari widget test.
Future code: 3DLOOK wiring, Shopify checkout, Collections table, event-tracking
analytics, Prisma 7, real testimonials, OG image. (Full list:
`docs/handoff/changes_and_done_log.md`.)
