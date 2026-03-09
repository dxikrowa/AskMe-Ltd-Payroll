import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertOrgAccess, toCents } from "@/lib/fss";

// GET /api/leave?organisationId=...&type=MATERNITY&from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const organisationId = searchParams.get("organisationId") ?? "";
  if (!organisationId) return NextResponse.json({ error: "Missing organisationId" }, { status: 400 });

  try {
    await assertOrgAccess(user.id, organisationId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const type = searchParams.get("type") ?? "MATERNITY";
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: any = { organisationId, type };
  if (from) where.startDate = { ...(where.startDate ?? {}), gte: new Date(from) };
  if (to) where.startDate = { ...(where.startDate ?? {}), lt: new Date(to) };

  const rows = await prisma.leaveEntry.findMany({
    where,
    orderBy: { startDate: "desc" },
    include: { employee: { select: { firstName: true, lastName: true } } },
  });

  return NextResponse.json({ rows });
}

// POST /api/leave
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const organisationId = body.organisationId as string;
  if (!organisationId) return NextResponse.json({ error: "Missing organisationId" }, { status: 400 });

  try {
    await assertOrgAccess(user.id, organisationId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const startDate = new Date(body.startDate);
  const endDate = new Date(body.endDate);
  if (!startDate || !endDate || Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return NextResponse.json({ error: "Invalid startDate/endDate" }, { status: 400 });
  }
  if (endDate < startDate) return NextResponse.json({ error: "endDate must be after startDate" }, { status: 400 });

  const row = await prisma.leaveEntry.create({
    data: {
      organisationId,
      employeeId: (body.employeeId ?? null) as any,
      type: "MATERNITY",
      startDate,
      endDate,
      maternityContributionCents: toCents(body.maternityContribution ?? "0"),
      notes: (body.notes ?? "").toString().trim() || null,
    },
  });

  return NextResponse.json({ row });
}
