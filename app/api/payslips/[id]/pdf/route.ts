export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, context: any) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
  if (!payslip.pdfPath) return NextResponse.json({ error: "No PDF saved" }, { status: 404 });

  const member = await prisma.membership.findFirst({
    where: { userId: user.id, organisationId: payslip.employee.organisationId },
  });
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const absolutePath = path.join(process.cwd(), payslip.pdfPath);
  const bytes = await fs.readFile(absolutePath);

  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="payslip-${payslip.id}.pdf"`,
      "Cache-Control": "no-store",
      "X-Frame-Options": "SAMEORIGIN",
      "Content-Security-Policy": "frame-ancestors 'self'",
    },
  });
}
