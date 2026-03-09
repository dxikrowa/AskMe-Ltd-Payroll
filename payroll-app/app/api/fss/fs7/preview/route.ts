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
  fillCheckboxes,
  fillTextFields,
  fillTextFieldsRight,
  toCents,
  formatDateDDMMYYYY,
} from "@/lib/fss";

type Body = {
  organisationId: string;
  fs5FormIds: string[];
  year: number;
  date?: string;
  itRegNo?: string;
  jobsplusRegNo?: string;
  childcare?: { answer?: "yes" | "no"; amount?: string; employees?: string };
  shareOptions?: { answer?: "yes" | "no"; amount?: string; employees?: string };
  principalFullName?: string;
  principalPosition?: string;
  principalSignature?: string;
  overrideFields?: Record<string, any>;
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as Body;
  if (!body.organisationId) return NextResponse.json({ error: "Missing organisationId" }, { status: 400 });
  if (!Number.isFinite(body.year)) return NextResponse.json({ error: "Missing/invalid year" }, { status: 400 });

  try {
    await assertOrgAccess(user.id, body.organisationId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const org = await prisma.organisation.findUnique({ where: { id: body.organisationId } });
  if (!org) return NextResponse.json({ error: "Organisation not found" }, { status: 404 });

  // FS7 is built from previously generated FS5 forms.
  const fs5Forms = await prisma.fssForm.findMany({
    where: {
      id: { in: body.fs5FormIds ?? [] },
      organisationId: body.organisationId,
      type: "FS5",
      year: body.year,
    },
    select: { id: true, month: true, data: true },
  });

  // Extract per-month amounts (stored in the FS5 data payload)
  type MonthAgg = { taxCents: number; niCents: number; maternityCents: number; grossCents: number; date?: string; receiptNo?: string };
  const months: Record<number, MonthAgg> = {};
  for (const f of fs5Forms) {
    const m = f.month ?? undefined;
    if (!m) continue;
    const d: any = f.data ?? {};
    const taxCents = Number(d.taxCents ?? toCents(d.total_tax_deductions));
    const niCents = Number(d.niCents ?? toCents(d.ssc_contributions));
    const maternityCents = Number(d.maternityCents ?? toCents(d.maternity_fund_contribution));
    const overtimeCents = Number(d.overtimeCents ?? toCents(d.overtime));
    const grossBaseCents =
      d.grossCents != null
        ? Number(d.grossCents)
        : Math.max(0, Number(toCents(d.total_gross_emoluments)) - overtimeCents);
    const date = (d.date_of_payment ?? d.payDate ?? "") as string;
    const receiptNo = (d.cheque_number ?? d.chequeNo ?? "") as string;
    months[m] = { taxCents, niCents, maternityCents, grossCents: grossBaseCents, date, receiptNo };
    // Store overtime on the object via a non-typed property
    (months[m] as any).overtimeCents = overtimeCents;
  }

  const sum = (fn: (m: MonthAgg) => number) =>
    Object.values(months).reduce((a, v) => a + (Number.isFinite(fn(v)) ? fn(v) : 0), 0);

  const tax = sum((m) => m.taxCents);
  const baseGross = sum((m) => m.grossCents);
  const overtime = Object.values(months).reduce((a, v) => a + (Number((v as any).overtimeCents ?? 0) || 0), 0);
  const gross = baseGross + overtime;

  // Number of FS3s issued: count distinct employees with at least one payslip in the year
  const yearStart = new Date(Date.UTC(body.year, 0, 1, 0, 0, 0));
  const yearEnd = new Date(Date.UTC(body.year + 1, 0, 1, 0, 0, 0));
  const empRows = await prisma.payslip.findMany({
    where: { organisationId: body.organisationId, createdAt: { gte: yearStart, lt: yearEnd } },
    select: { employeeId: true },
  });
  const fs3count = new Set(empRows.map((r) => r.employeeId)).size;

  const templatePath = path.join(process.cwd(), "templates", "fs7_form.pdf");
  const templateBytes = await fs.readFile(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);
  const form = pdfDoc.getForm();

  fillTextFields(form, {
    year_ended: String(body.year),
    company_number: org.companyRegistrationNumber ?? "",
    payer_pe_number: org.peNumber ?? "",
    payer_fullname: (org.payrollManagerFullName ?? org.name ?? "").toString(),
    payer_position: (org.payrollManagerPosition ?? "Employer").toString(),
    it_reg_no: body.itRegNo ?? "",
    jobsplus_reg_no: body.jobsplusRegNo ?? "",
    // FS7 template uses a random field name for the A4 date box
    text_8frhv: formatDateDDMMYYYY(body.date ?? ""),
    principal_full_name: body.principalFullName ?? "",
    principal_position: body.principalPosition ?? "",
    principal_signature: body.principalSignature ?? "",
    employee_number_fs3: String(fs3count || ""),

    // No decimal points in these boxes
    // Some FS7 templates expose both a "gross emoluments" box and a separate "total" box.
    // Fill both to be robust across template variants.
    gross_emoluments: centsToEuroInt(gross),
    gross_emoluments_fulltime: centsToEuroInt(baseGross),
    total_gross_emoluments: centsToEuroInt(gross),
    overtime_amount: centsToEuroInt(overtime),
    tax_deductions_fulltime: centsToEuroInt(tax),
    tax_deductions_overtime: "0",
    tax_deductions_parttime: "0",
    tax_arrears_deductions: "0",
    total_tax_deductions: centsToEuroInt(tax),
    childcare_amount: body.childcare?.amount ?? "",
    childcare_employee_number: body.childcare?.employees ?? "",
    shareoptions_amount: body.shareOptions?.amount ?? "",
    shareoptions_employee_number: body.shareOptions?.employees ?? "",
  });

  // Right-fill numeric / comb fields (amount boxes)
  const rightFields: Record<string, any> = {
    gross_emoluments: centsToEuroInt(gross),
    gross_emoluments_fulltime: centsToEuroInt(baseGross),
    total_gross_emoluments: centsToEuroInt(gross),
    overtime_amount: centsToEuroInt(overtime),
    tax_deductions_fulltime: centsToEuroInt(tax),
    tax_deductions_overtime: "0",
    tax_deductions_parttime: "0",
    tax_arrears_deductions: "0",
    total_tax_deductions: centsToEuroInt(tax),
    employee_number_fs3: String(fs3count || ""),
    text_8frhv: formatDateDDMMYYYY(body.date ?? ""),
  };
  fillTextFieldsRight(form, rightFields);

  // Section F (payments made to CFTC during the year) and boxes F1/F2/F3 are filled by the government.
  // Per user request, we DO NOT auto-fill any of those fields.

  if (body.overrideFields) fillTextFields(form, body.overrideFields);

  fillCheckboxes(form, {
    paid_childcare_yes: String(body.childcare?.answer ?? "").toLowerCase() === "yes",
    paid_childcare_no: String(body.childcare?.answer ?? "").toLowerCase() === "no",
    shareoptions_yes: String(body.shareOptions?.answer ?? "").toLowerCase() === "yes",
    shareoptions_no: String(body.shareOptions?.answer ?? "").toLowerCase() === "no",
  });

  // NOTE: Do not auto-fill Section F totals (government filled).

  form.flatten();
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
    "Content-Disposition": 'inline; filename="fs5-preview.pdf"',
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    Pragma: "no-cache",
    Expires: "0",
    "X-Frame-Options": "SAMEORIGIN",
    "Content-Security-Policy": "frame-ancestors 'self'",
  },
});
}
