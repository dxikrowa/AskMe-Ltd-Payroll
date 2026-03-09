import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  const rows = await prisma.vacationLeaveEntry.findMany({
    where: {
      organisationId,
      ...(employeeId ? { employeeId } : {}),
    },
    orderBy: { date: "desc" },
    include: { employee: { select: { firstName: true, lastName: true } } },
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
  const date = new Date(String(body.date));
  const hours = Number(body.hours ?? 0);
  const notes = body.notes ? String(body.notes) : undefined;

  if (!organisationId || !employeeId || !Number.isFinite(date.getTime())) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const member = await prisma.membership.findFirst({ where: { userId: user.id, organisationId } });
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const minutesUsed = Math.max(0, Math.round(hours * 60));

  const row = await prisma.vacationLeaveEntry.create({
    data: {
      organisationId,
      employeeId,
      date,
      minutesUsed,
      notes,
    },
  });

  return NextResponse.json({ row });
}
