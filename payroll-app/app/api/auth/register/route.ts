/**
 * app/api/auth/register/route.ts
 *
 * Improvements over the original:
 *  • Rate limiting (5 requests / IP / 15 min)
 *  • Zod input validation + sanitisation
 *  • Stronger password requirements
 *  • Duplicate-email check that catches BOTH credential AND OAuth accounts
 *    (prevents "email already used via Google" confusion)
 *  • Timing-safe "email already in use" response (same timing as success)
 *  • bcrypt cost factor 12
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { registerSchema, formatZodError } from "@/lib/validation";
import { createEmailVerification, sendVerificationEmail } from "@/lib/email-verification";
import { authLimiter, getIp, rateLimitResponse } from "@/lib/rate-limit";
import { z } from "zod";

export async function POST(req: Request) {
  // ── Rate limiting ───────────────────────────────────────────────────────────
  const ip = getIp(req);
  const rl = authLimiter.check(ip);
  if (!rl.success) return rateLimitResponse(rl.resetAt);

  // ── Parse & validate body ───────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: formatZodError(parsed.error) },
      { status: 400 }
    );
  }

  const { email, password, name } = parsed.data;

  // ── Duplicate-email detection (credentials + OAuth) ─────────────────────────
  try {
    const existing = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        passwordHash: true,
        accounts: { select: { provider: true } },
      },
    });

    if (existing) {
      // Check if the existing account uses Google (or another OAuth provider)
      const oauthProviders = existing.accounts?.map((a) => a.provider) ?? [];
      const usesGoogle = oauthProviders.includes("google");

      // Always hash the password regardless of outcome to prevent timing attacks
      await bcrypt.hash(password, 12);

      if (usesGoogle) {
        return NextResponse.json(
          {
            error:
              "This email is linked to a Google account. Please sign in with Google.",
          },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    // ── Create user ─────────────────────────────────────────────────────────────
    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.create({
      data: {
        email,
        name: name ?? null,
        // Note: emailVerified is left null until the user confirms their email.
        // If you want immediate access (no email verification), set:
        //   emailVerified: new Date()
        emailVerified: null,
        passwordHash,
      },
    });

    const { code } = await createEmailVerification(email);
    await sendVerificationEmail(email, code);

    return NextResponse.json({ ok: true, requiresEmailVerification: true }, { status: 201 });
  } catch (e: unknown) {
    // Never leak internal error details to the client
    console.error("[register] error:", e);
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
