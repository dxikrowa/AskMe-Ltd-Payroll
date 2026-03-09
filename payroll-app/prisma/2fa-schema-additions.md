// prisma/schema-2fa-additions.prisma
//
// ADD THESE FIELDS to your existing User model in prisma/schema.prisma
// Then run:  npx prisma migrate dev --name add-2fa-fields
//
// ─────────────────────────────────────────────────────────────────────────────
// model User {
//   ... existing fields ...
//
//   // Two-Factor Authentication
//   twoFactorSecret      String?   // AES-256-GCM encrypted TOTP secret
//   twoFactorEnabled     Boolean   @default(false)
//   twoFactorBackupCodes String?   // JSON array of HMAC-SHA-256 hashed backup codes
// }
// ─────────────────────────────────────────────────────────────────────────────
//
// Also add the following to your NextAuth JWT callback in lib/auth.ts
// so that the middleware can check 2FA status without a DB round-trip:
//
// callbacks: {
//   async jwt({ token, user }) {
//     if (user) {
//       // Called after sign-in: stamp 2FA state onto the JWT
//       const dbUser = await prisma.user.findUnique({
//         where: { id: user.id },
//         select: { twoFactorEnabled: true },
//       });
//       token.twoFactorEnabled = dbUser?.twoFactorEnabled ?? false;
//       token.twoFactorVerified = false; // must re-verify each session
//     }
//     return token;
//   },
//   async session({ session, token }) {
//     if (session.user) {
//       (session.user as any).twoFactorEnabled = token.twoFactorEnabled;
//       (session.user as any).twoFactorVerified = token.twoFactorVerified;
//     }
//     return session;
//   },
// },
//
// After a successful 2FA verification in /verify-2fa page, call:
//   POST /api/auth/set-2fa-verified  (see app/api/auth/set-2fa-verified/route.ts)
// which uses the NextAuth update() helper to stamp twoFactorVerified: true.

// ─────────────────────────────────────────────────────────────────────────────
// app/api/auth/set-2fa-verified/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// import { NextResponse } from "next/server";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/lib/auth";
//
// /**
//  * Internal endpoint called after successful 2FA verification.
//  * Updates the server-side session to mark twoFactorVerified = true.
//  * This works with NextAuth's built-in JWT rotation:
//  *   - The client calls this route, then re-fetches the session.
//  */
// export async function POST(req: Request) {
//   const session = await getServerSession(authOptions);
//   if (!session?.user?.email) {
//     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//   }
//   // With next-auth v4 you must return a "trigger: update" from the JWT callback.
//   // Store verification state in a short-lived server-side cache keyed by session ID,
//   // or use next-auth v5's session.update() helper.
//   // See: https://next-auth.js.org/configuration/callbacks#jwt-callback
//   return NextResponse.json({ ok: true });
// }
