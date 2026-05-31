# DPIA — Aplomb (Body-Scan + AI Try-On Processing)

*Data Protection Impact Assessment per GDPR Article 35. First draft: 2026-05-31. Owner: Aplomb SAS (founder). Re-review: yearly, or on any flow change.*

CNIL's published list (deliberation n°2018-327, 11 Oct 2018) makes a DPIA **mandatory** for processing that meets two of nine indicators. Aplomb meets at least three:

1. **Innovative use of new technologies** — generative AI on user photos.
2. **Biometric-adjacent data of the public at scale** — body shapes derived from photos.
3. **Cross-border transfer of personal data to non-adequate countries** — US recipients (Gemini, fal.ai).

This document is therefore both a legal requirement and an operational risk-register.

---

## 1. Context

### 1.1 Processing description

Aplomb's core flow ("AI fitting room"):

| Step | Data handled | Provider | Output |
|------|--------------|----------|--------|
| Consent + age gate | None | Aplomb client | UI state |
| Photo upload | Front + side JPEG/PNG (≤8 MB each) | Aplomb server → Supabase private bucket (Ireland) | Object paths |
| Measurement | Signed URLs to photos | Aplomb server → stub provider (today) / 3DLook (future) | `NormalizedMeasurements` JSON |
| Side photo cleanup | Side photo only | Supabase Storage | Deleted |
| Size recommendation | Measurements + brand size charts | Aplomb server (pure algorithm, no AI) | Per-category sizes + confidence |
| Outfit generation | Brand catalogue (names, categories, tags) + measurements (no photos) | Google Gemini API (US) | Outfit JSON |
| Try-on rendering (opt-in) | Signed URL to front photo + brand product image | fal.ai (US) | Generated PNG |
| Save to wardrobe | Outfit metadata | localStorage | UI state |

### 1.2 Categories of data subjects

- **Anonymous shoppers** — using the widget embedded in a brand's site. Identified only by a session-token cookie.
- **Signed-in shoppers** — Supabase Auth account with email + name.
- **Brand operators** — signed-in users with `BrandUser` role.

### 1.3 Volume estimate (Year 1)

1k–10k registered shoppers, ≤2k brand operators. Below the "regular and systematic monitoring on a large scale" threshold for DPO mandate (Art 37 §1.b) but already large enough that a breach would affect a meaningful number of people.

### 1.4 Recipients

See `docs/SUBPROCESSORS.md` for the full named list with transfer mechanisms.

### 1.5 Retention

See `docs/RETENTION.md` for per-category durations.

### 1.6 Stakeholders

- **Controller**: Aplomb SAS
- **Subprocessors**: Supabase, Vercel, Stripe, Cloudflare, Google Cloud (Gemini), fal.ai, Upstash
- **Data subjects**: shoppers (mostly French, EU/EEA general)
- **Supervisory authority**: CNIL (Paris)

---

## 2. Necessity and proportionality

### 2.1 Lawful basis (Art 6) per data category

Documented in `/privacy` §2 table — Art 6 §1.b (contract) for service-essential data, §1.c (legal obligation) for billing-bookkeeping, §1.f (legitimate interest) for security logs + clickwrap-proof IP.

### 2.2 Special-category data (Art 9)

Body-scan photos are processed under **Art 9 §2.a explicit consent**. We obtain this consent twice:

1. **Account-level**: signup clickwrap (`acceptPrivacy` checkbox), which acknowledges the broader processing.
2. **Try-on-level**: separate, session-scoped modal *before* the first try-on render — explicitly mentions fal.ai (USA) and the front photo. User can refuse.

This second consent is the legally robust one. The first is informational.

### 2.3 Necessity test

We asked the question: *could we achieve the same outcome with less personal data?*

| Step | Alternatives considered | Chose | Why |
|------|------------------------|-------|-----|
| Measurement | Manual self-input only (no photos) | Photos + photos+inputs | Self-input alone has ~30% accuracy on hip/waist; combining photos lifts to ~80% per provider testing |
| Try-on | Avatar / silhouette only | Real front photo for v1 | Avatar-only is materially less compelling for shopper trust at the conversion moment; flagged as roadmap item if proportionality is challenged |
| Outfit gen | Send measurements only | Send measurements only (no photos to Gemini) | Photos are NOT sent to Gemini, only structured measurements + catalogue text. Implemented today |
| Recommendation algo | Use a 3rd-party AI | Pure deterministic in-house (`recommendSizes.ts`) | No AI call, no transfer, fully auditable. Already done |

Conclusion: the only step that arguably *could* be done with less personal data is try-on. We accept the residual proportionality risk for v1 and commit to add an avatar-fallback option before scaling to >10k DAU.

### 2.4 Data minimisation measures

- Side photo deleted immediately after measurement derivation (no use for downstream steps).
- Front photo deleted after 30 days from last use (scheduled sweep — TODO Phase 5 of the GDPR roadmap).
- `rawProviderResponse` from measurement provider stripped before persistence.
- Only the front photo (not measurements, not the side photo) crosses to fal.ai.
- Only structured measurement JSON + catalogue text (not photos) crosses to Gemini.

---

## 3. Risks and measures

We use CNIL's risk methodology: source × event × impact × likelihood.

### 3.1 Risk: illegitimate access to body photos

| | |
|--|--|
| **Source** | External attacker, compromised internal access, leaked service-role key |
| **Event** | Reads or downloads of `body-scans/` bucket objects |
| **Impact** | High — intimate imagery, potentially of minors despite the 15+ gate |
| **Likelihood** | Low post-mitigation |
| **Measures** | Private bucket (no anonymous reads), service-role-only access, signed URLs with 30-min TTL for AI providers, key rotation procedure documented in `SECURITY.md`, no service-role key in client bundle (verified by build inspection) |

