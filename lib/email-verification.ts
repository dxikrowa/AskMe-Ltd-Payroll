import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getMailer } from "@/lib/mailer";

const CODE_TTL_MINUTES = 15;

function hashCode(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export function generateVerificationCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function createEmailVerification(email: string) {
  const code = generateVerificationCode();
  const token = hashCode(`${email.toLowerCase()}::${code}`);
  const expires = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);

  await prisma.verificationToken.deleteMany({ where: { identifier: `verify-email:${email.toLowerCase()}` } });
  await prisma.verificationToken.create({
    data: {
      identifier: `verify-email:${email.toLowerCase()}`,
      token,
      expires,
    },
  });

  return { code, expires };
}

export async function sendVerificationEmail(email: string, code: string) {
  const mailer = getMailer();
  if (!mailer) return false;

  await mailer.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "Verify your AskMe Payroll account",
    text: `Your verification code is ${code}. It expires in ${CODE_TTL_MINUTES} minutes.`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.5"><h2>Verify your email</h2><p>Your verification code is:</p><p style="font-size:32px;font-weight:700;letter-spacing:6px">${code}</p><p>This code expires in ${CODE_TTL_MINUTES} minutes.</p></div>`,
  });

  return true;
}

export async function verifyEmailCode(email: string, code: string) {
  const identifier = `verify-email:${email.toLowerCase()}`;
  const token = hashCode(`${email.toLowerCase()}::${code}`);

  const row = await prisma.verificationToken.findUnique({
    where: { identifier_token: { identifier, token } },
  });

  if (!row) return { ok: false as const, error: "Invalid code" };
  if (row.expires < new Date()) {
    await prisma.verificationToken.deleteMany({ where: { identifier } });
    return { ok: false as const, error: "Code expired" };
  }

  await prisma.user.update({
    where: { email: email.toLowerCase() },
    data: { emailVerified: new Date() },
  });
  await prisma.verificationToken.deleteMany({ where: { identifier } });
  return { ok: true as const };
}
