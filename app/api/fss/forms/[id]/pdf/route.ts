
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import path from "path";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertOrgAccess } from "@/lib/fss";
import { getPrivatePdf } from "@/lib/pdf-storage";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const form = await prisma.fssForm.findUnique({ where: { id } });
  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try { await assertOrgAccess(user.id, form.organisationId); } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }
  if (!form.pdfPath) return NextResponse.json({ error: "PDF not available" }, { status: 404 });
  const file = await getPrivatePdf(form.pdfPath);
  if (!file) return NextResponse.json({ error: "PDF not available" }, { status: 404 });
  const fileName = path.posix.basename(form.pdfPath);
  return new NextResponse('stream' in file ? file.stream : file.buffer, { status: 200, headers: { "Content-Type": file.contentType, "Content-Disposition": `inline; filename="${fileName}"`, "Cache-Control": "no-store", "X-Frame-Options": "SAMEORIGIN", "Content-Security-Policy": "frame-ancestors 'self'" } });
}
