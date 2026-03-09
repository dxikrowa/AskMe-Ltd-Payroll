export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiLimiter, getIp, rateLimitResponse } from "@/lib/rate-limit";
import { getPrivatePdf } from "@/lib/pdf-storage";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const ip = getIp(req);
  const rl = apiLimiter.check(ip);
  if (!rl.success) return rateLimitResponse(rl.resetAt);

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  if (!/^[0-9a-f-]{36}$/.test(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const memberships = await prisma.membership.findMany({
      where: { userId: user.id },
      select: { organisationId: true },
    });
    const orgIds = memberships.map((m) => m.organisationId);

    const payslip = await prisma.payslip.findUnique({
      where: { id },
      select: { pdfPath: true, organisationId: true },
    });

    let pdfPath: string | null = null;

    if (payslip) {
      if (!orgIds.includes(payslip.organisationId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      pdfPath = payslip.pdfPath;
    } else {
      const fssForm = await prisma.fssForm.findUnique({
        where: { id },
        select: { pdfPath: true, organisationId: true },
      });

      if (!fssForm || !orgIds.includes(fssForm.organisationId)) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      pdfPath = fssForm.pdfPath;
    }

    if (!pdfPath) {
      return NextResponse.json({ error: "PDF not yet generated" }, { status: 404 });
    }

    const file = await getPrivatePdf(pdfPath);
    if (!file) {
      return NextResponse.json({ error: "PDF file not found" }, { status: 404 });
    }

    const fileName = path.posix.basename(pdfPath);

    if ("stream" in file) {
      return new NextResponse(file.stream, {
        status: 200,
        headers: {
          "Content-Type": file.contentType,
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
        "Content-Type": file.contentType,
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Cache-Control": "private, no-store",
        "X-Frame-Options": "SAMEORIGIN",
        "Content-Security-Policy": "frame-ancestors 'self'",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e: any) {
    if (e?.code === "ENOENT") {
      return NextResponse.json({ error: "PDF file not found" }, { status: 404 });
    }
    console.error("[pdf] error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}