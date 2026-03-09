/**
 * app/api/auth/verify-2fa/route.ts
 *
 * POST /api/auth/verify-2fa
 *   body: { token: string; purpose: "setup" | "login" | "backup" }
 *
 *   "setup"  – validates the TOTP token and enables 2FA on the account.
 *              Also generates backup codes (returned once, never again).
 *   "login"  – validates the TOTP token for an already-authenticated session
 *              that hasn't yet passed the 2FA gate; marks the JWT as verified.
 *   "backup" – consumes a single-use backup code instead of a TOTP token.
 *
 * Requires an authenticated session.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  verifyTotp,
  decryptTotpSecret,
  generateBackupCodes,
  consumeBackupCode,
} from "@/lib/2fa";
import { twoFaLimiter, getIp, rateLimitResponse } from "@/lib/rate-limit";
import { totpTokenSchema } from "@/lib/validation";

export async function POST(req: Request) {
  // Auth check
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit – keyed by user email to prevent parallel brute-force
  const rl = twoFaLimiter.check(`2fa:${session.user.email}`);
  if (!rl.success) return rateLimitResponse(rl.resetAt);

  let body: { token?: unknown; purpose?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const purpose = body.purpose;
  if (purpose !== "setup" && purpose !== "login" && purpose !== "backup") {
    return NextResponse.json({ error: "Invalid purpose" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      twoFactorSecret: true,
      twoFactorEnabled: true,
      twoFactorBackupCodes: true,
    },
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // ── Backup-code path ──────────────────────────────────────────────────────────
  if (purpose === "backup") {
    const code = String(body.token ?? "").trim();
    if (!code) {
      return NextResponse.json({ error: "Backup code is required" }, { status: 400 });
    }
    if (!user.twoFactorEnabled || !user.twoFactorBackupCodes) {
      return NextResponse.json({ error: "2FA is not enabled" }, { status: 400 });
    }

    const updatedCodes = consumeBackupCode(code, user.twoFactorBackupCodes);
    if (updatedCodes === null) {
      return NextResponse.json({ error: "Invalid backup code" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorBackupCodes: updatedCodes },
    });

    return NextResponse.json({ ok: true, twoFactorVerified: true });
  }

  // ── TOTP path ─────────────────────────────────────────────────────────────────
  const tokenResult = totpTokenSchema.safeParse(body.token);
  if (!tokenResult.success) {
    return NextResponse.json(
      { error: "Token must be a 6-digit number" },
      { status: 400 }
    );
  }

  if (!user.twoFactorSecret) {
    return NextResponse.json(
      { error: "No 2FA secret found. Please set up 2FA first." },
      { status: 400 }
    );
  }

  const secret = decryptTotpSecret(user.twoFactorSecret);
  const valid = verifyTotp(tokenResult.data, secret);

  if (!valid) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }

  // ── Setup: enable 2FA and return backup codes ─────────────────────────────────
  if (purpose === "setup") {
    const { plainCodes, hashedCodes } = generateBackupCodes();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: true,
        twoFactorBackupCodes: hashedCodes,
      },
    });

    return NextResponse.json({
      ok: true,
      backupCodes: plainCodes, // Show ONCE – user must save these
    });
  }

  // ── Login: signal that the session has completed 2FA verification ─────────────
  // The client should call NextAuth signIn again (or use a custom JWT update endpoint)
  // to stamp twoFactorVerified: true on the JWT.
  return NextResponse.json({ ok: true, twoFactorVerified: true });
}
