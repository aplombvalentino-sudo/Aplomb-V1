# Aplomb — Skills & Custom Instructions

> Paste this at the start of a new conversation so Claude inherits the
> disciplines developed here. These are binding rules for this codebase.

## Security discipline (non-negotiable)

| Rule | How to apply |
|---|---|
| **Never inline secrets** | Always `process.env.X`. Document the var in `.env.example`. If a key is pasted in chat, tell the user to rotate it. |
| **Validate every endpoint** | Zod `.strict()` schema via `parseJsonBody` / `parseQuery` / `parseParam` from `src/lib/validate.ts`. Length caps on all strings; `zCuid` for ids; `zSlug` for slugs. |
| **Auth + ownership, not just auth** | Verify the caller owns the referenced resource (`src/lib/ownership.ts`), not only that they're logged in. |
| **Brand role gating** | Brand-scoped writes go through `requireBrandRole(userId, brandId, ROLES_*)` (`src/lib/brandRole.ts`). Delete = admin+, write = editor+, read = any member. |
| **Rate-limit AI + auth + writes** | Use `src/lib/rateLimit-upstash.ts`. AI routes get a per-minute AND per-day limiter. Ownership check runs BEFORE the limiter. |
| **RLS is defense-in-depth** | Server checks are still mandatory; the service-role client bypasses RLS by design. |
| **No `prisma db push`** | Versioned migrations only. Destructive migrations follow `BACKUPS_AND_MIGRATIONS.md` (snapshot first, rollback plan). Flag destructiveness explicitly. |

## Anti-AI-slop UI/UX rules

| Rule | Detail |
|---|---|
| **No generic AI aesthetic** | **No background gradients** (decorative radial/linear glows removed), no mesh blobs, neon, or glassmorphism on scrolling content. **Exception:** the brand logo dot (`.aplomb-dot`) intentionally glows + pulses via `box-shadow` — keep it. |
| **Warm surfaces, never black** | Canvas `#F6F3EE`, surface `#FFFFFF`, raised `#FBFAF7`, stone `#ECE6DC`/`#E3DCD0` for editorial blocks. Ink `#111010` is for text/buttons/small accents, NOT page surfaces. Tokens: `bg-canvas`/`bg-surface`/`bg-stone(-deep)`/`text-ink`. |
| **Brand palette** | **Terracotta `#C9653B`** is the signature accent (`--accent`, the logo period), used **≤5%**. Champagne `#C9A882` is a quiet second warm accent. One accent per context; saturation restrained. (Updated 2026-05-28 — was orange `#D9542C`.) |
| **Typography** | Two families only. Display/brand voice = **Fraunces** variable italic serif (`font-serif`), often italic with a terracotta signature period. Body/UI = **Geist** sans. **No mono** — numbers use the `.nums` tabular utility. Never use Inter. |
| **Contrast ≥ AA** | Lightest muted text token is `#7A7773` (passes 4.5:1 on canvas). `#6B6965` for stronger muted. Never `#9C9894` for text. |
| **Reduced motion** | All animated components use `useReducedMotion()`; global CSS block in `globals.css` neutralises CSS transitions for reduced-motion users. |
| **Decorative = aria-hidden** | Icons, avatar clusters, mockups get `aria-hidden`; interactive elements get visible `focus-visible` rings. |
| **Honest AI UX** | Surface confidence levels (low/medium/high) on size results — never present sizing as absolute. Show which mode (Easy/Advanced) produced a result. |
| **Card restraint** | Double-bezel cards only where elevation means hierarchy; button-in-button CTA pattern (trailing arrow in a nested circle). Avoid "everything is a card." |

## Copy / brand voice

- Concrete, plain language. **Banned words**: Elevate, Seamless, Unleash,
  Next-Gen, Game-changer, Delve, Tapestry, "In the world of…".
- **No unsubstantiated numbers.** No fabricated stats or testimonials. Use
  directional language ("built to reduce returns") until real data exists.
  See `CLAIMS.md` before adding any figure.
- Wordmark is lowercase **"aplomb"** + orange dot (`src/components/brand/Logo.tsx`).

## Component / architecture conventions

- AI calls live ONLY in `src/lib/ai/*` and `/api/*`. Never client-side.
- Client plan via cookie `aplomb_client_plan`; brand plan via `Brand.plan` enum
  (`free|pro|enterprise` ⇒ Listed/Featured/Premier — never rename the enum).
- Prisma `Decimal` must be serialized (`.toString()`) before crossing to a
  client component.
- Prisma JSON writes cast with `Prisma.InputJsonValue`.
- Route files are `route.tsx` (project uses `pageExtensions` excluding `.ts`
  for pages, but `middleware.ts` stays `.ts`).

## Workflow with this user

- **Flow:** edit → `npx tsc --noEmit` (ignore stale `.next/` stub errors) →
  `npm run build` → `git add` specific files → commit → `git push`.
  **Vercel auto-deploys on push to `main`.** No manual Vercel step.
- The user runs all **provider-dashboard actions** themselves (Supabase SQL,
  key rotation, Vercel env vars, billing). Give exact click-paths; never assume
  done.
- When a `.next/dev/types/validator.ts` error references a deleted route, it's a
  stale stub — `rm -rf .next` and rebuild.
- Be honest about what's stubbed vs real. Flag manual steps the user still owes.
- Windows machine; use Bash tool with `/c/Users/...` paths or PowerShell.
- Keep commits focused with descriptive messages; the user reviews via GitHub.
