export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * app/api/pdfs/[id]/route.ts
 *
 * Secure PDF serving endpoint.
 * PDFs are stored with opaque filenames in a server-only directory (outside
 * the public/ folder). This route:
 *   1. Verifies the caller is authenticated
 *   2. Checks the requested PDF belongs to an organisation the caller is a
 *      member of (payslips) or was created by the caller (FSS forms)
 *   3. Streams the file with correct headers
 *
 * Never store PDFs under /public – they would be world-readable.
 * Keep them in a private directory (e.g. /var/payroll-pdfs) or, better,
 * an object-storage bucket (S3 / R2) behind pre-signed URLs.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiLimiter, getIp, rateLimitResponse } from "@/lib/rate-limit";
import path from "path";
import fs from "fs/promises";

// Base directory where PDFs are stored (server-side only, NOT under public/)
// Set PDF_STORAGE_PATH in your .env, e.g. PDF_STORAGE_PATH=/var/payroll-pdfs
const PDF_BASE = process.env.PDF_STORAGE_PATH ?? "/var/payroll-pdfs";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // Rate limit
  const ip = getIp(req);
  const rl = apiLimiter.check(ip);
  if (!rl.success) return rateLimitResponse(rl.resetAt);

  // Auth check
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  // Basic path-traversal guard – id must be a UUID
  if (!/^[0-9a-f-]{36}$/.test(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Determine which organisations this user belongs to
    const memberships = await prisma.membership.findMany({
      where: { userId: user.id },
      select: { organisationId: true },
    });
    const orgIds = memberships.map((m) => m.organisationId);

    // Try payslip first
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
      // Try FSS form
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

    // Resolve and validate the path is within the allowed base directory
    const resolved = path.resolve(PDF_BASE, path.basename(pdfPath));
    if (!resolved.startsWith(path.resolve(PDF_BASE))) {
      // Path traversal attempt
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const buffer = await fs.readFile(resolved);

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${path.basename(pdfPath)}"`,
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
