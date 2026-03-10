export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { PDFDocument } from "pdf-lib";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertOrgAccess, centsToEuroInt, fillTextFields, fillTextFieldsRight, toCents, formatDateDDMMYYYY, splitEuroCents, centsToEuro } from "@/lib/fss";

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

  const fs5Forms = await prisma.fssForm.findMany({
    where: { id: { in: body.fs5FormIds ?? [] }, organisationId: body.organisationId, type: "FS5", year: body.year },
    select: { id: true, month: true, data: true },
  });

  type MonthAgg = { 
    taxCents: number; ftTaxCents: number; ptTaxCents: number;
    niCents: number; maternityCents: number; 
    grossCents: number; ftGrossCents: number; ptGrossCents: number; 
    overtimeCents: number; ftOvertimeCents: number; ptOvertimeCents: number;
    date?: string; receiptNo?: string; 
  };

  const months: Record<number, MonthAgg> = {};
  for (const f of fs5Forms) {
    const m = f.month ?? undefined;
    if (!m) continue;
    const d: any = f.data ?? {};
    
    const taxCents = Number(d.taxCents ?? toCents(d.total_tax_deductions));
    const ftTaxCents = Number(d.ftTaxCents ?? taxCents);
    const ptTaxCents = Number(d.ptTaxCents ?? 0);
    
    const niCents = Number(d.niCents ?? toCents(d.ssc_contributions));
    const maternityCents = Number(d.maternityCents ?? toCents(d.maternity_fund_contribution));
    
    const overtimeCents = Number(d.overtimeCents ?? toCents(d.overtime));
    const ftOvertimeCents = Number(d.ftOvertimeCents ?? overtimeCents);
    const ptOvertimeCents = Number(d.ptOvertimeCents ?? 0);

    const grossTotal = Number(d.grossCents ?? toCents(d.total_gross_emoluments));
    const grossBaseCents = Math.max(0, grossTotal - overtimeCents);
    
    const ftGrossCents = Number(d.ftGrossCents ?? grossTotal);
    const ptGrossCents = Number(d.ptGrossCents ?? 0);

    const date = (d.date_of_payment ?? d.payDate ?? "") as string;
    const receiptNo = (d.cheque_number ?? d.chequeNo ?? "") as string;
    
    months[m] = { taxCents, ftTaxCents, ptTaxCents, niCents, maternityCents, grossCents: grossBaseCents, ftGrossCents, ptGrossCents, overtimeCents, ftOvertimeCents, ptOvertimeCents, date, receiptNo };
  }

  const sum = (fn: (m: MonthAgg) => number) => Object.values(months).reduce((a, v) => a + (Number.isFinite(fn(v)) ? fn(v) : 0), 0);

  const tax = sum((m) => m.taxCents);
  const ftTax = sum((m) => m.ftTaxCents);
  const ptTax = sum((m) => m.ptTaxCents);

  const ni = sum((m) => m.niCents);
  const maternity = sum((m) => m.maternityCents);
  const niParts = splitEuroCents(ni);
  const matParts = splitEuroCents(maternity);

  const baseGross = sum((m) => m.grossCents);
  const overtime = sum((m) => m.overtimeCents);
  const gross = baseGross + overtime;

  const ftGrossBase = sum((m) => Math.max(0, m.ftGrossCents - m.ftOvertimeCents));
  const ptGrossBase = sum((m) => Math.max(0, m.ptGrossCents - m.ptOvertimeCents));

  // Dynamically count exact number of FS3 forms generated in the DB for the given year
  const fs3count = await prisma.fssForm.count({
    where: {
      organisationId: body.organisationId,
      type: "FS3",
      year: body.year,
    },
  });

  const templatePath = path.join(process.cwd(), "templates", "fs7_form.pdf");
  const templateBytes = await fs.readFile(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);
  const form = pdfDoc.getForm();

  const childcareAns = String(body.childcare?.answer ?? "").toLowerCase();
  const shareAns = String(body.shareOptions?.answer ?? "").toLowerCase();

  // Targeting the exact field names provided
  const directBoxMappings = {
    no_of_fs3_issued: String(fs3count || ""),
    
    ssc_due_euros: niParts.euro, 
    ssc_due_cents: niParts.cents,
    
    maternity_fund_due_euros: matParts.euro, 
    maternity_fund_due_cents: matParts.cents,

    // Keeping standard fallbacks just in case
    B1: String(fs3count || ""),
    E1: centsToEuro(ni),
    E2: centsToEuro(maternity),
    E1_euro: niParts.euro, E1_cents: niParts.cents,
    E2_euro: matParts.euro, E2_cents: matParts.cents,
  };

  fillTextFields(form, {
    year_ended: String(body.year),
    company_number: org.companyRegistrationNumber ?? "",
    payer_pe_number: org.peNumber ?? "",
    payer_fullname: (org.payrollManagerFullName ?? org.name ?? "").toString(),
    payer_position: (org.payrollManagerPosition ?? "Employer").toString(),
    it_reg_no: body.itRegNo ?? "",
    jobsplus_reg_no: body.jobsplusRegNo ?? "",
    text_8frhv: formatDateDDMMYYYY(body.date ?? ""),
    principal_full_name: body.principalFullName ?? "",
    principal_position: body.principalPosition ?? "",
    principal_signature: body.principalSignature ?? "",
    
    gross_emoluments: centsToEuroInt(gross),
    gross_emoluments_fulltime: centsToEuroInt(ftGrossBase),
    gross_emoluments_parttime: centsToEuroInt(ptGrossBase),
    total_gross_emoluments: centsToEuroInt(gross),
    overtime_amount: centsToEuroInt(overtime),
    tax_deductions_fulltime: centsToEuroInt(ftTax),
    tax_deductions_parttime: centsToEuroInt(ptTax),
    tax_deductions_overtime: "0",
    tax_arrears_deductions: "0",
    total_tax_deductions: centsToEuroInt(tax),

    childcare_amount: body.childcare?.amount ?? "",
    childcare_employee_number: body.childcare?.employees ?? "",
    shareoptions_amount: body.shareOptions?.amount ?? "",
    shareoptions_employee_number: body.shareOptions?.employees ?? "",

    // Handles the new text-based checkboxes
    childcare_yes: childcareAns === "yes" ? "X" : "",
    childcare_no: childcareAns === "no" ? "X" : "",
    shareoptions_yes: shareAns === "yes" ? "X" : "",
    shareoptions_no: shareAns === "no" ? "X" : "",

    ...directBoxMappings
  });

  const rightFields: Record<string, any> = {
    gross_emoluments: centsToEuroInt(gross),
    gross_emoluments_fulltime: centsToEuroInt(ftGrossBase),
    gross_emoluments_parttime: centsToEuroInt(ptGrossBase),
    total_gross_emoluments: centsToEuroInt(gross),
    overtime_amount: centsToEuroInt(overtime),
    tax_deductions_fulltime: centsToEuroInt(ftTax),
    tax_deductions_parttime: centsToEuroInt(ptTax),
    tax_deductions_overtime: "0",
    tax_arrears_deductions: "0",
    total_tax_deductions: centsToEuroInt(tax),
    text_8frhv: formatDateDDMMYYYY(body.date ?? ""),
    ...directBoxMappings
  };
  
  fillTextFieldsRight(form, rightFields);

  if (body.overrideFields) fillTextFields(form, body.overrideFields);

  form.flatten();
  form.flatten();

  const out = await pdfDoc.save();
  const pdfBuffer = out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) as ArrayBuffer;

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="fs7-preview.pdf"',
      "Cache-Control": "no-store",
      "X-Frame-Options": "SAMEORIGIN",
      "Content-Security-Policy": "frame-ancestors 'self'",
    },
  });
}