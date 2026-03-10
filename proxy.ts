/**
 * proxy.ts  (Next.js App Router – Edge runtime)
 *
 * Renamed from middleware.ts → proxy.ts as required by Next.js 15+.
 * See: https://nextjs.org/docs/messages/middleware-to-proxy
 *
 * Responsibilities
 * ────────────────
 * 1. Attach security headers on every response
 *    (CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy)
 * 2. Protect /dashboard/* — redirect unauthenticated users to /login
 * 3. Redirect already-authenticated users away from /login and /register
 * 4. Enforce 2FA: if a user has 2FA enabled but hasn't verified this session,
 *    redirect them to /verify-2fa for any protected route.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// ─── Routes ───────────────────────────────────────────────────────────────────

const AUTH_ONLY_REDIRECTS = new Set(["/login", "/register"]);
const PROTECTED_PREFIX = [
  "/dashboard",
  "/payroll",
  "/organisations",
  "/timesheets",
  "/leave",
  "/forms",
  "/settings",
  "/account",
];

function isProtected(pathname: string) {
  return PROTECTED_PREFIX.some((p) => pathname.startsWith(p));
}

function isPublicApiRoute(pathname: string) {
  return (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/stripe")
  );
}

// ─── Security headers ─────────────────────────────────────────────────────────

function addSecurityHeaders(response: NextResponse): NextResponse {
  const h = response.headers;

  h.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' blob: data: https:",
      "connect-src 'self' https://api.stripe.com https://vitals.vercel-insights.com",
      "frame-src 'self' blob: https://js.stripe.com https://hooks.stripe.com",
      "worker-src 'self' blob:; object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join("; ")
  );

  h.set("X-Frame-Options", "SAMEORIGIN");
  h.set("X-Content-Type-Options", "nosniff");
  h.set("Referrer-Policy", "strict-origin-when-cross-origin");
  h.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(self)"
  );
  h.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  h.set("X-XSS-Protection", "1; mode=block");

  return response;
}

// ─── Proxy handler ────────────────────────────────────────────────────────────

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow public API routes (NextAuth callbacks, Stripe webhooks, etc.)
  if (isPublicApiRoute(pathname)) {
    return addSecurityHeaders(NextResponse.next());
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const isLoggedIn = Boolean(token?.email);

  // Redirect already-authenticated users away from /login and /register
  if (isLoggedIn && AUTH_ONLY_REDIRECTS.has(pathname)) {
    return addSecurityHeaders(
      NextResponse.redirect(new URL("/dashboard", request.url))
    );
  }

  // Protect dashboard / app routes
  if (isProtected(pathname)) {
    if (!isLoggedIn) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return addSecurityHeaders(NextResponse.redirect(loginUrl));
    }

    // Enforce 2FA: redirect to /verify-2fa if not yet verified this session
    const twoFactorEnabled = token?.twoFactorEnabled as boolean | undefined;
    const twoFactorVerified = token?.twoFactorVerified as boolean | undefined;

    if (twoFactorEnabled && !twoFactorVerified && pathname !== "/verify-2fa") {
      return addSecurityHeaders(
        NextResponse.redirect(new URL("/verify-2fa", request.url))
      );
    }
  }

  return addSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf|otf|eot)).*)",
  ],
};
