import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertOrgAccess, monthKey, monthRange, yearRange } from "@/lib/fss";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const organisationId = url.searchParams.get("organisationId") ?? "";
  const scope = url.searchParams.get("scope") ?? "month"; // month | year
  const year = Number(url.searchParams.get("year") ?? "NaN");
  const month = Number(url.searchParams.get("month") ?? "NaN");
  const employeeId = url.searchParams.get("employeeId") ?? "";

  if (!organisationId) return NextResponse.json({ error: "Missing organisationId" }, { status: 400 });
  if (!Number.isFinite(year)) return NextResponse.json({ error: "Missing/invalid year" }, { status: 400 });
  if (scope === "month" && !Number.isFinite(month)) {
    return NextResponse.json({ error: "Missing/invalid month" }, { status: 400 });
  }

  try {
    await assertOrgAccess(user.id, organisationId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const range = scope === "year" ? yearRange(year) : monthRange(year, month);

  const payslips = await prisma.payslip.findMany({
    where: {
      organisationId,
      ...(employeeId ? { employeeId } : {}),
      createdAt: { gte: range.start, lt: range.end },
    },
    orderBy: { createdAt: "asc" },
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
      employee: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  return NextResponse.json({
    payslips: payslips.map((p) => ({
      ...p,
      // Use the pay period date (not the generation timestamp) for grouping and display.
      monthKey: monthKey(new Date(p.payPeriodTo ?? p.payPeriodFrom ?? p.createdAt)),
    })),
  });
}
