# Compliance Decisions — Aplomb

*Single source of truth for every business / legal decision that drove the GDPR remediation work. Read this first when you wonder "why did we set retention to 30 days?" or "are we joint-controller with brands?" — every CGU clause, Privacy section, DPIA risk, and subprocessor entry traces back here.*

*Last reviewed: 2026-05-31. Owner: Aplomb SAS founder. Re-review whenever any of these answers changes.*

---

## 1. 🌍 Supabase region

**Decision: Ireland (`eu-west-1`)**

- ✅ EU region → data at rest stays in GDPR scope
- ✅ No migration needed pre-launch
- ℹ️ Supabase Inc. is still a US entity → SCCs apply to any US admin access (documented in `/privacy` §5 + `docs/SUBPROCESSORS.md`)

**Where this shows up**: `/privacy` §4 (subprocessor table), `docs/DPIA.md` §1.6, `docs/SUBPROCESSORS.md` row #1.

---

## 2. 🏢 Legal entity

**Decision: SAS / SASU (Aplomb SAS) — registration pending**

- ✅ Standard structure for a French SaaS startup
- ✅ Flexibility for future equity / fundraising
- 🚧 Placeholders to complete once registered:
  - `[SIREN to be assigned]` → the 9-digit SIREN
  - `[Postal address — to be added once the SAS siège social is registered]` → siège address

**Where to edit when SAS is registered**: 2 files only, both have a `CONTROLLER` constants block at the top:

- `src/app/(public)/privacy/page.tsx`
- `src/app/(public)/cgu/page.tsx`

---

## 3. 👤 GDPR data-controller relationship

**Decision: Aplomb sole controller. Brands are commercial partners, not joint-controllers.**

### Consequences

- DPAs are unilateral (Aplomb → each subprocessor); no joint-controller agreements per Art 26 needed
- Aplomb decides solo on means (storage, AI, retention) and purposes (sizing reco)
- Brands consume the output but have no say in the processing operations

### What must stay true in practice

The "sole controller" qualification is **factually contingent**. It remains valid as long as:

- Brands have no admin access to retention settings
- Brands cannot trigger AI processing on their behalf
- Brands cannot see other brands' shoppers' raw data
- Brands receive only aggregate / their-own data via the pro console

**Trigger for re-classification**: if any of the above changes — for example, if brands start configuring retention or training their own models on shopper data — re-qualify as joint-controller and draft an Art 26 agreement per brand.

**Documented at**: `/privacy` §1.

---

## 4. 👶 Minimum age

**Decision: 15+ (French LIL art. 7-1 minimum)**

### Implementation (3 entry points)

| Surface | Mechanism | File |
|---|---|---|
| Signup | 3rd checkbox: "I confirm I am 15 years old or older" — separate from Terms and Privacy boxes | `src/app/(auth)/signup/SignupForm.tsx` |
| Anonymous widget | 2nd checkbox on ConsentStep alongside body-scan consent | `src/components/client/BrandScanWizard/steps/ConsentStep.tsx` |
| Legal text | CGU §3 explicit: "at least 15 years old" + parental-consent clause for under-15s | `src/app/(public)/cgu/page.tsx` |

### Residual risk accepted

Self-attestation is the industry-standard practice. True verification would require ID upload, which is *more* intrusive than the risk we're guarding against. Accepted.

---

## 5. 📞 fal.ai DPA status

**Decision: Never requested — must be obtained before live paying users.**

### What's prepared

Email template ready to send: `docs/templates/fal-dpa-email.md`. Targets: `hello@fal.ai` and/or `support@fal.ai`.

The request covers:
- Signed DPA under Art 28 GDPR
- EU SCCs (Commission Implementing Decision 2021/914, modules 1+2)
- Written data-retention policy for inputs and outputs
- Explicit confirmation that user data is NOT used for model training

### Fallback if fal.ai refuses

This is the only **launch-blocking external dependency**. If fal.ai doesn't respond within 10 business days or refuses to sign:

- Pivot to **replicate.com** (published DPA + DPF certified)
- Or to **runwayml.com** (published DPA)
- Both can replace the try-on step with reasonable engineering effort (similar input shapes, both serve from `https://*` signed URLs)

---

## 6. 🖼️ Brand-uploaded photos

**Decision: Never. Only shoppers upload their own photos.**

### Simplifications gained

- No Art 14 (indirect-collection notice) obligation
- No need to inform photographed models
- No brand→Aplomb DPA needed
- CGU §4 acceptable-use explicitly forbids "uploading photos of anyone other than yourself"

### Re-review trigger

If product strategy ever shifts to brand-uploaded model photos (e.g., for catalogue try-on demos), the audit must be re-run. Specific impact areas:

- New Art 14 notice section in `/privacy`
- New brand→Aplomb processor agreement (Aplomb becomes processor for those photos)
- Brand's responsibility to inform models pre-upload

---

## 7. 📊 Year-1 volume estimate

**Decision: 1 000 – 10 000 users (early traction)**

### Regulatory consequences

