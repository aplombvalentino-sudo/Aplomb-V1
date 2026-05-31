# Email template — fal.ai DPA request

*Send to: hello@fal.ai or support@fal.ai (CC: business@fal.ai if known). Track the response.*

---

**Subject:** GDPR DPA request + data-retention policy for Aplomb integration

Hi fal.ai team,

I'm the founder of Aplomb (https://aplomb-v1.vercel.app), a French SAS-registered SaaS that uses your virtual try-on API in production. We integrate fal.ai by sending short-lived signed URLs to user front photos along with a brand product image, and receive back the rendered try-on.

We're a controller under GDPR processing EU user data, so we need to formalize our subprocessor relationship before scaling beyond pilot users. Could you please send us:

**1. A signed Data Processing Addendum (DPA)** under EU GDPR Article 28, with EU Standard Contractual Clauses (Commission Implementing Decision 2021/914 — "modules" 1 + 2) attached. Since fal.ai isn't currently listed under the EU-US Data Privacy Framework, SCCs are the mechanism we need to document for our Chapter V transfers.

**2. Written confirmation of your data-retention policy for inference inputs**, specifically:

- How long do you retain the `model_image` URL fetch result?
- How long do you retain the generated try-on output?
- Is either used for model training? (We assume not, but need it on paper.)
- Are inputs/outputs deleted after the inference window, or do you keep a cache?

If you have a published Trust & Privacy page or compliance documentation, that's also welcome — but ideally a signed DPA so we can complete our subprocessor list at https://aplomb-v1.vercel.app/privacy#subprocessors.

For context on volume: we're at 1k–10k registered users in year 1, with try-on inferences expected to scale roughly linearly with usage.

Happy to sign electronically (DocuSign / HelloSign / similar). If you'd prefer to discuss verbally, my calendar: [your scheduling link if any].

Thank you,

[Your name]
Founder, Aplomb SAS
[email]
[phone if you want to include]

---

## What to do with the response

When you get the response (estimate: 5-15 days):

1. **Save the DPA PDF** to a private folder outside this repo (e.g., `~/aplomb-dpas/fal-ai-dpa-YYYY-MM-DD.pdf`).
2. **Note the response date** in `docs/SUBPROCESSORS.md` next to the fal.ai entry.
3. If they confirm **no retention beyond inference**: update `docs/DPIA.md` §3.3 ("Risk: fal.ai retains uploaded photos") to mark the mitigation as fully in place.
4. If they confirm **DPF certification** at the time of response: update transfer mechanism in `/privacy` §4 table from "SCCs" to "EU-US DPF".
5. If they DON'T respond or refuse a DPA: this is a blocker for production launch. Escalate or pivot to a different try-on provider (alternatives: replicate.com, runwayml.com — both have published DPAs).

## When to follow up

If no response in 10 business days, send a polite follow-up:

> Hi fal.ai team — quick follow-up on my DPA request from {date}. We're working through our GDPR audit and your formal acknowledgement is the last blocker before our production launch. Could you confirm receipt and a rough ETA for the signed DPA?
>
> Thanks,
> [name]
