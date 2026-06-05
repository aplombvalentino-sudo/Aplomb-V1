import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { ok, err, unauthorized } from "@/lib/api";
import { parseJsonBody, zCuid } from "@/lib/validate";
import { LIMITS, enforceLimits, tooManyRequests } from "@/lib/rateLimit-upstash";
import {
  listWardrobeOutfits,
  createWardrobeOutfit,
} from "@/lib/wardrobe/outfits";

/**
 * Wardrobe-driven outfits — the user-owned counterpart to the existing
 * brand-driven /api/outfits (which still serves the fitting-room flow).
 *
 *   GET  /api/outfits/wardrobe   →  list the signed-in user's saved outfits
 *   POST /api/outfits/wardrobe   →  create a new outfit from wardrobe items
 */

const createSchema = z
  .object({
    title: z.string().min(1).max(120),
    occasion: z.string().max(120).optional(),
    items: z
      .array(
        z
          .object({
            wardrobeItemId: zCuid,
            position: z.string().min(1).max(40),
          })
          .strict(),
      )
      .min(1)
      .max(8),
  })
  .strict();

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const outfits = await listWardrobeOutfits(session.user.id);
  // Serialise Date → ISO so the boundary stays clean.
  return ok({
    outfits: outfits.map((o) => ({ ...o, createdAt: o.createdAt.toISOString() })),
  });
}

// ─── POST ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const guard = await enforceLimits(`u:${session.user.id}:outfits-create`, [
    LIMITS.brand_writes,
  ]);
  if (!guard.allowed) return tooManyRequests(guard.retryAfterSeconds);

  const parsed = await parseJsonBody(req, createSchema);
  if (!parsed.ok) return parsed.response;

  const result = await createWardrobeOutfit(session.user.id, parsed.data);

  if (result.ok) {
    return ok({ id: result.id }, 201);
  }
  if (result.reason === "no_items") {
    return err("NO_ITEMS", "An outfit must include at least one item.", 400);
  }
  // items_not_owned
  return err(
    "ITEMS_NOT_OWNED",
    `These items are not in your wardrobe: ${result.missingIds?.join(", ") ?? ""}`,
    403,
  );
}
