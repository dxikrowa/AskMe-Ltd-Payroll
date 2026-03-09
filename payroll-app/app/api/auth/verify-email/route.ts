import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emailSchema } from "@/lib/validation";
import { verifyEmailCode } from "@/lib/email-verification";
import { z } from "zod";

const schema = z.object({
  email: emailSchema,
  code: z.string().regex(/^\d{6}$/),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true, emailVerified: true } });
  if (!user) return NextResponse.json({ error: "Account not found" }, { status: 404 });
  if (user.emailVerified) return NextResponse.json({ ok: true });

  const result = await verifyEmailCode(parsed.data.email, parsed.data.code);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
