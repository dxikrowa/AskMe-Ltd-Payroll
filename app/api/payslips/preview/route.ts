export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { PDFDocument } from "pdf-lib";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

function fillAllFields(form: any, fields: Record<string, any>) {
  for (const [key, val] of Object.entries(fields || {})) {
    try {
      form.getTextField(key).setText((val ?? "").toString());
    } catch {
      // ignore missing fields
    }
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { pdfFields } = body;

  const templatePath = path.join(process.cwd(), "templates", "payslip_v3.pdf");
  const templateBytes = await fs.readFile(templatePath);

  const pdfDoc = await PDFDocument.load(templateBytes);
  const form = pdfDoc.getForm();

  fillAllFields(form, pdfFields);

  form.flatten();
  const out = await pdfDoc.save();

const pdfBuffer = out.buffer.slice(
  out.byteOffset,
  out.byteOffset + out.byteLength
) as ArrayBuffer;

return new NextResponse(pdfBuffer, {
  status: 200,
  headers: {
    "Content-Type": "application/pdf",
    "Content-Disposition": 'inline; filename="payslip-preview.pdf"',
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    Pragma: "no-cache",
    Expires: "0",
    "X-Frame-Options": "SAMEORIGIN",
    "Content-Security-Policy": "frame-ancestors 'self'",
  },
});
}
