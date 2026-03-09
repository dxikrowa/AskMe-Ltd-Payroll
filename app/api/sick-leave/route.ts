import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertOrgAccess } from "@/lib/fss";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const organisationId = searchParams.get("organisationId") ?? "";
  const employeeId = searchParams.get("employeeId") ?? undefined;
  if (!organisationId) return NextResponse.json({ error: "Missing organisationId" }, { status: 400 });
  try { await assertOrgAccess(user.id, organisationId); } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }
  const rows = await prisma.leaveEntry.findMany({ where: { organisationId, employeeId, type: "SICK" }, orderBy: { startDate: "desc" }, include: { employee: { select: { firstName: true, lastName: true } } } });
  return NextResponse.json({ rows: rows.map((r) => ({ ...r, meta: (() => { try { return JSON.parse(r.notes || "{}"); } catch { return {}; } })() })) });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const organisationId = body.organisationId as string;
  const employeeId = body.employeeId as string;
  if (!organisationId || !employeeId) return NextResponse.json({ error: "Missing organisationId/employeeId" }, { status: 400 });
  try { await assertOrgAccess(user.id, organisationId); } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }
  const startDate = new Date(body.startDate || body.date);
  const endDate = new Date(body.endDate || body.date);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  const payType = String(body.payType ?? "FULL_PAY").toUpperCase();
  const row = await prisma.leaveEntry.create({ data: { organisationId, employeeId, type: "SICK", startDate, endDate, notes: JSON.stringify({ sickDays: Number(body.sickDays ?? 0), hoursPerDay: Number(body.hoursPerDay ?? 8), dailyBenefit: Number(body.dailyBenefit ?? 0), payType: ["FULL_PAY","HALF_PAY","NO_PAY"].includes(payType) ? payType : "FULL_PAY", notes: String(body.notes ?? "") }) } });
  return NextResponse.json({ row });
}
