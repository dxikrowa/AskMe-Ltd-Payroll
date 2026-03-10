import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { PDFDocument } from "pdf-lib";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  MONTHLY_AVG_HOURS_FULLTIME,
  computeMaternityFundMonthlyCents,
  parseDateISO,
} from "@/lib/malta";
import { savePrivatePdf } from "@/lib/pdf-storage";

function fillAllFields(form: any, fields: Record<string, any>) {
  for (const [key, val] of Object.entries(fields || {})) {
    try {
      form.getTextField(key).setText((val ?? "").toString());
    } catch {
      // ignore
    }
  }
}

function toCents(v: any): number {
  const n = Number.parseFloat((v ?? "").toString().replace(",", ""));
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

function parseHoursToMinutes(v: any): number {
  const n = Number.parseFloat((v ?? "").toString().replace(",", "."));
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 60);
}

function minutesToHoursString(mins: number): string {
  const h = mins / 60;
  return (Math.round(h * 100) / 100).toFixed(2);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { pdfFields, employeeDbId, organisationId } = body as {
    pdfFields: Record<string, any>;
    employeeDbId?: string;
    organisationId?: string;
  };

  if (!employeeDbId || !organisationId) return NextResponse.json({ error: "Missing employee/org" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const employee = await prisma.employee.findUnique({
    where: { id: employeeDbId },
    select: {
      id: true, organisationId: true, payFrequency: true, baseWage: true,
      employmentStartDate: true, vacationLeaveBalanceMinutes: true, vacationLeaveResetAt: true,
      normalWeeklyHours: true, under17: true, before1962: true, isStudent: true,
    },
  });

  if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  if (employee.organisationId !== organisationId) return NextResponse.json({ error: "Mismatch" }, { status: 400 });

  const member = await prisma.membership.findFirst({ where: { userId: user.id, organisationId } });
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const templatePath = path.join(process.cwd(), "templates", "payslip_v3.pdf");
  const templateBytes = await fs.readFile(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);
  const form = pdfDoc.getForm();

  const periodFrom = parseDateISO(pdfFields.pay_period_from);
  const periodTo = parseDateISO(pdfFields.pay_period_to);

  let overtimeCents = 0;
  let overtimeMinutes = 0;

  if (periodFrom && periodTo) {
    const monthStart = new Date(periodTo.getFullYear(), periodTo.getMonth(), 1);
    const monthEnd = new Date(periodTo.getFullYear(), periodTo.getMonth() + 1, 1);

    const entries = await prisma.timesheetEntry.findMany({
      where: {
        organisationId,
        employeeId: employeeDbId,
        date: { gte: monthStart, lt: monthEnd },
        entryType: "OVERTIME", // CRITICAL FIX: Only fetch Overtime entries
      },
      select: { minutes: true, rateCents: true, multiplierBp: true },
    });

    overtimeMinutes = entries.reduce((a, e) => a + (e.minutes ?? 0), 0);
    const defaultHourlyRateCents = Math.round((employee.baseWage ?? 0) / MONTHLY_AVG_HOURS_FULLTIME);

    overtimeCents = entries.reduce((sum, e) => {
      const rate = e.rateCents ?? defaultHourlyRateCents;
      const mult = (e.multiplierBp ?? 100) / 100;
      return sum + Math.round((e.minutes / 60) * rate * mult);
    }, 0);

    if (typeof pdfFields.overtime_15_hours !== "undefined") pdfFields.overtime_15_hours = minutesToHoursString(overtimeMinutes);
    if (typeof pdfFields.overtime_15_thispay !== "undefined") pdfFields.overtime_15_thispay = (overtimeCents / 100).toFixed(2);
    else if (typeof pdfFields.overtime_up_to !== "undefined") pdfFields.overtime_up_to = (overtimeCents / 100).toFixed(2);
  }

  if (employee.payFrequency === "MONTHLY" && (pdfFields.basicpay_hours === "" || pdfFields.basicpay_hours == null)) {
    pdfFields.basicpay_hours = (MONTHLY_AVG_HOURS_FULLTIME * ((employee.normalWeeklyHours ?? 40) / 40)).toFixed(2);
  }

  let entitledMinutes = parseHoursToMinutes(pdfFields.hours_vlentitled);
  let carriedMinutes = parseHoursToMinutes(pdfFields.hours_vlfrom);
  let consumedMinutes = parseHoursToMinutes(pdfFields.hours_vlconsumed);
  let remainingMinutes = parseHoursToMinutes(pdfFields.hours_vlremaining);

  if ((!pdfFields.hours_vlconsumed || String(pdfFields.hours_vlconsumed).trim() === "") && periodFrom && periodTo) {
    const vl = await prisma.vacationLeaveEntry.findMany({
      where: { organisationId, employeeId: employeeDbId, date: { gte: periodFrom, lte: periodTo } },
      select: { minutesUsed: true },
    });
    consumedMinutes = vl.reduce((a, r) => a + (r.minutesUsed ?? 0), 0);
    if (typeof pdfFields.hours_vlconsumed !== "undefined") pdfFields.hours_vlconsumed = minutesToHoursString(consumedMinutes);
  }

  if ((!pdfFields.hours_vlremaining || String(pdfFields.hours_vlremaining).trim() === "") && entitledMinutes) {
    remainingMinutes = Math.max(0, entitledMinutes + carriedMinutes - consumedMinutes);
    if (typeof pdfFields.hours_vlremaining !== "undefined") pdfFields.hours_vlremaining = minutesToHoursString(remainingMinutes);
  }

  fillAllFields(form, pdfFields);
  form.flatten();
  const pdfBytes = await pdfDoc.save();

  const grossCents = toCents(pdfFields.thispay_grosspay ?? pdfFields.basicpay_thispay);
  const taxCents = toCents(pdfFields.thispay_tax);
  const niCents = toCents(pdfFields.thispay_ni);
  const netCents = toCents(pdfFields.thispay_netpay);
  const allowanceCents = toCents(pdfFields.thispay_allowances);

  const bonusCents = toCents(pdfFields.thispay_march_supplement) + toCents(pdfFields.thispay_june_bonus) + toCents(pdfFields.thispay_september_supplement) + toCents(pdfFields.thispay_december_bonus);

  const baseForMaternityCents = Math.max(0, grossCents - overtimeCents - bonusCents - allowanceCents);
  const maternityFundCents = computeMaternityFundMonthlyCents(baseForMaternityCents, { under18: employee.under17, before1962: employee.before1962, isStudent: employee.isStudent });

  const payslip = await prisma.payslip.create({
    data: {
      organisationId, employeeId: employeeDbId, grossCents, taxCents, niCents, netCents, allowanceCents,
      bonusCents, overtimeCents, maternityFundCents, vacationEntitledMinutes: entitledMinutes,
      vacationConsumedMinutes: consumedMinutes, vacationRemainingMinutes: remainingMinutes,
      payPeriodFrom: periodFrom ?? null, payPeriodTo: periodTo ?? null, pdfPath: null,
    },
  });

  const storedPath = `payslips/${organisationId}/${employeeDbId}/${payslip.id}.pdf`;
  const saved = await savePrivatePdf(storedPath, pdfBytes);
  await prisma.payslip.update({ where: { id: payslip.id }, data: { pdfPath: saved.storedPath } });

  const pdfBuffer = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength) as ArrayBuffer;

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="payslip.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}