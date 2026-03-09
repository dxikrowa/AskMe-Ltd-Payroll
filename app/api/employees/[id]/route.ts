import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, context: any) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await context.params;
  const id = params?.id;

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const emp = await prisma.employee.findUnique({
    where: { id },
    include: { organisation: true },
  });

  if (!emp) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Security: user must be member of employee's organisation
  const member = await prisma.membership.findFirst({
    where: { userId: user.id, organisationId: emp.organisationId },
  });
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json({
    employee: {
      dbId: emp.id, // ✅ important
      organisationId: emp.organisationId, // ✅ important

      firstName: emp.firstName,
      lastName: emp.lastName,
      designation: emp.designation,
      idNumber: emp.idNumber,
      ssnNumber: emp.ssnNumber,

      baseWageCents: emp.baseWage,
      payFrequency: emp.payFrequency,
      employmentStartDate: emp.employmentStartDate,
      normalWeeklyHours: emp.normalWeeklyHours,
      isStudent: emp.isStudent,
      taxStatus: emp.taxStatus,
      employmentType: emp.employmentType,
      hourlyWageCents: emp.hourlyWage,
      includeNI: emp.includeNI,
      under17: emp.under17,
      apprentice: emp.apprentice,
      before1962: emp.before1962,
      includeAllowance1: emp.includeAllowance1,
      includeAllowance2: emp.includeAllowance2,
      includeBonus1: emp.includeBonus1,
      includeBonus2: emp.includeBonus2,
    },
    organisation: {
      id: emp.organisation.id,
      name: emp.organisation.name,
      address1: emp.organisation.address1,
      address2: emp.organisation.address2,
      peNumber: emp.organisation.peNumber,
    },
  });
}
