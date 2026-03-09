/**
 * app/api/auth/disable-2fa/route.ts
 *
 * POST /api/auth/disable-2fa
 *   body: { token: string }  — current TOTP token required to confirm identity
 *
 * Disables 2FA on the account and clears the stored secret + backup codes.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyTotp, decryptTotpSecret } from "@/lib/2fa";
import { twoFaLimiter, getIp, rateLimitResponse } from "@/lib/rate-limit";
import { totpTokenSchema } from "@/lib/validation";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = twoFaLimiter.check(`disable-2fa:${session.user.email}`);
  if (!rl.success) return rateLimitResponse(rl.resetAt);

  let body: { token?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const tokenResult = totpTokenSchema.safeParse(body.token);
  if (!tokenResult.success) {
    return NextResponse.json({ error: "Token must be a 6-digit number" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, twoFactorSecret: true, twoFactorEnabled: true },
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (!user.twoFactorEnabled || !user.twoFactorSecret) {
    return NextResponse.json({ error: "2FA is not enabled" }, { status: 400 });
  }

  const secret = decryptTotpSecret(user.twoFactorSecret);
  if (!verifyTotp(tokenResult.data, secret)) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorBackupCodes: null,
    },
  });

  return NextResponse.json({ ok: true });
}
