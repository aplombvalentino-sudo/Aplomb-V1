# Marketing claims & sources

This file tracks every quantitative or comparative claim made in the product's
public-facing copy. The goal is FTC compliance: in the US, performance claims
("reduce returns by 38%") must be substantiated by real, representative data —
or they must not be stated as fact.

**Current status: pre-launch, no production data.** Therefore all hard
numeric performance claims have been removed from the UI and replaced with
directional language ("built to reduce returns," "fewer returns," "higher
conversion"). Re-introduce specific figures ONLY when backed by the data
referenced in the table below.

---

## Claims currently in the UI

| Claim | Location | Type | Status |
|---|---|---|---|
| "built to reduce returns and increase conversion" | `layout.tsx` metadata, hero, CTA | Directional (no number) | ✅ Safe — aspirational, not a result |
| "Live in under 10 minutes" / "10 min to go live" | `FeaturesSection`, `CtaSection`, auth panel | Setup-time estimate | ⚠️ Verify the real median onboarding time before keeping. Soften to "minutes, not weeks" if unmeasured. |
| "60 sec to get your size" | auth shopper panel | Product-speed estimate | ⚠️ Verify against real scan→result latency. Currently aspirational. |
| "0 tape measures" | auth shopper panel | Feature description | ✅ Safe — literally true (photo-based) |
| "98% match" / "94% body scan" | hero widget mockup | Illustrative mockup numbers | ✅ Safe — clearly a UI mockup, marked `aria-hidden`; not presented as an aggregate result |
| Testimonials (Léa Marchand, Tom Hirsch, etc.) | auth panels | Customer quotes | 🔴 **Fabricated.** These are placeholder names/quotes. Replace with real, attributable testimonials before US launch, or remove. Fake testimonials are an FTC violation. |

## Claims REMOVED (do not re-add without data)

| Removed claim | Was in | Why removed |
|---|---|---|
| "Reduce returns by 38% on average" | `layout.tsx` metadata | Unsubstantiated aggregate performance claim |
| "−38% return rate" | hero, CTA, auth panel, pro billing | Same — no data backs the 38% figure |
| "+22% conversion" | CTA, auth panel | Unsubstantiated |
| "conversion went up 19%" | auth testimonial | Unsubstantiated + fabricated attribution |
| "Trusted by 147 fashion brands worldwide" | hero | False count — there are not 147 brands |
| "147 brands already live" | CTA | Same false count |
| "92% perfect fit" | auth shopper panel | Unsubstantiated accuracy claim |

---

## Rules for re-introducing a number

Before putting any specific figure back into the UI:

1. **Have the data.** A real, documented measurement from real customers or a
   controlled study — not a vendor benchmark, not an industry average presented
   as ours.
2. **Make it representative.** "38% for our top brand" cannot be stated as
   "38% on average."
3. **Date it / qualify it.** "Pilot brands saw returns fall 20–35% (n=4,
   Q1 2026)" is defensible. "−38%" as a hero stat is not.
4. **Add the source here** in this table with a link to the underlying data.
5. **Real testimonials only.** Named, consented, attributable. Keep the
   consent record.

## FTC reference

- FTC Endorsement Guides: https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking
- "Truth in Advertising" basics: https://www.ftc.gov/business-guidance/advertising-marketing
