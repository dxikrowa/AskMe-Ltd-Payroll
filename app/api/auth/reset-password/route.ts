import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

function sha256(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email ?? "").toLowerCase().trim();
    const token = String(body.token ?? "").trim();
    const password = String(body.password ?? "");

    if (!email || !token || !password) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user?.resetTokenHash || !user.resetTokenExpiresAt) return NextResponse.json({ error: "Invalid token" }, { status: 400 });

    if (user.resetTokenExpiresAt.getTime() < Date.now()) {
      return NextResponse.json({ error: "Token expired" }, { status: 400 });
    }

    const tokenHash = sha256(token);
    if (tokenHash !== user.resetTokenHash) return NextResponse.json({ error: "Invalid token" }, { status: 400 });

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, resetTokenHash: null, resetTokenExpiresAt: null },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed to reset password" }, { status: 500 });
  }
}
