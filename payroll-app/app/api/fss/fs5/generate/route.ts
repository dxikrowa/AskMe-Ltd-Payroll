import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertOrgAccess } from "@/lib/fss";
import { formatMonthMMYYYY } from "@/lib/fss";
import { POST as previewPost } from "../preview/route";

// Generate FS5 PDF and save to DB + storage
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

  // Build PDF bytes via preview
  const previewReq = new Request(req.url, {
    method: "POST",
    headers: req.headers,
    body: JSON.stringify(body),
  });

  const res = await previewPost(previewReq);
  const ct = res.headers.get("Content-Type") ?? "";
  if (!ct.includes("application/pdf")) return res;
  const pdfBytes = Buffer.from(await res.arrayBuffer());

  // Month parsing (accept MM/YYYY, YYYY-MM, MMYYYY)
  const mmYYYY = formatMonthMMYYYY(body.paymentMonth ?? "");
  const month = mmYYYY ? Number(mmYYYY.slice(0, 2)) : null;
  const year = mmYYYY ? Number(mmYYYY.slice(2, 6)) : null;
  if (!year || !month) return NextResponse.json({ error: "Invalid paymentMonth" }, { status: 400 });

  const payslipIds = (body.payslipIds ?? []) as string[];
  const payslips = await prisma.payslip.findMany({
    where: { id: { in: payslipIds }, organisationId },
    select: { grossCents: true, taxCents: true, niCents: true, employeeId: true, overtimeCents: true, maternityFundCents: true },
  });

  const gross = payslips.reduce((a, p) => a + p.grossCents, 0);
  const tax = payslips.reduce((a, p) => a + p.taxCents, 0);
  const ni = payslips.reduce((a, p) => a + p.niCents, 0);
  const payees = new Set(payslips.map((p) => p.employeeId)).size;
  // Maternity fund contribution is computed on each payslip and summed here.
  const maternity = payslips.reduce((a, p) => a + (p.maternityFundCents ?? 0), 0);

  // Overtime is sourced into payslips from timesheets; FS5 uses payslip totals.
  const overtimeCents = payslips.reduce((a, p) => a + (p.overtimeCents ?? 0), 0);

  const totalDue = tax + ni + maternity;

  const fssForm = await prisma.fssForm.create({
    data: {
      organisationId,
      type: "FS5",
      year,
      month: month ?? undefined,
      employeeId: null,
      sourcePayslipIds: payslipIds,
      sourceFssFormIds: [],
      data: {
        ...body,
        grossCents: gross,
        taxCents: tax,
        niCents: ni,
        maternityCents: maternity,
        overtimeCents,
        totalDueCents: totalDue,
        payees,
      },
      pdfPath: null,
    },
  });

  const storageDir = path.join(process.cwd(), "storage", "fss", "fs5", organisationId, String(year));
  await fs.mkdir(storageDir, { recursive: true });
  const fileName = `${fssForm.id}.pdf`;
  const absolutePath = path.join(storageDir, fileName);
  await fs.writeFile(absolutePath, pdfBytes);

  const relativePath = path
    .join("storage", "fss", "fs5", organisationId, String(year), fileName)
    .replace(/\\/g, "/");

  await prisma.fssForm.update({ where: { id: fssForm.id }, data: { pdfPath: relativePath } });

  return new NextResponse(pdfBytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="fs5-${year}-${String(month ?? "")}.pdf"`,
      "Cache-Control": "no-store",
      "X-Frame-Options": "SAMEORIGIN",
      "Content-Security-Policy": "frame-ancestors 'self'",
    },
  });
}
