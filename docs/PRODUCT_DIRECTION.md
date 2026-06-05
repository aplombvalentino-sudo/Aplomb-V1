# Product Direction — Aplomb (Digital Wardrobe)

*Locked: 2026-06-05. Owner: founder. Read this before touching any shopper-facing copy, navigation, pricing, or feature surface.*

---

## The shift

Aplomb is no longer sold as an "AI fitting room / size-recommendation tool".

**It is now sold as a personal digital wardrobe** that lets a shopper add
the clothes they already own, mix them with certified brand items, build
outfits and test new combinations on themselves without changing. Sizing
remains in the product — but as a **secondary** support layer.

The product is style-flexible and works for many fashion use cases — not
anchored to a single style culture or subculture. Categories, copy and
examples should feel natural for someone who dresses minimal, classic,
romantic, contemporary, smart-casual, or anything in between.

### The new product hierarchy

1. Build your digital wardrobe
2. Try outfits on yourself without changing
3. Add the clothes you already own
4. Mix your wardrobe with certified brand items
5. Use sizing / fit support only as a secondary layer

### The new primary message

> Build your digital wardrobe and try new outfits on yourself.
>
> Add the clothes you already own, mix them with certified brand pieces,
> and explore new combinations without changing.

### What we no longer lead with

- "Find your perfect size"
- "Get measured first"
- "Body scan first"
- "AI sizing first"

These are still capabilities in the product. They are no longer the
positioning.

---

## Decision rules

When any UX / copy / feature decision is ambiguous, the answer is whichever
of these is higher on the list:

1. Wardrobe-first positioning
2. Outfit experimentation clarity
3. Personal clothing upload simplicity
4. Pricing clarity around wardrobe capacity
5. Implementation realism
6. Sizing as secondary value

If a sizing-first pattern conflicts with the new direction, choose the new
direction — don't compromise. Sizing always appears *after* wardrobe value
has been understood.

Equally: do NOT bias the product toward one style culture (streetwear,
luxury, athleisure, etc.). The wardrobe layer must remain style-neutral.

---

## Concrete consequences in the codebase

### Plans (`src/lib/planLimits.ts`)

`ClientPlanLimits` was refactored to lead with two wardrobe-first fields:

```
maxWardrobeItems      total slots (certified + user_photo)
maxPersonalPhotos     subset cap on user-uploaded photo items
outfitExperimentation 'basic' | 'full'
```

The sizing fields (`maxScansPerMonth`, `maxTryOnsPerMonth`) remain but are
now secondary. The legacy `maxWardrobeSaves` field is kept as a deprecated
mirror of `maxWardrobeItems` so old call sites keep building during the
transition. New code MUST read the new fields.

### Per-plan caps

| Plan | Wardrobe | Personal photos | Outfit | Scans/mo | Try-ons/mo |
|---|---:|---:|---|---:|---:|
| Essential (free) | 10 | 3 | basic | 5 | 3 |
| Fashion (€25.99) | 40 | 15 | full | 15 | 25 |
| Model (€29.99) | ∞ | ∞ | full | ∞ | ∞ |

Prices are unchanged from the previous tier table — only the framing changes.

### Database

New `WardrobeItem` model (Prisma + migration `20260605120000_add_wardrobe_items`):

