# Aplomb security test plan

Run these scenarios after every auth-touching PR and after any RLS policy
change in Supabase. Record the outcome (✓ / ✗) and the commit hash you tested
against. None of these are automated — they need real accounts and the live
deployment.

Test environment: a staging Vercel deploy of `main` against a non-production
Supabase project. **Never** use these against production data.

---

## A — Cross-user data access (cookie + session token)

**Setup**

1. Create two shopper accounts:
   - **Alice** — `alice+test@example.com`
   - **Bob** — `bob+test@example.com` (use an incognito/private window)
2. As Alice, complete a full scan against `demo-brand` (or any seeded brand).
3. Note from the network tab:
   - `recommendationSessionId`
   - `bodyProfileId`
   - any `outfitItem.id` returned by `/api/outfits`
4. Sign Alice out, then sign in as Bob in the same browser.

### A.1 — Outfit generation with another user's session ID

From Bob's DevTools console:

```js
fetch('/api/outfits', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    brandSlug: 'demo-brand',
    recommendationSessionId: '<ALICE_SESSION_ID>',
  }),
}).then(r => r.json()).then(console.log)
```

**Expected:** `{ success: false, error: { code: "FORBIDDEN", ... } }` (HTTP 403).
**Failure if:** HTTP 200 with outfits — Bob just burned Gemini credits against Alice's session.

### A.2 — Try-on with another user's body profile

```js
fetch('/api/tryon', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    outfitItemId: '<ALICE_OUTFIT_ITEM_ID>',
    bodyProfileId: '<ALICE_BODY_PROFILE_ID>',
  }),
}).then(r => r.json()).then(console.log)
```

**Expected:** HTTP 403.
**Failure if:** HTTP 200 with an image URL — Bob just rendered try-on against Alice's body photo.

---

## B — Anonymous tampering

**Setup**

Open an incognito window. Do not sign in. Do not run a scan.

```bash
curl -sS -X POST https://<vercel-url>/api/outfits \
  -H 'Content-Type: application/json' \
  -d '{"brandSlug":"demo-brand","recommendationSessionId":"<any cuid>"}' | jq .
```

**Expected:** HTTP 401 (`"Missing session token cookie."`) or HTTP 404
(`"Recommendation session not found."`).
**Failure if:** HTTP 200 with outfits — anyone in the world can burn Gemini credits.

Same for try-on:

```bash
curl -sS -X POST https://<vercel-url>/api/tryon \
  -H 'Content-Type: application/json' \
  -d '{"outfitItemId":"<any cuid>","bodyProfileId":"<any cuid>"}' | jq .
```

**Expected:** HTTP 401 or 404. **Failure if:** HTTP 200.

---

## C — Role escalation (brand-scoped)

**Setup**

Use the Supabase SQL editor to add Bob as a `viewer` on Alice's brand:

```sql
-- Find IDs first
SELECT id, "userId", "brandId", role FROM "BrandUser"
WHERE "userId" IN ('<alice-uid>', '<bob-uid>');

-- Then add Bob as viewer
INSERT INTO "BrandUser"(id, "userId", "brandId", role)
VALUES (gen_random_uuid()::text, '<bob-uid>', '<alice-brand-id>', 'viewer');
```

Sign in as Bob.

### C.1 — Viewer attempts to update a product

```js
fetch('/api/products/<some-product-id>', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Pwned' }),
}).then(r => r.json()).then(console.log)
```

**Expected:** HTTP 403 (`"This action requires one of: owner, admin, editor."`).
**Failure if:** HTTP 200 — viewer escalated to write.

### C.2 — Viewer attempts to delete a product

```js
fetch('/api/products/<some-product-id>', { method: 'DELETE' })
  .then(r => r.json()).then(console.log)
```

**Expected:** HTTP 403 (admin/owner only).
**Failure if:** HTTP 200 — viewer deleted a row they should never touch.

### C.3 — Editor attempts to change brand plan

Promote Bob to editor:

```sql
UPDATE "BrandUser" SET role = 'editor'
WHERE "userId" = '<bob-uid>' AND "brandId" = '<alice-brand-id>';
```

Then:

```js
fetch('/api/brand/plan', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ plan: 'enterprise' }),
}).then(r => r.json()).then(console.log)
```

**Expected:** HTTP 403 (plan changes are owner/admin only).
**Failure if:** HTTP 200 — editor escalated to admin.

### C.4 — Cleanup

```sql
DELETE FROM "BrandUser" WHERE "userId" = '<bob-uid>' AND "brandId" = '<alice-brand-id>';
```

---

## D — RLS direct-DB bypass

> Only meaningful **after `prisma/rls.sql` has been applied** in Supabase.

In a browser console while signed in as Alice, get her Supabase access token
(from the auth cookie set by `supabase-js` or via NextAuth's session if you
expose it). Then attempt to read Bob's body profile via the Supabase JS
client directly:

```js
import { createClient } from '@supabase/supabase-js';
const sb = createClient(
  '<SUPABASE_URL>',
  '<SUPABASE_ANON_KEY>',
  { global: { headers: { Authorization: `Bearer ${aliceAccessToken}` } } }
);
const { data, error } = await sb
  .from('BodyProfile')
  .select('*')
  .eq('id', '<bob-body-profile-id>');
console.log({ data, error });
```

**Expected:** `data: []` (RLS filters Alice out, no error).
**Failure if:** `data: [{ ...bob's measurements... }]` — RLS missing or wrong.

---

## E — Cost / rate-limit protection

**Setup**

Open a terminal in the staging environment.

### E.1 — Rate limit holds under load

```bash
for i in {1..30}; do
  curl -sS -o /dev/null -w '%{http_code}\n' \
    -X POST https://<vercel-url>/api/outfits \
    -H 'Content-Type: application/json' \
    -d '{"brandSlug":"demo-brand","recommendationSessionId":"cxxxxxxxxxxxxxxxxxxxx"}'
done
```

**Expected:** First ~12 responses return 4xx (likely 401/404 from ownership
check), then 429 (RATE_LIMITED). **Failure if:** all 30 return 200 — the rate
limiter isn't catching.

### E.2 — Anonymous quota
Confirm that an anonymous IP can call `/api/measurements` no more than 12
times per minute. (The rate limiter is in-memory per Vercel instance — this
test gives a lower bound.)

---

## F — Body-scan bucket privacy

In Supabase dashboard → Storage → `body-scans`:

- ✓ "Public bucket" toggle is **OFF**.
- ✓ Open any object's row → "Public URL" returns 400/403 when pasted into
  a browser.
- ✓ The signed URL produced by `/api/measurements` (briefly visible in the
  fal.ai call logs) expires within 30 minutes.

If a body-scan object opens publicly in a browser, this is critical — stop
all production traffic and rotate the bucket.

---

## How to record a run

Create `SECURITY_TESTS_RUNS/<YYYY-MM-DD>_<commit-hash>.md` after each pass:

```
# Security test run — 2026-05-27 — commit e46264b

A.1 ✓  outfits with another user's session → 403
A.2 ✓  tryon with another user's body → 403
B   ✓  anonymous outfits/tryon → 401
C.1 ✓  viewer PUT product → 403
C.2 ✓  viewer DELETE product → 403
C.3 ✓  editor PATCH brand plan → 403
D   ✓  RLS BodyProfile bypass → empty
E.1 ✓  30 rapid /api/outfits → 429 after ~12
F   ✓  body-scans bucket private
```

A failure in A, B, D, or F is a release blocker. Failures in C and E are
high priority but can ship as known issues with a follow-up.
