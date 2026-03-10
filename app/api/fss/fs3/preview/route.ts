export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { PDFDocument } from "pdf-lib";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  assertOrgAccess,
  centsToEuroInt,
  fillMoneySplit,
  fillTextFields,
  fillTextFieldsRight,
  formatDateDDMMYYYY,
  yearRange,
} from "@/lib/fss";
import { inferSscCategory } from "@/lib/ssc";

type Body = {
  organisationId: string;
  employeeId: string;
  year: number;
  periodFrom?: string;
  periodTo?: string;
  date?: string;
  overrideFields?: Record<string, any>;
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as Body;
  if (!body.organisationId || !body.employeeId) {
    return NextResponse.json({ error: "Missing organisationId/employeeId" }, { status: 400 });
  }
  if (!Number.isFinite(body.year)) return NextResponse.json({ error: "Missing/invalid year" }, { status: 400 });

  try {
    await assertOrgAccess(user.id, body.organisationId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const employee = await prisma.employee.findUnique({
    where: { id: body.employeeId },
    include: { organisation: true },
  });
  if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  if (employee.organisationId !== body.organisationId) {
    return NextResponse.json({ error: "Employee/org mismatch" }, { status: 400 });
  }

  const range = yearRange(body.year);
  const payslips = await prisma.payslip.findMany({
    where: {
      organisationId: body.organisationId,
      employeeId: body.employeeId,
      createdAt: { gte: range.start, lt: range.end },
    },
    select: { grossCents: true, taxCents: true, niCents: true, overtimeCents: true, maternityFundCents: true },
  });

  const gross = payslips.reduce((a, p) => a + p.grossCents, 0);
  const tax = payslips.reduce((a, p) => a + p.taxCents, 0);
  const ni = payslips.reduce((a, p) => a + p.niCents, 0);
  const maternity = payslips.reduce((a, p) => a + (p.maternityFundCents ?? 0), 0);
  const overtimeCents = payslips.reduce((a, p) => a + (p.overtimeCents ?? 0), 0);

  const overtimeEntries = await prisma.timesheetEntry.findMany({
    where: {
      organisationId: body.organisationId,
      employeeId: body.employeeId,
      date: { gte: range.start, lt: range.end },
    },
    select: { minutes: true },
  });
  const overtimeMinutes = overtimeEntries.reduce((a, e) => a + (e.minutes ?? 0), 0);
  const overtimeHours = Math.round((overtimeMinutes / 60) * 100) / 100;
  const overtimeHoursStr = overtimeHours.toFixed(2);
  const [otH, otDec] = overtimeHoursStr.split(".");

  const org = employee.organisation;
  const templatePath = path.join(process.cwd(), "templates", "fs3_form.pdf");
  const templateBytes = await fs.readFile(templatePath);

  const pdfDoc = await PDFDocument.load(templateBytes);
  const form = pdfDoc.getForm();

  const grossExcludingOvertime = Math.max(0, gross - overtimeCents);
  const isPT = employee.employmentType === "PART_TIME";

  const computedFields: Record<string, any> = {
    year_ended: String(body.year),
    current_date: formatDateDDMMYYYY(body.date ?? ""),

    company_name: org.name ?? "",
    company_address:
      [org.addressHouseNo, org.addressStreet, org.addressLocality]
        .filter(Boolean)
        .join("\n") ||
      [org.address1, org.address2, org.city].filter(Boolean).join("\n"),
    company_postcode: org.addressPostcode ?? org.postcode ?? "",
    company_number: org.companyRegistrationNumber ?? "",
    company_number_2: "", 

    payer_pe_number: org.peNumber ?? "",
    payer_fullname: org.payrollManagerFullName ?? "",
    payer_position: org.payrollManagerPosition ?? "",

    employee_lastname: employee.lastName ?? "",
    employe_firstname: employee.firstName ?? "",
    employee_id: employee.idNumber ?? "",
    employee_number: employee.employeeNo ?? "",
    employee_ssn: employee.ssnNumber ?? "",
    employee_addresss:
      [employee.addressHouseNo, employee.addressStreet, employee.addressLocality]
        .filter(Boolean)
        .join("\n") ||
      "",
    employee_postcode: employee.addressPostcode ?? "",
    employee_spouse_id: employee.spouseIdNumber ?? "",

    period_from: formatDateDDMMYYYY(body.periodFrom ?? `01/01/${body.year}`),
    period_to: formatDateDDMMYYYY(body.periodTo ?? `31/12/${body.year}`),

    gross_emoluments_fulltime: isPT ? "0" : centsToEuroInt(grossExcludingOvertime),
    gross_emoluments_parttime: isPT ? centsToEuroInt(grossExcludingOvertime) : "0",
    overtime: centsToEuroInt(overtimeCents),
    overtime_hours: otH,
    overtime_hours_decimal: otDec ?? "00",
    director_fees: "0",
    c8_fringebenfits: "0",
    total_gross_emoluments_fringebenefits: centsToEuroInt(gross),

    tax_deductions_fulltime: isPT ? "0" : centsToEuroInt(tax),
    tax_deductions_parttime: isPT ? centsToEuroInt(tax) : "0",
    tax_deductions_overtime: "0",
    tax_arrears_deduction: "0",
    total_tax_deductions: centsToEuroInt(tax),
  };

  fillTextFields(form, computedFields);

  fillTextFieldsRight(form, {
    current_date: computedFields.current_date,
    period_from: computedFields.period_from,
    period_to: computedFields.period_to,
    gross_emoluments_fulltime: computedFields.gross_emoluments_fulltime,
    overtime: computedFields.overtime,
    overtime_hours: computedFields.overtime_hours,
    overtime_hours_decimal: computedFields.overtime_hours_decimal,
    director_fees: computedFields.director_fees,
    gross_emoluments_parttime: computedFields.gross_emoluments_parttime,
    c8_fringebenfits: computedFields.c8_fringebenfits,
    total_gross_emoluments_fringebenefits: computedFields.total_gross_emoluments_fringebenefits,
    tax_deductions_fulltime: computedFields.tax_deductions_fulltime,
    tax_deductions_overtime: computedFields.tax_deductions_overtime,
    tax_deductions_parttime: computedFields.tax_deductions_parttime,
    tax_arrears_deduction: computedFields.tax_arrears_deduction,
    total_tax_deductions: computedFields.total_tax_deductions,
  });

  const payslipCount = payslips.length;
  const freq = (employee.payFrequency ?? "MONTHLY").toString().toUpperCase();
  const avgPerPeriodCents = payslipCount > 0 ? Math.round(gross / payslipCount) : 0;
  const perMonthCents = (() => {
    if (freq === "WEEKLY") return Math.round((avgPerPeriodCents * 52) / 12);
    if (freq === "ANNUAL") return Math.round(gross / 12);
    return avgPerPeriodCents;
  })();
  const basicWeeklyCents = Math.round((perMonthCents * 12) / 52);

  const weeksReceived = (() => {
    if (freq === "WEEKLY") return Math.max(0, Math.min(52, payslipCount));
    if (freq === "ANNUAL") return 52;
    return Math.max(0, Math.min(52, Math.round(payslipCount * (52 / 12))));
  })();

  fillMoneySplit(form, { base: "basic_ww_1", cents: basicWeeklyCents });
  fillTextFields(form, { basic_ww_1_category: inferSscCategory({ basicWeeklyCents, under17: employee.under17, apprentice: employee.apprentice || employee.isStudent, before1962: employee.before1962 }) });
  fillTextFields(form, { basic_ww_1_number: String(weeksReceived || "") });
  fillTextFieldsRight(form, { basic_ww_1_number: String(weeksReceived || "") });

  fillMoneySplit(form, { base: "payee_ssc_1", cents: ni });
  fillMoneySplit(form, { base: "total_payee_ssc", cents: ni });
  fillMoneySplit(form, { base: "payer_ssc_1", cents: ni });
  fillMoneySplit(form, { base: "total_payer_ssc", cents: ni });
  fillMoneySplit(form, { base: "total_ssc_1", cents: ni + ni });
  fillMoneySplit(form, { base: "total_ssc", cents: ni + ni });
  fillMoneySplit(form, { base: "payer_mfc_1", cents: maternity });
  fillMoneySplit(form, { base: "total_payer_mfc", cents: maternity });

  if (body.overrideFields) fillTextFields(form, body.overrideFields);

  form.flatten();
  const out = await pdfDoc.save();
  const pdfBuffer = out.buffer.slice(
    out.byteOffset,
    out.byteOffset + out.byteLength
  ) as ArrayBuffer;

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="fs3-preview.pdf"',
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
      "X-Frame-Options": "SAMEORIGIN",
      "Content-Security-Policy": "frame-ancestors 'self'",
    },
  });
}