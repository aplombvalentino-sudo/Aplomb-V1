# Aplomb — GDPR / EU Privacy Compliance Audit

*Conducted via the Legal Compliance Checker agent persona. Date: 2026-05-31. Auditor: Claude (Sonnet 4.5, 1M context). Scope: full codebase audit of `C:\Users\Utilisateur\aplomb` against GDPR + ePrivacy + French national law (Loi Informatique et Libertés). Read all key files in `src/lib/legal/`, `src/lib/ai/`, `src/lib/sessionToken.ts`, `src/app/api/{signup,measurements,outfits,tryon,user}/`, `src/app/(public)/{cgu,privacy}/`, `prisma/schema.prisma`, all migration SQL, `next.config.ts`, `package.json`.*

---

## Executive summary

- **Solid foundation**: clickwrap with versioned proof storage, RLS on every table, private storage bucket for body scans, constant-time session token compare, strong security headers, no third-party analytics/tracking deps in `package.json` — privacy posture is materially better than most pre-launch SaaS.
- **Top 3 critical risks**: (1) **No DPIA** has been performed despite high-risk biometric-adjacent processing (Art 35 — likely *mandatory* before live paying users in France); (2) **No data-subject-rights surface in code** — no `DELETE`/export/anonymise endpoints, no UI; right to erasure (Art 17) and access (Art 15) are unfulfilable today; (3) **Privacy policy is a placeholder draft** with `[Company legal name]`, `[privacy contact email]`, and `[retention period]` literal brackets — it is non-compliant with Art 13.
- **Effort to launch-ready compliance**: ~**8–12 person-days** of focused work (3 dev-days for endpoints/retention jobs, 2 for cookies + policy rewrite, 2–3 for DPIA write-up + DPA signatures, 1–2 for cookie banner if any analytics added).
- **External-info dependencies (blockers I cannot resolve)**: Supabase project region (must be EU — `eu-west-*` or `eu-central-*`); signed DPAs with Google (Gemini), fal.ai, Vercel, Stripe, Cloudflare, Upstash, Supabase; legal entity name + contact email; CNIL DPO threshold check; retention durations decision.
- **DPIA recommendation**: do it **before** the first paying shopper. CNIL's published guidance lists "innovative use of new technologies" + "biometric-adjacent data of the public at scale" as triggers (Art 35 §3 + CNIL list of mandatory DPIA processings, 11 Oct 2019).

## Findings (severity-ranked)

### 🔴 CRITICAL — DPIA never performed for body-photo processing

- **Risk**: Art 35 §1 GDPR makes DPIA *mandatory* "where a type of processing… is likely to result in a high risk to the rights and freedoms of natural persons". CNIL's mandatory list (deliberation n°2018-327) includes processing of biometric data of the public at scale and innovative use of new technologies. Processing body scans of consumers through generative AI hits both indicators. CNIL fines for missing DPIA have reached €250k+ (Carrefour, Spartoo).
- **Where**: Absent from codebase — Grep for `dpia|data protection impact|registre` in the repo returned **0 files**. Not in `docs/`.
- **GDPR**: Art 35; CNIL deliberation n°2018-327 (Oct 11 2018).
- **Fix**: Write a DPIA using CNIL's free PIA tool (https://www.cnil.fr/fr/outil-pia-telechargez-et-installez-le-logiciel-de-la-cnil). Minimum sections: description (scan flow + recipients), necessity/proportionality (could measurements be derived without photos? document the answer), risks (re-identification, profiling, leak to fal.ai), measures (private bucket + signed URLs + 30-min TTL + RLS already in place). Store as `docs/DPIA.md` and re-review yearly or on any flow change.
- **Effort**: M (2 person-days for first draft).

### 🔴 CRITICAL — Data-subject rights have no implementation

- **Risk**: Art 12 §3 — controller must respond to rights requests within 1 month. Today there is literally no code path to (a) export a user's data (Art 15/20), (b) delete an account (Art 17), or (c) rectify it (Art 16) beyond `User_update_self` RLS that nothing in the UI invokes. The only "delete" the consent screen advertises ("delete from your wardrobe at any time", `ConsentStep.tsx:53`) is **localStorage only** (`wardrobeStorage.ts`) — it does not touch `BodyProfile`, `RecommendationSession`, `Outfit`, `TryOnResult`, or the Supabase `body-scans` bucket. **This is misleading consent copy**.
- **Where**:
  - `src/app/api/user/` contains only `/plan` — no `/me`, `/delete`, `/export`, `/account`.
  - `src/lib/ai/storage.ts:63` defines `deleteBodyScan()` — Grep confirms it is **never called** anywhere in the app code.
  - `src/components/client/BrandScanWizard/steps/ConsentStep.tsx:39,53` promises "delete your scan at any time" / "You control retention".
