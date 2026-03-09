# Security Improvements & Landing Page – Implementation Guide

## Files Included

| File | Purpose |
|---|---|
| `middleware.ts` | Security headers, auth gate, 2FA enforcement |
| `lib/rate-limit.ts` | In-memory sliding-window rate limiter |
| `lib/validation.ts` | Zod schemas + HTML sanitisation |
| `lib/crypto.ts` | AES-256-GCM encryption for sensitive DB fields |
| `lib/2fa.ts` | TOTP 2FA (secret generation, QR codes, verification) |
| `app/api/auth/register/route.ts` | Secured registration endpoint |
| `app/api/auth/setup-2fa/route.ts` | Begin 2FA setup (generates QR code) |
| `app/api/auth/verify-2fa/route.ts` | Verify TOTP token (setup or login) |
| `app/api/auth/disable-2fa/route.ts` | Disable 2FA (requires current token) |
| `app/api/pdfs/[id]/route.ts` | Authenticated PDF serving |
| `app/page.tsx` | Complete professional landing page |
| `components/logo.tsx` | Reusable Logo component |
| `prisma/2fa-schema-additions.md` | Prisma schema changes needed |

---

## 1. Install new dependencies

```bash
npm install otplib qrcode zod
npm install --save-dev @types/qrcode
```

---

## 2. Add environment variables to .env

```env
# 64-char hex (run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ENCRYPTION_KEY=<generate-this>

# Where PDFs are stored server-side (OUTSIDE /public)
PDF_STORAGE_PATH=/var/payroll-pdfs
```

---

## 3. Prisma schema – add 2FA fields to User model

Open `prisma/schema.prisma` and add these three fields to the `User` model:

```prisma
model User {
  // ... existing fields ...

  // Two-Factor Authentication
  twoFactorSecret      String?   // AES-256-GCM encrypted TOTP secret
  twoFactorEnabled     Boolean   @default(false)
  twoFactorBackupCodes String?   // JSON array of HMAC-SHA-256 hashed backup codes
}
```

Then run:
```bash
npx prisma migrate dev --name add-2fa-fields
npx prisma generate
```

---

## 4. Update lib/auth.ts – add 2FA state to JWT

In your `authOptions`, update the `jwt` and `session` callbacks:

```ts
callbacks: {
  async jwt({ token, user, trigger }) {
    if (user) {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { twoFactorEnabled: true },
      });
      token.twoFactorEnabled = dbUser?.twoFactorEnabled ?? false;
      token.twoFactorVerified = false;
    }
    // Allow manual update via useSession().update()
    if (trigger === "update" && token.twoFactorVerified === false) {
      token.twoFactorVerified = true;
    }
    return token;
  },
  async session({ session, token }) {
    if (session.user) {
      (session.user as any).twoFactorEnabled = token.twoFactorEnabled;
      (session.user as any).twoFactorVerified = token.twoFactorVerified;
    }
    return session;
  },
},
```

---

## 5. Add the 2FA verification page

Create `app/verify-2fa/page.tsx` — a client component that:
1. Calls `GET /api/auth/setup-2fa` to show the QR code (first time)
2. Shows a 6-digit input
3. Calls `POST /api/auth/verify-2fa` with `{ token, purpose: "login" }`
4. On success, calls `useSession().update()` to stamp `twoFactorVerified: true`
5. Redirects to `/dashboard`

---

## 6. Logo – copy files to /public

```bash
cp askmeltdlionpayroll.png     public/
cp askmeltdbluelionpayroll.png public/
```

Then update `components/sidebar.tsx` and `components/header.tsx` to import and use the `Logo` or `SidebarLogo` component from `components/logo.tsx`.

---

## 7. PDF storage – move PDFs out of /public

In your PDF generation API route (`app/api/payslips/generate/route.ts`), change the 
output path from anything under `public/` to `process.env.PDF_STORAGE_PATH`.

When serving PDFs, replace direct `/public/...` links with `/api/pdfs/<id>` links.
The new `app/api/pdfs/[id]/route.ts` handles authentication and serves the file.

---

## 8. Replace direct DB raw queries

If any part of your code uses Prisma's `$queryRaw`, always use tagged template literals 
(Prisma's built-in parameterisation), never string concatenation:

```ts
// ✅ Safe
const result = await prisma.$queryRaw`SELECT * FROM users WHERE email = ${email}`;

// ❌ Never do this
const result = await prisma.$queryRaw(`SELECT * FROM users WHERE email = '${email}'`);
```

---

## 9. Additional security recommendations

| Issue | Recommendation |
|---|---|
| **CSRF** | NextAuth sets `__Host-next-auth.csrf-token` cookie — keep `sameSite: "lax"` on session cookie |
| **Rate limiting (prod)** | Swap `lib/rate-limit.ts` for `@upstash/ratelimit` + Upstash Redis for multi-instance deployments |
| **Secrets rotation** | Rotate `NEXTAUTH_SECRET` periodically; add key-versioning to `lib/crypto.ts` |
| **Audit log** | Log login, 2FA setup/disable, payslip generation with userId + IP |
| **Email verification** | Add email verification before allowing access (currently bypassed with `emailVerified: new Date()`) |
| **Dependency scanning** | Run `npm audit` before every deployment; set up Dependabot or Snyk |
| **HTTPS** | Ensure all traffic goes over TLS; the middleware sets HSTS |
| **Cookie flags** | Verify `__Secure-` prefix on session cookies in production (set `NEXTAUTH_URL=https://...`) |
