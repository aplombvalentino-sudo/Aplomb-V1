# Subprocessors — Aplomb

*Last reviewed: 2026-05-31. Annual review + notification when changes occur.*

Per GDPR Art 28 §3, every processor that handles user personal data must be governed by a written contract. This file lists the current subprocessors, their role, where they're located, and what transfer mechanism we rely on for any non-EU transfers (Chapter V).

## Current list

| # | Subprocessor | Role | Region (data at rest) | Entity HQ | Transfer mechanism | DPA |
|---|---|---|---|---|---|---|
| 1 | Supabase | Authentication, primary database, private object storage | **Ireland (eu-west-1)** | Supabase Inc. (US) | SCCs for any US admin access | https://supabase.com/legal/dpa |
| 2 | Vercel | App hosting, edge CDN | EU regions enabled; global edge | Vercel Inc. (US) | EU-US DPF | https://vercel.com/legal/dpa |
| 3 | Stripe | Subscription billing | Ireland | Stripe Payments Europe Ltd. (Ireland) | Intra-EU (no Chapter V) | https://stripe.com/legal/dpa |
| 4 | Cloudflare | Turnstile bot protection, DDoS | Global edge | Cloudflare Inc. (US) | EU-US DPF | https://www.cloudflare.com/cloudflare-customer-dpa/ |
| 5 | Google Cloud (Gemini API) | Generative AI for outfit recommendations | US | Google LLC (US) | EU-US DPF | https://cloud.google.com/terms/data-processing-addendum |
| 6 | fal.ai | Virtual try-on rendering | US | fal AI Inc. (US) | SCCs (request DPA from fal directly) | https://fal.ai/terms |
| 7 | Upstash | Redis rate-limit + abuse-prevention store | EU region | Upstash Inc. (US) | SCCs + EU region enabled | https://upstash.com/trust |

## What each one sees

Listed by data category — so when a regulator asks "what does Gemini receive?", the answer is one row:

| Data category | Sees it |
|---|---|
| Email + name | Supabase, Vercel (auth pages), Stripe (customer.email only) |
| Hashed password | Supabase only (Auth) |
| Body photos | Supabase (storage) + fal.ai (signed URL only, 30-min TTL) |
| Body measurements (JSON) | Supabase (DB) + Google Gemini (for outfit prompt) |
| Brand catalogue (products + names) | Supabase + Google Gemini (for outfit prompt) |
| Try-on output image | Supabase (cached `TryOnResult.imageUrl`) |
| IP address | Cloudflare (Turnstile), Upstash (rate-limit key), Vercel logs, our DB (LegalAcceptance audit) |
| Stripe payment cards | Stripe ONLY — we never touch them |
| Session cookies | Vercel (transport), Supabase (NextAuth Account/Session tables) |

## DPA status (action items)

For each subprocessor, you must accept the published DPA in the provider's console — most are click-accept. Keep a PDF copy in your private `dpas/` folder.

- [ ] Supabase — accept in Project Settings → Legal → DPA
- [ ] Vercel — accept in Settings → Billing → DPA
- [ ] Stripe — auto-applies to EU merchants when account is set to EU
- [ ] Cloudflare — accept in Account → Compliance → DPA
- [ ] Google Cloud — Console → IAM & Admin → Compliance → DPA
- [ ] **fal.ai — email hello@fal.ai or support@fal.ai requesting DPA + no-retention confirmation** (TODO — see `docs/templates/fal-dpa-email.md`)
- [ ] Upstash — Console → Account → Compliance

## Change notification

We give users 30 days' notice before adding any new subprocessor. The mechanism: update this file in the repo + bump `LEGAL_DOCS.privacy.version` so the next session forces re-acceptance.

If a current subprocessor materially changes role (new region, new sub-subprocessor) we treat it the same as a new addition.

## Sub-subprocessors

We don't track sub-subprocessors directly because each subprocessor's DPA commits them to manage their own. We rely on:

- Supabase's published sub-subprocessor list at https://supabase.com/legal/subprocessors
- Vercel's at https://vercel.com/legal/subprocessors
- (etc. — each provider publishes their own)

If you ever get a CNIL inquiry, point them at the public sub-subprocessor pages of the relevant provider; we don't replicate them here to avoid stale data.

## History

| Date | Change |
|---|---|
| 2026-05-31 | Initial list — Supabase + Vercel + Stripe + Cloudflare + Google Gemini + fal.ai + Upstash |
