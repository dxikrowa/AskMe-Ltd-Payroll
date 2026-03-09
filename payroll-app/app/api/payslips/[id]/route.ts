import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: Request, context: any) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = await context.params;
  const id = params?.id;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const payslip = await prisma.payslip.findUnique({
    where: { id },
    include: { employee: { select: { organisationId: true } } },
  });

  if (!payslip) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const member = await prisma.membership.findFirst({
    where: { userId: user.id, organisationId: payslip.employee.organisationId },
  });
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Best-effort remove PDF file
  if (payslip.pdfPath) {
    try {
      await fs.unlink(path.join(process.cwd(), payslip.pdfPath));
    } catch {
      // ignore
    }
  }

  await prisma.payslip.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
