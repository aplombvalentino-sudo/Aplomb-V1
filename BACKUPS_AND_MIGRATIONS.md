# Backups, migrations & rollback safety

This document is the operational playbook for changing the Aplomb database.
Anything that touches `prisma/migrations/`, `prisma/schema.prisma`, or runs
raw SQL must follow the rules below.

Quick rule of thumb:

> **You cannot rollback by re-pushing.** Once a destructive migration applies
> to production, the only recovery is a Supabase restore, which costs time and
> potentially data. Take the snapshot first.

---

## 1. Supabase backup configuration

> ⚠️ **Current production state: no managed backups.** Supabase's free tier
> does not include daily backups. Until the project is upgraded to **Pro
> ($25/mo)**, every destructive change is one-way — there is no "restore
> yesterday's snapshot" lifeline. Treat every migration accordingly.

### What each Supabase tier gives you

| Tier | Daily backups | PITR | Retention |
|---|---|---|---|
| **Free (current)** | ❌ none | ❌ no | — |
| Pro ($25/mo) | ✅ daily | ✅ 1-minute granularity | 7 days |
| Team / Enterprise | ✅ daily | ✅ | 14 / 30 days |

### What to do while on free tier

Until you upgrade, the practical playbook is:

1. **Take a manual logical dump before any destructive migration.** From a
   machine with the prod connection string in env (DON'T put it in `.env.local`):
   ```bash
   # Make a one-shot pg_dump snapshot tagged with the date. Requires
   # postgresql-client tools installed locally.
   pg_dump "$DIRECT_URL" --no-owner --no-acl \
     -f "backup-prod-$(date -u +%Y%m%d-%H%M%S).sql"
   ```
   The resulting `.sql` file is your only safety net. **Save it somewhere
   safe — encrypted cloud storage, password manager attachment.** Never
   commit it to git (it contains every row of every table).

2. **Restore is `psql < backup.sql` against a fresh Supabase project.**
   Then update `DATABASE_URL` / `DIRECT_URL` / `PRISMA_DATABASE_URL` in
   Vercel and redeploy. Allow 5–15 minutes downtime.

3. **Document the manual snapshot's existence** in your PR description
   (filename + where it's stored), since there's no Supabase backup ID to
   reference.

### Recommended: upgrade to Pro before the first destructive migration

The first destructive migration that touches `User`, `BodyProfile`,
`RecommendationSession`, or `Outfit` is the trigger to upgrade. Until then,
free tier is acceptable because you can still recreate the data from seeds
+ fresh signups.

### Restore procedure (once on Pro tier)

1. Dashboard → Database → Backups → pick the backup → **Restore**.
2. Restore creates a **new project**. You then need to:
   - Update `DATABASE_URL`, `DIRECT_URL`, `PRISMA_DATABASE_URL` in Vercel.
   - Redeploy.
3. The old (corrupted) project remains so you can compare data before discarding.
4. Document the incident in `SECURITY_INCIDENTS.md` (create the file if it
   doesn't exist).

---

## 2. Before any migration — the checklist

Run through this BEFORE merging the PR that contains the migration.

### For any migration

- [ ] Migration SQL is committed under `prisma/migrations/<timestamp>_<name>/`.
- [ ] `npm run db:status` locally returns "Database schema is up to date" against a staging DB.
- [ ] CI build succeeds with `npm run build` (which runs `prisma migrate deploy`).

### For a **destructive** migration

A migration is destructive if it contains any of:

- `DROP TABLE`, `DROP COLUMN`, `DROP TYPE`
- `TRUNCATE`
- `DELETE FROM` (used as a data-cleanup, not a constraint)
- `ALTER TABLE … DROP ...`
- A column rename without a multi-step backfill (Prisma generates these as a
  DROP + CREATE under the hood — irreversible)
- A column type change that may lose data (e.g. `text` → `varchar(8)`)
- `ALTER COLUMN … SET NOT NULL` without a backfill of existing nulls

Additional requirements for destructive migrations:

- [ ] **Take a backup first.** On **Pro tier**: dashboard → Database →
      Backups → "Take backup now," note the backup ID in the PR description.
      On **Free tier**: run `pg_dump` (see section 1 above) and store the
      resulting `.sql` file in encrypted cloud storage; reference the
      filename in the PR description.
- [ ] **Test the migration end-to-end on a staging project** with realistic
      data volume. See [STAGING.md](./STAGING.md) for the setup. Don't trust a
      fresh staging DB to surface backfill timeouts.
- [ ] **Write a rollback SQL stub** (even if approximate) in the PR body. If
      you can't write one, document why and what data would be lost on rollback.
- [ ] **The PR title starts with `db(destructive):`** so it shows up in the log
      diff.
- [ ] **Reviewer is required**: a destructive migration is never solo-merged.
- [ ] **Deploy outside peak hours** — pick a window where the rollback is
      affordable if it goes wrong.

### Non-destructive migration patterns (always prefer these)

| Want to | Don't do (destructive) | Do instead (safe) |
|---|---|---|
| Rename a column | rename in one step | 1) add new column 2) backfill 3) deploy app reads from new 4) deploy app stops reading old 5) drop old column |
| Make a nullable column NOT NULL | `SET NOT NULL` | 1) backfill nulls 2) `SET NOT NULL` in a follow-up migration |
| Drop a deprecated column | drop immediately | 1) deploy app that stops writing it 2) wait 1 week 3) drop in a follow-up |
| Change a column type | `ALTER COLUMN … TYPE …` | 1) add new column with new type 2) backfill 3) cut over 4) drop old |
| Drop a table | `DROP TABLE` | Same expand-contract pattern — never drop in the same release as code change |

