# Incident Response Runbook — Aplomb

*Last reviewed: 2026-05-31. Practice the runbook yearly (tabletop) so muscle memory exists when a real incident hits.*

GDPR Art 33 requires notification to the supervisory authority **within 72 hours** of becoming aware of a personal-data breach. Article 34 requires notification to affected data subjects "without undue delay" when the breach is likely to result in a high risk to their rights and freedoms.

The 72-hour clock starts when you have **reasonable certainty** a breach occurred — not when you've fully diagnosed it. Speed matters more than completeness.

---

## 1. Triage triggers — "is this a breach?"

A breach is **any** of:

- **Confidentiality breach**: unauthorised access or disclosure of personal data (e.g., misconfigured Supabase bucket made public, leaked admin credentials, employee accidentally posted a DB dump)
- **Integrity breach**: unauthorised alteration (data was changed without authorisation)
- **Availability breach**: loss of access (ransomware, accidental deletion of the production DB without backup)

Things that are NOT breaches (no notification required):

- Service outage that doesn't expose data
- Failed login attempts (even at scale — that's a routine attack pattern)
- A user spamming the rate-limiter
- One bug that affected one user — but you should still record it

When in doubt: **treat it as a breach, start the clock, and de-classify later** if it turns out to be benign. The cost of over-reporting is small; the cost of under-reporting is a CNIL fine.

---

## 2. The 72-hour clock — what to do

### T+0 (incident discovered)

1. **Stop the bleeding.** Whatever caused it — rotate keys, pull a deploy, disable an account, kill an API route — stop the leak before anything else.
2. **Write down `incidentStartedAt` in a private channel** with timestamp + initial observation.
3. **Take a snapshot** of the affected system if possible (Vercel deploy ID, Supabase DB point-in-time recovery marker, Sentry events). This is your forensic baseline.

### T+1h to T+8h — assess

Answer in writing (in the same private channel):

- **What happened?** (one sentence)
- **What data was affected?** (categories — email, photos, measurements, etc.)
- **Whose data?** (estimate: # of users, anonymous vs signed-in)
- **For how long was it exposed?** (start time → discovery time)
- **What's the worst-case impact?** (identity theft? embarrassment? none?)
- **Has the breach actually been exploited** or only made possible?

### T+8h to T+24h — decide

Three possible verdicts:

- **A. Not a personal-data breach** — file the incident report internally, no CNIL notice. Document why.
- **B. Personal-data breach, but unlikely to result in risk** — notify CNIL within 72h, no individual notice required (Art 33 only). Use the CNIL portal (link below).
- **C. Personal-data breach likely to result in high risk** — notify CNIL within 72h **AND** notify affected users without undue delay (Art 34).

The verdict is yours to make as the controller. Document the reasoning either way.

### T+24h to T+72h — notify CNIL

If you decided B or C above:

1. Go to **https://notifications.cnil.fr/notifications/index** (CNIL's online breach notification portal).
2. Use account login if you have one; otherwise the anonymous declaration path.
3. Fill the form (Aplomb SAS as controller; describe nature, categories, # of records, likely consequences, measures taken).

You can submit an initial notification with partial info and update later — better that than miss the 72h.

### T+72h+ — notify users (if verdict C)

Template (adapt to incident):

> Subject: Important — security notice about your Aplomb account
>
> Hi {name},
>
> On {date}, we discovered that {short factual description}. This may have affected the following data we hold about you: {data categories}.
>
> What we've done: {immediate measures taken}.
>
> What you should do: {if anything — e.g., change your password if Supabase Auth was the vector}.
>
> We've notified the CNIL (the French data-protection authority). You can also reach them at https://www.cnil.fr/fr/plaintes if you wish to lodge a complaint.
>
> We're sorry. If you have questions, reply to this email or contact privacy@aplomb-app.com.
>
> Aplomb

Send via Supabase Auth's transactional email (or whatever transactional provider — NOT marketing list, must reach everyone affected including unsubscribed users).

---

## 3. After the dust settles

### T+72h to T+30d — root cause + fix

- Write a public-facing **post-mortem** (in the repo at `docs/incidents/YYYY-MM-DD-<short>.md`) — even if internal-only. Capture: timeline, root cause, contributing factors, what fixed it, what's changed to prevent recurrence.
- Update this runbook with anything you learned.

### Quarterly — tabletop

Once a quarter, run a 30-minute tabletop drill:

- Pick a scenario (Supabase service role leaked, Stripe webhook signing compromised, employee accidentally pushed a DB dump to GitHub, etc.).
- Walk through the steps above out loud.
- Note where the runbook is unclear or missing info and fix it.

---

## 4. Common scenarios — quick reference

### Supabase service-role key leaked

1. Rotate immediately in Supabase Dashboard → Settings → API → Rotate
2. Update env in Vercel + redeploy
3. Audit Supabase audit logs (Dashboard → Logs → Audit) for unauthorized accesses in the time window
4. Verdict depends on what was accessed during the window: usually B (breach but no exfil evidence) → CNIL notice within 72h

### Stripe webhook signing secret compromised

1. Rotate the webhook signing secret in Stripe Dashboard
2. Update `STRIPE_WEBHOOK_SECRET` in Vercel
3. Audit Stripe webhook deliveries for any tampered events that may have run business logic
4. Usually A or B depending on whether attackers actually used it

### Public exposure of body-scan bucket

1. Set bucket to private immediately (Supabase Dashboard → Storage → body-scans → Public: OFF)
2. Audit Supabase Storage logs for object reads during the exposure window
3. Verdict almost certainly C — body photos are intimate; affected users must be notified
4. Send the individual-notice email to anyone whose `BodyProfile.frontImagePath` was created during the window

### Ransomware on Supabase DB

1. Engage Supabase support immediately (paid plans have priority)
2. Restore from point-in-time backup
3. Audit who had access; rotate any potentially-exposed credentials
4. Verdict: B at minimum if data is recovered without exfiltration; C if there's any chance of exfil

---

## 5. Logging strategy

Today our log retention is:

- **Vercel** — ~30 days at default tier
- **Supabase Audit logs** — managed plan default
- **Application errors** — `console.error` in routes; visible in Vercel dashboard for the same ~30 days

**If we suspect a breach more than 30 days after it happened**, our logging is insufficient to reconstruct details — this is a known gap, accepted for v1 (cost-driven). Mitigation: write the incident report from whatever evidence is available and be honest with CNIL about the data gap.

Action item for scale: when Aplomb crosses ~10k DAU, add a long-retention log sink (e.g., Datadog, Better Stack, or self-hosted) with 1-year retention for security-relevant events.

---

## 6. Contacts

- **CNIL portal**: https://notifications.cnil.fr/notifications/index
- **CNIL phone**: +33 1 53 73 22 22
- **Supabase support**: dashboard → ? icon → Support
- **Vercel security**: security@vercel.com
- **Stripe security**: https://stripe.com/security/disclosure
- **Cloudflare security**: https://www.cloudflare.com/en-gb/security-disclosure/
- **Google Cloud security**: https://cloud.google.com/security/
