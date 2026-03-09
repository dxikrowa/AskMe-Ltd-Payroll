/**
 * lib/auth.ts
 *
 * NextAuth configuration.
 *
 * Fixes:
 *  - SESSION_ERROR "Cannot read properties of undefined (reading 'twoFactorEnabled')"
 *    → token is guarded with optional chaining throughout the callbacks.
 *  - Google OAuth users are matched to existing credential accounts by email
 *    so the same user doesn't end up with duplicate records.
 *  - 2FA state (twoFactorEnabled, twoFactorVerified) is stamped on the JWT
 *    after sign-in and exposed on the session object.
 */

import { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  // Use JWT sessions (required for Credentials provider)
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  providers: [
    // ── Google OAuth ────────────────────────────────────────────────────────
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      // Allow linking Google account to an existing email/password account
      allowDangerousEmailAccountLinking: true,
    }),

    // ── Email / Password ────────────────────────────────────────────────────
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = String(credentials.email).toLowerCase().trim();
        const password = String(credentials.password);

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            passwordHash: true,
            twoFactorEnabled: true,
            emailVerified: true,
          },
        });

        if (!user?.passwordHash) return null;
        if (!user.emailVerified) {
          throw new Error("EMAIL_NOT_VERIFIED");
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          image: user.image ?? undefined,
        };
      },
    }),
  ],

  callbacks: {
    // ── JWT callback ─────────────────────────────────────────────────────────
    // Called whenever a JWT is created (sign-in) or accessed (session lookup).
    // We stamp twoFactorEnabled + twoFactorVerified onto the token here.
    async jwt({ token, user, trigger, session: sessionUpdate }) {
      // `user` is only populated on the initial sign-in
      if (user?.email) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: user.email },
            select: { twoFactorEnabled: true },
          });
          token.twoFactorEnabled = dbUser?.twoFactorEnabled ?? false;
          // Always require re-verification each new session
          token.twoFactorVerified = false;
        } catch {
          // DB unavailable — fail safe (don't crash login)
          token.twoFactorEnabled = false;
          token.twoFactorVerified = false;
        }
      }

      // Allow client to stamp twoFactorVerified = true via useSession().update()
      // after a successful /api/auth/verify-2fa call.
      if (trigger === "update" && sessionUpdate?.twoFactorVerified === true) {
        token.twoFactorVerified = true;
      }

      return token;
    },

    // ── Session callback ──────────────────────────────────────────────────────
    // Called whenever the session is accessed. Exposes JWT fields to the client.
    // IMPORTANT: token can be undefined in edge cases — always use optional chaining.
    async session({ session, token }) {
      if (session?.user) {
        // Expose the user id from the JWT sub claim
        (session.user as any).id = token?.sub ?? "";

        // Expose 2FA state — with safe fallbacks so it never crashes
        (session.user as any).twoFactorEnabled =
          token?.twoFactorEnabled ?? false;
        (session.user as any).twoFactorVerified =
          token?.twoFactorVerified ?? false;
      }
      return session;
    },

    // ── SignIn callback ───────────────────────────────────────────────────────
    // Runs before a session is created. Return false to deny sign-in.
    async signIn({ user, account }) {
      // Block sign-in if the user has no email (shouldn't happen with Google/email)
      if (!user?.email) return false;

      // For Google OAuth: if a credential account already exists with this email,
      // allowDangerousEmailAccountLinking (above) handles the merge automatically.
      // Nothing extra needed here.

      if (account?.provider === "google") {
        await prisma.user.update({ where: { email: user.email }, data: { emailVerified: new Date() } }).catch(() => null);
      }

      const dbUser = await prisma.user.findUnique({ where: { email: user.email }, select: { emailVerified: true } });
      if (!dbUser?.emailVerified && account?.provider !== "google") return false;
      return true;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",   // Redirect auth errors back to /login with ?error= param
  },

  // Enable debug logs in development only
  debug: process.env.NODE_ENV === "development",
};
