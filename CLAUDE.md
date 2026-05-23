# Aplomb — Project Contract

> Read this file before every major change.

## What is Aplomb?

B2B SaaS: brands embed a widget into their ecommerce (Shopify/custom) to give shoppers accurate size recommendations and complete outfit suggestions from that brand's catalog. The measurements come from a pluggable 3D/body-measurement provider; the outfit suggestions come from a pluggable LLM stylist.

## Tech Stack

| Layer | Choice | Version |
|---|---|---|
| Framework | Next.js App Router | 16.x |
| Language | TypeScript (strict) | 5.x |
| Styling | Tailwind CSS | 4.x |
| Database | PostgreSQL via Prisma ORM | Prisma 7.x |
| Auth | Auth.js v5 (next-auth beta) | 5.0.0-beta |
| Deployment | Vercel | — |
| Package manager | npm | — |

## Folder Structure

```
src/
  app/
    (public)/          # Marketing pages – no auth required
      page.tsx         # Landing /
      pricing/
      layout.tsx
    (auth)/            # Login / signup flows
      login/
      signup/
      layout.tsx
    (dashboard)/       # Merchant dashboard – requires auth
      layout.tsx       # Checks session, injects brand context
      overview/
      products/
      size-charts/
      integration/
      sessions/
    widget/            # Embeddable widget iframe (public)
    api/               # API routes (Route Handlers)
      auth/[...nextauth]/
      brand/
      products/
      size-charts/
      measurements/
      outfits/
    globals.css
    layout.tsx
  lib/
    auth.ts            # Auth.js v5 config – SINGLE source of truth
    db.ts              # Prisma client singleton
    measurementProvider.ts   # Pluggable body-measurement stub
    outfitGenerator.ts       # Pluggable LLM outfit-generation stub
    shopify.ts               # Shopify integration placeholder
    api.ts             # success/error response helpers
    cn.ts              # Tailwind className merger
  types/
    index.ts           # Shared domain types
  middleware.ts        # Auth enforcement for /dashboard routes
prisma/
  schema.prisma
```

## Naming Conventions

- **Files**: `kebab-case.ts` for library files; Next.js file-system names (`page.tsx`, `layout.tsx`, `route.ts`).
- **Components**: `PascalCase` function components only; no class components.
- **Variables/functions**: `camelCase`.
- **DB models**: `PascalCase` (Prisma convention).
- **Imports**: absolute via `@/` alias (maps to `src/`).
- **API routes**: named exports `GET`, `POST`, `PUT`, `DELETE` from **`route.tsx`** (NOT `route.ts`).
  - `pageExtensions` is set to `['tsx', 'jsx', 'js']` — `.ts` is excluded to avoid Next.js 16 detecting `src/middleware.ts`.
  - Each `route.ts` exists only as a TypeScript bridge: `export * from './route.tsx'`.
  - All new API routes must be created as `route.tsx`, never `route.ts`.

## API Response Format

All API routes MUST return one of:

```ts
// Success
{ success: true, data: T }

// Error
{ success: false, error: { code: string, message: string } }
```

Use helpers from `@/lib/api.ts`:
```ts
import { ok, err } from '@/lib/api'
return ok(data)
return err('NOT_FOUND', 'Brand not found', 404)
```

## Multi-Tenancy Rules

- Every DB query that touches brand-owned data **must** filter by `brandId`.
- Derive `brandId` from the user's session via `BrandUser` membership.
- Never trust a `brandId` from the request body for write operations — always resolve from session.

## Authentication Rules

- Dashboard routes (`/dashboard/**`) are protected by `src/middleware.ts`.
- Widget routes (`/widget`) are public.
- API routes serving dashboard data must verify session server-side.
- Public API routes (`/api/measurements`, `/api/outfits`) do not require auth but must be rate-limited.

## External Provider Boundaries

### Measurement Provider (`lib/measurementProvider.ts`)
- All 3D/body-measurement logic lives here.
- The rest of the app calls `getMeasurementsFromMedia()` only.
- Add new providers by implementing the interface here — never inline provider calls elsewhere.

### Outfit Generator (`lib/outfitGenerator.ts`)
- All LLM/styling logic lives here.
- The rest of the app calls `generateOutfits()` only.
- `callStylistLLM()` is the internal seam for the real LLM call.

## DO NOT

- No class components.
- No inline SQL — use Prisma only.
- No `any` type — use `unknown` or proper types.
- No untyped JSON — every JSON blob must have an explicit TypeScript type.
- No `console.log` in production code — use a proper logger or remove.
- No hardcoded brand IDs in code.
- No skipping brand scope checks in API routes.
- No `import * from` — use named imports.
- No secrets in source code — use `.env` only.
