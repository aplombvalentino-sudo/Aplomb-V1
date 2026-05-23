import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isValidClientPlan, CLIENT_PLAN_COOKIE } from "@/lib/planLimits";
import { ok, err } from "@/lib/api";

const schema = z.object({
  plan: z.enum(["essential", "fashion", "model"]),
});

/**
 * PATCH /api/user/plan
 * Sets the client plan in a secure cookie.
 * No Stripe yet — this is a free plan selector; billing will be wired later.
 */
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return err("INVALID_JSON", "Invalid request body");

  const parsed = schema.safeParse(body);
  if (!parsed.success || !isValidClientPlan(parsed.data.plan)) {
    return err("INVALID_PLAN", "Plan must be essential, fashion, or model");
  }

  const { plan } = parsed.data;

  const res = NextResponse.json({ success: true, data: { plan } });
  res.cookies.set(CLIENT_PLAN_COOKIE, plan, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}

/** GET /api/user/plan — read current plan from cookie. */
export async function GET(req: NextRequest) {
  const plan = req.cookies.get(CLIENT_PLAN_COOKIE)?.value ?? "essential";
  return ok({ plan: isValidClientPlan(plan) ? plan : "essential" });
}
