/**
 * app/api/auth/setup-2fa/route.ts
 *
 * GET  /api/auth/setup-2fa
 *   → Generates (or re-generates) a TOTP secret for the current user.
 *     Returns a QR code data URL and the plaintext secret for manual entry.
 *     Does NOT yet enable 2FA – that happens on POST /api/auth/verify-2fa.
 *
 * Requires an authenticated session.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateTotpSecret, generateQrCodeDataUrl } from "@/lib/2fa";
import { twoFaLimiter, getIp, rateLimitResponse } from "@/lib/rate-limit";

export async function GET(req: Request) {
  // Auth check
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit by user ID or IP
  const ip = getIp(req);
  const rl = twoFaLimiter.check(`setup:${session.user.email}:${ip}`);
  if (!rl.success) return rateLimitResponse(rl.resetAt);

  try {
    const { secret, encryptedSecret } = generateTotpSecret();

    // Persist the (encrypted) pending secret; do NOT enable 2FA yet
    await prisma.user.update({
      where: { email: session.user.email },
      data: { twoFactorSecret: encryptedSecret },
    });

    const qrCodeDataUrl = await generateQrCodeDataUrl(session.user.email, secret);

    return NextResponse.json({
      qrCode: qrCodeDataUrl,
      // Return the secret so users can enter it manually into their authenticator app
      secret,
    });
  } catch (e) {
    console.error("[setup-2fa]", e);
    return NextResponse.json({ error: "Failed to set up 2FA" }, { status: 500 });
  }
}
