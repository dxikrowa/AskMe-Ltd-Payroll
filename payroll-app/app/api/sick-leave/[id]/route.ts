import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: Request, context: any) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = (await context.params)?.id;
  const row = await prisma.leaveEntry.findUnique({ where: { id } });
  if (!row || row.type !== "SICK") return NextResponse.json({ error: "Not found" }, { status: 404 });
  const member = await prisma.membership.findFirst({ where: { userId: user.id, organisationId: row.organisationId } });
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await prisma.leaveEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
