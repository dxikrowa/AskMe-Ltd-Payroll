import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertOrgAccess } from "@/lib/fss";
import { POST as previewPost } from "../preview/route";

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
  if (!Number.isFinite(year)) return NextResponse.json({ error: "Missing/invalid year" }, { status: 400 });

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

  const storageDir = path.join(process.cwd(), "storage", "fss", "fs3", organisationId, employeeId, String(year));
  await fs.mkdir(storageDir, { recursive: true });
  const fileName = `${fssForm.id}.pdf`;
  const absolutePath = path.join(storageDir, fileName);
  await fs.writeFile(absolutePath, pdfBytes);

  const relativePath = path
    .join("storage", "fss", "fs3", organisationId, employeeId, String(year), fileName)
    .replace(/\\/g, "/");

  await prisma.fssForm.update({ where: { id: fssForm.id }, data: { pdfPath: relativePath } });

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
