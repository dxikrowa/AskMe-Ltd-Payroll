export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { PDFDocument } from "pdf-lib";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertOrgAccess, centsToEuroInt, centsToNoDot, fillTextFields, fillTextFieldsRight, formatDateDDMMYYYY, formatMonthMMYYYY } from "@/lib/fss";

type Body = {
  organisationId: string;
  payslipIds: string[];
  paymentMonth?: string;
  payDate?: string;
  chequeNo?: string;
  bankAccountNo?: string;
  bank?: string;
  branch?: string;
  payerFullName?: string;
  signature?: string;
  overrideFields?: Record<string, any>;
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as Body;
  const organisationId = body.organisationId;
  if (!organisationId) return NextResponse.json({ error: "Missing organisationId" }, { status: 400 });

  try {
    await assertOrgAccess(user.id, organisationId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const org = await prisma.organisation.findUnique({ where: { id: organisationId } });
  if (!org) return NextResponse.json({ error: "Organisation not found" }, { status: 404 });

  const payslips = await prisma.payslip.findMany({
    where: { id: { in: body.payslipIds ?? [] }, organisationId },
    select: {
      grossCents: true, taxCents: true, niCents: true, employeeId: true, overtimeCents: true, maternityFundCents: true,
      employee: { select: { employmentType: true } }
    },
  });

  let ftGross = 0, ptGross = 0, ftTax = 0, ptTax = 0, ftOvertime = 0, ptOvertime = 0, ni = 0, maternity = 0;
  const ftPayees = new Set<string>(); const ptPayees = new Set<string>();

  for (const p of payslips) {
    ni += p.niCents;
    maternity += (p.maternityFundCents ?? 0);
    const isPT = p.employee?.employmentType === "PART_TIME";
    if (isPT) {
      ptGross += p.grossCents; ptTax += p.taxCents; ptOvertime += (p.overtimeCents || 0); ptPayees.add(p.employeeId);
    } else {
      ftGross += p.grossCents; ftTax += p.taxCents; ftOvertime += (p.overtimeCents || 0); ftPayees.add(p.employeeId);
    }
  }

  const gross = ftGross + ptGross;
  const tax = ftTax + ptTax;
  const overtimeCents = ftOvertime + ptOvertime;
  const totalDue = tax + ni + maternity;
  
  const ftGrossBase = Math.max(0, ftGross - ftOvertime);
  const ptGrossBase = Math.max(0, ptGross - ptOvertime);

  const templatePath = path.join(process.cwd(), "templates", "fs5_form.pdf");
  const templateBytes = await fs.readFile(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);
  const form = pdfDoc.getForm();

  const computedFields: Record<string, any> = {
    company_name: org.name ?? "",
    company_address: [org.addressHouseNo, org.addressStreet, org.addressLocality].filter(Boolean).join("\n") || [org.address1, org.address2, org.city].filter(Boolean).join("\n"),
    company_postcode: org.addressPostcode ?? org.postcode ?? "",
    company_number: org.companyRegistrationNumber ?? "",
    company_email: "",
    pe_number: org.peNumber ?? "",
    payment_formonth: formatMonthMMYYYY(body.paymentMonth ?? ""),
    no_of_payees_fulltime: String(ftPayees.size || ""),
    no_of_payees_parttime: String(ptPayees.size || ""),
    gross_emoluments_fulltime: centsToEuroInt(ftGrossBase),
    gross_emoluments_parttime: centsToEuroInt(ptGrossBase),
    overtime: centsToEuroInt(overtimeCents),
    fringe_benefits: "0",
    total_gross_emoluments: centsToEuroInt(gross),
    tax_deductions_fulltime: centsToEuroInt(ftTax),
    tax_deductions_parttime: centsToEuroInt(ptTax),
    tax_deductions_overtime: "0",
    tax_arrears_deductions: "0",
    total_tax_deductions: centsToEuroInt(tax),
    ssc_contributions: centsToNoDot(ni),
    maternity_fund_contribution: centsToNoDot(maternity),
    total_due_ctc: centsToNoDot(totalDue),
    date_of_payment: formatDateDDMMYYYY(body.payDate ?? ""),
    total_payment: centsToNoDot(totalDue),
    cheque_number: body.chequeNo ?? "",
    bankaccount_no: body.bankAccountNo ?? "",
    payment_bank: body.bank ?? "",
    payment_bank_branch: body.branch ?? "",
    name_of_Payer: body.payerFullName ?? org.payrollManagerFullName ?? "",
  };

  fillTextFields(form, computedFields);

  const rightFillKeys = [
    "pe_number", "payment_formonth", "gross_emoluments_fulltime", "overtime",
    "gross_emoluments_parttime", "fringe_benefits", "total_gross_emoluments",
    "tax_deductions_fulltime", "tax_deductions_overtime", "tax_deductions_parttime",
    "tax_arrears_deductions", "total_tax_deductions", "ssc_contributions",
    "maternity_fund_contribution", "total_due_ctc", "total_payment",
    "no_of_payees_fulltime", "no_of_payees_parttime", "date_of_payment",
  ];
  
  const rightFields: Record<string, any> = {};
  for (const k of rightFillKeys) rightFields[k] = computedFields[k];
  fillTextFieldsRight(form, rightFields);

  if (body.overrideFields) {
    fillTextFields(form, body.overrideFields);
    const overrideRight: Record<string, any> = {};
    for (const k of rightFillKeys) if (k in body.overrideFields) overrideRight[k] = (body.overrideFields as any)[k];
    fillTextFieldsRight(form, overrideRight);
  }

  form.flatten();
  form.flatten();

  const out = await pdfDoc.save();
  const pdfBuffer = out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) as ArrayBuffer;

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="fs5-preview.pdf"',
      "Cache-Control": "no-store",
      "X-Frame-Options": "SAMEORIGIN",
      "Content-Security-Policy": "frame-ancestors 'self'",
    },
  });
}