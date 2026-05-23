# Aplomb

AI-powered fitting room and outfit stylist for fashion brands. Embed into any ecommerce storefront to give shoppers accurate size recommendations and personalised outfit suggestions.

## Quick start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+

### 1. Install

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/aplomb"
NEXTAUTH_SECRET="run: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Set up the database

```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 4. Seed demo data

```bash
npx tsx prisma/seed.ts
```

This creates:
- **User**: demo@aplomb.ai / password123
- **Brand**: Demo Brand (slug: `demo-brand`)
- **Products**: 5 demo products with variants
- **Size chart**: Shirt / male

### 5. Run dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Testing the widget end-to-end

1. Sign in at [http://localhost:3000/login](http://localhost:3000/login) with `demo@aplomb.ai` / `password123`
2. Explore the dashboard: products, size charts, integration tab
3. Open the widget at: `http://localhost:3000/widget?brand=demo-brand`
4. Complete the flow → outfits appear in the Fit Sessions dashboard page

### API test (curl)

```bash
# Step 1: measurements
curl -X POST http://localhost:3000/api/measurements \
  -H "Content-Type: application/json" \
  -d '{"brandSlug":"demo-brand","mediaUrl":"https://example.com/photo.jpg","heightCm":175}'

# Step 2: outfits (use recommendationSessionId from step 1)
curl -X POST http://localhost:3000/api/outfits \
  -H "Content-Type: application/json" \
  -d '{"brandSlug":"demo-brand","recommendationSessionId":"<id>","context":{"occasion":"office"}}'
```

---

## Architecture

```
src/
  app/
    (public)/          # Marketing pages (/, /pricing)
    (auth)/            # Login / Signup
    (dashboard)/       # Merchant dashboard (auth required)
    widget/            # Embeddable widget iframe
    api/               # REST API routes
  lib/
    auth.ts            # Auth.js v5 config
    db.ts              # Prisma singleton
    measurementProvider.ts   # Stub → plug in 3DLOOK / SizeStream
    outfitGenerator.ts       # Stub → plug in Anthropic / OpenAI
    shopify.ts               # Placeholder for Shopify sync
  components/
    ui/                # Button, Input, Card, Badge
    dashboard/         # Dashboard-specific components
    public/            # Marketing site components
```

## Plugging in a real measurement provider

1. Set `MEASUREMENT_PROVIDER=3dlook` in `.env`
2. Set `MEASUREMENT_PROVIDER_API_KEY` and `MEASUREMENT_PROVIDER_BASE_URL`
3. Implement `callThreeDLook()` in `src/lib/measurementProvider.ts`

## Plugging in a real LLM stylist

1. Set `STYLIST_LLM_PROVIDER=anthropic` in `.env`
2. Set `STYLIST_LLM_API_KEY=sk-ant-...` and `STYLIST_LLM_MODEL=claude-sonnet-4-6`
3. Implement `callStylistLLM()` in `src/lib/outfitGenerator.ts`

## Deploying to Vercel

```bash
npx vercel --prod
```

Set all `.env` variables in Vercel project settings. Use a managed PostgreSQL (Neon, Supabase, Railway).

---

## License

MIT
