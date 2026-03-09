import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const employeeId = url.searchParams.get("employeeId");
  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");

  if (!employeeId) {
    return NextResponse.json({ error: "Missing employeeId" }, { status: 400 });
  }

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { id: true, organisationId: true, firstName: true, lastName: true },
  });
  if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  const member = await prisma.membership.findFirst({
    where: { userId: user.id, organisationId: employee.organisationId },
  });
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const where: any = { employeeId: employeeId };
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) {
      // include the whole day
      const d = new Date(dateTo);
      d.setDate(d.getDate() + 1);
      where.createdAt.lt = d;
    }
  }

  const payslips = await prisma.payslip.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      payPeriodFrom: true,
      payPeriodTo: true,
      grossCents: true,
      taxCents: true,
      niCents: true,
      netCents: true,
      allowanceCents: true,
      bonusCents: true,
      overtimeCents: true,
      maternityFundCents: true,
      pdfPath: true,
    },
  });

  return NextResponse.json({ employee, payslips });
}
