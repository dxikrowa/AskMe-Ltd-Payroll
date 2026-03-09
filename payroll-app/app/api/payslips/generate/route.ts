import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { PDFDocument } from "pdf-lib";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MONTHLY_AVG_HOURS_FULLTIME, computeMaternityFundMonthlyCents, parseDateISO } from "@/lib/malta";

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
  // show 2 decimals like typical payslip entries
  return (Math.round(h * 100) / 100).toFixed(2);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { pdfFields, employeeDbId, organisationId } = body as {
    pdfFields: Record<string, any>;
    employeeDbId?: string;
    organisationId?: string;
  };

  if (!employeeDbId || !organisationId) {
    return NextResponse.json(
      { error: "Missing employeeDbId or organisationId (import an employee first)" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Ensure employee exists and belongs to org
  const employee = await prisma.employee.findUnique({
    where: { id: employeeDbId },
    select: {
      id: true,
      organisationId: true,
      payFrequency: true,
      baseWage: true,
      employmentStartDate: true,
      vacationLeaveBalanceMinutes: true,
      vacationLeaveResetAt: true,
      normalWeeklyHours: true,
      under17: true,
      before1962: true,
      isStudent: true,
    },
  });
  if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  if (employee.organisationId !== organisationId) {
    return NextResponse.json({ error: "Employee/org mismatch" }, { status: 400 });
  }

  // Ensure user is member of org
  const member = await prisma.membership.findFirst({
    where: { userId: user.id, organisationId },
  });
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Template
  const templatePath = path.join(process.cwd(), "templates", "payslip_v3.pdf");
  const templateBytes = await fs.readFile(templatePath);

  const pdfDoc = await PDFDocument.load(templateBytes);
  const form = pdfDoc.getForm();

  // ---- Automatic overtime + maternity fund + vacation leave integration ----
  // Pay period (if present in the PDF fields)
  const periodFrom = parseDateISO(pdfFields.pay_period_from);
  const periodTo = parseDateISO(pdfFields.pay_period_to);

  let overtimeCents = 0;
  let overtimeMinutes = 0;
  if (periodFrom && periodTo) {
    // Overtime should be applied to the payslip month only.
    // We therefore aggregate timesheet entries within the month of pay_period_to.
    const monthStart = new Date(periodTo.getFullYear(), periodTo.getMonth(), 1);
    const monthEnd = new Date(periodTo.getFullYear(), periodTo.getMonth() + 1, 1);
    const entries = await prisma.timesheetEntry.findMany({
      where: {
        organisationId,
        employeeId: employeeDbId,
        date: { gte: monthStart, lt: monthEnd },
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

    // Populate overtime on the payslip template.
    // Prefer dedicated overtime 1.5 fields when present, else fall back to overtime_up_to.
    if (typeof pdfFields.overtime_15_hours !== "undefined") {
      pdfFields.overtime_15_hours = minutesToHoursString(overtimeMinutes);
    }
    if (typeof pdfFields.overtime_15_thispay !== "undefined") {
      pdfFields.overtime_15_thispay = (overtimeCents / 100).toFixed(2);
    } else if (typeof pdfFields.overtime_up_to !== "undefined") {
      // Legacy template field
      pdfFields.overtime_up_to = (overtimeCents / 100).toFixed(2);
    }
  }

  // Default full-time hours (monthly) for full-time employees
  if (employee.payFrequency === "MONTHLY" && (pdfFields.basicpay_hours === "" || pdfFields.basicpay_hours == null)) {
    pdfFields.basicpay_hours = (MONTHLY_AVG_HOURS_FULLTIME * ((employee.normalWeeklyHours ?? 40) / 40)).toFixed(2);
  }

  // Vacation leave
  // IMPORTANT: Do NOT recompute or override values the user already sees in Run Payroll.
  // Only fill from DB if the consumed field is empty.
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

  // If remaining was not provided, compute it from entitled + carried - consumed.
  if ((!pdfFields.hours_vlremaining || String(pdfFields.hours_vlremaining).trim() === "") && entitledMinutes) {
    remainingMinutes = Math.max(0, entitledMinutes + carriedMinutes - consumedMinutes);
    if (typeof pdfFields.hours_vlremaining !== "undefined") pdfFields.hours_vlremaining = minutesToHoursString(remainingMinutes);
  }

  fillAllFields(form, pdfFields);
  form.flatten();

  const pdfBytes = await pdfDoc.save();

  // Extract totals for DB (from the fields you’re already editing)
  const grossCents = toCents(pdfFields.thispay_grosspay ?? pdfFields.basicpay_thispay);
  const taxCents = toCents(pdfFields.thispay_tax);
  const niCents = toCents(pdfFields.thispay_ni);
  const netCents = toCents(pdfFields.thispay_netpay);
  const allowanceCents = toCents(pdfFields.thispay_allowances);

  const bonusCents =
    toCents(pdfFields.thispay_march_supplement) +
    toCents(pdfFields.thispay_june_bonus) +
    toCents(pdfFields.thispay_september_supplement) +
    toCents(pdfFields.thispay_december_bonus);

  // Create payslip row
    // Maternity Leave Fund (MLF) is calculated on Basic Weekly Wage (excluding allowances/bonuses/overtime).
  const baseForMaternityCents = Math.max(0, grossCents - overtimeCents - bonusCents - allowanceCents);
  const maternityFundCents = computeMaternityFundMonthlyCents(baseForMaternityCents, {
    under18: employee.under17,
    before1962: employee.before1962,
    isStudent: employee.isStudent,
  });

  const payslip = await prisma.payslip.create({
    data: {
      organisationId,
      employeeId: employeeDbId,
      grossCents,
      taxCents,
      niCents,
      netCents,
      allowanceCents,
      bonusCents,
      overtimeCents,
      maternityFundCents,
      vacationEntitledMinutes: entitledMinutes,
      vacationConsumedMinutes: consumedMinutes,
      vacationRemainingMinutes: remainingMinutes,
      payPeriodFrom: periodFrom ?? null,
      payPeriodTo: periodTo ?? null,
      pdfPath: null,
    },
  });

  // Save PDF to disk
  const storageDir = path.join(
    process.cwd(),
    "storage",
    "payslips",
    organisationId,
    employeeDbId
  );

  await fs.mkdir(storageDir, { recursive: true });

  const fileName = `${payslip.id}.pdf`;
  const absolutePath = path.join(storageDir, fileName);

  await fs.writeFile(absolutePath, Buffer.from(pdfBytes));

  // Store relative path for serving later
  const relativePath = path
    .join("storage", "payslips", organisationId, employeeDbId, fileName)
    .replace(/\\/g, "/");

  await prisma.payslip.update({
    where: { id: payslip.id },
    data: { pdfPath: relativePath },
  });

  // Return the PDF as download as before
  const pdfBuffer = pdfBytes.buffer.slice(
  pdfBytes.byteOffset,
  pdfBytes.byteOffset + pdfBytes.byteLength
) as ArrayBuffer;

return new NextResponse(pdfBuffer, {
  status: 200,
  headers: {
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="payslip.pdf"`,
    "Cache-Control": "no-store",
  },
});
}