---

## 3. Migration workflow (every time)

### Local dev — make a change

```bash
# 1. Edit prisma/schema.prisma
# 2. Generate the migration interactively (writes SQL + applies it locally)
npm run db:migrate -- --name describe_the_change

# 3. Review the generated SQL:
cat prisma/migrations/<timestamp>_describe_the_change/migration.sql

# 4. If destructive, follow the checklist above (snapshot, etc.)
# 5. Commit + push the migration folder
```

### Production deploy

Vercel runs `prisma migrate deploy` automatically as the first step of
`npm run build`. If the migration fails:

- The build fails. Next.js never starts. The previous deployment keeps serving.
- This is intentional — a bad migration **must not** silently leave the schema
  in a half-applied state.
- Investigate the migration locally, fix, and push a new commit.

### If a destructive migration has already applied and you want to roll back

There is no "rollback" command for `prisma migrate deploy`. Options in order
of preference:

1. **Compensating migration.** Write a new migration that reverses the change
   (re-adds the dropped column, copies data from the backup, etc.). Commit
   and deploy. This is the only "clean" path.
2. **Restore the snapshot you took.** See section 1 above. **You will lose
   any writes that happened after the snapshot.**
3. **PITR restore** (if on Pro tier). Roll back to 1 minute before the
   destructive migration applied. Loses ≤ 1 minute of writes.

---

## 4. Git & branching discipline

- **`main` is always deployable.** Vercel auto-deploys `main` to production.
  Never push directly to `main` if the change is risky enough that you'd want
  to test it first.
- **Feature branches**: anything destructive or schema-touching goes through
  a feature branch + PR. Vercel makes preview deployments for branches
  automatically — use them to verify the migration applies cleanly against
  a staging Supabase project.
- **Commit early, commit often.** A working feature is one commit. A failed
  experiment that you reverted is also one commit. Don't bundle 6 hours of
  changes into a single commit — granular history is what makes targeted
  reverts possible.
- **Tag releases that are known-good** so you can identify rollback targets:
  ```bash
  git tag -a v0.1.0 -m "First production-ready build"
  git push --tags
  ```

---

## 5. Standing rules (apply forever)

For every migration or DB-touching script proposed in this project:

1. **Explicitly call out** whether it is destructive at the top of the PR or
   chat message.
2. **Suggest a snapshot** if destructive — Supabase dashboard → Backups →
   "Take backup now" — and include the backup ID in the PR description.
3. **Suggest a rollback strategy** — compensating migration, PITR restore,
   or full snapshot restore — whichever is appropriate.
4. **Default to non-destructive patterns** (expand-contract) wherever possible.
5. **Reject single-step renames / drops** in code review.

---

## Quick reference

```bash
npm run db:status       # what's applied vs pending
npm run db:migrate      # create + apply a new migration (dev)
npm run db:deploy       # apply pending migrations (used by build)
npm run db:studio       # browse data
```

Supabase dashboard: https://supabase.com/dashboard
(Free-tier projects don't have a Backups page until upgrading to Pro.)
