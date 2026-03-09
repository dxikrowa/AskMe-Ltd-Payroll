import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const row = await prisma.vacationLeaveCarryForward.findUnique({ where: { id } });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const member = await prisma.membership.findFirst({ where: { userId: user.id, organisationId: row.organisationId } });
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.vacationLeaveCarryForward.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
