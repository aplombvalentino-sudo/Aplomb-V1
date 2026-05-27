<!--
Aplomb pull request template.
Delete the sections that don't apply. Don't delete the destructive-migration
section unless you're sure your PR touches no DB / migration files.
-->

## Summary

<!-- 1–3 sentences: what does this PR do and why? -->

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Refactor / cleanup
- [ ] Dependency update
- [ ] Documentation
- [ ] **Schema or migration change** (see destructive-migration checklist below)

---

## Standing checks (every PR)

- [ ] `npx tsc --noEmit` is clean in `src/`
- [ ] `npm run build` succeeds locally
- [ ] If a new env var was added, it's documented in `.env.example` and
      `SECURITY.md` if it's a secret
- [ ] If a new dependency was added, I followed the checks in
      [CONTRIBUTING.md → Adding a dependency](../CONTRIBUTING.md)
- [ ] If a new API endpoint was added, it has:
  - [ ] Zod-validated input via `parseJsonBody` / `parseQuery` / `parseParam`
  - [ ] Auth + ownership checks
  - [ ] A rate limiter from `src/lib/rateLimit-upstash.ts`

---

## Database / migration changes

<!-- Skip this whole section if no Prisma schema or migration changes. -->

### Is this migration destructive?

A migration is **destructive** if it contains any of:

- `DROP TABLE`, `DROP COLUMN`, `DROP TYPE`
- `TRUNCATE`, `DELETE FROM`
- `ALTER TABLE … DROP …`
- A column rename or type change (Prisma generates these as DROP + CREATE)
- `SET NOT NULL` on an existing column (may fail on existing nulls)

- [ ] **No** — this migration only adds tables/columns/indexes, or alters
      schema in fully reversible ways.
- [ ] **Yes** — complete the destructive-migration checklist below.

### Destructive migration checklist

- [ ] PR title starts with `db(destructive):`
- [ ] Backup taken — Pro-tier backup ID OR free-tier `pg_dump` filename: `____________`
- [ ] Migration tested end-to-end on a staging project with realistic data
- [ ] Rollback strategy documented (paste below)
- [ ] Considered + rejected the expand-contract alternative — reason: `____________`
- [ ] Scheduled for an off-peak deploy window

### Rollback strategy

<!--
Pick one and fill in:
  a) Compensating migration — paste the SQL or describe the steps to reverse.
  b) Snapshot restore — backup ID, plus the time window in which we'd
     accept losing writes.
  c) PITR restore — only if Supabase Pro tier is active.
-->

---

## Test plan

<!--
Concrete steps the reviewer (or you) ran to verify this works.
For security-touching changes, link to the relevant SECURITY_TESTS.md
scenario you ran.
-->