- Two sources: `certified` (linked to brand catalog `Product`) and
  `user_photo` (uploaded from the shopper's own camera roll).
- `processingStatus` walks `pending_upload → processing → needs_review →
  ready | failed` for user_photo items; certified items skip straight to
  `ready`.
- Photos live in a new private Supabase bucket: `wardrobe-items` (separate
  from `body-scans`; same posture: private, signed URLs, never returned
  to clients).

### APIs

- `GET /api/wardrobe/items` — list + quota for the signed-in user.
- `POST /api/wardrobe/items` — add a certified item from a catalog `productId`.
- `POST /api/wardrobe/items/upload` — multipart: add a user_photo item (front + back + metadata).
- `DELETE /api/wardrobe/items/[id]` — remove an item; for user_photo items the bucket objects are deleted BEFORE the DB row (matches GDPR erasure pattern in `eraseUser`).

All return `409` with explicit error codes (`WARDROBE_FULL`, `PERSONAL_FULL`)
when quota is exhausted, so the UI can render UpgradePrompt cleanly.

### `eraseUser`

Now also walks user_photo wardrobe items and deletes their bucket objects
before deleting the User row. Art 17 posture extended to the new surface.

### Pricing presentation (`src/components/public/PricingCards/plans.ts`)

Each shopper plan card now leads with **wardrobe slots + personal photo
count + outfit experimentation**, with fit insights as a single subordinate
line. The invariant tests still pass: paid slugs (`fashion`, `model`) live
in `lib/stripe.ts PLAN_CATALOG`; the `essential` slug is intentionally
outside Stripe (free); one highlighted plan per audience.

### Hero (`src/components/public/HeroSection.tsx`)

- Eyebrow: "Digital Wardrobe"
- H1: "Build your digital *wardrobe* and try new outfits on yourself."
- Sub: the prompt's microcopy verbatim.
- Primary CTA: "Start my wardrobe" → `/signup?audience=client`.
- Mock asset (right side): wardrobe grid with mixed certified + "Mine" tiles
  + a "Today's outfit" composer strip. The body-scan / measurements mock is
  gone.

---

## Shipped surfaces (completed work)

- [x] **Wardrobe page**: `/app/wardrobe` is a server-rendered grid of
      `WardrobeItem`s with quota counter, empty state, "Add a clothing
      item I already own" + "Add a certified brand item" CTAs, and
      per-card delete.
- [x] **Brand discovery moved**: `/app` redirects to `/app/wardrobe`; the
      brand grid moved to `/app/discover`.
- [x] **Capture flow**: 5-step state machine at `/app/wardrobe/add` (intro
      → front → back → review → confirm details). File picker with
      camera="environment" for mobile, 8 MB cap, MIME allow-list. Posts to
      `/api/wardrobe/items/upload`. Photo guidance copy at each step.
- [x] **Onboarding redirect**: `buildDestination()` sends Essential
      shoppers to `/app/wardrobe` directly.
- [x] **Navigation**: top nav across `/app/wardrobe` + `/app/discover` is
      `Wardrobe | Outfits | Discover | Profile`. Sizing not in the
      front-stage nav.
- [x] **Outfit builder**: `/app/outfits` lists saved outfits; `/app/outfits/new`
      is a 4-slot manual builder (top / bottom / shoes / accessory) that
      picks from any ready WardrobeItem. Server-stored as
      `WardrobeOutfit` + `WardrobeOutfitItem`. Ownership gate on POST
      checks every wardrobeItemId belongs to the user.
- [x] **Sizing in profile**: `/app/account` has a "Fit insights (optional)"
      section between Account stats and Update profile. Pulls the user's
      latest BodyProfile (if any) + measurements + brand-of-last-scan +
      a "Run a new scan" button that links to the brand wizard. Empty
      state when no scan: "No body scan yet — optional, start one through
      any brand in Discover."
- [x] **`/widget` light wardrobe-aware CTA**: brand embeddable widget keeps
      its sizing-first flow per spec (it's the brand's surface, not the
      shopper's). Header gains a quiet "Start your own wardrobe →" link.
- [x] **Internal nav cleanup**: wizard back-link reads "← My wardrobe"
      pointing at `/app/wardrobe`. "Browse more brands" on the outfits
      step now routes to `/app/discover`.

---

## Microcopy reference

Source of truth for any net-new copy in this product direction. Reuse
verbatim where it fits.

| Surface | Copy |
|---|---|
| Hero | Build your digital wardrobe and try new outfits on yourself. |
| Subhero | Add the clothes you already own, mix them with certified brand pieces, and explore new combinations without changing. |
| Primary CTA | Start my wardrobe. |
| Secondary CTA | Add a clothing item I already own. |
| Wardrobe empty state | Your digital wardrobe is empty. Add a piece you own or save a certified item to start building outfits. |
| Personal upload CTA | Add a clothing item I already own. |
| Upload helper | Photograph a clothing item you already own to reuse it in future outfits. |
| Photo step helper | Front photo first. Lay the item flat and capture the full shape. |
| Essential limit message | Your Essential plan includes 10 wardrobe slots, with up to 3 of your own clothing items. |
| Outfit-builder helper | Build an outfit from the clothing items you already own. |
| Sizing copy | Optional fit insights are available in your profile. |

## Taxonomy

The wardrobe-item `category` field is a free string in the DB. The
CaptureFlow picker offers a broad, style-neutral list:

`top · bottom · dress · outerwear · shoes · bag · accessory · other`

The OutfitBuilder uses 4 slots in a standard outfit order:

1. **Top** — accepts `top`, plus legacy granular values (`tee`, `hoodie`,
   `dress`, `outerwear`, `jacket`, `other`).
2. **Bottom** — accepts `bottom`, plus legacy granular values (`pants`,
   `denim`, `cargos`, `shorts`, `dress`, `other`).
3. **Shoes** — accepts `shoes`, plus legacy `sneakers`.
4. **Accessory** — accepts `accessory`, plus legacy `bag`, `cap`, `other`.

The legacy values are kept in SLOT_RULES so wardrobe items captured during
an earlier (more granular) iteration still slot correctly without a data
migration. Adding a new category is a one-line addition to
`CATEGORY_OPTIONS` in `CaptureFlow.tsx` + a corresponding slot mapping in
`OutfitBuilder.tsx`.

The taxonomy intentionally avoids style-segment vocabulary (sneakers,
hoodies, cargos, etc. as primary categories). The app should feel
appropriate for many style cultures — minimal, classic, contemporary,
romantic, smart-casual — not biased toward one.

---

## Why this file exists

Future-you (and any future contributor) will look at the Aplomb codebase
six months from now and see a half-finished migration. This file records
WHY we made the change, WHAT was already shipped, and WHAT remains — so
nobody is tempted to revert sizing-first patterns "because they're
prettier" or to invent a third positioning. The repositioning is locked.