### 3.2 Risk: side photo retained longer than necessary

| | |
|--|--|
| **Source** | Forgotten cleanup, bug in deletion path |
| **Event** | Side photos linger in bucket |
| **Impact** | Medium — additional copy of body imagery |
| **Likelihood** | Low post-mitigation |
| **Measures** | Deletion is inline in `/api/measurements`, persistence sets `sideImagePath = null` as documentation, integration test (`route.test.ts`) locks the behaviour, regression caught by CI |

### 3.3 Risk: fal.ai retains uploaded photos beyond inference

| | |
|--|--|
| **Source** | Subprocessor mishandling |
| **Event** | Photo persisted beyond the few seconds of inference |
| **Impact** | High — outside our direct control |
| **Likelihood** | Unknown until DPA signed |
| **Measures** | (1) Signed URL has 30-minute TTL — fal cannot re-fetch after expiry; (2) DPA with fal.ai must include explicit no-retention clause (**TODO — pre-launch**); (3) avatar fallback as proportionality backstop (deferred) |

### 3.4 Risk: re-identification of body shape from measurements

| | |
|--|--|
| **Source** | Aggregated leak of measurements |
| **Event** | Public dump of `BodyProfile.rawMeasurementsJson` |
| **Impact** | Low for one person, medium at scale (research bias / discrimination) |
| **Likelihood** | Very low |
| **Measures** | No public read on `BodyProfile`; RLS at DB; access only through authorised app code paths; no AI training on user data; no third-party analytics |

### 3.5 Risk: cookie-only anonymous data lingers

| | |
|--|--|
| **Source** | Architecture |
| **Event** | Anonymous shoppers' photos + measurements stay forever |
| **Impact** | Medium (Art 5 §1.e violation) |
| **Likelihood** | High without mitigation |
| **Measures** | (1) Auto-purge anonymous sessions after 13 months from last activity — **TODO scheduled cron** (Phase 5 of GDPR roadmap); (2) Notice in widget that creating an account is required to exercise rights |

### 3.6 Risk: photo of a minor under 15

| | |
|--|--|
| **Source** | False age-gate attestation |
| **Event** | Body photo of a child processed |
| **Impact** | Very high — Art 8 + criminal law for the underage subject + reputational |
| **Likelihood** | Low (gate at every entry point) |
| **Measures** | Age 15+ checkbox at both signup AND anonymous widget consent step. CGU explicitly prohibits photos of others, photos of minors. Self-attestation is the standard practice — true verification would require ID upload, which is *more* intrusive |

### 3.7 Risk: AI hallucination — outfit recommends wrong size

| | |
|--|--|
| **Source** | Gemini limits, edge-case body shape |
| **Event** | User trusts a low-confidence rec → bad purchase |
| **Impact** | Low (consumer protection) |
| **Likelihood** | Medium |
| **Measures** | Confidence labels surfaced on every recommendation (`recommendSizes.ts`); CGU §2 explicitly states "estimates, not guarantees"; Stripe billing terms separate from sizing accuracy |

### 3.8 Risk: ransomware / Supabase incident

| | |
|--|--|
| **Source** | Supabase outage / breach |
| **Event** | All user data temporarily unreachable or exfiltrated |
| **Impact** | High |
| **Likelihood** | Low (Supabase has SOC2) |
| **Measures** | Supabase regular backups (point-in-time recovery in their managed offering); breach-response runbook (`docs/INCIDENT_RESPONSE.md`); 72-hour CNIL notification process documented |

---

## 4. Decision and follow-up

### 4.1 Verdict

The processing is **lawful, necessary, and proportionate** for the service Aplomb provides, subject to the mitigations above. The main residual risks (fal.ai retention, anonymous-data lingering) are addressed by pre-launch action items.

### 4.2 Required actions before live paying users

- [ ] Sign DPA with fal.ai including explicit no-retention clause
- [ ] Implement anonymous-data 13-month auto-purge cron
- [ ] Implement front-photo 30-day auto-purge cron
- [ ] Publish this DPIA on a public TIA page (or keep internal — CNIL doesn't require publication, only that it exists)

### 4.3 Trigger for re-review

- New AI subprocessor added
- New category of data processed (e.g. video, voice)
- Significant volume change (10×)
- New jurisdiction (e.g. UK post-Brexit, US shoppers)
- Material change to a current subprocessor's role
- Any CNIL inquiry or sectoral guidance update on AI + biometrics

### 4.4 Living document

This DPIA is committed to the repo at `docs/DPIA.md`. Edit in PRs; track changes in git history; review yearly on the anniversary date.

---

## Appendix A — CNIL PIA Tool

Once the SAS is formally registered, port this document into the [CNIL PIA Tool](https://www.cnil.fr/fr/outil-pia-telechargez-et-installez-le-logiciel-de-la-cnil) for the structured, exportable PDF format CNIL inspectors expect. The free desktop tool produces a single PIA PDF that is the deliverable format if CNIL ever asks.

## Appendix B — References

- GDPR Art 35: https://gdpr-info.eu/art-35-gdpr/
- CNIL DPIA list (n°2018-327): https://www.cnil.fr/sites/default/files/atoms/files/liste-traitements-aipd-requise.pdf
- EDPB Guidelines 4/2019 on Article 25 Data Protection by Design and by Default
- CNIL "Outil PIA" (free open-source DPIA software)
