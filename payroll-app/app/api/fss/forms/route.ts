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

  const url = new URL(req.url);
  const organisationId = url.searchParams.get("organisationId") ?? "";
  const type = (url.searchParams.get("type") ?? "") as any;
  const yearParam = url.searchParams.get("year");
  const year = yearParam ? Number(yearParam) : NaN;
  const employeeId = url.searchParams.get("employeeId") ?? undefined;
  const dateFrom = url.searchParams.get("dateFrom") ?? undefined;
  const dateTo = url.searchParams.get("dateTo") ?? undefined;

  if (!organisationId) return NextResponse.json({ error: "Missing organisationId" }, { status: 400 });
  // type + year are optional for broader search (used in Payroll History)

  try {
    await assertOrgAccess(user.id, organisationId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const where: any = { organisationId };
  if (type) where.type = type;
  if (Number.isFinite(year)) where.year = year;
  if (employeeId) where.employeeId = employeeId;
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) {
      const d = new Date(dateTo);
      d.setDate(d.getDate() + 1);
      where.createdAt.lt = d;
    }
  }

  const forms = await prisma.fssForm.findMany({
    where,
    orderBy: [{ month: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      type: true,
      year: true,
      month: true,
      createdAt: true,
      pdfPath: true,
      employeeId: true,
      data: true,
    },
  });

  return NextResponse.json({ forms });
}
