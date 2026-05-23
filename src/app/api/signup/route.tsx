import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { ok, err } from "@/lib/api";

const signupSchema = z.object({
  name: z.string().min(1).max(100),
  // brandName is optional — when absent, we create a client account (no Brand record)
  brandName: z.string().min(1).max(100).optional(),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return err("INVALID_JSON", "Invalid request body");

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const { name, brandName, email, password } = parsed.data;

  // 1. Create the user in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },           // stored in user_metadata
      emailRedirectTo: undefined, // skip confirmation redirect
    },
  });

  if (authError) {
    const alreadyExists =
      authError.message.toLowerCase().includes("already") ||
      authError.message.toLowerCase().includes("registered");
    return err(
      alreadyExists ? "EMAIL_IN_USE" : "AUTH_ERROR",
      alreadyExists
        ? "An account with this email already exists"
        : authError.message,
      alreadyExists ? 409 : 400
    );
  }

  if (!authData.user) {
    return err("AUTH_ERROR", "Failed to create user account", 500);
  }

  const supabaseUserId = authData.user.id;

  // 2. Mirror the user into Prisma. If brandName provided, also create Brand+BrandUser.
  try {
    const result = await db.$transaction(async (tx) => {
      // Upsert so replayed requests are idempotent
      const user = await tx.user.upsert({
        where: { id: supabaseUserId },
        create: { id: supabaseUserId, name, email },
        update: { name, email },
      });

      if (brandName) {
        const baseSlug = slugify(brandName);
        let slug = baseSlug;
        let i = 1;
        while (await tx.brand.findUnique({ where: { slug } })) {
          slug = `${baseSlug}-${i++}`;
        }
        const brand = await tx.brand.create({
          data: { name: brandName, slug },
        });
        await tx.brandUser.create({
          data: { userId: user.id, brandId: brand.id, role: "owner" },
        });
        return { user: { id: user.id, email: user.email, name: user.name }, brand };
      }

      // Client signup — no Brand created
      return { user: { id: user.id, email: user.email, name: user.name }, brand: null };
    });

    return ok(result, 201);
  } catch (dbError) {
    // Roll back the Supabase Auth user if the DB transaction failed
    await supabase.auth.admin?.deleteUser(supabaseUserId).catch(() => null);

    console.error("[signup] DB transaction failed:", dbError);
    return err("DB_ERROR", "Account creation failed. Please try again.", 500);
  }
}
