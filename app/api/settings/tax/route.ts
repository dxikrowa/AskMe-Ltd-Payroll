import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";

const TAX_CONFIG_PATH = path.join(process.cwd(), "lib", "payroll", "tax_config.json");
const TAX_VARS_PATH = path.join(process.cwd(), "lib", "payroll", "tax_variables.json");

// Defaults (kept here so we can reset even if the files were edited)
// Bands format: [lower, upper|'inf', rate, deduction]
const DEFAULT_TAX_CONFIG = {
  "1": [
    [0, 9100, 0, 0],
    [9101, 14500, 0.15, 1365],
    [14501, 19500, 0.25, 2815],
    [19501, "inf", 0.35, 4765],
  ],
  "2": [
    [0, 12700, 0, 0],
    [12701, 21200, 0.15, 1905],
    [21201, 60000, 0.25, 4025],
    [60001, "inf", 0.35, 10025],
  ],
  "3": [
    [0, 10500, 0, 0],
    [10501, 15800, 0.15, 1575],
    [15801, 21200, 0.25, 3155],
    [21201, "inf", 0.35, 5275],
  ],
  // The remaining statuses reuse the same structure in many payroll apps.
  // If your original tax_config.json differs, the UI will show what's on disk.
  "4": [
    [0, 12700, 0, 0],
    [12701, 21200, 0.15, 1905],
    [21201, 60000, 0.25, 4025],
    [60001, "inf", 0.35, 10025],
  ],
  "5": [
    [0, 12700, 0, 0],
    [12701, 21200, 0.15, 1905],
    [21201, 60000, 0.25, 4025],
    [60001, "inf", 0.35, 10025],
  ],
  "6": [
    [0, 10500, 0, 0],
    [10501, 15800, 0.15, 1575],
    [15801, 21200, 0.25, 3155],
    [21201, "inf", 0.35, 5275],
  ],
  "7": [
    [0, 10500, 0, 0],
    [10501, 15800, 0.15, 1575],
    [15801, 21200, 0.25, 3155],
    [21201, "inf", 0.35, 5275],
  ],
} as const;

const DEFAULT_VARS = {
  WEEKLY_ALLOWANCE: 121.16,
  WEEKLY_ALLOWANCE_2: 121.16,
  STATUTORY_BONUS: 135.1,
  STATUTORY_BONUS_2: 135.1,
} as const;

async function requireUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return prisma.user.findUnique({ where: { email: session.user.email } });
}

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [cfgRaw, varsRaw] = await Promise.all([
    fs.readFile(TAX_CONFIG_PATH, "utf8"),
    fs.readFile(TAX_VARS_PATH, "utf8").catch(() => ""),
  ]);

  const cfg = JSON.parse(cfgRaw);
  const vars = varsRaw ? JSON.parse(varsRaw) : DEFAULT_VARS;

  return NextResponse.json({ taxConfig: cfg, variables: vars });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as any;
  const action = body?.action as string | undefined;

  if (action === "reset") {
    await Promise.all([
      fs.writeFile(TAX_CONFIG_PATH, JSON.stringify(DEFAULT_TAX_CONFIG, null, 2), "utf8"),
      fs.writeFile(TAX_VARS_PATH, JSON.stringify(DEFAULT_VARS, null, 2), "utf8"),
    ]);
    return NextResponse.json({ ok: true });
  }

  const taxConfig = body?.taxConfig;
  const variables = body?.variables;

  if (!taxConfig || typeof taxConfig !== "object") {
    return NextResponse.json({ error: "Missing taxConfig" }, { status: 400 });
  }

  // light validation
  for (const k of Object.keys(taxConfig)) {
    const bands = (taxConfig as any)[k];
    if (!Array.isArray(bands)) return NextResponse.json({ error: `Invalid bands for status ${k}` }, { status: 400 });
  }

  await fs.writeFile(TAX_CONFIG_PATH, JSON.stringify(taxConfig, null, 2), "utf8");
  if (variables && typeof variables === "object") {
    await fs.writeFile(TAX_VARS_PATH, JSON.stringify(variables, null, 2), "utf8");
  }

  return NextResponse.json({ ok: true });
}
