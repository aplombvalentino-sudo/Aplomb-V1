import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  console.log("Seeding database…");

  // Demo user — id must be provided (Supabase Auth UUID format)
  const demoUserId = "00000000-0000-0000-0000-000000000001";
  const user = await db.user.upsert({
    where: { email: "demo@aplomb.ai" },
    update: {},
    create: {
      id: demoUserId,
      name: "Demo User",
      email: "demo@aplomb.ai",
    },
  });

  // Demo brand
  const brand = await db.brand.upsert({
    where: { slug: "demo-brand" },
    update: {},
    create: {
      name: "Demo Brand",
      slug: "demo-brand",
      primaryColor: "#1a1a1a",
      plan: "pro",
    },
  });

  // Owner membership
  await db.brandUser.upsert({
    where: { userId_brandId: { userId: user.id, brandId: brand.id } },
    update: {},
    create: {
      userId: user.id,
      brandId: brand.id,
      role: "owner",
    },
  });

  // Demo products
  const products = [
    {
      name: "Classic White Oxford Shirt",
      category: "shirt",
      subcategory: "formal",
      imageUrl: "https://images.unsplash.com/photo-1602810316498-ab67cf68c8e1?w=400",
      variants: [
        { sizeLabel: "S", sku: "OXF-WHT-S", color: "white", price: 79.99 },
        { sizeLabel: "M", sku: "OXF-WHT-M", color: "white", price: 79.99 },
        { sizeLabel: "L", sku: "OXF-WHT-L", color: "white", price: 79.99 },
        { sizeLabel: "XL", sku: "OXF-WHT-XL", color: "white", price: 79.99 },
      ],
    },
    {
      name: "Slim Fit Chinos",
      category: "pants",
      subcategory: "casual",
      imageUrl: "https://images.unsplash.com/photo-1584370848010-d7fe6bc767ec?w=400",
      variants: [
        { sizeLabel: "30x30", sku: "CHN-NVY-3030", color: "navy", price: 89.99 },
        { sizeLabel: "32x30", sku: "CHN-NVY-3230", color: "navy", price: 89.99 },
        { sizeLabel: "34x32", sku: "CHN-NVY-3432", color: "navy", price: 89.99 },
      ],
    },
    {
      name: "Merino Wool Crew-neck Sweater",
      category: "sweater",
      subcategory: "knitwear",
      imageUrl: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400",
      variants: [
        { sizeLabel: "S", sku: "SWT-CRM-S", color: "cream", price: 129.99 },
        { sizeLabel: "M", sku: "SWT-CRM-M", color: "cream", price: 129.99 },
        { sizeLabel: "L", sku: "SWT-CRM-L", color: "cream", price: 129.99 },
      ],
    },
    {
      name: "Leather Derby Shoes",
      category: "shoes",
      subcategory: "formal",
      imageUrl: "https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=400",
      variants: [
        { sizeLabel: "41", sku: "DRB-BRN-41", color: "brown", price: 199.99 },
        { sizeLabel: "42", sku: "DRB-BRN-42", color: "brown", price: 199.99 },
        { sizeLabel: "43", sku: "DRB-BRN-43", color: "brown", price: 199.99 },
        { sizeLabel: "44", sku: "DRB-BRN-44", color: "brown", price: 199.99 },
      ],
    },
    {
      name: "Canvas Tote Bag",
      category: "accessory",
      subcategory: "bags",
      imageUrl: "https://images.unsplash.com/photo-1597484661643-2f5fef640dd1?w=400",
      variants: [{ sizeLabel: "One size", sku: "TOT-BLK-OS", color: "black", price: 39.99 }],
    },
  ];

  for (const p of products) {
    const existing = await db.product.findFirst({
      where: { brandId: brand.id, name: p.name },
    });

    if (!existing) {
      await db.product.create({
        data: {
          brandId: brand.id,
          name: p.name,
          category: p.category,
          subcategory: p.subcategory,
          imageUrl: p.imageUrl,
          isActive: true,
          variants: {
            create: p.variants.map((v) => ({
              sizeLabel: v.sizeLabel,
              sku: v.sku,
              color: v.color,
              price: v.price,
              stockStatus: "inStock",
            })),
          },
        },
      });
      console.log(`  ✓ Created product: ${p.name}`);
    } else {
      console.log(`  - Skipped (exists): ${p.name}`);
    }
  }

  // Demo size chart
  const existingChart = await db.sizeChart.findFirst({
    where: { brandId: brand.id, category: "shirt" },
  });

  if (!existingChart) {
    await db.sizeChart.create({
      data: {
        brandId: brand.id,
        category: "shirt",
        gender: "male",
        chartJson: {
          headers: ["Size", "Chest (cm)", "Waist (cm)", "Shoulder (cm)"],
          rows: [
            { sizeLabel: "XS", measurements: { chest: 82, waist: 66, shoulder: 40 } },
            { sizeLabel: "S", measurements: { chest: 86, waist: 70, shoulder: 42 } },
            { sizeLabel: "M", measurements: { chest: 90, waist: 74, shoulder: 44 } },
            { sizeLabel: "L", measurements: { chest: 96, waist: 80, shoulder: 46 } },
            { sizeLabel: "XL", measurements: { chest: 102, waist: 86, shoulder: 48 } },
            { sizeLabel: "XXL", measurements: { chest: 108, waist: 92, shoulder: 50 } },
          ],
        },
      },
    });
    console.log("  ✓ Created size chart: shirt/male");
  }

  console.log("\nSeed complete!");
  console.log("  Email:    demo@aplomb.ai");
  console.log("  Password: password123");
  console.log("  Brand:    demo-brand");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