- **GDPR**: Art 12–17, Art 20, Art 7 §3 (withdraw consent).
- **Fix**: Build three endpoints + minimal account UI:
  1. `GET /api/user/me/export` → JSON of User, LegalAcceptance[], BodyProfile[] (sans photos OR including signed URLs), RecommendationSession[], Outfit[], TryOnResult[], Subscription. Stream as `application/json` download.
  2. `DELETE /api/user/me` → in one transaction: list every `frontImagePath`/`sideImagePath` for the user's BodyProfiles → loop `deleteBodyScan()` → delete user row (cascades take care of related tables) → call `supabase.auth.admin.deleteUser()`.
  3. `PATCH /api/user/me` for name/email rectification.
  4. Account-area page (`/app/account`) exposing all three with confirmations.
  5. Either remove the "delete from your wardrobe at any time" claim from `ConsentStep.tsx` OR wire actual server-side deletion to the wardrobe remove button.
- **Effort**: M (1–2 person-days).

### 🔴 CRITICAL — Privacy policy is a non-compliant placeholder draft

- **Risk**: Art 13 requires the controller to provide **at the point of collection**: controller identity, contact details, purposes + legal basis for *each* purpose, recipients (named — not "AI providers"), international transfer mechanism, retention period, all six subject rights + withdraw + complain to CNIL, source of indirect data. The current `/privacy` covers ~30% of that and contains literal `[Company legal name]`, `[privacy contact email]`, `[retention period]` placeholders. The on-page banner even says: *"This policy is a working draft and must be reviewed by qualified legal / privacy counsel before launch."*
- **Where**: `src/app/(public)/privacy/page.tsx:31-101`. CGU same problem (`src/app/(public)/cgu/page.tsx:32-99`).
- **GDPR**: Art 13 §1–2; CNIL "Mentions d'information" template.
- **Fix**: Rewrite `/privacy` to include:
  - Identity + postal address + email of controller + (if applicable) DPO.
  - Table mapping each data category → purpose → legal basis (Art 6) → retention.
  - **Named subprocessor list** (or link to `/subprocessors`): Supabase, Vercel, Stripe, Cloudflare, Google Gemini, fal.ai, Upstash. For each: role, location, transfer mechanism (DPF / SCCs).
  - All 6 rights with "to exercise, email X" + right to lodge complaint with **CNIL** (https://www.cnil.fr/fr/plaintes) + right to withdraw consent at any time.
  - Cookie list (see finding below).
- **Effort**: M (1 person-day + legal review).

### 🟠 HIGH — Photos retained indefinitely after measurement derivation

- **Risk**: Data minimisation (Art 5 §1.c) + storage limitation (Art 5 §1.e). The pipeline uploads front+side photos to `body-scans/`, derives measurements, persists `frontImagePath`/`sideImagePath` on `BodyProfile` (`src/app/api/measurements/route.tsx:178-179`) and the photos remain forever. There is no lifecycle policy, no scheduled cleanup, no post-derivation delete. fal.ai try-on needs the front photo, but only at try-on time — keeping `sideImagePath` after measurements are computed has no purpose.
- **Where**:
  - `src/app/api/measurements/route.tsx:127-180` (uploads + stores paths).
  - `src/lib/ai/storage.ts:11` (comment mentions "Optional: configure object lifecycle to auto-delete after N hours" — not done).
- **GDPR**: Art 5 §1.c (minimisation), §1.e (storage limitation).
- **Fix**:
  1. Immediately after `runMeasurement()` succeeds in `/api/measurements`, call `deleteBodyScan(sidePath)` — side photo only needed for measurement.
  2. For `frontImagePath`: keep N days max (e.g., 30 days post-last-tryon), implement via a Vercel cron route hitting `/api/admin/retention-sweep` that deletes scans + nulls the `BodyProfile.frontImagePath`. Document the policy.
  3. Alternative: configure Supabase Storage object lifecycle (in dashboard, Storage → body-scans → Settings → auto-delete after N days).
- **Effort**: S (half-day).

### 🟠 HIGH — No retention policy anywhere in code or docs

- **Risk**: Art 5 §1.e + accountability (Art 5 §2). Today the DB has no `deletedAt`, no soft-delete, no retention sweep, no documented periods. `RecommendationSession` and `Outfit` accumulate indefinitely; `LegalAcceptance` is correctly kept (good — needed for the prescription period after the account ends) but everything else is unbounded.
- **Where**: No `retention`, no `purge`, no `sweep`, no `cron` in `src/`. `prisma/schema.prisma` has no `deletedAt`.
- **GDPR**: Art 5 §1.e.
- **Fix**: Decide and document defaults (suggested for a French SaaS, aligned with CNIL recommendations):
  - Body photos: 30 days from last use, or immediately post-derivation for side photo.
  - BodyProfile rows: as long as the account is active, +30 days after deletion (audit trail of measurements drift).
  - RecommendationSession + Outfit + TryOnResult: 13 months (CNIL's general analytics guidance) or until account deletion.
  - LegalAcceptance: account lifetime + 5 years (French general prescription, Code civil art. 2224).
  - Anonymous shopper data (no userId): 13 months from creation.
  - Stripe Subscription: 10 years per French commercial-bookkeeping obligation (Code de commerce art. L123-22).
  Write to `docs/RETENTION.md` and implement a weekly cron.
- **Effort**: M (1 day spec + cron).

### 🟠 HIGH — Anonymous shoppers have zero way to exercise rights

- **Risk**: The widget creates BodyProfile + photos against an anonymous SessionToken cookie (`/api/measurements`, `RecommendationSession.ownerTokenHash`). The shopper has no account, so cannot log in to delete or export. They are still data subjects under GDPR — anonymity from us doesn't mean we don't hold their data.
- **Where**: `src/lib/sessionToken.ts` + `src/app/api/measurements/route.tsx:165` — anonymous flow has no rights surface.
- **GDPR**: Art 11 §2 — if controller can't identify the subject, Arts 15–20 do not apply, **but only if** you "demonstrate that you are not in a position to identify" and "inform the data subject accordingly". You DO have an identifier (session-token hash) the shopper can present back.
- **Fix**: Options ranked by effort:
  1. Easiest: rely on Art 11 §2 — add a clear notice on the widget ("Without an account we cannot match a deletion request to your data; create a free account to take control"). Adds an Art 11 §2 disclosure.
  2. Better: add an "Export my data / Delete" link in the widget that re-uses the cookie token to authenticate a one-off DELETE/export call. Implement `/api/anonymous/me` keyed by `ownerTokenHash`.
  3. Best: auto-expire anonymous data after a short retention (e.g., 30 days from last activity) — covered by the retention finding above.
- **Effort**: S (option 1) → M (options 2–3).

### 🟠 HIGH — `auth.uid()` RLS broken for NextAuth JWT strategy

- **Risk**: All `*_read_owner` RLS policies use `auth.uid()::text = "userId"`. This works only if the request comes through Supabase's PostgREST/SDK *with a Supabase JWT*. Aplomb uses **NextAuth v5 with JWT strategy** and connects to Postgres via Prisma + the service-role connection, which **bypasses RLS entirely**. The RLS layer is therefore decorative for the current architecture — the only thing keeping data private is your application code.
- **Where**: `prisma/migrations/20260527100030_init/migration.sql:366-412` (auth.uid based policies) vs `src/lib/auth.ts` (Auth.js JWT) + `src/lib/db.ts` (Prisma using service-role DB url).
- **GDPR**: Art 32 (defence-in-depth principle, not a hard breach).
- **Fix**: Acknowledge RLS is defence-in-depth only and document it explicitly in `SECURITY.md`. The application's `lib/ownership.ts` (`authorizeBodyProfile`, `authorizeSession`) is the real gatekeeper — add a comment to every "RLS policy" block that says "only effective when querying via Supabase anon/auth role; service-role bypasses". The migration comment already says this for storage — extend to every block. (Don't remove the RLS — it still catches future code that mistakenly uses the anon client.)
- **Effort**: S (documentation only).

### 🟠 HIGH — No signed DPAs / subprocessor agreements

- **Risk**: Art 28 §3 — controller-processor relationship **must** be governed by a written contract before processing starts. Most providers offer click-through DPAs but the user must actually accept them. Without these, every transfer is unlawful.
- **Where**: Outside the codebase — checked `docs/`, no DPA list or signed agreements referenced.
- **GDPR**: Art 28 §3.
- **Fix**: For each subprocessor, accept the published DPA (typically a one-click form in the provider console):
  - **Supabase**: https://supabase.com/legal/dpa (must accept in dashboard for EU customers).
  - **Vercel**: https://vercel.com/legal/dpa.
  - **Stripe**: https://stripe.com/legal/dpa (auto-applies to EU merchants).
  - **Cloudflare**: https://www.cloudflare.com/cloudflare-customer-dpa/.
  - **Google Gemini (Cloud AI)**: https://cloud.google.com/terms/data-processing-addendum — Gemini-API specifically requires accepting Google's DPA.
  - **fal.ai**: contact fal directly — they publish a DPA on request (https://fal.ai/terms).
  - **Upstash**: https://upstash.com/trust → DPA section.
- **Effort**: S (process — half-day chasing signatures).

### 🟠 HIGH — Cross-border transfer mechanism not documented

- **Risk**: Chapter V GDPR — transfers to the US (and other "non-adequate" countries) need a valid mechanism. Schrems II killed Privacy Shield; the EU-US Data Privacy Framework (DPF, since July 2023) restored a mechanism *only* for DPF-certified US recipients. Others need SCCs + Transfer Impact Assessment.
- **Where**: Absent — `/privacy` page makes no mention of transfers. No `docs/TRANSFERS.md`.
- **GDPR**: Arts 44–49.
- **Fix**: Per subprocessor in your DPA list:
  - **Stripe** — DPF-certified (✓).
  - **Vercel** — DPF-certified (✓).
  - **Cloudflare** — DPF-certified (✓).
  - **Google Cloud (Gemini)** — DPF-certified (✓).
  - **fal.ai** — **NOT** DPF-certified at time of writing. Requires SCCs + TIA. Verify with fal.
  - **Upstash** — EU region available; if using EU endpoint, no transfer. Verify.
  - **Supabase** — EU region available; entity is US Inc., so SCCs apply even if data stays in EU.
  Document mechanism per processor in `/privacy` (and/or `/subprocessors`).
- **Effort**: S (1 hour documentation, once DPAs are signed).

### 🟠 HIGH — Photos sent to fal.ai may not pass necessity test

- **Risk**: Art 5 §1.c (minimisation). The try-on flow signs the user's real front photo and gives fal.ai a fetchable URL (`src/app/api/tryon/route.tsx:99` + `src/lib/ai/fal/tryon.ts:38-44`). The CNIL has explicitly questioned whether real-image try-on passes proportionality when synthetic avatars achieve comparable utility. If a court holds that try-on output is "data uniquely identifying a natural person", you're in Art 9 territory.
- **Where**: `src/app/api/tryon/route.tsx`, `src/lib/ai/fal/tryon.ts`.
- **GDPR**: Art 5 §1.c; Art 9 §1 (depending on output identifiability).
- **Fix**:
  1. Add an explicit, **separate** consent for the try-on step (not bundled with general CGU/privacy). UI must say: "I consent to my front photo being sent to fal.ai (USA) to generate try-on imagery."
  2. Offer an avatar-based fallback for users who decline.
  3. Document Art 9 §2.a derogation (explicit consent for biometric-like processing) in privacy policy if you treat try-on output as Art 9.
  4. Confirm with fal that they do not retain inputs after job completion — get this in writing.
- **Effort**: M (1 day for the UI + flow).

### 🟠 HIGH — Bundled clickwrap may not meet granularity standard

- **Risk**: Signup forces both `acceptTerms` AND `acceptPrivacy` simultaneously (`src/app/api/signup/route.tsx:49`). Where the privacy doc is *information* (Art 13) and the terms are *a contract*, bundling is fine. Where the privacy doc is asking for *consent* to specific processings (e.g., Art 9 explicit consent for biometric data), the consent **must be separable** (Art 7 §2: "if the data subject's consent is given in the context of a written declaration which also concerns other matters, the request for consent shall be presented in a manner which is clearly distinguishable from the other matters"). EDPB Guidelines 05/2020 explicitly forbids bundling distinct processing consents.
- **Where**: `src/app/(auth)/signup/SignupForm.tsx:251-271` (the two checkboxes) + `src/app/api/signup/route.tsx:49`.
- **GDPR**: Art 7 §2; EDPB Guidelines 05/2020 on consent.
- **Fix**: Currently both checkboxes are separate, which is good. But the privacy checkbox actually says "I acknowledge the Privacy Policy" — that's an **acknowledgement of information**, not a **consent to processing**. As long as you treat the legal basis for body-scan processing as Art 6 §1.b (performance of contract) + the contract-side specific body-scan consent on the wizard's `ConsentStep`, you are technically OK. **However**: if you later add marketing emails, analytics, or invoke Art 9 explicit consent, those must each be separate, opt-in, unticked checkboxes.
- **Effort**: S (no immediate change; revisit when adding any non-essential processing).

### 🟠 HIGH — `BodyProfile` survives user deletion (orphan personal data)

- **Risk**: The FK is `BodyProfile.userId → User(id) ON DELETE SET NULL` (`prisma/schema.prisma:267` → confirmed in migration line 289). If a user is deleted, their `BodyProfile` rows become anonymous orphans but **the photo paths in `frontImagePath`/`sideImagePath` and the raw measurements remain**. Same for `RecommendationSession.userId` (line 298). This violates erasure (Art 17 §1.a).
- **Where**: `prisma/migrations/20260527100030_init/migration.sql:289` and `:298`.
- **GDPR**: Art 17.
- **Fix**: Two options:
  1. Change FK to `ON DELETE CASCADE` for BodyProfile + RecommendationSession when the brand context allows (note: brand might still want aggregate stats — but in that case anonymise rather than orphan).
  2. Implement an erasure routine that, before deleting User, iterates BodyProfiles → deletes photos from storage → deletes rows → then deletes User. This is the recommended path because anonymous `SET NULL` is *not* anonymisation in the GDPR sense (the photos themselves are still identifying).
- **Effort**: S (migration + erasure function — combine with the DELETE endpoint above).

### 🟡 MEDIUM — No cookie banner, but unclear if needed

- **Risk**: ePrivacy Directive (transposed in France via Loi Informatique et Libertés art. 82) requires consent for any non-essential cookie/storage. Aplomb sets only:
  - `aplomb_session_token` (`SESSION_TOKEN_COOKIE`) — strictly necessary for anonymous flow ✓ no consent needed.
  - `client_plan` cookie (`/api/user/plan/route.tsx:25`) — preference cookie, arguably necessary ✓.
  - NextAuth session cookie — strictly necessary ✓.
  - Cloudflare Turnstile cookies — necessary security ✓.
  - Supabase auth cookies — necessary ✓.
  - localStorage `aplomb_wardrobe` + `SCAN_COUNT_KEY` — necessary feature data, but **CNIL requires consent for non-essential localStorage too**. Wardrobe is arguably essential to the service; scan counter (quota enforcement) is essential.
- **Where**: Grepped all `cookies.set` / `Set-Cookie` — only the above. No GA/Plausible/Mixpanel/PostHog/Sentry in `package.json`.
- **GDPR + ePrivacy**: Art 7; ePrivacy art. 5(3); CNIL Lignes directrices on cookies (Sep 2020).
- **Fix**: Today, no banner needed (all cookies are strictly necessary). Add a `/cookies` page listing each cookie with purpose + lifetime. **The moment you add ANY analytics (Vercel Analytics, GA, Plausible-cloud, Sentry session-replay…), you need a consent banner with reject-as-easy-as-accept.** Add a one-line note in `/privacy` saying you don't use tracking cookies today.
- **Effort**: S (cookie page) — M if banner ever needed.

### 🟡 MEDIUM — Age verification absent

- **Risk**: In France, digital-service consent age is **15** (Loi Informatique et Libertés art. 7-1). Below 15, parental consent is needed. Aplomb's CGU section 3 only says "you must be at least the age of majority in your jurisdiction" — but no signup-time gate. Body photos of minors compound the risk dramatically (Art 9 + Art 6 special protection of minors).
- **Where**: `src/app/(public)/cgu/page.tsx:55-60` (text-only). No date-of-birth field on signup.
- **GDPR**: Art 8; LIL art. 7-1.
- **Fix**:
  1. Add a "I confirm I am 15 or older" checkbox on signup (separate from CGU/Privacy).
  2. Update CGU section 3 to say "15 years old" explicitly (not "age of majority").
  3. Add the same gate on the anonymous widget's ConsentStep — these are the highest-risk path because no account.
- **Effort**: S (half-day).

### 🟡 MEDIUM — Stripe customer creation field-set not documented

- **Risk**: Art 5 §1.c. Need to verify the Stripe Checkout session creation passes only minimum necessary fields.
- **Where**: `src/app/api/checkout/route.tsx` (not deeply inspected this pass).
- **GDPR**: Art 5 §1.c.
- **Fix**: Confirm checkout only passes `customer_email` + `metadata.userId|brandId` + price. Avoid passing name/address unless billing-required. Skip `customer_details` collection in Checkout config if not needed for tax.
- **Effort**: S (15-minute audit).

### 🟡 MEDIUM — No breach-detection / logging strategy documented

- **Risk**: Art 33 — 72-hour breach notification to CNIL. Need a way to *detect* a breach in the first place.
- **Where**: `SECURITY.md` covers secrets-handling only. No breach-response plan. No log retention.
- **GDPR**: Arts 33–34.
- **Fix**: Write `docs/INCIDENT_RESPONSE.md` with: (a) who decides "is this a breach", (b) the CNIL notification URL (https://notifications.cnil.fr/notifications/index), (c) template notice to affected users, (d) where logs live (Vercel + Supabase logs — both have ~30-day retention; document this).
- **Effort**: S (half-day).

### 🟢 LOW — `LegalAcceptance` IP retention is fine but un-pseudonymised

- **Risk**: IP address is personal data. Storing it forever for clickwrap proof is *justified* (Art 6 §1.f legitimate interest in proving consent) but a CNIL inspector may prefer truncated IPs (e.g., `/24` for IPv4, `/64` for IPv6) for older rows. Current state is fine; flag for future hardening.
- **Where**: `src/app/api/signup/route.tsx:129-138`.
- **Fix**: Optional retention sweep that truncates `LegalAcceptance.ipAddress` after, say, 24 months while keeping the version+timestamp proof.
- **Effort**: S (future-only).

### 🟢 LOW — `/api/debug-env` route exists

- **Risk**: Route at `src/app/api/debug-env/` may leak env keys if reachable in production.
- **Where**: `src/app/api/debug-env/`.
- **Fix**: Confirm it's `NODE_ENV === "development"`-only or remove. (Probably already gated but worth verifying.)
- **Effort**: S (5 minutes).

## What's already compliant (verified)

- **Versioned clickwrap with immutable proof** — `src/lib/legal/legalVersions.ts` + server-validated in `src/app/api/signup/route.tsx:49,123-140`. Stores IP + user-agent + version. Excellent.
- **Private storage bucket** — `body-scans/` confirmed private, service-role-only RLS — `prisma/migrations/.../migration.sql:481-496` + `src/lib/ai/storage.ts:14-17`.
- **Photos never returned to clients** — confirmed via response shape in `/api/measurements` (only paths stored, never serialised back); fal sees short-lived signed URL only.
- **Raw provider response stripped** — `src/app/api/measurements/route.tsx:157-158` (`rawProviderResponse` omitted before persist).
- **Constant-time session-token compare** — `src/lib/sessionToken.ts:37-42`.
- **Cookie hardening** — httpOnly + sameSite + secure (prod) on `aplomb_session_token` and `client_plan`.
- **Security headers** — HSTS preload, CSP with frame-ancestors deny, Permissions-Policy locking camera/mic/geolocation — `next.config.ts:27-67`.
- **Bot/abuse protection** — Cloudflare Turnstile required at signup (`/api/signup` + `/lib/security/turnstile.ts`); two-tier IP rate-limit on signup; per-IP and per-day rate-limits on `/api/measurements`, `/api/outfits`, `/api/tryon`.
- **Stripe key is server-only** — `import "server-only"` + lazy init at `src/lib/stripe.ts:1-21`.
- **No third-party tracking** — `package.json` has zero analytics/replay/RUM deps.
- **Ownership enforcement before rate-limit credits** — `src/app/api/tryon/route.tsx:46-52`, `src/app/api/outfits/route.tsx:50-58` (correct order so attackers can't enumerate IDs by burning credits).
- **Supabase Auth user rolled back on DB tx failure** — `src/app/api/signup/route.tsx:163-169`.

## Roadmap

**Pre-launch (BLOCKING)**
- Complete DPIA (`docs/DPIA.md`).
- Rewrite `/privacy` with all Art 13 elements + named subprocessor list + transfer mechanisms + CNIL complaint link.
- Implement `DELETE /api/user/me`, `GET /api/user/me/export`, account-area UI.
- Wire side-photo deletion immediately post-measurement.
- Fix BodyProfile/RecSession `ON DELETE SET NULL` → cascade or pre-cascade purge.
- Add explicit try-on consent + age (15+) gate.
- Sign DPAs with Supabase, Vercel, Stripe, Cloudflare, Google, fal.ai, Upstash.
- Confirm Supabase project region is EU.

**Launch + 30 days**
- Implement retention cron (`/api/admin/retention-sweep`) for body photos (30d post-last-tryon) + anonymous data (13 months).
- Write `docs/RETENTION.md`, `docs/INCIDENT_RESPONSE.md`, `docs/SUBPROCESSORS.md`.
- Add `/cookies` page even though no banner needed.
- Add anonymous-shopper rights surface (Art 11 §2 disclosure or session-token-keyed export/delete).
- Update CGU "age of majority" → "15 years old (France)".

**Ongoing**
- Re-review DPIA on any flow change (new AI provider, new data type).
- Re-bump legal versions when materially changed (mechanism already exists via `LEGAL_DOCS`).
- Annual subprocessor review.
- Monitor CNIL guidance on generative AI + biometrics (active area — guidance evolves).
- If you ever add a single analytics SDK: build cookie banner first.

## User actions needed (outside the codebase)

1. **Sign DPAs** with Supabase, Vercel, Stripe, Cloudflare, Google Cloud (Gemini), fal.ai, Upstash. Most are click-accept in the provider console. Keep copies (PDF) in a `dpas/` folder outside the repo.
2. **Set Supabase project region to EU** (Frankfurt `eu-central-1` or Paris `eu-west-3`). If the project is currently US, **migrate before launch** — region cannot be changed in place, you must dump → recreate.
3. **Designate a DPO**? GDPR Art 37 §1.b makes this mandatory if "core activities consist of regular and systematic monitoring of data subjects on a large scale" — arguably yes once you have meaningful traffic, definitely yes if you process Art 9 data systematically. Until then, you (founder) act as privacy contact.
4. **Register the processing in your `registre des activités de traitement`** (Art 30) — a simple document listing what you process, why, retention, recipients. CNIL template: https://www.cnil.fr/fr/RGDP-le-registre-des-activites-de-traitement.
5. **Complete a DPIA** using CNIL's free PIA software.
6. **Decide retention durations** for each data category and document them.
7. Decide legal entity name + privacy contact email + postal address — needed to fill the `[…]` placeholders in `/cgu` and `/privacy`.
8. If processing any minors' data is likely: implement parental consent flow (out of scope for v1 unless you target Gen Z explicitly).

## Open questions for the user

1. **Supabase project region** — EU or US? Critical for transfer-mechanism wording.
2. **Legal entity** — SAS / SARL / micro-entreprise / individual auto-entrepreneur? Affects DPO threshold and CNIL registration.
3. **Are you the legal controller**, or is the brand (the merchant embedding the widget) the controller and Aplomb a processor? This changes EVERYTHING (different DPA, different obligations). Most likely you are joint controllers for the body-scan data and you alone for the platform account — confirm.
4. **Are you targeting under-18s** as part of the product (e.g., Gen Z fashion brands)? If yes, age verification becomes much more invasive.
5. **Has fal.ai confirmed in writing** that they do not retain model_image or generated outputs beyond the inference window? If not, that's a separate Art 28 issue.
6. **Will you ever process measurements/photos that have not been actively uploaded by the data subject themselves** (e.g., a brand uploads a model's photos)? If yes, Art 14 (indirect-collection notice) kicks in.
7. **Estimated user volume in year 1?** Determines whether DPO is mandatory and CNIL prior-consultation threshold.
8. **Marketing emails / newsletter?** Not in the codebase today (no SendGrid/Resend dep in `package.json`) — if you add later, the privacy policy needs an updated section + a separate consent checkbox + double opt-in + unsubscribe.
