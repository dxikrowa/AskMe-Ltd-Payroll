import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deletePrivatePdf } from "@/lib/pdf-storage";

export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const payslip = await prisma.payslip.findUnique({
    where: { id },
    select: {
      id: true,
      pdfPath: true,
      organisationId: true,
    },
  });

  if (!payslip) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const member = await prisma.membership.findFirst({
    where: {
      userId: user.id,
      organisationId: payslip.organisationId,
    },
    select: { id: true },
  });

  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (payslip.pdfPath) {
    try {
      await deletePrivatePdf(payslip.pdfPath);
    } catch (e) {
      console.error("[payslip delete] failed to remove pdf:", e);
    }
  }

  await prisma.payslip.delete({
    where: { id },
  });

  return NextResponse.json({ ok: true });
}