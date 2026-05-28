# Aplomb — Mistakes & Decisions

> Dead-ends and corrections from the build. The next conversation should NOT
> repeat these or revert to the older patterns.

## Architecture / data

| Mistake | Why it was wrong | Final decision |
|---|---|---|
| Pro plans modeled as **personal AI credits** (brand owner "uses" scans) | Wrong product model — brands buy presence, customers do the scanning | Reworked to **marketplace-presence model**: exposure quota, collections, analytics depth, featured eligibility. See `src/lib/plans/proPlans.ts`. |
| `/api/outfits` & `/api/tryon` had **no ownership check** | Anyone with a cuid could burn Gemini/fal credits and access other users' body photos | Added `authorizeSession` / `authorizeBodyProfile` (`src/lib/ownership.ts`), run BEFORE rate-limit. |
| **In-memory rate limiter** (`new Map()`) | Per-instance on Vercel → effective limit = N×instances | Moved to **Upstash Redis** (`src/lib/rateLimit-upstash.ts`); legacy is fallback only. |
| `prisma db push` as the deploy path | No history, silent destructive drops | **Versioned migrations** + `prisma migrate deploy` in build. `db push` is banned (see CONTRIBUTING.md). |
| Tried to upgrade **Prisma 5 → 7** | v7 requires moving datasource URLs to `prisma.config.ts` + `@prisma/adapter-pg` rewrite of `src/lib/db.ts` + pgbouncer re-config | Stopped at **Prisma 6.19.3** (clean, no code changes). v7 is a separate future task. |
| Considered adding a `Collection` table mid-build | Scope creep during a UI pass | Deferred. `/pro/collections` not built; `activeCollectionCount` returns 0. Build it as its own migration when needed. |
| Old `/widget` page used the **deprecated JSON `/api/measurements` shape** | Out of sync with the new multipart + try-on flow | Rewired `/widget` to render `BrandScanWizard` with `widgetMode`. |

## Infra / connectivity

| Mistake | Why | Fix |
|---|---|---|
| Preview runner injected `DATABASE_URL=postgresql://placeholder@localhost:5432` | `.env.local` can't override a pre-set `process.env` var → Prisma hit localhost | Read **`PRISMA_DATABASE_URL` first** in `src/lib/db.ts` (not pre-injected, so `.env.local` provides it). |
| Project started on **Netlify** | Adapter lags Next.js; App Router edge cases | Migrated to **Vercel**. Removed `netlify-cli`, `.netlify/`, `netlify.toml`. |
| Account creation broken | Prisma pointed at localhost placeholder | Fixed via `PRISMA_DATABASE_URL` + Supabase pooler URLs. |
| Grammarly extension hydration mismatch | Injected `data-*` attrs into `<body>` | `suppressHydrationWarning` on `<html>` + `<body>`. |

## Security (all fixed)

| Mistake | Fix |
|---|---|
| Secrets committed in `.claude/launch.json` (DB password, NEXTAUTH_SECRET, anon key) | `git rm --cached` the file; **rotation required at providers** (still owed by user). GitHub secret scanning + push protection recommended. |
| API keys (Gemini, fal) pasted in chat | Must be **rotated** — chat logs aren't a secure channel. Always reference `process.env.X`, never inline. |
| No server-side validation | Zod `.strict()` on every endpoint via `src/lib/validate.ts`. |
| No RLS on Supabase tables | `prisma/rls.sql` prepared + bundled in init migration. **User must run it.** |
| Viewers could delete products | `requireBrandRole` with `ROLES_READ/WRITE/ADMIN` (`src/lib/brandRole.ts`). |
| Safari ITP blanks the iframe widget (3rd-party cookie blocked) | Session token also returned in body + echoed via `X-Aplomb-Session` header. |

## Design / UX (anti-AI-slop corrections)

| Mistake | Fix |
|---|---|
| `text-[#9C9894]` muted text = 2.6:1 contrast (fails WCAG AA) | Global swap to `#7A7773` (~4.6:1). |
| Every `motion.*` animated unconditionally (WCAG 2.3.3 violation) | `useReducedMotion()` in HeroSection/FadeUp/PublicHeader + global CSS reduced-motion block. |
| Decorative SVGs/avatars read by screen readers | `aria-hidden` on CTA arrows, avatar cluster, the whole hero widget mockup. |
| Hardcoded marketing numbers ("−38% returns", "147 brands", "+22%", "92% fit") | Removed — FTC unsubstantiated-claim risk. Replaced with directional copy. Documented in `CLAIMS.md`. **Testimonials are still fabricated — replace before US launch.** |
| Mobile hero dropped the entire right column (`hidden md:flex`) | Now renders on all breakpoints, width-clamped, stacks below CTAs. |
| Widget trigger button styled inline (un-overridable, no focus ring) | Injected stylesheet on `[data-aplomb="trigger"]` with CSS vars, focus-visible, hover, reduced-motion. |
| Floating "Return rate" card clipped + positioned against wrong parent | Removed from hero, moved to pro billing as a directional stat. |

## Dependency hygiene

- Removed dead/duplicate deps: `bcryptjs`, `@types/bcryptjs`, `docx`,
  `@tanstack/react-query`, `react-hook-form`, `@hookform/resolvers`,
  `framer-motion` (duplicate of `motion`), `netlify-cli`.
- `lucide-react@1.x` looked like a typosquat but is **legit** (maintainer
  `ericfennis`, the real Lucide author). Don't re-flag it.
- Pinned `next-auth` to exact `5.0.0-beta.31` (beta).
