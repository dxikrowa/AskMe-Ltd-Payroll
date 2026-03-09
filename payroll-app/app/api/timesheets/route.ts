import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertOrgAccess } from "@/lib/fss";

function toMinutes(hours: any): number {
  const n = Number.parseFloat((hours ?? "").toString());
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * 60);
}

function toCents(v: any): number | null {
  const s = (v ?? "").toString().trim();
  if (!s) return null;
  const n = Number.parseFloat(s.replace(/,/g, ""));
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

// GET /api/timesheets?organisationId=...&employeeId=...&from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const organisationId = searchParams.get("organisationId") ?? "";
  const employeeId = searchParams.get("employeeId") ?? "";
  if (!organisationId) return NextResponse.json({ error: "Missing organisationId" }, { status: 400 });

  try {
    await assertOrgAccess(user.id, organisationId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const where: any = { organisationId };
  if (employeeId) where.employeeId = employeeId;
  if (from) where.date = { ...(where.date ?? {}), gte: new Date(from) };
  if (to) where.date = { ...(where.date ?? {}), lt: new Date(to) };

  const rows = await prisma.timesheetEntry.findMany({
    where,
    orderBy: { date: "desc" },
    include: { employee: { select: { firstName: true, lastName: true } } },
  });

  return NextResponse.json({ rows });
}

// POST /api/timesheets
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const organisationId = body.organisationId as string;
  const employeeId = body.employeeId as string;
  const date = body.date as string;
  if (!organisationId || !employeeId || !date) {
    return NextResponse.json({ error: "Missing organisationId/employeeId/date" }, { status: 400 });
  }

  try {
    await assertOrgAccess(user.id, organisationId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const minutes = toMinutes(body.hours);
  if (!minutes) return NextResponse.json({ error: "Invalid hours" }, { status: 400 });

  const rateCents = toCents(body.rate);
  const multiplierBp = Math.round((Number.parseFloat((body.multiplier ?? "1").toString()) || 1) * 100);

  const row = await prisma.timesheetEntry.create({
    data: {
      organisationId,
      employeeId,
      date: new Date(date),
      minutes,
      rateCents,
      multiplierBp: Number.isFinite(multiplierBp) ? multiplierBp : 100,
      notes: (body.notes ?? "").toString().trim() || null,
    },
  });

  return NextResponse.json({ row });
}
