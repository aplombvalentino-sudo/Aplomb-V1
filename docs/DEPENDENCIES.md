# Dependencies — Aplomb

*Tracks the dependencies whose version choice is a load-bearing decision (not
just a "latest npm install" outcome). Read this before bumping a major version
or before scaling production traffic past a quiet rollout phase.*

*Last reviewed: 2026-05-31. Review on every major release of any pinned dep.*

---

## ⚠️ Pre-production-traffic blockers

These versions are explicitly NOT safe for high-traffic production. Address
each before sending Aplomb past internal/beta usage.

| Package | Current | Risk | Target | Trigger to upgrade |
|---|---|---|---|---|
| **`next-auth`** | `5.0.0-beta.31` | Pre-release beta. APIs can shift; bugs may not be patched on this exact beta number. We rely on it for the entire auth surface (session, callbacks, JWT strategy, providers). A breaking change between this beta and 5.0.0 stable could require a coordinated migration. | `5.0.0` stable (or the lowest stable 5.x at the time of upgrade) | Move BEFORE: (a) the first paying user signs up, or (b) we exceed 1k DAU, whichever comes first. Track release notes at https://github.com/nextauthjs/next-auth/releases. |

> **Status (checked 2026-06-23):** No 5.0.0 stable exists yet. The `beta`
> dist-tag still resolves to `5.0.0-beta.31` (exactly our pin — we are on the
> newest beta), and `latest` is the v4 line (`4.24.x`), a different major with
> an incompatible API. There is therefore nothing to upgrade *to* right now;
> "downgrading" to v4 would be a regression. Mitigation in place: the pin is
> **exact** (no `^`/`~`), so installs are reproducible and can't drift onto an
> untested beta. Re-check the releases page at the trigger conditions above.

### Upgrade procedure for `next-auth`

1. Watch the [next-auth releases](https://github.com/nextauthjs/next-auth/releases) for a `5.0.0` (or stable 5.x) tag.
2. Read the migration guide at the linked tag.
3. In a feature branch:
   ```bash
   npm install next-auth@5.0.0
   npx tsc --noEmit
   npm test
   npm run build
   ```
4. Manually verify in dev:
   - Email/password sign-in (clickwrap + Turnstile path)
   - Google OAuth sign-in
   - Session JWT decoding via middleware (`req.auth`)
   - Logout + re-login
5. Deploy to Vercel preview, smoke-test signup → fitting room → checkout.
6. Promote to production only after at least one preview-environment day with no auth errors in logs.

---

## 📌 Material pins (intentional, not "latest")

Versions chosen for a specific reason — bumping these requires re-reading the
reason and confirming it still applies.

| Package | Pin | Reason | When to revisit |
|---|---|---|---|
| `next` | `^16` | App Router, Turbopack, React 19 RSC support. | Quarterly. Watch for breaking-change announcements. |
| `react` / `react-dom` | `19.x` | Used for `useTransition`, server components. | When React 20 stable lands. |
| `prisma` / `@prisma/client` | `^6.19.3` | Versioned migrations workflow, Postgres + RLS pattern. | When Prisma 7 lands — check breaking changes in their migration tool. |
| `vitest` | `^4.1.7` | Test framework. Stable. | When 5.x lands (probably late 2026). |
| `tailwindcss` | `^4` | New v4 engine (Lightning CSS-based). | When v5 lands. |
| `motion` (Framer) | latest | Animation. Stable API. | Monitor for breaking-change releases. |
| `@upstash/ratelimit` + `@upstash/redis` | latest | Rate-limit infra. Stable. | Per upstream release. |
| `stripe` | latest | Billing API client. Stable. | Per Stripe major bumps (rare). |

---

## 🔒 Security / Dependabot

GitHub Dependabot is enabled on the repo. Treat moderate-or-higher alerts as
P1 (24-hour SLA). Low alerts get rolled up monthly into a single
`chore(deps)` PR.

---

## ❓ Why this file exists

`package.json` records what's installed; it doesn't record _why_. Without
this file, future contributors (including future-you) would have to
re-discover that `next-auth` is on a beta, that we accept the risk for now,
and what the trigger for upgrade is. Capturing the decision once here saves
that loop forever.
