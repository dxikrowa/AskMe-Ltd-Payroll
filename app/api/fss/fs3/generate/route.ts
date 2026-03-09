import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertOrgAccess } from "@/lib/fss";
import { POST as previewPost } from "../preview/route";
import { savePrivatePdf } from "@/lib/pdf-storage";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const organisationId = body.organisationId as string;
  const employeeId = body.employeeId as string;
  const year = Number(body.year);

  if (!organisationId || !employeeId) {
    return NextResponse.json({ error: "Missing organisationId/employeeId" }, { status: 400 });
  }
  if (!Number.isFinite(year)) {
    return NextResponse.json({ error: "Missing/invalid year" }, { status: 400 });
  }

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

  const fssForm = await prisma.fssForm.create({
    data: {
      organisationId,
      type: "FS3",
      year,
      month: null,
      employeeId,
      sourcePayslipIds: [],
      sourceFssFormIds: [],
      data: body,
      pdfPath: null,
    },
  });

  const storedPath = `fss/fs3/${organisationId}/${employeeId}/${year}/${fssForm.id}.pdf`;
  const saved = await savePrivatePdf(storedPath, pdfBytes);

  await prisma.fssForm.update({
    where: { id: fssForm.id },
    data: { pdfPath: saved.storedPath },
  });

  return new NextResponse(pdfBytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="fs3-${year}.pdf"`,
      "Cache-Control": "no-store",
      "X-Frame-Options": "SAMEORIGIN",
      "Content-Security-Policy": "frame-ancestors 'self'",
    },
  });
}