export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import path from "path";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPrivatePdf } from "@/lib/pdf-storage";

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const payslip = await prisma.payslip.findUnique({
    where: { id },
    select: {
      id: true,
      pdfPath: true,
      organisationId: true,
    },
  });

  if (!payslip) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!payslip.pdfPath) {
    return NextResponse.json({ error: "No PDF saved" }, { status: 404 });
  }

  const member = await prisma.membership.findFirst({
    where: {
      userId: user.id,
      organisationId: payslip.organisationId,
    },
    select: { id: true },
  });

  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const file = await getPrivatePdf(payslip.pdfPath);

    if (!file) {
      return NextResponse.json({ error: "PDF file not found" }, { status: 404 });
    }

    const fileName = `payslip-${payslip.id}.pdf`;

    if ("stream" in file) {
      return new NextResponse(file.stream, {
        status: 200,
        headers: {
          "Content-Type": file.contentType || "application/pdf",
          "Content-Disposition": `inline; filename="${fileName}"`,
          "Cache-Control": "private, no-store",
          "X-Frame-Options": "SAMEORIGIN",
          "Content-Security-Policy": "frame-ancestors 'self'",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    return new NextResponse(file.buffer, {
      status: 200,
      headers: {
        "Content-Type": file.contentType || "application/pdf",
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Cache-Control": "private, no-store",
        "X-Frame-Options": "SAMEORIGIN",
        "Content-Security-Policy": "frame-ancestors 'self'",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e: any) {
    console.error("[payslip pdf] error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}