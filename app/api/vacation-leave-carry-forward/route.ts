import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function entitlementCycle(employee: any, ref: Date) {
  const start0 = employee?.employmentStartDate ? new Date(employee.employmentStartDate) : null;
  if (!start0 || Number.isNaN(start0.getTime())) {
    const y = ref.getFullYear();
    return { start: new Date(y, 0, 1), end: new Date(y + 1, 0, 1) };
  }
  const y = ref.getFullYear();
  const annThisYear = new Date(y, start0.getMonth(), start0.getDate());
  const start = ref < annThisYear ? new Date(y - 1, start0.getMonth(), start0.getDate()) : annThisYear;
  const end = new Date(start.getFullYear() + 1, start.getMonth(), start.getDate());
  return { start, end };
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const organisationId = searchParams.get("organisationId") ?? "";
  const employeeId = searchParams.get("employeeId") ?? undefined;
  if (!organisationId) return NextResponse.json({ rows: [] });

  const member = await prisma.membership.findFirst({ where: { userId: user.id, organisationId } });
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rows = await prisma.vacationLeaveCarryForward.findMany({
    where: { organisationId, ...(employeeId ? { employeeId } : {}) },
    orderBy: [{ cycleStart: "desc" }],
    include: { employee: { select: { firstName: true, lastName: true, employmentStartDate: true } } },
  });

  return NextResponse.json({ rows });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const organisationId = String(body.organisationId ?? "");
  const employeeId = String(body.employeeId ?? "");
  const hours = Number(body.hours ?? 0);
  const notes = body.notes ? String(body.notes) : undefined;

  if (!organisationId || !employeeId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  if (!Number.isFinite(hours) || hours < 0) return NextResponse.json({ error: "Invalid hours" }, { status: 400 });

  const member = await prisma.membership.findFirst({ where: { userId: user.id, organisationId } });
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const employee = await prisma.employee.findUnique({ where: { id: employeeId }, select: { employmentStartDate: true, organisationId: true } });
  if (!employee || employee.organisationId !== organisationId) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  // Carry-forward applies to the CURRENT entitlement year (starting at cycleStart).
  const cycle = entitlementCycle(employee, new Date());
  const cycleStart = cycle.start;
  const minutesCarried = Math.round(hours * 60);

  const row = await prisma.vacationLeaveCarryForward.upsert({
    where: { employeeId_cycleStart: { employeeId, cycleStart } },
    create: { organisationId, employeeId, cycleStart, minutesCarried, notes },
    update: { minutesCarried, notes },
  });

  return NextResponse.json({ row });
}
