/**
 * app/api/auth/request-password-reset/route.ts
 *
 * Password reset request — rate-limited, email-enumeration-safe.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emailSchema } from "@/lib/validation";
import { authLimiter, getIp, rateLimitResponse } from "@/lib/rate-limit";
import crypto from "crypto";

const RESET_TOKEN_TTL_MINUTES = 30;

export async function POST(req: Request) {
  const ip = getIp(req);
  const rl = authLimiter.check(`pwd-reset:${ip}`);
  if (!rl.success) return rateLimitResponse(rl.resetAt);

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ ok: true }); // enumeration-safe: always ok
  }

  const parsed = emailSchema.safeParse((body as any)?.email);
  if (!parsed.success) return NextResponse.json({ ok: true });

  const email = parsed.data;

  try {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      const _expires = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);
      // TODO: store token + expires in DB and send email
      // See SECURITY-README.md for implementation details
      console.info("[pwd-reset] token generated for user", user.id, "token", token);
    }
  } catch (e) {
    console.error("[request-password-reset]", e);
  }

  return NextResponse.json({ ok: true });
}