| Item | Status at this volume |
|---|---|
| DPO mandatory under Art 37 §1.b? | **No** — below the "regular and systematic monitoring on a large scale" threshold. Recommended but not required. |
| Registre des activités de traitement (Art 30)? | **Yes** — required regardless of size when processing Art 9 data. CNIL template. |
| CNIL prior consultation (Art 36)? | **No** — needed only when DPIA shows unmitigated high risk. |
| Privacy contact | Founder acts as privacy contact until threshold crossed |
| Breach notification window | 72h (Art 33) — applies at any volume |

### Trigger for revisiting

When Aplomb crosses **~10k DAU** (not registered users but DAILY active), designate an external DPO (~5-15k€/year for a part-time external DPO).

---

## 8. 📧 Marketing communications

**Decision: Yes, planned (separate opt-in checkbox at signup OR post-signup, never bundled).**

### Currently prepared

- `/privacy` §10 documents the opt-in-only policy
- CGU §1 mentions separately-tickable boxes pattern
- No marketing SDK in `package.json` yet (no SendGrid, Resend, Mailchimp, etc.)

### To implement BEFORE sending the first marketing email

1. **4th signup checkbox**: "I want to receive marketing emails (optional)" — **unchecked by default**
2. **Double opt-in**: confirmation email; only confirmed users actually get marketing
3. **One-click unsubscribe**: every marketing email must include it (mandatory per ePrivacy)
4. **Account-level toggle**: `/app/account` link to update the preference
5. **DB column**: `User.acceptedMarketing` (boolean, default false) via Prisma migration
6. **Optional but recommended**: `LegalAcceptance` row with `documentType=marketing` on each opt-in for audit trail

### Provider TBD

Resend, Mailchimp, Brevo (ex-Sendinblue, French + RGPD-friendly), etc. Whatever you pick will become an 8th subprocessor → add to `docs/SUBPROCESSORS.md` + `/privacy` §4 + bump `LEGAL_DOCS.privacy.version`.

---

# 🎯 One-page summary

```
ENTITY:         Aplomb SAS (France) — SIREN + address pending
CONTROLLER:     Aplomb sole controller (no joint-controllership with brands)
HOSTING:        Supabase Ireland eu-west-1 (data at rest in EU)
MIN AGE:        15 years old (LIL art. 7-1)
SUBPROCESSORS:  Supabase, Vercel, Stripe, Cloudflare, Google Gemini, fal.ai, Upstash
BRAND UPLOADS:  None ever — only shoppers themselves
YEAR-1 VOLUME:  1k-10k → DPO not mandatory, Art 30 register required
MARKETING:      Separate opt-in checkbox prepared (not yet sent)
fal.ai DPA:     To be requested before paid launch
PHOTO RETENTION:
  - Side photo: deleted immediately post-measurement ✅ (in code)
  - Front photo: 30 days max post-tryon (cron implementation pending)
ANONYMOUS DATA: 13-month auto-purge (cron implementation pending)
LEGAL CONTACTS: privacy@aplomb-app.com, legal@aplomb-app.com (to configure)
```

---

# 📌 When-someone-asks reference

When CNIL / a brand / a future contributor asks **"how does Aplomb handle compliance?"**, point them at:

| Question | File |
|---|---|
| Public privacy policy? | `/privacy` |
| Public terms of service? | `/cgu` |
| Was an audit conducted? | `docs/GDPR_AUDIT.md` |
| Has a DPIA been done? | `docs/DPIA.md` |
| What are the retention durations? | `docs/RETENTION.md` |
| Who are the subprocessors? | `docs/SUBPROCESSORS.md` |
| What's the breach-response procedure? | `docs/INCIDENT_RESPONSE.md` |
| What are the security technical measures? | `SECURITY.md` |
| What decisions drove all the above? | **This file** |
| fal.ai DPA request template? | `docs/templates/fal-dpa-email.md` |

Every change to any of these files is versioned in git history — that **is** the legally-defensible audit trail.

---

# 🛠️ Decisions still open / to make

| # | Decision | Trigger | Default if forgotten |
|---|---|---|---|
| 1 | Exact registered SAS name | When SIREN issued | `Aplomb SAS` (currently) |
| 2 | Privacy contact email + legal email — which provider hosts the mailbox? | Before launch | Use a generic IMAP host like ProtonMail or set up Workspace/Gmail |
| 3 | Marketing provider | Before first marketing email | Brevo (French, RGPD-friendly) or Resend (developer-friendly) |
| 4 | DPO designation | When DAU crosses ~10k | Founder acts as privacy contact in interim |
| 5 | Retention cron schedule | Pre-launch | Weekly via Vercel cron |
| 6 | Avatar-fallback for try-on | If fal.ai DPA negotiation fails OR before 100k users | Real photo with explicit Art 9 §2.a consent (current) |
| 7 | Bug-bounty / security disclosure program | When at >10k users | GitHub Security Advisory (current) |

---

# 🔄 Maintenance

This document **is** part of compliance documentation. When any decision above changes:

1. Edit this file in a PR.
2. Update the dependent files (CGU, Privacy, DPIA, SUBPROCESSORS, etc.) to match.
3. Commit with a clear message: `compliance: changed X from Y to Z because <reason>`.
4. If the change is material to data subjects (new processing, new subprocessor, new retention), bump `LEGAL_DOCS.privacy.version` in `src/lib/legal/legalVersions.ts` so users are re-prompted to accept on next session.
