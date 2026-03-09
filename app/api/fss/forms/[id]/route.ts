
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertOrgAccess } from "@/lib/fss";
import { deletePrivatePdf } from "@/lib/pdf-storage";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const form = await prisma.fssForm.findUnique({ where: { id } });
  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try { await assertOrgAccess(user.id, form.organisationId); } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }
  await deletePrivatePdf(form.pdfPath);
  await prisma.fssForm.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
