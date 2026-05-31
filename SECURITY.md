# Security policy

## Secrets management

**Never** commit secrets to this repository. This means:

- ❌ No API keys, tokens, passwords, webhook secrets, or private keys inside any
  `.ts`, `.tsx`, `.js`, `.json`, `.toml`, `.yml`, or `.md` file.
- ❌ No tracked `.env` file with real values. The only env file in the repo is
  `.env.example`, with placeholder values.
- ❌ No IDE config, deploy script, or "convenience" file with credentials baked
  in (e.g. `.claude/launch.json`, `launch.json`, `deploy.sh`).

**Always** use environment variables:

- **Local development** → `.env.local` (already in `.gitignore`).
- **Production / preview** → set in the hosting provider:
  - Vercel → Project → Settings → Environment Variables
  - Mark each sensitive value as **"Sensitive"** so it cannot be re-read from
    the dashboard after creation.

## Naming convention

- `NEXT_PUBLIC_*` is **inlined into the JS bundle** at build time and visible
  to every visitor. Use it only for genuinely public values.
- Anything without that prefix is server-only and never reaches the browser
  bundle. **All Aplomb secrets follow this rule.**

## If a secret is accidentally committed

1. **Rotate the secret immediately** in the provider dashboard. Do not just
   delete it from code — the value is still in git history and on GitHub.
2. Remove the file from tracking:
   ```bash
   git rm --cached <file>
   ```
   For full-history scrub, use `git filter-repo`.
3. Add the file/pattern to `.gitignore`.
4. Commit and push. If `git filter-repo` was used, you'll need to force-push.
5. Document what was rotated in [SECURITY_INCIDENTS.md](./SECURITY_INCIDENTS.md)
   — one block per event, template at the top of the file.

## Verification before each PR

Quick local scan for likely-committed secrets:

```bash
git diff --cached | grep -nE \
  "AIza|sk-ant|sk_live_|sk_test_|whsec_|ghp_[A-Za-z0-9]{36}|service_role|postgresql://[^@]+:[^@]+@"
```

If anything matches, stop and revise.

## Pre-commit hook (optional but recommended)

Install [`gitleaks`](https://github.com/gitleaks/gitleaks):

```bash
# macOS
brew install gitleaks

# Windows (Scoop)
scoop install gitleaks

# Linux
# see https://github.com/gitleaks/gitleaks#installing
```

Then in this repo:

```bash
gitleaks install
```

This adds a `pre-commit` hook that scans your staged diff before every commit.
The hook configuration lives at `.gitleaks.toml` (committed) and the hook
script at `.git/hooks/pre-commit` (local).

## Defence-in-depth — RLS posture

Aplomb's Supabase tables ship with Row-Level Security policies (see
`prisma/migrations/*/migration.sql`). These policies use `auth.uid()` and
therefore only take effect when a request goes through Supabase's PostgREST/SDK
with a Supabase JWT.

The current Aplomb architecture uses **NextAuth v5 with JWT strategy** and
connects to Postgres via **Prisma + the Supabase service-role connection**,
which **bypasses RLS entirely**. The RLS layer is therefore defence-in-depth
only — the real ownership gatekeeper is application code in
`src/lib/ownership.ts` (`authorizeBodyProfile`, `authorizeSession`,
`requireBrandRole`), tested in `*.test.ts` files alongside the routes.

We keep the RLS in place because:
1. It catches future code that accidentally uses the Supabase anon client (e.g.
   if we ever add a client-side write path through PostgREST).
2. It's the documented intent — anyone reading the schema understands what
   the access boundaries are.

**Do not assume RLS protects you.** Every API route must go through
`authorize*` helpers from `lib/ownership.ts` before touching user data.

## Incident response

See [`docs/INCIDENT_RESPONSE.md`](./docs/INCIDENT_RESPONSE.md) for the 72-hour
GDPR-breach runbook (CNIL notification, user notice templates, common-scenario
playbooks).

## Privacy compliance

See [`docs/GDPR_AUDIT.md`](./docs/GDPR_AUDIT.md) for the audit history,
[`docs/DPIA.md`](./docs/DPIA.md) for the Data Protection Impact Assessment,
[`docs/RETENTION.md`](./docs/RETENTION.md) for per-category retention durations,
[`docs/SUBPROCESSORS.md`](./docs/SUBPROCESSORS.md) for the named third-party
list + transfer mechanisms.

## Reporting a vulnerability

Email **security@aplomb-app.com** or open a private GitHub Security Advisory:
https://github.com/aplombvalentino-sudo/Aplomb-V1/security/advisories/new

Do **not** open a public issue for security problems.
