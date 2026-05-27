# Contributing to Aplomb

Thanks for working on Aplomb. This document covers two things that matter
disproportionately for a small, fast-moving codebase:

1. **Dependency hygiene** — avoiding hallucinated or low-quality packages.
2. **Security expectations** — the standing rules every PR must respect.

For the secrets and rotation policy, see [SECURITY.md](./SECURITY.md).

---

## Before you add a dependency

Before running `npm install <package>`:

### 1. Verify the package on npmjs.com

Open `https://www.npmjs.com/package/<name>`. Check:

- **Weekly downloads ≥ 1,000** (or you have a specific, defensible reason).
- **Last publish within the last 12 months.**
- The linked GitHub repo has recent commits and real issue activity.

### 2. Verify the maintainer

```bash
npm view <name> maintainers repository.url
```

Cross-reference the maintainer's email/username with the project's official
GitHub org or website. Be suspicious of newly-created npm accounts publishing
packages with names close to popular libraries.

### 3. Check for typosquats

These are the kinds of names supply-chain attackers love:

- `react-helmet-pro` vs `react-helmet-async`
- `loadash` vs `lodash`
- `axiious` vs `axios`
- `request-promise-native2` (nonsense suffix on a once-popular name)

A 1-character difference from a famous package is almost always malicious.

### 4. Run `npm audit` after installation

```bash
npm install <package>
npm audit
```

If the new package introduces high-severity findings, evaluate whether you
really need it. Strongly prefer dropping it over papering over the advisory.

### 5. AI-suggested packages need extra scrutiny

Language models sometimes invent plausible-sounding npm packages that don't
exist or have been claimed by squatters. **Never install an AI-suggested
package without going through steps 1–3 first**, even if it sounds obviously
correct.

When asking the AI to add a dependency, also ask it to:

- State the current version on npm.
- State who maintains it.
- Compare it to 1–2 alternatives in the same space.
- Estimate the bundle impact.

If the AI can't answer those, treat the suggestion as unverified.

---

## Standing security rules for every PR

These are non-negotiable. A PR that violates one of them should be sent back.

1. **Never inline secrets.** All API keys, tokens, passwords, webhook secrets
   live in environment variables, set in `.env.local` (gitignored) and on
   Vercel. See [SECURITY.md](./SECURITY.md).

2. **Validate every input with Zod.** Use `parseJsonBody` / `parseQuery` /
   `parseParam` from `src/lib/validate.ts`. Every schema must use `.strict()`
   so unknown fields are rejected. String fields must have explicit length
   caps; IDs use `zCuid`; slugs use `zSlug`.

3. **Check auth + ownership on every DB-touching route.** Authentication
   alone is not enough — verify the caller owns the resource they're
   referencing, not just that they're logged in.

4. **Rate-limit any route that calls an AI provider or creates DB rows.**
   See `src/lib/rateLimit.ts` for the current helper.

5. **Treat RLS as defense in depth, not the only wall.** Server-side
   ownership checks are mandatory even when RLS is enabled — the
   service-role Supabase client bypasses RLS by design.

6. **Never use `prisma db push` against production.** Once we have a first
   migration committed, use `prisma migrate deploy`. Schema changes that
   could destroy data require a manual Supabase snapshot beforehand.

---

## Local development

See the "Running locally" section of [README.md](./README.md).

```bash
npm install
cp .env.example .env.local       # fill in real values, never commit
npx prisma generate
npm run dev
```

---

## Commit conventions

Short prefixes help when scanning the log:

```
deps:    Bump @auth/prisma-adapter for cookie advisory
feat:    Add try-on viewer modal to BrandScanWizard
fix:     Validate brandSlug regex in /api/outfits
chore:   Drop unused netlify-cli devDep
docs:    Rewrite README to match current stack
ci:      Add npm audit advisory step
```

---

## Pull request checklist

- [ ] `npm audit` after install — no new high-severity advisories.
- [ ] `npx tsc --noEmit` — no type errors in `src/`.
- [ ] If you added a route, it uses Zod via `parseJsonBody` / `parseQuery`.
- [ ] If you added a route that reads or writes user data, it checks
      ownership, not just authentication.
- [ ] If you added an env var, it's documented in `.env.example`.
- [ ] If you added a dep, it passes the four checks at the top of this file.
