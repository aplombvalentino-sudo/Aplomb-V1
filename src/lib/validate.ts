/**
 * Shared request-validation helpers.
 *
 * Goal: every API route validates its inputs with Zod and rejects anything
 * that doesn't exactly match the schema (extra keys, wrong types, length
 * violations, malformed UUIDs/cuids, etc.). Returns a consistent error
 * envelope shape on validation failure.
 */

import type { NextRequest } from "next/server";
import { z, ZodError, type ZodSchema } from "zod";
import { err } from "@/lib/api";

// ─── Shared primitive schemas ────────────────────────────────────────────────

/** Prisma cuid v1 (default for @id @default(cuid())). 25 chars, starts with "c". */
export const zCuid = z.string().min(20).max(40).regex(/^c[a-z0-9]{19,}$/, "Invalid id");

/** A brand/category/product slug — lowercase letters, digits, hyphens. */
export const zSlug = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug");

/** Hex colour (#RRGGBB). */
export const zHexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a 6-digit hex colour");

/** Short text (titles, labels). */
export const zShortText = z.string().min(1).max(120);

/** Description-style text. */
export const zLongText = z.string().max(2000);

// ─── Body parsers ────────────────────────────────────────────────────────────

/**
 * Parse + validate a JSON body. Rejects empty/invalid JSON, extra fields
 * (via .strict() at the schema level), and any field shape mismatch.
 *
 * Usage:
 *   const parsed = await parseJsonBody(req, schema);
 *   if (!parsed.ok) return parsed.response;
 *   const data = parsed.data;
 */
export async function parseJsonBody<T extends ZodSchema>(
  req: NextRequest,
  schema: T,
): Promise<
  | { ok: true; data: z.infer<T> }
  | { ok: false; response: ReturnType<typeof err> }
> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { ok: false, response: err("INVALID_JSON", "Request body must be valid JSON.") };
  }
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, response: err("INVALID_JSON", "Request body must be a JSON object.") };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, response: validationError(parsed.error) };
  }
  return { ok: true, data: parsed.data };
}

/** Same as above but for query strings (`req.nextUrl.searchParams`). */
export function parseQuery<T extends ZodSchema>(
  req: NextRequest,
  schema: T,
):
  | { ok: true; data: z.infer<T> }
  | { ok: false; response: ReturnType<typeof err> } {
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = schema.safeParse(params);
  if (!parsed.success) {
    return { ok: false, response: validationError(parsed.error) };
  }
  return { ok: true, data: parsed.data };
}

/** Validate a single path param (e.g. `params.id`). */
export function parseParam<T extends ZodSchema>(
  value: unknown,
  schema: T,
):
  | { ok: true; data: z.infer<T> }
  | { ok: false; response: ReturnType<typeof err> } {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    return { ok: false, response: validationError(parsed.error) };
  }
  return { ok: true, data: parsed.data };
}

// ─── Error formatter ────────────────────────────────────────────────────────

function validationError(zerr: ZodError) {
  const first = zerr.issues[0];
  const path = first?.path?.join(".") ?? "input";
  const message = first?.message ?? "Invalid input";
  return err("VALIDATION_ERROR", `${path}: ${message}`, 400);
}
