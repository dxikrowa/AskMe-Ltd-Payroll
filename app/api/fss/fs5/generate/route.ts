import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertOrgAccess, formatMonthMMYYYY } from "@/lib/fss";
import { POST as previewPost } from "../preview/route";
import { savePrivatePdf } from "@/lib/pdf-storage";

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

  const previewReq = new Request(req.url, {
    method: "POST",
    headers: req.headers,
    body: JSON.stringify(body),
  });

  const res = await previewPost(previewReq);
  const ct = res.headers.get("Content-Type") ?? "";
  if (!ct.includes("application/pdf")) return res;
  const pdfBytes = Buffer.from(await res.arrayBuffer());

  const mmYYYY = formatMonthMMYYYY(body.paymentMonth ?? "");
  const month = mmYYYY ? Number(mmYYYY.slice(0, 2)) : null;
  const year = mmYYYY ? Number(mmYYYY.slice(2, 6)) : null;
  if (!year || !month) return NextResponse.json({ error: "Invalid paymentMonth" }, { status: 400 });

  const payslipIds = (body.payslipIds ?? []) as string[];
  const payslips = await prisma.payslip.findMany({
    where: { id: { in: payslipIds }, organisationId },
    select: {
      grossCents: true,
      taxCents: true,
      niCents: true,
      employeeId: true,
      overtimeCents: true,
      maternityFundCents: true,
    },
  });

  const gross = payslips.reduce((a, p) => a + p.grossCents, 0);
  const tax = payslips.reduce((a, p) => a + p.taxCents, 0);
  const ni = payslips.reduce((a, p) => a + p.niCents, 0);
  const payees = new Set(payslips.map((p) => p.employeeId)).size;
  const maternity = payslips.reduce((a, p) => a + (p.maternityFundCents ?? 0), 0);
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

  const storedPath = `fss/fs5/${organisationId}/${year}/${fssForm.id}.pdf`;
  const saved = await savePrivatePdf(storedPath, pdfBytes);

  await prisma.fssForm.update({
    where: { id: fssForm.id },
    data: { pdfPath: saved.storedPath },
  });

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